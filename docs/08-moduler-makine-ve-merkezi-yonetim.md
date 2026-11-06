# 08 — Modüler Makine Yapısı, İki Çalışma Modu ve Merkezi Yönetim

Bu doküman, saha görüşmesinin "modül modül yapmamız gerekiyor", "programı ilk açtığında hiçbir makine olmaması gerekiyor", "modüler dashboard aslında bizim için olması gerekiyor" ve "bizim kendi ekranımız olmalı" cümlelerini mimari karara çevirir. Önceki `docs/04` içindeki genel sunucu mimarisi korunur; burada **çok fabrikalı ürün** boyutu eklenir.

Şekil ve şema çizilmez; kararlar başlıklar, tablolar ve sıralı anlatım olarak verilir.

---

## 1. Temel karar: modülerlik kime hizmet ediyor

Görüşmenin ilk yarısında "insanlar kendi makinesi ne varsa oraya ekleyecek" denir, ikinci yarısında bu açıkça düzeltilir: **modüler dashboard yazılımı geliştiren ekip içindir, fabrika operatörü için değildir.** Fabrika operatörü makine tanımlamakla, PLC adresi yazmakla veya modül kurmakla uğraşmamalıdır. Yeni bir ocak alındığında geliştirici ekibe haber verilir; ekip uzaktan bağlanıp yapılandırmayı yapar veya bir güncelleme paketi gönderir. Bu, aynı zamanda sunulacak bakım hizmetinin ve 5 ilâ 10 yıllık ürün ömrünün temelidir.

Bundan çıkan iki ayrı arayüz zorunluluğu:

| Arayüz | Kullanıcı | Kapsam |
| --- | --- | --- |
| **Fabrika arayüzü** | Operatör, mühendis, yönetici, muhasebe | Üretim kayıtları, makine durumları, kesim, homojenizasyon, bakım uyarıları, raporlar, onaylar |
| **Merkezi yönetim arayüzü** | Yazılımı geliştiren ekip (Max / geliştirici) | Fabrika ekleme, makine tanımlama, PLC bağlantısı, IP ve tag eşleştirme, modül yapılandırma, uzaktan güncelleme, sürüm geçmişi |

Merkezi yönetim ekranı, konuşmada tarif edilen "beyaz satırlarda siyah yazılar" biçiminde olmayacaktır. Modern, renkli, okunaklı ve sade bir arayüz olacaktır; çünkü bu ekranı sürekli kendimiz kullanacağız. Ancak sade olması, veriyle doldurulması anlamına gelmez: operatör ekranında olduğu gibi gereksiz ayrıntı gösterilmez.

---

## 2. İlk kurulumda boş makine parkı

Uygulama ilk açıldığında hiçbir makine tanımlı değildir. `machines` koleksiyonu boştur. Fabrika profili oluşturulduktan sonra merkezi yönetim ekranından makineler eklenir. Ekleme işlemi dört alanla sınırlıdır:

1. Makine tipi (ocak, döküm tablası, testere, homojenizasyon fırını, sürekli homojenizasyon hattı, döner ocak).
2. Fabrikadaki adı: A Fırını, B Fırını veya 1. Ocak, 2. Ocak gibi serbest metin.
3. Kapasite: 20 ton, 35 ton gibi tonaj değeri.
4. Çalışma modu: `MANUAL` veya `PLC`.

Konuşmada "tonaj olarak değişiyor, başka bir değişim yok, şu kadar ısıcı var işte bu kadarcadır" denmiştir. Bu yüzden brülör sayısı, yakıt tipi, ısıtıcı gücü gibi alanlar **ilk faza alınmaz**; ileride gerekirse makine tipine bağlı ek parametre olarak eklenir. Ekran kalabalıklaştırılmaz.

### 2.1 Makine tipleri

| Kod | Ad | Kapasite birimi | Örnek |
| --- | --- | --- | --- |
| `FURNACE` | Ergitme / döküm ocağı | ton | A Fırını 20 t, B Fırını 35 t |
| `CAST_TABLE` | Döküm tablası | adet / hat | Tabla 1, Tabla 2 |
| `SAW` | Testere | kesim/adet | Testere 1, Testere 2 |
| `HOMO_FURNACE` | Homojenizasyon fırını | ton / parti | Homojen 1–4 |
| `CONT_HOMO` | Sürekli homojenizasyon hattı | ton/saat | Continue Homojen 1 |
| `ROTARY` | Döner ocak | ton | Cüruf geri kazanım |

