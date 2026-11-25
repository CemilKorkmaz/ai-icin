#!/usr/bin/env node
// Prototipin tüm ekranlarını Node içinde (DOM olmadan) render ederek duman testi yapar.
// Kullanım: node tools/smoke_test.mjs

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k)
};
globalThis.window = { dispatchEvent: () => {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const { VIEWS, NAV, GROUP_OF } = await import('../app/js/views/index.js');
const { D, store, appendJournal, stockState, orderTotal } = await import('../app/js/store.js');
const { SEED, STAGES } = await import('../app/js/seed.js');
const { cuttingReport, geometryCheck, maintenanceStatus, durationCheck, cylinderMassKg } = await import('../app/js/calc.js');
const {
  amounts, salesEntry, purchaseEntry, buildEntry, trialBalance, isBalanced,
  lotCost, salesMargin, creditCheck, kpiSnapshot, postingEffects, INTEGRATION_MATRIX
} = await import('../app/js/posting.js');
const {
  MODULES, MACHINE_TYPES, FOUR_SIGNALS, visibleNav, machineRefs, buildPlantPackage,
  validatePackage, applyPlantPackage, decommissionMachine, recommissionMachine,
  defaultSetupDraft, setupMachinesFromDraft, activePlantId
} = await import('../app/js/modularity.js');
const { ADAPTERS, testConnection, readFourSignals } = await import('../app/js/adapters.js');

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.error('  ✗', msg); failures++; } };

console.log('ERP Studio — duman testi\n');

// 1) Menü ↔ ekran eşleşmesi
const navIds = NAV.flatMap((g) => g.items.map((i) => i.id));
check(navIds.length === new Set(navIds).size, 'Menüde yinelenen ekran kimliği var');
navIds.forEach((id) => check(!!VIEWS[id], `Menüdeki "${id}" ekranı tanımlı değil`));
Object.keys(VIEWS).forEach((id) => check(navIds.includes(id), `"${id}" ekranı menüde yok`));
console.log(`✓ ${navIds.length} menü öğesi / ${Object.keys(VIEWS).length} ekran eşleşiyor`);

// 2) Tüm ekranları render et
for (const [id, view] of Object.entries(VIEWS)) {
  try {
    const html = view.render();
    check(typeof html === 'string' && html.length > 120, `${id}: render çıktısı boş/çok kısa`);
    check(!html.includes('[object Object]'), `${id}: [object Object] sızıntısı`);
    check(!html.includes('undefined'), `${id}: "undefined" sızıntısı`);
    check(!html.includes('NaN'), `${id}: "NaN" sızıntısı`);
    check(typeof view.title === 'string' && typeof view.subtitle === 'string', `${id}: başlık eksik`);
    console.log(`  ✓ ${id.padEnd(15)} ${String(html.length).padStart(6)} karakter`);
  } catch (err) {
    console.error(`  ✗ ${id}: ${err.stack}`);
    failures++;
  }
}

// 3) Veri bütünlüğü
const d = D();
const ids = (arr) => arr.map((x) => x.id);
check(ids(d.materials).length === new Set(ids(d.materials)).size, 'Yinelenen malzeme id');
check(d.materials.every((m) => m.category && m.unit), 'Malzeme kartında kategori/birim eksik');
check(d.purchaseOrders.every((o) => o.items.length > 0), 'Kalemsiz satın alma emri var');
check(d.lots.every((l) => STAGES.includes(l.stage)), 'Geçersiz üretim aşaması var');
check(d.movements.every((m) => d.materials.some((x) => x.id === m.materialId)), 'Hareket, olmayan malzemeye bağlı');
check(d.recipes.every((r) => r.items.every((i) => d.materials.some((x) => x.id === i.materialId))), 'Reçete, olmayan malzemeye bağlı');
check(orderTotal(d.purchaseOrders[0]) > 0, 'Emir toplamı hesaplanamadı');
check(stockState(d.materials.find((m) => m.id === 'H02')).key === 'critical', 'Kritik stok eşiği çalışmıyor');
console.log(`✓ ${d.materials.length} malzeme · ${d.lots.length} döküm kodu · ${d.movements.length} hareket · ${d.outbox.length} kuyruk kaydı`);

