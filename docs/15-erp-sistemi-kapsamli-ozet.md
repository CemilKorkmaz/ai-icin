# 15 — ERP Sistemi Kapsamlı Özeti: Ne Var, Ne Takip Ediyor, Nasıl Çalışıyor

**Amaç:** Bu doküman, bugüne kadar kurulan ERP sisteminin tamamını tek bir yerde, sade dille anlatır. Hangi ekranın ne işe yaradığını, hangi verinin tutulduğunu, hesapların nasıl yapıldığını, sahadaki veri toplama ajanının ve simülasyon köprüsünün zincirin neresinde durduğunu açıklar. Diğer dokümanlardaki ayrıntıların yerini almaz; onların üzerine **bütün resmi** verir.

**Kime hitap eder:** Sistemi kullanacak fabrika yöneticisi, üretim şefi, depo ve sevkiyat sorumlusu; ayrıca sistemi kuracak ve geliştirecek teknik ekip.

**Kapsam:** Sürüm 1.7.0 itibarıyla **35 ERP ekranı**, **59 veri varlığı**, **1 saha veri toplama arayüzü** ve **1 simülasyon köprüsü**. Şekil, kutu diyagramı ve ok şeması kullanılmaz; anlatım prose ve tablolarla yürür.

---

## 1. Tek cümlede sistem

Bu sistem, alüminyum biyet dökümhanesinin **satın almadan sevkiyata kadar** bütün akışını tarayıcıda çalışan tek bir arayüzde izleyen, makine sinyallerini **okuyan ama PLC'ye yazmayan**, sahadaki tek bilgisayarda çalışan bir veri toplama ajanıyla beslenen ve gerçek fabrika testinden önce fırın simülasyonuna bağlanabilen bir **plan doğrulama prototipidir**.

Kısaca üç ayrı görev vardır:

1. **İş kayıtlarını tutmak:** malzeme, satın alma, stok, üretim, kalite, maliyet, satış, tahsilat, sevkiyat ve arşiv.
2. **Sahadan veri toplamak:** dört kontrol sinyali ve sıcaklık gibi ölçümleri okumak, yerel veritabanına yazmak, çevrimdışıyken kuyruğa almak ve ERP'ye imzalı paketle göndermek.
3. **Fabrika öncesi sınamak:** aynı ERP zincirini kullanıcının kendi fırın simülasyonuna bağlayarak gerçek PLC'ye gitmeden uçtan uca denemek.

---

## 2. Hangi sorunları çözüyor?

| Sorun | Sistemin cevabı |
| --- | --- |
| Bilgi Excel, WhatsApp ve kâğıtta dağınık | Tek arayüzde 59 varlık ve 35 ekran; aynı kayıt her yerde aynı kimlikle görünür |
| Makine çalışıyor mu, alarm var mı belirsiz | Dört sinyal (`door`, `casting`, `alarm`, `running`) ve sıcaklık telemetrisi canlı izlenir |
| Operatör aynı bilgiyi 5 yere giriyor | Tek kayıt, çok etki: bir onay stok, fatura, fiş, cari, maliyet, bildirim ve olay üretir |
| İnternet kesilince üretim duruyor | Tarayıcı önce yerel çalışır; edge ajanı çevrimdışıyken kuyrukta bekler, kayıt silinmez |
| Her fabrika farklı makine parkına sahip | Profil paketi ve modül kaydı ile 1, 2 veya 5 fırınlı fabrika kod değişmeden kurulur |
| Gerçek PLC'ye bağlanmadan önce deneme yapılamıyor | Simülasyon köprüsü fırın simülasyonunu ERP'ye bağlar; aynı ekran, aynı kurallar, aynı kuyruk |
| Veri kayboluyor, geçmiş değiştiriliyor | Silme yerine doğrulama; olay günlüğü, `inbox`/`archive` ayrımı, yedek ve checksum |

---

## 3. Sistemin katmanları

Sistem dört katmandan oluşur. Her katmanın görevi ayrıdır ve hiçbiri diğerinin veritabanına doğrudan yazmaz.

| Katman | Nerede çalışır | Görevi | Veri deposu |
| --- | --- | --- | --- |
| ERP Studio (PWA) | Tarayıcı, `:8080` | 35 ekran, operatör girişi, hesaplar, raporlar | Tarayıcı yerel depolaması; sunucuda JSON arşivi |
| Sunucu modeli | `server/erp/` | 59 varlığın JSON karşılığı, olay kuyruğu, worker'lar, yedek | `server/erp/data/*.json`, `inbox/`, `archive/` |
| Edge ajanı | Fabrikadaki tek bilgisayar, `:8787` | Sinyal ve sıcaklık okuma, yerel SQL, imzalı gönderim | `edge/data/edge.db` (SQLite) |
| Simülasyon köprüsü | Geliştirme/ön test bilgisayarı, `:8080` | Arayüzü sunma, simülasyon REST proxy'si, imzalı batch kabulü | `server/sim_bridge/data/ingest.db` |

**Veri akışı, tek yönlü olarak şöyledir:**

1. Operatör tarayıcıda mal kabul, üretim veya sevkiyat kaydı girer.
2. Bu kayıt önce tarayıcıdaki yerel duruma yazılır; ekran anında güncellenir.
3. Edge ajanı sahadaki PLC'den veya simülasyondan dört sinyali ve telemetriyi okur.
4. Okunan her değer önce `edge.db` içine, sonra `outbox` kuyruğuna yazılır.
5. Ajan, paketi HMAC-SHA256 ile imzalayıp ERP'nin `/api/edge/ingest` ucuna gönderir.
6. Paket HMAC imzası ve `batchId` ile doğrulanır. Üretim worker'ı bağlıysa `signalStates` ve telemetri kayıtları üretilir; prototipte köprü yalnızca kendi kayıt defterine yazar. **Stok, maliyet, muhasebe ve cari tablolarına dokunulmaz.**
7. Simülasyon köprüsü açıksa ana Panel, Makine Parkı, PLC Durum ve Üretim Akışı fırın sıcaklığını, alarmı ve emirleri 3 saniyede bir; Simülasyon Bağlantısı ekranı teşhis verilerini 2,5 saniyede bir REST ile tazeler.

---

## 4. Veri modeli: neleri takip ediyoruz?

Sürüm 1.7.0 itibarıyla **59 varlık** vardır; `manifest.json` hariç sunucuda 59 JSON dosyası bulunur. Şema sürümü `4`'tür. Her kayıt bir `id` taşır; çoğu kayıt `createdAt`, `updatedAt`, `plantId` ve kaynak belge kimliği ile izlenir. Makine kimlikleri sabit kodlanmaz; fabrika profilinden gelir.

