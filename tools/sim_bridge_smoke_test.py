#!/usr/bin/env python3
"""Simülasyon köprüsü duman testi — ağ, Windows veya FastAPI gerektirmez.

Kullanım: python3 tools/sim_bridge_smoke_test.py

Kapsar: demo simülasyon motoru (ısınma, bekleme, tamamlanma, alarm, meşgul fırın),
fırın → makine eşleme kuralları, REST proxy (fırın/emir/okuma/**senaryo/olay**),
HMAC imzalı edge ingest, idempotency, yanlış imza reddi, statik ERP arayüzü,
yol güvenliği ve simülasyon kapalıyken "son veri + uyarı" davranışı.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from server.sim_bridge.app import VERSION, BridgeState, make_server  # noqa: E402
from server.sim_bridge.demo_sim import FurnaceEngine, DemoSim  # noqa: E402
from server.sim_bridge.sim_client import SimClient  # noqa: E402
from server.sim_bridge.store import IngestStore  # noqa: E402
from edge.erp_edge.sim_map import build_map, normalize, preferred_types  # noqa: E402

SECRET = 'degistirin-bu-gizli-anahtari'


class BridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.base = Path(cls.tmp.name)
        cls.sim = DemoSim(host='127.0.0.1', port=0, speed=1.0).start()
        cls.state = BridgeState(config_path=cls.base / 'config.json',
                                db_path=cls.base / 'ingest.db',
                                sim_url=cls.sim.url, demo=True)
        cls.httpd = make_server(cls.state, '127.0.0.1', 0)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f'http://127.0.0.1:{cls.httpd.server_address[1]}'

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.sim.stop()
        cls.tmp.cleanup()

    # ------------------------------------------------------------------ HTTP
    def get(self, path):
        try:
            with urllib.request.urlopen(self.base_url + path, timeout=5) as res:
                return res.status, res.headers, res.read()
        except urllib.error.HTTPError as exc:
            return exc.code, exc.headers, exc.read()

    def get_json(self, path):
        status, _headers, raw = self.get(path)
        return status, json.loads(raw.decode('utf-8'))

    def post(self, path, payload=None, headers=None, raw=None):
        data = raw if raw is not None else json.dumps(payload or {}, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(self.base_url + path, data=data, method='POST',
                                     headers={'Content-Type': 'application/json', **(headers or {})})
        try:
            with urllib.request.urlopen(req, timeout=5) as res:
                return res.status, json.loads(res.read().decode('utf-8'))
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read().decode('utf-8'))

    def upload(self, payload, signature=None, client_id='EDGE-TEST'):
        raw = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        sig = signature if signature is not None else hmac.new(
            SECRET.encode(), raw, hashlib.sha256).hexdigest()
        return self.post('/api/edge/ingest', raw=raw,
                         headers={'X-Edge-Signature': sig, 'X-Edge-Client-Id': client_id})

    def batch(self, batch_id='B-SMOKE-1', readings=2):
        return {
            'kind': 'edge-batch', 'schemaVersion': 1, 'siteCode': 'FIRM1', 'plantId': 'P1',
            'batchId': batch_id, 'clientId': f'EDGE-{batch_id}',
            'at': '2026-11-24T10:00:00+0000', 'adapter': 'simulation', 'fallback': None,
            'readings': [
                {'at': '2026-11-24T10:00:00+0000', 'machine_id': 'MCH-01',
                 'machine_name': 'A Fırını', 'tag_id': 'T-1', 'kind': 'signal',
                 'signal': 'alarm', 'value_text': 'ok', 'unit': None,
                 'quality': 'SIMULATED', 'source': 'ERP-SIM', 'adapter': 'simulation'}
                for _ in range(readings)
            ],
            'events': [{'at': '2026-11-24T10:00:00+0000', 'machineId': 'MCH-01',
                        'signal': 'alarm', 'kind': 'STATE_CHANGE', 'previous': 'fault',
                        'current': 'ok', 'severity': 'info', 'note': 'Test'}]
        }

    # ------------------------------------------------------------------ 1
    def test_01_bridge_info_and_static_app(self):
        status, data = self.get_json('/api/bridge/info')
        self.assertEqual(status, 200)
        self.assertEqual(data['version'], VERSION)
        self.assertTrue(data['demo'])
        self.assertNotEqual(data['config']['edge']['secret'], SECRET, 'Gizli anahtar maskelenmedi')
        status, headers, raw = self.get('/app/')
        self.assertEqual(status, 200)
        self.assertIn('text/html', headers['Content-Type'])
        self.assertIn('ERP Studio', raw.decode('utf-8'))
        status, headers, raw = self.get('/app/js/views/sim.js')
        self.assertEqual(status, 200)
        self.assertIn('javascript', headers['Content-Type'])
        self.assertIn('Simülasyon Ba', raw.decode('utf-8'))
        # Bilinmeyen API JSON döner, statik 404 düz metindir.
        status, data = self.get_json('/api/yok')
        self.assertEqual(status, 404)
        self.assertFalse(data['ok'])
        # Yol güvenliği: kök dışına çıkılamaz (yüzde kodlu gezinme dahil).
        code, _headers, _raw = self.get('/%2e%2e/%2e%2e/etc/passwd')
        self.assertIn(code, (403, 404), 'Yol gezinmesi engellenmedi')
        code, _headers, _raw = self.get('/.git/config')
        self.assertIn(code, (403, 404), 'Gizli dosya sunuldu')
        code, _headers, raw = self.get('/server/sim_bridge/config.json')
        self.assertEqual(code, 404, 'Gizli yapılandırma dosyası sunuldu')
        print('  ✓ köprü bilgisi · statik ERP · sim.js · 404 JSON · yol güvenliği')

    # ------------------------------------------------------------------ 2
    def test_02_live_snapshot_and_normalization(self):
        status, live = self.get_json('/api/sim/live')
        self.assertEqual(status, 200)
        self.assertTrue(live['ok'])
        self.assertEqual(len(live['furnaces']), 3)
        names = {f['name'] for f in live['furnaces']}
        self.assertIn('Aluminyum Eritme Fırını', names)
        self.assertIn('Homojenizasyon Fırını', names)
        self.assertTrue(all(f['status'] == 'KAPALI' for f in live['furnaces']))
        self.assertEqual(live['mode'], 'DEMO')
        mapping = live['mapping']
        self.assertEqual(mapping['matched'], 3)
        self.assertEqual(len(mapping['unmatched']), 0)
        ids = {p['machineId'] for p in mapping['pairs']}
        self.assertEqual(ids, {'MCH-01', 'MCH-10', 'MCH-02'})
        self.assertTrue(all(p['source'] == 'auto' for p in mapping['pairs']))
        self.assertIn('edge', live)
        # Aynı makine iki fırına atanmaz.
        self.assertEqual(len(ids), len(mapping['pairs']))
        print(f"  ✓ canlı anlık görüntü: {len(live['furnaces'])} fırın · eşleme {mapping['matched']}/{mapping['furnaces']}")

    # ------------------------------------------------------------------ 3
    def test_03_mapping_rules(self):
        machines = [
            {'id': 'MCH-01', 'name': 'A Fırını', 'type': 'FURNACE'},
            {'id': 'MCH-02', 'name': 'B Fırını', 'type': 'FURNACE'},
            {'id': 'MCH-10', 'name': 'Homojen 1', 'type': 'HOMO_FURNACE'},
            {'id': 'MCH-08', 'name': 'Testere 1', 'type': 'SAW'},
        ]
        auto = build_map(machines, ['Ergitme Ocağı 1', 'Homojenizasyon Fırını'])
        self.assertEqual([p['machineId'] for p in auto['pairs']], ['MCH-01', 'MCH-10'])
        explicit = build_map(machines, ['Ergitme Ocağı 1'], {'Ergitme Ocağı 1': 'MCH-02'})
        self.assertEqual(explicit['pairs'][0]['machineId'], 'MCH-02')
        self.assertEqual(explicit['pairs'][0]['source'], 'config')
        unknown = build_map(machines, ['Bilinmeyen Ünite'])
        self.assertEqual(len(unknown['pairs']), 0)
        self.assertEqual(len(unknown['unmatched']), 1)
        two = build_map(machines, ['Eritme 1', 'Eritme 2'])
        self.assertEqual({p['machineId'] for p in two['pairs']}, {'MCH-01', 'MCH-02'})
        third = build_map(machines, ['Eritme 1', 'Eritme 2', 'Eritme 3'])
        self.assertEqual(len(third['pairs']), 2)
        self.assertEqual(len(third['unmatched']), 1, 'Boş makine yokken uydurma eşleme yapıldı')
        self.assertEqual(normalize('Yaşlandırma Fırını'), 'yaslandirmafirini')
        self.assertIn('HOMO_FURNACE', preferred_types('Homojenizasyon Fırını'))
        print('  ✓ eşleme: açık kayıt · anahtar kelime · çakışma yok · eşleşmeyen uyarısı')

    # ------------------------------------------------------------------ 4
    def test_04_orders_create_and_start(self):
        status, data = self.post('/api/sim/orders', {
            'product': 'Alüminyum Profili', 'furnace': 'Homojenizasyon Fırını',
            'target_temp': 60, 'duration_min': 0.2
        })
        self.assertEqual(status, 201)
        self.assertTrue(data['order']['id'].startswith('WO-'))
        self.assertEqual(data['order']['state'], 'CREATED')
        order_id = data['order']['id']
        status, data = self.get_json('/api/sim/orders')
        self.assertTrue(any(o['id'] == order_id for o in data['orders']))
        status, data = self.post('/api/sim/orders/start', {'id': order_id})
        self.assertEqual(status, 200)
        self.assertEqual(data['order']['state'], 'RUNNING')
        # Aynı fırına ikinci emir: simülasyon 409 döner, köprü 400'e eşler.
        self.post('/api/sim/orders', {'product': 'X', 'furnace': 'Homojenizasyon Fırını',
                                      'target_temp': 100, 'duration_min': 1})
        busy = next(o for o in self.get_json('/api/sim/orders')[1]['orders']
                    if o['state'] == 'CREATED')
        status, data = self.post('/api/sim/orders/start', {'id': busy['id']})
        self.assertEqual(status, 400)
        self.assertIn('meşgul', data['error'].lower())
        # Geçersiz hedef ve bilinmeyen emir
        status, data = self.post('/api/sim/orders', {'product': 'X',
                                                     'furnace': 'Homojenizasyon Fırını',
                                                     'target_temp': 5000, 'duration_min': 1})
        self.assertEqual(status, 400)
        status, data = self.post('/api/sim/orders/start', {'id': 'WO-YOK'})
        self.assertEqual(status, 400)
        print('  ✓ emir oluştur/başlat · meşgul fırın 400 · geçersiz hedef · bilinmeyen emir')

    # ------------------------------------------------------------------ 5
    def test_05_readings_proxy(self):
        self.sim.engine.advance(45, step=1)
        status, data = self.get_json('/api/sim/readings?name=Homojenizasyon%20F%C4%B1r%C4%B1n%C4%B1&limit=20')
        self.assertEqual(status, 200)
        readings = data['readings']
        self.assertGreater(len(readings), 1)
        self.assertTrue(all(r['temperatureC'] is not None for r in data['readings']))
        self.assertTrue(any(r['temperatureC'] > 25 for r in data['readings']))
        self.assertEqual(data['furnace'], 'Homojenizasyon Fırını')
        status, data = self.get_json('/api/sim/readings')
        self.assertEqual(status, 400)
        self.assertIn('name', data['error'])
        print(f"  ✓ sıcaklık geçmişi: {len(readings)} okuma · ad zorunlu 400")

    # ------------------------------------------------------------------ 6
    def test_06_signed_ingest_and_idempotency(self):
        ping = {'kind': 'edge-ping', 'siteCode': 'FIRM1', 'at': '2026-11-24T10:00:00+0000'}
        status, data = self.upload(ping, client_id='PING-1')
        self.assertEqual(status, 200)
        self.assertTrue(data['ping'])
        self.assertEqual(self.state.store.counts()['batches'], 0, 'Ping batch olarak yazıldı')
        self.assertEqual(self.state.store.counts()['pings'], 1)

        status, data = self.upload(self.batch('B-SMOKE-1', 3))
        self.assertEqual(status, 200)
        self.assertTrue(data['accepted'])
        self.assertEqual(data['readings'], 3)
        self.assertEqual(data['events'], 1)
        before = self.state.store.counts()
        status, data = self.upload(self.batch('B-SMOKE-1', 3))
        self.assertEqual(status, 200)
        self.assertTrue(data['duplicate'])
        self.assertEqual(self.state.store.counts(), before, 'Yinelenen batch sayıları şişirdi')
        status, data = self.upload(self.batch('B-SMOKE-2', 1), signature='0' * 64)
        self.assertEqual(status, 401)
        self.assertIn('İmza', data['error'])
        status, data = self.upload({'kind': 'edge-batch', 'batchId': 'B-BAD'}, signature=None)
        # İmza doğru ama okuma yok: kabul edilir, boş batch yazılmaz.
        self.assertEqual(status, 200)
        status, data = self.upload({'kind': 'other', 'batchId': 'B-X'})
        self.assertEqual(status, 400)
        self.assertEqual(self.state.store.counts()['batches'], 2)
        print('  ✓ HMAC ingest · ping batch değil · yinelenen batch korunur · yanlış imza 401')

    # ------------------------------------------------------------------ 7
    def test_07_edge_summary_for_ui(self):
        status, data = self.get_json('/api/edge/summary')
        self.assertEqual(status, 200)
        self.assertGreaterEqual(data['batches'], 2)
        self.assertGreaterEqual(data['readings'], 3)
        self.assertIsNotNone(data['lastBatch'])
        self.assertTrue(data['byAdapter'])
        status, batches = self.get_json('/api/edge/batches?limit=10')
        smoke = next(b for b in batches['batches'] if b['batch_id'] == 'B-SMOKE-1')
        self.assertEqual(smoke['site_code'], 'FIRM1')
        self.assertEqual(smoke['reading_count'], 3)
        self.assertEqual(smoke['event_count'], 1)
        status, data = self.get_json('/api/edge/latest?limit=5')
        self.assertLessEqual(len(data['readings']), 5)
        self.assertGreaterEqual(len(data['events']), 1)
        status, live = self.get_json('/api/sim/live')
        self.assertGreaterEqual(live['edge']['readings'], 3)
        self.assertTrue(live['edge']['latestReadings'])
        print(f"  ✓ edge özeti: {live['edge']['batches']} batch · {live['edge']['readings']} okuma · arayüz verisi hazır")

    # ------------------------------------------------------------------ 8
    def test_08_engine_alarm_completion_and_busy(self):
        engine = FurnaceEngine(speed=1.0)
        order = engine.create_order('Alarm', 'Aluminyum Eritme Fırını', 900, 1)
        engine.start_order(order['id'])
        engine.advance(665, step=1)
        furnace = engine.furnaces['Aluminyum Eritme Fırını']
        self.assertEqual(furnace['status'], 'ALARM')
        self.assertFalse(furnace['burner'])
        self.assertIn('850', furnace['alarm'])
        self.assertEqual(engine.orders[order['id']]['state'], 'RUNNING')
        engine.advance(900, step=1)  # soğuma → alarm temizlenir, emir iptal
        self.assertIn(engine.orders[order['id']]['state'], ('CANCELLED', 'RUNNING'))

        quick = FurnaceEngine(speed=1.0)
        o2 = quick.create_order('Hızlı', 'Homojenizasyon Fırını', 60, 0.2)
        quick.start_order(o2['id'])
        quick.advance(120, step=0.5)
        self.assertEqual(quick.orders[o2['id']]['state'], 'COMPLETED')
        self.assertIsNone(quick.furnaces['Homojenizasyon Fırını']['busy_order'])
        self.assertIsNotNone(quick.orders[o2['id']]['summary'])
        # Çalışan emir varken ikinci emir aynı fırına atanamaz.
        active = FurnaceEngine(speed=1.0)
        first = active.create_order('Birinci', 'Homojenizasyon Fırını', 500, 5)
        active.start_order(first['id'])
        second = active.create_order('İkinci', 'Homojenizasyon Fırını', 500, 5)
        with self.assertRaises(RuntimeError):
            active.start_order(second['id'])
        print('  ✓ motor: 850 °C alarmı · brülör kapanır · süre dolunca COMPLETED · meşgul fırın reddi')

    # ------------------------------------------------------------------ 9
    def test_09_sim_down_keeps_last_snapshot(self):
        status, live = self.get_json('/api/sim/live')
        self.assertTrue(live['ok'])
        self.sim.running = False
        # Demo HTTP sunucusunu kapat: köprü "son veri + uyarı" göstermeli.
        self.sim.httpd.shutdown()
        self.sim.httpd.server_close()
        status, data = self.get_json('/api/sim/live')
        self.assertEqual(status, 200, 'Simülasyon kapalıyken köprü 200 + stale dönmeli')
        self.assertFalse(data['ok'])
        self.assertTrue(data['stale'])
        self.assertTrue(data['furnaces'], 'Son bilinen fırınlar kayboldu')
        status, health = self.get_json('/api/sim/health')
        self.assertFalse(health['ok'])
        code, order = self.post('/api/sim/orders', {'product': 'X', 'furnace': 'A',
                                                   'target_temp': 100, 'duration_min': 1})
        self.assertEqual(code, 503)
        self.assertIn('ulaşılamadı', order['error'])
        print('  ✓ simülasyon kapanınca: son veri korunur, emir 503, sayfa yenilenmez')

    # ------------------------------------------------------------------ 10
    def test_10_store_retention_and_schema(self):
        store = IngestStore(self.base / 'store.db')
        self.assertEqual(store.counts()['batches'], 0)
        result = store.insert_batch(self.batch('B-UNIT-1'), '{}', 'test')
        self.assertFalse(result['duplicate'])
        self.assertEqual(store.counts()['readings'], 2)
        self.assertEqual(len(store.batches(5)), 1)
        self.assertEqual(store.batches(5)[0]['reading_count'], 2)
        self.assertEqual(len(store.latest_readings(10)), 2)
        self.assertEqual(len(store.last_events(10)), 1)
        print('  ✓ SQL kayıt defteri: batch · okuma · olay · sayım · son kayıt')

    # ------------------------------------------------------------------ 11
    def test_11_config_validation(self):
        status, data = self.post('/api/bridge/config', {'simBaseUrl': 'ftp://127.0.0.1:8000'})
        self.assertEqual(status, 400)
        self.assertIn('http', data['error'])
        status, data = self.post('/api/bridge/config', {'simBaseUrl': self.sim.url + '/'})
        self.assertEqual(status, 200)
        self.assertEqual(data['config']['simBaseUrl'], self.sim.url)
        self.assertEqual(data['config']['edge']['secret'], '••••••••')
        status, data = self.post('/api/bridge/config', {})
        self.assertEqual(status, 400)
        print('  ✓ adres doğrulama: http/https zorunlu, gizli anahtar maskeli, boş istek 400')


    def test_08b_scenarios_events_and_business_test(self):
        # Demo kopya kendi simülasyon ekranını da sunar (önizleme).
        with urllib.request.urlopen(self.sim.url + '/', timeout=5) as res:
            self.assertEqual(res.status, 200)
            self.assertIn('ERP Test Senaryoları', res.read().decode('utf-8'))
        with urllib.request.urlopen(self.sim.url + '/api/speed', timeout=5) as res:
            self.assertIn('adimlar', json.loads(res.read().decode('utf-8')))

        status, data = self.get_json('/api/sim/scenarios')
        self.assertEqual(status, 200)
        ids = {x['id'] for x in data['scenarios']}
        self.assertTrue({'sensor_failure', 'overheat', 'burner_failure', 'door_open', 'casting', 'reset'} <= ids)
        self.assertTrue(data['business'], 'İş akışı testleri boş')
        furnace = 'Yaşlandırma Fırını'

        status, data = self.post('/api/sim/scenarios',
                                  {'scenario': 'sensor_failure', 'furnace': furnace})
        self.assertEqual(status, 200, data)
        self.assertTrue(data['event']['id'] > 0)
        self.assertFalse(data['furnace']['sensorOk'])
        self.assertEqual(data['furnace']['quality'], 'BAD')
        self.assertTrue(data['furnace']['alarmActive'])

        status, live = self.get_json('/api/sim/live')
        self.assertEqual(status, 200)
        row = next(f for f in live['furnaces'] if f['name'] == furnace)
        self.assertFalse(row['sensorOk'])
        self.assertEqual(row['quality'], 'BAD')
        self.assertGreaterEqual(live['latestEventId'], data['event']['id'])

        status, events = self.get_json('/api/sim/events?after=0')
        self.assertEqual(status, 200)
        self.assertTrue(any(e['type'] == 'scenario_sensor_failure' for e in events['events']))
        self.assertTrue(all(e['severity'] in ('info', 'warning', 'critical', 'success')
                            for e in events['events']))

        # Arızalı fırında emir başlatılamaz.
        status, order = self.post('/api/sim/orders', {
            'product': 'Sensör testi', 'furnace': furnace,
            'target_temp': 200, 'duration_min': 2
        })
        self.assertEqual(status, 201)
        status, err = self.post('/api/sim/orders/start',
                                {'id': order['order']['id'], 'furnace': furnace})
        self.assertIn(status, (400, 409), 'Arızalı fırında emir başladı')

        # Sıfırlama sensörü ve alarmı temizler.
        status, data = self.post('/api/sim/scenarios',
                                  {'scenario': 'reset', 'furnace': furnace})
        self.assertEqual(status, 200, data)
        self.assertTrue(data['furnace']['sensorOk'])
        self.assertFalse(data['furnace']['alarmActive'])

        # İş akışı testi bildirim üretir; işletme kaydı oluşturmaz.
        status, data = self.post('/api/sim/scenarios', {'scenario': 'stock_critical'})
        self.assertEqual(status, 200, data)
        self.assertTrue(data['event']['data']['test'])
        self.assertFalse(data['event']['data']['createsRecord'])
        status, err = self.post('/api/sim/scenarios', {'scenario': 'yok'})
        self.assertEqual(status, 400)
        print('  ✓ senaryolar: sensör BAD → canlı/olay · arızalı fırında emir reddi · sıfırlama · iş akışı testi')

    def test_08c_biyet_furnace_mapping(self):
        machines = [
            {'id': 'MCH-01', 'name': 'A Fırını', 'type': 'FURNACE'},
            {'id': 'MCH-02', 'name': 'B Fırını', 'type': 'FURNACE'},
            {'id': 'MCH-10', 'name': 'Homojen 1', 'type': 'HOMO_FURNACE'},
        ]
        mapping = build_map(machines, ['Aluminyum Eritme Fırını', 'Homojenizasyon Fırını',
                                       'Biyet Isıtma Fırını'])
        self.assertEqual(mapping['matched'], 3, mapping)
        by_name = {p['furnace']: p['machineId'] for p in mapping['pairs']}
        self.assertEqual(by_name['Biyet Isıtma Fırını'], 'MCH-02')
        self.assertEqual(preferred_types('Biyet Isıtma Fırını'), ('FURNACE',))
        print('  ✓ Biyet Isıtma Fırını eşlemesi: FURNACE kuralı · 3/3')

class ClientTests(unittest.TestCase):
    def test_client_parses_dict_and_list_shapes(self):
        class Stub(SimClient):
            def __init__(self, payload):
                super().__init__('http://127.0.0.1:9', 1)
                self.payload = payload

            def _request(self, path, method='GET', body=None, timeout=None):  # noqa: ARG002
                return self.payload

        as_dict = Stub({'A Fırını': {'anlik_sicaklik': 735, 'hedef_sicaklik': 750,
                                     'maks_sicaklik': 850, 'durum': 'ISINIYOR',
                                     'brulor_acik': True, 'gaz_tuketimi': 1.2}}).furnaces()
        self.assertEqual(as_dict[0]['temperatureC'], 735.0)
        self.assertEqual(as_dict[0]['status'], 'ISINIYOR')
        self.assertTrue(as_dict[0]['burner'])
        as_list = Stub([{'name': 'B Fırını', 'temperature': 120, 'status': 'alarm',
                         'alarm': 'Aşırı sıcaklık'}]).furnaces()
        self.assertEqual(as_list[0]['status'], 'ALARM')
        self.assertTrue(as_list[0]['alarmActive'])
        orders = Stub({'orders': [{'id': 'WO-1', 'state': 'completed', 'product': 'Profil'}]}).orders()
        self.assertEqual(orders[0]['state'], 'COMPLETED')
        print('  ✓ istemci: sözlük/liste yanıtı · Türkçe alanlar · durum normalizasyonu')


class RuntimeLayoutTests(unittest.TestCase):
    """Exe yerleşimi: statik dosyalar içeride, ayar/profil/SQL exe yanında."""

    def test_runtime_files_are_created_next_to_exe(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            state = BridgeState(asset_root=ROOT, base_dir=base)
            self.assertTrue(state.runtime_layout)
            self.assertTrue((base / 'config.json').exists(), 'config.json exe yanında oluşmadı')
            profile = base / 'config' / 'ornek-fabrika-profili.json'
            self.assertTrue(profile.exists(), 'profil exe yanına kopyalanmadı')
            cfg = json.loads((base / 'config.json').read_text(encoding='utf-8'))
            self.assertEqual(cfg['profilePath'], 'config/ornek-fabrika-profili.json')
            self.assertEqual(cfg['ingestDb'], 'data/ingest.db')
            self.assertGreater(len(state.profile()['machines']), 0)
            self.assertTrue(str(state.store.path).startswith(str(base)))
            self.assertEqual(state.mapping([])['profilePath'], str(profile))
            state.set_sim_url('http://127.0.0.1:8000')
            saved = json.loads((base / 'config.json').read_text(encoding='utf-8'))
            self.assertEqual(saved['simBaseUrl'], 'http://127.0.0.1:8000')
            self.assertEqual(saved['edge']['secret'], SECRET)
            print('  ✓ exe yerleşimi: config + profil + SQL exe yanında, statik app içeride')

    def test_bridge_info_reports_layout(self):
        with tempfile.TemporaryDirectory() as tmp:
            state = BridgeState(asset_root=ROOT, base_dir=Path(tmp), sim_url='http://127.0.0.1:9')
            httpd = make_server(state, '127.0.0.1', 0)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            try:
                base = f'http://127.0.0.1:{httpd.server_address[1]}'
                with urllib.request.urlopen(base + '/app/', timeout=3) as res:
                    self.assertEqual(res.status, 200)
                    self.assertIn('ERP Studio', res.read().decode('utf-8'))
                with urllib.request.urlopen(base + '/api/bridge/info', timeout=3) as res:
                    info = json.loads(res.read().decode('utf-8'))
                self.assertTrue(info['runtimeLayout'])
                self.assertEqual(info['root'], str(ROOT))
                self.assertNotEqual(info['root'], info['baseDir'])
                with urlopen_error(base + '/config.json') as code:
                    self.assertEqual(code, 404, 'Exe yanındaki config sunulmamalı')
            finally:
                httpd.shutdown()
                httpd.server_close()
            print('  ✓ exe yerleşimi HTTP: /app/ 200 · runtimeLayout · config dışarıda')

    def test_windows_launcher_and_spec(self):
        launcher = ROOT / 'Baslat.bat'
        spec = ROOT / 'server' / 'sim_bridge' / 'erp-sim-bridge.spec'
        build = ROOT / 'server' / 'sim_bridge' / 'build_exe.bat'
        entry = ROOT / 'server' / 'sim_bridge' / 'exe_entry.py'
        for path in (launcher, spec, build, entry):
            self.assertTrue(path.exists(), f'{path.name} yok')
        text = launcher.read_text(encoding='utf-8')
        for needle in ('server\\sim_bridge\\run.py', 'localhost:8080', 'localhost:8000',
                       'ERP-Sim-Bridge.exe', '--open'):
            self.assertIn(needle, text)
        spec_text = spec.read_text(encoding='utf-8')
        for needle in ("name='ERP-Sim-Bridge'", "'app'", "ornek-fabrika-profili.json",
                       'erp_edge', 'exe_entry.py', 'console=True'):
            self.assertIn(needle, spec_text)
        self.assertIn('PyInstaller', build.read_text(encoding='utf-8'))
        print('  ✓ Windows: Baslat.bat · build_exe.bat · ERP-Sim-Bridge.exe spec')

    def test_macos_launcher_and_spec(self):
        launcher = ROOT / 'Baslat.command'
        spec = ROOT / 'server' / 'sim_bridge' / 'erp-sim-bridge-macos.spec'
        build = ROOT / 'server' / 'sim_bridge' / 'build_macos.sh'
        for path in (launcher, spec, build):
            self.assertTrue(path.exists(), f'{path.name} yok')
        self.assertTrue(os.access(launcher, os.X_OK), 'Baslat.command çalıştırılabilir değil')
        self.assertTrue(os.access(build, os.X_OK), 'build_macos.sh çalıştırılabilir değil')
        text = launcher.read_text(encoding='utf-8')
        for needle in ('server/sim_bridge/run.py', '127.0.0.1', 'localhost:8080',
                       'dist/ERP-Sim-Bridge.app', '--open', 'osascript'):
            self.assertIn(needle, text)
        spec_text = spec.read_text(encoding='utf-8')
        for needle in ("name='ERP-Sim-Bridge.app'", 'BUNDLE(', 'console=False',
                       'erp_edge.sim_map', '1.4.2'):
            self.assertIn(needle, spec_text)
        build_text = build.read_text(encoding='utf-8')
        self.assertIn('Darwin', build_text)
        self.assertIn('PyInstaller', build_text)
        from server.sim_bridge.app import ASSET_ROOT, runtime_base_dir
        mac_dir = runtime_base_dir(True, 'darwin', '/Applications/ERP-Sim-Bridge.app/Contents/MacOS/ERP-Sim-Bridge')
        self.assertEqual(mac_dir, Path.home() / 'Library' / 'Application Support' / 'ERP-Sim-Bridge')
        win_dir = runtime_base_dir(True, 'win32', str(ROOT / 'dist' / 'ERP-Sim-Bridge.exe'))
        self.assertEqual(win_dir, (ROOT / 'dist').resolve())
        self.assertEqual(runtime_base_dir(False), ASSET_ROOT)
        print('  ✓ macOS: Baslat.command · build_macos.sh · .app spec · yazılabilir klasör')


def urlopen_error(url):
    try:
        urllib.request.urlopen(url, timeout=3)
    except urllib.error.HTTPError as exc:
        return _Code(exc.code)
    return _Code(200)


class _Code:
    def __init__(self, code):
        self.code = code

    def __enter__(self):
        return self.code

    def __exit__(self, *args):
        return False


if __name__ == '__main__':
    print('Simülasyon köprüsü — duman testi\n')
    suite = unittest.TestLoader().loadTestsFromTestCase(BridgeTests)
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(ClientTests))
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(RuntimeLayoutTests))
    result = unittest.TextTestRunner(verbosity=0).run(suite)
    print('\nSonuç:', 'TÜM TESTLER GEÇTİ' if result.wasSuccessful()
          else f'{len(result.failures) + len(result.errors)} HATA')
    sys.exit(0 if result.wasSuccessful() else 1)