// 4) Değişken yapı / kapalı çevrim alanları
check(Array.isArray(SEED.categories) && SEED.categories.length >= 4, 'Kategori tanımları eksik');
check(typeof d.settings.online === 'boolean', 'Çevrimiçi/çevrimdışı ayarı eksik');
check(d.outbox.some((o) => o.status === 'queued'), 'Kuyrukta kayıt yok (kapalı çevrim demosu)');
console.log('✓ Değişken tanımlar ve giden kutu alanları mevcut');

// 5) Hesap motoru (docs/07)
check(Math.abs(cylinderMassKg(178, 3, 2700, 1) - 0.2016) < 0.001, '3 mm talaş formülü hatalı');
check(Math.abs(cylinderMassKg(178, 300, 2700, 1) - 20.1565) < 0.01, '300 mm kafa formülü hatalı');
const cut = cuttingReport({ count: 35, headPerBillet: 2, cutsPerBillet: 2 });
check(cut.effectiveHeadMm === 297, 'Bıçak payı döküm boyuna dâhil edilmedi (297 mm beklenir)');
check(cut.deviationMm === 0, 'Uzunluk sapması sıfır olmalı');
check(cut.headKg > cut.sawdustKg, 'Kafa kesimi talaştan büyük olmalı');
check(cut.headPieces === 70 && cut.kerfCuts === 70, 'Kafa/kesim adedi yanlış');
const cutOut = cuttingReport({ count: 35, bladeInsideCastLength: false });
check(cutOut.deviationMm === -3, 'Bıçak payı ayrı ölçüldüğünde 3 mm sapma beklenir');
const geo = geometryCheck({ recordedTon: d.lots.find((l) => l.id === 'DK-2026-0139').weightTon, count: 35, diameterMm: 178, productLengthMm: 6000 });
check(geo.ok, `Geometri doğrulaması %${geo.deviationPct} sapma ile geçemedi`);
const oil = maintenanceStatus({ used: 90, limit: 100, warnAt: 90 });
check(oil.level === 'warn', 'Yağ uyarı eşiği çalışmıyor');
check(maintenanceStatus({ used: 100, limit: 100 }).level === 'danger', 'Yağ eşik dolumu algılanmadı');
const dur = durationCheck({ startedAt: '2026-11-01T22:00:00+03:00', endedAt: '2026-11-02T07:00:00+03:00', plannedMinutes: 480 });
check(dur.overrunMinutes === 60 && dur.status === 'Süre Aşımı', '8/9 saat homojenizasyon sapması yanlış');
console.log(`✓ Hesap motoru: talaş ${cut.unitSawdustKg} kg/kesim · kafa ${cut.unitHeadKg} kg · net ${cut.netBilletTon} t`);

// 6) Saha görüşmesi koleksiyonları (docs/05, schemaVersion 4)
check(SEED.schemaVersion === 4, 'Şema sürümü 4 olmalı');
for (const key of ['plants', 'machineTypes', 'machines', 'castingPaths', 'plcConnections', 'plcTags',
  'signalStates', 'homogenizationRecipes', 'homogenizationBatches', 'coolingBatches',
  'oilRules', 'bladeRules', 'maintenanceEvents', 'byProductFates', 'events', 'inboxQueue', 'vendorUpdates']) {
  check(Array.isArray(d[key]) && d[key].length > 0, `${key} koleksiyonu eksik/boş`);
}
check(d.machines.every((m) => m.mode === 'MANUAL' || m.mode === 'PLC'), 'Makine modu geçersiz');
check(new Set(d.plcTags.map((t) => t.signal)).size === 4, 'Dört sinyal kuralı ihlal edildi');
check(d.castingPaths.some((p) => p.holdTon === 1) && d.castingPaths.some((p) => p.holdTon === 2), '1 / 2 ton yol parametreleri yok');
check(d.homogenizationBatches.some((b) => b.lots.length > 1), 'Karışık homojenizasyon partisi yok');
check(d.homogenizationBatches.some((b) => b.status === 'Süre Aşımı'), 'Süre aşımı partisi yok');
check(d.byProductFates.some((f) => f.fate === 'sale') && d.byProductFates.some((f) => f.fate === 'remelt'), 'Kafa/talaş akıbeti ayrılmadı');
const chain = d.events.filter((e) => e.lotId === 'DK-2026-0139').sort((a, b) => a.seq - b.seq);
check(chain.length >= 8, 'Kütle dengesi zinciri eksik');
check(chain[0].balanceTon === 21 && chain.find((e) => e.type === 'NET_BILLET').balanceTon === 14, '21 → 14 ton zinciri kapanmadı');
let bal = 0; let ok = true;
chain.forEach((e) => { bal = Math.round((bal + e.deltaTon) * 10000) / 10000; if (Math.abs(bal - e.balanceTon) > 0.001) ok = false; });
check(ok, 'Olay bakiyeleri ardışık değil');
console.log(`✓ ${d.machines.length} makine · ${d.castingPaths.length} yol · ${d.events.length} olay · ${d.plcTags.length} PLC tag`);