Makine tipleri de veri olarak tutulur; yeni bir tip eklemek kod değişikliği gerektirmez. Bu, "öbüründe döner ocak var, hiç alakası yok" cümlesinin karşılığıdır.

### 2.2 Fabrika profili örnekleri

| Fabrika | Fırın | Tabla | Homojen fırın | Testere | Sürekli hat | Döner ocak | Mod |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Firma 1 (gidilecek müşteri) | 5 | 2 | 4 | 2 | 1 | 0 | `PLC` |
| Firma 2 | 2 | 1 | 2 | 1 | 0 | 1 | `MANUAL` |
| Firma 3 (demo) | 3 | 1 | 1 | 2 | 0 | 1 | `PLC` |

Her fabrikanın `plants` koleksiyonunda bir kaydı vardır. Üretim modülleri, sabit bir makine listesi yerine **seçili fabrikanın profiline** göre çalışır. Aynı yazılım, farklı konfigürasyonlarla farklı fabrikalarda kullanılır; her müşteri için sıfırdan kod yazılmaz.

---

## 3. İki çalışma modu

### 3.1 `MANUAL` — PLC bağlantısı yok

Makinelerden hiçbir veri otomatik alınmaz. Operatör döküm miktarını, kesim sayısını, biyet boyunu, yağ dolumunu, bıçak değişimini ve süreleri kendisi girer. Sistem bu verileri kaydeder, `docs/07` içindeki hesapları yapar ve üretim sürecini takip eder. Konuşmada "operatörel sensör anlattığım gibi verileri giriyorlar, bunlar kendince tutuyorlar" denilen durum budur.

Bu mod, PLC'si olmayan veya otomasyon verisini paylaşmak istemeyen fabrikalar için **birinci sınıf bir çalışma biçimidir**, eksik bir sürüm değildir. Bütün iş kuralları, raporlar ve arşiv aynı şekilde çalışır.

### 3.2 `PLC` — otomatik veri okuma

Fabrikadaki makinelerle haberleşilir; kapı durumu, döküm modu, alarm ve çalışma durumu gibi sinyaller operatör gerek kalmadan sisteme girer. Operatör yalnızca makineden gelmeyen iş verilerini (şarj içeriği, reçete seçimi, onay, kantar) girer.

İki mod arasındaki fark yalnızca **veri kaynağıdır**. Üretim mantığı, hesap motoru, olay günlüğü ve arşiv aynıdır. Bu ayrım, `docs/04` Bölüm 4'teki PLC kararını korur ve netleştirir: PLC verisi hiçbir zaman doğrudan stok veya maliyet kaydı yazmaz; önce `signalStates` olayına, oradan gerekirse bakım bildirimine dönüşür.

---

## 4. Okunacak PLC sinyalleri: dört sinyal kuralı

HMI panelinde onlarca sinyal vardır. Konuşmada "onlardan çok kullanmamalıyız, kalabalık gözükmesin, insanlar baktığında başı dönmesin, biz de uğraşmayalım" denir. Bu nedenle ilk fazda yalnızca dört sinyal okunur.

| # | Sinyal | Değer | Yorum | Ürettiği olay |
| --- | --- | --- | --- | --- |
| 1 | `door` | `open` / `closed` | Kapı açık sinyali geliyorsa açık, gelmiyorsa kapalı kabul edilir | `SIGNAL_DOOR` |
| 2 | `casting` | `idle` / `tilting` / `pouring` | Fırın döküm modunda mı, devrildi mi, döküm başladı mı; konuşmada tek grup olarak geçer | `SIGNAL_CASTING` |
| 3 | `alarm` | `ok` / `fault` | Her makinedeki arıza lambası; yandığında "bu fırında sorun var" denir | `SIGNAL_ALARM` + bakım bildirimi |
| 4 | `running` | `running` / `stopped` | Makine çalışıyor mu | `SIGNAL_RUNNING` |

Alarm bilgisi yalnızca arıza **var/yok** bilgisini taşır. "Ateşleyicilerden biri çalışmıyor" gibi ayrıntı, daha fazla PLC verisi gerektirir ve ilk faza alınmaz. Konuşmada bu ayrım açıkça yapılmıştır. İleride ayrıntı istenirse `plcTags` koleksiyonuna yeni bir satır eklenir; mevcut dört sinyal değişmez.

