# ai-icin — Alüminyum Dökümhane ERP

Bu depo, sohbette tarif edilen **alüminyum biyet dökümhanesi** için uçtan uca ERP planını, çalışan bir web prototipini ve firma sunucusundaki `ERP/` klasörünün dosya tabanlı modelini içerir. Genel dökümhane planı değil; sürekli döküm, ergitme, testere, homojenizasyon, soğutma, paketleme ve iki onaylı sevkiyat akışı esas alınır.

**Sürüm:** 1.5.0 · Canlı Simülasyon Ana Ekranları · `schemaVersion: 4` · **35 ekran + 1 saha arayüzü + 1 simülasyon köprüsü** · **59 varlık** · **16 doküman**

---

## 1. Depoda ne var?

| Yol | İçerik |
| --- | --- |
| `docs/00-ham-gereksinimler.md` | İlk sohbetteki kullanıcı mesajlarının ham metni (kaynak girdi) |
| `docs/01-uctan-uca-surec-raporu.md` | **Satın almadan sevkiyata kadar** şekilsiz/şemasız, yalnızca başlık + anlatım süreç raporu |
| `docs/02-faz1-plan.md` | Faz 1: Satın Alma + Hammadde/Stok detaylı planı, sayfa yapısı, roller, 8 haftalık sıra |
| `docs/03-ana-plan-dokumani.md` | Ana plan: 12 modül, teknik mimari, UI, fazlar, sektörel sapma düzeltmeleri, saha ve genel ERP genişlemesi |
| `docs/04-teknik-mimari-kararlar.md` | İlk sohbette **cevapsız kalan** mimari soruların cevabı; iki mod, dört PLC sinyali, olay arşivi, tek kayıt çok etki |
| `docs/05-veri-modeli-ve-ekranlar.md` | **59 varlık**, JSON şemaları, hesap kuralları, API uçları, **35 ekran** envanteri, ticari/finansal ve modüler kurulum şemaları |
| `docs/06-saha-gorusmesi-duzeltilmis-metin.md` | **Ses kaydının düzeltilmiş, anlaşılır teknik anlatımı**: terim düzeltmeleri, sitenin düzenlemesinin değerlendirilmesi, abiye sorulacak 8 soru |
| `docs/07-uretim-hesap-motoru.md` | 6300/6000/300/3 mm, Ø178, yoğunluk; kafa, talaş, yolluk, 21/18/17/14 ton kütle dengesi; yağ ve bıçak ömrü |
| `docs/08-moduler-makine-ve-merkezi-yonetim.md` | Boş makine parkı, fabrika profilleri, `MANUAL`/`PLC` modları, dört sinyal, tek makine kaynağı, güvenli çıkarma, sihirbaz ve modül kaydı |
| `docs/09-olay-tabanli-json-arsivleme.md` | Her aşamadan bir satır: olay şeması, `inbox`/`archive` ayrımı, silme yerine doğrulama, geri yükleme |
| `docs/10-kurulum-ve-yol-haritasi-v2.md` | Mini PC ile kurulum, aşama sırası, Sürüm 1.1 eki, riskler ve doğrulanacaklar |
| `docs/11-genel-erp-karsilastirma-ve-bosluk-analizi.md` | **Genel ERP metninin modül bazında karşılaştırması**, bulunan boşluklar, eklenenler ve kasten kapsam dışı bırakılanlar |
| `docs/12-saha-kurulum-ve-modul-yasam-dongusu.md` | **Gerçek fabrikaya kolay bağlanma**: profil paketi, 1 / 2 / 5 fırın, kurulum sihirbazı, makine ekleme-çıkarma, modül kaydı, adaptör sözleşmesi |
| `docs/13-edge-veri-toplama-ajani.md` | **Fabrikadaki tek bilgisayar için exe**: sıcaklık/alarm/sensör okuma, yerel SQLite, imzalı ERP gönderimi, Türkçe canlı arayüz |
| `docs/14-simulasyon-baglantisi.md` | **Fabrika testinden önce simülasyon**: köprü mimarisi, fırın → makine eşlemesi, canlı ekran, imzalı ingest, güvenlik ve sınırlar |
| `docs/15-erp-sistemi-kapsamli-ozet.md` | **Tek parça sistem özeti**: 35 ekran, 59 varlık, iş akışları, hesaplar, dört sinyal, edge ve köprü |
| `docs/Dokumhane-ERP-Plan.docx` | **16 dokümanın tamamını** birleştiren tek **Word** dosyası ("AI'a atılacak" çıktı) |
| `app/` | Çalışan PWA prototipi: bağımlılık yok, saf HTML/CSS/JS, **35 ekran**, `calc.js` + `posting.js` + `modularity.js` + `adapters.js`, canlı simülasyon modu |
| `server/erp/` | Firma sunucusundaki `ERP/` klasörünün modeli: **59 JSON dosyası**, olay kuyruğu, arşiv, worker'lar |
| `edge/` | **Fabrikadaki tek bilgisayar**: `ERP-Edge-Collector.exe` kaynağı, SQLite şeması, adaptörler (`simulation` dahil), yerel web arayüzü, PyInstaller spec ve kurulum betikleri |
| `server/sim_bridge/` | **Simülasyon köprüsü**: ERP Studio'yu `:8080` üzerinden kullanıcı simülasyonuna (`:8000`) bağlar; ana Panel, Makine Parkı, PLC ve Üretim ekranlarını canlı besler, imzalı edge ingest sunar |
| `Baslat.bat`, `Baslat.command` | **Windows / macOS çift tık**: köprüyü başlatır, tarayıcıyı doğrudan canlı Panel'de (`#/dashboard`) açar |
| `tools/` | Word üretici, seed aktarımı, ikon üretici, duman testi, **edge ajanı** ve **simülasyon köprüsü** duman testleri |