// 7) Genel ERP karşılaştırmasıyla eklenen ticari / finansal katman (docs/11)
for (const key of ['accounts', 'customers', 'quotations', 'salesOrders', 'purchaseRequests',
  'purchaseQuotes', 'invoices', 'journalEntries', 'payments', 'warehouses',
  'stockCounts', 'reservations', 'costRecords', 'employees', 'shifts',
  'budgets', 'periodClosures', 'integrationRules']) {
  check(Array.isArray(d[key]) && d[key].length > 0, `${key} koleksiyonu eksik/boş`);
}
check(d.integrationRules.length === INTEGRATION_MATRIX.length, 'Entegrasyon matrisi ile seed verisi uyuşmuyor');
check(d.accounts.every((a) => a.code && a.name), 'Hesap planında kod/ad eksik');

const a20 = amounts(1542000, 20);
check(a20.vat === 308400 && a20.gross === 1850400, 'KDV / brüt tutar hesabı hatalı');
check(d.invoices.every((i) => Math.abs(i.net + i.vat - i.gross) < 0.01), 'Faturada net + KDV ≠ brüt');
check(d.invoices.every((i) => Math.abs(i.net * i.vatRate / 100 - i.vat) < 0.01), 'Fatura KDV oranı tutarsız');

const je = salesEntry(d.invoices.find((i) => i.no === 'FTR-2026-1142'));
check(isBalanced(je) && je.totalDebit === 1850400, 'Satış fişi borç/alacak dengesi bozuk');
const pe = purchaseEntry(d.invoices.find((i) => i.no === 'AF-2026-0311'));
check(isBalanced(pe) && pe.totalDebit === 1022400, 'Alış fişi borç/alacak dengesi bozuk');
check(d.journalEntries.every(isBalanced), 'Dengesiz muhasebe fişi var');
const tb = trialBalance(d.journalEntries, d.accounts);
check(tb.balanced, 'Mizan borç = alacak değil');
check(tb.totals.debit > 0 && tb.rows.length >= d.accounts.length, 'Mizan satırları eksik');

const c139 = lotCost(d.costRecords.find((r) => r.lotId === 'DK-2026-0139'));
check(c139.consistent && c139.total === 412000, 'DK-2026-0139 maliyet kalemleri toplamı yanlış');
check(Math.abs(c139.unitCostPerTon - 29428.57) < 0.01, 'Birim maliyet (₺/ton) yanlış');
check(d.costRecords.every((r) => lotCost(r).consistent), 'Tutarsız maliyet kaydı var');
const margin = salesMargin({ revenue: 18 * 118500, costTon: c139.netTon, unitCostPerTon: c139.unitCostPerTon });
check(margin.grossProfit > 0 && margin.marginPct > 0, 'Brüt kâr hesaplanamadı');

const m01 = d.customers.find((c) => c.id === 'M01');
check(creditCheck(m01, 1000000).ok === true, 'Kredi limiti uygunken reddedildi');
check(creditCheck(m01, 3000000).ok === false, 'Kredi limiti aşımı yakalanmadı');
check(d.periodClosures.some((pc) => pc.status === 'Açık' && pc.period === d.settings.currentPeriod), 'Açık dönem kaydı yok');
check(d.stockCounts.every((c) => c.countedKg - c.expectedKg === c.differenceKg), 'Sayım farkı tutarsız');
check(d.employees.every((e) => d.users.some((u) => u.id === e.userId)), 'Personel kullanıcıya bağlı değil');
check(d.shifts.some((s) => s.start > s.end), 'Gece vardiyası (gün aşan) örneği yok');

