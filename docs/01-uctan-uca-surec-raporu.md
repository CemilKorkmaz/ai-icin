# 01 — Alüminyum Dökümhane ERP Sistemi / Uçtan Uca Süreç Tanım Raporu

**Doküman türü:** İşlevsel gereksinim raporu
**Kapsam:** Satın alma emrinden sevkiyat arşivine kadar tüm uygulama hatları
**Hazırlanış:** Sohbetteki devrik cümleli anlatım, mantıksal sıraya konularak pür pak bir rapor hâline getirilmiştir.
**Biçim kuralı:** Kullanıcının isteği gereği bu dokümanda şekil, şema, ok, kutu çizimi veya diyagram bulunmaz; yalnızca başlıklar altında metin anlatımı vardır.

---

## Bölüm 1 — Satın Alma Yönetimi

### 1.1 Malzeme Tanımları

Sistemde yer alan malzemeler sabit bir listeden gelmez; tamamı kullanıcı tarafından oluşturulan kartlardan oluşur. Yeni malzeme ekleme, adını değiştirme, birimini değiştirme, kategorisini değiştirme ve kartı pasife alma işlemleri kullanıcıya açıktır. Kategoriler de aynı şekilde değişkendir: hammadde, sarf malzeme, yardımcı malzeme ve yan ürün gibi ana gruplar öntanımlı olarak gelir, ancak kullanıcı bunları çoğaltabilir ve yeniden adlandırabilir.

Hammadde grubunda alüminyum külçe, alüminyum hurda, silisyum, magnezyum, bakır, çinko ve altibor gibi alaşım elementleri yer alır. Gelen hurda iki şekilde değerlendirilir: ya kırıcı ve ayıklama biriminden geçirilir ya da uygun görüldüğünde doğrudan üretime sevk edilir. Her iki yol da sistemde ayrı bir işlem kaydı olarak tutulur. Sarf malzeme grubunda her dökümde tüketilen filtre, tıkaç, besleyici gibi ürünler; yardımcı malzeme grubunda testere yağı, kesici uç, refrakter, flux, argon ve azot gibi gazlar bulunur. Yan ürün grubu ise üretim sırasında ortaya çıkan cüruf, talaş, kafa kesimi, yolluk ve filtre artığı ile fire biyetleri kapsar.

Her malzeme kartında kod, ad, kategori, ölçü birimi, kritik stok alt sınırı, kritik stok üst sınırı, son alış fiyatı, varsayılan tedarikçi ve açıklama alanları bulunur. Birimler kilogram, ton, adet, litre, metre ve paket gibi değerlerden seçilebilir; birim tanımları da kullanıcı tarafından genişletilebilir.

### 1.2 Satın Alma Emirleri

Satın alma personeli ihtiyaç duyulan malzemeler için sisteme satın alma emri girer. Her emir bir tedarikçiye bağlıdır ve birden fazla malzeme kalemi içerir. Kalem bazında malzeme, miktar, birim ve o an geçerli birim fiyat girilir. Birim fiyatlar malzeme kartına sabitlenmez; her alışta güncel piyasa fiyatı emir üzerine yazılır ve sistem bu değeri aynı anda fiyat geçmişine kaydeder. Böylece malzeme kartındaki "son alış fiyatı" her emirde kendiliğinden yenilenir.

Emirler taslak, onay bekliyor, onaylandı, yolda, mal kabulde, kısmen tamamlandı ve tamamlandı durumlarını izler. Ödeme vadesi, emir notu, oluşturan kullanıcı ve tarih bilgileri kayıt altındadır. Kritik stok uyarısından hareketle otomatik satın alma talebi oluşturulabilmesi için emir oluşturma ekranı, uyarı ekranından doğrudan açılabilir.

### 1.3 Fiyat Takibi