---

## 2. Prototipi çalıştırma

**En kolay yol (Windows veya macOS):** fırın simülasyonunuz `localhost:8000` üzerinde çalışırken depo kökündeki başlatıcıya çift tıklayın; köprü kendiliğinden başlar ve tarayıcı `http://localhost:8080/app/#/dashboard` adresinde, canlı Panel'de açılır. Ayrı komut veya adres yazmak gerekmez. Açılan pencere köprüdür, açık kaldıkça çalışır.

| Platform | Çift tık | Tek dosya program (isteğe bağlı, bir kez) |
| --- | --- | --- |
| Windows | `Baslat.bat` | `server\sim_bridge\build_exe.bat` → `dist\ERP-Sim-Bridge.exe` |
| macOS | `Baslat.command` | `server/sim_bridge/build_macos.sh` → `dist/ERP-Sim-Bridge.app` |

Windows'ta ayar ve veri exe'nin yanında; macOS'ta `~/Library/Application Support/ERP-Sim-Bridge` altında oluşur. macOS uygulaması imzasızdır; ilk açılışta sağ tık → Aç gerekebilir.

Bağımlılık kurulumu gerekmez. Depo kökünde:

```bash
python3 server/sim_bridge/run.py --open   # ERP + simülasyon köprüsü, :8080 + tarayıcı
```

Tarayıcıdan `http://localhost:8080/app/` adresine girilir; kök `index.html` otomatik yönlendirir. Yalnızca statik arayüz yeterliyse `python3 -m http.server 8080 --bind 0.0.0.0` de çalışır; ancak simülasyon ekranı ve edge ingest yalnızca köprü açıkken çalışır. Tablet ve PC aynı LAN'daki mini PC'nin IP'siyle erişir, PWA olarak yüklendiğinde masaüstünde kısayol ikonu oluşur. İnternet olmadan üretim devam eder; SMS, e-posta ve raporlar `outbox` kuyruğunda bekler.

Veriyi sıfırlamak için **Ayarlar → Demo Verisini Sıfırla**. Yerel depolama anahtarı şema sürümüne bağlıdır (`erp_demo_state_v4`), böylece eski sürümden kalan eksik veri ekranları bozmaz. Yeni bir fabrikayı koda dokunmadan tanımlamak için **Saha Kurulum Sihirbazı** (`#/setup`) kullanılır.

---

## 3. Sohbetten çıkan ana kararlar

