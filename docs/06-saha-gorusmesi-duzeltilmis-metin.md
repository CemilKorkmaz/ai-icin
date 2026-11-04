# 06 — Saha Görüşmesi: Ham Kayıt Değerlendirmesi ve Düzeltilmiş Teknik Anlatım

Bu doküman, mühendis ile yapılan ses kaydının metne çevrilmiş hâlini ve bir düzenleme sitesinden geçirilmiş sürümünü **kaynak olarak** alır. Amaç, konuşmanın içeriğini değiştirmeden, ses tanıma yazılımının bozduğu teknik terimleri düzeltmek, tekrarları ayıklamak ve konuları mantıklı bir sıraya koyarak **yazılım gereksinimi olarak okunabilir** bir metne dönüştürmektir.

Ham kayıtta geçen argo ve tekrarlar konuşmanın doğal akışına aittir; teknik karşılıkları aşağıda verilmiştir. Emin olunmayan ifadeler koda ve kesin şemaya dâhil edilmemiş, Bölüm 5'te ayrıca **doğrulanacak** olarak işaretlenmiştir.

---

## 1. Kaynağın güvenilirliği üzerine kısa not

Ses tanıma yazılımı sektörel terimleri sistematik olarak yanlış algılamıştır: *biyet / billet*, *yolluk*, *kafa kesimi*, *talaş*, *homojenizasyon*, *reçete*, *PLC*, *HMI*, *sürekli homojenizasyon*, *mini PC*. Ayrıca konuşmadaki "tamam mı", "anladın mı", "sallıyorum" gibi dolgu ifadeleri cümleleri bölmüş, bazı sayısal ifadeler ("6 metre 3, 30 santim") birbirine karışmıştır.

Sitenin düzenlediği sürüm **konuları doğru sıralamış ve genel anlamı korumuştur**; ancak aşağıdaki dört noktada teknik olarak eksik veya fazla yorum içerir:

| Konu | Sitedeki düzenleme | Bu dokümandaki düzeltme |
| --- | --- | --- |
| Kesim ölçüleri | 6300 mm, 6000 mm, 3 mm ayrı verilmiş, 300 mm kafa kesimi "belirli miktarlarda" denilerek geçiştirilmiş | 6300 mm döküm boyu, 6000 mm ürün boyu, **300 mm kafa kesimi** ve **3 mm bıçak payı** ayrı ayrı ve hesaba giren parametrelerdir |
| Yollukta kalan metal | "sabit kabul edilmemeli, fabrika tanımlar" denmiş | Doğru; ancak konuşmada asıl vurgu **aynı fırından farklı döküm yollarına göre tutma miktarının değişmesi**dir. Bu bir yol/hat parametresidir, tek bir döküm fire oranı değildir |
| 17 ton ve 14 ton | 21, 18, 17 ton zinciri verilmiş; 17'den 14'e düşüş açıklanmamış | Konuşmada 14 ton, **kafa kesimleri sonrası kalan net biyet** olarak geçer. Aradaki farkın kafa, talaş ve fire biyet arasında nasıl dağıldığı ölçülerek kapatılmalıdır; tek kalem yazılmamalıdır |
| Modülerlik | "fabrika yetkilisi kendi makinelerini ekleyebilmeli" denmiş | Konuşmanın ikinci yarısında bunun **açıkça tersi** söylenir: modüler yapı yazılımı geliştiren ekip içindir, fabrika operatörü makine tanımlamakla uğraşmamalıdır. Bu, en kritik düzeltmedir |
| JSON kuyruğu | "silmek yerine doğrula" önerisi eklenmiş | Yerinde bir teknik öneridir ve kabul edilmiştir. Ancak konuşmadaki asıl istek **her aşamadan bir satır düşen, döküm kodu bazlı arşivleme**dir; sitede bu satır yapısı tarif edilmemiştir |

---

## 2. Düzeltilmiş teknik anlatım

### 2.1 Genel amaç

