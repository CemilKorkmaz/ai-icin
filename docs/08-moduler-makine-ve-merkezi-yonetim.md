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

Prototipte PLC bağlantısı **gerçek haberleşme yapmaz**; dört sinyal demo değerleriyle ve `MANUAL` modda operatör seçimiyle simüle edilir. Gerçek OPC UA / Modbus sürücüsü, `docs/10` içindeki yol haritasının son aşamasında ayrı bir modül olarak eklenir. Bu bilinçli bir sınırdır: önce üretim mantığı PLC olmadan oturtulur.