const kpi = kpiSnapshot(d);
check(kpi.revenue > 0 && kpi.budgetUsagePct > 0 && kpi.productionTon > 0, 'Çapraz modül KPI üretilemedi');
const fx = postingEffects('SHIPMENT_APPROVED', {
  shipment: d.shipments.find((s) => !s.postingDone), invoice: d.invoices[0],
  journal: je, customer: m01, movement: d.movements[0], costRecord: c139
});
check(fx.length === 8, 'Tek kayıt çok etki listesi 8 kayıt üretmeli');
check(new Set(fx.map((x) => x.collection)).size === 8, 'Etki edilen koleksiyonlar tekilleşmedi');

// Idempotency: aynı clientId ile ikinci fiş yazılmamalı.
const dupe = buildEntry({
  id: 'JE-TEST', no: 'MF-TEST', date: '2026-11-04', period: '2026-11',
  description: 'Duman testi', sourceModule: 'Test', sourceId: 'TEST', clientId: 'SMOKE-DUPE',
  lines: [
    { accountId: 'A102', accountCode: '102', debit: 100, credit: 0 },
    { accountId: 'A120', accountCode: '120', debit: 0, credit: 100 }
  ]
});
const before = d.journalEntries.length;
store.change((data) => { appendJournal(dupe); appendJournal(dupe); });
check(d.journalEntries.length === before + 1, 'Aynı clientId ile çift muhasebe fişi yazıldı');
check(!isBalanced({ lines: [{ debit: 100, credit: 0 }] }), 'Dengesiz fiş kabul edildi');
console.log(`✓ ${d.accounts.length} hesap · ${d.journalEntries.length} fiş · ${d.invoices.length} fatura · ${d.integrationRules.length} kural · mizan dengeli`);

// 8) Modüler saha kurulumu (docs/12): tek kaynak, 1 fırınlı profil, güvenli çıkarma, adaptör
for (const key of ['machineAliases', 'moduleRegistry', 'plantModules', 'setupDrafts',
  'adapterContracts', 'profilePackages']) {
  check(Array.isArray(d[key]) && d[key].length > 0, `${key} koleksiyonu eksik/boş`);
}
check(Object.keys(VIEWS).length === 35 && navIds.length === 35, '35 ekran / 35 menü öğesi beklenir');
const covered = new Set(MODULES.flatMap((m) => m.views));
check(Object.keys(VIEWS).every((id) => covered.has(id)), 'Modül kaydı kapsamayan ekran var');
check(new Set(MODULES.map((m) => m.code)).size === MODULES.length, 'Yinelenen modül kodu var');

// furnaces, machines'in salt-okunur projeksiyonu olmalı (tek kaynak)
const projected = d.machines.filter((m) => m.type === 'FURNACE' || m.type === 'ROTARY').map((m) => m.id).sort();
check(JSON.stringify(d.furnaces.map((f) => f.id).sort()) === JSON.stringify(projected),
  'furnaces, machines projeksiyonu değil (çift kaynak)');
check(d.machineAliases.every((a) => d.machines.some((m) => m.id === a.machineId)), 'Eski kod eşlemesi geçersiz');
check(d.recipes.every((r) => !r.machineId || d.machines.some((m) => m.id === r.machineId)), 'Reçete ocak kimliği geçersiz');
check(d.lots.every((l) => !l.machineId || d.machines.some((m) => m.id === l.machineId)), 'Döküm kodu ocak kimliği geçersiz');
check(d.adapterContracts.every((a) => ['connect', 'test', 'readFourSignals', 'disconnect'].every((f) => a.capabilities.includes(f))),
  'Adaptör sözleşmesi eksik');
check(d.settings.adapterMode && d.adapterContracts.some((a) => a.code === d.settings.adapterMode), 'Varsayılan adaptör kayıtlı değil');

// Profil paketi: doğrulama ve 5 fırın → 1 fırın kopyası
const pkg = buildPlantPackage(d, 'P1');
check(validatePackage(pkg).ok, 'P1 profil paketi doğrulanamadı: ' + validatePackage(pkg).errors.join(', '));
check(validatePackage({ ...pkg, schemaVersion: 3 }).ok === false, 'Eski şema sürümü reddedilmedi');
check(validatePackage({ ...pkg, castingPaths: [{ id: 'X', fromMachineId: 'YOK', tableId: 'YOK' }] }).ok === false,
  'Paket dışı makineye bağlı yol kabul edildi');
