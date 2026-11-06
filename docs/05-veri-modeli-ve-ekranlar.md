# 05 — Veri Modeli, API Sözleşmesi ve Ekran Envanteri

**Amaç:** `docs/01`–`docs/13` arasında tarif edilen işlevlerin somut veri karşılıklarını, hesap kurallarını ve prototipteki ekranların envanterini vermek. Sürüm 1.3 itibarıyla **59 varlık**, **34 ERP ekranı** ve **1 saha arayüzü** kapsanır. Bu doküman, Faz 1 geliştirmesinde API sözleşmesi olarak kullanılır.

**Ortak kurallar:** Tüm tarih/saat değerleri ISO 8601 (`2026-11-02T09:30:00+03:00`), tüm ondalıklar nokta ile, tüm miktarlar `quantity` + `unit` ikilisiyle yazılır. Referanslar **ID** iledir; malzeme adı hiçbir kayıtta birincil bağlantı olarak kullanılmaz. `server/erp/data/` altındaki **koleksiyon dosyaları doğrudan kayıt dizisidir** (`settings.json` tek nesnedir); sürüm, üretim zamanı ve dosya listesi `manifest.json` içinde tutulur. Uygulamanın **Ayarlar → Veri Yönetimi** ekranından alınan tam yedek ise tüm koleksiyonları tek bir JSON nesnesinde birleştirir ve `schemaVersion` alanını taşır.

---

## 1. Varlık Listesi

| # | Varlık (JSON dosyası) | Açıklama | Birincil bağlantılar |
| --- | --- | --- | --- |
| 1 | `settings.json` | Firma, sunucu adresi, tema, para birimi, yedek yolu, bağlantı durumu | — |
| 2 | `units.json` | Birim tanımları (kg, ton, adet, litre, metre) | — |
| 3 | `categories.json` | Kullanıcı tanımlı malzeme kategorileri | parent_id |
| 4 | `materials.json` | Malzeme kartları + anlık stok + kritik eşikler | category_id, unit, supplier_id |
| 5 | `suppliers.json` | Tedarikçi kartları | — |
| 6 | `purchase-orders.json` | Satın alma emirleri ve kalemleri | supplier_id, material_id |
| 7 | `price-history.json` | Her alışta yazılan fiyat kaydı | material_id, supplier_id, order_id |
| 8 | `receipts.json` | Mal kabul kayıtları | order_id, material_id |
| 9 | `crusher.json` | Kırıcı / fire işlemleri | receipt_id, material_id |
| 10 | `movements.json` | Tüm stok hareketleri (tek doğruluk kaynağı) | material_id, source |
| 11 | `furnaces.json` | `machines` içindeki FURNACE/ROTARY kayıtlarının **salt okunur projeksiyonu** (ayrı kart değildir) | machine_id, plant_id |
| 12 | `recipes.json` | Ergitme / döküm / homojenizasyon reçeteleri + adımlar | machine_id, material_id |
| 13 | `lots.json` | Döküm kodu bazlı üretim partileri ve aşama geçmişi | machine_id, recipe_id |
| 14 | `shipments.json` | Sevkiyat, iki kademeli onay, fatura, arşiv | lot_ids, material_id |
| 15 | `notifications.json` | Sistem içi bildirimler | — |
| 16 | `outbox.json` | İnternet bekleyen SMS / e-posta / yedek kuyruğu | — |
| 17 | `users.json` | Kullanıcılar ve roller | — |
| 18 | `activity.json` | Son aktiviteler / denetim özeti | — |
| 19 | `plants.json` | Fabrika profilleri ve çalışma modu (`MANUAL` / `PLC`) | — |
| 20 | `machine-types.json` | Kullanıcı tanımlı makine tipleri | — |
| 21 | `machines.json` | Modüler makine parkı; ilk kurulumda boştur | plant_id, type, plc_id |
| 22 | `casting-paths.json` | Fırın ile döküm tablası arası yollar ve tutma tonajı | from_machine_id, table_id |
| 23 | `plc-connections.json` | Fabrika PLC bağlantıları: IP, protokol, port, tarama çevrimi | plant_id |
| 24 | `plc-tags.json` | Dört temel sinyalin PLC adres eşleştirmesi | plc_id, machine_id |
| 25 | `signal-states.json` | Makine başına son dört sinyal durumu | machine_id, signal |
| 26 | `homogenization-recipes.json` | Homojenizasyon sıcaklık ve süre reçeteleri | alloy |
| 27 | `homogenization-batches.json` | Karışık partiler, çoklu döküm kodu + adet, planlanan/gerçekleşen süre | lot_ids, recipe_id, machine_id |
| 28 | `cooling-batches.json` | Soğutma partileri ve devralınan veri | batch_id |
| 29 | `oil-rules.json` | Parametrik yağ eşikleri ve kesim sayaçları | machine_id |
| 30 | `blade-rules.json` | Bıçak ömrü parametreleri ve sayaçlar | machine_id |
| 31 | `maintenance-events.json` | Yağ dolumu, bıçak değişimi, bakıma gönderme kayıtları | machine_id |
| 32 | `by-product-fates.json` | Yan ürün akıbeti: `remelt`, `recycle`, `sale`, `waste` | material_id |
| 33 | `events.json` | Döküm kodu bazlı olay günlüğü (her aşamadan bir satır) | lot_id, machine_id |
| 34 | `inbox-queue.json` | Arayüzden gelen kuyruk kayıtlarının durum izi | client_id, lot_id |
| 35 | `vendor-updates.json` | Uzaktan güncelleme ve sürüm geçmişi | plant_id |
| 36 | `accounts.json` | Örnek tekdüzen hesap planı (12 hesap) | — |
| 37 | `customers.json` | Müşteri kartı, kredi limiti, cari bakiye, risk | — |
| 38 | `quotations.json` | Satış teklifleri, fiyat ve geçerlilik tarihi | customer_id, sales_order_id |
| 39 | `sales-orders.json` | Sipariş, ton, birim fiyat, rezerve ve sevk edilen ton | customer_id, quotation_id |
| 40 | `purchase-requests.json` | Satın alma talebi, gerekçe, onay izi | material_id, order_id |
| 41 | `purchase-quotes.json` | Tedarikçi teklifi, fiyat, teslim süresi, puan | request_id, supplier_id |
| 42 | `invoices.json` | Alış / satış faturası, net, KDV, brüt, vade, durum | party_id, source_id |
| 43 | `journal-entries.json` | Çift taraflı muhasebe fişi ve satırları | account_id, client_id |
| 44 | `payments.json` | Tahsilat ve ödeme, banka/kasa, fatura ve fiş bağlantısı | party_id, invoice_id, journal_id |
| 45 | `warehouses.json` | Depo lokasyonları, kapasite ve sorumlu | plant_id, keeper_id |
| 46 | `stock-counts.json` | Fiziki sayım, beklenen/sayılan, fark, düzeltme fişi | warehouse_id, material_id, journal_id |
| 47 | `reservations.json` | Satış siparişi ile döküm kodu ve depo bağlantısı | sales_order_id, lot_id, warehouse_id |
| 48 | `cost-records.json` | Döküm kodu bazında beş kalem maliyet ve birim maliyet | lot_id, period |
| 49 | `employees.json` | Personel kartı, kullanıcı ve vardiya eşleşmesi | user_id, shift_id |
| 50 | `shifts.json` | Vardiya, sorumlu, operatörler, devir notu | supervisor_id, operator_ids |
| 51 | `budgets.json` | Dönemsel planlanan ve gerçekleşen bütçe | period, category |
| 52 | `period-closures.json` | Mizan doğrulaması ve dönem kapanış durumu | period |
| 53 | `integration-rules.json` | Tetikleyici ve ürettiği kayıtların matrisi | module_code |
| 54 | `machine-aliases.json` | Eski `F20` / `F35` / `FD` kodlarının makine kimliklerine eşlemesi | machine_id, plant_id |
| 55 | `module-registry.json` | 15 modül: kod, ekran listesi, varsayılan durum, gereksinim | views[] |
| 56 | `plant-modules.json` | Fabrika bazında açık/kapalı modül haritası | plant_id |
| 57 | `setup-drafts.json` | Yarım kalan beş adımlı saha kurulum taslağı | step, values |
| 58 | `adapter-contracts.json` | `simulated` / `opcua` / `modbus` bağlantı sözleşmeleri | capabilities[] |
| 59 | `profile-packages.json` | İndirilebilir fabrika profil paketleri ve doğrulanmış içerikleri | plant_id, payload |