1. **Alüminyum biyet dökümhanesi.** Kum döküm, kalıp/model, maça, pik demir, CNC ve NDT gibi genel dökümhane modülleri kapsam dışıdır.
2. **Faz sırası korunur.** Faz 1 Satın Alma + Hammadde/Stok, Faz 2 Üretim. Sonraki genişlemeler bu sırayı bozmaz.
3. **Değişken kart yapısı.** Malzeme, kategori, birim, fiyat, kritik eşik, reçete, makine tipi ve eşikler kullanıcı tanımlıdır; sabit ürün listesi yoktur.
4. **Hurda kırıcıya da girebilir, doğrudan üretime de.** Mal kabul brüt, fire ve net olarak ayrı kaydedilir.
5. **Modern, sade, dokunmatik arayüz.** Windows 98 görünümü ve PC-only WinForms reddedildi; sürükle-bırak, tablet, koyu tema, PWA kısayolu var.
6. **Operatör ekranı ile geliştirici merkezi yönetim ekranı ayrı.** Modüler makine parkı fabrika operatörü için değil, yazılımı geliştiren ekip içindir.
7. **İlk açılışta hiçbir makine tanımlı değildir.** Makine tipleri, kapasiteler, döküm yolları ve 1 / 1,5 / 2 ton tutma miktarları fabrikaya göre eklenir.
8. **İki mod, dört sinyal.** `MANUAL` ve `PLC`; başlangıçta yalnızca kapı, döküm modu/devrilme, alarm ve çalışma okunur.
9. **Kütle dengesi ve kesim hesabı.** 21 / 18 / 17 / 14 ton zinciri, 6300/6000/300/3 mm, Ø178 ve 2700 kg/m³; kafa geri ergitilir, talaş ayrı kaydedilip dışarı satılır.
10. **Olay tabanlı arşiv.** Her aşamadan bir JSON olayı; `inbox` kuyruğu silinmez, doğrulanıp `archive/YYYY/MM/DK-.../events.jsonl` altına yazılır.
11. **Kapalı çevrim.** LAN içinde üretim, internet gelince kuyruktaki SMS/e-posta/rapor, düzenli harici disk yedeği, VPN + MFA + RBAC ile uzaktan erişim; doğrudan IP açılmaz.
12. **Şekil ve şema çizilmez.** `docs/01` yalnızca başlık ve anlatımdır; diğer dokümanlarda tablo kullanılır, kutu çizimi ve ok şeması yoktur.
13. **Tek kayıt, çok etki (Sürüm 1.1).** Onaylanan bir sevkiyat stok, fatura, muhasebe fişi, cari bakiye, maliyet, olay, bildirim ve rapor kuyruğunu tek işlemde üretir.
14. **Modüler saha kurulumu (Sürüm 1.2).** Aynı yazılım 1, 2 veya 5 fırınlı fabrikaya kod değişikliği olmadan bağlanır; makineler eklenir, gerekçeyle devre dışı bırakılır (silinmez), fabrika profili JSON olarak indirilir/içe alınır, modüller ve PLC adaptörleri veriyle yönetilir.
15. **Edge veri toplama ajanı (Sürüm 1.3).** Fabrikadaki tek bilgisayarda çalışan exe, dört sinyale ek olarak sıcaklık gibi ölçümleri okur; önce yerel SQLite'a yazar, imzalı batch ile ERP'ye gönderir, çevrimdışıyken kuyruğu korur. Bu exe ERP arayüzü değildir; PWA ve tarayıcı kararı değişmez.
16. **Simülasyonla ön doğrulama (Sürüm 1.4–1.5).** Gerçek fabrika testinden önce aynı ERP zinciri kullanıcı fırın simülasyonuna bağlanır. Tarayıcı doğrudan simülasyona gitmez; aynı kökende çalışan köprü REST ile okur, fırın adlarını profil makinelerine eşler ve imzalı edge batch'lerini kabul eder. Sürüm 1.5'te canlı veri ana Panel, Makine Parkı, PLC Durum ve Üretim Akışı ekranlarına taşınır; üst çubuktan demo veriye dönülür.
17. **Maliyet nesnesi döküm kodudur.** Genel ERP'deki proje modülü burada `DK-...` partisi olarak tercüme edilir; bordro, CAD/BIM ve kampanya CRM'i kasten dışarıda kalır.
18. **Belirsiz terimler sabitlenmez.** `PIS`, `GNSL`, `Stone`, `Barsa piyazesi` ve `Saf küçük` için `docs/06` Bölüm 5'teki 8 soru hâlâ açıktır.

---

## 4. Prototipteki ekranlar (35)