Her malzemenin detayında tarihsel fiyat değişimi yer alır. Kullanıcı bir malzemeye tıkladığında geçmişten bugüne tüm alış fiyatlarını tarih sırasıyla, yanında tedarikçi, miktar ve önceki fiyata göre yüzdesel değişim bilgileriyle görür. Sistem bu verilerden fiyat artış ve azalış grafiğini otomatik üretir. Günlük, haftalık, aylık ve yıllık görünüm seçenekleri; en düşük, en yüksek ve ortalama fiyat özetleri; tedarikçi bazında filtreleme ve aynı malzemenin farklı tedarikçilerdeki fiyatlarının karşılaştırması bu ekranda sunulur. İleride metal borsası referans çizgisi de aynı grafiğe eklenebilir.

### 1.4 Tedarikçi Yönetimi

Tedarikçi kartlarında firma adı, kod, kategori, iletişim kişisi, telefon, e-posta, vergi numarası, adres ve son alış tarihi tutulur. Tedarikçinin geçmişte hangi malzemeleri hangi fiyatlarla sattığı sistemde kayıtlıdır; bu kayıtlar hem fiyat karşılaştırmasında hem de mal kabul ekranında kullanılır.

---

## Bölüm 2 — Hammadde ve Stok Yönetimi

### 2.1 Mal Kabul

Satın alma emriyle sipariş edilen malzeme fabrikaya ulaştığında stok sorumlusu mal kabul ekranını açar ve ilgili emri seçer. Ekran emirdeki kalemleri sipariş miktarıyla birlikte listeler. Kullanıcı tartımdan gelen miktarı, kabul edilen miktarı ve reddedilen veya fireye ayrılan miktarı girer. Tartı fişi numarası, araç plakası, teslim alan personel ve açıklama kaydedilir. Kabul işlemi onaylandığında yalnızca kabul edilen net miktar ilgili malzemenin stok bakiyesine eklenir ve satın alma emrinin durumu buna göre güncellenir.

Külçe, silisyum, magnezyum, filtre, tıkaç gibi doğrudan kullanılabilir malzemeler mal kabulle birlikte hammadde veya sarf stokuna girer. Hurda ise mal kabul sonrasında ya doğrudan üretime hazır stokta bırakılır ya da kırıcı birimine sevk edilir.

### 2.2 Kırıcı İşlemleri ve Fire

Kırıcıya sevk edilen hurda için operatör brüt giriş miktarını, ayıklanan fire miktarını ve fire nedenini girer. Sistem net çıkış miktarını ve fire oranını otomatik hesaplar. Örneğin on ton hurda gelmiş ve ayıklama sonucu yedi yüz kilogram fire ayrılmışsa net stok dokuz ton üç yüz kilogram olarak güncellenir ve fire oranı yüzde 7,00 olarak kaydedilir. Fire nedeni nemli malzeme, yabancı madde, paslı malzeme veya plastik karışımı gibi seçeneklerden belirlenir; firenin hurda sahasına, geri dönüşüme veya atığa gittiği de kaydedilir. Fire oranı yönetici tarafından belirlenen eşiği aştığında sistem otomatik uyarı üretir.

Kırıcı kaydı stok hareketlerine iki satır olarak yansır: brüt malzemenin fire kadar azaltılması ve ayrılan miktarın yan ürün stokuna eklenmesi. Böylece giren hammaddenin tamamının muhasebesi kapanmış olur.

### 2.3 Stok Durumu ve Kritik Seviye Takibi

Tüm malzemelerin anlık bakiyeleri, kategorilerine göre gruplanmış tek bir ekranda gösterilir. Her malzeme için kullanıcı tarafından belirlenen kritik alt ve üst sınırlar esas alınır. Bakiye alt sınırın altındaysa satır kırmızıya döner ve acil sipariş uyarısı verilir; alt sınıra yaklaştıkça satır sarıya döner; normal aralık yeşil, üst sınırın üzeri ise mavi ile aşırı stok olarak işaretlenir. Kritik değere yaklaştıkça rengin kızarması, kullanıcının tek bakışta fabrikanın genel stok sağlığını değerlendirmesini sağlar.