---

## 2. Temel Şemalar

### 2.1 Malzeme kartı

```json
{
  "id": "H02",
  "code": "H02",
  "name": "Alüminyum Hurda",
  "category": "Hammadde",
  "unit": "kg",
  "criticalMin": 5000,
  "criticalMax": 30000,
  "stock": 3200,
  "lastPrice": 62.5,
  "supplierId": "T03",
  "active": true,
  "description": "Profil ve levha hurdası; kırıcıya veya doğrudan üretime"
}
```

> `stock` alanı **türetilmiş** bir alandır: `movements` kayıtlarının toplamından hesaplanır, elle değiştirilmez. JSON arşivine performans için anlık fotoğraf olarak yazılır; doğrulama scripti ikisini karşılaştırır.

### 2.2 Satın alma emri

```json
{
  "id": "SA-004",
  "no": "SA-004",
  "date": "2026-10-28",
  "supplierId": "T01",
  "status": "Mal Kabulde",
  "paymentTerm": "30 gün",
  "notes": "Ekim sonu külçe alımı",
  "items": [
    { "materialId": "H01", "quantity": 10000, "unit": "kg", "unitPrice": 85.2, "receivedQty": 10000 },
    { "materialId": "S01", "quantity": 200, "unit": "adet", "unitPrice": 12.0, "receivedQty": 200 }
  ]
}
```

Durum değerleri: `Taslak`, `Onay Bekliyor`, `Onaylandı`, `Yolda`, `Mal Kabulde`, `Kısmen Tamamlandı`, `Tamamlandı`, `İptal`.

### 2.3 Fiyat geçmişi

```json
{
  "id": "PH-018",
  "materialId": "H01",
  "supplierId": "T01",
  "date": "2026-10-28",
  "unitPrice": 85.2,
  "quantity": 10000,
  "orderNo": "SA-004"
}
```

Grafik bu kayıtlardan üretilir; malzeme kartındaki `lastPrice` en son kaydın kopyasıdır.

### 2.4 Mal kabul