| Alan | Varlıklar | Ne tutulur |
| --- | --- | --- |
| Fabrika ve makine | `plants`, `machines`, `machineTypes`, `furnaces`, `castingPaths`, `plcConnections`, `plcTags`, `machineAliases` | Tesis, makine tipi, kapasite, mod (MANUAL/PLC), aktiflik, döküm yolu, PLC adresi, eski kod eşlemesi |
| Üretim | `recipes`, `lots`, `signalStates`, `oilRules`, `bladeRules`, `maintenanceEvents`, `homogenizationRecipes`, `homogenizationBatches`, `coolingBatches`, `byProductFates` | Reçete, döküm kodu, dört sinyalin son durumu, yağ/bıçak sayaçları, bakım, homojenizasyon ve soğutma partileri, yan ürünün kaderi |
| Satın alma | `materials`, `categories`, `units`, `suppliers`, `purchaseRequests`, `purchaseQuotes`, `purchaseOrders`, `priceHistory` | Değişken malzeme kartı, tedarikçi, talep, teklif, emir ve fiyat geçmişi |
| Stok | `receipts`, `crusher`, `movements`, `stockCounts`, `warehouses`, `reservations` | Mal kabul (brüt/fire/net), kırıcı, stok hareketi, sayım farkı, depo lokasyonu, rezervasyon |
| Ticari | `customers`, `quotations`, `salesOrders`, `invoices` | Müşteri, teklif, satış siparişi, satış/alış faturası |
| Finans | `accounts`, `journalEntries`, `payments`, `costRecords`, `budgets`, `periodClosures` | Hesap planı, borç/alacak fişi, tahsilat/ödeme, döküm kodu maliyeti, bütçe, dönem kapanışı |
| Sevkiyat ve arşiv | `shipments`, `events` | İki onaylı sevkiyat, geçmiş belge, olay satırı |
| Yönetim ve sistem | `users`, `moduleRegistry`, `plantModules`, `profilePackages`, `adapterContracts`, `setupDrafts`, `vendorUpdates`, `settings`, `notifications`, `outbox`, `inboxQueue`, `activity`, `integrationRules` | Kullanıcı, modül kaydı, profil paketi, adaptör sözleşmesi, kurulum taslağı, ayar, bildirim, giden kutu, olay kuyruğu, entegrasyon matrisi |

### 4.1 Kayıtların ortak özellikleri

- **Tek kimlik:** Bir sevkiyat, faturası, fişi ve stok hareketi aynı `sourceId` ve `clientId` ile birbirine bağlanır.
- **Çift yazım engeli:** Aynı `clientId` ikinci kez gelirse yeni kayıt üretilmez; işlem idempotenttir.
- **Silme yerine doğrulama:** Olay ve kuyruk kayıtları silinmez; `dead` işaretlenir, geçmiş korunur.
- **Fabrika ayrımı:** Her kayıt `plantId` taşır; aktif fabrika dışındaki makineler taranmaz.
- **Kalite etiketi:** Sensör verisi `GOOD`, `SIMULATED`, `STALE` veya `BAD` olarak işaretlenir; simülasyon verisi gerçek ölçüm gibi raporlanmaz.

---

## 5. 35 ekran: her biri ne yapar?

Menü 12 grupta toplanır. Aşağıdaki tablo, ekranların tamamını ve günlük işlevini özetler.

| # | Ekran | Grup | Ne yapar, hangi veriyi kullanır |
| --- | --- | --- | --- |
| 1 | Panel | Genel | KPI kartları, açık işler, alarm ve yaklaşan bakım uyarıları, hızlı erişim |
| 2 | Malzeme Tanımları | Satın Alma | Değişken malzeme kartı: kategori, birim, fiyat, kritik eşik, reçete ve makine tipi bağlantısı |
| 3 | Satın Alma Emirleri | Satın Alma | Emir oluşturma, onay durumu, kısmi/tam karşılama, tedarikçi ve teslim tarihi |
| 4 | Fiyat Takibi | Satın Alma | Malzeme ve tedarikçi bazında fiyat geçmişi, son fiyat, trend ve karşılaştırma |
| 5 | Tedarikçiler | Satın Alma | Tedarikçi kartı, iletişim, bakiye, ödeme koşulu ve performans |
| 6 | Talep & Teklif Akışı | Satın Alma | Talep → teklif toplama → teklif seçimi → satın alma emri zinciri; onay izi |
| 7 | Stok Durumu | Hammadde & Stok | Malzeme bazında mevcut, rezerve, kritik eşik ve stok değeri |
| 8 | Mal Kabul | Hammadde & Stok | Brüt, fire ve net miktar; emirle eşleştirme; stok girişi ve fiyat geçmişi |
| 9 | Kırıcı & Fire | Hammadde & Stok | Hurda/fire kaydı; tekrar fırına, döngüsel, satış veya atık kaderi; kütle dengesi |
| 10 | Stok Hareketleri | Hammadde & Stok | Giriş/çıkış defteri; belge, depo, tarih ve kullanıcı izi; filtrelenebilir liste |
| 11 | Üretim Akışı | Üretim | Sürükle-bırak aşama panosu: Ergitme, Döküm, Testere, Homojenizasyon, Soğutma, Paketleme, Mamul Stok, Sevkiyat |
| 12 | Reçeteler | Üretim | Makine ve ürün bazında malzeme oranları, yoğunluk ve hedef tonaj |
| 13 | Homojenizasyon Partisi | Üretim | Parti planı, hedef/gerçekleşen süre, sıcaklık ve süre sapması |
| 14 | Olay & Arşiv | Üretim | Olay günlüğü; `inbox` kuyruğu, doğrulama ve arşive taşıma |
| 15 | Makine Parkı | Makine & Kurulum | 20 makine, 6 tip, kapasite, mod, aktif/pasif; devre dışı bırakma ve geri alma |
| 16 | Döküm Yolları | Makine & Kurulum | Fırın → tabla → testere yolu; tutma tonu ve kapasite kontrolü |
| 17 | Kesim Hesap Motoru | Makine & Kurulum | Ø178, 6300/6000/300/3 mm geometrisi; kafa, talaş, fire ve tolerans hesabı |
| 18 | Yağ & Bakım | Makine & Kurulum | Yağ ve bıçak sayaçları; uyarı eşiği, kalan ömür, bakım kaydı |
| 19 | PLC Durum | Makine & Kurulum | Dört sinyalin son durumu, PLC bağlantısı, tag eşlemesi; **yalnızca okuma** |
| 20 | Satış Siparişleri | Ticari & Finans | Müşteri, ürün, miktar, teslim tarihi; kredi kontrolü ve stok rezervasyonu |
| 21 | Müşteriler & Cari | Ticari & Finans | Müşteri kartı, bakiye, kredi limiti, cari hareketler ve risk durumu |
| 22 | Muhasebe & Fişler | Ticari & Finans | Satış/alış faturaları, borç/alacak fişleri, mizan, dönem kapanışı |
| 23 | Maliyet & Kârlılık | Ticari & Finans | Döküm kodu maliyeti (hammadde, enerji, sarf, işçilik, fire), ton başı maliyet, brüt kâr |
| 24 | Depo, Rezervasyon & Sayım | Depolama & Personel | Depo lokasyonları, rezervasyonlar, fiziki sayım ve fark düzeltmesi |
| 25 | Personel & Vardiya | Depolama & Personel | Personel kartı, vardiya planı ve operatör izi; **bordro kapsam dışı** |
| 26 | Sevkiyat & Onaylar | Sevkiyat | İki kademeli onay, araç/irsaliye bilgisi, stok çıkışı ve sevkiyat kaydı |
| 27 | Arşiv | Sevkiyat | Tamamlanmış sevkiyat, belge ve geçmiş kayıt araması |
| 28 | Raporlar & İstatistik | Raporlama | Günlük/haftalık/aylık üretim, fire, satış, tahsilat ve kârlılık çıktıları |
| 29 | Entegrasyon Matrisi | Entegrasyon | 10 entegrasyon kuralı; bir onayın hangi kayıtları ürettiğini gösterir; `clientId` ile çift yazımı engeller |
| 30 | Simülasyon Bağlantısı | Entegrasyon | Fırın sıcaklığı/alarmı canlı, emir oluştur/başlat, edge batch sayacı, fırın → makine eşlemesi |
| 31 | Saha Kurulum Sihirbazı | Yönetim | Fabrika → makine → yol → bağlantı → modül, beş adım; taslak kaydedilebilir |
| 32 | Modül Kaydı | Yönetim | 15 modülün fabrikaya göre açılıp kapanması; menü ve kurallar veriyle filtrelenir |
| 33 | Merkezi Yönetim | Yönetim | Geliştirici ekibi için tesis, makine, kullanıcı, profil paketi ve sürüm notları |
| 34 | Bildirimler & Kuyruk | Sistem | Sistem bildirimleri, SMS/e-posta giden kutusu, yeniden deneme ve hata durumu |
| 35 | Ayarlar | Sistem | Şirket bilgisi, para birimi, tema, eşikler, yedek yolu, demo verisini sıfırlama |