Stok ekranında toplam malzeme sayısı, kritik malzeme sayısı, günlük giriş ve günlük çıkış özetleri de yer alır. Bir malzeme satırına tıklandığında son hareketleri, kritik sınırları ve son otuz günlük stok eğrisi açılır.

### 2.4 Stok Hareketleri

Sistemde gerçekleşen her stok değişikliği kronolojik olarak loglanır. Mal kabul girişleri, kırıcı fire düşümleri, üretim tüketimleri, yan ürün girişleri, ocaklar arası transferler, sevkiyat çıkışları ve yetkili tarafından yapılan manuel düzeltmeler ayrı ayrı kaydedilir. Her kayıtta tarih, saat, işlem türü, malzeme, miktar, kaynak modül, referans numarası, işlem sonrası kalan stok ve işlemi yapan kullanıcı bulunur. Bu yapı, herhangi bir malzemenin geçmişe dönük tüm hareketlerinin izlenmesini sağlar.

### 2.5 Yan Ürün Stokları

Üretimde ortaya çıkan cüruf, talaş, kafa kesimi, yolluk ve filtre artığı ile fire biyetler ayrı bir yan ürün stok kategorisinde tutulur. Bu malzemeler satılabileceği gibi, döner ocak bulunan tesislerde yeniden üretime kazandırılabilir. Yan ürün stokları da aynı kritik seviye ve renk kodlaması mantığıyla izlenir; çıkışları tıpkı mamul sevkiyatında olduğu gibi iki kademeli onaydan geçer.

---

## Bölüm 3 — Üretim: Ergitme

### 3.1 Ocak Tanımları

Fabrikadaki her ergitme ocağı ayrı ayrı sisteme tanıtılır. Ocak kartında kapasite, ocak tipi, döner ocak olup olmadığı ve teknik özellikler yer alır. Yirmi tonluk ve otuz beş tonluk ocaklar gibi farklı kapasiteler, reçete hesaplarının ve döküm planlamasının temel referansıdır.

### 3.2 Alaşım Reçeteleri

Her alaşım türü ve her ocak kapasitesi için ayrı reçete tanımlanır. Örneğin 6063 alaşımı yirmi tonluk fırında üretilecekse bu kombinasyona ait bir reçete oluşturulur. Reçete, hedef kimyasal kompozisyona ulaşmak için hangi malzemeden ne kadar atılması gerektiğini tonaj üzerinden matematiksel olarak hesaplar. Külçe saf alüminyum olduğu için alaşımın ana bileşenini oluşturur; silisyum, magnezyum ve altibor gibi elementler hedef oranlara göre eklenir. Reçeteler yönetici tarafından girilir, versiyonlanır ve gerektiğinde güncellenir. Aynı alaşımın farklı tonaj ve farklı ocak için ayrı hesabı tutulur.

### 3.3 Şarj Girişi ve Süreç Yönetimi

Ergitme operatörü ocağı ve üretilecek alaşımı seçer, ocağa attığı her malzemenin gerçek miktarını girer ve süreci başlatır. Sistem girilen değerleri reçetedeki hedef değerlerle karşılaştırır. Reçete yalnızca miktar değil, zamanlama da içerir: yönetici ergitme başladıktan iki saat sonra karıştırma yapılmasını, belirli bir süre sonra da magnezyum ve silisyum eklenmesini kaydedebilir. Bu anlar geldiğinde sistem ekranda görsel ve sesli uyarı verir, yapılacak işlemi ve önerilen miktarı operatöre gösterir.

### 3.4 Gerçekleşen Miktar Kaydı ve Stok Düşümü

Reçete bir öneri değeridir; sahadaki karar esastır. Sistem seksen kilogram magnezyum önerdiğinde operatör alaşım durumuna göre elli kilogramın yeterli olduğunu değerlendirebilir. Operatör gerçekleşen miktarı elli kilogram olarak girip onayladığı anda bu miktar hammadde, yardımcı veya sarf stoklarından anında düşülür. Önerilen ile gerçekleşen arasındaki fark ayrıca kaydedilir. Böylece ocağın her şarjında kullanılan tüm malzemelerin gerçek tüketimi, zamanı ve operatörüyle birlikte kayıt altına alınmış olur.