```json
{
  "id": "MK-045",
  "no": "MK-045",
  "date": "2026-11-02",
  "orderId": "SA-003",
  "supplierId": "T03",
  "plate": "34 ABC 123",
  "weighbridgeNo": "TF-2026-0412",
  "receivedBy": "Ahmet Yılmaz",
  "toCrusher": true,
  "status": "Tamamlandı",
  "items": [
    { "materialId": "H02", "orderedQty": 10000, "receivedQty": 10200, "acceptedQty": 10200, "rejectedQty": 0 }
  ]
}
```

Kural: `acceptedQty + rejectedQty = receivedQty`. Stoka yalnızca `acceptedQty` eklenir. `toCrusher: true` ise kırıcı ekranında bekleyen kayıt oluşur.

### 2.5 Kırıcı / fire

```json
{
  "id": "KR-012",
  "date": "2026-11-02",
  "materialId": "H02",
  "unit": "Kırıcı",
  "sourceReceiptId": "MK-045",
  "gross": 10200,
  "waste": 700,
  "net": 9500,
  "wasteRatio": 6.86,
  "wasteReason": "Nemli malzeme",
  "wasteDestination": "Hurda sahası",
  "operator": "Mehmet Kaya"
}
```

Hesap: `net = gross − waste`, `wasteRatio = waste / gross × 100`. `wasteRatio` eşiği aşarsa bildirim üretilir.

### 2.6 Stok hareketi

```json
{
  "id": "MV-1024",
  "at": "2026-11-02T11:15:00+03:00",
  "type": "Fire",
  "materialId": "H02",
  "quantity": -700,
  "source": "Kırıcı",
  "ref": "KR-012",
  "remaining": 9500,
  "userId": "U04",
  "notes": "Nemli malzeme ayıklandı"
}
```

Türler: `Giriş`, `Çıkış`, `Fire`, `Yan Ürün`, `Transfer`, `Düzeltme`. `quantity` işaretlidir; `remaining` işlem sonrası bakiye.

### 2.7 Reçete

```json
{
  "id": "RC-6063-20",
  "type": "Ergitme",
  "name": "6063 / 20 Ton Ocak",
  "alloy": "6063",
  "machineId": "MCH-01",
  "capacityTon": 20,
  "tempC": 750,
  "durationMin": 240,
  "items": [
    { "materialId": "H01", "perTon": 820, "unit": "kg" },
    { "materialId": "H02", "perTon": 160, "unit": "kg" },
    { "materialId": "H03", "perTon": 4.0, "unit": "kg" },
    { "materialId": "H04", "perTon": 2.6, "unit": "kg" }
  ],
  "steps": [
    { "atMin": 120, "label": "Karıştırma yapılacak", "materialId": null, "suggestedQty": 0 },
    { "atMin": 165, "label": "Silisyum ekle", "materialId": "H03", "suggestedQty": 80 },
    { "atMin": 180, "label": "Magnezyum ekle", "materialId": "H04", "suggestedQty": 52 }
  ]
}
```

Reçete bir **öneri** üretir: `önerilen miktar = perTon × fiilî şarj tonajı`. Operatörün girdiği gerçekleşen miktar ayrı kaydedilir ve stok o değer üzerinden düşülür (`docs/01` Bölüm 3.4). Döküm reçeteleri sarf malzemeleri (`filtre`, `tıkaç`, `altibor`), homojenizasyon reçeteleri sıcaklık/süre ve soğutma süresi taşır.

### 2.8 Üretim partisi (döküm kodu)

```json
{
  "id": "DK-2026-0138",
  "code": "DK-2026-0138",
  "alloy": "6063",
  "diameterMm": 178,
  "lengthM": 6.0,
  "billetCount": 84,
  "weightTon": 17.2,
  "machineId": "MCH-01",
  "recipeId": "RC-6063-20",
  "stage": "Testere",
  "status": "Devam ediyor",
  "startedAt": "2026-11-02T06:10:00+03:00",
  "stageStartedAt": "2026-11-02T09:40:00+03:00",
  "paused": false,
  "scrapTon": 0.35,
  "remainingMetalTon": 3.0,
  "remainingDecision": "Ocakta bırakıldı",
  "alerts": [],
  "history": [
    { "stage": "Ergitme", "at": "2026-11-02T06:10:00+03:00" },
    { "stage": "Döküm", "at": "2026-11-02T08:05:00+03:00" },
    { "stage": "Testere", "at": "2026-11-02T09:40:00+03:00" }
  ]
}
```

Aşamalar: `Ergitme`, `Döküm`, `Testere`, `Homojenizasyon`, `Soğutma`, `Paketleme`, `Mamul Stok`, `Sevkiyat`. Her geçiş `history`'e yazılır; `stageStartedAt` sıfırlanır; reçete süresi aşıldıysa bildirim üretilir.

### 2.9 Sevkiyat

```json
{
  "id": "SV-0091",
  "no": "SV-0091",
  "date": "2026-11-02",
  "lotIds": ["DK-2026-0131"],
  "materialId": null,
  "customer": "Anadolu Profil A.Ş.",
  "plate": "34 XYZ 987",
  "weighbridgeKg": 18420,
  "requestedKg": 18400,
  "managerApproved": true,
  "managerBy": "U01",
  "accountingApproved": false,
  "invoiceNo": "",
  "status": "Muhasebe Onayı Bekliyor",
  "archived": false
}
```

Kurallar: stok düşümü **yalnızca** `managerApproved && accountingApproved` olduğunda gerçekleşir; fatura no, müşteri ve plaka ikinci onayda zorunludur; arşiv aylık bazda gruplanır.

