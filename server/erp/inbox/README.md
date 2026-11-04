# `inbox/` — İşlem Kuyruğu

HTML arayüzünün **yazdığı** yerdir. Arayüz JSON dosyalarını yalnızca okur; bir kayıt oluşturacağı zaman buraya yeni bir dosya bırakır. Bu ayrım saha görüşmesinde "bizim JSON'larımız HTML'leri sadece okumak için, veri yazacaksa da bir şeye yazacak" denerek netleştirilmiştir.

| Klasör | Anlamı |
| --- | --- |
| `inbox/*.json` | `pending` — worker'ın almasını bekleyen kayıtlar |
| `inbox/processing/` | Worker atomik olarak sahiplendiği kayıt |
| `inbox/processed/` | Arşive yazıldığı doğrulandıktan sonra `archived` durumuna geçen kayıt |
| `inbox/dead-letter/` | Hatalı kayıt; `retryCount` ve `lastError` ile saklanır |
| `inbox/examples/` | Belgelenmiş örnek kayıtlar (sürüm kontrolünde tutulur) |

**Silinmez.** Konuşmada "oku, hesapla, sonra sil" denmişti; elektrik kesintisinde üretim kaydı kaybolacağı için bu düzeltilmiştir. Sıra: `pending` → `processing` → arşive yaz + `fsync` + SHA-256 → `archived` → `processed/`. Hata olursa `dead-letter/`. Ayrıntı `docs/09`.

## Kayıt şeması

| Alan | Açıklama |
| --- | --- |
| `clientId` | İstemci anahtarı; aynı değer iki kez gelirse olay çift yazılmaz |
| `type` | Üretilecek olay türü (`CUT_BATCH`, `HOMOGEN_START`, `CAST_START`, `SIGNAL_*` …) |
| `lotId` | Döküm kodu |
| `plantId`, `machineId`, `ref` | İzlenebilirlik bağlantıları |
| `createdAt` | ISO 8601, saat dilimiyle |
| `source` | `HTML`, `HMI`, `PLC` |
| `schemaVersion` | Şema sürümü (şu an 2) |
| `payload` | Form verisi / ölçümler |

## Çalıştırma

```bash
python3 server/erp/scripts/event_worker.py --dry-run       # örnekleri raporlar, dosya taşımaz
python3 server/erp/scripts/event_worker.py --once          # tek tur, gerçekten arşivler
python3 server/erp/scripts/event_worker.py --loop --interval 3
```

`--dry-run` kuyruk boşsa `examples/` altındaki örnekleri kullanır. Worker 1–3 saniyelik tarama çevrimiyle çalışır; arayüzdeki "Kaydediliyor…" bekleme mesajı bu aralığa karşılık gelir.
