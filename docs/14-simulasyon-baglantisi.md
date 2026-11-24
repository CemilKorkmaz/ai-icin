# 14 — Simülasyon Bağlantısı: ERP'yi Fabrika Testinden Önce Simülasyonda Sınamak (Sürüm 1.6)

**Amaç:** Kullanıcının `erp_backend` / `erp_simulation` olarak çalıştırdığı fırın simülasyonunu ERP Studio'ya bağlamak; gerçek fabrika testi başlamadan önce fırın sıcaklığı, alarm, üretim emri ve edge ajanı zincirini uçtan uca burada sınamak.

**Sürüm 1.4.1–1.4.2:** Windows'ta `Baslat.bat` + `ERP-Sim-Bridge.exe`, macOS'te `Baslat.command` + `ERP-Sim-Bridge.app` ile çift tıkla başlatma eklendi.

**Sürüm 1.5:** Simülasyon verisi artık yalnızca bu ekranda değil, ana **Panel**, **Makine Parkı**, **PLC Durum** ve **Üretim Akışı** ekranlarında da gösterilir. Üst çubuktaki anahtar ile demo veriye dönülebilir; canlı mod salt okunurdur.

**Sürüm 1.6:** Simülasyon **ERP test ortamına** dönüştü. Fırın arızası senaryoları (sensör, aşırı sıcaklık, brülör, kapı, döküm) simülasyon ekranından tek tıkla uygulanır; olaylar `/api/events` ile ERP'ye taşınır ve **bildirim merkezi + kritik uyarı bandı + PLC ekranı** üzerinde görünür. İş akışı testleri yalnızca bildirim üretir, işletme tablosuna yazmaz. Ayrıntılı oynatma kitabı: `docs/16`.

**Kapsam:** Bir simülasyon sunucusu (`:8000`), bir köprü (`:8080`) ve isteğe bağlı edge ajanı (`:8787`). Köprü simülasyonla yalnızca belgelenen REST uçları üzerinden konuşur; depodaki simülasyon kopyası v1.6'da senaryo ve olay uçlarıyla genişletilmiştir.

---

## 1. Neden arada bir köprü var?

Simülasyon `8000`, ERP Studio `8080` portunda çalışır. Tarayıcı doğrudan `http://localhost:8000/api/furnaces` çağırsaydı üç sorun çıkardı:

1. **Farklı köken (CORS).** Simülasyonun FastAPI sunucusunda ERP için CORS izni yoktur; tarayıcı isteği engellerdi.
2. **Adres sorunu.** Kullanıcı simülasyonu kendi bilgisayarında çalıştırır; erişim noktası `127.0.0.1:8000` olduğunda tarayıcının bulunduğu makineye göre değişir. Köprü sunucu tarafında çalıştığı için adres tek yerde durur.
3. **WebSocket döngüsü.** Kullanıcı rehberindeki "bağlantı koptu / sayfa sürekli yenileniyor" sorunu, WebSocket kapanınca `location.reload()` çağrılmasından doğmuştu. Bu bağlantıda **WebSocket kullanılmaz**; Simülasyon Bağlantısı ekranı 2,5, ana ekranlar 3 saniyede bir REST ile okur ve bağlantı kopunca **sayfayı yenilemez**.

Bu nedenle `server/sim_bridge` tek süreçte üç iş yapar: statik ERP Studio'yu sunar, simülasyon REST uçlarını proxy'ler ve edge ajanının imzalı batch'lerini kabul eder.

---

## 2. Mimari

Üç süreç, tek yönlü veri akışı:

| Katman | Adres | Görev |
| --- | --- | --- |
| Kullanıcı simülasyonu | `http://127.0.0.1:8000` | Fırın durumları, üretim emirleri, sıcaklık geçmişi; kendi SQLite dosyası |
| Köprü + ERP Studio | `http://localhost:8080` | Statik arayüz, `/api/sim/*` proxy, `/api/edge/ingest` alıcısı, yerel kayıt defteri |
| Edge ajanı (isteğe bağlı) | `http://127.0.0.1:8787` | Simülasyondan okur, kendi SQLite'ına yazar, imzalı batch'i köprüye gönderir |

