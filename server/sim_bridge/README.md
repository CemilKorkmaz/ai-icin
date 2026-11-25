# Simülasyon Köprüsü — ERP Studio'yu fırın simülasyonuna bağlar

Bu klasör, kullanıcının `erp_backend` / `erp_simulation` olarak çalıştırdığı fırın simülasyonunu ERP Studio'ya bağlar. Amaç, gerçek fabrika testinden önce fırın sıcaklığı, alarm, emir ve edge ajanı zincirini uçtan uca sınamaktır. Ayrıntı ve gerekçeler `docs/14`, senaryo/olay oynatma kitabı `docs/16` içindedir.

**Ne yapar:** `/app/` altında ERP Studio'yu sunar, simülasyonun REST uçlarını (fırın, emir, **senaryo**, **olay**) `/api/sim/*` ile proxy'ler, ana Panel/Makine Parkı/PLC Durum/Üretim Akışı ekranlarını canlı fırın ve emir verisiyle besler, edge ajanının HMAC imzalı batch'lerini `/api/edge/ingest` ile kabul eder. **Ne yapmaz:** simülasyonun veritabanına/kaynak koduna dokunmaz, PLC'ye yazmaz, ERP'nin stok/maliyet/muhasebe tablolarını değiştirmez.

## Hızlı başlangıç

**Çift tık (önerilen):** Simülasyon `localhost:8000` üzerinde çalışırken depo kökündeki başlatıcıya çift tıklayın. Köprü başlar, tarayıcı `http://localhost:8080/app/#/dashboard` adresinde, canlı Panel'de açılır. Pencere kapatılınca köprü durur.

| Platform | Dosya | Üretilmiş uygulama varsa |
| --- | --- | --- |
| Windows | `Baslat.bat` | `dist\ERP-Sim-Bridge.exe` |
| macOS | `Baslat.command` | `dist/ERP-Sim-Bridge.app` |

Tek dosya uygulama üretmek için (kendi işletim sisteminizde bir kez):

* Windows: `server\sim_bridge\build_exe.bat` → `dist\ERP-Sim-Bridge.exe`; ayar/veri exe'nin yanında.
* macOS: `server/sim_bridge/build_macos.sh` → `dist/ERP-Sim-Bridge.app`; ayar/veri `~/Library/Application Support/ERP-Sim-Bridge` altında.

```bash
# Kullanıcı simülasyonu (kendi klasöründe)
./start.sh 10

# Köprü + ERP Studio (bu depoda)
python3 server/sim_bridge/run.py --open           # sim :8000 → ERP :8080 + tarayıcı

# Simülasyon kapalıyken önizleme için yerleşik demo kopya
python3 server/sim_bridge/run.py --demo --demo-speed 10

# Yalnızca bağlantı ve eşleme kontrolü
python3 server/sim_bridge/run.py --check

# Edge ajanı (isteğe bağlı; adapter = simulation)
python3 edge/main.py --bind 0.0.0.0 --port 8787 --no-browser
```

Tarayıcı: `http://localhost:8080/app/` → **Entegrasyon → Simülasyon Bağlantısı**. Köprü kaynaktan çalışırken `0.0.0.0:8080`, exe/çift tıkta yalnızca `127.0.0.1:8080` dinler; exe açılışta tarayıcıyı kendisi açar. Tarayıcı simülasyona asla doğrudan gitmez. Sayfa bağlantı kopunca yenilenmez, 2,5 saniyede bir REST ile tazelenir.

## Uçlar

| Metot | Yol | Açıklama |
| --- | --- | --- |
| GET | `/api/health`, `/api/bridge/info` | Köprü durumu, maskeli yapılandırma ve güvenlik uyarıları |
| GET | `/api/sim/health`, `/api/sim/live` | Bağlantı ve arayüzün tek çağrılık canlı görüntüsü |
| GET | `/api/sim/furnaces`, `/api/sim/orders`, `/api/sim/readings` | Simülasyon proxy'si |
| GET | `/api/sim/map` | Fırın adı → profil makinesi eşlemesi |
| POST | `/api/sim/orders`, `/api/sim/orders/start` | Emir oluştur / başlat |
| POST | `/api/bridge/config` | `simBaseUrl` değiştir (gizli alanlar maskeli) |
| GET | `/api/edge/summary`, `/api/edge/batches`, `/api/edge/latest` | Edge kayıt defteri |
| POST | `/api/edge/ingest` | HMAC imzalı `edge-batch`; `X-Edge-Signature` zorunlu |

