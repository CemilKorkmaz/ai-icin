"""Kullanıcı simülasyonunun birebir çalışan, bağımlılıksız bir kopyası (önizleme).

Gerçek simülasyon kullanıcının makinesindedir (FastAPI + Uvicorn, `:8000`).
Buradaki kopya yalnızca iki iş için vardır:

1. Bu depoda önizleme/test yaparken gerçek simülasyon kapalıyken de arayüzün
   canlı veri göstermesi,
2. `tools/sim_bridge_smoke_test.py` içinde ağ davranışının sınanması.

Belgelenen sözleşmeyi uygular: `GET /api/furnaces`, `GET /api/orders`,
`POST /api/orders`, `POST /api/orders/{id}/start`, `GET /api/readings/{ad}`,
`GET /api/scenarios`, `POST /api/scenarios`, `GET /api/events`.
WebSocket yoktur; köprü bilinçli olarak REST ile 2,5 sn'de bir okur. Kopya
olduğu her yanıtta `mode: demo` ve arayüzde “Demo kopya” etiketiyle bellidir.
"""
from __future__ import annotations

import json
import threading
import time
import urllib.parse
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

AMBIENT = 25.0

# Demo kopya, gerçek simülasyonun ekranını da sunar; böylece önizlemede
# hem simülasyon hem ERP aynı anda denenebilir.
FRONTEND_FILE = (Path(__file__).resolve().parents[2] / 'Simulasyon'
                 / 'erp-simulasyon-denemesi-main' / 'frontend' / 'index.html')

SCENARIO_DEFS = [
    {'id': 'sensor_failure', 'label': 'Sensör arızası', 'short': 'Sensör', 'severity': 'critical', 'module': 'plc', 'title': 'Sensör arızası'},
    {'id': 'overheat', 'label': 'Aşırı sıcaklık', 'short': 'Aşırı sıcaklık', 'severity': 'critical', 'module': 'plc', 'title': 'Aşırı sıcaklık alarmı'},
    {'id': 'burner_failure', 'label': 'Brülör arızası', 'short': 'Brülör', 'severity': 'critical', 'module': 'maintenance', 'title': 'Brülör arızası'},
    {'id': 'door_open', 'label': 'Kapı açık', 'short': 'Kapı', 'severity': 'warning', 'module': 'plc', 'title': 'Fırın kapısı açık'},
    {'id': 'casting', 'label': 'Döküm başlat', 'short': 'Döküm', 'severity': 'info', 'module': 'production', 'title': 'Döküm modu başladı'},
    {'id': 'reset', 'label': 'Senaryoyu sıfırla', 'short': 'Sıfırla', 'severity': 'info', 'module': 'machines', 'title': 'Test senaryosu sıfırlandı'},
]
BUSINESS_DEFS = [
    {'id': 'stock_critical', 'label': 'Kritik stok uyarısı', 'severity': 'warning', 'module': 'stock', 'title': 'Kritik stok seviyesi', 'message': 'Alüminyum külçe stok seviyesi kritik sınırın altına indi.'},
    {'id': 'quality_reject', 'label': 'Kalite reddi', 'severity': 'danger', 'module': 'batches', 'title': 'Kalite reddi', 'message': 'Bir döküm partisi karantinaya alınmalı.'},
    {'id': 'maintenance_due', 'label': 'Bakım gecikmesi', 'severity': 'warning', 'module': 'maintenance', 'title': 'Bakım gecikti', 'message': 'Planlı bakım tarihi geçti.'},
    {'id': 'shipment_pending', 'label': 'Sevkiyat onayı', 'severity': 'info', 'module': 'shipments', 'title': 'Sevkiyat iki onay bekliyor', 'message': 'Hazır sevkiyat için ikinci onay bekleniyor.'},
    {'id': 'finance_overdue', 'label': 'Vadesi geçen cari', 'severity': 'warning', 'module': 'finance', 'title': 'Vadesi geçen cari bakiye', 'message': 'Vadesi geçen bakiye muhasebe takibine düştü.'},
    {'id': 'customer_credit', 'label': 'Kredi limiti', 'severity': 'danger', 'module': 'customers', 'title': 'Kredi limiti aşıldı', 'message': 'Yeni sipariş kredi limitini aşıyor.'},
    {'id': 'production_ready', 'label': 'Üretim emri hazır', 'severity': 'info', 'module': 'production', 'title': 'Üretim emri planlandı', 'message': 'Döküm akışında operatör onayı bekliyor.'},
]
SCENARIO_BY_ID = {x['id']: x for x in SCENARIO_DEFS}
BUSINESS_BY_ID = {x['id']: x for x in BUSINESS_DEFS}

