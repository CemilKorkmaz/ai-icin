"""Kullanıcı simülasyonuna (FastAPI, varsayılan :8000) salt-okunur REST istemcisi.

Simülasyonun belgelenen uçları:
  GET  /api/furnaces                 → anlık fırın durumları
  GET  /api/orders                   → üretim emirleri
  POST /api/orders                   → emir oluştur
  POST /api/orders/{id}/start        → emri başlat
  GET  /api/readings/{ad}?limit=200  → sıcaklık geçmişi
  GET  /api/scenarios                → ERP test senaryoları
  POST /api/scenarios                → senaryo uygula / iş akışı testi
  GET  /api/events?after=&limit=    → ERP'ye giden olay günlüğü

Köprü yalnızca bu uçları kullanır; simülasyonun veritabanına dokunmaz.
WebSocket (`/api/ws`) bilinçli olarak kullanılmaz: kullanıcı rehberindeki
“sürekli yenilenen sayfa” sorununun kaynağı buydu. Arayüz REST ile 2,5 sn'de
bir tazelenir ve bağlantı kopunca sayfa yenilenmez.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request

STATUS_ALIASES = {
    'kapali': 'KAPALI', 'kapalı': 'KAPALI', 'off': 'KAPALI', 'closed': 'KAPALI',
    'isiniyor': 'ISINIYOR', 'ısınıyor': 'ISINIYOR', 'heating': 'ISINIYOR',
    'bekletiyor': 'BEKLETIYOR', 'holding': 'BEKLETIYOR', 'soaking': 'BEKLETIYOR',
    'calisiyor': 'CALISIYOR', 'çalışıyor': 'CALISIYOR', 'running': 'CALISIYOR',
    'alarm': 'ALARM', 'fault': 'ALARM',
    'tamamlandi': 'TAMAMLANDI', 'tamamlandı': 'TAMAMLANDI', 'completed': 'TAMAMLANDI',
    'created': 'CREATED', 'bekliyor': 'CREATED'
}

STATUS_LABELS = {
    'KAPALI': 'Kapalı', 'ISINIYOR': 'Isınıyor', 'BEKLETIYOR': 'Bekletiyor',
    'CALISIYOR': 'Çalışıyor', 'ALARM': 'Alarm', 'TAMAMLANDI': 'Tamamlandı',
    'BILINMIYOR': 'Bilinmiyor'
}

ORDER_STATES = {
    'created': 'CREATED', 'olusturuldu': 'CREATED', 'oluşturuldu': 'CREATED',
    'running': 'RUNNING', 'calisiyor': 'RUNNING', 'çalışıyor': 'RUNNING',
    'completed': 'COMPLETED', 'tamamlandi': 'COMPLETED', 'tamamlandı': 'COMPLETED',
    'cancelled': 'CANCELLED', 'iptal': 'CANCELLED'
}


class SimUnavailable(RuntimeError):
    """Simülasyona ağ üzerinden ulaşılamadı."""


class SimResponseError(RuntimeError):
    """Simülasyon HTTP hatası döndürdü."""

    def __init__(self, status: int, message: str, payload=None):
        super().__init__(message)
        self.status = status
        self.payload = payload


def _num(value):
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _pick(raw: dict, *keys):
    for key in keys:
        if key in raw and raw[key] is not None:
            return raw[key]
    return None


def _status(value) -> str:
    text = str(value or '').strip()
    if not text:
        return 'BILINMIYOR'
    return STATUS_ALIASES.get(text.lower(), text.upper())


def normalize_furnace(name: str, raw: dict) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    status = _status(_pick(raw, 'status', 'durum', 'state'))
    temperature = _num(_pick(raw, 'temperature', 'anlik_sicaklik', 'sicaklik', 'temp', 'current_temp'))
    target = _num(_pick(raw, 'target_temp', 'hedef_sicaklik', 'target', 'setpoint'))
    maximum = _num(_pick(raw, 'max_temp', 'maks_sicaklik', 'maksimum_sicaklik', 'max_temperature'))
    alarm = _pick(raw, 'alarm', 'alarm_message', 'alarm_mesaji')
    burner = _pick(raw, 'brulor_acik', 'burner', 'burner_on')
    return {
        'name': name,
        'temperatureC': temperature,
        'targetC': target,
        'maxC': maximum,
        'status': status,
        'statusLabel': STATUS_LABELS.get(status, status),
        'alarm': alarm if isinstance(alarm, str) else (None if not alarm else str(alarm)),
        'alarmActive': status == 'ALARM' or bool(alarm),
        'sensorOk': raw.get('sensor_ok') if isinstance(raw.get('sensor_ok'), bool) else None,
        'doorOpen': raw.get('door_open') if isinstance(raw.get('door_open'), bool) else None,
        'burnerFault': raw.get('burner_fault') if isinstance(raw.get('burner_fault'), bool) else None,
        'casting': raw.get('casting') if isinstance(raw.get('casting'), bool) else None,
        'quality': raw.get('quality') or 'SIMULATED',
        'faultCode': raw.get('fault_code'),
        'signals': raw.get('signals') if isinstance(raw.get('signals'), dict) else {},
        'burner': burner if isinstance(burner, bool) else None,
        'gasM3': _num(_pick(raw, 'gaz_tuketimi', 'gas', 'gas_consumption')),
        'energyKwh': _num(_pick(raw, 'enerji_toplam', 'energy', 'energy_total')),
        'elapsedSec': _num(_pick(raw, 'evrim_suresi', 'elapsed', 'elapsed_sec')),
        'raw': raw
    }


def normalize_order(raw: dict) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    state = str(_pick(raw, 'state', 'durum', 'status') or '').strip()
    state = ORDER_STATES.get(state.lower(), state.upper() or 'CREATED')
    return {
        'id': str(_pick(raw, 'id', 'order_id', 'no', 'emir_no') or ''),
        'product': _pick(raw, 'product', 'urun', 'ürün') or '—',
        'furnace': _pick(raw, 'furnace', 'firin', 'fırın') or '—',
        'targetC': _num(_pick(raw, 'target_temp', 'hedef_sicaklik')),
        'durationMin': _num(_pick(raw, 'duration_min', 'sure_dk', 'süre_dk')),
        'state': state,
        'createdAt': _pick(raw, 'created_at', 'olusturma', 'created'),
        'remainingMin': _num(_pick(raw, 'remaining_min', 'kalan_dakika', 'remaining')),
        'raw': raw
    }


def normalize_event(raw: dict) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    event_id = _num(_pick(raw, 'id', 'eventId'))
    return {
        'id': int(event_id) if event_id is not None else None,
        'at': _pick(raw, 'at', 'time', 'timestamp') or '',
        'type': raw.get('type') or 'event',
        'severity': str(raw.get('severity') or 'info').lower(),
        'module': raw.get('module') or 'plc',
        'title': raw.get('title') or raw.get('type') or 'Olay',
        'message': raw.get('message') or '',
        'code': raw.get('code') or '',
        'furnace': raw.get('furnace'),
        'data': raw.get('data') if isinstance(raw.get('data'), dict) else {},
    }


def normalize_reading(raw: dict) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    return {
        'at': _pick(raw, 'at', 'zaman', 'time', 'created_at'),
        'temperatureC': _num(_pick(raw, 'temperature', 'anlik_sicaklik', 'sicaklik', 'temp')),
        'targetC': _num(_pick(raw, 'target_temp', 'hedef_sicaklik')),
        'status': _status(_pick(raw, 'status', 'durum')),
        'raw': raw
    }


class SimClient:
    def __init__(self, base_url: str, timeout: float = 3.0):
        self.base_url = (base_url or 'http://127.0.0.1:8000').rstrip('/')
        self.timeout = float(timeout or 3.0)
        self.last_ok_at = ''
        self.last_error = ''

    # ------------------------------------------------------------------ HTTP
    def _request(self, path: str, method: str = 'GET', body: dict | None = None,
                 timeout: float | None = None):
        url = f'{self.base_url}{path}'
        data = None
        headers = {'Accept': 'application/json'}
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode('utf-8')
            headers['Content-Type'] = 'application/json; charset=utf-8'
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout or self.timeout) as resp:
                raw = resp.read()
                status = resp.status
        except urllib.error.HTTPError as exc:
            raw = exc.read()
            detail = self._detail(raw) or f'HTTP {exc.code}'
            raise SimResponseError(exc.code, f'Simülasyon {exc.code}: {detail}', self._parse(raw)) from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            reason = getattr(exc, 'reason', exc)
            self.last_error = f'{type(reason).__name__}: {reason}'
            raise SimUnavailable(
                f'Simülasyona ulaşılamadı ({self.base_url}). Sunucu açık mı? '
                f'Kullanıcı rehberi: ./start.sh 10') from exc
        payload = self._parse(raw)
        if payload is None:
            raise SimResponseError(status, 'Simülasyon JSON olmayan yanıt döndürdü')
        self.last_ok_at = time.strftime('%Y-%m-%dT%H:%M:%S%z')
        self.last_error = ''
        return payload

    @staticmethod
    def _parse(raw: bytes):
        try:
            return json.loads(raw.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return None

    @staticmethod
    def _detail(raw: bytes) -> str:
        try:
            data = json.loads(raw.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return raw.decode('utf-8', 'replace').strip()[:200]
        if isinstance(data, dict):
            return str(data.get('detail') or data.get('error') or data)[:200]
        return str(data)[:200]

    # ------------------------------------------------------------------ Okuma
    def health(self, furnaces: list[dict] | None = None) -> dict:
        """Sağlık özeti döndürür.

        `furnaces` verilirse ikinci bir `/api/furnaces` çağrısı yapılmaz;
        `/api/sim/live` aynı turda hem sağlık hem fırın listesi üretir.
        """
        started = time.time()
        error = ''
        if furnaces is None:
            try:
                furnaces = self.furnaces()
            except (SimUnavailable, SimResponseError) as exc:
                error = str(exc)
                furnaces = []
        return {'ok': not error, 'baseUrl': self.base_url,
                'latencyMs': int((time.time() - started) * 1000),
                'checkedAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
                'furnaceCount': len(furnaces), 'error': error, 'mode': 'REAL'}

    def furnaces(self) -> list[dict]:
        data = self._request('/api/furnaces')
        rows = []
        if isinstance(data, dict) and isinstance(data.get('furnaces'), list):
            data = data['furnaces']
        if isinstance(data, dict):
            for name, value in data.items():
                if name in ('ok', 'count', 'error'):
                    continue
                if isinstance(value, dict):
                    rows.append(normalize_furnace(str(name), value))
        elif isinstance(data, list):
            for item in data:
                if not isinstance(item, dict):
                    continue
                name = _pick(item, 'name', 'ad', 'furnace', 'firin', 'fırın')
                if name:
                    rows.append(normalize_furnace(str(name), item))
        return rows

    def orders(self) -> list[dict]:
        data = self._request('/api/orders')
        if isinstance(data, dict):
            data = data.get('orders') if isinstance(data.get('orders'), list) else []
        return [normalize_order(o) for o in data if isinstance(o, dict)] if isinstance(data, list) else []

    def scenarios(self) -> dict:
        data = self._request('/api/scenarios')
        if not isinstance(data, dict):
            return {'scenarios': [], 'business': [], 'furnaces': []}
        return {
            'scenarios': data.get('scenarios') if isinstance(data.get('scenarios'), list) else [],
            'business': data.get('business') if isinstance(data.get('business'), list) else [],
            'furnaces': data.get('furnaces') if isinstance(data.get('furnaces'), list) else [],
        }

    def events(self, after: int = 0, limit: int = 100) -> dict:
        after = max(0, int(after or 0))
        limit = max(1, min(200, int(limit or 100)))
        data = self._request(f'/api/events?after={after}&limit={limit}')
        if not isinstance(data, dict):
            return {'events': [], 'latestId': after, 'unsupported': True}
        rows = [normalize_event(e) for e in (data.get('events') or []) if isinstance(e, dict)]
        try:
            latest = int(data.get('latestId') or (rows[-1]['id'] if rows else after) or after)
        except (TypeError, ValueError):
            latest = after
        return {'events': rows, 'latestId': latest, 'unsupported': False}

    def apply_scenario(self, scenario: str, furnace: str | None = None) -> dict:
        body = {'scenario': scenario}
        if furnace:
            body['furnace'] = furnace
        data = self._request('/api/scenarios', 'POST', body)
        if not isinstance(data, dict):
            return {}
        result = dict(data)
        if isinstance(result.get('furnace'), dict):
            raw = result['furnace']
            name = raw.get('name') or furnace or ''
            result['furnace'] = normalize_furnace(str(name), raw)
        if isinstance(result.get('event'), dict):
            result['event'] = normalize_event(result['event'])
        return result

    def business_event(self, scenario: str) -> dict:
        data = self._request('/api/scenarios', 'POST', {'scenario': scenario})
        return data if isinstance(data, dict) else {}

    def readings(self, furnace: str, limit: int = 40) -> list[dict]:
        quoted = urllib.parse.quote(furnace, safe='')
        capped = max(1, min(500, int(limit or 40)))
        data = self._request(f'/api/readings/{quoted}?limit={capped}')
        if isinstance(data, dict):
            data = data.get('readings') if isinstance(data.get('readings'), list) else []
        rows = [normalize_reading(r) for r in data if isinstance(r, dict)] if isinstance(data, list) else []
        return rows

    # ------------------------------------------------------------------ Yazma
    def create_order(self, product: str, furnace: str, target: float,
                     duration_min: float) -> dict:
        payload = self._request('/api/orders', 'POST', {
            'product': product, 'furnace': furnace,
            'target_temp': target, 'duration_min': duration_min
        })
        return normalize_order(payload if isinstance(payload, dict) else {})

    def start_order(self, order_id: str, furnace: str | None = None) -> dict:
        body = {'furnace': furnace} if furnace else {}
        quoted = urllib.parse.quote(order_id, safe='')
        payload = self._request(f'/api/orders/{quoted}/start', 'POST', body)
        if isinstance(payload, dict) and isinstance(payload.get('order'), dict):
            payload = payload['order']
        return normalize_order(payload if isinstance(payload, dict) else {})

    # ------------------------------------------------------------------ Özet
    def live(self) -> dict:
        started = time.time()
        try:
            furnaces = self.furnaces()
        except (SimUnavailable, SimResponseError):
            health = self.health()
            return {'ok': False, 'health': health, 'furnaces': [], 'orders': [],
                    'alarms': [], 'checkedAt': health['checkedAt'],
                    'error': health['error']}
        health = self.health(furnaces)
        # Sağlık yanıtındaki gecikme, fırın okumasıyla birlikte ölçülür.
        health['latencyMs'] = int((time.time() - started) * 1000)
        try:
            orders = self.orders()
        except (SimUnavailable, SimResponseError) as exc:
            orders = []
            health['ordersError'] = str(exc)
        alarms = [{'name': f['name'], 'status': f['status'],
                   'temperatureC': f['temperatureC'],
                   'message': f['alarm'] or 'Güvenlik sınırı aşıldı'}
                  for f in furnaces if f['alarmActive']]
        active = [o for o in orders if o['state'] == 'RUNNING']
        health['activeOrders'] = len(active)
        health['furnaceCount'] = len(furnaces)
        health['at'] = time.strftime('%Y-%m-%dT%H:%M:%S%z')
        try:
            event_data = self.events(0, 50)
        except (SimUnavailable, SimResponseError) as exc:
            event_data = {'events': [], 'latestId': 0, 'unsupported': True, 'error': str(exc)}
        return {'ok': True, 'health': health, 'furnaces': furnaces, 'orders': orders,
                'alarms': alarms, 'events': event_data['events'],
                'latestEventId': event_data['latestId'],
                'eventsUnsupported': event_data.get('unsupported', False),
                'checkedAt': health['at'], 'error': ''}