## Paketlenmiş uygulama yerleşimi

Paketlenmiş uygulamada kod ve arayüz geçici `_MEIPASS` klasöründen okunur; **yazılabilir** dosyalar uygulamanın dışında durur:

| Yol | İçerik |
| --- | --- |
| uygulama içi `app/`, `index.html` | ERP Studio statik arayüzü (salt okunur) |
| uygulama içi `edge/erp_edge/sim_map.py` | Fırın → makine eşleme kuralı |
| Windows: exe yanı · macOS: `~/Library/Application Support/ERP-Sim-Bridge` | `config.json`, `config/ornek-fabrika-profili.json`, `data/ingest.db` |

macOS'ta uygulama paketinin içine yazılmaz: `.app` `/Applications` altına taşınabilir, güncellenebilir ve imza bütünlüğü bozulmaz.

## Yapılandırma

`config.json` alanları: `simBaseUrl`, `timeoutSeconds`, `profilePath`, `ingestDb`, `autoMap`, `furnaceMap`, `edge.secret`, `edge.token`, `edge.maxBodyBytes`. `edge.secret`, `edge/config/edge-config.json` içindeki HMAC anahtarıyla **aynı** olmalıdır. `furnaceMap` boşsa fırın adındaki "eritme / homojen / yaşlandırma / testere" anahtar kelimelerine göre profil makineleri seçilir; eşleşmeyen fırın için veri üretilmez.

Kayıt defteri `data/ingest.db` (SQLite, WAL) dosyasındadır ve `.gitignore` kapsamındadır. Batch, okuma ve olay tabloları `batchId` ile idempotenttir; yeniden gönderim çift kayıt üretmez.

## Güvenlik

* Yalnızca `/app/` ve `/index.html` statik olarak yayınlanır; depo kökü, `edge-config.json`, bu klasörün `config.json` dosyası ve `.git` sunulmaz.
* `POST /api/edge/ingest` HMAC-SHA256 imzası ve isteğe bağlı `Bearer` token ister; gövde 5 MB ile sınırlıdır.
* Tüm yanıtlar `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` ve `Permissions-Policy` başlıklarını taşır.
* `edge.secret` varsayılan değerdeyse veya 16 karakterden kısaysa `/api/health` içinde `DEFAULT_EDGE_SECRET` uyarısı yayınlanır. Saha kurulumunda değiştirin.
* Uzak `simBaseUrl` için `REMOTE_SIM_NO_AUTH` uyarısı verilir; uzak simülasyonda kimlik doğrulama yoktur.
* Simülasyonun kendi API'sinde kimlik doğrulama yoktur; yalnızca yerel makinede veya güvenli iç ağda çalıştırılmalıdır. İnternete açılmaz.

## Testler

```bash
python3 tools/check_all.py               # 6 adımlı kalite kapısı
python3 tools/simulation_smoke_test.py   # 11 test
python3 tools/sim_bridge_smoke_test.py   # 20 test
node tools/smoke_test.mjs                # 35 ekran
python3 tools/edge_smoke_test.py         # 13 test (simulation adaptörü dahil)
```

Köprü testi gerçek FastAPI gerektirmez: yerleşik demo motoru ve sahte istemcilerle bağlantı, eşleme, emir, **senaryo → olay**, imza, idempotency, "simülasyon kapalı" davranışı ve exe yerleşimi sınanır.

## Dosyalar

| Yol | İçerik |
| --- | --- |
| `run.py` | CLI: portlar, `--sim-url`, `--demo`, `--check` |
| `app.py` | Statik ERP + REST proxy + HMAC ingest sunucusu |
| `sim_client.py` | Simülasyon REST istemcisi ve Türkçe alan normalizasyonu |
| `store.py` | SQLite kayıt defteri (batch, okuma, olay, ping) |
| `demo_sim.py` | Belgelenen simülasyon API'sinin bağımlılıksız demo kopyası |
| `config.json` | Köprü yapılandırması (kaynaktan çalışırken) |
| `exe_entry.py` | PyInstaller giriş noktası |
| `erp-sim-bridge.spec`, `build_exe.bat` | Windows tek dosya `dist\ERP-Sim-Bridge.exe` üretimi |
| `erp-sim-bridge-macos.spec`, `build_macos.sh` | macOS `dist/ERP-Sim-Bridge.app` üretimi |