### 3.5 Döküm Sonrası Kalan Metal Yönetimi

Ergitme tamamlanıp döküm yapıldıktan sonra ocakta artık metal kalabilir. Yirmi ton dolan bir ocaktan on yedi ton döküldüyse kalan üç tonun akıbeti sistem tarafından operatöre sorulur. Seçenekler ocakta bırakıldı, başka bir ocağa aktarıldı veya boş dökülüp hammadde olarak depoya kaldırıldı şeklindedir. Sistem seçime göre ilgili stok hareketlerini kendiliğinden gerçekleştirir: aktarımda kaynak ocaktan düşüp hedef ocağa eklenir, depolamada hammadde bakiyesi artar, ocakta bırakıldığında miktar bir sonraki şarjın açılış bakiyesi olarak taşınır.

### 3.6 Cüruf Yönetimi

Döküm sonrası ocağın üzerinden çekilen cüruf fire olarak kaydedilir. Döner ocak bulunmayan tesislerde cüruf doğrudan yan ürün stokuna geçer ve satışa konu olabilir. Döner ocak bulunan tesislerde cüruf geri kazanım sürecine alınır; eklenen tuz miktarı, kutu kola veya cüruf miktarı sisteme girilir, işlem sonucunda elde edilen net metal ile kalan fire hesaplanarak stoklara işlenir. Bu sayede geri kazanım verimliliği de ölçülebilir.

---

## Bölüm 4 — Üretim: Döküm

### 4.1 Döküm Başlatma ve Sayaç

Operatör dökümü başlattığında sistem benzersiz bir döküm kodu üretir ve sayaç çalışmaya başlar. Dökülen biyet sayısı ve biyet uzunluğu metre cinsinden girilir. Sistem biyet çapı, boy ve alüminyum özgül ağırlığı bilgilerinden toplam döküm tonajını otomatik hesaplar ve döküm kaydına yazar. Aynı döküm kodu ergitme, testere, homojenizasyon, soğutma, paketleme ve sevkiyat aşamalarında kesintisiz taşınır.

### 4.2 Döküm Fire Kaydı

Hatalı üretilen biyetler döküm ekranında fire olarak eklenir. Operatör fire biyetlerin adedini, çapını ve boyunu girdiğinde sistem fire tonajını hesaplar ve yan ürün stokuna aktarır.

### 4.3 Yolluk ve Filtre Artığı

Döküm sırasında yolluk kanalında ve filtrede bir miktar metal katılaşır. Bu miktar yolluğun uzunluğuna ve filtrenin büyüklüğüne bağlı olarak her fırın için farklı, ancak her dökümde tekrar eden sabit bir değerdir. Söz konusu metal tekrar ocağa atılıp tekrar yollukta kaldığı için döngüsel bir fire oluşur. Sistem bu malzemeyi ayrı bir yan ürün koduyla stokta tutar; böylece gerçek metal kaybı ile döngüsel fire birbirinden ayrılır ve toplam verim hesabı bozulmaz.

### 4.4 Sarf Malzeme Tüketimi

Döküm reçetesi, o dökümde kullanılacak filtre, tıkaç, altibor ve benzeri sarf malzemeleri önceden tanımlar. Döküm tamamlandığında bu malzemeler seçili reçeteye göre stoktan otomatik düşülür ve stok hareketi olarak loglanır.

---

## Bölüm 5 — Üretim: Testere

### 5.1 Kesim İşlemi

Dökümden çıkan biyetler testere birimine gelir. Operatör döküm kodunu seçip işlemi başlatır, kesilen biyet sayısını ve kesim sonrası boyları girer. İşlem bitişinde başlangıç ile bitiş arasındaki süre istatistik olarak kaydedilir.