**Not:** Bu 35 ekranın dışında fabrikadaki edge ajanının kendi Türkçe paneli (`:8787`) vardır; ayrı bir süreçtir. Simülasyon köprüsü yeni bir ekran eklemez; aynı 35 ekran içindeki **Simülasyon Bağlantısı** ekranını ve aşağıdaki dört ana ekranı canlı veriyle besler.

### 5.1 Canlı simülasyon modu (Sürüm 1.5)

Simülasyon verisi artık yalnızca bağlantı ekranında gösterilmez. Köprü çalışırken ana ERP ekranları demo kayıtları yerine **fırın, emir, sıcaklık ve alarm** verisini gösterir:

| Ana ekran | Canlı içerik |
| --- | --- |
| Panel | Fırın sayısı, ortalama/en yüksek sıcaklık, alarm, çalışan emir, fırın kartları ve emir tablosu |
| Makine Parkı | Fırın → profil makine eşlemesi, anlık sıcaklık, hedef, alarm; tablo/testere/homojen makineleri profilden ayrıca listelenir |
| PLC Durum | Dört sinyal ve ayrı telemetri; kapı/döküm simülasyonda yoksa “Bilinmiyor” |
| Üretim Akışı | Simülasyon emirleri: oluşturuldu, çalışıyor, tamamlandı, iptal; fırın durum tablosu |

Üst çubuktaki **Canlı simülasyon / Demo veri** düğmesi modu değiştirir. Köprü ilk açılışta yanıt verirse canlı mod otomatik açılır. Canlı modda:

* Hiçbir ERP koleksiyonuna, stok/maliyet/muhasebe tablosuna yazılmaz; yalnızca okunur.
* Makine düzenleme, döküm kartı sürükleme ve PLC sinyal değiştirme kapalıdır.
* Köprü veya simülasyon kapalıysa demo veriye dönülmez; “bağlantı yok” veya “son bilinen veri” gösterilir.
* Veri 3 saniyede bir, yalnızca sekme görünürken REST ile tazelenir; WebSocket ve sayfa yenileme yoktur. Service worker `/api/` yanıtlarını önbelleğe almaz.
* Stok, tedarikçi, cari, fatura ve muhasebe simülasyondan gelmediği için bu ekranlar demo kayıtları gösterir ve **DEMO VERİ** etiketi taşır.

Bu ayrım bilinçlidir: simülasyon bir **fırın hattı** test ortamıdır; bütün işletme verilerinin kaynağı değildir. Canlı fırın verisinden stok veya muhasebe kaydı türetmek, "PLC verisi işletme tablosuna yazmaz" kuralını ihlal ederdi.

### 5.2 Simülasyon olayları → ERP bildirimleri (Sürüm 1.6)

Simülasyon artık **arıza enjekte edilebilen bir test ortamıdır**. Simülasyon ekranındaki **ERP Test Senaryoları** panelinden sensör arızası, aşırı sıcaklık, brülör arızası, kapı açık ve döküm senaryoları uygulanır. Her senaryo sunucuda bir olay üretir; ERP 3 saniyede bir `/api/sim/events` ucunu okuyarak olayı bildirime dönüştürür.

| ERP yeri | Görünen |
| --- | --- |
| Bildirim merkezi | Kaynak `Simülasyon · <fırın>`, önem, saat, mesaj; okunmamış sayacı |
| Üst uyarı bandı | En güncel okunmamış kritik/uyarı; Bildirimler, PLC ekranı ve Okundu düğmeleri |
| PLC Durum | Kapı/döküm sinyalleri, `Sensör BAD` kalitesi, alarm ve çalışma durumu |
| Makine Parkı | Sensör BAD, kapı açık, brülör arıza rozetleri |
| Simülasyon Bağlantısı | Son simülasyon olayları tablosu |

İş akışı testleri (kritik stok, kalite reddi, bakım, sevkiyat, cari, kredi, üretim) yalnızca bildirim üretir; `createsRecord: false` ve `TEST` etiketi taşır. Stok, cari, muhasebe veya üretim kaydı oluşmaz. Ayrıntılı oynatma kitabı `docs/16`'dadır.

### 5.3 Sürüm 1.7 kalite sertleştirmesi

Sürüm 1.7'de sistem baştan aşağı yeniden denetlendi. Simülasyon emirleri iki katmanda doğrulanıyor; sıfırlama çalışan emri SQLite'ta da iptal ediyor; SQLite güncellemeleri sütun beyaz listesi kullanıyor; okuma ve gövde istekleri sınırlandı; köprü, simülasyon ve demo tarayıcı güvenlik başlıkları gönderiyor; varsayılan HMAC anahtarı ve uzak simülasyon adresi `/api/health` üzerinden uyarı olarak görünüyor. Beş adımlı kalite kapısı (`tools/check_all.py`) ve GitHub Actions aynı testleri çalıştırıyor. Bulguların tamamı, kalan riskler ve kabul listesi `docs/17`'dedir.