| Grup | Ekranlar |
| --- | --- |
| Genel | Panel |
| Satın Alma | Malzeme Tanımları, Satın Alma Emirleri, Fiyat Takibi, Tedarikçiler, **Talep & Teklif Akışı** |
| Hammadde & Stok | Stok Durumu, Mal Kabul, Kırıcı & Fire, Stok Hareketleri |
| Üretim | Üretim Akışı (sürükle-bırak), Reçeteler, Homojenizasyon Partisi, Olay & Arşiv |
| Makine & Kurulum | Makine Parkı, Döküm Yolları, Kesim Hesap Motoru, Yağ & Bakım, PLC Durum |
| **Ticari & Finans** | **Satış Siparişleri**, **Müşteriler & Cari**, **Muhasebe & Fişler**, **Maliyet & Kârlılık** |
| **Depolama & Personel** | **Depo, Rezervasyon & Sayım**, **Personel & Vardiya** |
| Sevkiyat | Sevkiyat & Onaylar, Arşiv |
| Raporlama | Raporlar & İstatistik |
| **Entegrasyon** | **Entegrasyon Matrisi**, **Simülasyon Bağlantısı** |
| Yönetim | **Saha Kurulum Sihirbazı**, **Modül Kaydı**, Merkezi Yönetim |
| Sistem | Bildirimler & Kuyruk, Ayarlar |

Kalın olan 8 ekran Sürüm 1.1'de, **Saha Kurulum Sihirbazı** ve **Modül Kaydı** Sürüm 1.2'de eklendi; gerekçeler `docs/11` ve `docs/12` içindedir. Sürüm 1.3 ERP'ye ekran eklemez; `edge/` altına fabrikadaki tek bilgisayar için ayrı bir exe ve kendi arayüzünü ekler (`docs/13`). Sürüm 1.4, `docs/14` ile gelen **Simülasyon Bağlantısı** ekranını ekler; bu ekran fabrika testinden önce fırın verisini, emirleri ve edge kuyruğunu canlı gösterir. Sürüm 1.5 aynı veriyi **ana Panel, Makine Parkı, PLC Durum ve Üretim Akışı** ekranlarına taşır; canlı mod salt okunurdur ve stok/cari/muhasebe kayıtlarına dokunmaz.

---

## 5. Sürüm 1.1–1.5'te kapatılan boşluklar

Genel ERP anlatımı bu projeye uygulandığında en büyük eksik **modül sayısı değil, departmanlar arası otomatik veri akışıydı**. Önceki sürüm üretim, kütle dengesi ve olay günlüğünde güçlüydü; müşteri kartı, satış siparişi, satın alma talebi, hesap planı, muhasebe fişi, mizan, fatura, cari bakiye, ürün maliyeti, bütçe, depo lokasyonu ve vardiya yoktu.

| Eklenen | Neden | Nerede |
| --- | --- | --- |
| 18 yeni koleksiyon, `schemaVersion: 3` | Ticari ve finansal kayıtlar ortak veri modeline bağlandı | `app/js/seed.js`, `server/erp/data/` |
| Tek `machines` kaynağı | `furnaces` projeksiyon oldu, `F20`/`F35`/`P1`/`MCH-08` sabitleri kaldırıldı | `app/js/seed.js`, `app/js/store.js` |
| Güvenli makine çıkarma | Bağımlılık raporu + gerekçe + geri alma; hiçbir geçmiş kayıt silinmez | `app/js/modularity.js`, `engineering.js` |
| Fabrika profil paketi | İndir / kopyala / içe al; 5 fırın → 1 fırın veya 2 fırın | `app/js/modularity.js`, `views/setup.js` |
| Kurulum sihirbazı | Fabrika → makine → yol → bağlantı → modül, beş adım | `app/js/views/setup.js` |
| Modül kaydı ve adaptör | Menü/kurallar veriyle filtrelenir, `MANUAL` yedek garanti | `app/js/modularity.js`, `app/js/adapters.js` |
| `app/js/posting.js` | KDV, çift taraflı fiş, mizan, maliyet, kredi kontrolü ve KPI saf hesap modülü | Saf JS, Node'da test edilir |
| 8 yeni ekran | Cari, sipariş, talep, muhasebe, maliyet, depo, vardiya, entegrasyon | `app/js/views/enterprise.js` |
| Entegrasyon matrisi | Bir onaydan sekiz koleksiyona atomik yazım, `clientId` ile çift yazım engeli | `integrationRules`, `Entegrasyon Matrisi` |
| Genişletilmiş doğrulama | Borç = alacak, KDV, fatura tutarı, maliyet toplamı, sayım farkı, dönem kapanışı | `validate_data.py`, `smoke_test.mjs` |
| `docs/11` + güncellenen 5 doküman | Karşılaştırma, boşluk analizi ve kapsam dışı kararların gerekçesi | `docs/`, tek Word çıktısı |
| `docs/12` + 34. ekran | Saha kurulum, profil paketi, modül yaşam döngüsü, adaptör sözleşmesi | `docs/12`, `app/js/views/setup.js` |
| `edge/` exe ajanı | Sıcaklık/alarm okuma, yerel SQL, imzalı ERP gönderimi, canlı arayüz | `edge/main.py`, `edge/erp_edge/`, `docs/13` |
| `docs/13` + 14. doküman | Saha otomasyonu ile ERP arasındaki köprü ve sınırları | `docs/13`, tek Word çıktısı |
| `server/sim_bridge/` + `docs/14` | Fabrika testinden önce simülasyonla uçtan uca doğrulama; CORS/port ve WebSocket yenileme sorununu köprüsüz çözer | `server/sim_bridge/`, `app/js/views/sim.js`, `docs/14` |
| `simulation` adaptörü | Edge ajanı simülasyon REST uçlarını okur; eşleşmeyen fırın için veri uydurmaz | `edge/erp_edge/adapters.py`, `edge/erp_edge/sim_map.py` |

