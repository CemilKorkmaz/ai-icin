# 11 — Genel ERP Karşılaştırması, Boşluk Analizi ve Sürüm 1.1 Güncellemeleri

Bu doküman, "ERP sistemleri genel olarak nasıl çalışır" başlıklı kaynak metnin bu projeye uygulanması için hazırlanmıştır. Kaynak metin doğru genel ilkeleri anlatır; ancak örnekleri bir elektrik proje ve taahhüt firmasının otel tesisatı işine aittir. Bu depodaki işletme bir **alüminyum biyet dökümhanesidir**. Karşılaştırma bu fark gözetilerek yapılmış, genel ERP kavramları dökümhane sürecine tercüme edilmiştir. Şekil, şema ve kutu çizimi kullanılmaz; yalnızca başlıklar, açıklayıcı metin ve tablolar vardır.

## 1. Kaynak metnin değerlendirilmesi

Kaynak metnin ana tezi yerindedir: departmanlar ayrı programlarda ve Excel dosyalarında veri tutarsa stok bilgisi güncelliğini yitirir, satış depodaki gerçek miktarı bilemez, muhasebeye yanlış bilgi aktarılır ve aynı bilgi beş yerde tekrar girilir. ERP'nin çözümü ortak veri modeli ve ortak iş süreçleridir. Metindeki "satış kaydı girildiğinde stok, muhasebe, depo ve yönetici raporunun aynı işlemden beslenmesi" cümlesi, bu projenin en çok ihmal ettiği noktayı işaret eder.

Önceki sürümde üretim, kütle dengesi, kesim hesabı, olay günlüğü, modüler makine parkı ve kapalı çevrim altyapısı çok ayrıntılıydı. Buna karşılık ticari ve finansal döngü zayıftı. Sevkiyat ekranında müşteri adı, plaka ve fatura numarası **serbest metin** olarak tutuluyordu; müşteri kartı, cari bakiye, borç ve alacak kaydı, hesap planı, muhasebe fişi, mizan, bütçe ve ürün maliyeti yoktu. Yani sistem "ne üretildi" sorusuna güçlü, "bu üretim kaç paraya mal oldu ve kâr bıraktı" sorusuna zayıf cevap veriyordu.

Kaynak metinde yer alan görsel bağlantılar, yabancı dil başlıklar ve ekran görüntüsü altyazıları teknik gereksinim değildir; projeye aktarılmamıştır. Aynı şekilde AutoCAD, BIM ve inşaat projesi örneği bu fabrikanın iş akışına karşılık gelmez. Kaynak metnin sonunda açıkça belirtildiği gibi ERP teknik çizim programının yerine geçmez; bu projede de çizim yazılımı entegrasyonu hedeflenmez.

Genel ERP'deki **proje yönetimi** modülünün dökümhanedeki karşılığı ayrı bir proje kartı değil, **döküm kodudur**. Bütçe, malzeme, işçilik, satın alma ve kârlılık soruları `DK-2026-0139` gibi bir üretim partisi üzerinde cevaplanır. Bu tercüme, kaynak metindeki "proje sonunda toplam kâr veya zarar hesaplanır" ihtiyacını sektöre uygun biçimde karşılar.

## 2. Modül bazında karşılaştırma