Alüminyum biyet üreten fabrikalar için, üretimin tamamını baştan sona izleyen **modüler bir üretim takip, makine izleme ve merkezi yönetim yazılımı** geliştirilecektir. Sistem yalnızca makinelerin anlık durumunu göstermez; her döküm koduna ait alüminyum miktarının her aşamada nereye gittiğini, hangi makineden geçtiğini ve ne kadar sürede işlendiğini geriye dönük olarak saklar.

İzlenen süreçler sırasıyla fırın ve döküm, biyet üretimi, testere ile kesim, kafa kesimi ve talaş hesabı, yağ tüketimi ile bakım, homojenizasyon, soğutma, sevkiyat, makine durumları ve üretim kayıtlarının arşivlenmesidir.

### 2.2 Döküm ve kütle dengesi

Her döküm işlemine bir **döküm kodu** verilir. Örnek: DK-001, A Fırını, 21 ton başlangıç metali.

Konuşmada verilen zincir şöyledir: 21 ton metalin 3 tonu başka bir ocağa aktarılır, 18 ton kalır. Döküm yolluğunda 1 ton metal kalır, dolayısıyla fiilen **17 ton dökülür**. Kafa kesimleri ve kesim kayıplarından sonra operatörün elinde **14 ton net biyet** ve belirli bir adet kalır.

Burada iki ayrı kavram birbirine karıştırılmamalıdır. Birincisi ocaklar arası **aktarım**, ikincisi fırından döküm tablasına giden **yol üzerinde tutulan metal**dir. Fabrikada iki ocak ve bir döküm tablası varken, hangi ocaktan döküm yapıldığına göre yol kısa veya uzun olur. Kısa yolda yollukta kalan 1 ton, uzun yolda aynı işlem için 1,5 ton veya 2 tona karşılık gelir. Bu değerler sabit değildir, fabrika ve hat bazında parametre olarak girilir ve ürün kütlesine veya fireye eklenirken dikkate alınır.

### 2.3 Testere, kafa kesimi ve talaş

Dökülen biyet 6300 mm'dir. Müşteri 6000 mm ister. Operatör 6 metreyi keser, biyetin baş ve sonundaki **300 mm'lik kafaları** atar. 178 mm çaplı, 300 mm uzunluğundaki bu kütle **yan ürün** olarak kaydedilir ve **tekrar fırına atılmak üzere** ayrılır.

Buna ek olarak bıçağın **3 milimetrelik** kesme payı vardır. 178 mm çaplı bir biyetin 3 mm'lik diliminde kalan alüminyum **talaş** olur. Talaş tekrar eritilemez, dışarıya satılır; konuşmada "stone'a gidiyor" denilen yerin ne olduğu doğrulanmalıdır.

Bu hesap uzunlukla değil **hacim ve özkütle** ile yapılır. Silindir hacmi, çap, kesit alanı, bıçak kalınlığı ve alüminyumun yoğunluğu birlikte kullanılır. Konuşmada "su gibi değil, bir kilogram değil" denerek vurgulanan nokta tam olarak budur: kesim kaybı hacimseldir, sabit bir kilogram değeri değildir.

### 2.4 Yağ, bıçak ömrü ve bakım uyarıları

Kesim sırasında yağ eksilir. Fabrika, "bir tank dolumu yağ bana 100 kesim gidiyor" gibi kendi değerini tanımlar. Sistem bu değeri **parametre** olarak alır, kesim sayısını sayar ve eşiğe gelindiğinde bakımcılara "yağı doldurun" uyarısı gönderir. Başka bir fabrika aynı eşiği 150 kesim olarak girebilir.

Aynı mantık testere bıçağı için geçerlidir. Bıçağın kullanım ömrü kesim miktarına göre takip edilir, ömür dolduğunda uyarı üretilir, bıçak bakıma gönderildiğinde veya yenisi takıldığında sistemde kayıt oluşur. Bakım değişim süresi de ayrıca izlenir.