### 5.2 Kafa Kesimi

Her biyetin iki ucundaki kafa bölümleri kesilir. Operatör kesilen kafa uzunluğunu girdiğinde sistem, dökümden gelen biyet sayısı ve çap bilgisinden kafaların toplam tonajını hesaplar ve yan ürün stokuna ekler. Sahadaki ölçümde döküm boyu 6300 milimetre, ürün boyu 6000 milimetre, kafa payı 300 milimetre ve bıçak payı 3 milimetredir; 178 milimetre çaplı bir biyetin 300 milimetrelik kafası yaklaşık 20,16 kilogram gelir. Kafa kesimi tekrar fırına atılmak üzere ayrılır, satılmaz. Kafa payının tek uçtan mı iki uçtan mı alındığı ve bıçak payının döküm boyuna dâhil olup olmadığı fabrika parametresi olarak tutulur; 6000, 300 ve 3 milimetrenin toplamı 6303 milimetre olduğu için oluşan 3 milimetrelik sapma gizlenmez, ölçüm sapması olarak olay kaydına yazılır.

### 5.3 Talaş Fire Hesabı

Testere bıçağı kalınlığı ve biyet çapı kullanılarak her kesimde oluşan talaş miktarı hesaplanır. Örneğin üç milimetrelik bıçak için kesit alanı ile bıçak kalınlığı çarpılır, toplam kesim sayısıyla çarpılarak döküm bazlı talaş fire tonajı bulunur ve talaş stoğuna eklenir. Bu, uzunluk üzerinden değil hacim ve yoğunluk üzerinden yapılan bir hesaptır; 178 milimetre çap ve 2700 kilogram/metreküp yoğunluk için tek kesimde oluşan talaş yaklaşık 0,2016 kilogramdır. Talaş kafa kesiminden ayrı tutulur, çünkü tekrar eritilemez ve dışarıya satılır. Kafa kesimi yeniden fırına gider, talaş satışa gider; sistem bu iki akıbeti aynı yan ürün kategorisi içinde ayrı alanlarla kaydeder. Kayıp hiçbir zaman sabit bir kilogram değeri olarak yazılmaz.

### 5.4 Biyet Fire

Kesim sırasında hatalı olduğu tespit edilen biyetlerin boyu girildiğinde, çap bilgisi döküm kaydından geldiği için fire tonajı otomatik hesaplanır ve yan ürün olarak ayrılır.

### 5.5 Süre Takibi ve Uyarı

Testere işleminin toplam süresi kaydedilir. Süre, beklenen değerin üzerine çıkmış ve operatör sistemi duraklatmamışsa yöneticiye otomatik bildirim gönderilir. Bu bildirim testerede olası bir arıza veya anomali şüphesini haber verir.

### 5.6 Yağ Tüketimi

Kesim sayısı ve kesim süresine bağlı olarak tahmini testere yağı tüketimi hesaplanır ve yardımcı malzeme stokundan otomatik düşülür. Fabrika, bir tank dolumu yağın kaç kesim gittiğini kendisi tanımlar; örneğin yüz kesim girildiyse sistem kesim sayacını izler ve eşiğe gelindiğinde bakım personeline yağ dolumu uyarısı gönderir. Aynı sayaç mantığı testere bıçağının ömrü için de kullanılır: bıçak belirli kesim sayısına ulaştığında uyarı üretilir, bakıma gönderildiğinde veya yenisi takıldığında yeni bıçak numarası ve tarih kaydedilir. Bütün bu eşikler parametredir, fabrikadan fabrikaya değişir.

---

## Bölüm 6 — Üretim: Homojenizasyon ve Soğutma

### 6.1 Reçete Seçimi ve Süreç Başlatma