| Genel ERP modülü | Önceki durum | Tespit edilen eksik | Karar | Sürüm 1.1'de eklenen |
| --- | --- | --- | --- | --- |
| Stok ve depo yönetimi | Kısmi | Depo ve lokasyon yoktu; hangi malzeme hangi siparişe ayrıldı bilinmiyordu; fiziki sayım yoktu | Tamamla | `warehouses`, `reservations`, `stockCounts`, sayım farkı düzeltme fişi |
| Satın alma yönetimi | Kısmi | Emir ve fiyat geçmişi vardı; talep, yetkili onayı, teklif karşılaştırması ve tekliften emre dönüşüm yoktu | Tamamla | `purchaseRequests`, `purchaseQuotes`, onay limiti, otomatik emir ve fiyat kaydı |
| Muhasebe ve finans | Yok | Hesap planı, çift taraflı fiş, cari hesap, alış/satış faturası, KDV, borç/alacak, banka, ödeme, dönem kapanışı eksikti | **Yeni modül** | `accounts`, `invoices`, `journalEntries`, `payments`, `periodClosures`, mizan kontrolü |
| Üretim yönetimi | Var, maliyet tarafı eksik | Ne üretileceği, ne kadar, hangi hammadde, hangi aşama biliniyordu; üretim maliyeti ve birim maliyet hesaplanmıyordu | Güçlendir | `costRecords`, beş kalem maliyet, döküm kodu başına birim maliyet ve brüt kâr |
| İnsan kaynakları | Kısmi | Kullanıcı ve rol vardı; personel kartı, vardiya ve olay-operatör bağlantısı yoktu | Sınırlı ekle | `employees`, `shifts`, olay günlüğündeki aktörün vardiyaya bağlanması; bordro dışarıda |
| Satış ve müşteri yönetimi | Kısmi | Sevkiyatta yalnızca müşteri adı metni vardı; müşteri kartı, teklif, sipariş, kredi limiti, sevkiyat takibi yoktu | **Yeni modül** | `customers`, `quotations`, `salesOrders`, kredi kontrolü, rezervasyon |
| Proje yönetimi | Kapsam dışı | Kaynak metin inşaat/taahhüt işi için yazılmış | Sektöre tercüme et | Maliyet nesnesi = döküm kodu; proje bütçesi yerine dönemsel bütçe kalemleri |
| Raporlama | Kısmi | Üretim ve fire raporları vardı; gelir, alacak, borç, bütçe sapması, zamanında sevk gibi çapraz göstergeler yoktu | Güçlendir | `kpiSnapshot`, `budgets`, maliyet ve kârlılık ekranı, dönem kapanış raporu |
| Modül entegrasyonu | Kısmi | Olay günlüğü ve giden kutu vardı; bir onayın finans ve cari tarafına otomatik yansıması yoktu | **Tamamla** | `integrationRules`, `posting.js`, tek işlemde sekiz koleksiyona yazım |
| Ortak veri tabanı | İlke olarak var | Prototip `localStorage` kullanıyor; gerçek kurulumda DB kaynak olacak | Korundu | Şema sürümü 3, sürüme bağlı yerel anahtar, 52 koleksiyonlu manifest |

## 3. En kritik eksik: tek kayıt, çok etki

Kaynak metin, bir satışın beş departmanı aynı anda beslemesi gerektiğini söyler. Önceki sürümde iki kademeli sevkiyat onayı stok hareketi, bildirim ve arşiv üretiyordu; ancak fatura, muhasebe fişi, müşteri bakiyesi ve maliyet yansıması üretmiyordu. Bu, "aynı bilgi farklı yerlerde tekrar girilir" problemini finans tarafında yeniden üretiyordu.

Sürüm 1.1'de `app/js/posting.js` saf bir hesap ve muhasebeleştirme modülü olarak eklendi. `Entegrasyon Matrisi` ekranındaki tek düğme, iki onayı tamamlanmış bir sevkiyatı seçer ve **tek bir işlemde** aşağıdaki kayıtları üretir.