Tarayıcı yalnızca `8080` ile konuşur. Simülasyon kapalıysa köprü son başarılı görüntüyü "bayat" etiketiyle gösterir; edge ajanı ise `simulated` / `MANUAL` yedeğine düşer. Hiçbir katman diğerinin veritabanına doğrudan yazmaz.

---

## 3. Köprü ne yapar, ne yapmaz?

**Yapar:**

* `/app/` altında ERP Studio'yu sunar; eski `python3 -m http.server 8080` komutunun yerini alır.
* Simülasyonun fırın, emir ve okuma uçlarını okur; Türkçe alan adlarını (`anlik_sicaklik`, `hedef_sicaklik`, `durum` …) tek biçime çevirir.
* Simülasyon adları ile `docs/12` profil paketindeki makine kimliklerini eşler; eşleşmeyeni uyarı olarak gösterir.
* Kullanıcının açık eylemiyle emir oluşturur ve başlatır, senaryo uygular.
* `/api/edge/ingest` üzerinden HMAC-SHA256 imzalı batch'i doğrular, `batchId` ile idempotent biçimde SQLite'a yazar.
* Simülasyon kapalıyken 503/200 + `stale` yanıtı üretir; arayüz çökmez.

**Yapmaz:**

* Simülasyonun veritabanına veya WebSocket'ine dokunmaz; yalnızca belgelenen REST uçlarını kullanır.
* PLC'ye yazmaz; fırın başlatma ve senaryo uygulama yetkisi simülasyonun kendi API'sindedir.
* ERP'nin stok, maliyet, muhasebe veya cari tablolarına yazmaz. Edge batch'i ayrı bir kayıt defterine düşer; simülasyon olayı yalnızca **bildirim** üretir, işletme kaydı oluşturmaz.
* Gerçek fabrikada kullanılacak üretim ingest worker'ının yerini aldığını iddia etmez. Bu, prototip doğrulamasıdır (`docs/13` Bölüm 13).

---

## 4. Kurulum — simülasyon, köprü ve edge

### 4.1 Kullanıcı simülasyonu

Kendi simülasyon klasöründe:

```bash
./start.sh 10
```

`10` hız çarpanıdır; verilmezse gerçek zamanlı çalışır. Terminalde `Uvicorn running on http://0.0.0.0:8000` satırı görülmelidir. Windows'ta `start.sh 10` veya `bash start.sh 10` kullanılır.

### 4.2 Çift tıkla başlatma — Windows ve macOS

Simülasyon her zamanki gibi `localhost:8000` üzerinde çalışırken depo kökündeki başlatıcıya çift tıklanır. Başlatıcı köprüyü açar ve tarayıcıyı doğrudan **`http://localhost:8080/app/#/dashboard`** adresinde, canlı Panel'de gösterir; adres yazmak veya komut ezberlemek gerekmez. Açılan pencere köprünün kendisidir: **pencere açık kaldıkça** ERP simülasyona bağlıdır, kapatılınca köprü durur.

| İşletim sistemi | Çift tıklanan dosya | Açılan pencere |
| --- | --- | --- |
| Windows | `Baslat.bat` | Siyah komut penceresi |
| macOS | `Baslat.command` | Terminal penceresi |

Her iki başlatıcı aynı sırayı izler:

| Durum | Davranış |
| --- | --- |
| `dist\ERP-Sim-Bridge.exe` veya `dist/ERP-Sim-Bridge.app` varsa | Doğrudan uygulama çalışır; Python aranmaz |
| Uygulama yok, Python varsa | `python3 server/sim_bridge/run.py --host 127.0.0.1 --port 8080 --open` çalışır |
| 8080 doluysa | Türkçe hata verir, pencere kapanmaz; eski pencere kapatılıp yeniden denenir |
| Simülasyon kapalıysa | Köprü yine açılır, ekran "köprü çalışmıyor / bayat veri" gösterir; çökmez |

