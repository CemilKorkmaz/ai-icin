// Bağlantı adaptörü sözleşmesi — gerçek fabrikada PLC'ye kolay bağlanma.
// Saf modüldür; ağ çağrısı yapmaz. docs/12 Bölüm 4'teki sözleşmenin kod karşılığıdır.

import { FOUR_SIGNALS } from './modularity.js';

/** Desteklenen adaptörler. `implemented: false` olanlar sözleşmeye hazırdır, sürücüsü sonraki aşamadadır. */
export const ADAPTERS = [
  {
    code: 'simulated', label: 'Simülasyon / MANUAL', protocol: 'Yerel', implemented: true,
    capabilities: ['connect', 'test', 'readFourSignals', 'disconnect'],
    note: 'Saha kurulumunda ağ olmadan dört sinyali üretir; her fabrikada yedek moddur'
  },
  {
    code: 'opcua', label: 'OPC UA', protocol: 'OPC UA', implemented: false,
    capabilities: ['connect', 'test', 'readFourSignals', 'disconnect'],
    note: 'Gerçek sürücü docs/10 aşama 9\'da aynı sözleşmeyle takılır'
  },
  {
    code: 'modbus', label: 'Modbus TCP', protocol: 'Modbus', implemented: false,
    capabilities: ['connect', 'test', 'readFourSignals', 'disconnect'],
    note: 'Gerçek sürücü docs/10 aşama 9\'da aynı sözleşmeyle takılır'
  }
];

export function adapterFor(code) {
  return ADAPTERS.find((a) => a.code === code) || null;
}

export function adapterForProtocol(protocol) {
  const p = String(protocol || '').toLowerCase();
  if (p.includes('opc')) return ADAPTERS.find((a) => a.code === 'opcua');
  if (p.includes('modbus')) return ADAPTERS.find((a) => a.code === 'modbus');
  return ADAPTERS.find((a) => a.code === 'simulated');
}

/**
 * Bağlantı testi. Sürücü yüklü değilse hata vermez; MANUAL yedeğe düşer.
 * Gerçek sistemde bu işlev sunucu tarafında çalışır ve VPN üzerinden erişilir.
 */
export function testConnection({ connection = {}, tags = [], adapterCode = null } = {}) {
  const adapter = adapterFor(adapterCode) || adapterForProtocol(connection.protocol);
  const tagSignals = new Set(tags.map((t) => t.signal));
  const missing = FOUR_SIGNALS.filter((s) => !tagSignals.has(s));
  const ok = adapter.implemented && String(connection.mode || '').toUpperCase() !== 'MANUAL' ? true : adapter.implemented;
  return {
    ok: adapter.implemented && !missing.length,
    implemented: adapter.implemented,
    adapter: adapter.code,
    adapterLabel: adapter.label,
    protocol: connection.protocol || adapter.protocol,
    host: connection.ip || '—',
    port: Number(connection.port) || 0,
    tagCount: tags.length,
    signals: FOUR_SIGNALS,
    missingSignals: missing,
    mode: adapter.implemented ? (connection.mode || 'PLC') : 'MANUAL',
    fallback: adapter.implemented ? null : 'MANUAL (operatör veri girişi)',
    message: adapter.implemented
      ? (missing.length ? `Tag eşlemesi eksik: ${missing.join(', ')}` : `${adapter.label} adaptörüyle ${connection.ip || 'yerel'} bağlantısı doğrulandı`)
      : `${adapter.label} sürücüsü bu prototipte yüklü değil; üretim MANUAL modda devam eder`,
    unusedOk: ok
  };
}

/** Dört sinyalin anlık okuması. Simülasyon deterministiktir; testlerde aynı sonucu verir. */
export function readFourSignals({ connection = {}, tags = [], adapterCode = null } = {}) {
  const adapter = adapterFor(adapterCode) || adapterForProtocol(connection.protocol);
  const values = { door: 'closed', casting: 'idle', alarm: 'ok', running: 'false' };
  return FOUR_SIGNALS.map((signal) => {
    const tag = tags.find((t) => t.signal === signal) || null;
    return {
      signal,
      value: values[signal],
      address: tag?.address || '—',
      machineId: tag?.machineId || null,
      source: adapter.implemented ? adapter.code.toUpperCase() : 'MANUAL',
      at: '2026-11-04T12:00:00+03:00'
    };
  });
}
