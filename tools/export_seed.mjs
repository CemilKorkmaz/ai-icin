#!/usr/bin/env node
// app/js/seed.js dosyasındaki demo verisinden server/erp/data/*.json arşivini üretir.
// Tek kaynak = seed.js; elle JSON düzenlemek gerekmez.
// Kullanım: node tools/export_seed.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'server', 'erp', 'data');
const seedPath = path.join(root, 'app', 'js', 'seed.js');

// seed.js bağımsız bir ES modüldür; Node tarafında eval ile güvenle okuyoruz (import yok).
const source = fs.readFileSync(seedPath, 'utf8').replace(/export const /g, 'const ');
const { SEED, STAGES, CATEGORY_ORDER } = new Function(`${source}\nreturn { SEED, STAGES, CATEGORY_ORDER };`)();

fs.mkdirSync(outDir, { recursive: true });
const generatedAt = new Date().toISOString();
const files = [];

for (const [key, value] of Object.entries(SEED)) {
  if (key === 'schemaVersion') continue;
  const name = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()) + '.json';
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(value, null, 2) + '\n', 'utf8');
  files.push({ file: name, collection: key, records: Array.isArray(value) ? value.length : 1 });
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({
  schema_version: SEED.schemaVersion,
  generated_at: generatedAt,
  source: 'app/js/seed.js (node tools/export_seed.mjs)',
  note: 'Koleksiyon dosyaları doğrudan kayıt dizisidir (settings.json tek nesnedir). schemaVersion 3: genel ERP karşılaştırmasıyla müşteri/cari, satış siparişi, talep ve teklif, fatura, borç-alacak fişi, ödeme, depo, rezervasyon, sayım, maliyet, personel, vardiya, bütçe, dönem kapanışı ve entegrasyon kuralları eklendi. Olayların kalıcı hâli server/erp/archive/ altındadır.',
  stages: STAGES,
  categories: CATEGORY_ORDER,
  files
}, null, 2) + '\n', 'utf8');

console.log(`✓ ${files.length} JSON dosyası yazıldı: ${path.relative(root, outDir)}`);
console.log('✓ manifest.json güncellendi');