**macOS ilk açılış.** Git ile gelen `Baslat.command` normalde doğrudan çalışır. Finder "geliştirici doğrulanamadı" derse dosyaya **sağ tık → Aç** deyin; gerekirse **Sistem Ayarları → Gizlilik ve Güvenlik → Yine de Aç** düğmesi kullanılır. Çalıştırma izni kaybolduysa Terminal'de `chmod +x Baslat.command` yeterlidir.

**Adres neden `8080`?** 80 portu Windows'ta yönetici, macOS'ta `sudo` hakkı ister ve başka programlarla kolayca çakışır; bu yüzden köprü 8080'de çalışır. Tarayıcı zaten otomatik açıldığı için adres yazılmaz; sonradan elle girmek gerekirse `http://localhost:8080/app/#/dashboard` yer imine eklenir; Simülasyon Bağlantısı ekranı menüden açılır.

#### Tek seferlik uygulama üretimi (isteğe bağlı)

| Platform | Komut | Çıktı | Ayar ve veri |
| --- | --- | --- | --- |
| Windows | `server\sim_bridge\build_exe.bat` | `dist\ERP-Sim-Bridge.exe` | Exe'nin yanında |
| macOS | `server/sim_bridge/build_macos.sh` | `dist/ERP-Sim-Bridge.app` | `~/Library/Application Support/ERP-Sim-Bridge` |

Betikler PyInstaller'ı kurar. Uygulamanın içinde ERP Studio'nun `app/` dosyaları, varsayılan ayar ve örnek fabrika profili taşınır. Windows'ta `config.json`, `config\ornek-fabrika-profili.json` ve `data\ingest.db` exe'nin yanında oluşur; bu yüzden exe yazılabilir bir klasöre (Masaüstü, `C:\ERP-Sim` gibi) konmalıdır, `Program Files` altında ayar yazılamaz. macOS'ta aynı dosyalar uygulama paketinin dışında, kullanıcı klasöründe tutulur; `.app` `/Applications` altına taşınabilir.

macOS uygulaması imzasızdır; ilk açılışta aynı sağ tık → Aç adımı gerekir. `.app` yalnızca üretildiği Mac'in mimarisi için (Apple Silicon veya Intel) çalışır; diğer mimaride `build_macos.sh` yeniden çalıştırılır.

> Windows exe'si ve macOS uygulaması bu Linux geliştirme ortamında üretilemez (PyInstaller hedef işletim sisteminde çalışır). Depoda ikili dosyalar yerine onları üreten `.spec` ve betikler vardır; exe/.app yerleşimi (`_MEIPASS` içindeki varlıklar, dışarıdaki yazılabilir dosyalar) testlerle doğrulanmıştır.

### 4.3 Komut satırından çalıştırma (geliştirici)

Bu depoda:

```bash
python3 server/sim_bridge/run.py
```

Varsayılanlar simülasyon `http://127.0.0.1:8000`; ERP kaynaktan çalışırken `http://0.0.0.0:8080`, exe'de `http://127.0.0.1:8080`. `--open` eklenirse tarayıcı kendiliğinden ana **Panel**'de (`http://localhost:8080/app/#/dashboard`) açılır; teşhis için **Entegrasyon → Simülasyon Bağlantısı** seçilir.

Simülasyon kapalıyken arayüzü yine görmek için yerleşik demo kopya kullanılabilir:

```bash
python3 server/sim_bridge/run.py --demo --demo-speed 10
```

Demo kopya `127.0.0.1:8000` üzerinde üç fırınla çalışır ve her yanıtta `mode: demo` döner. **Kullanıcının gerçek simülasyonu değildir**; yalnızca önizleme ve test içindir.

Farklı bir makinedeki simülasyona bağlanmak için:

```bash
python3 server/sim_bridge/run.py --sim-url http://192.168.1.20:8000
```

Adres, arayüzdeki **Adresi Değiştir** düğmesiyle de güncellenebilir; bu işlem `server/sim_bridge/config.json` dosyasını yazar.

### 4.4 Edge ajanı (isteğe bağlı)