### 2.5 Homojenizasyon

Kesimden sonra biyetler homojenizasyon fırınına gider. Operatör fırına gönderilecek biyetleri seçer; **aynı partiye farklı döküm kodlarından karışık biyet atabilir**. Örnek: DK-001'den 20 adet, DK-002'den 15 adet, DK-003'ten 10 adet. Operatör bir reçete seçer ve işlemi başlatır. Sistem planlanan bekleme süresini izler.

Kritik ayrıntı: reçete 8 saat diyorsa ve 8 saat dolduğu hâlde fırın çalışmaya devam ediyorsa, bu bir hata olarak silinmez; **planlanan 8 saat, gerçekleşen 9 saat, durum "süre aşıldı"** biçiminde kaydedilir. Operatöre uyarı gider.

### 2.6 Soğutma, sevkiyat ve zincir

Homojenizasyon biter, soğutma başlar ve biter, ardından veri sevkiyat bölümüne aktarılır. Her aşama bir öncekinin verisini taşır. Bir biyetin hangi dökümden çıktığı, hangi testerede kesildiği, hangi homojenizasyon fırınında hangi partiyle işlendiği, ne zaman soğutulduğu ve hangi sevkiyatla gönderildiği tek bir döküm kodu üzerinden sorgulanabilir olmalıdır.

### 2.7 Her aşamadan bir satır: JSON arşivleme

Konuşmanın en çok üzerinde durulan konu budur. Döküm kodu verilir, alaşımlar alınır, biyet boyları ölçülür, kesimlerle kütle düşürülür ve kayıt modifiye edilir, homojenizasyon eklenir, fırın açıldıktan sonra yaşananlar eklenir. Bütün bunların **JSON içinde hangi satırlarda, hangi bilgilerle** tutulacağı baştan tasarlanmalıdır; aksi hâlde iş büyüdükçe dosya yapısı kabarıp yönetilemez olur.

Abinin tarif ettiği çalışma biçimi: HTML arayüzünde operatör bir tuşa bastığında bir JSON kaydı oluşur. Merkezi yazılım, arşivdeki ilgili JSON'ları tarar; yeni kayıt varsa alır, hesapları yapar, sonuçları ilgili yerlere yazar ve kaydı işlem kuyruğundan kaldırır. Arayüzde operatöre 1 ilâ 3 saniyelik kısa bir bekleme mesajı gösterilir. Tarama çevrimi 1 saniye veya anlık 3 saniye olarak düşünülmüştür.

**Bu dokümanın teknik kararı:** İşlenen JSON **silinmez**. Önce kalıcı arşive yazıldığı doğrulanır, sonra kuyruk kaydı "arşivlendi" durumuna geçirilir. Kuyruk ile arşiv ayrı klasörlerde tutulur; elektrik kesintisinde üretim kaydı kaybolmaz. Ayrıntılar `docs/09` içindedir.

### 2.8 Modüler makine yapısı ve fabrikadan fabrikaya değişkenlik

Gidilecek müşteride 5 fırın, 2 döküm tablası, 4 homojenizasyon fırını, 2 testere ve 1 sürekli homojenizasyon sistemi vardır. Başka bir fabrikada döner ocak gibi bambaşka bir makine bulunabilir. İsimlendirme de değişir: bir yerde A, B, C, D, E fırını, başka yerde 1. ocak, 2. ocak denir. Kapasite 20 ton veya 35 ton olabilir; konuşmada "tonaj olarak değişiyor, başka bir değişim yok" denmiştir.

Program **ilk açıldığında hiçbir makine tanımlı olmamalıdır**. Makineler modül modül eklenir. Ancak konuşmanın ikinci yarısında bu karar netleştirilir: bu modüler dashboard **müşteriye bırakılmamalı, yazılımı geliştiren ekip için tasarlanmalıdır**. Fabrika yeni bir ocak aldığında, 5 veya 10 yıl sonra bile, geliştirici ekibe haber verir; ekip uzaktan bağlanıp güncellemeyi uygular veya bir güncelleme paketi gönderir. Bu aynı zamanda verilecek **bakım hizmetinin** temelidir.

