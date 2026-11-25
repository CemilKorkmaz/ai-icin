# 13 — Edge Veri Toplama Ajanı: Fabrikadaki Tek Bilgisayar, exe, SQL ve ERP Köprüsü (Sürüm 1.3 · 1.4 eki: simülasyon adaptörü)

**İstek.** Fabrikaya bir bilgisayar kurulacak. Bu bilgisayarda çalışacak bir **exe programı**, fırının içindeki sıcaklık, alarm bilgileri ve benzeri sensörlerden gelen verileri okuyacak, bu verileri yaptığımız ERP sistemine gönderecek ve aynı zamanda kendi **SQL tabanlı veritabanına** kaydedecek. Programın bir de **arayüzü** olacak.

**Kapsam korunur.** Proje alüminyum sürekli döküm biyet dökümhanesi içindir; kum döküm, kalıp/model, maça, pik demir, CNC ve NDT gibi genel dökümhane başlıkları kapsam dışıdır. Faz 1 Satın Alma + Hammadde/Stok, Faz 2 Üretim sırası değişmez. Şekil, şema, ok ve kutu çizimi yapılmaz; kararlar başlıklar, sıralı metin ve tablolarla verilir. Operatör ekranı ile geliştirici ekibinin merkezi yönetim ekranı ayrıdır. `docs/06` içinde anlamı kesinleşmemiş sözcükler (Biyet, Yolduk, Saf küçük, Stone, Continue homojen, PİS/PIS, GNSL, Barsa piyazesi, Crate, PİK PİK) bu dokümanda da **kesin terim olarak kullanılmaz**; yalnızca "Billet", "Yolluk", "kesilen parça?", "hurda/talaş alıcı veya stok kodu?", "continuous homogenization", "PIS/PIMS/otomasyon?", "anlaşılamadı", "PLC adresi?", "Create", "Mini PC" biçiminde işaretli kalır. Bu ajan, genel ERP metnindeki otel, elektrik taahhüt veya CAD örneklerinden türetilmemiştir.

---

## 1. Önceki mimari kararla uzlaştırma

`docs/04` içinde açık bir karar vardır: **ERP'nin kullanıcı arayüzü exe veya WinForms değildir**; istemciler tarayıcıdan `https://erp.firma.local` adresine bağlanır, API, zamanlayıcı, yedekleme ve giden kutu işçisi sunucuda çalışır. Bu karar hâlâ geçerlidir ve değişmemiştir.

Burada istenen exe **farklı bir yazılımdır**. Fabrikadaki operatör, muhasebeci veya yönetici bu exe'yi kullanmaz. Söz konusu bilgisayar, makinelerle aynı LAN'da bulunan, sensörlere ve PLC'ye fiziksel olarak erişebilen **tek veri toplama bilgisayarıdır** (kenar / edge düğümü). Üzerinde çalışan program ERP'nin ekranı değil, ERP ile saha otomasyonu arasındaki **köprüdür**. Dolayısıyla iki katman yan yana var olur:

| Katman | Nerede | Kullanıcı | Teknoloji |
| --- | --- | --- | --- |
| ERP arayüzü | Firma sunucusu, tarayıcıdan | Operatör, mühendis, muhasebe, yönetici | PWA, HTML/CSS/JS, `app/` |
| ERP merkezi yönetim | Aynı sunucu, ayrı ekran | Geliştirici ekibi (Max) | `#/setup`, `#/modules`, `#/vendor` |
| **Edge veri toplama ajanı** | **Fabrikadaki tek bilgisayar** | **Bakım/otomasyon teknisyeni** | **`ERP-Edge-Collector.exe` + yerel web arayüzü** |

Bu ayrım, `docs/08` Bölüm 1'deki "modüler dashboard geliştirici ekip içindir, operatör makine tanımlamaz" ilkesini de korur. Ajan makine tanımlamaz; makineleri `docs/12` içindeki fabrika profil paketinden **okur**.

---

## 2. Fiziki yerleşim ve çalışma biçimi