const clone = JSON.parse(JSON.stringify(d));
const out1 = applyPlantPackage(clone, pkg, { code: 'FIRM-TEK', name: 'Tek Fırınlı Fabrika', furnaceCount: 1 });
check(out1.furnaceCount === 1, `1 fırınlı profilde ${out1.furnaceCount} fırın üretildi`);
check(out1.pathCount === 1, 'Kaldırılan fırına ait döküm yolu hâlâ kopyalandı');
check(out1.machineCount === pkg.machines.length - 4, 'Fırın azaltımı yalnızca fırınları etkilemeli');
check(clone.plants.some((p) => p.id === out1.plantId), 'Yeni fabrika kartı oluşmadı');
check(clone.settings.activePlantId === out1.plantId, 'Yeni fabrika aktif hale gelmedi');
// Mevcut veride koleksiyonlar arası aynı kimlikler (M01, CR-001) zaten vardır;
// ölçüt, kopyanın ürettiği yeni kimliklerin hem benzersiz hem de özgün olmasıdır.
const beforeIds = new Set(Object.values(d).filter(Array.isArray).flat().map((x) => x && x.id).filter(Boolean));
const addedIds = Object.values(clone).filter(Array.isArray).flat().map((x) => x && x.id).filter((id) => id && !beforeIds.has(id));
check(addedIds.length > 20 && new Set(addedIds).size === addedIds.length,
  'Profil kopyası yinelenen veya mevcut bir kimlik üretti');
const out2 = applyPlantPackage(clone, pkg, { code: 'FIRM-CIFT', name: 'İki Fırınlı Fabrika', furnaceCount: 2 });
check(out2.furnaceCount === 2 && out2.pathCount === 3, '2 fırınlı profil doğru yolları üretmedi');
check(clone.castingPaths.filter((p) => p.plantId === out2.plantId).length === 3, '2 fırınlı profil yol sayısı yanlış');

// Makine çıkarma: silinmez, bağımlılık raporu verilir, geri alınabilir
const clone2 = JSON.parse(JSON.stringify(d));
const refs = machineRefs(clone2, 'MCH-01');
check(refs.length > 0, 'MCH-01 için bağımlılık raporu boş');
const dec = decommissionMachine(clone2, 'MCH-01', 'Test: ocak söküldü');
check(dec.ok && dec.refs.length === refs.length, 'Çıkarma bağımlılıkları raporlamadı');
check(clone2.machines.some((m) => m.id === 'MCH-01'), 'Makine silindi (silinmemeliydi)');
check(clone2.machines.find((m) => m.id === 'MCH-01').active === false, 'Makine aktif kaldı');
check(!!clone2.machines.find((m) => m.id === 'MCH-01').decommissionedAt, 'Devre dışı tarihi yazılmadı');
check(clone2.castingPaths.filter((p) => p.fromMachineId === 'MCH-01').length === 1, 'Bağımlı döküm yolu silindi');
check(recommissionMachine(clone2, 'MCH-01') && clone2.machines.find((m) => m.id === 'MCH-01').active === true,
  'Geri alma çalışmıyor');

// Modül kaydı menüyü filtreliyor, adaptör sözleşmesi MANUAL yedeğe düşüyor
const navP1 = visibleNav(NAV, d);
check(navP1.flatMap((g) => g.items.map((i) => i.id)).includes('plc'), 'PLC modlu fabrikada PLC ekranı gizlendi');
const noPlc = JSON.parse(JSON.stringify(d));
noPlc.plantModules.find((x) => x.plantId === activePlantId(noPlc)).enabled.PLC = false;
check(!visibleNav(NAV, noPlc).flatMap((g) => g.items.map((i) => i.id)).includes('plc'), 'Kapalı PLC modülü menüde kaldı');
const manualPlant = JSON.parse(JSON.stringify(d));
manualPlant.settings.activePlantId = 'P2';
check(!visibleNav(NAV, manualPlant).flatMap((g) => g.items.map((i) => i.id)).includes('plc'),
  'MANUAL fabrikada PLC ekranı görünmemeli');
const sim = testConnection({ connection: { protocol: 'OPC UA', ip: '192.168.1.50', port: 4840, mode: 'PLC' },
  tags: FOUR_SIGNALS.map((signal) => ({ signal })), adapterCode: 'simulated' });