`edge/config/edge-config.json` içinde `adapter` değeri `simulation`, `simulation.baseUrl` simülasyon adresidir. Ajan:

```bash
cd edge && python3 main.py
```

Ajan `8787`'de açılır. **Bağlantıyı Test Et** düğmesi hem simülasyonu hem ERP köprüsünü dener. **Şimdi Oku** tek döngü çalıştırır; **Toplu Gönder** kuyruğu boşaltır. Başarılı gönderimden sonra `outbox` kaydı `sent` olur — v1.3'te statik ERP'nin 501 döndürdüğü yerde artık imzalı alıcı vardır.

---

## 5. Yapılandırma

`server/sim_bridge/config.json` (kaynaktan çalışırken) veya exe'nin yanındaki `config.json`:

| Alan | Varsayılan | Anlam |
| --- | --- | --- |
| `simBaseUrl` | `http://127.0.0.1:8000` | Simülasyon kök adresi; yalnızca sunucu tarafında kullanılır |
| `timeoutSeconds` | `3` | Her REST çağrısının zaman aşımı |
| `liveRefreshMs` | `2500` | Arayüzün önerilen yenileme aralığı (bilgi amaçlı) |
| `profilePath` | `edge/config/ornek-fabrika-profili.json`; exe/.app'te `config/ornek-fabrika-profili.json` | Makine eşlemesinin kaynağı |
| `ingestDb` | `server/sim_bridge/data/ingest.db`; exe/.app'te `data/ingest.db` | Batch, okuma ve olay kayıt defteri |
| `autoMap` | `true` | Ada göre otomatik eşleme |
| `furnaceMap` | `{}` | Açık eşleme: `{ "Fırın adı": "MCH-01" }` |
| `edge.secret` | `degistirin-bu-gizli-anahtari` | Edge ajanıyla **aynı** HMAC anahtarı |
| `edge.token` | boş | Doluysa `Authorization: Bearer …` zorunlu olur |
| `edge.maxBodyBytes` | 5 MB | Batch gövde sınırı |

`run.py` seçenekleri: `--host`, `--port`, `--sim-url`, `--config`, `--db`, `--demo`, `--demo-port`, `--demo-speed`, `--check`, `--open`. `--check` yalnızca bağlantıyı sınar ve eşleme tablosunu yazdırır.

---

## 6. Köprü REST uçları

| Metot | Yol | Açıklama |
| --- | --- | --- |
| GET | `/api/health` | Köprü canlı mı, sürüm ve çalışma süresi |
| GET | `/api/bridge/info` | Kök, profil, demo modu, maskeli yapılandırma |
| GET | `/api/sim/health` | Simülasyon bağlantısı, gecikme, fırın sayısı |
| GET | `/api/sim/live` | Arayüzün tek çağrısı: fırınlar, emirler, alarmlar, eşleme, edge özeti |
| GET | `/api/sim/furnaces` | Ham ama normalize edilmiş fırın listesi |
| GET | `/api/sim/orders` | Emir listesi |
| GET | `/api/sim/readings?name=&limit=` | Fırın sıcaklık geçmişi (en fazla 500) |
| GET | `/api/sim/scenarios` | ERP test senaryoları ve iş akışı testleri |
| GET | `/api/sim/events?after=&limit=` | ERP'ye giden olay günlüğü (artan kimlik) |
| GET | `/api/sim/map` | Fırın → makine eşlemesi ve eşleşmeyenler |
| POST | `/api/sim/orders` | Emir oluştur (`product`, `furnace`, `target_temp`, `duration_min`) |
| POST | `/api/sim/orders/start` | Emri başlat (`id`, isteğe bağlı `furnace`) |
| POST | `/api/sim/scenarios` | `{scenario, furnace}` arıza uygula; `{scenario}` iş akışı testi |
| POST | `/api/bridge/config` | `simBaseUrl` değiştir; gizli alanlar maskeli döner |
| GET | `/api/edge/health` | Kayıt defteri durumu, anahtar/token gereksinimi |
| GET | `/api/edge/summary` | Batch, okuma, olay, makine sayıları ve son batch |
| GET | `/api/edge/batches?limit=` | Son batch'ler |
| GET | `/api/edge/latest?limit=` | Son okumalar ve olaylar |
| POST | `/api/edge/ingest` | Edge ajanının **tek yazma ucu**; HMAC zorunlu |