---

## 6. Uçtan uca iş akışları

### 6.1 Satın alma ve mal kabul

1. **Talep:** Üretim veya depo bir ihtiyaç bildirir. Talep, malzeme, miktar, gerekçe ve istenen tarihle açılır.
2. **Teklif:** Tedarikçilerden fiyat toplanır; teklifler karşılaştırılır. Seçim yapıldığında satın alma emri taslağı doğar.
3. **Emir:** Emir onaylanır; tedarikçi, fiyat, teslim tarihi ve ödeme koşulu kaydedilir.
4. **Mal kabul:** Mal geldiğinde brüt ağırlık, fire ve net ağırlık ayrı girilir. Sistem emirle eşleştirir; kısmi kabul desteklenir.
5. **Etki:** Stok giriş hareketi, fiyat geçmişi, emir karşılama durumu ve olay satırı üretilir. Fatura gelene kadar muhasebe fişi oluşmaz.
6. **Alış faturası:** Fatura girildiğinde `150 + 191` borç, `320` alacak fişi üretilir; satıcı cari hareketi ve ödeme vadesi oluşur.

### 6.2 Üretim: ergitmeden mamul stoğuna

Üretim akışı sekiz aşamalıdır: **Ergitme, Döküm, Testere, Homojenizasyon, Soğutma, Paketleme, Mamul Stok, Sevkiyat.**

1. **Reçete seçimi:** Makine ve ürüne göre malzeme oranları, yoğunluk ve hedef tonaj belirlenir.
2. **Döküm kodu (lot):** Her parti benzersiz bir kod alır; fırın, tabla, testere ve reçete ile ilişkilendirilir.
3. **Ergitme:** Fırın sıcaklığı ve dört sinyal izlenir. Sıcaklık hedefin üzerine çıkarsa alarm üretilir; alarm durumunda brülör kapanır.
4. **Döküm:** Döküm yolu ve tabla kapasitesi kontrol edilir; tutma tonu aşılamaz.
5. **Testere:** Kesim hesabı yapılır; kafa, talaş ve fire ayrıştırılır. Geometri kontrolü kayıtlı tonajla karşılaştırılır.
6. **Homojenizasyon:** Parti, hedef sıcaklık ve süre ile planlanır; gerçekleşen süre sapması raporlanır.
7. **Soğutma ve paketleme:** Soğutma partisi, paketleme ve mamul stoğu kaydı tamamlanır.
8. **Etki:** Mamul stok, yan ürün kaydı, döküm kodu maliyeti ve olay günlüğü üretilir.

### 6.3 Sevkiyat: iki onay, tek kayıt çok etki

Sevkiyat iki aşamalı onaydan geçer. İlk onay **sevkiyat hazırlığını**, ikinci onay **fiili çıkışı** temsil eder. İkinci onay verildiğinde tek bir işlem içinde şunlar oluşur:

| Üretilen kayıt | İçerik |
| --- | --- |
| Stok çıkış hareketi | Mamulden düşüş, depo ve lot bağlantısı |
| Satış faturası | Net, KDV ve genel toplam |
| Borç/alacak fişi | `120` borç; `600` ve `391` alacak |
| Müşteri cari bakiyesi | Fatura genel toplamı kadar borç artışı |
| Maliyet yansıması | Döküm kodu maliyetinin satılan tona düşen payı |
| Bildirim | Operatöre "sevkiyat muhasebeleştirildi" mesajı |
| Giden kutu | Günlük satış raporu e-postası kuyruğu |
| Olay satırı | Sevkiyat olayı ve lot kimliği |

Aynı sevkiyat tekrar onaylanırsa `clientId` sayesinde ikinci kez yazılmaz. Bu, "tek kayıt, çok etki" ilkesinin uygulamadaki karşılığıdır.

### 6.4 Sayım, fire ve düzeltme

- **Fiziki sayım:** Depoda sayılan miktar ile sistemdeki miktar karşılaştırılır.
- **Fark:** Fark varsa düzeltme hareketi ve borç/alacak fişi üretilir; işlem denetim izi bırakır.
- **Kırıcı:** Hurda ve fire, tekrar fırına, döngüsel kullanıma, satışa veya atığa yönlendirilir. Her kader ayrı raporlanır.
- **Silme yok:** Hatalı kayıt silinmez; düzeltme kaydı ve gerekçe eklenir.

---

## 7. Hesaplar ve hesap motorları

Sistemdeki bütün hesaplar saf fonksiyonlarla yapılır; aynı fonksiyonlar hem tarayıcıda hem Node testlerinde hem sunucu worker'larında kullanılır. Böylece ekran ile rapor aynı sayıyı üretir.

### 7.1 Silindir kütlesi ve kesim hesabı

Temel formül, silindir hacmi ile yoğunluğun çarpımıdır:

**Kütle (kg) = π × (çap/2000)² × (uzunluk/1000) × yoğunluk × adet**

Varsayılanlar: çap **178 mm**, döküm boyu **6300 mm**, mamul boyu **6000 mm**, kafa **300 mm**, bıçak **3 mm**, yoğunluk **2700 kg/m³**.

| Ölçü | Hesaplanan kütle |
| --- | --- |
| 6300 mm döküm | 423,29 kg |
| 6000 mm mamul | 403,13 kg |
| 300 mm kafa (tek parça) | 20,16 kg |
| 3 mm talaş (tek kesim) | 0,202 kg |

Kesim raporunda bıçak döküm boyunun içinde sayılırsa gerçek kafa payı **6300 − 6000 − 3 = 297 mm** olur. İki kafa ve iki kesim varsayımıyla bir 14 tonluk dökümden yaklaşık **39,91 kg kafa** ve **0,40 kg talaş** ayrılır; net biyet yaklaşık **13,96 ton** kalır. Bu sayılar örnektir; gerçek fabrikada kafa adedi, kesim sayısı ve fire ayarlardan gelir.

### 7.2 Diğer hesap fonksiyonları