Sinyaller `signalStates` koleksiyonunda `machineId`, `signal`, `value`, `at`, `source` alanlarıyla tutulur. Kaynak `PLC` veya `MANUAL` olabilir; `MANUAL` modda operatör aynı dört durumu elle seçebilir, böylece iki modun ekranı aynı kalır.

---

## 5. Merkezi yönetim ekranının alanları

Konuşmadaki "Firm1 diye ekledik, Firm1'in PLC'sinin IP'sini yazacağız, data şeyini yazacağız, içerisinden bundan al veriyi, bundan çek, bundan oku" tarifi aşağıdaki koleksiyonlara çevrilmiştir.

### 5.1 `plcConnections`

| Alan | Açıklama | Örnek |
| --- | --- | --- |
| `id` | Bağlantı kimliği | `PLC-1` |
| `plantId` | Hangi fabrika | `P1` |
| `name` | Bağlantı adı | `Fırın hattı PLC` |
| `ip` | PLC IP adresi | `192.168.1.50` |
| `protocol` | Protokol | `OPC UA`, `Modbus TCP`, `S7` |
| `port` | Port | `4840` |
| `pollSeconds` | Tarama çevrimi | `3` |
| `active` | Bağlantı açık mı | `true` |

### 5.2 `plcTags`

| Alan | Açıklama | Örnek |
| --- | --- | --- |
| `machineId` | Sinyalin bağlı olduğu makine | `MCH-1` |
| `signal` | Dört sinyalden biri | `door` |
| `address` | PLC adresi / tag | `ns=2;s=F1.DoorOpen` |
| `invert` | Sinyal ters mantıklı mı | `false` |
| `label` | Ekranda görünen ad | `A Fırını Kapı` |

Ekip yalnızca bu eşleştirmeyi yapar; konuşmada "biz sadece aletleri eşleştireceğiz, gerisi kendi kendine halledecek" denilen kısım budur. Yeni makine eklendiğinde dört satırlık tag seti otomatik taslak olarak oluşturulur, adresler doldurulur, kaydedilir. Operatör ekranında bu adresler görünmez.

### 5.3 `vendorUpdates` ve uzaktan güncelleme

| Alan | Açıklama |
| --- | --- |
| `plantId` | Güncellenen fabrika |
| `version` | Uygulanan sürüm |
| `kind` | `Makine Eklendi`, `Tag Eşlemesi`, `Modül Güncellemesi`, `Parametre Değişikliği` |
| `note` | Yapılan işin açıklaması |
| `appliedBy` | Uygulayan geliştirici (Max) |
| `at` | Zaman damgası |

Güncelleme paketi, VPN üzerinden imzalı olarak gönderilir; uygulanmadan önce mevcut konfigürasyonun yedeği alınır. Uzaktan bağlantı `docs/04` Bölüm 7'deki WireGuard/Tailscale + MFA + rol bazlı yetki düzeniyle yapılır; doğrudan IP ve açık port kullanılmaz. Geliştirici hesabı üretim verisini salt-okunur görür, konfigürasyon yazma yetkisi ayrı bir roldür.

---

## 6. Fabrikaya özel iş kuralları

Konuşmada bir müşterinin "1'den 3'e aktarıyorum, 3'ten 1'e aktarıyorum" gibi kendine özel toplama/çıkarma kuralları istediği, bunun "not toplama çıkartmaya gittiği" anlatılır. Bunun çözümü, kuralı operatör ekranına veya çekirdek koda gömmek değil, merkezi yapılandırmada tutmaktır.

İlk sürümde bu tür kurallar `plants.notes` ve `castingPaths.holdTon` gibi parametre alanlarında tutulur. İleride kural motoru gerekiyorsa `plantRules` koleksiyonu eklenir; çekirdek hesap motoru (`docs/07`) değişmez. Böylece bir fabrikanın özel isteği diğer fabrikaların davranışını bozmaz.

---

## 7. Prototipteki karşılığı