Hata biçimi her uçta aynıdır: `{ "ok": false, "error": "Türkçe açıklama" }`. Simülasyon kapalıyken emir uçları `503`, simülasyonun kendi 4xx yanıtları `400` olarak döner; arayüz hatayı toast ve satır içi mesajla gösterir.

---

## 7. Fırın → makine eşleme kuralı

Simülasyon fırınları adla gelir (`Aluminyum Eritme Fırını`), ERP makineleri ise profilden kimlikle (`MCH-01`). Sabit kod yoktur; `edge/erp_edge/sim_map.py` iki tarafta da aynı kuralları uygular:

1. **Açık eşleme.** `furnaceMap` içinde fırın adı → makine kimliği varsa o kullanılır.
2. **Ada göre kural.** "eritme / ergitme / ocak" → `FURNACE`, "homojen" → `HOMO_FURNACE` veya `CONT_HOMO`, "yaşlandırma / aging" → `FURNACE`, "biyet / ısıtma / billet" → `FURNACE`, "testere / kesim" → `SAW`, "tabla / döküm" → `CAST_TABLE`.
3. **Kullanılmamış makine.** Aynı tipte, başka fırına atanmamış ilk makine seçilir. Bir makine iki fırına atanmaz.
4. **Eşleşme yoksa veri üretilmez.** Uydurma makine seçilmez; arayüz "eşleşmeyen fırın" uyarısı gösterir.

Örnek profil ve demo simülasyonla sonuç:

| Simülasyon fırını | ERP makinesi | Tip | Kaynak |
| --- | --- | --- | --- |
| Aluminyum Eritme Fırını | MCH-01 · A Fırını | FURNACE | Otomatik kural |
| Homojenizasyon Fırını | MCH-10 · Homojen 1 | HOMO_FURNACE | Otomatik kural |
| Biyet Isıtma Fırını | MCH-02 · B Fırını | FURNACE | Otomatik kural |

Profilde 13 aktif makine vardır; simülasyonda üç fırın olduğu için yalnızca üç makine veri alır. Kalan makineler için okuma üretilmez ve bu durum arayüzde açıkça yazılır.

---

## 8. Edge ajanının `simulation` adaptörü

Adaptör, v1.3'teki `connect / test / readFourSignals / readTelemetry / disconnect` sözleşmesini uygular. Simülasyonun yayınladığı alanları okur; olmayan sinyali uydurmaz.

| Dört sinyal | Kaynak | Kural |
| --- | --- | --- |
| `alarm` | `status` / `durum`, `alarm` | Durum `ALARM` veya alarm metni varsa `fault`, yoksa `ok` |
| `running` | `status` | `ISINIYOR`, `BEKLETIYOR`, `CALISIYOR`, `RUNNING` ise `true` |
| `door` | `signals.door` (senaryo) | `open` / `closed`; yoksa `unknown` yazılır, uydurma `closed` yazılmaz |
| `casting` | `signals.casting` (senaryo) | `pouring` / `idle`; yoksa `unknown` yazılır |

Telemetri olarak makine tipine göre `temperatureC` (ergitme) veya `chamberTempC` (homojen fırın) yazılır; değer simülasyonun `anlik_sicaklik` alanından gelir. Yağ sıcaklığı (`oilTempC`) simülasyonda yayınlanmadığı için atlanır. Kalite her satırda `SIMULATED`, kaynak `ERP-SIM` olur; böylece gerçek PLC verisiyle karışmaz.

Simülasyon kapalıysa `connect` hata verir; collector ajanı durdurmaz, `simulated` yedeğine düşer, bunu `fallback` alanına ve `app_log` tablosuna yazar. Dört sinyal, SQL şeması ve ERP batch sözleşmesi değişmez.

---

## 9. Arayüz: Simülasyon Bağlantısı ekranı