Fabrikada bir mini PC veya endüstriyel PC kurulur. İşletim sistemi Windows 10/11 olabilir; ajan Python standart kütüphanesiyle yazıldığı için Linux üzerinde de aynı kaynakla çalışır. Bilgisayar iki ağa bakar: makinelere / PLC'ye doğru yerel LAN ve ERP sunucusuna doğru firma içi ağ. İnternet **gerekmez**. Uzaktan müdahale gerektiğinde `docs/04` Bölüm 7'deki VPN + MFA + rol bazlı yetki düzeni kullanılır; doğrudan IP veya açık port dışarıya verilmez.

Ajan tek bir süreç olarak başlar ve içinde dört iş yürütür:

1. **Tarama işçisi.** Yapılandırılan aralıkta (varsayılan 3 saniye) adaptör üzerinden tag'leri okur.
2. **Yerel veritabanı işçisi.** Her okumayı SQLite dosyasına yazar; durum ve eşik değişimlerini olay satırına çevirir.
3. **Gönderim işçisi.** Okumaları imzalı batch'ler hâlinde ERP uç noktasına gönderir; erişilemiyorsa kuyrukta tutar.
4. **Yerel arayüz sunucusu.** `127.0.0.1:8787` adresinde teknisyene canlı durum, SQL, kuyruk ve ayarlar ekranlarını sunar. Tarayıcı kodu aynı kökenden göreli URL kullanır; başka bir servise `localhost` üzerinden gitmez.

Windows'ta `install-task.ps1` ile oturum açılışında otomatik başlatılır, çökerse birer dakika arayla üç kez yeniden denenir. Konsol penceresi gösterilmez; başlangıç hataları `logs/agent.log` dosyasına, işlem günlüğü SQLite `app_log` tablosuna yazılır.

---

## 3. Veri akışı

Sıralı anlatım (şema çizilmez):

1. Ajan açılır, `config/edge-config.json` dosyasını okur ve `config/ornek-fabrika-profili.json` içindeki fabrika profilini yükler.
2. Profilden aktif makineler, tipleri ve dört sinyalin PLC adresleri çıkarılır. Devre dışı bırakılmış makineler (`docs/12` Bölüm 4) taranmaz; geçmiş kayıtları korunur. Eksik sinyal varsa makine başına dört satırlık otomatik tag taslağı tamamlanır.
3. Yapılandırmadaki `telemetryProfiles` makine tipine bağlanır. Örneğin `FURNACE` tipindeki her makine için ocak içi sıcaklık ölçümü, `HOMO_FURNACE` için fırın sıcaklığı, `SAW` için kesme yağı sıcaklığı üretilir. Adres kalıbında makine kimliği yerine yazılır; kod içinde sabit makine adı yoktur.
4. Tarama döngüsü adaptörü çağırır. Gerçek sürücü yoksa `simulated` adaptörüne düşülür ve veri `SIMULATED` kalitesiyle işaretlenir; üretim veri almaya devam eder.
5. Her okuma `client_id` ile SQLite `readings` tablosuna yazılır. Aynı okuma tekrar gelirse `INSERT OR IGNORE` ile çift kayıt oluşmaz.
6. Önceki değerle karşılaştırılır. Dört sinyalden biri değişirse `STATE_CHANGE`, bir ölçüm nominal banttan uyarı veya kritik banda geçerse `THRESHOLD` olayı üretilir. Alarm yalnızca var/yok bilgisidir.
7. Okumalar ve olaylar tek bir `edge-batch` içinde `outbox` tablosuna alınır.
8. Gönderim işçisi batch'i HMAC-SHA256 ile imzalayıp `POST /api/edge/ingest` uç noktasına iletir. Başarılıysa `sent`, başarısızsa üstel geri çekilmeyle `failed`, azami deneme aşılınca `dead` olur. **Hiçbir kuyruk kaydı silinmez.**
9. ERP tarafındaki worker batch'i doğrular, `clientId` ile çift yazımı engeller ve `signalStates`, telemetri kaydı, gerekirse bakım bildirimi üretir. Ajan stok, fatura, maliyet veya muhasebe tablosuna **doğrudan erişmez**.

Bu akış, `docs/04` Bölüm 4'teki "PLC verisi önce telemetry olayına, oradan gerekirse bakım bildirimine dönüşür" ve `docs/09` içindeki "silme yerine doğrulama" kurallarını korur.