| Fonksiyon | Ne yapar |
| --- | --- |
| `cylinderMassKg` | Çap, boy, yoğunluk ve adetten silindir kütlesini hesaplar |
| `cuttingReport` | Kafa, talaş, fire, net biyet, geometri ve denge farkını tek raporda üretir |
| `geometryCheck` | Kayıtlı tonaj ile geometriden beklenen tonajı karşılaştırır; varsayılan tolerans %2 |
| `massBalanceChain` | 21 → 18 → 17 → 14 ton gibi ardışık olaylardan yürüyen bakiye üretir |
| `maintenanceStatus` | Yağ/bıçak kullanımını limite oranlar; normal, yaklaşıyor, eşik doldu seviyesi verir |
| `durationCheck` | Planlanan ve gerçekleşen süreyi karşılaştırır; süre aşımını dakika olarak verir |
| `amounts` | Net tutardan KDV ve genel toplamı üretir; varsayılan KDV %20 |
| `sumLines`, `isBalanced` | Fiş satırlarının borç/alacak toplamını ve denkliğini kontrol eder |
| `buildEntry` | Dengeli borç/alacak fişi kurar; dengesiz fişi `balanced: false` ile işaretler |
| `salesEntry` | Satış faturası fişi: `120` borç, `600` ve `391` alacak |
| `purchaseEntry` | Alış faturası fişi: `150` ve `191` borç, `320` alacak |
| `trialBalance` | Hesap bazında borç, alacak ve bakiye mizanı üretir |
| `lotCost` | Hammadde, enerji, sarf, işçilik ve fireyi toplar; ton ve kg başı maliyeti verir |
| `salesMargin` | Satış geliri ile üretim maliyetinden brüt kâr ve marj hesaplar |
| `creditCheck` | Müşteri limiti, kullanılan bakiye ve yeni sipariş tutarını karşılaştırır |
| `kpiSnapshot` | Ciro, alacak, borç, açık sipariş, zamanında teslim, üretim tonu, fire oranı ve bütçe kullanımını toplar |
| `postingEffects` | Onaylanan bir belgeden doğacak kayıtların listesini verir; kalıcı yazımı ekran tek işlemde yapar |

### 7.3 Muhasebe mantığı

- **Hesap planı:** 12 örnek hesap: kasa `100`, banka `102`, alıcılar `120`, ilk madde `150`, ticari mal `153`, indirilecek KDV `191`, satıcılar `320`, hesaplanan KDV `391`, satış `600`, satılan malın maliyeti `620`, üretim maliyeti `730`, genel gider `740`.
- **Fiş:** Her fiş en az bir borç ve bir alacak satırı taşır; toplamlar eşit değilse kaydedilmez.
- **Mizan:** Bütün fişler hesap bazında toplanır; borç = alacak kontrolü yapılır.
- **Dönem kapanışı:** Mizan kontrolü, bütçe sapması ve yönetim raporu üretilir; onay gerektirir.
- **KDV:** Varsayılan %20'dir; ayarlardan değiştirilebilir.

### 7.4 Maliyet ve kârlılık

Döküm kodu maliyeti beş kalemden oluşur: **hammadde, enerji, sarf malzeme, işçilik ve fire.** Toplam maliyet, net tona bölünerek ton başı maliyet; tonun binde birine bölünerek kg başı maliyet bulunur. Satışta bu maliyet, satılan tonla çarpılır ve satış gelirinden düşülerek brüt kâr elde edilir.

---

## 8. Dört sinyal, telemetri ve makine durumu

Bu sistemin en kritik kuralı şudur: **PLC'den yalnızca okunur; PLC'ye yazılmaz.** Fırın başlatma, brülör açma veya döküm verme yetkisi PLC/SCADA'da kalır.

### 8.1 Dört kontrol sinyali

| Sinyal | Anlamı | Tip |
| --- | --- | --- |
| `door` | Kapı açık mı? | Var/yok |
| `casting` | Döküm modu/devrilme aktif mi? | Var/yok |
| `alarm` | Alarm var mı? | Var/yok |
| `running` | Makine çalışıyor mu? | Var/yok |

Sıcaklık, basınç, yağ sıcaklığı gibi büyüklükler **beşinci sinyal değildir**. Ayrı `telemetry` kategorisinde tutulur. Böylece operatör ekranı dört sinyalin sade mantığını korur; ölçümler grafik ve eşik uyarısı olarak ayrıca gösterilir.

### 8.2 Telemetri ve kalite

- **Sıcaklık:** Eritme fırınında ocak içi, homojenizasyonda bölme sıcaklığı, testerede yağ sıcaklığı.
- **Kalite etiketi:** `GOOD` (gerçek ölçüm), `SIMULATED` (simülasyon veya yedek), `STALE` (eski veri), `BAD` (geçersiz).
- **Eşikler:** Uyarı ve kritik eşik makine tipine göre profilden gelir; sabit sıcaklık değeri kodda yoktur.
- **Alarm:** Yalnızca var/yok bilgisidir; "hangi ateşleyici arızalı" ayrıntısı kapsam dışıdır.

### 8.3 Makine modu

| Mod | Anlamı |
| --- | --- |
| `MANUAL` | Operatör girişi; PLC yok veya devre dışı; sistem çalışmaya devam eder |
| `PLC` | Sinyaller PLC'den okunur; bağlantı koparsa `MANUAL` yedeğe düşülür ve uyarı gösterilir |

Modül kaydı sayesinde PLC modülü kapalıysa PLC ekranı menüde görünmez; fabrika MANUAL modda çalışırken sistem eksik kalmaz.

---

## 9. Modülerlik: aynı yazılım, farklı fabrikalar

Sistem tek bir fabrikaya sabitlenmemiştir. Makine parkı, modüller ve bağlantı ayarları veriyle tanımlanır.

### 9.1 Fabrika profil paketi

Profil paketi bir JSON dosyasıdır; şunları taşır:

- Tesis bilgisi (kod, ad, şehir, mod),
- Makine tipleri ve adetleri,
- Kapasiteler ve tutma tonu,
- Döküm yolları,
- Dört sinyalin PLC tag adresleri,
- Modül açma/kapama listesi.

Paket indirilebilir, kopyalanabilir ve başka bir kuruluma içe alınabilir. 1 fırınlı, 2 fırınlı veya 5 fırınlı fabrika aynı kodla çalışır; yalnızca paket değişir.

### 9.2 15 modül

| Modül | Kapsadığı ekranlar | Koşul |
| --- | --- | --- |
| Çekirdek | Panel, Bildirimler, Ayarlar | Her fabrikada açık |
| Satın Alma | Malzeme, Emirler, Fiyatlar, Tedarikçiler, Talepler | — |
| Hammadde & Stok | Stok, Mal Kabul, Kırıcı, Hareketler | — |
| Üretim | Üretim Akışı, Reçeteler, Partiler, Olaylar | En az bir ergitme ocağı |
| Makine Parkı | Makineler, Yollar, Kesim, Bakım | — |
| Döner Ocak / Cüruf | Alt menü yok | Döner ocak varsa |
| PLC Durum | PLC Durum | Fabrika modu PLC ise |
| Satış & Müşteri | Satış, Müşteriler | — |
| Muhasebe & Maliyet | Muhasebe, Maliyet | — |
| Depo & Sayım | Depo | — |
| Personel & Vardiya | Personel | Bordro hariç |
| Sevkiyat | Sevkiyat, Arşiv | — |
| Raporlama | Raporlar | — |
| Entegrasyon | Entegrasyon Matrisi, Simülasyon | — |
| Merkezi Yönetim | Sihirbaz, Modül Kaydı, Merkezi Yönetim | Yalnızca geliştirici ekibi |

### 9.3 Saha kurulum sihirbazı

