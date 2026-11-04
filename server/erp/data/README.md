# JSON Arşivi

Bu klasör, uygulamanın *"kendi anlayacağı dilde alıp görsel ekranda gösterdiği"* veridir. Prototipteki `app/js/seed.js` tek kaynaktır; dosyalar şu komutla yeniden üretilir:

```bash
node tools/export_seed.mjs
```

## Dosyalar

| Dosya | İçerik |
| --- | --- |
| `manifest.json` | `schema_version`, `generated_at`, kaynak, aşama/kategori listeleri ve dosya envanteri |
| `settings.json` | Firma, sunucu adresi, eşikler, tema, yedek yolu, bağlantı durumu (tek nesne) |
| `units.json` | Birim tanımları (dize dizisi) |
| `categories.json` | Kullanıcı tanımlı malzeme kategorileri |
| `materials.json` | Malzeme kartları, anlık stok fotoğrafı, kritik eşikler, son fiyat |
| `suppliers.json` | Tedarikçi kartları |
| `purchase-orders.json` | Satın alma emirleri ve kalemleri |
| `price-history.json` | Her alışta yazılan fiyat kaydı |
| `receipts.json` | Mal kabul kayıtları |
| `crusher.json` | Kırıcı / fire işlemleri |
| `movements.json` | Tüm stok hareketleri (tek doğruluk kaynağı) |
| `furnaces.json` | Ocak tanımları |
| `recipes.json` | Ergitme / döküm / homojenizasyon reçeteleri ve zamanlı adımlar |
| `lots.json` | Döküm kodu bazlı üretim partileri ve aşama geçmişi |
| `shipments.json` | İki kademeli onay, kantar, fatura, arşiv |
| `notifications.json` | Sistem içi bildirimler |
| `outbox.json` | İnternet bekleyen SMS / e-posta / bulut yedek kuyruğu |
| `users.json` | Kullanıcılar ve roller |
| `activity.json` | Son aktiviteler / denetim özeti |
| `plants.json` | Fabrika profilleri ve `MANUAL` / `PLC` çalışma modu |
| `machine-types.json`, `machines.json` | Modüler makine tipleri ve boş başlangıçtan eklenen makine parkı |
| `casting-paths.json` | Fırın–tabla yolları ve yollukta tutulan 1 / 1,5 / 2 ton |
| `plc-connections.json`, `plc-tags.json`, `signal-states.json` | Merkezi PLC eşleştirmesi ve yalnızca dört sinyal |
| `homogenization-recipes.json`, `homogenization-batches.json`, `cooling-batches.json` | Karışık partiler, 8/9 saat sapması, soğutma |
| `oil-rules.json`, `blade-rules.json`, `maintenance-events.json` | Parametrik yağ/bıçak eşikleri ve bakım kayıtları |
| `by-product-fates.json` | Kafa `remelt`, talaş `sale`, yolluk `recycle` ayrımı |
| `events.json`, `inbox-queue.json` | Döküm kodu bazlı olay günlüğü ve kuyruk durum izi |
| `vendor-updates.json` | Uzaktan güncelleme ve sürüm geçmişi |
| `accounts.json` | 12 hesaplı örnek tekdüzen hesap planı |
| `customers.json`, `quotations.json`, `sales-orders.json` | Müşteri/cari, satış teklifi, sipariş ve kredi limiti |
| `purchase-requests.json`, `purchase-quotes.json` | Satın alma talebi, onay ve tedarikçi teklifi |
| `invoices.json`, `journal-entries.json`, `payments.json` | Fatura, çift taraflı muhasebe fişi, tahsilat/ödeme |
| `warehouses.json`, `stock-counts.json`, `reservations.json` | Depo lokasyonu, fiziki sayım, rezervasyon |
| `cost-records.json`, `budgets.json`, `period-closures.json` | Döküm kodu maliyeti, bütçe, dönem kapanışı |
| `employees.json`, `shifts.json` | Personel ve vardiya (bordro bu sistemde değil) |
| `integration-rules.json` | Tetikleyici ve ürettiği kayıtların matrisi (`docs/11`) |

## Kurallar

- Tarih/saat: ISO 8601, örn. `2026-11-02T09:30:00+03:00`.
- Ondalık ayırıcı nokta; miktar `quantity` + `unit` ikilisiyle yazılır.
- Tüm bağlantılar **ID** iledir; malzeme adı değişse geçmiş kayıtlar bozulmaz.
- Stok bakiyesi JSON'da anlık fotoğraftır; gerçek kurulumda `movements` kayıtlarından türetilir.
- `schemaVersion: 3` ile saha görüşmesi (17) ve genel ERP karşılaştırması (18) koleksiyonları eklenmiştir; toplam 53 dosya, 52 koleksiyon dizisi ve 1 `settings.json` nesnesi vardır; olayların **kalıcı** hâli `../archive/YYYY/MM/{döküm kodu}/events.jsonl` içindedir, `events.json` prototipin okuma görünümüdür.
- Olay satırı silinmez, üzerine yazılmaz; düzeltme ters işlem içeren yeni satır olarak eklenir.
- Muhasebe fişinde borç toplamı alacak toplamına eşittir; `clientId` benzersizdir; düzeltme ters fişle yapılır.
- Faturada `vat = net × vatRate / 100` ve `gross = net + vat`; maliyette beş kalem toplamı `totalCost` ile aynıdır.
- Sayım farkı `countedKg − expectedKg` değeridir; onaylanan fark düzeltme fişine bağlanır.
- `schemaVersion` değiştiğinde yerel depolama anahtarı da değişir; eski şema yeni koleksiyonlar olmadan yüklenmez.
- UTF-8, girintili (2 boşluk) JSON; dosya sonunda satır sonu vardır.

Bütünlük kontrolü: `python3 server/erp/scripts/validate_data.py` (52 koleksiyon + `settings`, mizan ve finansal kurallar dahil)