---

## 4. Dört sinyal kuralı ve sıcaklık isteği

`docs/08` Bölüm 4'te HMI panelindeki onlarca sinyalden yalnızca dördünün okunacağı kararı verilmişti: `door`, `casting`, `alarm`, `running`. Gerekçe "ekran kalabalık olmasın, insanların başı dönmesin" cümlesidir.

Bu sürümde kullanıcı ayrıca **fırının içindeki sıcaklık** bilgisini istemiştir. İki istek şu şekilde uzlaştırılır:

| Kategori | Alan | ERP'deki yeri | Kural |
| --- | --- | --- | --- |
| Kontrol sinyali | `door`, `casting`, `alarm`, `running` | `signalStates`, durum makinesi | **Dört sinyal değişmez**, beşinci kontrol sinyali eklenmez |
| Ölçüm (telemetri) | `temperatureC`, `chamberTempC`, `oilTempC` | ölçüm kaydı, eşik olayı | `kind: telemetry` olarak ayrı taşınır; ekran kartında tek bir sayı olarak gösterilir |

Sıcaklık bir **durum** değil **ölçümdür**; dört sinyalin yerini almaz, onların yanında ayrı bir alanda tutulur. Ajan arayüzünde her makine kartında dört sinyal rozeti ve altında tek bir sıcaklık değeri görünür. Alarm bilgisi hâlâ yalnızca arıza var/yok bilgisidir; "ateşleyicilerden biri çalışmıyor" gibi ayrıntı, daha fazla PLC verisi gerektirdiği için ilk faza alınmaz. İleride yeni bir sensör istenirse `telemetryProfiles` koleksiyonuna bir satır eklenir; çekirdek kod, dört sinyal kuralı ve ERP ekranı değişmez.

**Sahada doğrulanacak belirsizlikler.** Sıcaklığın hangi noktadan (metal, gaze, duvar), hangi sensör tipiyle, hangi ölçüm aralığında ve kaç saniyede alınacağı konuşmada netleşmemiştir. Bu dokümandaki 680–780 °C nominal, 790 °C uyarı, 820 °C kritik değerleri **örnek eşiklerdir**; `docs/06` içindeki sekiz açık soruya ek olarak sahada sorulmalıdır. Homojenizasyon için 575 °C / 8 saat değeri `docs/07` ile uyumludur. "PİS/PIS" ve "GNSL" gibi anlaşılamayan terimler bu ajanın tag adlarında kullanılmaz.

---

## 5. Yerel SQL veritabanı

Veritabanı SQLite'tır; SQL tabanlıdır, ayrı sunucu kurulumu gerektirmez, WAL modunda çalışır ve ani elektrik kesintisinde bozulma riskini azaltır. Dosya `data/edge.db` konumundadır. Daha büyük tesislerde aynı şema PostgreSQL'e taşınabilir; ajanın iş mantığı değişmez.

| Tablo | Alanlar (özet) | Kural |
| --- | --- | --- |
| `readings` | `client_id`, `at`, `plant_id`, `machine_id`, `tag_id`, `kind`, `signal`, `value_num`, `value_text`, `unit`, `quality`, `source`, `adapter`, `raw` | `client_id` benzersiz; `kind` yalnızca `signal` veya `telemetry` |
| `events` | `client_id`, `at`, `machine_id`, `signal`, `kind`, `previous`, `current`, `severity`, `note` | `STATE_CHANGE`, `THRESHOLD`, `DRIVER_FALLBACK`; silinmez |
| `outbox` | `client_id`, `batch_id`, `endpoint`, `payload_json`, `status`, `attempts`, `next_attempt_at`, `last_error`, `sent_at` | `queued → sending → sent / failed → dead`; hiçbir satır silinmez |
| `runs` | `at`, `duration_ms`, `tag_count`, `reading_count`, `event_count`, `adapter`, `errors` | Her tarama döngüsünün denetim izi |
| `app_log` | `at`, `level`, `source`, `message` | Ajan günlüğü, arayüzde gösterilir |