**Entegrasyon → Simülasyon Bağlantısı** ekranı altı bölümden oluşur:

| Bölüm | İçerik |
| --- | --- |
| Bağlantı durumu | Yeşil/sarı/kırmızı nokta, adres, gecikme, demo/kullanıcı modu, son başarılı okuma |
| Özet şerit | Fırın, sıcak fırın, çalışan emir, alarm, edge batch ve okuma sayıları |
| Fırın kartları | Sıcaklık, hedef, maksimum, yüzde, brülör, gaz tüketimi, alarm metni |
| Üretim emirleri | Emir listesi, “Yeni Emir” ve “Başlat”; hatalar satır içi gösterilir |
| Edge ajanı → ERP | Batch/okuma/olay sayıları, son batch, son okumaların kalitesi |
| Eşleme ve geçmiş | Fırın → makine tablosu, eşleşmeyenler; seçilen fırının son 40 okuması |

Davranış kuralları:

* Sayfa **hiçbir zaman** kendini yenilemez; `location.reload()` yoktur.
* Bağlantı kopunca son görüntü "Bağlantı koptu · son veri gösteriliyor" etiketiyle kalır.
* Yenileme 2,5 saniyededir; sekme arka plandayken (`document.hidden`) durur.
* Köprü hiç çalışmıyorsa ekran "Köprü çalışmıyor" der ve çalıştırma komutunu gösterir; diğer ERP ekranları statik olarak çalışmaya devam eder.
* Emir oluşturma/başlatma sırasında düğme kilitlenir; çift tıklama ikinci kayıt üretmez.

### 9.1 Ana ERP ekranlarının canlı beslenmesi (Sürüm 1.5)

Aynı `/api/sim/live` yanıtı dört ana ekranı besler. Amaç, simülasyon verisini ayrı bir bölümde göstermek değil, ERP'yi fabrika testi sırasında gerçek veriyle çalıştırmaktır.

| Ana ekran | Canlı gösterilen | Kaynak |
| --- | --- | --- |
| Panel | Fırın sayısı, ortalama/en yüksek sıcaklık, alarm, çalışan emir, fırın kartları, emir tablosu | `/api/sim/live` |
| Makine Parkı | Fırın → profil makine eşlemesi, sıcaklık, hedef, alarm, durum; diğer profil makineleri ayrı listede | aynı yanıt + `docs/12` profili |
| PLC Durum | Dört sinyal (`door`, `casting`, `alarm`, `running`) ve ayrı telemetri; kapı/döküm simülasyonda yoksa “Bilinmiyor” | aynı yanıt |
| Üretim Akışı | Simülasyon üretim emirleri: oluşturuldu, çalışıyor, tamamlandı, iptal; fırın durum tablosu | aynı yanıt |

**Açma/kapama.** Üst çubuktaki **Canlı simülasyon / Demo veri** düğmesi modu değiştirir; tercih tarayıcıda saklanır. Köprü ilk açılışta yanıt verirse canlı mod otomatik devreye girer. Canlı modda köprü kapalıysa ana ekranlar demo veriye dönmez; “bağlantı yok / son bilinen veri” gösterir.

**Salt okunur.** Canlı modda makine düzenleme, döküm kartı sürükleme ve PLC sinyal değiştirme kapalıdır. Hiçbir ERP koleksiyonuna, stok/maliyet/muhasebe tablosuna yazılmaz. Demo moduna dönüldüğünde bütün işlemler eskisi gibi çalışır.

**Sınır.** Simülasyon yalnızca fırın, emir ve telemetri üretir; malzeme, stok, tedarikçi, cari, fatura ve muhasebe verisi yayınlamaz. Bu ekranlar canlı modda da demo kayıtları gösterir ve sayfa başlığında **DEMO VERİ** etiketi taşır. Canlı fırın verisinden stok veya muhasebe kaydı türetilmez; dört sinyal kuralı ve “PLC'ye yazma yok” ilkesi korunur.