Beş adımda fabrika tanımlanır:

1. **Fabrika:** Kod, ad, şehir ve çalışma modu.
2. **Makine:** Tip bazında adet ve kapasite; örneğin 2 ergitme, 1 tabla, 1 testere.
3. **Yol:** Fırın → tabla → testere eşleşmesi ve tutma tonu.
4. **Bağlantı:** Protokol (OPC UA, Modbus, simülasyon), IP, port ve tarama aralığı.
5. **Modül:** Fabrikada kullanılacak modüllerin seçimi.

Taslak kaydedilir; yarıda bırakılıp sonra devam edilebilir. Kurulum tamamlandığında makineler tek kaynaktan üretilir; eski `F20`, `F35` gibi sabit kodlar kullanılmaz.

### 9.4 Güvenli makine çıkarma

Bir makine silinmez. Devre dışı bırakılır ve şu kontrol yapılır:

- Hangi reçete, döküm yolu, lot, PLC tag'i, bakım kaydı ve olay bu makineye bağlı?
- Bağlı kayıt varsa çıkarma engellenir veya gerekçe istenir.
- Devre dışı makine taranmaz; geçmiş kayıtları korunur.
- Gerekirse aynı kimlikle geri alınır.

---

## 10. Edge ajanı: fabrikadaki tek bilgisayar

Edge ajanı, ERP'nin kullanıcı arayüzü değildir. Fabrikadaki tek veri toplama bilgisayarında çalışan, makinelerle ERP arasındaki köprüdür. Kendi Türkçe paneli `:8787` üzerindedir.

### 10.1 Bir okuma döngüsü adım adım

1. **Bağlan:** Seçilen adaptörle PLC'ye, simülasyona veya yerel simülatöre bağlanır.
2. **Oku:** Dört sinyali ve tanımlı telemetriyi okur.
3. **Doğrula:** Makine kimliği, sinyal tipi, birim ve zaman damgası kontrol edilir.
4. **SQLite'a yaz:** Okuma `readings`, olay `events`, döngü `runs` tablolarına yazılır.
5. **Kuyruğa al:** Gönderilecek batch `outbox` tablosuna `queued` olarak eklenir.
6. **İmzala ve gönder:** Batch HMAC-SHA256 ile imzalanır; `POST /api/edge/ingest` çağrılır.
7. **Durum güncelle:** Başarılıysa `sent`; hata varsa tekrar denenir; deneme hakkı biterse `dead` işaretlenir ama **silinmez**.
8. **Bekle:** Bir sonraki tarama aralığına kadar bekler; çevrimdışıysa üretim durmaz.

### 10.2 Yerel veritabanı

| Tablo | İçerik |
| --- | --- |
| `readings` | Sinyal ve telemetri okumaları; kalite, kaynak, birim, zaman |
| `events` | Eşik aşımı, bağlantı hatası, yedek moda geçiş gibi olaylar |
| `outbox` | Gönderilecek batch'ler; durum, deneme sayısı, son hata |
| `runs` | Her tarama döngüsünün süresi ve sonucu |
| `app_log` | Ajan günlüğü |

Her satırda `client_id` benzersizdir; ajan yeniden başlasa bile çift kayıt oluşmaz.

### 10.3 Arayüz sekmeleri

| Sekme | İçerik |
| --- | --- |
| Genel Bakış | KPI'lar, canlı makine kartları, dört sinyal + sıcaklık, son olaylar |
| Sensörler | Son okumalar, kalite ve kaynak, tarama döngüleri |
| SQL Veritabanı | Tablo şemaları, satır sayıları, saklama temizliği |
| ERP Kuyruğu | Batch durumları, deneme sayısı, "Şimdi Gönder" |
| Fabrika Profili | Profil özeti, adaptör sözleşmeleri, telemetri şablonları |
| Ayarlar | IP/port, adaptör, simülasyon adresi, ERP adresi, gizli anahtar, aralık |

### 10.4 Adaptörler

| Adaptör | Durum | Ne yapar |
| --- | --- | --- |
| `simulated` | Hazır | Ağ olmadan dört sinyal ve telemetri üretir; `SIMULATED` etiketlidir |
| `simulation` | Hazır | Kullanıcı simülasyonunun REST uçlarını okur; fırın adlarını makinelere eşler |
| `opcua` | Sözleşme hazır | Gerçek OPC UA sürücüsü sonraki aşamada takılır |
| `modbus` | Sözleşme hazır | Gerçek Modbus TCP sürücüsü sonraki aşamada takılır |

Sürücü yoksa ajan hata verip kapanmaz; `MANUAL` yedeğe düşer ve bunu arayüzde sarı uyarı olarak gösterir.

### 10.5 Kurulum ve otomatik başlatma

- Windows'ta `edge/build_exe.bat` tek komutla `ERP-Edge-Collector.exe` üretir; `install-task.ps1` oturum açılışında otomatik başlatmayı kurar.
- Ajan üretimde yalnızca `127.0.0.1:8787` dinler; fabrika dışına port açılmaz.
- Veri saklama süresi ayarlanabilir; eski okumalar temizlenir, kuyruk kayıtları silinmez.

---

## 11. Simülasyon köprüsü: fabrika testinden önce deneme

Kullanıcı kendi fırın simülasyonunu `localhost:8000` üzerinde çalıştırır. ERP Studio ise `localhost:8080` üzerindedir. Tarayıcı doğrudan simülasyona bağlansaydı üç sorun çıkardı: CORS izni yoktu, adres makineye göre değişiyordu ve WebSocket kopunca sayfa sürekli yenileniyordu.

Köprü bu yüzden araya girer:

- ERP Studio'yu `:8080` üzerinden sunar.
- Simülasyonun REST uçlarını `/api/sim/*` altında proxy'ler.
- Fırın adlarını `docs/12` profil paketindeki makine kimliklerine eşler.
- Edge ajanının HMAC imzalı batch'lerini `/api/edge/ingest` ile kabul eder.
- **WebSocket kullanmaz**; ana ekranlar 3, Simülasyon Bağlantısı ekranı 2,5 saniyede bir REST ile tazelenir ve bağlantı kopunca sayfayı yenilemez.
- Ana Panel, Makine Parkı, PLC Durum ve Üretim Akışı ekranlarını canlı fırın/emir verisiyle besler; üst çubuktaki düğme demo veriye döndürür.

### 11.1 Eşleme

Simülasyondaki fırın adları profil makinelerine şu sırayla eşlenir:

1. Açık `furnaceMap` kaydı varsa o kullanılır.
2. Yoksa ada göre kural: "eritme" ergitme ocağına, "homojen" homojenizasyon fırınına, "yaşlandırma" ve "testere" ilgili makine tipine.
3. Eşleşmeyen fırın için veri üretilmez; arayüzde uyarı olarak görünür.