### 2.10 Giden kutu (outbox)

```json
{
  "id": "OB-0032",
  "createdAt": "2026-11-02T10:02:00+03:00",
  "channel": "sms",
  "to": "+9053xxxxxxx",
  "subject": "Testere süre aşımı",
  "body": "DK-2026-0138 testere kesimi beklenen süreyi aştı. Bakım kontrolü gerekli.",
  "source": "Üretim / Testere",
  "status": "queued",
  "attempt": 0,
  "nextRetryAt": null,
  "lastError": ""
}
```

`status`: `queued`, `sending`, `sent`, `failed`. `channel`: `sms`, `email`, `cloud_backup`.

---

## 3. Hesap Kuralları

| Hesap | Formül | Nerede kullanılır |
| --- | --- | --- |
| Net hammadde | `brüt − fire` | Kırıcı |
| Fire oranı | `fire / brüt × 100` | Kırıcı, uyarı eşiği |
| Reçete önerisi | `perTon × fiilî şarj tonajı` | Ergitme |
| Stok düşümü | operatörün **gerçekleşen** miktarı | Ergitme, döküm, testere |
| Biyet tonajı | `adet × boy × π × (çap/2)² × özgül ağırlık` | Döküm |
| Kafa kesimi tonajı | `biyet sayısı × 2 × kafa boyu × kesit × özgül ağırlık` | Testere |
| Talaş tonajı | `kesim sayısı × bıçak kalınlığı (3 mm) × kesit × özgül ağırlık` | Testere |
| Fire biyet | `fire biyet boyu × kesit × özgül ağırlık` | Döküm, testere |
| Giren-çıkan farkı | `giren hammadde − (mamul + yan ürün + satılan)` | Raporlar |
| Kritik seviye | `stock < min` → kırmızı; `min ≤ stock < min×1.2` → sarı; `min×1.2 ≤ stock ≤ max` → yeşil; `stock > max` → mavi | Stok |
| Silindir kütlesi | `π × (çap_mm/2000)² × (uzunluk_mm/1000) × yoğunluk × adet` | Kesim Hesap Motoru |
| Kafa kesimi | `silindir(D, kafa_mm, ρ, adet × kafa_adedi)` | Kesim Hesap Motoru |
| Talaş | `silindir(D, bıçak_mm, ρ, kesim_sayısı)` | Kesim Hesap Motoru |
| Net biyet | `dökülen − kafa − talaş − fire_biyet` | Kütle dengesi |
| Kütle zinciri | her olay `balance = önceki_balance + delta` | Olay & Arşiv |
| Yol tutma | `path.holdTon` (1,0 / 1,5 / 2,0 ton) | Döküm Yolları |
| Geometri doğrulama | `|kayıtlı_ton − adet × birim_kütle| / kayıtlı_ton × 100` | Sapma uyarısı |
| Yağ kalan | `100 × (1 − cutsSinceFill / cutsPerTank)` | Yağ & Bakım |
| Bıçak kullanım | `100 × cutsSinceChange / maxCuts` | Yağ & Bakım |
| Homojen sapma | `gerçekleşen_dk − planlanan_dk` | Homojenizasyon Partisi |

Sabitler (alüminyum özgül ağırlığı, bıçak kalınlığı, yolluk/filtre artığı) **ayarlarda malzeme/ocak bazında tanımlanır**, koda gömülmez.

---

## 4. API Uçları (Faz 1+ sözleşmesi)

| Yöntem | Uç | Görev |
| --- | --- | --- |
| POST | `/api/auth/login` | JWT + rol |
| GET/PUT | `/api/settings` | Bağlantı, tema, eşikler, yedek yolu |
| CRUD | `/api/materials`, `/api/categories`, `/api/units`, `/api/suppliers` | Değişken tanımlar |
| GET/POST | `/api/purchase-orders` | Emir oluşturma, durum değişimi |
| GET | `/api/price-history?materialId=&from=&to=` | Fiyat grafiği verisi |
| POST | `/api/receipts` | Mal kabul → stok giriş hareketi |
| POST | `/api/crusher` | Brüt/fire/net → fire ve yan ürün hareketi |
| GET | `/api/stock` | Anlık bakiyeler + kritik durum |
| GET | `/api/movements?materialId=&type=&from=` | Hareket logu |
| CRUD | `/api/machines`, `/api/machine-types`, `/api/recipes` | Makine parkı (tek kaynak) ve reçeteler; `/api/furnaces` salt okunur projeksiyondur |
| POST | `/api/machines/:id/decommission`, `/api/machines/:id/recommission` | Bağımlılık raporu, gerekçe, devre dışı bırakma ve geri alma; kayıt silinmez |
| POST | `/api/lots`, `PATCH /api/lots/:id/stage` | Döküm kodu, aşama geçişi, süre/uyarıları |
| POST | `/api/lots/:id/consumption` | Gerçekleşen miktar → stok düşümü |
| POST | `/api/shipments`, `/api/shipments/:id/approve` | İki kademeli onay, stok düşümü, arşiv |
| GET | `/api/reports/:type?period=` | Üretim, tüketim, giren-çıkan |
| GET/POST | `/api/notifications`, `/api/outbox`, `/api/outbox/flush` | Bildirim ve kuyruk |
| POST | `/api/backup`, `GET /api/backup/status` | Yedekleme ve sağlık kontrolü |
| GET | `/api/audit` | Denetim logu |
| GET/POST | `/api/plant-profiles` | Fabrika profil paketini indir / doğrula / içe al; `furnaceCount` ile kopyala |
| GET/PUT | `/api/plant-modules?plantId=` | Fabrika bazında modül açık/kapalı haritası |
| GET | `/api/module-registry`, `/api/adapter-contracts` | Modül ve bağlantı adaptörü kayıtları |
| POST | `/api/adapters/:code/test` | `connect / test / readFourSignals / disconnect` sözleşmesi; sürücü yoksa `MANUAL` yedeği |
| POST | `/api/edge/ingest` | Fabrikadaki exe ajanının **tek yazma ucu**: imzalı `edge-batch`, `readings[]` + `events[]`, `clientId` ile idempotent (`docs/13`) |