| Sıra | Üretilen kayıt | Koleksiyon | Gerekçe |
| --- | --- | --- | --- |
| 1 | Satış faturası | `invoices` | Kantar fişi ve birim fiyattan net, KDV ve brüt hesaplanır |
| 2 | Borç / alacak fişi | `journalEntries` | 120 Alıcılar borç, 600 Satışlar ve 391 Hesaplanan KDV alacak |
| 3 | Stok çıkış hareketi | `movements` | Mamul biyet deposundan düşüm, belge referansı ile |
| 4 | Müşteri cari bakiyesi | `customers` | Alacak artışı ve kredi limiti kullanımı |
| 5 | Maliyet yansıması | `costRecords` | Döküm kodu birim maliyeti ile satılan mal maliyeti |
| 6 | Olay satırı | `events` | Üretim zincirine sevkiyat adımı eklenir, silinmez |
| 7 | Sistem bildirimi | `notifications` | Operatör ve yönetici için görünür sonuç |
| 8 | Rapor maili kuyruğu | `outbox` | İnternet yoksa kuyrukta bekler, bağlantı gelince gönderilir |

Fişin `clientId` alanı aynı sevkiyatın ikinci kez muhasebeleştirilmesini engeller. `appendJournal` dengesiz fişi kabul etmez ve aynı `clientId` ile gelen ikinci fişi yazmaz. Bu kural, `docs/09` içindeki olay idempotency ilkesinin finans tarafındaki karşılığıdır.

## 4. Eklenen kavramların gerekçesi

### 4.1 Müşteri kartı ve cari hesap

Sevkiyatta serbest metin olarak yazılan müşteri adı, aynı müşterinin farklı yazımlarıyla çoğalıyordu. Artık müşteri kartında vergi numarası, şehir, iletişim, ödeme vadesi, kredi limiti, güncel bakiye ve risk durumu tutulur. Tahsilat girildiğinde bakiye, banka hareketi ve muhasebe fişi aynı işlemde güncellenir. Cari bakiye limiti aşarsa sipariş "kredi onayı bekliyor" durumuna düşer; bu, kaynak metindeki "borç ve alacak takibi" ihtiyacının somut karşılığıdır.

### 4.2 Satış teklifi, sipariş ve rezervasyon

Teklif, sipariş ve sevkiyat ayrı belgelerdir. Teklifte alaşım, çap, ton, birim fiyat ve geçerlilik tarihi bulunur. Sipariş onaylandığında kredi kontrolü yapılır ve uygun mamul döküm kodu rezerve edilir. Böylece "hangi malzeme hangi işe gönderildi" sorusu cevaplanır. Rezervasyon serbest bırakıldığında veya sevkiyat gerçekleştiğinde durumu değişir; stok kartı tek başına tahmin üretmez.

### 4.3 Satın alma talebi, onay ve teklif karşılaştırması

Kaynak metindeki yedi adımlı satın alma akışı birebir uygulanır. Talep kritik stok uyarısından veya üretim ihtiyacından doğar, yetkili onaylar, tedarikçilerden teklif alınır, fiyat ve teslim süresi birlikte değerlendirilir, seçilen tekliften satın alma emri açılır ve fiyat geçmişine kayıt düşülür. Onay limiti ayarlardadır; limiti aşan emir "onay bekliyor" durumunda kalır. Mal kabul ve alış faturası ayrı adımlardır; stok girişi ile finansal borç aynı anda doğmaz.

### 4.4 Çift taraflı kayıt ve mizan

On iki hesaplı örnek bir tekdüzen hesap planı eklendi. Her fişin borç toplamı alacak toplamına eşittir ve bu hem fiş satırlarından hem kayıtlı toplamlardan doğrulanır. Mizan ekranı hesap bazında borç, alacak ve bakiyeyi gösterir. Fiş silinmez veya üzerine yazılmaz; düzeltme gerekiyorsa ters işlem fişi eklenir. Bu, olay günlüğünde uygulanan değiştirilemez denetim izi kuralıyla aynıdır.

### 4.5 Fatura, ödeme ve dönem kapanışı

Alış ve satış faturalarında net tutar, parametrik KDV oranı, KDV tutarı, brüt tutar, vade ve durum bulunur. Tahsilat ve ödeme kayıtları banka veya kasa yöntemiyle fişe bağlanır. Dönem kapanışı mizan dengeli değilse engellenir; kapanan dönem için bütçe sapması ve yönetim raporu üretilir. KDV beyannamesi, e-fatura ve banka mutabakatı gerçek kurulumda ayrı entegrasyonlardır, bu prototipte yer almaz.