Örnek eşleme: `Aluminyum Eritme Fırını → MCH-01`, `Homojenizasyon Fırını → MCH-10`, `Yaşlandırma Fırını → MCH-02`.

### 11.2 Köprünün uçları

| Metot | Yol | Görev |
| --- | --- | --- |
| GET | `/api/health`, `/api/bridge/info` | Köprü durumu, sürüm, çalışma düzeni |
| GET | `/api/sim/health`, `/api/sim/live` | Bağlantı ve tek çağrılık canlı görüntü |
| GET | `/api/sim/furnaces`, `/orders`, `/readings` | Simülasyon proxy'si |
| GET | `/api/sim/map` | Fırın → makine eşlemesi |
| POST | `/api/sim/orders`, `/orders/start` | Emir oluştur/başlat |
| POST | `/api/bridge/config` | Simülasyon adresini değiştir |
| GET | `/api/edge/summary`, `/batches`, `/latest` | Edge kayıt defteri |
| POST | `/api/edge/ingest` | HMAC imzalı batch kabulü |

Simülasyon kapalıysa `/api/sim/live` son başarılı görüntüyü `stale` etiketiyle döndürür; emir uçları `503` verir. Arayüz çökmez.

### 11.3 Çift tıkla başlatma

| Platform | Dosya | Sonuç |
| --- | --- | --- |
| Windows | `Baslat.bat` | Köprü başlar, tarayıcı canlı `#/dashboard` ekranında açılır |
| macOS | `Baslat.command` | Aynı davranış; Terminal penceresi açık kalır |
| Windows (tek dosya) | `build_exe.bat` → `ERP-Sim-Bridge.exe` | Python gerekmez; ayar exe yanında |
| macOS (tek dosya) | `build_macos.sh` → `ERP-Sim-Bridge.app` | Python gerekmez; ayar `~/Library/Application Support` altında |

Köprü `127.0.0.1:8080` dinler; 80 portu yönetici/`sudo` hakkı istediği için kullanılmaz. Tarayıcı otomatik açıldığından adres yazmak gerekmez.

### 11.4 Köprü ne yapmaz?

- Simülasyonun veritabanına veya kaynak koduna dokunmaz.
- PLC'ye yazmaz.
- ERP'nin stok, maliyet, muhasebe ve cari tablolarına yazmaz.
- Üretim ingest worker'ının yerini aldığını iddia etmez; batch'i doğrular ve kendi kayıt defterine yazar.
- Canlı modda ERP kayıtlarını değiştirmez; makine düzenleme, kart sürükleme ve sinyal yazma kapalıdır.

---

## 12. Güvenlik, yedekleme ve arşiv

| Konu | Nasıl çalışır |
| --- | --- |
| Yerel çalışma | Arayüz ve veri önce yereldedir; internet kesilince üretim devam eder |
| Ağ sınırı | Sistem LAN içinde çalışır; doğrudan internete açılmaz; uzaktan erişim VPN + MFA ile planlanır |
| Edge imzası | Batch HMAC-SHA256 ile imzalanır; gizli anahtar arayüzde maskelenir |
| Statik sunucu | Yalnızca `/app/` ve `/index.html` yayınlanır; `.git`, `edge-config.json` ve köprü ayarı sunulmaz |
| Gövde sınırı | Ingest isteği 5 MB ile sınırlıdır |
| Silme yerine doğrulama | `inbox` kayıtları doğrulanıp `archive` altına taşınır; hatalı kayıt silinmez |
| Yedek | `backup.py` yedek alır ve checksum üretir; harici disk hedefi ayarlanabilir |
| Olay günlüğü | Her aşamadan olay satırı; `archive/YYYY/MM/DK-.../events.jsonl` biçiminde saklanır |
| Giden kutu | SMS/e-posta/rapor gönderimi kuyruğa alınır; internet gelince denenir |
| Kimlik doğrulama | Prototipte gerçek RBAC yoktur; kullanıcı listesi demo amaçlıdır. Üretimde rol ve yetki ayrımı gereklidir |

---

## 13. Raporlama ve izleme

Panelde ve raporlarda şu göstergeler izlenir:

- Dönem cirosu, alacak ve borç toplamı,
- Açık satış siparişi ve zamanında teslim oranı,
- Üretim tonu ve fire oranı,
- Bütçe planlanan/gerçekleşen ve kullanım yüzdesi,
- Tedarikçi ve müşteri sayısı,
- Makine bazında çalışma, alarm ve duruş durumu,
- Yağ/bıçak ömrü ve yaklaşan bakım,
- Edge kuyruğunda bekleyen, gönderilen ve ölü batch sayısı,
- Açık bildirim ve giden kutu kayıtları.

Raporlar günlük, haftalık ve aylık üretilir; SMS ve e-posta gönderimi `outbox` üzerinden yürür. Rapor içeriği işletme kararı üretmez; yalnızca görünürlük sağlar.

---

## 14. Günlük kullanım: tipik bir vardiya

1. **Açılış:** Panel açılır; alarm, açık sipariş ve yaklaşan bakım kontrol edilir.
2. **Makine kontrolü:** PLC Durum ekranında dört sinyalin son durumu ve bağlantı görülür. Alarm varsa üretim planı gözden geçirilir.
3. **Mal kabul:** Gelen hammadde tartılır; brüt, fire ve net girilir; emirle eşleştirilir.
4. **Üretim:** Reçete seçilir, döküm kodu açılır, aşamalar sürükle-bırak ile ilerletilir. Kesim hesabı ve homojenizasyon süresi kontrol edilir.
5. **Kalite/fire:** Kırıcı ve fire kaydı girilir; kütle dengesi kapanır.
6. **Sevkiyat:** Sipariş hazırlanır, iki onay verilir; fatura, fiş, stok çıkışı ve cari bakiye tek işlemde oluşur.
7. **Kapanış:** Günlük rapor alınır, yedek çalıştırılır, giden kutu kontrol edilir.
8. **Simülasyon/edge:** Fabrika testi öncesi Panel, Makine Parkı, PLC Durum ve Üretim Akışı canlı simülasyon verisiyle izlenir; Simülasyon Bağlantısı ekranı bağlantı ve teşhis için kullanılır.

---

## 15. Sınırlar ve gerçek fabrikaya geçiş

### 15.1 Bugünün sınırları

