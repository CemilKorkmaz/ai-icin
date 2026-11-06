"""Bağlantı adaptörleri — docs/08 Bölüm 4 ve docs/12 Bölüm 8 ile aynı sözleşme.

Sözleşme: connect / test / readFourSignals / disconnect. Buna ek olarak ölçüm
için readTelemetry vardır. Gerçek OPC UA / Modbus sürücüsü bu prototipte yüklü
değildir; istenirse `DriverNotInstalled` fırlatır ve ajan `simulated` + MANUAL
yedeğe düşer. Üretim hiçbir zaman durmaz, veri `SIMULATED` kalitesiyle işaretlenir.
"""
from __future__ import annotations

import math
import time

from . import FOUR_SIGNALS

SIGNAL_VALUES = {
    'door': 'closed',
    'casting': 'idle',
    'alarm': 'ok',
    'running': 'true'
}


class DriverNotInstalled(RuntimeError):
    pass


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


class OpcUaAdapter(BaseAdapter):
    code = 'opcua'
    label = 'OPC UA'
    protocol = 'OPC UA'


class ModbusAdapter(BaseAdapter):
    code = 'modbus'
    label = 'Modbus TCP'
    protocol = 'Modbus'


ADAPTERS = {a.code: a for a in (SimulatedAdapter, OpcUaAdapter, ModbusAdapter)}


def adapter_for(code: str | None, connection: dict | None = None) -> BaseAdapter:
    return ADAPTERS.get(code or 'simulated', SimulatedAdapter)(connection)


def adapter_for_protocol(protocol: str, connection: dict | None = None) -> BaseAdapter:
    p = (protocol or '').lower()
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
         'implemented': a.implemented, 'capabilities': list(a.capabilities)}
        for a in ADAPTERS.values()
    ]