### 4.6 Döküm kodu maliyet nesnesi

Hammadde, enerji, sarf, işçilik ve fire olmak üzere beş kalem ayrı tutulur. Toplam, net tona bölünerek ton ve kilogram başına birim maliyet üretilir. Kayıtlı toplam ile kalemler toplamı uyuşmazsa tutarsızlık olarak görünür. Satış geliriyle karşılaştırılıp brüt kâr ve marj hesaplanır. Örnek `DK-2026-0139` için 14 ton net üretim, 412.000 ₺ toplam maliyet, ton başına 29.428,57 ₺ ve kilogram başına 29,4286 ₺ değerleri kullanılır. Bu rakamlar demo verisidir, sahada ölçülmüş maliyet değildir.

### 4.7 Depo, fiziki sayım ve denetim izi

Beş depo lokasyonu tanımlanır: hammadde, sarf, yan ürün, mamul biyet ve sevkiyat sahası. Fiziki sayımda beklenen ile sayılan arasındaki fark, onaylanmışsa stok düzeltme hareketi, düzeltme fişi ve denetim kaydı olarak üç yere birden yazılır. Fark tek başına stok kartına işlenmez; bu, kaynak metindeki "stok bilgileri güncel olmayabilir" probleminin denetimli çözümüdür.

### 4.8 Personel ve vardiya

Genel ERP metnindeki maaş, bordro, izin ve performans modülleri bu projenin kapsamına **bilinçli olarak alınmadı**. Dökümhanede ERP'nin ihtiyaç duyduğu insan kaynağı bilgisi, hangi operatörün hangi vardiyada hangi olayı yazdığıdır. Personel kartı kullanıcı hesabına, vardiya kartı sorumluya ve operatör listesine bağlanır; olay günlüğündeki `actor` alanı bu yapıya dayanır. Gece vardiyası günü aşan saat aralığıyla modellenir. Ücret ve özlük verisi harici bordro servisinde kalır, referans alanıyla işaret edilir. Böylece operatör ekranı gereksiz alanlarla kalabalıklaşmaz.

### 4.9 Bütçe ve yönetici göstergeleri

Dönem bazında hammadde, enerji, sarf, bakım ve işçilik kalemleri için planlanan ve gerçekleşen tutarlar tutulur. Yönetici panelinde satış geliri, üretim tonajı, fire oranı, bütçe kullanımı, müşteri alacağı, tedarikçi borcu ve zamanında sevk oranı tek ekranda toplanır. Bu göstergeler farklı koleksiyonlardan hesaplanır, ayrıca elle girilmez.

## 5. Kasten kapsam dışı bırakılanlar

| Kaynak metindeki başlık | Karar | Gerekçe |
| --- | --- | --- |
| Maaş, bordro, izin, işe giriş-çıkış, eğitim ve performans | Dışarıda | Harici bordro servisi; ERP yalnızca vardiya ve operatör izini tutar. Operatör ekranı sade kalmalı |
| Proje bütçesi, taahhüt işi, kâr/zarar proje kartı | Tercüme edildi | Stok üretimi yapan dökümhanede maliyet nesnesi döküm kodudur |
| AutoCAD, BIM, CAD entegrasyonu | Dışarıda | Kaynak metin de ERP'nin çizim yazılımı olmadığını belirtir; bu fabrikada teknik çizim süreci yok |
| Kampanya, fırsat, CRM pazarlama | Dışarıda | Sipariş alan bir satış modülü yeterli; müşteri kartı ticari veriyi taşır |
| Perakende POS, e-ticaret, mağaza | Dışarıda | Satış tonaj ve kantar fişi ile yapılır |
| KDV beyannamesi, e-fatura, banka mutabakatı | İleri aşama | Mevzuat ve dış servis entegrasyonu gerektirir; prototip yalnızca oran ve fiş mantığını gösterir |
| Çoklu para birimi, grup konsolidasyonu | İleri aşama | Ayarlarda tek para birimi; çok fabrikalı yapı `plantId` ile korunur |
| Gerçek veritabanı, API, RBAC, VPN, OPC UA | İleri aşama | `docs/04` ve `docs/10` yol haritasında aşama 8 ve sonrası; prototip kapalı çevrim demosudur |