Tüm yazma uçları idempotent `client_id` kabul eder; çevrimdışı istemcinin tekrar gönderimi çift kayıt oluşturmaz.

---

## 5. Ekran Envanteri (prototipteki karşılığı)

| # | Ekran | Menü grubu | Veri kaynağı | Öne çıkan etkileşim |
| --- | --- | --- | --- | --- |
| 1 | Panel | Genel | tümü | KPI kartları, üretim eğrisi, kritik stok, son hareketler, kuyruk durumu |
| 2 | Malzeme Tanımları | Satın Alma | materials, categories | Ekle/düzenle/sil, arama, kategori filtresi |
| 3 | Satın Alma Emirleri | Satın Alma | purchase_orders | Dinamik kalemler, fiyat girişi, durum akışı |
| 4 | Fiyat Takibi | Satın Alma | price_history | SVG çizgi grafik, tedarikçi karşılaştırması, değişim yüzdesi |
| 5 | Tedarikçiler | Satın Alma | suppliers | CRUD, geçmiş alışlar |
| 6 | Stok Durumu | Hammadde & Stok | materials, movements | Renk kodlu tablo, detay modalı, son 30 gün eğrisi |
| 7 | Mal Kabul | Hammadde & Stok | receipts, orders | Emirden doldurma, kabul/red doğrulaması, stok girişi |
| 8 | Kırıcı & Fire | Hammadde & Stok | crusher | Otomatik net/oran, fire nedeni, uyarı |
| 9 | Stok Hareketleri | Hammadde & Stok | movements | Tarih/tür/malzeme filtresi, CSV çıktı |
| 10 | Üretim Akışı | Üretim | lots, machines | **Sürükle-bırak** aşama taşıma, start/finish, alarm, fire ekleme |
| 11 | Reçeteler | Üretim | recipes | Ergitme/döküm/homojenizasyon sekmeleri, adım listesi |
| 12 | Sevkiyat & Onaylar | Sevkiyat | shipments, lots | Kantar, yönetici onayı, muhasebe onayı, stok düşümü |
| 13 | Arşiv | Sevkiyat | shipments | Aylık gruplama, fatura/plaka/döküm kodu sorgusu |
| 14 | Raporlar & İstatistik | Raporlama | tümü | Dönem seçimi, üretim/tüketim grafikleri, giren-çıkan, yazdır/CSV |
| 15 | Bildirimler & Kuyruk | Sistem | notifications, outbox | Çevrimiçi/çevrimdışı anahtarı, kuyruğu boşaltma, mesaj oluşturma |
| 16 | Ayarlar | Sistem | settings, users | Roller, sunucu adresi, yedek yolu, JSON içe/dışa aktarma, tema, demo sıfırlama |
| 17 | Makine Parkı | Makine & Kurulum | plants, machineTypes, machines | Boş başlangıç, fabrika profili seçimi, makine ekleme, bağımlılık raporlu devre dışı bırakma ve geri alma |
| 18 | Döküm Yolları | Makine & Kurulum | castingPaths, machines | Kısa/uzun yol, 1,0 / 1,5 / 2,0 ton tutma parametresi |
| 19 | Kesim Hesap Motoru | Makine & Kurulum | calc.js, lots, byProductFates | 6300/6000/300/3 mm canlı hesap, kafa ve talaş ayrımı, geometri sapması |
| 20 | Yağ & Bakım | Makine & Kurulum | oilRules, bladeRules, maintenanceEvents | Parametrik eşikler, sayaçlar, dolum/değişim kaydı, uyarı |
| 21 | Homojenizasyon Partisi | Üretim | homogenizationBatches, recipes | Çoklu döküm kodu + adet, reçete, start, 8/9 saat sapması |
| 22 | Olay & Arşiv | Üretim | events, inboxQueue | 21/18/17/14 ton zinciri satır satır, bakiye ve akıbet |
| 23 | PLC Durum | Makine & Kurulum | signalStates, plcTags | Yalnızca dört sinyal, demo değerleriyle; tag adresleri görünmez |
| 24 | Merkezi Yönetim | Yönetim | plants, plcConnections, plcTags, vendorUpdates | Firma/IP/protokol eşleştirme, güncelleme geçmişi, geliştirici ekranı |
| 33 | Saha Kurulum Sihirbazı | Yönetim | setupDrafts, plants, machines, castingPaths, moduleRegistry | Beş adım: fabrika, makine parkı, yollar, bağlantı testi, modüller; profil indir / kopyala / içe al |
| 34 | Modül Kaydı | Yönetim | moduleRegistry, plantModules, NAV | Fabrika bazında modül aç/kapat, gereksinimler ve menü önizlemesi |
| 25 | Talep & Teklif Akışı | Satın Alma | purchaseRequests, purchaseQuotes | Talep onayı, teklif karşılaştırması, seçilen tekliften emir ve fiyat geçmişi |
| 26 | Satış Siparişleri | Ticari & Finans | salesOrders, quotations, customers | Kredi kontrolü, otomatik rezervasyon, kısmi sevk |
| 27 | Müşteriler & Cari | Ticari & Finans | customers, payments | Limit kullanımı, risk, tahsilat ve beraberinde muhasebe fişi |
| 28 | Muhasebe & Fişler | Ticari & Finans | accounts, journalEntries, invoices, payments | Mizan, fiş satırları, alış faturası ve fiş yazımı, dönem kapanışı |
| 29 | Maliyet & Kârlılık | Ticari & Finans | costRecords, budgets, salesOrders | Beş kalem maliyet, birim maliyet, brüt kâr, bütçe sapması, çapraz KPI |
| 30 | Depo, Rezervasyon & Sayım | Depolama & Personel | warehouses, reservations, stockCounts | Lokasyonlar, rezervasyon serbest bırakma, sayım farkı ve düzeltme fişi |
| 31 | Personel & Vardiya | Depolama & Personel | employees, shifts, events | Vardiya ataması, gece vardiyası, olay-operatör izi; bordro hariç |
| 32 | Entegrasyon Matrisi | Entegrasyon | integrationRules, tüm koleksiyonlar | Tek düğmeyle onaylı sevkiyattan sekiz koleksiyona atomik yazım |