1. **Prototiptir:** Gerçek işlemsel veritabanı, API katmanı ve RBAC yoktur; veri tarayıcıda ve JSON arşivinde tutulur.
2. **PLC sürücüsü yoktur:** OPC UA ve Modbus adaptörleri sözleşme düzeyindedir; gerçek sürücü sahada takılır.
3. **Edge exe'si ve macOS uygulaması depoda hazır değildir:** Kendi işletim sisteminde üretim betiği çalıştırılır; `.bat` ve `.command` Python ile hemen çalışır.
4. **Köprü üretim worker'ı değildir:** İmzalı batch'i doğrular ve kendi defterine yazar; stok/maliyet/muhasebe üretmez.
5. **Simülasyon emirleri kalıcı değildir:** Kullanıcı simülasyonunun kendi kuralları geçerlidir.
6. **Kapı ve döküm sinyalleri simülasyonda yoktur:** `unknown` yazılır; gerçek PLC'de okunur.
7. **Canlı mod yalnızca fırın/emir/telemetri kapsar.** Stok, cari, muhasebe ve maliyet simülasyondan gelmez; demo kayıtları etiketli olarak gösterilir.
8. **Bordro, e-fatura, banka mutabakatı, KDV beyannamesi, CRM, CAD/BIM ve POS kapsam dışıdır.**
9. **Gerçek tarayıcı/tablet testi sahada yapılmalıdır:** Ekranlar Node duman testi ve DOM denetimiyle doğrulanmıştır.
10. **Tek köprü / tek ajan:** İkinci saha bilgisayarı eklenirse `siteCode` ve ayrı `clientId` gerekir.
11. **Veri hacmi:** Yüz binlerce satırda gerçek veritabanı ve indeksleme gerekir; prototip küçük-orta hacim içindir.

### 15.2 Gerçek fabrikaya geçiş sırası

1. `docs/10` aşama 8: gerçek API + veritabanı + RBAC; fiş, stok ve cari yazımlarını tek transaction'a almak.
2. `/api/edge/ingest` için üretim worker'ı: doğrulama, `signalStates`, telemetri ve bakım bildirimi.
3. `docs/10` aşama 9: gerçek OPC UA / Modbus sürücüsünü adaptör sözleşmesine takmak.
4. Sıcaklık eşiklerini ve dört sinyalin tag adreslerini sahada doğrulamak.
5. İlk aşamada **salt okunur** kalmak; fırın başlatma/durdurma yetkisini PLC/SCADA'da bırakmak.
6. Edge ajanını fabrikadaki tek bilgisayara kurmak, otomatik başlatmayı ve yedeği devreye almak.
7. Köprüyü yalnızca önizleme/test için tutmak; üretimde gerçek ERP worker'ına yönlenmek.

---

## 16. Sözlük

| Terim | Anlamı |
| --- | --- |
| **Biyet** | Döküm sonrası kesilen silindirik alüminyum ürün |
| **Döküm kodu / lot** | Bir üretim partisinin benzersiz kimliği; maliyet ve izlenebilirlik bu koda bağlanır |
| **Kafa** | Dökümün testerede kesilip ayrılan uç kısmı; genelde tekrar ergitilir |
| **Talaş** | Testere bıçağının kestiği ince malzeme; ayrı kaydedilir |
| **Fire** | Üretimde kaybedilen, yeniden kullanılamayan malzeme |
| **Homojenizasyon** | Alaşımın iç yapısını eşitlemek için kontrollü sıcaklıkta bekletme |
| **Dört sinyal** | `door`, `casting`, `alarm`, `running`; kontrol için okunan tek sinyal grubu |
| **Telemetri** | Sıcaklık gibi ölçüm değerleri; dört sinyalden ayrı tutulur |
| **Edge ajanı** | Fabrikadaki tek bilgisayarda çalışan, veri okuyup yerel SQL'e yazan program |
| **Köprü** | ERP Studio ile fırın simülasyonu arasında çalışan REST proxy ve ingest sunucusu |
| **Profil paketi** | Fabrikanın makine parkını, modüllerini ve bağlantısını tanımlayan JSON |
| **Modül kaydı** | Hangi modülün hangi fabrikada açık olduğunu tutan veri |
| **HMAC** | Batch'in değiştirilmediğini kanıtlayan imza yöntemi |
| **Outbox** | Gönderilmeyi bekleyen SMS/e-posta/rapor veya edge batch kuyruğu |
| **Dead** | Deneme hakkı bitmiş ama silinmemiş kuyruk kaydı |
| **Mizan** | Hesap bazında borç/alacak toplamı ve bakiye tablosu |
| **Cari** | Müşteri veya tedarikçiyle olan bakiye hesabı |
| **PWA** | Tarayıcıdan yüklenebilen, masaüstü kısayolu oluşturan web uygulaması |

---

## 17. Hızlı referans

| Konu | Değer |
| --- | --- |
| ERP Studio | `http://localhost:8080/app/` |
| Simülasyon ekranı | `http://localhost:8080/app/#/sim` |
| Simülasyon olayları | `http://localhost:8080/api/sim/events` |
| Kullanıcı simülasyonu | `http://localhost:8000` |
| Edge ajanı paneli | `http://127.0.0.1:8787` |
| Windows başlatıcı | `Baslat.bat` |
| macOS başlatıcı | `Baslat.command` |
| Windows tek dosya | `dist\ERP-Sim-Bridge.exe` |
| macOS tek dosya | `dist/ERP-Sim-Bridge.app` |
| Edge Windows exe | `edge/dist/ERP-Edge-Collector.exe` |
| Veri arşivi | `server/erp/data/` (59 JSON + manifest) |
| Edge veritabanı | `edge/data/edge.db` |
| Köprü veritabanı | `server/sim_bridge/data/ingest.db` |
| Word çıktısı | `docs/Dokumhane-ERP-Plan.docx` |

**Doğrulama komutları:**

```bash
node tools/smoke_test.mjs                  # 35 ekran + hesaplar + mizan + modülerlik
python3 tools/check_all.py                 # 5 adımlı kalite kapısı
python3 tools/simulation_smoke_test.py     # 11 test
python3 tools/edge_smoke_test.py           # 13 test
python3 tools/sim_bridge_smoke_test.py     # 20 test
python3 server/erp/scripts/validate_data.py
node tools/export_seed.mjs                 # 59 JSON + manifest
python3 tools/build_docx.py                # bütün dokümanları Word'e derle
```

---

## 18. Kapanış: sistemi nasıl anlatmalı?

Bu sistemi bir cümleyle anlatmak gerekirse:

> "Alüminyum biyet dökümhanesinin satın alma, stok, üretim, kalite, maliyet, satış ve sevkiyat akışını tek tarayıcı arayüzünde izleyen; makine sinyallerini yalnızca okuyan; sahada çevrimdışı çalışabilen bir veri toplama ajanıyla beslenen; gerçek PLC'ye geçmeden önce fırın simülasyonuyla uçtan uca sınanabilen modüler bir ERP prototipi."

Sistemin gücü tek tek ekranlardan değil, **aynı kaydın birçok yerde tutarlı görünmesinden** gelir: bir sevkiyat onayı stok, fatura, fiş, cari, maliyet, bildirim ve olay üretir; hiçbiri diğerinden kopuk değildir. Aynı şekilde sahadaki bir sıcaklık okuması, stok veya muhasebe kaydı üretmeden yalnızca telemetri ve alarm olarak izlenir. Bu ayrım, sistemin gerçek fabrikada güvenle kullanılabilmesinin temelidir.