Bu kararlar, ilk sohbetteki "ekran kalabalık olmasın", "operatör ekranı ile bizim merkezi yönetim ekranımız ayrı olsun" ve "şekil şema çizme, sadece anlatım" yönergeleriyle uyumludur. Ayrıca `docs/06` içinde belirsiz kalmış `PIS`, `GNSL`, `Stone` ve `Barsa piyazesi` ifadeleri hâlâ doğrulanmamıştır; bu güncellemede de kodda sabit değer olarak yer almazlar.

## 6. Veri, şema ve ekran değişiklikleri

`app/js/seed.js` tek veri kaynağı olmayı sürdürür. Sürüm 1.1'de on sekiz yeni koleksiyon eklendi.

| Koleksiyon | İçerik | Koleksiyon | İçerik |
| --- | --- | --- | --- |
| `accounts` | 12 hesaplı örnek hesap planı | `invoices` | Alış / satış faturaları, KDV, vade |
| `customers` | Müşteri kartı, limit, bakiye, risk | `journalEntries` | Çift taraflı muhasebe fişleri |
| `quotations` | Satış teklifleri | `payments` | Tahsilat ve ödeme |
| `salesOrders` | Sipariş, ton, fiyat, sevk durumu | `warehouses` | Depo lokasyonları ve kapasite |
| `purchaseRequests` | Talep, gerekçe, onay izi | `stockCounts` | Fiziki sayım ve fark |
| `purchaseQuotes` | Tedarikçi teklifi ve puanı | `reservations` | Sipariş ile döküm kodu bağlantısı |
| `costRecords` | Beş kalem döküm kodu maliyeti | `employees` | Personel, kullanıcı, vardiya |
| `shifts` | Vardiya, sorumlu, devir notu | `budgets` | Planlanan ve gerçekleşen |
| `periodClosures` | Mizan ve dönem durumu | `integrationRules` | Tetikleyici ve ürettiği kayıtlar |

Sayısal özet: varlık sayısı 35'ten **53'e**, ekran sayısı 24'ten **32'ye**, menü öğesi 32'ye, `schemaVersion` 2'den **3'e**, `server/erp/data/` içindeki JSON dosyası 35'ten **53'e** çıktı. Doğrulayıcı 52 koleksiyonu ve `settings.json` dosyasını kapsar.

Yeni ekranlar şunlardır: **Satış Siparişleri**, **Müşteriler & Cari**, **Talep & Teklif Akışı**, **Muhasebe & Fişler**, **Maliyet & Kârlılık**, **Depo, Rezervasyon & Sayım**, **Personel & Vardiya**, **Entegrasyon Matrisi**. Menüde satın alma grubu talep ekranıyla genişletildi; ticari, finans, depolama, personel ve entegrasyon için ayrı gruplar açıldı.

Yerel depolama anahtarı artık şema sürümüne bağlıdır (`erp_demo_state_v3`). Böylece eski sürümden kalan, yeni koleksiyonları içermeyen veri yüklenip ekranları bozmaz. `settings` içine KDV oranı, maliyet yöntemi, açık dönem, varsayılan depo, satın alma onay limiti, kredi kontrolü ve otomatik muhasebeleştirme anahtarları eklendi. `docs/09` içindeki olay ve arşiv kuralları değişmedi; olay günlüğü muhasebe fişi üretiminde de kaynak olarak kullanılır.

## 7. Doğrulama sonuçları