check(sim.ok && sim.tagCount === 4 && sim.missingSignals.length === 0, 'Simülasyon adaptörü bağlantıyı doğrulayamadı');
const real = testConnection({ connection: { protocol: 'OPC UA', mode: 'PLC' },
  tags: FOUR_SIGNALS.map((signal) => ({ signal })), adapterCode: 'opcua' });
check(real.implemented === false && real.fallback === 'MANUAL (operatör veri girişi)', 'Gerçek sürücü yokken MANUAL yedeğe düşülmedi');
const sig = readFourSignals({ connection: { protocol: 'Modbus' }, tags: [] });
check(sig.length === 4 && sig.every((x) => FOUR_SIGNALS.includes(x.signal)), 'Dört sinyal okuması eksik');
check(ADAPTERS.length === 3, 'Adaptör kaydı 3 sözleşme içermeli');
const draft = defaultSetupDraft(d);
draft.values.counts.FURNACE = 1;
check(setupMachinesFromDraft(draft).filter((m) => m.type === 'FURNACE').length === 1, 'Sihirbaz 1 fırın üretemedi');
draft.values.counts.FURNACE = 2;
check(setupMachinesFromDraft(draft).filter((m) => m.type === 'FURNACE').length === 2, 'Sihirbaz 2 fırın üretemedi');
console.log(`✓ ${MODULES.length} modül · ${ADAPTERS.length} adaptör · 1 ve 2 fırınlı profil · ${refs.length} bağımlı kayıt korundu`);

// 15) Canlı simülasyon modu — ana ekranlar demo yerine köprü verisini gösterir
const live = await import('../app/js/live.js');
const sampleLive = {
  ok: true, stale: false, baseUrl: 'http://127.0.0.1:8000', mode: 'DEMO',
  checkedAt: '2026-11-02T10:00:00+03:00',
  furnaces: [
    { name: 'Aluminyum Eritme Fırını', temperatureC: 745.2, targetC: 750, maxC: 850, status: 'CALISIYOR', alarmActive: false },
    { name: 'Homojenizasyon Fırını', temperatureC: 540, targetC: 550, maxC: 600, status: 'ISINIYOR', alarmActive: false },
    { name: 'Biyet Isıtma Fırını', temperatureC: 181, targetC: 175, maxC: 200, status: 'ALARM', alarmActive: true, alarm: 'Sıcaklık sınırı', sensorOk: false, quality: 'BAD', signals: { door: 'open', casting: 'pouring', alarm: 'fault', running: 'stopped' } }
  ],
  orders: [{ id: 'WO-20261102-0001', product: '6063', furnace: 'Aluminyum Eritme Fırını', targetC: 750, durationMin: 120, state: 'RUNNING', remainingMin: 33 }],
  mapping: {
    pairs: [
      { furnace: 'Aluminyum Eritme Fırını', machineId: 'MCH-01', machineName: 'A Fırını', machineType: 'FURNACE', source: 'auto' },
      { furnace: 'Homojenizasyon Fırını', machineId: 'MCH-10', machineName: 'Homojen 1', machineType: 'HOMO_FURNACE', source: 'auto' },
      { furnace: 'Biyet Isıtma Fırını', machineId: 'MCH-02', machineName: 'B Fırını', machineType: 'FURNACE', source: 'auto' }
    ], matched: 3, furnaces: 3
  },
  edge: { batches: 12, readings: 340 }, health: {}
};
live.applyLiveSnapshot(sampleLive, 'on');
check(live.liveEnabled(), 'Canlı mod açılmadı');
const lstats = live.liveStats(sampleLive);
check(lstats.furnaceCount === 3 && lstats.alarms === 1 && lstats.running === 1, 'Canlı özet yanlış');
check(Math.round(lstats.avgTemp) === 489, 'Ortalama sıcaklık yanlış');
const liveFurnaces = live.mapLiveFurnaces(sampleLive, d.machines);
check(liveFurnaces.length === 3 && liveFurnaces.every((f) => f.mapped), 'Fırın → makine eşlemesi eksik');
check(liveFurnaces.find((f) => f.id === 'MCH-01').name === 'A Fırını', 'Profil makine adı kullanılmadı');
const liveDash = VIEWS.dashboard.render();
check(liveDash.includes('Aluminyum Eritme Fırını') && liveDash.includes('745'), 'Panel canlı fırınları göstermiyor');
check(liveDash.includes('WO-20261102-0001'), 'Panel simülasyon emrini göstermiyor');
check(!liveDash.includes('Son 7 Gün Üretim'), 'Canlı panelde demo grafiği kaldı');
const liveMachines = VIEWS.machines.render();
check(liveMachines.includes('MCH-01') && liveMachines.includes('CANLI'), 'Makine Parkı canlı değil');
const livePlc = VIEWS.plc.render();
check(livePlc.includes('Bilinmiyor') && livePlc.includes('Sensör BAD'), 'PLC ekranı dört sinyali canlı göstermiyor');
check(livePlc.includes('Açık') && livePlc.includes('Döküm Yapılıyor'), 'PLC kapı/döküm sinyallerini göstermiyor');
check(livePlc.includes('Sensör BAD') && livePlc.includes('BAD'), 'PLC sensör kalitesini göstermiyor');
const liveProd = VIEWS.production.render();
check(liveProd.includes('WO-20261102-0001') && !liveProd.includes('Yeni Döküm Başlat'), 'Üretim akışı canlı/salt okunur değil');
// Canlı mod açıkken köprü yoksa dört ekran da çökmemeli, açıklayıcı boş durum göstermeli.
live.applyLiveSnapshot(null, 'on');
for (const key of live.LIVE_VIEWS) {
  const html = VIEWS[key].render();
  check(html.includes('Simülasyon bağlantısı yok'), `${key}: bağlantı yok durumu gösterilmiyor`);
}
live.applyLiveSnapshot(null, 'off');
check(!live.liveEnabled() && VIEWS.dashboard.render().includes('Son 7 Gün Üretim'), 'Demo moduna dönüş bozuk');
// Service worker canlı API yanıtlarını önbelleğe almamalı; yoksa 3 sn'lik tazeleme donar.
const { readFileSync } = await import('node:fs');
const swSource = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
check(swSource.includes("url.pathname.startsWith('/api/')"), 'Service worker /api yanıtlarını önbelleğe alıyor');
check(swSource.includes('./js/live.js'), 'Service worker live.js dosyasını önbelleğe almıyor');
check(swSource.includes('./js/sim_feed.js'), 'Service worker sim_feed.js dosyasını önbelleğe almıyor');
console.log('✓ canlı mod: 3 fırın · 1 alarm · emirler Panel/Üretim/Makine/PLC ekranlarında · demo moduna dönüş');

