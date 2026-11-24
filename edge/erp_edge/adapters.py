"""Bağlantı adaptörleri — docs/08 Bölüm 4 ve docs/12 Bölüm 8 ile aynı sözleşme.

Sözleşme: connect / test / readFourSignals / disconnect. Buna ek olarak ölçüm
için readTelemetry vardır. Gerçek OPC UA / Modbus sürücüsü bu prototipte yüklü
değildir; istenirse `DriverNotInstalled` fırlatır ve ajan `simulated` + MANUAL
yedeğe düşer. Üretim hiçbir zaman durmaz, veri `SIMULATED` kalitesiyle işaretlenir.
"""
from __future__ import annotations

import json
import math
import time
import urllib.error
import urllib.parse
import urllib.request

from . import FOUR_SIGNALS
from .sim_map import build_map

SIGNAL_VALUES = {
    'door': 'closed',
    'casting': 'idle',
    'alarm': 'ok',
    'running': 'true'
}


class DriverNotInstalled(RuntimeError):
    pass


class SimulationUnavailable(RuntimeError):
    """ERP simülasyonuna HTTP üzerinden ulaşılamadı."""


class BaseAdapter:
    code = 'base'
    label = 'Temel'
    protocol = 'Yerel'
    implemented = False
    capabilities = ('connect', 'test', 'readFourSignals', 'readTelemetry', 'disconnect')

    def __init__(self, connection: dict | None = None):
        self.connection = connection or {}
        self.connected = False
        self.cycle = 0
        self.settings: dict = {}
        self.site: dict | None = None

    def configure(self, cfg: dict) -> None:
        """Collector yapılandırmayı adaptöre verir (yalnızca gereken bölüm)."""
        self.settings = (cfg or {}).get('simulation') or {}

    def bind_site(self, site: dict) -> None:
        """Profil makine listesi; simülasyon eşlemesi için kullanılır."""
        self.site = site

    def connect(self) -> dict:
        if not self.implemented:
            raise DriverNotInstalled(f'{self.label} sürücüsü bu sürümde yüklü değil')
        self.connected = True
        return {'ok': True, 'adapter': self.code}

    def test(self, tags: list[dict]) -> dict:
        return {
            'ok': self.implemented,
            'implemented': self.implemented,
            'adapter': self.code,
            'adapterLabel': self.label,
            'protocol': self.connection.get('protocol', self.protocol),
            'host': self.connection.get('ip', '—'),
            'port': int(self.connection.get('port') or 0),
            'tagCount': len(tags),
            'signals': list(FOUR_SIGNALS),
            'missingSignals': [s for s in FOUR_SIGNALS if not any(t.get('signal') == s for t in tags)],
            'mode': self.connection.get('mode', 'PLC') if self.implemented else 'MANUAL',
            'fallback': None if self.implemented else 'MANUAL (operatör veri girişi)',
            'message': f'{self.label} adaptörü hazır' if self.implemented
                       else f'{self.label} sürücüsü yüklü değil; MANUAL yedeğe düşüldü'
        }

    def readFourSignals(self, machine_id: str, tags: list[dict]) -> list[dict]:
        raise NotImplementedError

    def readTelemetry(self, machine_id: str, templates: list[dict]) -> list[dict]:
        raise NotImplementedError

    def disconnect(self) -> dict:
        self.connected = False
        return {'ok': True, 'adapter': self.code}