Kasten eklenmeyenler: bordro ve özlük, kampanya CRM'i, inşaat proje kartı, AutoCAD/BIM, perakende POS, e-fatura, banka mutabakatı, KDV beyannamesi, çoklu para birimi. Kaynak metindeki otel/elektrik taahhüt örneği bu fabrikaya uygulanmadı.

---

## 6. Kontroller ve testler

```bash
node tools/smoke_test.mjs                              # 35 ekran + hesaplar + mizan + profil + çıkarma + adaptör + canlı mod
python3 server/erp/scripts/validate_data.py           # 58 koleksiyon, referans, finansal ve modüler bütünlük
node tools/export_seed.mjs                            # 59 JSON + manifest (schema_version: 4)
python3 server/erp/scripts/event_worker.py --dry-run  # kuyruk simülasyonu (silmez)
python3 server/erp/scripts/plc_poller.py --dry-run    # dört sinyal kuralı
python3 server/erp/scripts/outbox_worker.py --dry-run # çevrimdışı kuyruk
python3 server/erp/scripts/backup.py --no-external    # yedek + checksum
python3 tools/edge_smoke_test.py                       # exe ajanı: 13 test
python3 tools/sim_bridge_smoke_test.py                 # simülasyon köprüsü: 16 test
python3 edge/main.py --dry-run                         # tek döngü, yazmadan
python3 edge/main.py --bind 0.0.0.0 --port 8787       # saha arayüzü (önizleme)
python3 tools/build_docx.py                           # 16 dokümanı tek Word'e derle
```

Son doğrulama sonuçları: 35 menü / 35 ekran eşleşiyor, mizan borç = alacak, 1 ve 2 fırınlı profil testleri geçti, 58 koleksiyonda 0 hata ve 1 bilgilendirici uyarı, **edge ajanının 13 testi**, **simülasyon köprüsünün 16 testi** ve 11 JSON ucu geçti, 16 doküman geçerli OOXML Word çıktısında birleşti.

> **Sınır:** Bu bir plan doğrulama prototipidir. Gerçek API/veritabanı, RBAC/VPN, OPC UA/Modbus sürücüsü, SMTP/SMS sağlayıcısı ve PLC donanımı bağlı değildir. Simülasyon köprüsü de üretim ingest worker'ı değildir: imzalı batch'i doğrular ve kendi kayıt defterine yazar, işletme tablolarını değiştirmez. Canlı kurulumda doğruluk kaynağı işlemsel veritabanı, JSON dosyaları arşiv ve aktarım görünümüdür.

---

## 7. Fabrikadaki bilgisayar (Sürüm 1.3)

ERP'nin kullanıcı arayüzü hâlâ tarayıcıdaki PWA'dır. `edge/` klasöründeki program **farklı bir yazılımdır**: fabrikadaki tek veri toplama bilgisayarında çalışan `ERP-Edge-Collector.exe`. Ocak içi sıcaklık, alarm ve diğer sensör verilerini okur, `data/edge.db` SQLite veritabanına yazar, HMAC imzalı `POST /api/edge/ingest` ile ERP'ye gönderir; ERP yoksa kuyruğu silmeden bekletir. Kendi Türkçe arayüzü `http://127.0.0.1:8787` adresindedir.

```bash
python3 edge/main.py --dry-run                     # bu depoda, yazmadan tek döngü
python3 edge/main.py --once                        # SQL + kuyruk
python3 edge/main.py --bind 0.0.0.0 --port 8787    # canlı saha arayüzü
python3 tools/edge_smoke_test.py                   # 13 test
```