`quality` alanı `GOOD`, `SIMULATED`, `STALE`, `BAD` değerlerinden biridir. Simülasyondan gelen veri asla gerçek ölçüm gibi işaretlenmez; böylece demo verisiyle sahada alınmış veri karışmaz. `raw` alanı PLC adresi ve eşikleri JSON olarak saklar. `retentionDays` (varsayılan 90 gün) eski `readings` ve `app_log` satırlarını temizler; `outbox`, `events` ve `runs` **korunur**.

Veritabanı düzenli olarak `server/erp/scripts/backup.py` ile harici diske yedeklenir; `docs/04` Bölüm 6'daki yedekleme disiplini aynen geçerlidir.

---

## 6. ERP gönderim sözleşmesi

Ajanın ERP'ye yazdığı **tek uç nokta** `/api/edge/ingest`'tir. İstek gövdesi `kind: edge-batch`, `schemaVersion: 1`, `siteCode`, `plantId`, `batchId`, `clientId`, `at`, `adapter`, `fallback`, `readings[]`, `events[]` ve `counts` alanlarını taşır.

| Başlık | Görev |
| --- | --- |
| `Content-Type` | `application/json; charset=utf-8` |
| `X-Edge-Client-Id` | Batch başına benzersiz istemci kimliği; tekrar gönderim çift kayıt oluşturmaz |
| `X-Edge-Batch-Id` | İzlenebilirlik ve log eşleştirmesi |
| `X-Edge-Signature` | Payload üzerinde HMAC-SHA256, paylaşılan gizli anahtarla |
| `Authorization` | Opsiyonel taşıyıcı token |

ERP çevrimdışıysa bu bir hata değil **beklenen durumdur**: veri önce SQLite'a yazılmıştır, batch kuyrukta kalır, üretim durmaz. Yeniden deneme 2, 4, 8, 16, 32, 64 saniye biçiminde üstel olarak uzar (azami 300 saniye), azami deneme aşılınca kayıt `dead` işaretlenir ve arayüzde uyarı gösterilir. `docs/04` Bölüm 8'deki kapalı çevrim kuyruğu ile aynı felsefedir.

ERP tarafında `docs/11` ile kurulan tek kayıt çok etki ilkesi korunur: bir sevkiyat onayı stok, fatura, fiş, cari, maliyet, olay, bildirim ve rapor kuyruğunu tek işlemde üretir. Ajan bu zincire **dahil değildir**; yalnızca ham sinyal ve ölçüm sağlar. İşletme kayıtlarını ERP worker üretir.

---

## 7. Yerel arayüz

Arayüz, ajanla aynı süreçte çalışan küçük bir HTTP sunucusundan sunulur. Dış CDN, Node.js veya ek kütüphane yoktur. Üretimde yalnızca `127.0.0.1`'e bağlanır; uzaktan önizleme gerekiyorsa `--bind 0.0.0.0` ile açılır ve VPN arkasında tutulur.

| Sekme | İçerik |
| --- | --- |
| Genel Bakış | KPI'lar, canlı makine kartları (dört sinyal rozeti + sıcaklık), durum/eşik olayları, ajan günlüğü |
| Sensörler | Son okumalar; kalite, kaynak, birim ve tag kimliği; tarama döngülerinin süre/adedi |
| SQL Veritabanı | Beş tablonun şeması ve satır sayıları, `readings` son kayıtları, saklama temizliği |
| ERP Kuyruğu | Batch durumları, deneme sayıları, son hata, "Şimdi Gönder", sözleşme özeti |
| Fabrika Profili | `docs/12` profil özeti, adaptör sözleşmeleri, telemetri şablonları |
| Ayarlar | Fabrika kodu, profil yolu, SQL yolu, tarama aralığı, adaptör, PLC IP/port/protokol, ERP URL, token, gizli anahtar, saklama süresi |

Üst çubukta dört durum rozeti vardır: Toplayıcı, PLC, ERP, SQL. **Bağlantıyı Test Et** düğmesi adaptörü ve ERP uç noktasını ayrı ayrı dener; sonuçları ve gerekirse `MANUAL` yedeğini açıkça yazar. **Şimdi Oku** tek döngü çalıştırır. **Durdur / Başlat** tarama işçisini kontrol eder. Arayüz her iki saniyede bir kendini yeniler. Gizli anahtar maskeli gösterilir, dokunulmazsa korunur.