class SimulatedAdapter(BaseAdapter):
    """Saha kurulumunda ağ olmadan çalışan, deterministik demo üretici."""
    code = 'simulated'
    label = 'Simülasyon / MANUAL'
    protocol = 'Yerel'
    implemented = True

    def connect(self) -> dict:
        self.connected = True
        return {'ok': True, 'adapter': self.code, 'note': 'Yerel simülasyon, ağ çağrısı yok'}

    def readFourSignals(self, machine_id: str, tags: list[dict]) -> list[dict]:
        self.cycle += 1
        step = self.cycle
        values = dict(SIGNAL_VALUES)
        values['running'] = 'true' if step % 7 != 0 else 'false'
        values['casting'] = 'pouring' if step % 5 == 0 else ('tilting' if step % 5 == 1 else 'idle')
        values['door'] = 'open' if step % 9 == 0 else 'closed'
        # Belirli bir makinede periyodik arıza: alarm ayrıntısı taşımaz, yalnızca var/yok.
        values['alarm'] = 'fault' if step % 13 == 0 else 'ok'
        out = []
        for signal in FOUR_SIGNALS:
            tag = next((t for t in tags if t.get('signal') == signal), None)
            out.append({
                'machine_id': machine_id, 'tag_id': tag.get('id') if tag else f'SIM-{signal}',
                'signal': signal, 'value_text': values[signal], 'value_num': None,
                'kind': 'signal', 'quality': 'SIMULATED', 'source': 'SIMULATED',
                'raw': {'address': tag.get('address') if tag else None}
            })
        return out

    def readTelemetry(self, machine_id: str, templates: list[dict]) -> list[dict]:
        t = time.time()
        out = []
        for tpl in templates:
            base = float(tpl.get('simBase', 50))
            span = float(tpl.get('simSpan', 5))
            value = round(base + span * math.sin(t / 11 + sum(ord(c) for c in machine_id) % 7), 1)
            out.append({
                'machine_id': machine_id, 'tag_id': f"TEL-{tpl['type']}-{tpl['signal']}",
                'signal': tpl['signal'], 'value_num': value, 'value_text': None,
                'kind': 'telemetry', 'unit': tpl.get('unit', '°C'),
                'quality': 'SIMULATED', 'source': 'SIMULATED',
                'address': tpl.get('addressPattern', '').replace('{machineId}', machine_id),
                'label': tpl.get('label', tpl['signal']),
                'thresholds': {k: tpl.get(k) for k in ('nominalMin', 'nominalMax', 'warnAt', 'criticalAt')},
                'raw': {'template': tpl['type'], 'nominalMax': tpl.get('nominalMax')}
            })
        return out