**Yenileme.** Ana ekranlar 3 saniyede bir, yalnızca sekme görünürken REST ile tazelenir. WebSocket yoktur; sayfa yenilenmez. Bir modal veya sürükleme sürerken tazeleme atlanır. Service worker yalnızca uygulama kabuğunu önbelleğe alır; `/api/` yanıtları hiçbir zaman önbellekten okunmaz.

---

## 10. Uçtan uca doğrulama

Sırayla:

1. Kullanıcı simülasyonu `./start.sh 10` ile açılır.
2. Köprü Windows'ta `Baslat.bat`, macOS'te `Baslat.command` çift tıkla (veya `python3 server/sim_bridge/run.py --open`) açılır; tarayıcı canlı **Panel**'de açılır, konsolda eşlemenin `3/3` olduğu görülür. Üst çubukta **Canlı simülasyon** yazar; teşhis için **Entegrasyon → Simülasyon Bağlantısı** açılır.
3. Arayüzde `Homojenizasyon Fırını`, hedef `60 °C`, süre `0.2` dk ile emir oluşturulur ve başlatılır. Kart `ISINIYOR` → `BEKLETIYOR` → `TAMAMLANDI` olur; süre hedefe ulaştıktan sonra işler.
4. `Aluminyum Eritme Fırını`, hedef `900 °C` (güvenlik sınırı 850 °C) ile alarm denenir; kart `ALARM` olur, brülör kapanır.
5. Simülasyon ekranındaki **ERP Test Senaryoları** panelinden `Biyet Isıtma Fırını → Sensör` seçilir. ERP'de zil sayacı artar, üstte kırmızı **Sensör arızası** bandı çıkar, **PLC Durum** ekranında kalite `BAD` ve alarm rozeti `Sensör BAD` görünür. `Senaryoyu sıfırla` ile fırın normale döner. Ayrıntı: `docs/16`.
6. Edge ajanı `8787`'de **Bağlantıyı Test Et** → simülasyon ve ERP köprüsü yeşil; **Şimdi Oku** → 15 okuma (3 fırın × 4 sinyal + 3 telemetri); **Toplu Gönder** → kuyruk `sent`.
7. **Panel**, **Makine Parkı**, **PLC Durum** ve **Üretim Akışı** aynı fırınları, sıcaklıkları ve emirleri gösterir; sayfa başlığında **CANLI SİMÜLASYON** etiketi vardır. Üst çubuktan **Demo veri**ye dönülünce eski demo ekranları geri gelir.
8. Simülasyon ekranında edge batch sayısı, son okumalar ve **son simülasyon olayları** görünür. `outbox` artık `501` değil `200` alır.

Bu depodaki otomatik doğrulama:

```bash
python3 tools/sim_bridge_smoke_test.py    # 18 test
python3 tools/edge_smoke_test.py          # 13 test
node tools/smoke_test.mjs                 # 35 ekran + simülasyon bildirimi
```

Sonuçlar: köprü 18/18, edge 13/13, ekranlar 35/35 ve simülasyon bildirimi tekilleştirme testi geçer. Köprü testi gerçek FastAPI gerektirmez; demo motoru ve sahte istemcilerle ağ davranışını sınar. Ayrıca `linkedom` ile yapılan DOM denetiminde sim ekranı canlı köprüye bağlandı: 3 fırın kartı, emir tablosu, edge sayacı, eşleme tablosu, fırın seçiminde sıcaklık grafiği ve yeni emir modalı çizildi; ağ kesildiğinde sayfa yenilenmeden "Köprü çalışmıyor" uyarısı göründü.

---

## 11. Güvenlik

* Edge batch'i `HMAC-SHA256` ile imzalanır; anahtar köprü ve ajanda aynıdır, arayüzde maskelenir.
* İsteğe bağlı `Bearer` token vardır; boşsa yalnızca imza denetlenir.
* Gövde sınırı 5 MB. Statik sunucu yalnızca `/app/` ve `/index.html` yayınlar; depo kökü, `edge-config.json`, köprü yapılandırması ve `/.git` hiçbir koşulda sunulmaz.
* Simülasyon API'sinde kimlik doğrulama yoktur; bu yüzden yalnızca yerel makinede veya güvenli iç ağda çalıştırılmalıdır. İnternete açılmaz.
* Köprü simülasyona yalnızca emir oluşturma/başlatma yazar; PLC'ye yazma yetkisi yoktur. İlk aşama salt-okunur ilkesi korunur.
* Edge batch'i işletme tablolarına dönüşmez; stok, maliyet ve muhasebe etkisi yoktur.