Yerel JSON uçları: `/api/status`, `/api/config`, `/api/profile`, `/api/readings`, `/api/events`, `/api/outbox`, `/api/runs`, `/api/logs`, `/api/latest`, `/api/schema`, `/api/adapters` ve yazma için `/api/poll`, `/api/test`, `/api/collector`, `/api/flush`, `/api/purge`.

---

## 8. Adaptör sözleşmesi

`app/js/adapters.js` içindeki üç fabrika adaptörünün aynısı Python tarafında da vardır; Sürüm 1.4 ile test amaçlı dördüncü bir adaptör (`simulation`) eklenmiştir. Sözleşme `connect`, `test`, `readFourSignals`, `disconnect` ve buna ek olarak `readTelemetry` işlevlerinden oluşur.

| Kod | Durum | Davranış |
| --- | --- | --- |
| `simulated` | Hazır | Ağ olmadan dört sinyal + telemetri üretir; `SIMULATED` kalitesi |
| `opcua` | Sözleşmeye hazır | Sürücü sonraki aşamada; şu an `MANUAL` yedeğe düşer |
| `modbus` | Sözleşmeye hazır | Sürücü sonraki aşamada; şu an `MANUAL` yedeğe düşer |
| `simulation` | Hazır (test) | Kullanıcı simülasyonunun REST uçlarını okur; fabrika testinden önce uçtan uca sınama içindir |

`simulation` adaptörü `simulation.baseUrl` adresine bağlanır; fırın adları `furnaceMap` veya ada göre kural ile profil makinelerine eşlenir. Simülasyon kapalıysa ajan yine `simulated` yedeğine düşer. Köprü, arayüz ve eşleme ayrıntıları `docs/14` içindedir.

Sürücü yüklü değilse ajan hata verip kapanmaz. `resolve_adapter` simulated'a geçer, bunu `fallback` alanına yazar, `app_log` tablosuna uyarı düşer ve arayüzde sarı rozet gösterilir. Bu, `docs/08` Bölüm 3'teki "`MANUAL` eksik bir sürüm değil, birinci sınıf çalışma biçimidir" kararının kod karşılığıdır. Gerçek OPC UA / Modbus sürücüsü takıldığında üst katman, SQL şeması ve ERP sözleşmesi değişmez.

---

## 9. exe üretimi ve sahaya kurulum

Ajan yalnızca Python standart kütüphanesini kullanır: `sqlite3`, `http.server`, `urllib.request`, `hmac`, `hashlib`, `json`, `threading`, `webbrowser`. Fabrikadaki bilgisayarda **Python veya pip kurmak gerekmez**; PyInstaller yalnızca exe'yi üreten geliştirme bilgisayarında kullanılır.

Üretim adımları:

1. Geliştirme bilgisayarında `edge/build_exe.bat` çalıştırılır. PyInstaller `erp-edge.spec` ile tek dosya `dist\ERP-Edge-Collector.exe` üretir; `erp_edge/ui/` dosyaları ve `config/` klasörü exe içine ve yanına kopyalanır. Konsol penceresi açılmaz. PyInstaller tek-dosya modunda `__file__` geçici bir klasörü gösterdiğinden, `config/` ve `data/` yolları özellikle **exe'nin bulunduğu klasöre** göre çözülür; aksi hâlde her kapanışta SQL dosyası ve fabrika ayarları kaybolurdu.
2. `dist\` klasörü fabrikadaki bilgisayara kopyalanır. `config/edge-config.json` fabrikaya göre düzenlenir: site kodu, PLC IP/port/protokol, ERP URL, gizli anahtar, tarama aralığı.
3. `docs/12` içindeki fabrika profil paketi ERP'den indirilip `config/ornek-fabrika-profili.json` yerine konur. 1 fırınlı fabrika ile 5 fırınlı fabrika aynı exe'yi kullanır; yalnızca bu JSON değişir.
4. İlk çalıştırma `ERP-Edge-Collector.exe --dry-run` ile doğrulanır: hiçbir yere yazmadan kaç tag okunacağı görülür.
5. `ERP-Edge-Collector.exe` başlatılır; arayüz `http://127.0.0.1:8787` adresinde açılır. **Bağlantıyı Test Et** ile PLC ve ERP denetlenir.
6. `install-task.ps1` yönetici PowerShell ile çalıştırılıp oturum açılışında otomatik başlatma kurulur.
7. `data/edge.db` yedekleme planına eklenir.