| Komut | Sonuç |
| --- | --- |
| `node --input-type=module --check` (tüm `app/js/*.js`) | Sözdizimi hatası yok |
| `node tools/smoke_test.mjs` | 32 menü / 32 ekran, mizan dengeli, maliyet tutarlı, idempotency dahil tüm testler geçti |
| `python3 server/erp/scripts/validate_data.py` | 52 koleksiyon, 0 hata, 1 bilgilendirici uyarı (demo stok fotoğrafı) |
| `node tools/export_seed.mjs` | 53 JSON dosyası, `manifest.json` içinde `schema_version: 3` |
| `python3 tools/build_docx.py` | 12 doküman tek Word dosyasında birleşti |
| Tarayıcı DOM etkileşim testi | 32 ekran hatasız açıldı, yeni ekranların form ve akışları çalıştı |

Doğrulayıcı artık yalnızca referans bütünlüğüne bakmaz; borç ile alacağın eşitliğini, KDV hesabını, fatura tutarlarını, maliyet kalemleri toplamını, sayım farkını, vardiya saatlerini, dönem kapanış koşulunu ve entegrasyon kuralı alanlarını da kontrol eder.

## 8. İleri aşamada kalan açıklar

Bu güncelleme ticari ve finansal iskeleti tamamlar; aşağıdakiler hâlâ gerçek kurulum işidir. Prototip `localStorage` kullanır, gerçek sistemde veritabanı tek doğruluk kaynağı olmalı ve fişler tek bir veritabanı işlemi içinde yazılmalıdır. Standart maliyet ile fiilî maliyet ayrımı, ağırlıklı ortalama veya FIFO stok değerleme tercihi, e-fatura ve banka entegrasyonu, KDV mevzuatı, rol bazlı yetki ve görev ayrılığının sunucuda zorunlu kılınması, çevrimdışı istemciler arasındaki çakışma çözümü ve çok fabrikalı konsolidasyon açık kalmıştır. Ayrıca `docs/06` Bölüm 5'teki sekiz soru, özellikle 17 tondan 14 tona düşüşün dağılımı ve 300 mm kafa payının tek veya çift uç olması, maliyet ve fire hesabının doğruluğunu doğrudan etkiler.

Bu açıklar `docs/10` yol haritasındaki aşama sırasını bozmaz: önce merkezi altyapı ve modül tanımları, sonra üretim ve hesap motoru, ardından ticari ve finansal katman, en sonda gerçek PLC, uzaktan güncelleme ve dış servis entegrasyonları gelir. İlk sohbetteki "Satın Alma + Stok Faz 1, Üretim Faz 2" sırası korunmuştur; burada yapılan, iki fazın arasına değil **ortak veri modelinin üzerine** bir ticari katman eklemektir.

## 9. Sonuç

Kaynak metnin projeye kattığı en değerli fikir yeni bir modül değil, **bir kaydın bütün departmanları aynı anda beslemesi** ilkesidir. Önceki sürüm bu ilkeyi üretim ve olay tarafında uygulamış, finans ve cari tarafında uygulamamıştı. Sürüm 1.1 bu eşitsizliği giderir: onaylanan bir sevkiyat artık stok, fatura, muhasebe fişi, müşteri bakiyesi, maliyet, olay günlüğü, bildirim ve rapor kuyruğunu tek işlemde üretir. Genel ERP metnindeki proje, bordro ve CAD örnekleri dökümhane gerçeğine göre ya tercüme edilmiş ya da bilinçli olarak dışarıda bırakılmıştır.

Sohbetin en baştaki hedefi olan "tüm işlevleri tek bir Word'e döküp yapay zekâya atıp genel yazılım altyapı şemasını oluşturmak" adımı için gereken girdi güncellenmiştir: `docs/Dokumhane-ERP-Plan.docx` artık `00` ile `11` arasındaki on iki dokümanın tamamını içerir.