---

## 12. Sınırlar ve açık işler

1. **Demo kopya ile gerçek simülasyon ayrıdır.** `--demo` üç fırınlı bağımlılıksız vekildir; depodaki `Simulasyon/` ise kullanıcının FastAPI + SQLite simülasyonudur. İkisi de aynı `/api/scenarios` ve `/api/events` sözleşmesini uygular; testler ikisini ayrı ayrı sınar.
2. **WebSocket kullanılmaz.** Bilinçli karardır: yenileme döngüsünü önler. Canlılık Simülasyon Bağlantısı ekranında 2,5, ana ekranlarda 3 saniyelik REST yoklamasıyla sağlanır; saniyelik akış gerekirse köprüye SSE eklenebilir.
3. **`/api/edge/ingest` üretim worker'ı değildir.** Batch'i doğrular ve kayıt defterine yazar; `signalStates`, bakım bildirimi veya stok hareketi üretmez. Gerçek worker `docs/10` aşama 8'dedir.
4. **Kapı ve döküm sinyalleri senaryo ile üretilir.** Normal çalışmada `unknown` görünebilir; `Kapı açık` ve `Döküm başlat` senaryoları bu sinyalleri yayınlar. Gerçek PLC bağlandığında `opcua` / `modbus` adaptörü aynı alanları okur.
5. **Tek köprü / tek ajan.** İkinci bir saha bilgisayarı eklenirse `siteCode` ayrılmalı ve her ajan kendi `clientId` alanıyla gelmelidir.
6. **Gerçek tarayıcı testi** yapılmamıştır; ekran Node duman testi, `linkedom` DOM denetimi ve HTTP istekleriyle doğrulanmıştır. Dokunmatik/tablet davranışı sahada görülmelidir.
7. **Canlı mod yalnızca fırın/emir/telemetri ve simülasyon bildirimlerini kapsar.** Stok, cari ve muhasebe simülasyondan gelmez; bu ekranlar demo kayıtları gösterir ve etiketlenir. Simülasyon olayı bildirimi bir işletme kaydı değildir.
8. **Windows exe'si ve macOS uygulaması depoda hazır değildir.** `Baslat.bat` / `Baslat.command` Python ile hemen çalışır; tek dosya isteniyorsa kendi işletim sisteminde `build_exe.bat` veya `build_macos.sh` bir kez çalıştırılır. Linux'ta ikili dosya üretilmez, yalnızca yerleşim test edilir.
9. **Simülasyon emirleri kalıcı değildir.** Kullanıcı simülasyonu kendi kurallarıyla çalışır; köprü yeniden başlatıldığında yalnızca kendi kayıt defteri korunur.

---

## 13. Gerçek fabrikaya geçiş

Simülasyon bağlantısı bir **test koşumu**dur; üretim hattı değildir. Sahaya geçişte:

1. `edge-config.json` içinde `adapter` → `opcua` veya `modbus`, `connection.ip/port/protokol` gerçek PLC değerleri.
2. Gerçek OPC UA / Modbus sürücüsü takılır; sözleşme ve SQL şeması değişmez.
3. Köprü kapatılır veya yalnızca önizleme için tutulur; `/api/edge/ingest` çağrısı gerçek ERP worker'ına yönlenir.
4. Sıcaklık eşikleri (`warnAt`, `criticalAt`) ve dört sinyalin tag adresleri sahada doğrulanır.
5. İlk aşama salt-okunur kalır; fırın başlatma/durdurma yetkisi PLC/SCADA'da kalır.

Bu geçiş için gereken tek şey yapılandırma ve sürücüdür; ERP ekranı, edge SQL'i ve batch sözleşmesi aynı kalır.