// 16) Simülasyon → ERP bildirim köprüsü (salt okunur)
const feed = await import('../app/js/sim_feed.js');
const beforeNotif = D().notifications.length;
const okIngest = feed.ingestSimEventForTest({
  id: 9001, severity: 'critical', module: 'plc', title: 'Sensör arızası',
  message: 'Biyet Isıtma Fırını: sensör BAD', furnace: 'Biyet Isıtma Fırını',
  data: { scenario: 'sensor_failure', quality: 'BAD' }
});
const lastNotif = D().notifications[0];
check(okIngest === true, 'Simülasyon olayı bildirime dönüşmedi');
check(D().notifications.length === beforeNotif + 1, 'Bildirim sayısı artmadı');
check(lastNotif.simEventId === 9001 && lastNotif.type === 'danger', 'Bildirim simülasyon kimliği/türü yanlış');
check(lastNotif.source.includes('Biyet Isıtma Fırını') && lastNotif.body.includes('BAD'), 'Bildirim kaynağı/gövdesi eksik');
check(feed.ingestSimEventForTest({ id: 9001, severity: 'critical', title: 'Tekrar' }) === false, 'Aynı olay iki kez bildirime düştü');
const notifHtml = VIEWS.notifications.render();
check(notifHtml.includes('Sensör arızası') && notifHtml.includes('Simülasyon'), 'Bildirim merkezi simülasyon olayını göstermiyor');
console.log('✓ simülasyon olayı: kritik → bildirim merkezi · tekilleştirme · kaynak etiketi');

console.log(`\nSonuç: ${failures ? failures + ' HATA' : 'TÜM TESTLER GEÇTİ'}`);
process.exit(failures ? 1 : 0);