> **Ortam notu.** Bu depo bir Linux geliştirme ortamında hazırlandığından Windows `.exe` ikilisi depoya konmamıştır. Kaynak kod, `erp-edge.spec`, `build_exe.bat`, `install-task.ps1` ve `requirements.txt` eksiksizdir; Windows'ta tek komutla ikili üretilir. Ajanın kendisi platformdan bağımsız çalışır, bu ortamda `python3 edge/main.py` ile canlı olarak doğrulanmıştır.

---

## 10. Güvenlik

- Yerel arayüz üretimde yalnızca `127.0.0.1`'e bağlıdır; dışarıya port açılmaz.
- ERP istekleri paylaşılan gizli anahtarla HMAC-SHA256 imzalıdır; token opsiyoneldir.
- Uzaktan erişim doğrudan IP ile değil VPN + MFA + RBAC ile yapılır (`docs/04` Bölüm 7). Geliştirici hesabı üretim verisini salt okunur görür.
- Ajan ERP'nin işletme tablolarına veritabanı bağlantısı kurmaz; yalnızca tek bir HTTP uç noktasına yazar.
- Gizli anahtar arayüzde maskeli gelir; dokunulmazsa korunur. Varsayılan/kısa anahtarda yerel arayüz ve `/api/status` `DEFAULT_EDGE_SECRET` uyarısı gösterir.
- `quality: SIMULATED` verisi gerçek ölçüm gibi raporlanmaz.
- Yerel arayüz yanıtları `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` ve izin politikası başlıkları taşır; POST gövdeleri 1 MiB ile sınırlıdır (Sürüm 1.7).
- Kuyruk ve olay kayıtları silinmez; denetim izi korunur.

---

## 11. Modülerlikle ilişki (`docs/12`)

Bu ajan, Sürüm 1.2'de kurulan modüler yapının **üçüncü katmanıdır**. Sürüm 1.2 fabrika profilini, modül kaydını ve adaptör sözleşmesini veriye çevirmişti; Sürüm 1.3 bu veriyi sahada fiziksel olarak okuyan programı ekler.

| `docs/12` kararı | Ajanın kullandığı yer |
| --- | --- |
| Fabrika profil paketi | Makineler, tipler ve dört sinyalin tag adresleri |
| `machineAliases` / tek kaynak | Eski `F20` kodları kullanılmaz; makine kimliği doğrudan okunur |
| Devre dışı bırakma | `decommissionedAt` olan makine taranmaz, geçmişi korunur |
| `moduleRegistry` / `plantModules` | Ajan ERP'nin hangi modüllerinin açık olduğunu bilmek zorunda değildir |
| `adapterContracts` | Aynı `connect/test/readFourSignals/disconnect` sözleşmesi |
| Sabit kod yasağı | Ne `P1`, ne `MCH-08`, ne `F20` ajanın kodunda geçer |

Yeni bir fabrikaya gidildiğinde yapılacak iş **exe değiştirmek değil**, o fabrikanın profil paketini ve `edge-config.json` dosyasını vermektir. Bu, kullanıcının "gerçek fabrikaya kolayca bağlanmak" ve "her şey modüler olsun" isteğinin saha otomasyonu tarafındaki karşılığıdır.

---

## 12. Doğrulama sonuçları