DEFAULT_FURNACES = [
    {'name': 'Aluminyum Eritme Fırını', 'max_temp': 850.0, 'heat_rate': 1.25, 'cool_rate': 0.90,
     'note': 'Ergitme ocağı · güvenlik sınırı 850 °C'},
    {'name': 'Homojenizasyon Fırını', 'max_temp': 600.0, 'heat_rate': 0.85, 'cool_rate': 0.50,
     'note': '575 °C / 8 saat reçetesi'},
    {'name': 'Yaşlandırma Fırını', 'max_temp': 220.0, 'heat_rate': 0.60, 'cool_rate': 0.35,
     'note': 'Düşük sıcaklık tavlama'},
]


class FurnaceEngine:
    """Saf durum makinesi: HTTP'den bağımsız, testte doğrudan adım atılabilir."""

    def __init__(self, speed: float = 1.0, furnaces=None):
        self.speed = max(0.1, float(speed or 1.0))
        self.furnaces: dict[str, dict] = {}
        for spec in (furnaces or DEFAULT_FURNACES):
            self.furnaces[spec['name']] = {
                'name': spec['name'], 'temperature': AMBIENT, 'target': 0.0,
                'max_temp': float(spec['max_temp']), 'heat_rate': float(spec['heat_rate']),
                'cool_rate': float(spec['cool_rate']), 'status': 'KAPALI',
                'burner': False, 'alarm': '', 'gas': 0.0, 'energy': 0.0,
                'busy_order': None, 'started_at': None, 'note': spec.get('note', ''),
                'sensor_ok': True, 'burner_fault': False, 'door_open': False,
                'casting': False, 'fault_code': None,
            }
        self.orders: dict[str, dict] = {}
        self.readings: dict[str, list[dict]] = {name: [] for name in self.furnaces}
        self.events: list[dict] = []
        self.event_seq = 0
        self.seq = 0
        self.sim_time = 0.0
        self._last = time.monotonic()

    # ------------------------------------------------------------- olaylar
    def _log(self, event_type: str, *, furnace=None, severity='info', module='plc',
             title='', message='', code='', data=None) -> dict:
        self.event_seq += 1
        event = {
            'id': self.event_seq,
            'at': datetime.now().astimezone().isoformat(timespec='seconds'),
            'type': event_type, 'severity': severity, 'module': module,
            'title': title or event_type, 'message': message,
            'code': code or event_type.upper(), 'furnace': furnace,
            'data': data or {},
        }
        self.events.append(event)
        del self.events[:-300]
        return event

    def latest_event_id(self) -> int:
        return self.event_seq

    def events_since(self, after: int = 0, limit: int = 100) -> list[dict]:
        after = max(0, int(after or 0))
        return [e for e in self.events if int(e.get('id', 0)) > after][:max(1, min(200, int(limit or 100)))]

    def scenario_catalog(self) -> dict:
        return {'scenarios': SCENARIO_DEFS, 'business': BUSINESS_DEFS,
                'furnaces': list(self.furnaces.keys())}

    def apply_scenario(self, furnace_name: str, scenario: str) -> dict:
        if scenario not in SCENARIO_BY_ID:
            raise ValueError(f'Bilinmeyen senaryo: {scenario}')
        f = self.furnaces.get(furnace_name)
        if f is None:
            raise ValueError(f'Fırın bulunamadı: {furnace_name}')
        definition = SCENARIO_BY_ID[scenario]
        message = ''
        if scenario == 'sensor_failure':
            f['sensor_ok'] = False
            f['status'] = 'ALARM'
            f['burner'] = False
            f['fault_code'] = 'SENSOR_FAULT'
            f['alarm'] = f"{f['name']}: Sıcaklık sensörü yanıt vermiyor; okuma geçersiz (BAD)."
            message = 'Sıcaklık sensörü arızalı; okuma geçersiz. Bakım ekibi kontrol etmeli.'
        elif scenario == 'overheat':
            f['temperature'] = max(f['temperature'], f['max_temp'] + 15.0)
            f['status'] = 'ALARM'
            f['burner'] = False
            f['fault_code'] = 'OVERHEAT'
            f['alarm'] = f"{f['name']}: Aşırı sıcaklık! {f['temperature']:.1f} °C > {f['max_temp']:.0f} °C"
            message = 'Sıcaklık güvenlik sınırının üstünde; brülör kapatıldı.'
        elif scenario == 'burner_failure':
            f['burner_fault'] = True
            f['status'] = 'ALARM'
            f['burner'] = False
            f['fault_code'] = 'BURNER_FAULT'
            f['alarm'] = f"{f['name']}: Brülör arızası; ısıtma yapılamıyor."
            message = 'Brülör devre dışı; sıcaklık hedefe ulaşamaz.'
        elif scenario == 'door_open':
            f['door_open'] = True
            f['status'] = 'ALARM'
            f['burner'] = False
            f['fault_code'] = 'DOOR_OPEN'
            f['alarm'] = f"{f['name']}: Kapı açık; güvenlik kilidi brülörü kapattı."
            message = 'Kapı sinyali açık; güvenlik gereği brülör kapalı.'
        elif scenario == 'casting':
            f['casting'] = True
            f['door_open'] = False
            if f['sensor_ok'] and not f['burner_fault'] and f['status'] != 'ALARM':
                f['status'] = 'BEKLETIYOR'
                f['alarm'] = ''
                f['fault_code'] = None
            message = 'Döküm/devrilme sinyali etkin.'
        elif scenario == 'reset':
            f.update({'sensor_ok': True, 'burner_fault': False, 'door_open': False,
                      'casting': False, 'status': 'KAPALI', 'burner': False,
                      'alarm': '', 'fault_code': None, 'temperature': AMBIENT,
                      'target': 0.0, 'started_at': None})
            if f['busy_order']:
                order = self.orders.get(f['busy_order'])
                if order and order['state'] == 'RUNNING':
                    order['state'] = 'CANCELLED'
                    order['note'] = 'Test senaryosu sıfırlandı'
                f['busy_order'] = None
            message = 'Sensör, kapı, brülör ve alarm durumu temizlendi.'
        event = self._log(
            f'scenario_{scenario}', furnace=f['name'], severity=definition['severity'],
            module=definition['module'], title=definition['title'],
            message=f"{f['name']}: {message}", code=definition['id'].upper(),
            data={'scenario': scenario, 'quality': 'BAD' if not f['sensor_ok'] else 'SIMULATED',
                  'state': self.furnace_state(f)},
        )
        return {'furnace': self.furnace_state(f), 'event': event}

    def apply_business_event(self, scenario: str) -> dict:
        if scenario not in BUSINESS_BY_ID:
            raise ValueError(f'Bilinmeyen iş akışı testi: {scenario}')
        definition = BUSINESS_BY_ID[scenario]
        event = self._log('business_test', severity=definition['severity'],
                          module=definition['module'], title=definition['title'],
                          message=definition['message'], code=definition['id'].upper(),
                          data={'scenario': scenario, 'test': True, 'createsRecord': False})
        return {'event': event}

    # ------------------------------------------------------------- emirler
    def create_order(self, product: str, furnace: str, target: float, duration_min: float) -> dict:
        if furnace not in self.furnaces:
            raise ValueError(f'Fırın bulunamadı: {furnace}')
        product = (product or '').strip()
        if not product:
            raise ValueError('Ürün adı zorunlu')
        try:
            target = float(target)
            duration_min = float(duration_min)
        except (TypeError, ValueError):
            raise ValueError('Hedef sıcaklık ve süre sayı olmalı')
        if target <= 0 or target > 1200:
            raise ValueError('Hedef sıcaklık 0–1200 °C aralığında olmalı')
        if duration_min <= 0 or duration_min > 24 * 60:
            raise ValueError('Süre 0–1440 dakika aralığında olmalı')
        self.seq += 1
        order = {
            'id': f"WO-{datetime.now().strftime('%Y%m%d')}-{self.seq:04d}",
            'product': product, 'furnace': furnace, 'target_temp': target,
            'duration_min': duration_min, 'state': 'CREATED',
            'created_at': datetime.now().astimezone().isoformat(timespec='seconds'),
            'started_at': None, 'completed_at': None, 'remaining_min': duration_min,
            'summary': None, 'note': ''
        }
        self.orders[order['id']] = order
        self._log('order_created', furnace=furnace, severity='info', module='production',
                  title='Üretim emri oluşturuldu',
                  message=f"{order['id']} · {product} · hedef {target:.0f} °C · {duration_min:g} dk",
                  code='ORDER_CREATED', data={'orderId': order['id']})
        return order

    def start_order(self, order_id: str) -> dict:
        order = self.orders.get(order_id)
        if not order:
            raise KeyError(order_id)
        if order['state'] != 'CREATED':
            raise RuntimeError(f"Emir {order['state']} durumunda; yalnızca CREATED başlatılabilir")
        furnace = self.furnaces[order['furnace']]
        if (not furnace['sensor_ok'] or furnace['burner_fault'] or furnace['door_open']
                or furnace['status'] == 'ALARM'):
            raise RuntimeError(f"{furnace['name']} arızalı; senaryo sıfırlanmadan başlatılamaz")
        if furnace['busy_order'] or furnace['status'] in ('ISINIYOR', 'BEKLETIYOR', 'ALARM'):
            raise RuntimeError(f"{furnace['name']} meşgul ({furnace['status']})")
        order['state'] = 'RUNNING'
        order['started_at'] = datetime.now().astimezone().isoformat(timespec='seconds')
        order['remaining_min'] = order['duration_min']
        furnace['busy_order'] = order['id']
        furnace['target'] = order['target_temp']
        furnace['status'] = 'ISINIYOR'
        furnace['burner'] = True
        furnace['started_at'] = order['started_at']
        self._log('order_started', furnace=furnace['name'], severity='info', module='production',
                  title='Üretim emri başlatıldı',
                  message=f"{order['id']} · {order['product']} · {furnace['name']} ısınmaya başladı.",
                  code='ORDER_STARTED', data={'orderId': order['id']})
        return order

    # ------------------------------------------------------------- zaman
    def tick(self, dt_real: float | None = None) -> None:
        now = time.monotonic()
        if dt_real is None:
            dt_real = max(0.0, now - self._last)
        self._last = now
        self.step(dt_real * self.speed)

    def step(self, sim_seconds: float) -> None:
        """Simüle edilen saniye kadar ilerletir (testlerde doğrudan çağrılır)."""
        sim_seconds = max(0.0, float(sim_seconds))
        self.sim_time += sim_seconds
        for furnace in self.furnaces.values():
            self._tick_furnace(furnace, sim_seconds)

    def advance(self, sim_seconds: float, step: float = 1.0) -> None:
        """Büyük sıçramaları küçük adımlara böler; ısınma eğrisi bozulmaz."""
        remaining = max(0.0, float(sim_seconds))
        while remaining > 0:
            delta = min(max(0.05, step), remaining)
            self.step(delta)
            remaining -= delta

    def _tick_furnace(self, f: dict, dt: float) -> None:
        order = self.orders.get(f['busy_order']) if f['busy_order'] else None
        if not f.get('sensor_ok', True):
            f['burner'] = False
            self._record(f)
            return
        if f['status'] == 'ALARM':
            self._cool(f, dt)
            # Kapı/brülör arızası sıfırlanana kadar alarm korunur; yalnızca
            # geçici aşırı sıcaklık alarmı soğuyunca kendiliğinden temizlenir.
            if (not (f.get('door_open') or f.get('burner_fault'))
                    and f['temperature'] <= f['max_temp'] - 30):
                f['status'] = 'KAPALI'
                f['alarm'] = ''
                f['fault_code'] = None
                f['target'] = 0.0
                f['busy_order'] = None
                if order and order['state'] == 'RUNNING':
                    order['state'] = 'CANCELLED'
                    order['note'] = 'Güvenlik alarmı; brülör kapatıldı'
            self._record(f)
            return

        safety_block = f.get('door_open') or f.get('burner_fault')
        if f['burner'] and f['target'] and not safety_block:
            f['temperature'] += f['heat_rate'] * dt
            f['gas'] += 0.0011 * dt
            f['energy'] += 0.018 * dt
            if f['temperature'] >= f['max_temp']:
                f['temperature'] = f['max_temp']
                f['burner'] = False
                f['status'] = 'ALARM'
                f['alarm'] = f"Güvenlik sınırı aşıldı ({f['max_temp']:.0f} °C); brülör kapatıldı"
                self._record(f)
                return
            if f['temperature'] >= f['target'] - 0.5:
                f['status'] = 'BEKLETIYOR'
                f['burner'] = False
        elif f['status'] == 'BEKLETIYOR':
            if f['temperature'] < f['target'] - 3:
                f['status'] = 'ISINIYOR'
                f['burner'] = True
        elif f['status'] in ('KAPALI', 'TAMAMLANDI'):
            self._cool(f, dt)
            if f['status'] == 'TAMAMLANDI' and f['temperature'] <= AMBIENT + 5:
                f['status'] = 'KAPALI'
            self._record(f)
            return

        if order and order['state'] == 'RUNNING' and f['status'] == 'BEKLETIYOR':
            order['remaining_min'] = max(0.0, float(order['remaining_min']) - dt / 60.0)
            if order['remaining_min'] <= 0:
                self._complete(f, order)
        self._record(f)

    def _cool(self, f: dict, dt: float) -> None:
        f['burner'] = False
        f['temperature'] = max(AMBIENT, f['temperature'] - f['cool_rate'] * dt)

    def _complete(self, f: dict, order: dict) -> None:
        order['state'] = 'COMPLETED'
        order['completed_at'] = datetime.now().astimezone().isoformat(timespec='seconds')
        order['remaining_min'] = 0.0
        order['summary'] = {
            'furnaceAvg': round(f['temperature'], 1),
            'energyKwh': round(f['energy'], 3),
            'gasM3': round(f['gas'], 4)
        }
        f['status'] = 'TAMAMLANDI'
        f['busy_order'] = None
        f['target'] = 0.0
        f['burner'] = False
        self._log('order_completed', furnace=f['name'], severity='success', module='production',
                  title='Üretim emri tamamlandı',
                  message=f"{order['id']} · {order['product']} tamamlandı.",
                  code='ORDER_COMPLETED', data={'orderId': order['id']})

    def _record(self, f: dict) -> None:
        rows = self.readings.setdefault(f['name'], [])
        if rows and self.sim_time - rows[-1]['_t'] < 1.0:
            return
        rows.append({
            '_t': self.sim_time,
            'at': datetime.now().astimezone().isoformat(timespec='seconds'),
            'temperature': round(f['temperature'], 1),
            'target_temp': round(f['target'], 1),
            'status': f['status']
        })
        del rows[:-900]

    # ------------------------------------------------------------- görünüm
    def furnace_state(self, f: dict) -> dict:
        order = self.orders.get(f['busy_order']) if f['busy_order'] else None
        return {
            'name': f['name'],
            'temperature': round(f['temperature'], 1),
            'anlik_sicaklik': round(f['temperature'], 1),
            'target_temp': round(f['target'], 1),
            'hedef_sicaklik': round(f['target'], 1),
            'max_temp': f['max_temp'],
            'maks_sicaklik': f['max_temp'],
            'status': f['status'],
            'durum': f['status'],
            'brulor_acik': f['burner'],
            'alarm': f['alarm'] or None,
            'gaz_tuketimi': round(f['gas'], 4),
            'enerji_toplam': round(f['energy'], 3),
            'evrim_suresi': _elapsed_sec(f['started_at']),
            'busy_order': f['busy_order'],
            'active_order': order['id'] if order else None,
            'note': f['note'],
            'sensor_ok': f.get('sensor_ok', True),
            'quality': 'BAD' if not f.get('sensor_ok', True) else 'SIMULATED',
            'burner_fault': f.get('burner_fault', False),
            'door_open': f.get('door_open', False),
            'casting': f.get('casting', False),
            'fault_code': f.get('fault_code'),
            'status_kodu': f['status'],
            'alarm_active': bool(f['alarm']) or f['status'] == 'ALARM',
            'signals': {
                'door': 'open' if f.get('door_open') else 'closed',
                'casting': 'pouring' if f.get('casting') else 'idle',
                'alarm': 'fault' if (f['alarm'] or f['status'] == 'ALARM') else 'ok',
                'running': 'running' if f['status'] in ('ISINIYOR', 'BEKLETIYOR') else 'stopped',
            },
        }

    def furnace_states(self) -> dict:
        return {name: self.furnace_state(f) for name, f in self.furnaces.items()}

    def readings_for(self, name: str, limit: int = 200) -> list[dict]:
        rows = self.readings.get(name, [])
        return [{k: v for k, v in r.items() if k != '_t'} for r in rows[-max(1, min(900, limit)):]]

    def snapshot(self) -> dict:
        return {
            'mode': 'demo', 'speed': self.speed, 'simTime': round(self.sim_time, 1),
            'furnaces': self.furnace_states(), 'orders': list(self.orders.values()),
            'orderCount': len(self.orders), 'latestEventId': self.latest_event_id()
        }