### 2.9 İki çalışma modu

Bazı müşteriler PLC bağlantısı ister, bazıları istemez. PLC istemeyen fabrikada makinelerden hiçbir veri alınmaz; operatör anlattığı bilgileri elle girer ve sistem kendi kayıtlarını tutar. PLC isteyen fabrikada veriler doğrudan makinelerden çekilir. Aynı yazılım iki modda da çalışmalı, üretim mantığı değişmemelidir.

### 2.10 Merkezi yönetim ekranı

Yazılımı geliştiren ekibin, fabrika operatörünün gördüğünden **ayrı** bir ekranı olmalıdır. Bu ekran beyaz zemin üzerinde siyah satırlardan oluşan eski tip bir araç değil, modern ve kullanışlı bir arayüzdür; çünkü bu ekranı sürekli kendimiz kullanacağız. Örnek: "Firma 1" eklenir, ilgili PLC'nin IP adresi, haberleşme bilgisi ve okunacak veri adresleri yazılır; şu adresten al, şu adresten oku, şu veriyi çek eşleştirmeleri yapılır. Bundan sonra sistem kendi kendine çalışır; ekip yalnızca aletleri eşleştirir.

Bu ekranın varlık sebebi şudur: bir müşteri PLC ister, diğeri istemez; biri "1'den 3'e aktarıyorum, 3'ten 1'e aktarıyorum" gibi kendine özel not toplama/çıkarma kuralları ister. Bu çeşitlilik operatör ekranına yansıtılmadan, merkezi yapılandırmada tutulur.

### 2.11 Okunacak PLC sinyalleri: sade tutulacak

HMI panelinde çok fazla sinyal vardır; hepsi okunmamalıdır. Amaç hem ekranı kalabalıklaştırmamak hem de geliştirme yükünü artırmamaktır. İlk aşamada dört temel bilgi yeterlidir:

1. **Kapı durumu.** Kapı açık sinyali geliyorsa açık, gelmiyorsa kapalı kabul edilir.
2. **Döküm modu ve devrilme durumu.** Fırın döküm modunda mı, devrildi mi, döküm başladı mı.
3. **Alarm durumu.** Her makinede bir arıza lambası vardır; yandığında makinenin arızada olduğu anlaşılır.
4. **Çalışma durumu.** Makine çalışıyor mu, durdu mu.

Alarm bilgisi yalnızca "bu fırında sorun var" der. Sorunun ateşleyicilerden birinin çalışmaması gibi ayrıntısını öğrenmek için daha detaylı veri gerekir; ilk fazda buna girilmez. Sade tutulur.

### 2.12 HTML, JSON ve merkezi yazılımın ilişkisi

Konuşmada netleşen ayrım şudur: JSON dosyaları HTML arayüzleri tarafından yalnızca **okunur**. Arayüz bir şey yazacaksa bunu ayrı bir kuyruğa yazar. Merkezi yazılım kuyruğu okuyan, PLC'den veri çeken, HTML arayüzleriyle alışverişi yapan ve hesapları yapan taraftır. Ekip yalnızca makineleri eşleştirir; gerisi otomatik yürür.

### 2.13 İlk çalışma: merkezi yönetim önce gelir

Abi, konuşmanın sonunda bütün yazılımın hemen yazılmasını istemez; önce **sistemin nasıl kurulacağının** bulunmasını ister. İlk ortam bir mini PC veya sıradan bir laptop olabilir; sistem oraya kurulup çalıştırılacak ve örnek verilerle denenecektir. Ama bundan önce mutlaka **merkezi yönetim altyapısı** kurulmalıdır. Sıra: merkezi yönetim, makine ve fabrika tanımlama, JSON veri alışverişi, üretim modüllerinin iskeleti, örnek veriyle test, en sonda gerçek PLC bağlantıları.