| Komut | Sonuç |
| --- | --- |
| `python3 tools/edge_smoke_test.py` | 13 test: yapılandırma, profil, adaptör yedeği, dört sinyal + telemetri, idempotency, eşik bantları, durum değişimi ve eşik geçişi olayları, imzalı batch, çevrimdışı kuyruk, SQL şeması, `--dry-run`, yerel arayüzün 11 JSON ucu ve `/api/poll`, **simülasyon adaptörü (3 eşleşen fırın + kapalıyken yedek)**, exe üretim dosyaları → **TÜM TESTLER GEÇTİ** |
| `python3 tools/sim_bridge_smoke_test.py` | 20 test: köprü statik sunucusu, canlı anlık görüntü, eşleme kuralları, emir oluştur/başlat ve doğrulama, HMAC ingest ve idempotency, yanlış imza, güvenlik başlıkları, simülasyon kapalıyken son veri, demo motorunda alarm/tamamlanma → **TÜM TESTLER GEÇTİ** |
| `python3 edge/main.py --dry-run` | Tek döngü, hiçbir yere yazmadan okuma sayısı ve adaptör özeti |
| `python3 edge/main.py --once` | Tek döngü, SQLite `readings` + `outbox` yazımı |
| `python3 edge/main.py --bind 0.0.0.0 --port 8787 --no-browser` | Canlı arayüz; HTML/CSS/JS ve tüm JSON uçları 200 |
| `python3 -m py_compile edge/main.py edge/erp_edge/*.py` | Sözdizimi hatası yok |
| `python3 tools/check_all.py` | 6 adımlı kalite kapısı: veri + simülasyon + köprü + edge + arayüz → **TÜM KALİTE KAPISI GEÇTİ** |
| `python3 tools/build_docx.py` | 18 doküman tek geçerli OOXML Word dosyasında birleşti |

Örnek profil 13 aktif makine (biri devre dışı olduğu için taranmaz), 52 sinyal tag'i ve üç telemetri şablonu üretir; tek döngüde 62 okuma yapılır. ERP kapalıyken kuyruk kayıtları `failed` olarak kalır ve hiçbiri silinmez.

---

## 13. Sınırlar ve açık kalan işler

1. **Gerçek OPC UA / Modbus sürücüsü yoktur.** `opcua` ve `modbus` adaptörleri sözleşmeye hazırdır; `opcua` / `pymodbus` kütüphaneleri, VPN ve MFA ile birlikte `docs/10` aşama 9'da eklenir. Sürüm 1.4'te test için `simulation` adaptörü eklenmiştir; üretim verisi yine `SIMULATED` kalitesiyle işaretlenir.
2. **ERP tarafında `/api/edge/ingest` worker'ı prototip düzeyindedir.** Bu depodaki ERP PWA'sı statik dosya sunar; canlı API, işlemsel veritabanı, JWT/RBAC ve gerçek transaction sınırı aşama 8'de kurulacaktır (`docs/12` Bölüm 12). Ajanın sözleşmesi bu worker için hazırdır.
3. **Windows `.exe` ikilisi depoda yoktur.** Linux ortamında üretilemediği için kaynak + tek komutluk üretim betiği verilmiştir.
4. **Sıcaklık eşikleri örnektir.** Sensör noktası, tipi, ölçüm aralığı, tarama sıklığı ve eşikler sahada doğrulanmalıdır. `docs/06` içindeki sekiz açık soru ve anlaşılamayan terimler hâlâ açıktır.
5. **Standart maliyet / ağırlıklı ortalama / FIFO**, 17 tondan 14 tona dağıtım kuralı, e-Fatura, banka ve KDV beyanı kapsam dışıdır.
6. **Gerçek tarayıcı ve tablet testi** yapılmamıştır; arayüz Node/linkedom yerine Python `http.server` üzerinde ve HTTP istekleriyle doğrulanmıştır.
7. **Çoklu ajan / yedekli PC** senaryosu tasarlanmamıştır. Şu an bir fabrikada bir ajan vardır; ikinci bir bilgisayar eklenirse `client_id` çakışmaması için `siteCode` ayrılmalıdır.

Bu sınırlar kullanıcının istediği exe'nin **çalışmasını** engellemez: program bu depoda canlı olarak açılmakta, sensör verisini okumakta, SQL'e yazmakta, ERP'ye göndermeyi denemekte ve çevrimdışıyken kuyruğu korumaktadır. Eksik olan yalnızca gerçek saha sürücüsü ve canlı sunucu tarafıdır; ikisi de aynı sözleşmeyle sonradan takılır.
