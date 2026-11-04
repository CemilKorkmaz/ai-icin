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

// 6) Saha görüşmesi koleksiyonları (docs/05, schemaVersion 3)
check(SEED.schemaVersion === 3, 'Şema sürümü 3 olmalı');
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

console.log(`\nSonuç: ${failures ? failures + ' HATA' : 'TÜM TESTLER GEÇTİ'}`);
process.exit(failures ? 1 : 0);