---

## 3. Ses tanıma hataları ve teknik karşılıkları

| Ham metinde duyulan | Doğru teknik karşılık | Açıklama |
| --- | --- | --- |
| Biyet, bilet, billet | **Billet / biyet** | Sürekli dökümle üretilen alüminyum kütük |
| Yolduk, yoldukta | **Yolluk / döküm yolluğu** | Fırından tablaya giden kanal ve orada tutulan metal |
| Saf küçük | **Kafa kesimi / kırpıntı** | Baş ve sondan kesilen parça |
| Bıçağın 3 milimetrelik kazıyarak kesme şeyi | **Testere bıçağı kerf payı (3 mm)** | Talaşa dönüşen kesim dilimi |
| Talaş stone'a gidiyor | **Talaş satışa / hurda alıcısına gidiyor** | "Stone" doğrulanmalı |
| Öz kütle, su gibi değil, yağ | **Yoğunluk (kg/m³) ile hacim hesabı** | Kesim kaybı sabit kg değildir |
| 6 metre 3, 30 santim | **6300 mm döküm, 6000 mm ürün, 300 mm kafa** | Sayılar birbirine karışmış |
| Reçite | **Reçete** | Homojenizasyon veya alaşım reçetesi |
| Homojeni aldık, homojeni açtık | **Homojenizasyon partisi başlatıldı / tamamlandı** | Süreç adı |
| Continue homojen sistemi | **Sürekli homojenizasyon hattı** | Continuous homogenization |
| Crate, crate ocağın ismi | **Create / yeni ocak oluştur** | Ekran üzerinden makine ekleme |
| Er gitme ocağı | **Ergitme ocağı** | Fırın tipi |
| GNSL ümüğümle, PİS, PIS | **Doğrulanmadı** | Otomasyon sistemi / PIMS / HMI olasılıkları |
| Fightin, Sikko | **Eski tip sade arayüz** | "Beyaz satırlarda siyah yazı" tarifi |
| Barsa piyazesi | **PLC adresi / veri bloğu** (doğrulanmalı) | Firma özel PLC eşleştirmesi |
| HTML'ler | **HTML arayüzleri / HMI panelleri** | Operatör ekranları |
| Operatörel sansör | **Operatör veri girişi, sensör yok** | PLC'siz mod |
| Ateşleri çalışmıyor | **Ateşleyici / brülör arızası** | Alarm detayı, ilk faza alınmaz |
| PİK PİK, mini pist | **Mini PC** | Merkezi sunucu donanımı |
| Not toplama çıkartmaya gitti | **Kendine özel toplama/çıkarma kuralları** | Fabrikaya özel iş kuralı |
| Bastır, tık düşüreceğiz | **Kaydet butonu, kuyruğa olay yaz** | HTML'den JSON kuyruğuna kayıt |
| 1 saniye devir, anlık 3 saniye devir | **1–3 saniyelik tarama çevrimi** | Worker polling aralığı |

---

## 4. Sitedeki düzenlenmiş metnin karşılaştırmalı değerlendirmesi

**Doğru aktarılanlar:** projenin bir dashboard'dan ibaret olmadığı; 21, 18, 17 ton zinciri; 6300/6000/3 mm ölçüleri; 178 mm çap; geometrik hacim ve yoğunluk; yağ ve bıçak ömrünün kesim sayısına bağlı parametrik uyarıları; farklı döküm kodlarından karışık homojenizasyon partisi; 8 saat planlanan ve 9 saat gerçekleşen süre kaydı; soğutma ve sevkiyat zinciri; fabrikadan fabrikaya değişen makine sayıları ve isimlendirmeler; iki çalışma modu; dört temel PLC sinyali; iki ayrı arayüz; uzaktan güncelleme ve bakım hizmeti; mini PC ile başlama sırası; belirsiz kelimelerin ayrı listelenmesi.