| Karar | Ekran | Veri |
| --- | --- | --- |
| Boş başlangıç, modüler makine parkı | Makine Parkı | `machines.json`, `machine-types.json`, `plants.json` |
| İki çalışma modu | Makine Parkı, PLC Durum | `plants.mode`, `machines.mode` |
| Dört PLC sinyali | PLC Durum | `signal-states.json` |
| IP / protokol / tag eşleştirme | Merkezi Yönetim | `plc-connections.json`, `plc-tags.json` |
| Uzaktan güncelleme geçmişi | Merkezi Yönetim | `vendor-updates.json` |
| Farklı döküm yolları | Döküm Yolları | `casting-paths.json` |

Sürüm 1.2'de bu tabloya **Saha Kurulum Sihirbazı**, **Modül Kaydı**, **fabrika profil paketi**, **devre dışı bırakma** ve **adaptör sözleşmesi** eklenmiştir; Bölüm 8–12 ayrıntılıdır. Sürüm 1.3'te aynı adaptör sözleşmesini fabrikadaki tek bilgisayarda fiziksel olarak çalıştıran `ERP-Edge-Collector.exe` eklenmiştir (`docs/13`); dört sinyal kuralı ve `MANUAL` yedek kararı değişmemiştir. Prototipte PLC bağlantısı **gerçek haberleşme yapmaz**; dört sinyal demo değerleriyle ve `MANUAL` modda operatör seçimiyle simüle edilir. Gerçek OPC UA / Modbus sürücüsü, `docs/10` içindeki yol haritasının son aşamasında ayrı bir modül olarak eklenir. Bu bilinçli bir sınırdır: önce üretim mantığı PLC olmadan oturtulur.

---

## 8. Tek makine kaynağı: çift kaynak kaldırıldı

Sürüm 1.1'de üretim tarafında iki ayrı ocak dünyası vardı. `machines` koleksiyonu modüler makine parkını, `furnaces` koleksiyonu ise `F20`, `F35`, `FD` kodlu sabit üç ocağı tutuyordu. Reçeteler ve döküm kodları `furnaceId` alanıyla bu sabit kodlara bağlıydı. Bu, "her şey modüler olsun" isteğiyle doğrudan çelişiyordu: yeni bir ocak eklendiğinde üretim ekranı onu görmüyor, bir ocak çıkarıldığında ise `furnaces` içindeki sabit kayıt kalıyordu.

Sürüm 1.2'de tek kaynak ilkesi uygulanır:

1. `machines` koleksiyonu **tek gerçek kaynaktır**. Bütün makineler, tipler, kapasiteler, modlar ve devre dışı bilgileri burada tutulur.
2. `furnaces` koleksiyonu bağımsız bir kart değil, `machines` içindeki `FURNACE` ve `ROTARY` kayıtlarının **salt okunur projeksiyonudur**. Eski ekranların beklediği `id`, `code`, `name`, `capacityTon`, `type`, `rotary`, `status` alanları üretilerek verilir; `machineId` ve `plantId` eklenir.
3. Projeksiyonun kimliği makine kimliğidir: `F20` değil `MCH-01`. Eski dış dosyalarda kalan `F20`, `F35`, `FD` kodları `machineAliases` koleksiyonuyla çevrilir; bu koleksiyon bir uyumluluk köprüsüdür, yeni kayıtların alanı değildir.
4. `recipes` ve `lots` içindeki `furnaceId` alanı `machineId` olarak yeniden adlandırılır ve doğrudan makine kimliği taşır. Üretim ekranındaki ocak seçimleri sabit listeden değil, **aktif fabrikanın aktif FURNACE makinelerinden** üretilir.
5. `validate_data.py` her çalıştırmada `furnaces.json` kimlik kümesinin `machines.json` içindeki ilgili kayıtlarla birebir aynı olduğunu doğrular. Fark çıkarsa şema hatası verilir; iki kaynak birbirinden ayrılamaz.

Bu değişiklik, "başka bir fabrikada 2 fırın yok 1 fırın var" cümlesinin kod karşılığıdır. Fırın sayısı bir veri değeridir; ekran, hesap ve rapor sayıyı kod içinde varsaymaz.

---

## 9. Ekleme ve çıkarma: silme yok, devre dışı bırakma var

Kullanıcı "makinelerin sisteme kolayca ekleme çıkarma sistemi olsun" demiştir. Üretim verisi geçmişe dönük olduğu için çıkarma işlemi **kayıt silme** olarak yorumlanmamıştır. Bir ocak söküldüğünde ona bağlı döküm kodları, olay satırları, bakım kayıtları, yağ ve bıçak sayaçları, PLC tag eşlemeleri ve döküm yolları hâlâ okunabilir olmalıdır; aksi hâlde geçmiş raporlar ve kütle dengesi bozulur.