---

## 6. Dosya Düzeni ve Senkronizasyon

- `server/erp/data/*.json` → sunucu arşivi, `schema_version` ile sürümlü.
- `app/js/seed.js` → prototipin demo verisi; `node tools/export_seed.mjs` komutuyla JSON arşivini üretir (tek kaynak).
- `server/erp/scripts/validate_data.py` → JSON şemalarını ve referans bütünlüğünü doğrular; `movements` toplamı ile `materials.stock` farkını bilgilendirici uyarı olarak raporlar.
- `server/erp/scripts/backup.py` → anlık görüntü + harici disk kopyası + checksum + saklama temizliği.
- `server/erp/scripts/outbox_worker.py` → internet varken `queued` kayıtları SMS/SMTP'ye iletir, başarısızlığı yeniden dener.
- `tools/build_docx.py` → tüm dokümanlardan tek Word dosyası üretir.
- `app/js/calc.js` → geometrik kütle, kütle dengesi, yağ/bıçak ve homojenizasyon formüllerinin tek modülü.
- `server/erp/inbox/` → HTML arayüzünün yazdığı olay kuyruğu (`pending`, `processing`, `processed`, `dead-letter`).
- `server/erp/archive/YYYY/MM/{döküm kodu}/events.jsonl` → append-only olay günlüğü ve `snapshot.json`.
- `server/erp/scripts/event_worker.py` → kuyruğu 1–3 saniyede tarar, hesaplar, arşive yazar, doğrular, sonra arşivler (silmez).
- `server/erp/scripts/plc_poller.py` → dört sinyali demo olarak üreten opsiyonel simülatör; gerçek sürücü sonraki aşamadadır.

**Senkronizasyon ilkesi:** prototip tarayıcıda `localStorage` kullanır; gerçek kurulumda bu katman IndexedDB + senkronizasyon kuyruğuna, sunucu tarafı ise işlemsel veritabanına geçer. Ekran kodunun veri erişim katmanı dışında değişmesi gerekmez.


---

## 7. Olay Satırı ve Kuyruk Şemaları

`events.json` koleksiyonundaki her kayıt, bir döküm kodunun yaşam döngüsündeki **tek bir adımı** temsil eder. Üzerine yazılmaz, satır silinmez; düzeltme gerekiyorsa ters işlem içeren yeni bir olay eklenir.

| Alan | Açıklama |
| --- | --- |
| `id`, `seq` | Olay kimliği ve döküm kodu içindeki artan sıra |
| `lotId`, `plantId`, `machineId` | İzlenebilirlik bağlantıları |
| `type` | `CAST_START`, `TRANSFER`, `PATH_HOLD`, `CAST_NET`, `HEAD_CUT`, `SAWDUST`, `SCRAP_BILLET`, `NET_BILLET`, `HOMOGEN_START`, `HOMOGEN_OVERRUN`, `HOMOGEN_END`, `COOLING_END`, `SHIPMENT`, `SIGNAL_*`, `MAINTENANCE`, `GEOMETRY_MISMATCH` |
| `at`, `actor`, `source` | ISO 8601 zaman, aktör, kaynak (`MANUAL`, `PLC`, `WORKER`, `IMPORT`) |
| `grossTon`, `deltaTon`, `balanceTon` | İşlem öncesi, değişim ve sonraki bakiye; birim alanıyla birlikte |
| `materialId`, `fate` | İlgili malzeme ve akıbeti |
| `payload`, `ref`, `note` | Ölçümler, belge referansı, açıklama |
| `clientId`, `checksum` | Idempotency anahtarı ve satır sağlama toplamı |

`inbox-queue.json` kayıtları `clientId`, `type`, `lotId`, `createdAt`, `source`, `payload`, `schemaVersion`, `status`, `retryCount`, `lastError` alanlarını taşır. Aynı `clientId` ikinci kez gelirse olay çift yazılmaz. Kuyruk ile arşivin ayrı klasörlerde tutulması ve silme yerine doğrulama kuralı `docs/09` içinde ayrıntılıdır.