**Eksik bırakılanlar:** 17 tondan 14 tona düşüşün kütle dengesi olarak ele alınması; 300 mm kafa kesiminin yeniden fırına giden yan ürün, 3 mm talaşın satılan yan ürün olarak **birbirinden ayrılması** ve bunların akıbet (fate) alanıyla modellenmesi; farklı döküm yollarının tutma miktarının bir hat parametresi olması; "her aşamadan bir satır" isteğinin somut olay şemasına çevrilmesi; modüler yapının **müşteri için değil geliştirici ekip için** olduğu düzeltmesi; ilk açılışta makine olmaması ile operatörün makine eklememesi arasındaki ince ayrım; kuyruk ve arşivin ayrı klasörlerde tutulması.

**Fazla yorum içerenler:** "Fabrika yetkilisi kendi makinelerini sisteme ekleyebilmeli" ifadesi konuşmanın son yarısıyla çelişir. "Makine özelliklerini tanımla" ifadesi, konuşmada "tonaj dışında başka değişim yok" denmesiyle sınırlıdır; yakıt tipi, brülör sayısı gibi alanlar ilk faza alınmamalıdır. "Çalışma durumu" ve "devrilme durumu" sitenin tablosunda ayrı ayrı sayılmıştır; konuşmada bunlar döküm modu başlığı altında tek grup olarak geçer, sistemde dört sinyal olarak sadeleştirilmelidir.

---

## 5. Doğrulanması gereken ifadeler ve abiye sorulacak sorular

Aşağıdaki ifadeler kesinleşmeden şemaya veya koda sabit değer olarak girilmeyecektir; sistemde parametre veya serbest metin olarak tutulacaktır.

| belirsiz ifade | Muhtemel karşılığı | Neden sorulmalı |
| --- | --- | --- |
| `Stone` | Hurda alıcısı, stok kodu veya "store" | Talaş satışının hangi varlığa yazılacağı belirlenecek |
| `PIS` / `PİS` | PIMS, MES veya PLC veri katmanı | Haberleşme modülünün karşı tarafı |
| `GNSL` | Anlaşılamadı | PLC'siz modun tarifinde geçiyor |
| `Saf küçük` | Kafa kesimi / kırpıntı | Yan ürün kartının adı |
| `Barsa piyazesi` | PLC veri adresi / tag bloğu | Merkezi eşleştirme ekranının alan adı |
| `Continue homojen` | Sürekli homojenizasyon hattı | Ayrı makine tipi olarak mı, parti fırını gibi mi modellenecek |

**Sorular**

1. 17 tondan 14 tona inerken kaybolan yaklaşık 3 tonun dağılımı nedir: yalnızca kafa kesimi mi, yoksa kafa kesimi + talaş + fire biyet + yolluk artığı mı?
2. 300 mm kafa kesimi her biyetin **iki ucunun toplamı** mı, yoksa tek uçtan mı kesiliyor?
3. 6300 mm'nin içine 3 mm bıçak payı dâhil mi? Dâhilse kafa payı 297 mm mi olmalı?
4. Yollukta kalan metal ürüne mi ekleniyor, yoksa ayrı yan ürün olarak mı stoklanıyor? Önceki süreç raporunda döngüsel yan ürün olarak geçiyordu.
5. "1 ton, öbür yolda 2 tona tekabül ediyor" ifadesi yol uzunluğuna bağlı bir **çarpan** mı, yoksa her hat için ayrı girilen **sabit tonaj** mı?
6. Bir tank yağın "100 kesim" değeri, kesim **adedi** üzerinden mi yoksa kesilen **toplam kesit alanı / tonaj** üzerinden mi sayılacak?
7. Homojenizasyon partisi farklı döküm kodlarından karışık biyet aldığında, sevkiyatta izlenebilirlik hangi koda bağlanacak: parti kodu mu, biyetin kendi döküm kodu mu?
8. `Stone` talaşın satıldığı müşteri mi, yoksa dahili bir hurda stok konumu mu?