Uygulanan kural:

1. Makine Parkı ekranında **Makine Ekle**, **Düzenle**, **Devre Dışı Bırak** ve **Geri Al** işlemleri vardır.
2. Devre dışı bırakma düğmesine basıldığında önce **bağımlılık raporu** gösterilir. Rapor `castingPaths`, `recipes`, `lots`, `plcTags`, `signalStates`, `oilRules`, `bladeRules`, `maintenanceEvents`, `homogenizationBatches`, `events` ve `machineAliases` koleksiyonlarını tarar; koleksiyon, kayıt kimliği ve alan adı bazında kaç kaydın etkileneceğini listeler.
3. Kullanıcıdan **gerekçe** istenir. Onay sonrası makine kaydı korunur; `active` yanlışa çekilir, `status` "Devre Dışı" olur, `decommissionedAt` ve `decommissionReason` yazılır. Hiçbir bağımlı kayıt silinmez.
4. Devre dışı makine üretim seçimlerinde, yeni döküm başlatma ve kapasite hesaplarında görünmez; geçmiş kayıtlarda ve arşivde görünmeye devam eder.
5. **Geri Al** düğmesi makineyi yeniden aktif eder, devre dışı alanlarını temizler. Yanlışlıkla çıkarılan bir makine için veri kurtarma gerekmez.
6. Olay, merkezi yönetim geçmişine `vendorUpdates` satırı olarak yazılır.

Bağımlılık raporu aynı zamanda güvenli çıkarma denetimidir: rapor boşsa makinenin geçmiş bağlantısı yoktur; doluysa kullanıcı hangi kayıtların referans olarak kalacağını işlem öncesinde görür. Doğrulayıcı, devre dışı bırakılmış her makinenin hâlâ `machines` içinde bulunduğunu, `active: false` ve gerekçe alanlarının dolu olduğunu, hiçbir yol veya kuralın silinmiş bir makineye işaret etmediğini kontrol eder.

---

## 10. Fabrika profil paketi: sahada "kolayca bağlama"

Gerçek bir fabrikaya gidildiğinde yapılacak iş, koddaki sabitleri değiştirmek değil fabrikanın kurulumunu bir **JSON paketi** olarak sisteme vermektir. Paket `kind: erp-plant-profile`, `packageVersion: 1` ve `schemaVersion: 4` taşır; içinde fabrika kartı, makine tipleri, makineler, döküm yolları, PLC bağlantıları, dört sinyalin tag eşlemeleri, yağ ve bıçak eşikleri, bakım kayıtları, sinyal durumları, homojenizasyon partileri ve modül açık/kapalı haritası bulunur.

Paket üç biçimde kullanılır:

1. **İndir.** Kaynak fabrika seçilir, `buildPlantPackage` güncel veriden paketi üretir, JSON dosyası olarak alınır.
2. **Kopyala ve uygula.** Paket yeni fabrika kodu ve adıyla, istenirse **fırın sayısı azaltılarak** uygulanır. Örnek: 5 fırınlı Firma 1 profili 1 fırınlı yeni fabrikaya dönüştürülür. Kullanılmayan fırınlara bağlı döküm yolları otomatik atlanır; diğer makineler, tag eşlemeleri ve eşikler yeni kimliklerle kopyalanır.
3. **İçe al.** Dışarıdan gelen paket doğrulanır: tür, şema sürümü, fabrika kartı, makine tipleri, makine kimliklerinin benzersizliği ve döküm yollarının paket içindeki makinelere bağlı olması. Doğrulamadan geçmeyen paket uygulanmaz.

Uygulama sırasında mevcut fabrikaların hiçbir kaydı değiştirilmez; `idFactory` tüm koleksiyonlardaki mevcut kimlikleri tarayarak çakışmayan yeni kimlikler üretir. Yeni fabrika aktif hale gelir ve kurulum `vendorUpdates` satırına yazılır. Bu sayede aynı yazılım ikilisi 1 fırınlı, 2 fırınlı veya 5 fırınlı sahada hiç kod değişikliği olmadan çalışır.

---

## 11. Beş adımlı kurulum sihirbazı

Merkezi yönetim tarafında **Saha Kurulum Sihirbazı** ekranı vardır. Sıra, sahada bilginin toplanma sırasını izler:

1. **Fabrika kartı:** kod, ad, şehir, `MANUAL` / `PLC` modu, saha notu.
2. **Makine parkı:** altı makine tipi için adet ve varsayılan kapasite. Fırın adedi 1, 2 veya 5 girilebilir; ekran aynıdır.
3. **Döküm yolları:** yollukta tutulan metal tonajı; her fırın ve tabla çifti için kaç yol oluşacağı anlık gösterilir.
4. **PLC / bağlantı:** adaptör, bağlantı adı, IP, protokol, port ve tarama süresi; **Bağlantıyı Test Et** ve **Dört Sinyali Oku** düğmeleri. Sürücü yoksa sistem `MANUAL` yedeğe düşer, kurulum yarım kalmaz.
5. **Modüller ve doğrulama:** açılacak modüller seçilir, fabrika kodu benzersizliği, en az bir fırın, geçerli yollar ve modül kaydı doğrulanır; **Profili Oluştur** tek işlemde fabrikayı, makineleri, yolları, bağlantıyı, dört tag'i, modül haritasını ve sürüm kaydını yazar.

Her adım `setupDrafts` koleksiyonuna kaydedilir. Saha ziyareti yarım kalsa bile aynı taslak kaldığı adımdan devam eder. Mod `MANUAL` ise bağlantı adımı atlanabilir; `PLC` seçilirse dört sinyal için otomatik tag taslağı üretilir.

---

## 12. Modül kaydı ve adaptör sözleşmesi

### 12.1 Modül kaydı veridir

`moduleRegistry` koleksiyonu her modülün kodunu, adını, grubunu, kapsadığı ekran kimliklerini, varsayılan açık/kapalı durumunu ve varsa gereksinimini taşır. `plantModules` koleksiyonu fabrika bazında hangi modülün açık olduğunu tutar. Menü `visibleNav` işleviyle bu kayda göre çizilir; kapalı modülün ekranı doğrudan adresle açılamaz. Entegrasyon kuralları da `moduleCode` alanıyla aynı kayda bağlıdır; kapalı modülün kuralı matris ekranında gösterilmez.

Bazı modüller koşulludur. `PLC` modülü yalnızca fabrika modu `PLC` ise, `ROTARY` modülü yalnızca o tipte aktif bir makine varsa görünür. Üretim modülü en az bir aktif fırın gerektirir. `CORE` ve `VENDOR` modülleri kapatılamaz; aksi hâlde sistemi yönetecek ekran kalmaz. Yeni bir modül eklemek kayda satır eklemektir; menü dosyasına veya çekirdek koda dokunmak gerekmez.

### 12.2 Adaptör sözleşmesi

`adapterContracts` koleksiyonu desteklenen bağlantı yollarını ve her birinin `connect`, `test`, `readFourSignals`, `disconnect` yeteneklerini listeler. `simulated` adaptörü hazırdır; `opcua` ve `modbus` adaptörleri **sözleşmeye hazırdır**, sürücüleri sonraki aşamada takılır. `testConnection` sürücü yüklü olmadığında hata vermez, `MANUAL` yedeğe düşer ve bunu açıkça bildirir. `readFourSignals` her adaptörde aynı dört sinyali aynı biçimde döndürür; üst katman hangi protokol kullanıldığını bilmez.

Bu ayrım, gerçek fabrikada bağlantı işini ikiye böler: saha ekibi IP, port ve tag adreslerini **veri** olarak girer; yazılım ekibi gerektiğinde yeni bir sürücüyü aynı sözleşmeyle ekler. İkisi birbirini beklemez.

### 12.3 Sabit kodların temizlenmesi

Sürüm 1.1'de `P1`, `MCH-08`, `F20` ve `F35` gibi değerler ekran koduna yazılmıştı. Sürüm 1.2'de bunların tamamı kaldırılır: aktif fabrika `activePlantId` yardımcı işlevinden gelir ve ayar geçersizse ilk aktif fabrikaya düşer; kesim ve bakım ekranlarındaki makine `firstMachineId('SAW')` ile bulunur; ocak kodları makine kimliğine çevrilir. Prototipte sabit kalmış fabrika veya makine kimliği yoktur.

Ayrıntılı saha senaryosu, dosya envanteri ve doğrulama adımları `docs/12` içindedir.
