# Simülasyon Köprüsü — ERP Studio'yu fırın simülasyonuna bağlar

Bu klasör, kullanıcının `erp_backend` / `erp_simulation` olarak çalıştırdığı fırın simülasyonunu ERP Studio'ya bağlar. Amaç, gerçek fabrika testinden önce fırın sıcaklığı, alarm, emir ve edge ajanı zincirini uçtan uca sınamaktır. Ayrıntı ve gerekçeler `docs/14` içindedir.

**Ne yapar:** `/app/` altında ERP Studio'yu sunar, simülasyonun REST uçlarını `/api/sim/*` ile proxy'ler, edge ajanının HMAC imzalı batch'lerini `/api/edge/ingest` ile kabul eder. **Ne yapmaz:** simülasyonun veritabanına/kaynak koduna dokunmaz, PLC'ye yazmaz, ERP'nin stok/maliyet/muhasebe tablolarını değiştirmez.

## Hızlı başlangıç

```bash
# Kullanıcı simülasyonu (kendi klasöründe)
./start.sh 10

# Köprü + ERP Studio (bu depoda)
python3 server/sim_bridge/run.py                  # sim :8000 → ERP :8080

# Simülasyon kapalıyken önizleme için yerleşik demo kopya
python3 server/sim_bridge/run.py --demo --demo-speed 10

# Yalnızca bağlantı ve eşleme kontrolü
python3 server/sim_bridge/run.py --check

# Edge ajanı (isteğe bağlı; adapter = simulation)
python3 edge/main.py --bind 0.0.0.0 --port 8787 --no-browser
```

Tarayıcı: `http://localhost:8080/app/` → **Entegrasyon → Simülasyon Bağlantısı**. Köprü `0.0.0.0:8080` dinler; tarayıcı simülasyona asla doğrudan gitmez. Sayfa bağlantı kopunca yenilenmez, 2,5 saniyede bir REST ile tazelenir.

## Uçlar

| Metot | Yol | Açıklama |
| --- | --- | --- |
| GET | `/api/health`, `/api/bridge/info` | Köprü durumu ve maskeli yapılandırma |
| GET | `/api/sim/health`, `/api/sim/live` | Bağlantı ve arayüzün tek çağrılık canlı görüntüsü |
| GET | `/api/sim/furnaces`, `/api/sim/orders`, `/api/sim/readings` | Simülasyon proxy'si |
| GET | `/api/sim/map` | Fırın adı → profil makinesi eşlemesi |
| POST | `/api/sim/orders`, `/api/sim/orders/start` | Emir oluştur / başlat |
| POST | `/api/bridge/config` | `simBaseUrl` değiştir (gizli alanlar maskeli) |
| GET | `/api/edge/summary`, `/api/edge/batches`, `/api/edge/latest` | Edge kayıt defteri |
| POST | `/api/edge/ingest` | HMAC imzalı `edge-batch`; `X-Edge-Signature` zorunlu |

## Yapılandırma

`config.json` alanları: `simBaseUrl`, `timeoutSeconds`, `profilePath`, `ingestDb`, `autoMap`, `furnaceMap`, `edge.secret`, `edge.token`, `edge.maxBodyBytes`. `edge.secret`, `edge/config/edge-config.json` içindeki HMAC anahtarıyla **aynı** olmalıdır. `furnaceMap` boşsa fırın adındaki "eritme / homojen / yaşlandırma / testere" anahtar kelimelerine göre profil makineleri seçilir; eşleşmeyen fırın için veri üretilmez.

Kayıt defteri `data/ingest.db` (SQLite, WAL) dosyasındadır ve `.gitignore` kapsamındadır. Batch, okuma ve olay tabloları `batchId` ile idempotenttir; yeniden gönderim çift kayıt üretmez.

## Güvenlik

* Yalnızca `/app/` ve `/index.html` statik olarak yayınlanır; depo kökü, `edge-config.json`, bu klasörün `config.json` dosyası ve `.git` sunulmaz.
* `POST /api/edge/ingest` HMAC-SHA256 imzası ve isteğe bağlı `Bearer` token ister; gövde 5 MB ile sınırlıdır.
* Simülasyonun kendi API'sinde kimlik doğrulama yoktur; yalnızca yerel makinede veya güvenli iç ağda çalıştırılmalıdır. İnternete açılmaz.

## Testler

```bash
python3 tools/sim_bridge_smoke_test.py   # 12 test
node tools/smoke_test.mjs                # 35 ekran
python3 tools/edge_smoke_test.py         # 13 test (simulation adaptörü dahil)
```

Köprü testi gerçek FastAPI gerektirmez: yerleşik demo motoru ve sahte istemcilerle bağlantı, eşleme, emir, imza, idempotency ve "simülasyon kapalı" davranışı sınanır.

## Dosyalar

| Yol | İçerik |
| --- | --- |
| `run.py` | CLI: portlar, `--sim-url`, `--demo`, `--check` |
| `app.py` | Statik ERP + REST proxy + HMAC ingest sunucusu |
| `sim_client.py` | Simülasyon REST istemcisi ve Türkçe alan normalizasyonu |
| `store.py` | SQLite kayıt defteri (batch, okuma, olay, ping) |
| `demo_sim.py` | Belgelenen simülasyon API'sinin bağımlılıksız demo kopyası |
| `config.json` | Köprü yapılandırması |