`edge-config.json` içindeki `adapter` değeri fabrika testinden önce `simulation`, üretimde `opcua` veya `modbus` olur. Simülasyon adresi `simulation.baseUrl` alanındadır.

Windows ikilisi bu Linux ortamında üretilemediği için depoya konmamıştır; `edge/build_exe.bat` Windows'ta tek komutla `dist\ERP-Edge-Collector.exe` dosyasını üretir, `edge/install-task.ps1` otomatik başlatmayı kurar. Ayrıntılar `docs/13` içindedir.

Aynı sınır simülasyon köprüsü için de geçerlidir: `Baslat.bat` / `Baslat.command` Python ile hemen çalışır; tek dosya uygulama isteniyorsa kendi işletim sisteminde `build_exe.bat` (Windows) veya `build_macos.sh` (macOS) bir kez çalıştırılır.

---

## 8. Simülasyonla ön doğrulama (Sürüm 1.4–1.5)

Kullanıcının fırın simülasyonu (`erp_backend`, varsayılan `:8000`) ile ERP Studio arasına aynı kökende çalışan bir köprü girer. Böylece tarayıcı CORS veya farklı port sorunu yaşamaz; WebSocket kullanılmadığı için "bağlantı koptu → sayfa yenilendi" döngüsü oluşmaz.

```bash
# 1) Kullanıcı simülasyonu (kendi klasöründe)
./start.sh 10

# 2) Depo kökündeki başlatıcıya çift tık: Baslat.bat (Windows) / Baslat.command (macOS).
#    Komut satırından (geliştirici):
python3 server/sim_bridge/run.py --open               # sim :8000 → ERP :8080 + tarayıcı
python3 server/sim_bridge/run.py --demo --demo-speed 10   # simülasyon kapalıysa demo kopya
python3 server/sim_bridge/run.py --check              # yalnızca bağlantı + eşleme

# 3) Edge ajanı (isteğe bağlı; adapter = simulation)
python3 edge/main.py --bind 0.0.0.0 --port 8787 --no-browser
```

**Ana ekranlar artık simülasyonla çalışır.** Köprü açıkken **Panel**, **Makine Parkı**, **PLC Durum** ve **Üretim Akışı** demo kayıtları yerine canlı fırın, emir, sıcaklık ve alarm verisini gösterir. Üst çubuktaki **Canlı simülasyon / Demo veri** düğmesiyle mod değiştirilir; canlı mod salt okunurdur ve stok/cari/muhasebe tablolarına yazmaz. **Simülasyon Bağlantısı** ekranı bağlantı, emir oluşturma ve edge teşhisi için kalır; 2,5 saniyede bir sessizce yenilenir, `location.reload()` çağırmaz. Simülasyon kapanırsa ana ekranlar “bağlantı yok / son veri” gösterir, demo veriye dönmez.

Edge ajanı simülasyondan dört sinyali ve sıcaklığı okur; simülasyonda kapı/döküm sinyali olmadığı için bunları `unknown` yazar. Fırın adları `furnaceMap` veya "eritme / homojen / yaşlandırma / testere" kurallarıyla profil makinelerine eşlenir; eşleşmeyen fırın için veri üretilmez. İmzalı batch `POST /api/edge/ingest` ile köprüye düşer ve edge `outbox` kaydı **sent** olur. Ayrıntılar `docs/14` içindedir.

---

## 9. Sonraki adım

1. `docs/06` Bölüm 5'teki 8 soruyu mühendisle kapatmak (özellikle 17 tondan 14 tona düşüşün dağılımı ve 300 mm kafa payı).
2. `docs/10` aşama 8: gerçek API + veritabanı + RBAC; fiş, stok ve cari yazımlarını tek transaction içine almak. `/api/edge/ingest` worker'ını kurmak (simülasyon köprüsü bunun yerine geçmez).
3. `docs/10` aşama 9: gerçek OPC UA / Modbus sürücüsünü `edge/erp_edge/adapters.py` sözleşmesine takmak; sıcaklık eşiklerini sahada doğrulamak.
4. Standart maliyet ve stok değerleme yöntemini (ağırlıklı ortalama / FIFO) netleştirmek.
5. e-Fatura, banka mutabakatı ve KDV entegrasyonlarını ayrı servis olarak eklemek.
6. `docs/Dokumhane-ERP-Plan.docx` dosyasını yapay zekâya verip genel yazılım altyapı şemasını oluşturmak — sohbetin en baştaki hedefi için girdi hazırdır.