---

## 6. Ham kayıttan korunan özgün cümleler

Kayıtların izlenebilirliği için, teknik kararların dayandığı özgün ifadelerden bazıları olduğu gibi saklanmıştır:

> "30 santimlik, çapı 178 milimetrelik bir kütle yan ürüne gidiyor. Fırına tekrar atılmak üzere."

> "Bıçağın 3 milimetrelik o kazıyarak kesme şeyi ne olacak? Talaş olacak. Talaş eritilemiyor tekrardan. Talaş satılıyor dışarıya."

> "Yani bildiğimiz hacim hesabı oluyor. Öz kütle hesabı da var orada. Su gibi değil bu."

> "Bana bir tanka doldurduğum yağ yüz kesimde gidiyor... yüz kesimde bir ben uyarı vereceğim. Bakımcılara uyarı gidecek."

> "21 ton eksi 3 ton aktarıldı. Kaç? 18 ton. 1 ton da yollukta gitti. Ben 17 ton döktüm. 17 tonun da kafalarını kestim. 14 ton benim biyetim var."

> "Bu fırından aktarıldıysa yol bu kadarcık kısa. Ama diğer fırından yapıldıysa yol böyle uzun. Burada 1 tonsa burada 2 tona tekabül ediyor ya da 1,5 tona."

> "Ben hem şu dökümden hem bu dökümden şu kadar adet... Homojenizasyona karışık atıyorum. Şu reçeteyi seçiyorum. Başlat."

> "8 saat doldu ama hâlâ devam ediyor. Homojenizasyon uzun sürdü diye."

> "Biz bir döküm kodu verdik... Bunları JSON'a nasıl tutacağız teker teker? Hangisi satırlarda ne bilgiler yazacak? İş böyle oldu mu kabarıyor."

> "Programı ilk açtığında hiçbir makine olmaması gerekiyor."

> "Modüler dashboard aslında bizim için olması gerekiyor Cemil. İşimizin kolaylaşması için. Dashboard'ı onlara bırakamayız."

> "Adamlar kendisi fırın eklememesi gerekiyor... Biz sadece aletleri eşleştireceğiz, gerisi kendi kendine halledecek."

> "Kalabalık gözükmesin insanlar baktığında başı dönmesin. Sade olsun."

> "Bizim JSON'larımız HTML'leri sadece okumak için abi. Veri yazacaksa da bir şeye yazacak."

> "Tuşa bastığında bir JSON'a tık düşüreceğiz... O anda bir şey varsa onu alıp hesaplar kitaplarını yapıyor. Sonra da onu oradan siliyor."

> "Biz bir mini PC... Sistemi kuracağız, çalıştıracağız. Ama bizim merkezi yönetimi önce yapmamız gerekiyor."

---

## 7. Bu dokümandan türetilen tasarım dokümanları

Bu metin bir yorum değil, gereksinim kaynağıdır. Aşağıdaki dokümanlar bu maddeleri sırasıyla hesaba, makine modeline, veri yapısına ve kurulum sırasına çevirir:

- `docs/07-uretim-hesap-motoru.md`: kesim, talaş, kafa, yolluk ve kütle dengesi formülleri; yağ ve bıçak ömrü kuralları.
- `docs/08-moduler-makine-ve-merkezi-yonetim.md`: makine tipleri, fabrika profilleri, iki çalışma modu, dört PLC sinyali, geliştirici konsolu, uzaktan güncelleme.
- `docs/09-olay-tabanli-json-arsivleme.md`: her aşamadan bir satır düşüren olay günlüğü, kuyruk ve arşiv ayrımı, doğrulama ve geri yükleme.
- `docs/10-kurulum-ve-yol-haritasi-v2.md`: mini PC üzerinde merkezi yönetimle başlayan kurulum ve aşamalı geliştirme sırası.
