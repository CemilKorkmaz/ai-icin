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

## Kurallar

- Tarih/saat: ISO 8601, örn. `2026-11-02T09:30:00+03:00`.
- Ondalık ayırıcı nokta; miktar `quantity` + `unit` ikilisiyle yazılır.
- Tüm bağlantılar **ID** iledir; malzeme adı değişse geçmiş kayıtlar bozulmaz.
- Stok bakiyesi JSON'da anlık fotoğraftır; gerçek kurulumda `movements` kayıtlarından türetilir.
- UTF-8, girintili (2 boşluk) JSON; dosya sonunda satır sonu vardır.

Bütünlük kontrolü: `python3 server/erp/scripts/validate_data.py`
