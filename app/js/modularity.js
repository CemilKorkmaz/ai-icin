// Modüler kurulum çekirdeği — fabrikaya özel makine parkı, modül kaydı ve profil paketleri.
// Saf modüldür: DOM, localStorage veya store'a bağımlı değildir; Node tarafında test edilir.
// Gereksinim kaynağı: docs/08 (modüler makine), docs/12 (saha kurulum ve modül yaşam döngüsü).

/** Menüdeki 34 ekranı mantıksal modüllere bağlayan kayıt. `views` listesi veridir, kod değildir. */
export const MODULES = [
  { code: 'CORE', label: 'Çekirdek', group: 'Genel / Sistem', views: ['dashboard', 'notifications', 'settings'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Panel, bildirim ve ayarlar her fabrikada açıktır' },
  { code: 'PURCHASING', label: 'Satın Alma', group: 'Ticari', views: ['materials', 'orders', 'prices', 'suppliers', 'requests'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Değişken malzeme kartları ve talep/teklif akışı' },
  { code: 'INVENTORY', label: 'Hammadde & Stok', group: 'Üretim', views: ['stock', 'receipts', 'crusher', 'movements'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Faz 1 kapsamı, her fabrikada zorunlu' },
  { code: 'PRODUCTION', label: 'Üretim', group: 'Üretim', views: ['production', 'recipes', 'batches', 'events'], defaultEnabled: true, requiresMachineType: 'FURNACE', requiresMode: null, note: 'En az bir ergitme ocağı tanımlı olmalı' },
  { code: 'MACHINES', label: 'Makine Parkı', group: 'Kurulum', views: ['machines', 'paths', 'cutting', 'maintenance'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Ekleme, düzenleme ve devre dışı bırakma' },
  { code: 'ROTARY', label: 'Döner Ocak / Cüruf', group: 'Kurulum', views: [], defaultEnabled: false, requiresMachineType: 'ROTARY', requiresMode: null, note: 'Yalnızca döner ocağı olan fabrikada görünür' },
  { code: 'PLC', label: 'PLC Durum', group: 'Kurulum', views: ['plc'], defaultEnabled: false, requiresMachineType: null, requiresMode: 'PLC', note: 'Fabrika modu PLC değilse menüde görünmez' },
  { code: 'SALES', label: 'Satış & Müşteri', group: 'Ticari', views: ['sales', 'customers'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'docs/11 ile eklenen ticari katman' },
  { code: 'FINANCE', label: 'Muhasebe & Maliyet', group: 'Ticari', views: ['finance', 'costing'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Fiş, mizan, fatura, döküm kodu maliyeti' },
  { code: 'WAREHOUSE', label: 'Depo & Sayım', group: 'Lojistik', views: ['warehouse'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Depo lokasyonu ve rezervasyon' },
  { code: 'HR', label: 'Personel & Vardiya', group: 'Lojistik', views: ['hr'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Bordro harici; yalnızca operatör izi' },
  { code: 'SHIPPING', label: 'Sevkiyat', group: 'Lojistik', views: ['shipments', 'archive'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'İki kademeli onay ve arşiv' },
  { code: 'REPORTS', label: 'Raporlama', group: 'Yönetim', views: ['reports'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Günlük / haftalık / aylık çıktılar' },
  { code: 'INTEGRATION', label: 'Entegrasyon', group: 'Yönetim', views: ['integration'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Tek kayıt çok etki matrisi' },
  { code: 'VENDOR', label: 'Merkezi Yönetim', group: 'Yönetim', views: ['vendor', 'setup', 'modules'], defaultEnabled: true, requiresMachineType: null, requiresMode: null, note: 'Yalnızca geliştirici ekibi; operatör ekranı değildir' }
];

/** Bir makineye bağlanabilecek tüm alanlar. Çıkarma öncesi bağımlılık raporu buradan üretilir. */
export const MACHINE_REF_FIELDS = [
  { collection: 'castingPaths', label: 'Döküm yolu', fields: ['fromMachineId', 'tableId'] },
  { collection: 'recipes', label: 'Reçete', fields: ['machineId'] },
  { collection: 'lots', label: 'Döküm kodu', fields: ['machineId'] },
  { collection: 'plcTags', label: 'PLC tag eşlemesi', fields: ['machineId'] },
  { collection: 'signalStates', label: 'Sinyal durumu', fields: ['machineId'] },
  { collection: 'oilRules', label: 'Yağ kuralı', fields: ['machineId'] },
  { collection: 'bladeRules', label: 'Bıçak kuralı', fields: ['machineId'] },
  { collection: 'maintenanceEvents', label: 'Bakım kaydı', fields: ['machineId'] },
  { collection: 'homogenizationBatches', label: 'Homojenizasyon partisi', fields: ['machineId'] },
  { collection: 'events', label: 'Olay satırı', fields: ['machineId'] },
  { collection: 'machineAliases', label: 'Eski kod eşlemesi', fields: ['machineId'] }
];

export const MACHINE_TYPES = ['FURNACE', 'CAST_TABLE', 'SAW', 'HOMO_FURNACE', 'CONT_HOMO', 'ROTARY'];
export const FOUR_SIGNALS = ['door', 'casting', 'alarm', 'running'];

export function moduleForView(viewId, modules = MODULES) {
  return modules.find((m) => (m.views || []).includes(viewId)) || null;
}

export function defaultEnabledMap(modules = MODULES) {
  return Object.fromEntries(modules.map((m) => [m.code, m.defaultEnabled !== false]));
}

export function activePlant(data) {
  const plants = data?.plants || [];
  const wanted = data?.settings?.activePlantId;
  const found = plants.find((p) => p.id === wanted && p.active !== false);
  return found || plants.find((p) => p.active !== false) || plants[0] || null;
}

export function activePlantId(data) {
  return activePlant(data)?.id || null;
}

export function isModuleEnabled(data, code, modules = null, plantId = null) {
  // Kayıt veri olarak tutulur: varsa d.moduleRegistry, yoksa gömülü tanım kullanılır.
  const registry = modules || (data?.moduleRegistry?.length ? data.moduleRegistry : MODULES);
  const pid = plantId || activePlantId(data);
  const def = registry.find((m) => m.code === code)?.defaultEnabled !== false;
  const rec = (data?.plantModules || []).find((x) => x.plantId === pid);
  if (!rec || !rec.enabled || typeof rec.enabled !== 'object') return def;
  return Object.prototype.hasOwnProperty.call(rec.enabled, code) ? !!rec.enabled[code] : def;
}

/** Menüyü aktif fabrikanın açık modülleri, modu ve makine parkına göre filtreler. */
export function visibleNav(nav, data, modules = null) {
  const registry = modules || (data?.moduleRegistry?.length ? data.moduleRegistry : MODULES);
  const pid = activePlantId(data);
  const plant = activePlant(data);
  const machines = data?.machines || [];
  const hasMachine = (type) => machines.some((m) => m.plantId === pid && m.type === type && m.active && !m.decommissionedAt);
  return (nav || []).map((g) => ({
    ...g,
    items: (g.items || []).filter((i) => {
      const mod = moduleForView(i.id, registry);
      if (!mod) return true;
      if (!isModuleEnabled(data, mod.code, registry, pid)) return false;
      if (mod.requiresMode && plant?.mode !== mod.requiresMode) return false;
      if (mod.requiresMachineType && !hasMachine(mod.requiresMachineType)) return false;
      return true;
    })
  })).filter((g) => g.items.length > 0);
}

/** Bir makineye bağlı kayıtların dökümü. Silme yerine devre dışı bırakma kararı bu rapora dayanır. */
export function machineRefs(data, machineId) {
  const out = [];
  for (const spec of MACHINE_REF_FIELDS) {
    const rows = data?.[spec.collection] || [];
    rows.forEach((row) => {
      for (const field of spec.fields) {
        if (row?.[field] === machineId) {
          out.push({ collection: spec.collection, label: spec.label, field, recordId: row.id || '—', ref: row.no || row.code || row.type || '' });
        }
      }
    });
  }
  return out;
}

/** Koleksiyon içinde benzersiz, okunabilir bir kimlik üretir. */
export function nextId(data, prefix) {
  const rows = Object.values(data || {}).filter(Array.isArray).flat();
  let max = 0;
  rows.forEach((r) => {
    const m = typeof r?.id === 'string' && r.id.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `${prefix}-${String(max + 1).padStart(2, '0')}`;
}

/**
 * Fabrikanın bütün kurulumunu tek JSON paketine toplar.
 * Başka bir sahada içe alınabilir, kopyalanabilir ve fırın sayısı azaltılarak uygulanabilir.
 */
export function buildPlantPackage(data, plantId, opts = {}) {
  const pid = plantId || activePlantId(data);
  const plant = (data.plants || []).find((p) => p.id === pid);
  if (!plant) return null;
  const inPlant = (key) => (data[key] || []).filter((x) => x.plantId === pid);
  const machines = inPlant('machines');
  const machineIds = new Set(machines.map((m) => m.id));
  const plcIds = new Set(inPlant('plcConnections').map((c) => c.id));
  const byMachine = (key) => (data[key] || []).filter((x) => machineIds.has(x.machineId));
  return {
    kind: 'erp-plant-profile',
    packageVersion: 1,
    schemaVersion: data.schemaVersion || 4,
    code: opts.code || plant.code,
    name: opts.name || plant.name,
    generatedAt: opts.generatedAt || new Date().toISOString(),
    source: 'ERP Studio · fabrika profil paketi',
    plant: { ...plant },
    machineTypes: (data.machineTypes || []).map((x) => ({ ...x })),
    machines: machines.map((x) => ({ ...x })),
    castingPaths: inPlant('castingPaths').map((x) => ({ ...x })),
    plcConnections: inPlant('plcConnections').map((x) => ({ ...x })),
    plcTags: (data.plcTags || []).filter((x) => plcIds.has(x.plcId)).map((x) => ({ ...x })),
    oilRules: byMachine('oilRules').map((x) => ({ ...x })),
    bladeRules: byMachine('bladeRules').map((x) => ({ ...x })),
    maintenanceEvents: byMachine('maintenanceEvents').map((x) => ({ ...x })),
    signalStates: byMachine('signalStates').map((x) => ({ ...x })),
    homogenizationBatches: byMachine('homogenizationBatches').map((x) => ({ ...x })),
    plantModules: (data.plantModules || []).find((x) => x.plantId === pid) || null,
    moduleRegistry: (data.moduleRegistry || MODULES).map((x) => ({ ...x }))
  };
}

export function validatePackage(pkg) {
  const errors = [];
  if (!pkg || typeof pkg !== 'object') return { ok: false, errors: ['Paket bir nesne değil'] };
  if (pkg.kind !== 'erp-plant-profile') errors.push('kind alanı erp-plant-profile olmalı');
  if (pkg.schemaVersion !== 4) errors.push(`schemaVersion 4 beklenir, gelen ${pkg.schemaVersion}`);
  if (!pkg.plant || !pkg.plant.code || !pkg.plant.name) errors.push('Fabrika kartı eksik (code / name)');
  if (!Array.isArray(pkg.machines) || !pkg.machines.length) errors.push('Makine listesi boş');
  if (!Array.isArray(pkg.machineTypes) || !pkg.machineTypes.length) errors.push('Makine tipi listesi boş');
  const ids = new Set((pkg.machines || []).map((m) => m.id));
  (pkg.machines || []).forEach((m) => {
    if (!m.id || !m.type || !m.name) errors.push(`Makine alanı eksik: ${m.id || '?'}`);
    if (!MACHINE_TYPES.includes(m.type) && !(pkg.machineTypes || []).some((t) => t.code === m.type)) {
      errors.push(`Bilinmeyen makine tipi: ${m.type}`);
    }
  });
  (pkg.castingPaths || []).forEach((p) => {
    if (!ids.has(p.fromMachineId) || !ids.has(p.tableId)) errors.push(`Döküm yolu ${p.id} pakette olmayan makineye bağlı`);
  });
  const seen = new Set();
  (pkg.machines || []).forEach((m) => { if (seen.has(m.id)) errors.push(`Yinelenen makine id: ${m.id}`); seen.add(m.id); });
  return { ok: errors.length === 0, errors };
}

/**
 * Paketi yeni bir fabrika olarak uygular. Mevcut kayıtlar değiştirilmez, yeni kimlikler üretilir.
 * `furnaceCount` verilirse yalnızca ilk N fırın kopyalanır ("5 fırın yerine 1 fırın").
 */
/** Koleksiyonlarda kullanılmayan, deterministik kimlikler üreten küçük fabrika. */
export function idFactory(data) {
  const used = new Set();
  const counters = {};
  Object.values(data || {}).filter(Array.isArray).flat().forEach((r) => {
    if (r && typeof r.id === 'string') {
      used.add(r.id);
      const m = r.id.match(/^([A-Z]+)-(\d+)$/);
      if (m) counters[m[1]] = Math.max(counters[m[1]] || 0, Number(m[2]));
    }
  });
  return (prefix) => {
    let n = (counters[prefix] || 0) + 1;
    let id = `${prefix}-${String(n).padStart(2, '0')}`;
    while (used.has(id)) { n += 1; id = `${prefix}-${String(n).padStart(2, '0')}`; }
    counters[prefix] = n;
    used.add(id);
    return id;
  };
}

/**
 * Paketi yeni bir fabrika olarak uygular. Mevcut kayıtlar değiştirilmez, yeni kimlikler üretilir.
 * `furnaceCount` verilirse yalnızca ilk N fırın kopyalanır ("5 fırın yerine 1 fırın").
 */
export function applyPlantPackage(data, pkg, opts = {}) {
  const check = validatePackage(pkg);
  if (!check.ok) throw new Error(check.errors.join(' | '));
  const fresh = idFactory(data);
  const pid = opts.plantId || fresh('P');
  const code = opts.code || `${pkg.plant.code}-KOPYA`;
  const name = opts.name || `${pkg.plant.name} (kopya)`;
  const furnaceLimit = Number.isFinite(Number(opts.furnaceCount)) && opts.furnaceCount !== '' ? Number(opts.furnaceCount) : null;
  let furnacesSeen = 0;
  const idMap = new Map();
  const selected = [];
  (pkg.machines || []).forEach((m) => {
    if (m.type === 'FURNACE' && furnaceLimit !== null) {
      if (furnacesSeen >= furnaceLimit) return;
      furnacesSeen += 1;
    }
    selected.push(m);
  });
  const kept = new Set(selected.map((m) => m.id));
  const machines = selected.map((m) => {
    const id = fresh('MCH');
    idMap.set(m.id, id);
    return { ...m, id, plantId: pid, active: true, status: 'Aktif', decommissionedAt: null, decommissionReason: '', installedAt: opts.installedAt || new Date().toISOString().slice(0, 10) };
  });

  const paths = (pkg.castingPaths || [])
    .filter((p) => kept.has(p.fromMachineId) && kept.has(p.tableId))
    .map((p) => ({ ...p, id: fresh('CP'), plantId: pid, fromMachineId: idMap.get(p.fromMachineId), tableId: idMap.get(p.tableId) }));

  const plcMap = new Map();
  const plcConnections = (pkg.plcConnections || []).map((c) => {
    const id = fresh('PLC');
    plcMap.set(c.id, id);
    return { ...c, id, plantId: pid, active: true };
  });
  const plcTags = (pkg.plcTags || [])
    .filter((t) => idMap.has(t.machineId) && plcMap.has(t.plcId))
    .map((t) => ({ ...t, id: fresh('TAG'), plcId: plcMap.get(t.plcId), machineId: idMap.get(t.machineId) }));

  const machineBound = (key, prefix) => (pkg[key] || [])
    .filter((x) => idMap.has(x.machineId))
    .map((x) => ({ ...x, id: fresh(prefix), machineId: idMap.get(x.machineId), plantId: pid }));

  const plant = { ...pkg.plant, id: pid, code, name, active: true, note: opts.note || `${pkg.plant.name} profilinden kopyalandı` };
  data.plants.push(plant);
  data.machines.push(...machines);
  data.castingPaths.push(...paths);
  data.plcConnections.push(...plcConnections);
  data.plcTags.push(...plcTags);
  ['oilRules', 'bladeRules', 'maintenanceEvents', 'signalStates', 'homogenizationBatches'].forEach((key) => {
    const prefix = { oilRules: 'OIL', bladeRules: 'BLD', maintenanceEvents: 'ME', signalStates: 'SIG', homogenizationBatches: 'HMB' }[key];
    const rows = machineBound(key, prefix);
    if (rows.length) data[key].push(...rows);
  });
  const enabled = { ...defaultEnabledMap(pkg.moduleRegistry || MODULES) };
  if (pkg.plantModules?.enabled && typeof pkg.plantModules.enabled === 'object') Object.assign(enabled, pkg.plantModules.enabled);
  data.plantModules.push({ id: fresh('PM'), plantId: pid, enabled, note: 'Profil paketinden uygulandı' });
  data.vendorUpdates.unshift({
    id: fresh('VU'), plantId: pid, version: opts.version || '1.2.0', kind: 'Profil Kurulumu',
    note: `${machines.length} makine, ${paths.length} döküm yolu içe alındı`, appliedBy: opts.appliedBy || 'Max',
    at: new Date().toISOString()
  });
  if (opts.setActive !== false) data.settings.activePlantId = pid;
  return { plantId: pid, machineCount: machines.length, furnaceCount: machines.filter((m) => m.type === 'FURNACE').length, pathCount: paths.length, tagCount: plcTags.length, idMap };
}

/** Makine silinmez; geçmiş kayıtlar korunur, yalnızca devre dışı işaretlenir. */
export function decommissionMachine(data, machineId, reason = '') {
  const m = (data.machines || []).find((x) => x.id === machineId);
  if (!m) return { ok: false, refs: [] };
  const refs = machineRefs(data, machineId);
  m.active = false;
  m.status = 'Devre Dışı';
  m.decommissionedAt = new Date().toISOString();
  m.decommissionReason = reason || 'Söküldü / kullanım dışı';
  return { ok: true, refs };
}

export function recommissionMachine(data, machineId) {
  const m = (data.machines || []).find((x) => x.id === machineId);
  if (!m) return false;
  m.active = true;
  m.status = 'Aktif';
  m.decommissionedAt = null;
  m.decommissionReason = '';
  return true;
}

/** Kurulum sihirbazının başlangıç taslağı. Her adım kaydedilir, yarım kalan kurulum devam eder. */
export function defaultSetupDraft(data) {
  return {
    id: 'SD-1', step: 1, updatedAt: new Date().toISOString(),
    values: {
      code: '', name: '', city: '', mode: 'MANUAL', note: '',
      counts: { FURNACE: 1, CAST_TABLE: 1, SAW: 1, HOMO_FURNACE: 1, CONT_HOMO: 0, ROTARY: 0 },
      defaultCapacity: { FURNACE: 20, CAST_TABLE: 1, SAW: 0, HOMO_FURNACE: 25, CONT_HOMO: 12, ROTARY: 8 },
      holdTon: 1,
      connection: { name: 'Fırın hattı PLC', ip: '192.168.1.50', protocol: 'OPC UA', port: 4840, pollSeconds: 3, adapter: 'simulated' },
      modules: defaultEnabledMap(data?.moduleRegistry || MODULES),
      lastTest: null
    }
  };
}

export function setupMachinesFromDraft(draft) {
  const out = [];
  const counts = draft?.values?.counts || {};
  const caps = draft?.values?.defaultCapacity || {};
  MACHINE_TYPES.forEach((type) => {
    const n = Math.max(0, Number(counts[type]) || 0);
    for (let i = 1; i <= n; i += 1) {
      out.push({ type, name: `${type === 'FURNACE' ? 'Fırın' : type === 'CAST_TABLE' ? 'Tabla' : type === 'SAW' ? 'Testere' : type === 'HOMO_FURNACE' ? 'Homojen' : type === 'CONT_HOMO' ? 'Sürekli Hat' : 'Döner Ocak'} ${i}`, capacityTon: Number(caps[type]) || 0, mode: draft?.values?.mode || 'MANUAL' });
    }
  });
  return out;
}