class SimulationAdapter(BaseAdapter):
    """Kullanıcı simülasyonunun REST uçlarından okuyan test adaptörü.

    Fabrika testi öncesi ERP zincirini gerçek veriyle sınamak içindir. Üretimde
    yerini OPC UA / Modbus alır; aynı dört sinyal ve telemetri sözleşmesini
    kullandığı için collector, SQL ve kuyruk kodu değişmez.
    """
    code = 'simulation'
    label = 'ERP Simülasyonu (REST)'
    protocol = 'HTTP / REST'
    implemented = True

    def __init__(self, connection: dict | None = None):
        super().__init__(connection)
        self.furnaces: list[dict] = []
        self.mapping: dict = {'pairs': [], 'unmatched': [], 'unusedMachines': []}
        self.last_error = ''

    # ------------------------------------------------------------- yardımcı
    @property
    def base_url(self) -> str:
        return str((self.settings or {}).get('baseUrl') or 'http://127.0.0.1:8000').rstrip('/')

    @property
    def timeout(self) -> float:
        try:
            return max(0.5, float((self.settings or {}).get('timeoutSeconds') or 3))
        except (TypeError, ValueError):
            return 3.0

    def _request(self, path: str) -> dict:
        req = urllib.request.Request(f'{self.base_url}{path}',
                                     headers={'Accept': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as exc:
            raise SimulationUnavailable(f'Simülasyon {exc.code} döndürdü: {path}') from exc
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            raise SimulationUnavailable(
                f'{self.base_url} adresine ulaşılamadı ({type(exc).__name__}). '
                f'Simülasyon açık mı? Kullanıcı rehberi: ./start.sh 10') from exc

    @staticmethod
    def _normalize(data) -> list[dict]:
        rows = []
        if isinstance(data, dict) and isinstance(data.get('furnaces'), list):
            data = data['furnaces']
        if isinstance(data, dict):
            for name, value in data.items():
                if isinstance(value, dict):
                    rows.append({'name': str(name), **value})
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    name = item.get('name') or item.get('ad') or item.get('furnace')
                    if name:
                        rows.append({'name': str(name), **item})
        return rows

    def connect(self) -> dict:
        data = self._request('/api/furnaces')
        self.furnaces = self._normalize(data)
        machines = (self.site or {}).get('machines') or []
        self.mapping = build_map(machines, self.furnaces,
                                 (self.settings or {}).get('furnaceMap') or {},
                                 bool((self.settings or {}).get('autoMap', True)))
        self.connected = True
        self.last_error = ''
        return {'ok': True, 'adapter': self.code, 'furnaces': len(self.furnaces),
                'mapped': self.mapping.get('matched', 0),
                'unmatched': [u['furnace'] for u in self.mapping.get('unmatched', [])]}

    def _furnace_for(self, machine_id: str) -> dict | None:
        for pair in self.mapping.get('pairs', []):
            if pair.get('machineId') == machine_id:
                return next((f for f in self.furnaces
                             if f.get('name') == pair.get('furnace')), None)
        return None

    @staticmethod
    def _value(furnace: dict, *keys):
        for key in keys:
            if key in furnace and furnace[key] is not None:
                return furnace[key]
        return None

    def _status(self, furnace: dict) -> str:
        return str(self._value(furnace, 'status', 'durum') or 'BILINMIYOR').upper()

    # ------------------------------------------------------------- sözleşme
    def test(self, tags: list[dict]) -> dict:
        base = {
            'implemented': True, 'adapter': self.code, 'adapterLabel': self.label,
            'protocol': self.protocol, 'host': self.base_url,
            'port': urllib.parse.urlsplit(self.base_url).port or 80,
            'tagCount': len(tags), 'signals': list(FOUR_SIGNALS),
            'missingSignals': [s for s in FOUR_SIGNALS
                               if not any(t.get('signal') == s for t in tags)],
            'mode': 'SIMULATION', 'fallback': None
        }
        try:
            data = self._request('/api/furnaces')
            furnaces = self._normalize(data)
            return {**base, 'ok': True, 'furnaceCount': len(furnaces),
                    'message': f'Simülasyon açık · {len(furnaces)} fırın · {self.base_url}'}
        except SimulationUnavailable as exc:
            return {**base, 'ok': False, 'furnaceCount': 0, 'message': str(exc)}

    def readFourSignals(self, machine_id: str, tags: list[dict]) -> list[dict]:
        furnace = self._furnace_for(machine_id)
        if not furnace:
            return []
        status = self._status(furnace)
        alarm_text = self._value(furnace, 'alarm', 'alarm_message')
        values = {
            # Simülasyon kapı/çıkış sinyali yayınlamıyor: uydurma değer yerine
            # 'unknown' yazılır; alarm ve çalışma durumu gerçek veriden gelir.
            'door': str(self._value(furnace, 'door', 'kapi') or 'unknown'),
            'casting': str(self._value(furnace, 'casting', 'dokum') or 'unknown'),
            'alarm': 'fault' if (status == 'ALARM' or alarm_text) else 'ok',
            'running': 'true' if status in ('ISINIYOR', 'BEKLETIYOR', 'CALISIYOR',
                                            'RUNNING', 'HEATING', 'HOLDING') else 'false'
        }
        out = []
        for signal in FOUR_SIGNALS:
            tag = next((t for t in tags if t.get('signal') == signal), None)
            out.append({
                'machine_id': machine_id,
                'tag_id': (tag or {}).get('id') or f'SIM-{machine_id}-{signal}',
                'signal': signal, 'value_text': values[signal], 'value_num': None,
                'kind': 'signal', 'quality': 'SIMULATED', 'source': 'ERP-SIM',
                'raw': {'furnace': furnace.get('name'), 'status': status,
                        'temperatureC': self._value(furnace, 'anlik_sicaklik', 'temperature')}
            })
        return out

    def readTelemetry(self, machine_id: str, templates: list[dict]) -> list[dict]:
        furnace = self._furnace_for(machine_id)
        if not furnace:
            return []
        temperature = self._value(furnace, 'anlik_sicaklik', 'temperature', 'sicaklik')
        if temperature is None:
            return []
        target = self._value(furnace, 'hedef_sicaklik', 'target_temp')
        out = []
        for tpl in templates:
            signal = tpl['signal']
            # Simülasyon yalnızca ocak sıcaklığını yayınlar. Yağ sıcaklığı gibi
            # ölçümler uydurulmaz; şablon atlanır.
            if signal not in ('temperatureC', 'chamberTempC'):
                continue
            out.append({
                'machine_id': machine_id, 'tag_id': f"TEL-{tpl['type']}-{signal}",
                'signal': signal, 'value_num': round(float(temperature), 1),
                'value_text': None, 'kind': 'telemetry', 'unit': tpl.get('unit', '°C'),
                'quality': 'SIMULATED', 'source': 'ERP-SIM',
                'address': tpl.get('addressPattern', '').replace('{machineId}', machine_id),
                'label': tpl.get('label', signal),
                'thresholds': {k: tpl.get(k) for k in
                               ('nominalMin', 'nominalMax', 'warnAt', 'criticalAt')},
                'raw': {'template': tpl['type'], 'furnace': furnace.get('name'),
                        'targetC': target, 'status': self._status(furnace)}
            })
        return out

    def disconnect(self) -> dict:
        self.connected = False
        return {'ok': True, 'adapter': self.code}


class OpcUaAdapter(BaseAdapter):
    code = 'opcua'
    label = 'OPC UA'
    protocol = 'OPC UA'


class ModbusAdapter(BaseAdapter):
    code = 'modbus'
    label = 'Modbus TCP'
    protocol = 'Modbus'


ADAPTERS = {a.code: a for a in (SimulatedAdapter, SimulationAdapter, OpcUaAdapter, ModbusAdapter)}


def adapter_for(code: str | None, connection: dict | None = None) -> BaseAdapter:
    return ADAPTERS.get(code or 'simulated', SimulatedAdapter)(connection)


def adapter_for_protocol(protocol: str, connection: dict | None = None) -> BaseAdapter:
    p = (protocol or '').lower()
    if 'sim' in p or 'http' in p or 'rest' in p:
        return SimulationAdapter(connection)
    if 'opc' in p:
        return OpcUaAdapter(connection)
    if 'modbus' in p:
        return ModbusAdapter(connection)
    return SimulatedAdapter(connection)


def resolve_adapter(cfg: dict, connection: dict | None = None) -> tuple[BaseAdapter, str | None]:
    """Sürücü yoksa simulated'a düşer ve bunu açıkça bildirir."""
    conn = connection or cfg.get('connection') or {}
    code = cfg.get('adapter') or 'simulated'
    if code == 'auto':
        chosen = adapter_for_protocol(conn.get('protocol', ''), conn)
    else:
        chosen = adapter_for(code, conn)
    fallback = None
    if not chosen.implemented:
        fallback = f'{chosen.label} sürücüsü yüklü değil → simulated / MANUAL yedeği'
        chosen = SimulatedAdapter(conn)
    return chosen, fallback


def contract_rows() -> list[dict]:
    """docs/12 adapterContracts ile aynı kayıtların Python tarafındaki karşılığı."""
    return [
        {'code': a.code, 'label': a.label, 'protocol': a.protocol,
         'implemented': a.implemented,
         'role': 'test' if a.code == 'simulation' else 'plant',
         'capabilities': list(a.capabilities)}
        for a in ADAPTERS.values()
    ]
