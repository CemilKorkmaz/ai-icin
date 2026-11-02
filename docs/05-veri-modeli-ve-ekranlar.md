# 05 — Veri Modeli, API Sözleşmesi ve Ekran Envanteri

**Amaç:** `docs/01`–`docs/04` arasında tarif edilen işlevlerin somut veri karşılıklarını, hesap kurallarını ve prototipteki ekranların envanterini vermek. Bu doküman, Faz 1 geliştirmesinde API sözleşmesi olarak kullanılır.

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
| 11 | `furnaces.json` | Ocak tanımları (kapasite, tip, döner ocak) | — |
| 12 | `recipes.json` | Ergitme / döküm / homojenizasyon reçeteleri + adımlar | furnace_id, material_id |
| 13 | `lots.json` | Döküm kodu bazlı üretim partileri ve aşama geçmişi | furnace_id, recipe_id |
| 14 | `shipments.json` | Sevkiyat, iki kademeli onay, fatura, arşiv | lot_ids, material_id |
| 15 | `notifications.json` | Sistem içi bildirimler | — |
| 16 | `outbox.json` | İnternet bekleyen SMS / e-posta / yedek kuyruğu | — |
| 17 | `users.json` | Kullanıcılar ve roller | — |
| 18 | `activity.json` | Son aktiviteler / denetim özeti | — |

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
  "furnaceId": "F20",
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
  "furnaceId": "F20",
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
| CRUD | `/api/furnaces`, `/api/recipes` | Ocak ve reçeteler |
| POST | `/api/lots`, `PATCH /api/lots/:id/stage` | Döküm kodu, aşama geçişi, süre/uyarıları |
| POST | `/api/lots/:id/consumption` | Gerçekleşen miktar → stok düşümü |
| POST | `/api/shipments`, `/api/shipments/:id/approve` | İki kademeli onay, stok düşümü, arşiv |
| GET | `/api/reports/:type?period=` | Üretim, tüketim, giren-çıkan |
| GET/POST | `/api/notifications`, `/api/outbox`, `/api/outbox/flush` | Bildirim ve kuyruk |
| POST | `/api/backup`, `GET /api/backup/status` | Yedekleme ve sağlık kontrolü |
| GET | `/api/audit` | Denetim logu |

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
| 10 | Üretim Akışı | Üretim | lots, furnaces | **Sürükle-bırak** aşama taşıma, start/finish, alarm, fire ekleme |
| 11 | Reçeteler | Üretim | recipes | Ergitme/döküm/homojenizasyon sekmeleri, adım listesi |
| 12 | Sevkiyat & Onaylar | Sevkiyat | shipments, lots | Kantar, yönetici onayı, muhasebe onayı, stok düşümü |
| 13 | Arşiv | Sevkiyat | shipments | Aylık gruplama, fatura/plaka/döküm kodu sorgusu |
| 14 | Raporlar & İstatistik | Raporlama | tümü | Dönem seçimi, üretim/tüketim grafikleri, giren-çıkan, yazdır/CSV |
| 15 | Bildirimler & Kuyruk | Sistem | notifications, outbox | Çevrimiçi/çevrimdışı anahtarı, kuyruğu boşaltma, mesaj oluşturma |
| 16 | Ayarlar | Sistem | settings, users | Roller, sunucu adresi, yedek yolu, JSON içe/dışa aktarma, tema, demo sıfırlama |

---

## 6. Dosya Düzeni ve Senkronizasyon

- `server/erp/data/*.json` → sunucu arşivi, `schema_version` ile sürümlü.
- `app/js/seed.js` → prototipin demo verisi; `node tools/export_seed.mjs` komutuyla JSON arşivini üretir (tek kaynak).
- `server/erp/scripts/validate_data.py` → JSON şemalarını ve referans bütünlüğünü doğrular; `movements` toplamı ile `materials.stock` farkını bilgilendirici uyarı olarak raporlar.
- `server/erp/scripts/backup.py` → anlık görüntü + harici disk kopyası + checksum + saklama temizliği.
- `server/erp/scripts/outbox_worker.py` → internet varken `queued` kayıtları SMS/SMTP'ye iletir, başarısızlığı yeniden dener.
- `tools/build_docx.py` → tüm dokümanlardan tek Word dosyası üretir.

**Senkronizasyon ilkesi:** prototip tarayıcıda `localStorage` kullanır; gerçek kurulumda bu katman IndexedDB + senkronizasyon kuyruğuna, sunucu tarafı ise işlemsel veritabanına geçer. Ekran kodunun veri erişim katmanı dışında değişmesi gerekmez.
