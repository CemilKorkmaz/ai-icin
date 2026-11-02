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
const { D, stockState, orderTotal } = await import('../app/js/store.js');
const { SEED, STAGES } = await import('../app/js/seed.js');

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

console.log(`\nSonuç: ${failures ? failures + ' HATA' : 'TÜM TESTLER GEÇTİ'}`);
process.exit(failures ? 1 : 0);
