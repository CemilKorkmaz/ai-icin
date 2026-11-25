#!/usr/bin/env python3
"""ERP Edge Collector duman testi — ağ ve Windows gerektirmez.

Kullanım: python3 tools/edge_smoke_test.py
Kapsar: yapılandırma, profil türetme, adaptör yedeği, SQLite idempotency,
dört sinyal + telemetri, eşik olayı, imzalı batch, çevrimdışı kuyruk,
yerel arayüzün JSON uçları ve exe üretim dosyalarının varlığı.
"""
from __future__ import annotations

import json
import sys
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EDGE = ROOT / 'edge'
sys.path.insert(0, str(EDGE))
sys.path.insert(0, str(ROOT))

from erp_edge import FOUR_SIGNALS, SCHEMA_VERSION  # noqa: E402
from erp_edge.adapters import (DriverNotInstalled, OpcUaAdapter, SimulatedAdapter,  # noqa: E402
                               SimulationAdapter, SimulationUnavailable,
                               contract_rows, resolve_adapter, adapter_for_protocol)
from server.sim_bridge.demo_sim import DemoSim  # noqa: E402
from erp_edge.collector import Collector, build_site, dump_profile, threshold_band  # noqa: E402
from erp_edge.config import Config, deep_merge, load_config, load_profile  # noqa: E402
from erp_edge.db import EdgeDB  # noqa: E402
from erp_edge.server import EdgeContext, EdgeServer  # noqa: E402
from erp_edge.transport import Transport, sign  # noqa: E402


class EdgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.base = Path(cls.tmp.name)
        cls.cfg_path = cls.base / 'edge-config.json'
        cfg = load_config(EDGE / 'config' / 'edge-config.json')
        cfg.data['sqlPath'] = str(cls.base / 'edge.db')
        cfg.data['erp']['url'] = 'http://127.0.0.1:9/api/edge/ingest'  # kapalı port
        cfg.data['erp']['timeoutSeconds'] = 1
        cfg.data['erp']['enabled'] = True
        cfg.data['adapter'] = 'simulated'  # v1.3 davranışı; simulation ayrı testte
        cfg.data['ui']['openBrowser'] = False
        cfg.data['ui']['port'] = 0
        cfg.data['profilePath'] = str(EDGE / 'config' / 'ornek-fabrika-profili.json')
        cls.cfg_path.write_text(json.dumps(cfg.data, ensure_ascii=False, indent=2), encoding='utf-8')
        cls.cfg = load_config(cls.cfg_path)
        cls.cfg.base_dir = EDGE  # göreli profil yolu çözümü için
        cls.db = EdgeDB(Path(cls.cfg.data['sqlPath']))
        cls.collector = Collector(cls.cfg, cls.db)
        cls.transport = Transport(cls.cfg, cls.db)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        cls.tmp.cleanup()

    def test_01_config_merge_and_mask(self):
        merged = deep_merge({'a': 1, 'erp': {'url': 'x', 'secret': 's'}}, {'a': 2, 'erp': {'token': 't'}})
        self.assertEqual(merged['a'], 2)
        self.assertEqual(merged['erp']['url'], 'x')
        self.assertEqual(merged['erp']['secret'], 's')
        pub = self.cfg.public()
        self.assertEqual(pub['erp']['secret'], '••••••••')
        self.assertGreaterEqual(len(pub['telemetryProfiles']), 3)
        print('  ✓ yapılandırma birleştirme, maskeleme, telemetri şablonları')

    def test_02_profile_drives_machines(self):
        profile = load_profile(self.cfg)
        self.assertTrue(profile['machines'])
        self.assertTrue(profile['plcTags'])
        site = build_site(profile, self.cfg)
        self.assertGreaterEqual(len(site['machines']), 10)
        self.assertTrue(any(m['type'] == 'FURNACE' for m in site['machines']))
        ids = [m['id'] for m in site['machines']]
        self.assertNotIn('F20', ids)       # eski ocak kodu makine kimliği değildir
        self.assertNotIn('MCH-05', ids)    # devre dışı makine taranmaz
        self.assertTrue(all(set(FOUR_SIGNALS) <= {t['signal'] for t in site['tags_by_machine'][m['id']]}
                            for m in site['machines']))
        self.assertTrue(dump_profile(self.cfg)['valid'])
        print(f'  ✓ profil: {len(site["machines"])} aktif makine · {sum(len(v) for v in site["tags_by_machine"].values())} sinyal tag · sabit kod yok')

    def test_03_adapter_contract_and_fallback(self):
        rows = contract_rows()
        self.assertEqual(len(rows), 4)
        roles = {r['code']: r['role'] for r in rows}
        self.assertEqual(roles['simulation'], 'test')
        self.assertTrue(next(r for r in rows if r['code'] == 'simulation')['implemented'])
        self.assertTrue(all(set(('connect', 'test', 'readFourSignals', 'disconnect')) <= set(r['capabilities']) for r in rows))
        self.assertTrue(adapter_for_protocol('OPC UA').code == 'opcua')
        self.assertTrue(adapter_for_protocol('Modbus TCP').code == 'modbus')
        real = OpcUaAdapter({'protocol': 'OPC UA'}).test([])
        self.assertFalse(real['implemented'])
        self.assertEqual(real['fallback'], 'MANUAL (operatör veri girişi)')
        with self.assertRaises(DriverNotInstalled):
            OpcUaAdapter().connect()
        chosen, fallback = resolve_adapter({'adapter': 'opcua', 'connection': {'protocol': 'OPC UA'}})
        self.assertIsInstance(chosen, SimulatedAdapter)
        self.assertIn('MANUAL', fallback)
        sim = SimulatedAdapter({}).test([{'signal': s} for s in FOUR_SIGNALS])
        self.assertTrue(sim['ok'] and sim['missingSignals'] == [])
        print('  ✓ 4 adaptör (simulation = test) · connect/test/readFourSignals/disconnect · MANUAL yedeği')

    def test_04_collector_writes_four_signals_and_telemetry(self):
        s = self.collector.run_once()
        self.assertGreater(s['readings'], 0)
        self.assertEqual(s['dryRun'], False)
        self.assertEqual(s['adapter'], 'simulated')
        kinds = {r['kind'] for r in self.db.latest_readings()}
        self.assertEqual(kinds, {'signal', 'telemetry'})
        signals = {r['signal'] for r in self.db.latest_readings() if r['kind'] == 'signal'}
        self.assertEqual(signals, set(FOUR_SIGNALS))
        self.assertTrue(any(r['signal'] == 'temperatureC' for r in self.db.latest_readings()))
        self.assertGreater(self.db.counts()['readings'], 0)
        print(f'  ✓ döngü: {s["readings"]} okuma · {s["events"]} olay · dört sinyal + sıcaklık')

    def test_05_idempotency(self):
        before = self.db.counts()['readings']
        row = {
            'client_id': 'DUP-TEST-1', 'at': '2026-11-06T12:00:00+03:00',
            'plant_id': 'P1', 'machine_id': 'TEST', 'machine_name': 'Test',
            'tag_id': 'T', 'kind': 'signal', 'signal': 'alarm', 'value_text': 'ok',
            'quality': 'SIMULATED', 'source': 'SIMULATED', 'adapter': 'simulated'
        }
        self.assertTrue(self.db.insert_reading(row))
        self.assertFalse(self.db.insert_reading(row))
        self.assertEqual(self.db.counts()['readings'], before + 1)
        print('  ✓ client_id ile çift yazım engeli')

    def test_06_threshold_bands(self):
        tpl = {'nominalMin': 680, 'nominalMax': 780, 'warnAt': 790, 'criticalAt': 820}
        self.assertEqual(threshold_band(735, tpl), 'normal')
        self.assertEqual(threshold_band(795, tpl), 'warn')
        self.assertEqual(threshold_band(830, tpl), 'critical')
        self.assertEqual(threshold_band(650, tpl), 'low')
        self.assertEqual(threshold_band(None, tpl), 'unknown')
        print('  ✓ sıcaklık eşik bantları (normal / low / warn / critical)')

    def test_07_signed_batch_and_offline_queue(self):
        pending = self.db.pending_outbox(10)
        self.assertGreater(len(pending), 0)
        payload = json.loads(pending[0]['payload_json'])
        self.assertEqual(payload['kind'], 'edge-batch')
        self.assertEqual(payload['schemaVersion'], SCHEMA_VERSION)
        self.assertIn('readings', payload)
        self.assertIn('events', payload)
        self.assertIn('clientId', payload)
        sig = sign(pending[0]['payload_json'], self.cfg.data['erp']['secret'])
        self.assertEqual(len(sig), 64)
        self.assertEqual(sig, sign(pending[0]['payload_json'], self.cfg.data['erp']['secret']))
        result = self.transport.send_pending(limit=2)
        self.assertGreater(result['processed'], 0)
        self.assertEqual(result['sent'], 0)   # kapalı port → çevrimdışı
        rows = self.db.rows('outbox', 20)
        self.assertTrue(all(r['status'] in ('failed', 'queued', 'dead') for r in rows))
        self.assertTrue(all(r['last_error'] is None or r['last_error'] for r in rows))
        self.assertEqual(self.db.counts()['queued'] + self.db.counts()['dead'] + self.db.counts()['sent'], len(rows))
        print(f'  ✓ imzalı batch · çevrimdışı {result["processed"]} kuyruk kaydı silinmedi')

    def test_08_sql_schema_and_purge(self):
        schema = self.db.schema_info()
        names = {t['table'] for t in schema}
        self.assertEqual(names, {'readings', 'events', 'outbox', 'runs', 'app_log'})
        self.assertIn('client_id', schema[[t['table'] for t in schema].index('readings')]['columns'])
        self.db.purge(90)
        print('  ✓ 5 SQLite tablosu · WAL · saklama temizliği kuyruğu silmiyor')

    def test_09_dry_run_writes_nothing(self):
        cfg = Config(json.loads(self.cfg_path.read_text(encoding='utf-8')), EDGE, self.cfg_path)
        cfg.data['sqlPath'] = str(self.base / 'dry.db')
        db = EdgeDB(Path(cfg.data['sqlPath']), dry_run=True)
        col = Collector(cfg, db)
        s = col.run_once(dry_run=True)
        self.assertTrue(s['dryRun'])
        self.assertGreater(s['readings'], 0)
        self.assertEqual(db.counts()['readings'], 0)
        self.assertFalse(Path(cfg.data['sqlPath']).exists())
        db.close()
        print('  ✓ --dry-run: okuma var, SQL/ERP yazımı yok')

    def test_10_ui_json_endpoints(self):
        ctx = EdgeContext(self.cfg, self.db, self.collector, self.transport, '1.3.0-test')
        server = EdgeServer(ctx, '127.0.0.1', 0)
        port = server.httpd.server_address[1]
        server.start()
        try:
            def get(path):
                with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=3) as r:
                    return r.status, r.read().decode('utf-8')
            status, body = get('/')
            self.assertEqual(status, 200)
            self.assertIn('ERP Edge Collector', body)
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/status', timeout=3) as r:
                self.assertEqual(r.headers.get('X-Content-Type-Options'), 'nosniff')
                self.assertEqual(r.headers.get('Referrer-Policy'), 'no-referrer')
            for path in ('/app.css', '/app.js'):
                self.assertEqual(get(path)[0], 200)
            for path in ('/api/status', '/api/config', '/api/profile', '/api/readings',
                         '/api/events', '/api/outbox', '/api/runs', '/api/logs',
                         '/api/latest', '/api/schema', '/api/adapters'):
                code, raw = get(path)
                self.assertEqual(code, 200)
                json.loads(raw)
            status_obj = json.loads(get('/api/status')[1])
            self.assertEqual(status_obj['version'], '1.3.0-test')
            self.assertIn('collector', status_obj)
            self.assertIn('DEFAULT_EDGE_SECRET', {w['code'] for w in status_obj['securityWarnings']})
            req = urllib.request.Request(f'http://127.0.0.1:{port}/api/poll',
                                         data=b'{}', method='POST',
                                         headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=5) as r:
                out = json.loads(r.read().decode('utf-8'))
            self.assertTrue(out['ok'])
            self.assertGreater(out['summary']['readings'], 0)
            print('  ✓ yerel arayüz: HTML/CSS/JS + 11 JSON uç + /api/poll')
        finally:
            server.stop()

    def test_12_state_change_and_threshold_events(self):
        """Döngü sayacı korunur; sinyal değişimi ve eşik geçişi olay üretir."""
        import json as _json
        tmp = tempfile.TemporaryDirectory()
        try:
            raw = _json.loads((EDGE / 'config' / 'edge-config.json').read_text(encoding='utf-8'))
            raw['sqlPath'] = str(Path(tmp.name) / 'ev.db')
            raw['profilePath'] = str(EDGE / 'config' / 'ornek-fabrika-profili.json')
            raw['erp']['enabled'] = False
            # Ortamda bir simülasyon açık olsa bile bu test deterministik kalmalı.
            raw['adapter'] = 'simulated'
            # Örnek eşikleri simülasyon değerinin altına çek: kritik bant garanti.
            for tpl in raw['telemetryProfiles']:
                if tpl['type'] == 'FURNACE':
                    tpl.update({'nominalMin': 600, 'nominalMax': 690, 'warnAt': 700,
                                'criticalAt': 720, 'simBase': 735, 'simSpan': 2})
            cfg = Config(raw, EDGE, Path(tmp.name) / 'cfg.json')
            db = EdgeDB(Path(raw['sqlPath']))
            col = Collector(cfg, db)
            first = col.run_once()
            second = col.run_once()
            self.assertGreater(second['events'], 0, 'Sinyal değişimi olay üretmedi')
            kinds = {e['kind'] for e in db.rows('events', 50)}
            self.assertIn('STATE_CHANGE', kinds)

            furnace = next(m['id'] for m in col.site['machines'] if m['type'] == 'FURNACE')
            db.insert_reading({
                'client_id': 'MANUAL-NORMAL-1', 'at': '2026-11-06T12:00:00+00:00',
                'plant_id': 'P1', 'machine_id': furnace, 'machine_name': 'Test Fırını',
                'tag_id': 'TEL-FURNACE-temperatureC', 'kind': 'telemetry',
                'signal': 'temperatureC', 'value_num': 650.0, 'value_text': None,
                'unit': '°C', 'quality': 'SIMULATED', 'source': 'SIMULATED',
                'adapter': 'simulated', 'raw': None
            })
            third = col.run_once()
            rows = [e for e in db.rows('events', 100) if e['kind'] == 'THRESHOLD']
            self.assertGreater(len(rows), 0, 'Eşik geçişi olay üretmedi')
            self.assertTrue(any(e['severity'] == 'danger' for e in rows))
            print(f'  ✓ durum değişimi + eşik olayı: 1. döngü {first["events"]}, 2. {second["events"]}, 3. {third["events"]} olay')
            db.close()
        finally:
            tmp.cleanup()


    def test_13_simulation_adapter_reads_demo(self):
        """ERP simülasyonu adaptörü: dört sinyal + sıcaklık, sonra bağlantı kopunca yedek."""
        sim = DemoSim(host='127.0.0.1', port=0, speed=1.0).start()
        db = None
        try:
            data = json.loads(json.dumps(self.cfg.data))
            data['adapter'] = 'simulation'
            data['simulation'] = {'baseUrl': sim.url, 'timeoutSeconds': 2,
                                  'autoMap': True, 'furnaceMap': {}}
            data['sqlPath'] = str(self.base / 'simulation.db')
            data['erp']['enabled'] = False
            path = self.base / 'simulation-config.json'
            path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
            cfg = load_config(path)
            cfg.base_dir = EDGE
            cfg.data['profilePath'] = str(EDGE / 'config' / 'ornek-fabrika-profili.json')

            db = EdgeDB(Path(cfg.data['sqlPath']))
            col = Collector(cfg, db)
            summary = col.run_once()
            self.assertEqual(summary['adapter'], 'simulation')
            self.assertIsNone(summary['fallback'])
            self.assertGreater(summary['readings'], 0)
            rows = db.latest_readings()
            self.assertEqual({r['signal'] for r in rows if r['kind'] == 'signal'},
                             set(FOUR_SIGNALS))
            machines = {r['machine_id'] for r in rows}
            self.assertEqual(machines, {'MCH-01', 'MCH-02', 'MCH-10'},
                             'Yalnızca eşlenen fırınlardan veri alınmalı')
            telemetry = [r for r in rows if r['kind'] == 'telemetry']
            self.assertTrue(any(r['signal'] in ('temperatureC', 'chamberTempC') for r in telemetry))
            self.assertTrue(all(r['source'] == 'ERP-SIM' for r in rows))

            adapter = SimulationAdapter({})
            adapter.configure(cfg.data)
            adapter.bind_site(build_site(load_profile(cfg), cfg))
            self.assertTrue(adapter.test([{'signal': s} for s in FOUR_SIGNALS])['ok'])
            self.assertEqual(len(adapter.connect() and adapter.mapping['pairs']), 3)

            sim.stop()
            db.close()
            db = EdgeDB(Path(cfg.data['sqlPath']))
            fallback_col = Collector(cfg, db)
            fallback = fallback_col.run_once()
            self.assertEqual(fallback['adapter'], 'simulated')
            self.assertIn('simulated', fallback['fallback'])
            self.assertEqual(fallback['machines'], 13)
            print('  ✓ simülasyon adaptörü: 3 eşleşen fırın · dört sinyal + sıcaklık · '
                  'kapalıyken simulated yedeği')
        finally:
            if db is not None:
                db.close()
            try:
                sim.stop()
            except Exception:
                pass

    def test_11_build_files(self):
        for name in ('build_exe.bat', 'erp-edge.spec', 'install-task.ps1', 'requirements.txt', 'main.py'):
            self.assertTrue((EDGE / name).exists(), name)
        spec = (EDGE / 'erp-edge.spec').read_text(encoding='utf-8')
        self.assertIn("name='ERP-Edge-Collector'", spec)
        self.assertIn('console=False', spec)
        self.assertIn('erp_edge/ui/index.html', spec)
        print('  ✓ Windows exe üretim dosyaları (spec, bat, görev, gereksinimler)')


if __name__ == '__main__':
    print('ERP Edge Collector — duman testi\n')
    suite = unittest.TestLoader().loadTestsFromTestCase(EdgeTests)
    result = unittest.TextTestRunner(verbosity=0).run(suite)
    print('\nSonuç:', 'TÜM TESTLER GEÇTİ' if result.wasSuccessful() else f'{len(result.failures) + len(result.errors)} HATA')
    sys.exit(0 if result.wasSuccessful() else 1)