Testereden çıkan biyetler homojenizasyon fırınına aktarılır. Operatör alaşım ve çapa göre reçeteyi seçer; örneğin 6063 alaşım ve 178 milimetre çap için tanımlı sıcaklık ve süre değerleri otomatik yüklenir. Start verildiğinde sistem saymaya başlar ve döküm kodu korunur. Operatör aynı fırına farklı döküm kodlarından karışık biyet atabilir; parti, her döküm kodu için ayrı adet satırı taşır. Böylece bir partide birinci dökümden yirmi, ikinci dökümden on beş, üçüncü dökümden on adet biyet birlikte işlenebilir ve izlenebilirlik bozulmaz.

### 6.2 Süre Aşımı Uyarısı

Homojenizasyon süresi reçetede tanımlı süreyi aşar ve operatör duraklatma yapmamışsa sistem yöneticiye uyarı gönderir. Bu uyarı fırında arıza veya proses anomalisi şüphesine işaret eder. Süre dolduğu hâlde fırın çalışmaya devam ediyorsa işlem durdurulmaz; planlanan süre, gerçekleşen süre ve aradaki sapma ayrı ayrı kaydedilir. Örneğin reçete sekiz saat istemiş, işlem dokuz saatte bitmişse kayıt "planlanan sekiz saat, gerçekleşen dokuz saat, bir saat sapma, süre aşımı" biçiminde tutulur.

### 6.3 Soğutma Prosesi

Homojenizasyon tamamlandıktan sonra aynı döküm koduna bağlı biyetler soğutmaya aktarılır. Soğutma da reçeteye bağlı bir süreye sahiptir; başlatıldığında sayaç yeniden çalışır ve süre aşımında aynı uyarı mekanizması devreye girer. Soğutma tamamlandığında operatör biyetleri paketlemeye aktardığını sisteme kaydeder.

---

## Bölüm 7 — Paketleme ve Mamul Stok

Soğutmadan çıkan biyetler paketleme biriminde mamul ürün statüsüne geçer. Her biyet grubu döküm kodu, alaşım türü, çap, boy ve adet bilgileriyle mamul stokta yer alır. Bu andan itibaren sevkiyat ekranında seçilebilir hâle gelir. Paketlemede kullanılan bağlama, etiket ve benzeri malzemeler tanımlanmışsa stoktan düşülür.

---

## Bölüm 8 — Sevkiyat ve Satış

### 8.1 Sipariş ve Biyet Seçimi

Sevkiyat operatörü alıcısı belli olan çıkış için mamul stoktan ilgili döküm koduna ait biyetleri ve miktarı seçer. Aynı döküm kodundan farklı müşterilere parçalı sevkiyat yapılabilir.

### 8.2 Kantar Fişi ve Birinci Onay

Sevkiyat hazırlığından sonra kantar fişi alınır ve gerçek ağırlık sisteme girilir. Birinci onay yöneticiye düşer; yönetici kantar fişi ağırlığı ile sistemdeki seçili biyet miktarını karşılaştırır ve onay verir. Onay verilene kadar sevkiyat "onay bekliyor" durumunda kalır ve stoktan hiçbir düşüm yapılmaz.

### 8.3 İkinci Onay ve Fatura

Yönetici onayından sonra kayıt, muhasebe veya fatura sorumlusunun ekranına düşer. Sorumlu müşteri bilgilerini, araç plakasını ve fatura numarasını girerek ikinci onayı verir. Bu onayla birlikte mamul stoktan ilgili miktar otomatik düşülür.

### 8.4 Arşivleme

İki onay tamamlandıktan sonra sevkiyat kaydı arşive taşınır. Arşiv kayıtları aylık bazda saklanır ve geçmişe dönük sorgulanabilir; fatura bilgileri, müşteri detayları, döküm kodları, kantar fişi ve onaylayan kullanıcılar birlikte muhafaza edilir.

### 8.5 Yan Ürün ve Hammadde Satışı

Cüruf, talaş ve diğer yan ürünlerin satışının yanı sıra, gerektiğinde hammadde veya silisyum gibi malzemelerin çıkışı da aynı süreçten geçer: stoktan seçim, kantar fişi, yönetici onayı, muhasebe onayı ve arşiv. Fabrikadan çıkan her madde için tek ve kontrollü bir çıkış süreci uygulanır.