**Şema sürümü:** saha görüşmesiyle gelen 17 yeni koleksiyon ve olay alanları `schemaVersion: 2`, genel ERP karşılaştırmasıyla gelen 18 ticari/finansal koleksiyon `schemaVersion: 3`, modüler saha kurulumuyla gelen 6 koleksiyon `schemaVersion: 4` ile işaretlenir. `manifest.json` içindeki `schema_version` değeri `node tools/export_seed.mjs` ile otomatik güncellenir. Yerel depolama anahtarı `erp_demo_state_v4`, çevrimdışı önbellek `erp-studio-v4` biçiminde sürüme bağlıdır; eski şemanın yeni koleksiyonlar olmadan yüklenmesi engellenir.

---

## 8. Ticari ve Finansal Şemalar (`schemaVersion: 3`)

`docs/11` ile eklenen kayıtların zorunlu alanları aşağıdadır. Tüm tutarlar para birimiyle birlikte, tüm tarihler ISO 8601 ile yazılır.

| Kayıt | Alanlar | Kural |
| --- | --- | --- |
| Hesap (`accounts`) | `id`, `code`, `name`, `type`, `normal`, `active` | `code` benzersiz; fiş satırları bu ID'ye bağlanır |
| Müşteri (`customers`) | `id`, `code`, `name`, `tax`, `paymentTerm`, `creditLimit`, `balance`, `risk` | `balance` limiti aşarsa sipariş kredi onayına düşer |
| Fatura (`invoices`) | `id`, `no`, `direction`, `partyType`, `partyId`, `date`, `net`, `vatRate`, `vat`, `gross`, `status`, `period` | `vat = net × vatRate / 100`, `gross = net + vat` |
| Muhasebe fişi (`journalEntries`) | `id`, `no`, `date`, `period`, `lines[]`, `totalDebit`, `totalCredit`, `balanced`, `clientId` | Borç = alacak; `clientId` benzersiz; satır silinmez |
| Fiş satırı | `accountId`, `accountCode`, `debit`, `credit`, `note` | Her satırda borç veya alacaktan biri sıfırdır |
| Ödeme (`payments`) | `id`, `kind`, `partyId`, `date`, `amount`, `method`, `invoiceId`, `journalId` | Tahsilat alacağı azaltır, ödeme borcu azaltır |
| Maliyet (`costRecords`) | `lotId`, `period`, `netTon`, beş maliyet kalemi, `totalCost`, `unitCostPerTon`, `unitCostPerKg` | Kalemler toplamı `totalCost` ile aynı; birim maliyet toplam / net ton |
| Sayım (`stockCounts`) | `warehouseId`, `materialId`, `expectedKg`, `countedKg`, `differenceKg`, `status`, `journalId` | `differenceKg = countedKg − expectedKg` |
| Rezervasyon (`reservations`) | `salesOrderId`, `lotId`, `warehouseId`, `ton`, `status` | `lotId` döküm koduna veya `—` değerine bağlıdır |
| Entegrasyon kuralı (`integrationRules`) | `trigger`, `module`, `moduleCode`, `produces[]`, `accountEffect`, `autoPost`, `requiresApproval` | `produces` boş olamaz; `moduleCode` kayıtlı bir modüle bağlıdır |

## 9. Tek Kayıt, Çok Etki Kuralları

`app/js/posting.js` saf hesap modülüdür; DOM veya depolama bilgisi içermez. Dışa açtığı başlıca işlevler `amounts`, `buildEntry`, `salesEntry`, `purchaseEntry`, `trialBalance`, `isBalanced`, `lotCost`, `salesMargin`, `creditCheck`, `kpiSnapshot` ve `postingEffects` işlevleridir.

| Tetikleyici | Üretilen kayıtlar | Hesap etkisi |
| --- | --- | --- |
| Satış siparişi onayı | Rezervasyon, kredi kontrolü, cari hareket | Henüz fiş yok |
| İki kademeli sevkiyat onayı | Stok çıkışı, satış faturası, fiş, cari bakiye, maliyet, olay, bildirim, giden kutu | 120 borç, 600 ve 391 alacak |
| Mal kabul | Stok girişi, fiyat geçmişi, emir durumu, olay | Fatura gelene kadar bekler |
| Alış faturası | Fiş, satıcı cari, ödeme vadesi, bütçe gerçekleşen | 150 ve 191 borç, 320 alacak |
| Talep onayı ve teklif seçimi | Teklif çağrısı, satın alma emri, fiyat geçmişi, talep durumu | Yok |
| Üretim olayı (`NET_BILLET`) | Yan ürün, mamul stok, döküm kodu maliyeti, olay | 730 borç, 150 alacak |
| Fiziki sayım farkı | Düzeltme hareketi, düzeltme fişi, denetim izi | 153 borç, 730 alacak |
| Tahsilat / ödeme | Cari bakiye, banka hareketi, fiş | 102 borç, 120 alacak |
| Dönem kapanışı | Mizan kontrolü, bütçe sapması, yönetim raporu, arşiv | Borç = alacak doğrulaması |