def _elapsed_sec(started_at: str | None) -> int:
    if not started_at:
        return 0
    try:
        return max(0, int((datetime.now().astimezone() - datetime.fromisoformat(started_at)).total_seconds()))
    except ValueError:
        return 0


class DemoHandler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'ERP-Sim-Demo/1.0'

    # ------------------------------------------------------------- yardımcı
    def log_message(self, fmt, *args):
        pass

    def _common_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()')

    def _html(self, raw: bytes, status: int = 200):
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self._common_headers()
        self.end_headers()
        self.wfile.write(raw)

    def _json(self, payload, status: int = 200):
        raw = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self._common_headers()
        self.end_headers()
        self.wfile.write(raw)

    def _body(self) -> dict:
        try:
            length = int(self.headers.get('Content-Length') or 0)
        except (TypeError, ValueError):
            return {}
        if length <= 0:
            return {}
        if length > 1024 * 1024:
            return {}
        try:
            data = json.loads(self.rfile.read(length).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return {}
        return data if isinstance(data, dict) else {}

    @property
    def engine(self) -> FurnaceEngine:
        return self.server.engine  # type: ignore[attr-defined]

    # ------------------------------------------------------------- GET
    def do_GET(self):
        path = urllib.parse.unquote(self.path.split('?')[0])
        query = urllib.parse.parse_qs(self.path.split('?', 1)[1]) if '?' in self.path else {}
        if path in ('/', '/index.html', '/frontend', '/frontend/'):
            try:
                self._html(FRONTEND_FILE.read_bytes())
            except OSError:
                self._json({'detail': 'Demo arayüz dosyası bulunamadı'}, 404)
        elif path == '/api/speed':
            self._json({'speed': self.engine.speed, 'adimlar': [1, 2, 5, 10, 25, 50]})
        elif path == '/api/furnaces':
            self._json(self.engine.furnace_states())
        elif path == '/api/scenarios':
            self._json({'ok': True, **self.engine.scenario_catalog()})
        elif path == '/api/events':
            try:
                after = int((query.get('after') or ['0'])[0])
                limit = int((query.get('limit') or ['100'])[0])
            except ValueError:
                after, limit = 0, 100
            self._json({'ok': True, 'events': self.engine.events_since(after, limit),
                        'latestId': self.engine.latest_event_id()})
        elif path == '/api/health':
            self._json({'ok': True, **self.engine.snapshot()})
        elif path.startswith('/api/furnaces/'):
            name = path.split('/api/furnaces/', 1)[1]
            if name not in self.engine.furnaces:
                self._json({'detail': 'Fırın bulunamadı'}, 404)
                return
            self._json(self.engine.furnace_state(self.engine.furnaces[name]))
        elif path == '/api/orders':
            self._json(list(self.engine.orders.values()))
        elif path.startswith('/api/readings/'):
            name = path.split('/api/readings/', 1)[1]
            if name not in self.engine.furnaces:
                self._json({'detail': 'Fırın bulunamadı'}, 404)
                return
            try:
                limit = int((query.get('limit') or ['200'])[0])
            except ValueError:
                limit = 200
            self._json(self.engine.readings_for(name, limit))
        elif path == '/api/ws':
            self._json({'detail': 'Demo kopyada WebSocket yok; köprü REST kullanır'}, 426)
        else:
            self._json({'detail': 'Bilinmeyen uç'}, 404)

    # ------------------------------------------------------------- POST
    def do_POST(self):
        path = urllib.parse.unquote(self.path.split('?')[0])
        body = self._body()
        try:
            if path == '/api/speed':
                try:
                    speed = float(body.get('speed'))
                except (TypeError, ValueError):
                    raise ValueError('speed sayı olmalı')
                self.engine.speed = max(0.1, min(100.0, speed))
                self._json({'speed': self.engine.speed, 'adimlar': [1, 2, 5, 10, 25, 50]})
            elif path == '/api/orders':
                order = self.engine.create_order(
                    body.get('product', ''), body.get('furnace', ''),
                    body.get('target_temp'), body.get('duration_min'))
                self._json(order, 201)
            elif path.startswith('/api/orders/') and path.endswith('/start'):
                order_id = path[len('/api/orders/'):-len('/start')]
                order = self.engine.start_order(order_id)
                self._json(order)
            elif path == '/api/scenarios':
                scenario = (body.get('scenario') or '').strip()
                if scenario in BUSINESS_BY_ID:
                    self._json({'ok': True, **self.engine.apply_business_event(scenario),
                                'latestEventId': self.engine.latest_event_id()})
                else:
                    furnace = (body.get('furnace') or '').strip()
                    if not scenario or not furnace:
                        raise ValueError('scenario ve furnace zorunlu')
                    self._json({'ok': True, **self.engine.apply_scenario(furnace, scenario),
                                'latestEventId': self.engine.latest_event_id()})
            else:
                self._json({'detail': 'Bilinmeyen uç'}, 404)
        except KeyError:
            self._json({'detail': 'Emir bulunamadı'}, 404)
        except ValueError as exc:
            self._json({'detail': str(exc)}, 400)
        except RuntimeError as exc:
            self._json({'detail': str(exc)}, 409)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


class DemoSim:
    """Demo kopyayı arka planda çalıştırır (port 0 → işletim sistemi seçer)."""

    def __init__(self, host: str = '127.0.0.1', port: int = 8000, speed: float = 10.0):
        self.engine = FurnaceEngine(speed=speed)
        self.httpd = ThreadingHTTPServer((host, port), DemoHandler)
        self.httpd.daemon_threads = True
        self.httpd.engine = self.engine  # type: ignore[attr-defined]
        self.thread = None
        self.running = False

    @property
    def port(self) -> int:
        return self.httpd.server_address[1]

    @property
    def url(self) -> str:
        host = self.httpd.server_address[0]
        return f'http://{host}:{self.port}'

    def start(self):
        if self.running:
            return self
        self.running = True
        self.thread = threading.Thread(target=self.httpd.serve_forever, name='demo-sim', daemon=True)
        self.thread.start()
        threading.Thread(target=self._loop, name='demo-sim-clock', daemon=True).start()
        return self

    def _loop(self):
        while self.running:
            self.engine.tick()
            time.sleep(0.5)

    def stop(self):
        self.running = False
        self.httpd.shutdown()
        self.httpd.server_close()