---

## Bölüm 9 — İstatistik ve Raporlama

### 9.1 Üretim İstatistikleri

Sistem günlük, haftalık, aylık ve yıllık bazda üretim istatistiklerini otomatik derler. Toplam üretilen biyet miktarı, alaşım bazlı dağılım, ocak bazlı verimlilik, döküm sayıları ve proses süreleri temel göstergelerdir.

### 9.2 Tüketim Raporları

Belirli bir dönemde tüketilen hammadde, alaşım elementi, sarf malzeme, yardımcı malzeme, gaz ve enerji miktarları detaylı olarak raporlanır. Fire oranları, yağ tüketimi ve proses süre sapmaları da aynı ekranda yer alır.

### 9.3 Giren-Çıkan Karşılaştırması

Fabrikaya giren toplam hammadde ile çıkan toplam mamul ve yan ürün karşılaştırılır; aradaki fark fire ve kayıp olarak analiz edilir. Bu karşılaştırma üretimin genel verimliliğini gösteren en önemli göstergedir.

### 9.4 Rapor Çıktıları

Tüm istatistikler ekranda anlık görüntülenir; gerektiğinde PDF veya Excel çıktısı alınır. Günlük, haftalık ve aylık durum raporları zamanlayıcı ile üretilip e-posta kuyruğuna yazılır.

---

## Bölüm 10 — Sistem Geneli Özellikler

### 10.1 Bildirim ve Uyarı Mekanizması

Kritik stok uyarıları, ergitme zamanlama uyarıları, proses süre aşımı uyarıları, fire oranı uyarıları ve onay bekleyen işlemler için ilgili kullanıcılara bildirim üretilir. İnternet bağlantısı olmayan dönemlerde bildirimler kaybolmaz; giden kutuya alınır, bağlantı geldiğinde SMS veya e-posta olarak iletilir.

### 10.2 İzlenebilirlik

Her biyet döküm kodu üzerinden geriye doğru izlenebilir: mamul biyetin hangi dökümden çıktığı, dökümde hangi şarjın kullanıldığı, şarjda hangi hammaddelerin hangi tedarikçiden hangi fiyata alındığı ve hangi proseslerden geçtiği zincir hâlinde kayıtlıdır. Bu zincir tek bir büyük kaydın üzerine yazılmasıyla değil, her aşamadan bir olay satırı düşürülerek tutulur. Döküm kodu açılır, aktarım, yollukta tutulan metal, kafa kesimi, talaş, net biyet, homojenizasyon, soğutma ve sevkiyat ayrı satırlar olarak eklenir; her satır kendi bakiyesini ve zaman damgasını taşır. Böylece dosya kabarmaz, geçmiş değiştirilemez ve sonradan oluşan bir durum yeni satır olarak eklenir.

### 10.3 Otomatik Stok Entegrasyonu

Satın almadan sevkiyata kadar tüm süreçlerde stok hareketleri manuel müdahale gerektirmeden gerçekleşir. Mal kabulde stok artar; kırıcıda fire düşer; ergitmede hammadde, dökümde sarf malzeme, testerede yağ düşer; yan ürünler stoğa eklenir; sevkiyatta mamul düşer. Her hareket anlık bakiyelere yansır ve loglanır.

### 10.4 Değişken Yapı İlkesi

Malzemeler, kategoriler, birimler, tedarikçiler, ocaklar, reçeteler, kritik stok eşikleri, kullanıcılar ve roller hiçbir yerde sabit kodlanmaz. Sistemin davranışı kullanıcı tanımlarıyla şekillenir; yeni bir malzeme veya yeni bir alaşım tanımlamak için geliştirici müdahalesi gerekmez.

### 10.5 Kullanıcı ve Yetki Yapısı