Bütün kurallar `integrationRules` koleksiyonunda veri olarak da tutulur; kod ile veri kopyası `tools/smoke_test.mjs` tarafından karşılaştırılır. `validate_data.py` fiş dengesini, KDV tutarlarını, maliyet toplamlarını, sayım farkını ve dönem kapanış koşulunu da doğrular. Ayrıntılı gerekçe ve kapsam dışı kararlar `docs/11` içindedir.

## 10. Modüler Saha Kurulumu Şemaları (`schemaVersion: 4`)

`docs/12` ile gelen kayıtların zorunlu alanları ve kuralları aşağıdadır. Bu şemaların tamamı `app/js/modularity.js` ve `app/js/adapters.js` içinde saf işlevlerle doğrulanır.

| Kayıt | Alanlar | Kural |
| --- | --- | --- |
| Makine (`machines`) | `id`, `plantId`, `type`, `name`, `capacityTon`, `mode`, `plcId`, `active`, `status`, `decommissionedAt`, `decommissionReason`, `installedAt` | Tek kaynak; devre dışı makine silinmez, `active: false` ve gerekçe zorunludur |
| Ocak projeksiyonu (`furnaces`) | `id`, `code`, `name`, `capacityTon`, `type`, `rotary`, `status`, `machineId`, `plantId` | Kimlik kümesi `machines` içindeki FURNACE/ROTARY kümesine eşit olmalıdır |
| Eski kod (`machineAliases`) | `id`, `legacyCode`, `machineId`, `plantId`, `note` | Yalnızca uyumluluk köprüsü; hedef makine ve fabrika var olmalıdır |
| Modül (`moduleRegistry`) | `id`, `code`, `label`, `group`, `views[]`, `defaultEnabled`, `requiresMachineType`, `requiresMode`, `note` | 34 ekranın tamamı bir modüle bağlıdır; kod benzersizdir |
| Fabrika modül haritası (`plantModules`) | `id`, `plantId`, `enabled{}`, `note` | `enabled` anahtarları kayıtlı modül kodlarıdır; `CORE` ve `VENDOR` açıktır |
| Kurulum taslağı (`setupDrafts`) | `id`, `step`, `values{counts, defaultCapacity, mode, connection, modules, lastTest}`, `updatedAt` | `step` 1–5 arası; her adım kaydedilir |
| Adaptör (`adapterContracts`) | `id`, `code`, `label`, `protocol`, `implemented`, `capabilities[]`, `note` | Dört yetenek zorunludur; sürücü yoksa `MANUAL` yedeğe düşülür |
| Profil paketi (`profilePackages.payload`) | `kind`, `packageVersion`, `schemaVersion`, `plant`, `machineTypes`, `machines`, `castingPaths`, `plcConnections`, `plcTags`, eşikler, `plantModules`, `moduleRegistry` | `kind` ve şema sürümü doğrulanır; her yol paket içindeki makinelere bağlıdır |

**Sabit kod yasağı.** Ekran kodunda fabrika veya makine kimliği yazılmaz. Aktif fabrika `activePlantId()`, aktif makine `machinesOfType()` ve `firstMachineId()` yardımcı işlevlerinden gelir. Duman testi 1 ve 2 fırınlı profilleri, bağımlılık raporunu, geri almayı, modül filtresini ve adaptör yedeğini doğrular; veri doğrulayıcı 58 koleksiyonda projeksiyon ve referans bütünlüğünü denetler.

## 11. Edge Ajanının Yerel SQL Şeması (`docs/13`)

`docs/13` ile gelen ajan, ERP koleksiyonlarından **ayrı** bir yerel SQLite veritabanı (`edge/data/edge.db`, WAL) tutar. Bu, aynı verinin iki yerde tutulması değildir: saha bilgisayarında ham okuma ve gönderim kuyruğu, sunucuda doğrulanmış işletme kaydı vardır.

| Tablo | Alanlar | Kural |
| --- | --- | --- |
| `readings` | `client_id`, `at`, `plant_id`, `machine_id`, `tag_id`, `kind`, `signal`, `value_num`, `value_text`, `unit`, `quality`, `source`, `adapter`, `raw` | `client_id` benzersiz; `kind` = `signal` veya `telemetry`; dört sinyal + sıcaklık ölçümü |
| `events` | `client_id`, `at`, `machine_id`, `signal`, `kind`, `previous`, `current`, `severity`, `note` | `STATE_CHANGE` / `THRESHOLD` / `DRIVER_FALLBACK`; silinmez |
| `outbox` | `client_id`, `batch_id`, `endpoint`, `payload_json`, `status`, `attempts`, `next_attempt_at`, `last_error` | `queued → sending → sent / failed → dead`; hiçbir satır silinmez |
| `runs` | `at`, `duration_ms`, `tag_count`, `reading_count`, `event_count`, `adapter`, `errors` | Her tarama döngüsünün izi |
| `app_log` | `at`, `level`, `source`, `message` | Ajan günlüğü |

**Kalite ayrımı.** `quality` alanı `GOOD`, `SIMULATED`, `STALE`, `BAD` alır; gerçek sürücü takılı değilken üretilen veri `SIMULATED` olarak işaretlenir ve sahada ölçülmüş gibi raporlanmaz. **Sıcaklık beşinci kontrol sinyali değildir**: `docs/08` Bölüm 4'teki dört sinyal (`door`, `casting`, `alarm`, `running`) değişmez, ölçümler `telemetry` kategorisinde ayrı tutulur. Bağlantı, imza, çevrimdışı kuyruk ve exe üretimi `docs/13` içindedir.