Yönetici, satın alma personeli, stok sorumlusu, kırıcı operatörü, ocakçı, döküm operatörü, testere operatörü, homojenizasyon operatörü, sevkiyat sorumlusu, muhasebe ve salt-okunur görüntüleyici rolleri tanımlanır. Onay akışlarında görev ayrılığı zorunludur: sevkiyatı onaylayan yönetici ile fatura onayı veren kullanıcı aynı kişi olamaz.

### 10.6 Ticari ve Finansal Entegrasyon

Üretim tarafında geçerli olan tek kayıt ilkesi ticari taraf için de uygulanır. Satış teklifinden sipariş, siparişten stok rezervasyonu doğar. İki onaylı sevkiyat tamamlandığında satış faturası, borç ve alacak fişi, müşteri cari bakiyesi, döküm kodu maliyet yansıması, olay satırı ve rapor kuyruğu aynı işlemde yazılır; muhasebe personeli aynı bilgiyi yeniden girmez. Alış tarafında talep, onay, tedarikçi teklifi, satın alma emri, mal kabul ve alış faturası aynı disiplinle birbirine bağlanır. Her muhasebe fişinde borç toplamı alacak toplamına eşittir; dengesiz fiş kabul edilmez ve düzeltme ters fişle yapılır. Üretim maliyeti bir inşaat projesine değil döküm koduna bağlanır; hammadde, enerji, sarf, işçilik ve fire ayrı kalemlerde toplanıp birim maliyet ve brüt kâr hesaplanır. Maaş ve bordro hesabı bu sistemin dışında kalır. Bu katmanın gerekçesi ve kapsam dışı bırakılan başlıklar `docs/11` içinde ayrıntılıdır.

### 10.7 Fabrikaya Göre Değişen Kurulum

Sistemin bir fabrikada bir fırın, başka bir fabrikada iki veya beş fırın ile çalışması yazılım değişikliği gerektirmez. Fabrika kartı, makine tipleri, makineler, döküm yolları, PLC adresleri, eşikler ve açık modüller veri olarak tanımlanır. Gerçek sahaya gidildiğinde kurulum sihirbazıyla fabrika kartı doldurulur, sahadaki makineler sayılıp eklenir, fırın ile tabla arasındaki yollar ve yollukta tutulan tonaj girilir, bağlantı testi yapılır ve açılacak modüller seçilir. Daha önce hazırlanmış bir fabrika profili varsa JSON paketi olarak içe alınır veya fırın sayısı azaltılarak kopyalanır.

Makine söküldüğünde kayıt silinmez. Önce o makineye bağlı döküm kodları, yollar, bakım kayıtları ve olaylar listelenir; gerekçe yazılarak makine devre dışı bırakılır. Geçmiş üretim raporları ve kütle dengesi böylece okunabilir kalır, istenirse makine geri alınır. Kapalı bir modülün menüsü ve kuralları görünmez; verisi silinmez. Ayrıntılar `docs/12` içindedir.

---

## Kapanış

Bu rapor, alüminyum dökümhane ERP sisteminin satın alma aşamasından sevkiyat arşivine kadar tüm işlevsel hatlarını kapsar. Bir sonraki adımda bu metin, `docs/02` içindeki Faz 1 ekran planına, `docs/03` içindeki ana plan dokümanına ve `docs/04` içindeki yazılım altyapı kararlarına temel girdi olarak kullanılmıştır. Bu dokümanda şekil, şema, ok veya kutu çizimi yoktur; bütün süreç yalnızca başlıklar ve anlamlı, sıralı anlatım olarak verilmiştir. Teknik mimari kararları da yine yalnızca metin ve tablo olarak `docs/04` içinde, saha görüşmesinden gelen ayrıntılı hesap, modüler makine, olay arşivi ve kurulum kararları `docs/06` ile `docs/10` arasında, genel ERP karşılaştırmasıyla eklenen ticari ve finansal katmanın gerekçesi `docs/11` içinde, gerçek fabrikaya bağlanma ve modül yaşam döngüsü `docs/12` içinde bulunur.
