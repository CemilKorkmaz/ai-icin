# 12 — Saha Kurulum ve Modül Yaşam Döngüsü (Sürüm 1.2)

**Amaç.** Kullanıcının "gerçek bir fabrikaya gittiğimde ben bu sistemleri kolayca bağlamak istiyorum", "başka bir fabrikada 2 fırın yok 1 fırın var", "bu makinelerin sisteme kolayca ekleme çıkarma sistemi olsun" ve "her şeyin genel olarak modüler olmasını istiyorum" cümlelerini çalışan bir ürün kuralına çevirmek. Bu doküman, `docs/08` içindeki modüler makine kararını **saha kurulumu**, **makine yaşam döngüsü**, **fabrika profili**, **modül kaydı** ve **bağlantı adaptörü** boyutlarıyla genişletir.

**Kapsam korunur.** Proje alüminyum sürekli döküm biyet dökümhanesi içindir; kum döküm, kalıp/model, maça, pik demir, CNC ve NDT gibi genel dökümhane başlıkları kapsam dışıdır. Faz 1 Satın Alma + Hammadde/Stok, Faz 2 Üretim sırası değişmez. Şekil, şema, ok ve kutu çizimi yapılmaz; açıklamalar başlıklar, sıralı metin ve tablolarla verilir. Operatör ekranı ile geliştirici ekibinin merkezi yönetim ekranı ayrıdır. `docs/06` içinde anlamı kesinleşmemiş sözcükler (Biyet, Yolduk, Saf küçük, Stone, Continue homojen, PİS/PIS, GNSL, Barsa piyazesi, Crate, PİK PİK) bu dokümanda da **kesin terim olarak kullanılmaz**; yalnızca "Billet", "Yolluk", "kesilen parça?", "hurda/talaş alıcı veya stok kodu?", "continuous homogenization", "PIS/PIMS/otomasyon?", "anlaşılamadı", "PLC adresi?", "Create", "Mini PC" biçiminde işaretli kalır.

---

## 1. Sorunun tanımı

Sürüm 1.1'e kadar prototip tek bir fabrikanın demo verisini gösteriyordu ve üretim ekranlarında bazı değerler koda yazılmıştı. Sabit `P1` fabrika kimliği, sabit `MCH-08` testere kimliği, sabit `F20` ve `F35` ocak kodları vardı. `machines` koleksiyonu modüler makine parkını tutarken `furnaces` koleksiyonu ayrı ve sabit üç ocak tutuyordu. Makine eklemek mümkündü ama eklenen makine üretim ekranındaki ocak seçimine girmiyordu. Makine çıkarmanın karşılığı yoktu; pasife alma düğmesi yalnızca bir bayrağı çeviriyordu. Fabrikaya özel modül seçimi, kurulum sihirbazı, profil içe/dışa aktarma ve bağlantı sürücüsü sözleşmesi yoktu.

Bu durumda gerçek bir sahaya gidildiğinde yapılacak iş "yazılımı bağlamak" değil "yazılımı yeniden yazmak" olurdu. Oysa istenen şey açıktır: aynı program, farklı makine parklarına ve farklı otomasyon seviyelerine **veri değiştirerek** uyarlanmalıdır.

---

## 2. Sürüm 1.2'nin altı kararı

| # | Karar | Gerekçe |
| --- | --- | --- |
| 1 | `machines` tek makine kaynağıdır; `furnaces` onun projeksiyonudur | İki kaynak birbirinden ayrılır, yeni ocak üretim ekranında görünmez |
| 2 | Makine silinmez, gerekçeyle devre dışı bırakılır | Döküm kodu, olay, bakım ve kütle dengesi geçmişi korunmalıdır |
| 3 | Fabrika kurulumu tek bir JSON profil paketidir | Sahada indir, götür, içe al; kod değişikliği gerekmesin |
| 4 | Beş adımlı kurulum sihirbazı vardır | Bilgi sahada fabrika, makine, yol, bağlantı, modül sırasıyla toplanır |
| 5 | `moduleRegistry` + `plantModules` menüyü, kuralları ve ekranları filtreler | Modülerlik yalnızca makine parkında değil arayüzde de olmalıdır |
| 6 | Bağlantı `connect / test / readFourSignals / disconnect` sözleşmesiyle ayrılır | Gerçek PLC sürücüsü sonradan takılabilir, üretim MANUAL modda durmaz |

Bu kararların hiçbiri çekirdek hesap motorunu (`docs/07`), olay arşivini (`docs/09`) veya tek kayıt çok etki ilkesini (`docs/11`) değiştirmez. Değişen şey, bu katmanların **hangi fabrikanın hangi makineleriyle** beslendiğidir.

---

## 3. Tek makine kaynağı ve uyumluluk köprüsü

`app/js/seed.js` içinde `MACHINE_ROWS` sabiti makinelerin tek tanımıdır. `SEED.machines` bu satırlara durum, devre dışı tarihi ve gerekçe alanlarını ekleyerek üretilir. `SEED.furnaces` aynı satırların `FURNACE` ve `ROTARY` türündekilerinden türetilir; ayrı bir ocak kartı yoktur. Projeksiyondaki kimlik makine kimliğidir: `F20` yerine `MCH-01`, `F35` yerine `MCH-02`.

`recipes` ve `lots` koleksiyonlarındaki `furnaceId` alanı `machineId` olur ve doğrudan makine kimliği taşır. Üretim ekranındaki "Ocak" seçimleri `machinesOfType('FURNACE', D())` ile **aktif fabrikanın, devre dışı bırakılmamış fırınlarından** üretilir. Paneldeki ocak sayacı da sabit üç değil makine parkından okunur.

Geçmiş dış dosyalarda `F20`, `F35`, `FD` kalmış olabilir. `machineAliases` koleksiyonu bu üç kodu `MCH-01`, `MCH-02`, `MCH-20` makinelerine bağlar. Bu bir **uyumluluk köprüsüdür**: içe aktarılan eski veriyi çevirir, yeni kayıtlar için kullanılmaz. Doğrulayıcı her eşlemenin var olan bir makineye ve fabrikaya işaret ettiğini kontrol eder.

`server/erp/scripts/validate_data.py` içindeki projeksiyon denetimi şu kuralı uygular: `furnaces.json` kimlik kümesi, `machines.json` içindeki `FURNACE` ve `ROTARY` kimlik kümesine eşit olmalıdır. Eşitlik bozulursa doğrulama hata verir. Böylece "tek kaynak" bir yazı kuralı değil, çalıştırılabilir bir denetimdir.

---

## 4. Makine yaşam döngüsü: ekleme, düzenleme, çıkarma, geri alma

Makine Parkı ekranında dört işlem vardır: ekle, düzenle, devre dışı bırak, geri al. İlk kurulumda park boştur; makine tipi, fabrikadaki adı, kapasite ve mod olmak üzere dört alanla ekleme yapılır. Brülör sayısı, yakıt tipi gibi alanlar bilinçli olarak eklenmez; konuşmada "tonaj dışında başka değişim yok, ekran kalabalık olmasın" denmiştir.

Çıkarma işlemi bir silme değildir. Kullanıcı devre dışı bırakma düğmesine bastığında `machineRefs` işlevi şu koleksiyonları tarar:

| Koleksiyon | Aranan alan | Korunma gerekçesi |
| --- | --- | --- |
| `castingPaths` | `fromMachineId`, `tableId` | Yolluk tonajı ve 1 / 1,5 / 2 ton tutma geçmişi |
| `recipes`, `lots` | `machineId` | Döküm kodu izlenebilirliği |
| `plcTags`, `signalStates` | `machineId` | Dört sinyal eşlemesi ve geçmiş durumlar |
| `oilRules`, `bladeRules` | `machineId` | Yağ ve bıçak ömrü sayaçları |
| `maintenanceEvents` | `machineId` | Bakım geçmişi |
| `homogenizationBatches` | `machineId` | 8 saat / 9 saat süre aşımı kayıtları |
| `events` | `machineId` | Kütle dengesi zinciri |
| `machineAliases` | `machineId` | Eski kod köprüsü |

Rapor, koleksiyon, kayıt kimliği ve alan adı bazında listelenir. Gerekçe sorulur. Onaydan sonra makine kaydı korunur; `active` yanlışa çekilir, `status` "Devre Dışı" olur, `decommissionedAt` ve `decommissionReason` yazılır. Bağımlı kayıtların hiçbiri silinmez; yalnızca artık yeni kayıt üretmezler. Devre dışı makine yeni döküm başlatma, reçete ve kapasite seçimlerinde görünmez, arşivde ve geçmiş raporlarda görünmeye devam eder.

**Geri Al** düğmesi alanları temizleyip makineyi yeniden aktif eder. İşlem `vendorUpdates` koleksiyonuna "Makine Çıkarıldı" veya kurulum kaydı olarak yazılır; geliştirici ekibi hangi sahada hangi değişikliğin yapıldığını uzaktan görebilir.

Doğrulayıcı şunları denetler: devre dışı her makine hâlâ `machines` içindedir, `active` yanlıştır, gerekçe boş değildir; hiçbir döküm yolu, tag, kural veya olay silinmiş bir makine kimliğine işaret etmez. Duman testi aynı senaryoyu `MCH-01` üzerinde çalıştırır: bağımlılık raporu boş değildir, makine silinmez, yol korunur, geri alma çalışır.

---

## 5. Fabrika profil paketi

Paket, bir fabrikanın yazılım tarafındaki bütün kurulumunu taşıyan tek JSON dosyasıdır. Üst alanları `kind: erp-plant-profile`, `packageVersion: 1`, `schemaVersion: 4`, `code`, `name`, `generatedAt` ve `source`'tur. İçerdiği veri grupları şunlardır:

1. `plant`: fabrika kartı, kod, ad, şehir, `MANUAL` / `PLC` modu, aktiflik ve saha notu.
2. `machineTypes`: altı makine tipi ve kapasite birimleri. Yeni tip eklemek veri satırı eklemektir.
3. `machines`: o fabrikaya ait tüm makineler, kapasite, mod, PLC bağlantısı, durum ve devre dışı alanları.
4. `castingPaths`: fırın ve tabla çiftleri, yollukta tutulan tonaj.
5. `plcConnections` ve `plcTags`: IP, protokol, port, tarama süresi ve dört sinyalin adres eşlemeleri.
6. `oilRules`, `bladeRules`, `maintenanceEvents`, `signalStates`, `homogenizationBatches`: makineye bağlı eşik ve geçmiş kayıtları.
7. `plantModules` ve `moduleRegistry`: hangi modülün açık olduğu ve modül tanımları.

Paket üç işleme tabi tutulur. **İndir** güncel veriden paket üretir. **Kopyala ve uygula** yeni fabrika kodu ve adıyla, isteğe bağlı fırın sınırıyla uygular. **İçe al** dışarıdan gelen JSON'u doğrulayıp yeni fabrika olarak yazar.

Doğrulama kuralları: tür ve şema sürümü eşleşmeli, fabrika kartında kod ve ad olmalı, makine tipleri ve makineler boş olmamalı, her makinede `id`, `type`, `name` dolu olmalı, makine kimlikleri benzersiz olmalı, bilinmeyen tip olmamalı, her döküm yolunun iki ucu paket içindeki bir makineye bağlı olmalıdır. Kural ihlali olan paket uygulanmaz ve ilk hata kullanıcıya gösterilir.

Uygulama `applyPlantPackage` içinde yapılır. `idFactory` tüm koleksiyonlardaki mevcut kimlikleri tarar, çakışmayan yeni `P`, `MCH`, `CP`, `PLC`, `TAG`, `OIL`, `BLD`, `ME`, `SIG`, `HMB`, `PM`, `VU` kimlikleri üretir. Fırın sınırı verilmişse yalnızca ilk N fırın kopyalanır; kaldırılan fırınlara bağlı yollar atlanır, kalan yolların makine kimlikleri yeni karşılıklarına çevrilir. PLC bağlantıları, tag'ler, eşikler ve modül haritası da yeni kimliklerle taşınır. Mevcut fabrikaların hiçbir kaydı değiştirilmez; yeni fabrika aktif hale gelir ve `vendorUpdates` satırı yazılır.

### 5.1 Beş fırından tek fırına

Kayıtlı `FIRM1` paketi 14 makine, 5 fırın ve 3 döküm yolu taşır. `furnaceCount: 1` ile uygulandığında 10 makine, 1 fırın ve 1 yol oluşur; `MCH-01`'e bağlı `CP-1` korunur, `MCH-02`'ye bağlı iki yol atlanır. Testere, homojenizasyon, tabla ve eşik kayıtları aynen kopyalanır. `furnaceCount: 2` ile uygulandığında 2 fırın ve 3 yol oluşur. Her iki sonuç da aynı kodla, aynı ekranlarda, aynı hesap motoruyla çalışır. Duman testi bu iki durumu ve yeni kimliklerin benzersizliğini doğrular.

### 5.2 İki fabrikanın yan yana var olması

`plants` koleksiyonunda birden fazla aktif fabrika bulunabilir. `activePlantId` yardımcı işlevi ayardaki kimliği kullanır; ayar geçersizse ilk aktif fabrikaya düşer, hiçbiri yoksa boş döner. `P1` gibi sabit bir yedek değer yoktur. Makine Parkı ve üretim ekranları seçili fabrikaya göre filtrelenir; modül haritası da fabrika kimliğine bağlıdır. Böylece 1 fırınlı fabrika ile 2 fırınlı fabrika aynı oturumda sırayla açılabilir.

---

## 6. Beş adımlı kurulum sihirbazı

**Saha Kurulum Sihirbazı**, merkezi yönetim alanındaki geliştirici ekranıdır. Operatör bu ekranı kullanmaz. Sıra, sahada bilginin doğal toplanma sırasını izler:

| Adım | Toplanan veri | Üretilen kayıt |
| --- | --- | --- |
| 1 · Fabrika Kartı | Kod, ad, şehir, `MANUAL` / `PLC`, saha notu | `plants` taslağı |
| 2 · Makine Parkı | Altı tip için adet ve varsayılan kapasite | `machines` önizlemesi |
| 3 · Döküm Yolları | Yollukta tutulan tonaj | `castingPaths` önizlemesi, fırın × tabla yol sayısı |
| 4 · PLC / Bağlantı | Adaptör, bağlantı adı, IP, protokol, port, tarama süresi | `plcConnections`, dört `plcTags`, `signalStates` taslağı |
| 5 · Modüller ve Doğrulama | Açılacak modüller, benzersiz kod ve en az bir fırın kontrolü | `plantModules`, `vendorUpdates`, aktif fabrika |

Her adım `setupDrafts` koleksiyonuna yazılır. Yarım kalan kurulum aynı adımdan devam eder; sahada ikinci bir ziyaret gerekmez. Dördüncü adımdaki **Bağlantıyı Test Et** düğmesi adaptör sözleşmesini çağırır, dört sinyalin tag eşlemesini ve sürücü durumunu bildirir. **Dört Sinyali Oku** düğmesi `door`, `casting`, `alarm`, `running` değerlerini tablo olarak gösterir. Mod `MANUAL` ise bu adım atlanabilir; PLC seçilirse dört sinyal için otomatik tag taslağı üretilir.

**Profili Oluştur** düğmesi bütün kurulumu tek bir işlemde yazar: fabrika kartı, makineler, yollar, bağlantı, tag'ler, sinyal durumları, modül haritası, aktif fabrika ayarı ve sürüm kaydı. Yarım yazılmış bir profil kalmaz. Kullanıcı oluşturulan fabrikanın Makine Parkı ekranına yönlendirilir.

---

## 7. Modül kaydı ve özellik bayrakları

`moduleRegistry` on beş modül tanımı taşır: Çekirdek, Satın Alma, Hammadde & Stok, Üretim, Makine Parkı, Döner Ocak / Cüruf, PLC Durum, Satış & Müşteri, Muhasebe & Maliyet, Depo & Sayım, Personel & Vardiya, Sevkiyat, Raporlama, Entegrasyon, Merkezi Yönetim. Her kayıtta kod, ad, grup, kapsanan ekran kimlikleri, varsayılan durum, gereksinim ve açıklama vardır. Otuz dört ekranın tamamı bir modüle bağlıdır; duman testi kapsanmayan ekran kalmadığını doğrular.

`plantModules` her fabrika için açık/kapalı haritasını tutar. `visibleNav` menüyü üç ölçüte göre filtreler: modül açık mı, fabrika modu gereksinimi karşılıyor mu, gerekli makine tipi aktif olarak var mı. Buna göre `PLC` modülü yalnızca `PLC` modlu fabrikada, `ROTARY` modülü yalnızca döner ocağı olan fabrikada, üretim modülü en az bir aktif fırını olan fabrikada görünür. Kapalı modülün ekranı doğrudan adres çubuğuna yazılsa da açılmaz; panel'e döner. `CORE` ve `VENDOR` kapatılamaz.

Entegrasyon kuralları da `moduleCode` alanıyla aynı kayda bağlanır. Bir modül kapatıldığında yalnızca menü öğesi değil, o modülün tetikleyicileri de Entegrasyon Matrisi ekranından çıkar. Veri silinmez; modül yeniden açıldığında kayıtlar ve kurallar geri gelir. **Modül Kaydı** ekranı bu haritayı tablo olarak gösterir, düzenlemeyi kaydeder ve sol menünün nasıl çizileceğini önizler.

---

## 8. Bağlantı adaptörleri ve dört sinyal

`adapterContracts` üç kayıt taşır: `simulated` (hazır), `opcua` (sözleşmeye hazır, sürücü sonraki aşamada), `modbus` (sözleşmeye hazır, sürücü sonraki aşamada). Her üçü de `connect`, `test`, `readFourSignals`, `disconnect` yeteneklerini bildirir. Bağlantı bilgisi `plcConnections` içinde veri olarak tutulur: fabrika, ad, IP, protokol, port, tarama süresi, adaptör ve aktiflik.

`testConnection` işlevi sürücü yoksa hata üretmez; `implemented: false` döndürür, `MANUAL (operatör veri girişi)` yedeğini bildirir ve kurulumun devam etmesine izin verir. Bu, `docs/08` içindeki "`MANUAL` eksik bir sürüm değildir" kararının kod karşılığıdır. `readFourSignals` her adaptörde aynı dört sinyali aynı alanlarla döndürür: `signal`, `value`, `address`, `machineId`, `source`, `at`. Üst katman protokolü bilmez; OPC UA veya Modbus sürücüsü takıldığında ekran, hesap ve olay katmanı değişmez.

Bu ayrım saha işini ikiye böler. Saha ekibi IP, port ve tag adreslerini veri olarak girer. Yazılım ekibi gerektiğinde yeni sürücüyü aynı sözleşmeyle ekler. İkisi birbirini beklemez; PLC olmayan fabrikada üretim aynı gün başlar. Gerçek OPC UA / Modbus haberleşmesi, VPN + MFA + rol bazlı yetki düzeni (`docs/04`) kurulduktan ve `docs/10` içindeki son aşamada sürücü eklendikten sonra devreye girer. Prototip bu noktada **gerçek ağ çağrısı yapmaz**; bu bilinçli bir sınırdır.

---

## 9. Sabit kodların temizlenmesi

Sürüm 1.2'de ekran kodunda sabit fabrika veya makine kimliği bırakılmamıştır:

| Önce | Sonra |
| --- | --- |
| `d.settings.activePlantId \|\| 'P1'` | `activePlantId(d)`; geçersizse ilk aktif fabrika |
| `machineId: 'MCH-08'` kesim olayları | `firstMachineId('SAW', d)` |
| Bakım formunda sabit `MCH-08` | `machinesOfType('SAW', d)` listesi |
| `F20`, `F35`, `FD` ocak kodları | `MCH-01`, `MCH-02`, `MCH-20` + `machineAliases` köprüsü |
| `d.furnaces.length` panel sayacı | `machinesOfType('FURNACE', d).length` |

`app/js/store.js` içindeki `activePlantId`, `machinesOfType` ve `firstMachineId` yardımcı işlevleri bu kuralın tek giriş noktasıdır. Duman testi ve doğrulayıcı, sabit kodların geri gelmesini dolaylı olarak engeller: `furnaces` projeksiyonu, makine referansları ve adaptör kaydı her çalıştırmada denetlenir.

---

## 10. Yeni ve değişen dosyalar

| Yol | İçerik |
| --- | --- |
| `app/js/modularity.js` | Modül kaydı, menü filtresi, bağımlılık raporu, profil paketi, doğrulama, uygulama, devre dışı bırakma, sihirbaz taslağı, kimlik üretimi |
| `app/js/adapters.js` | Üç adaptör, `testConnection`, `readFourSignals` |
| `app/js/views/setup.js` | Saha Kurulum Sihirbazı ve Modül Kaydı ekranları |
| `app/js/views/nav.js` | Menü tanımı; `index.js` döngüsel bağımlılık olmadan okur |
| `app/js/views/index.js` | 34 ekran kaydı; yeni iki ekran eklendi |
| `app/js/views/engineering.js` | Makine Parkı'nda bağımlılık raporlu devre dışı bırakma ve geri alma |
| `app/js/views/production.js` | `machineId` alanı ve aktif fabrikanın fırınları |
| `app/js/views/enterprise.js` | Entegrasyon kurallarının modül koduna göre filtresi |
| `app/js/store.js` | `activePlantId`, `machinesOfType`, `firstMachineId` |
| `app/js/seed.js` | `schemaVersion: 4`, tek makine kaynağı, altı yeni koleksiyon, iki kayıtlı profil paketi |
| `app/js/app.js` | Menünün fabrikaya göre çizilmesi, kapalı ekran koruması, sürüm etiketi |
| `app/css/style.css` | Sihirbaz adımları ve modül kaydı yardımcı stilleri |
| `app/sw.js`, `app/manifest.webmanifest` | v4 çevrimdışı önbellek, kurulum kısayolu |
| `server/erp/data/` | 59 JSON dosyası + `manifest.json` (`schema_version: 4`) |
| `server/erp/scripts/validate_data.py` | 58 koleksiyon; projeksiyon, modül, adaptör, profil ve devre dışı denetimleri |
| `tools/smoke_test.mjs` | 34 ekran + 1 fırın / 2 fırın profil, çıkarma, geri alma, adaptör, menü testleri |
| `tools/export_seed.mjs` | `schemaVersion: 4` manifest notu |
| `tools/build_docx.py` | Sürüm 1.2'de 13 dokümanı birleştirdi; Sürüm 1.3'te 14 dokümana çıktı |
| `docs/08`, `docs/12` | Modüler makine kararının genişletilmesi ve bu doküman |
| `docs/Dokumhane-ERP-Plan.docx` | On üç dokümanı birleştiren tek "AI'a atılacak" çıktı |

Altı yeni koleksiyon: `machineAliases` (3), `moduleRegistry` (15), `plantModules` (3), `setupDrafts` (1), `adapterContracts` (3), `profilePackages` (2). Toplam varlık 53'ten **59'a**, ekran 32'den **34'e**, doğrulanan koleksiyon 52'den **58'e**, doküman 12'den **13'e**, `schemaVersion` 3'ten **4'e** çıkar. Yerel depolama anahtarı `erp_demo_state_v4`, çevrimdışı önbellek `erp-studio-v4` olur; eski sürümden kalan eksik veri yeni ekranları bozmaz.

---

## 11. Doğrulama sonuçları

| Komut | Sonuç |
| --- | --- |
| `node tools/smoke_test.mjs` | 34 menü / 34 ekran, hesap motoru, mizan, idempotency, 1 ve 2 fırınlı profil, 20 bağımlı kaydın korunması, geri alma, adaptör yedeği: **TÜM TESTLER GEÇTİ** |
| `python3 server/erp/scripts/validate_data.py` | 58 koleksiyon, `schema_version: 4`, 15 modül, 3 adaptör, 2 profil paketi, 1 devre dışı makine: **0 hata, 1 uyarı** |
| `node tools/export_seed.mjs` | 59 JSON dosyası ve manifest üretildi |
| `python3 tools/build_docx.py` | 13 doküman tek geçerli OOXML Word dosyasında birleşti (Sürüm 1.2 anlık görüntüsü; 1.3'te 14) |
| Tarayıcı DOM denetimi | **34 ekran · 10 akış**: sihirbaz adımları, bağlantı testi, profil oluşturma, bağımlılık raporlu çıkarma/geri alma, modül filtresi, 5 fırın → 1 fırın kopyası, JSON içe alma ve eski üretim akışları geçti |

Tek bilgilendirici uyarı, demo malzeme stok fotoğrafı ile hareket toplamı farkıdır; gerçek kurulumda bakiye tüm hareketlerden türetilir (`docs/11`).

---

## 12. Sınırlar ve açık kalan işler

Bu sürüm **prototip düzeyinde modülerlik** sağlar. Aşağıdakiler bilinçli olarak kapsam dışıdır ve `docs/10` içindeki aşama 8–9'a bırakılmıştır:

1. Canlı veritabanı, REST API, gerçek kullanıcı oturumu, rol bazlı yetki ve çok kullanıcılı eşzamanlı yazma. Yerel depolama ve `store.change` tek istemci içindir; gerçek işlem sınırı sunucu tarafında kurulacaktır.
2. Gerçek OPC UA / Modbus sürücüsü, VPN tüneli, MFA ve imzalı güncelleme paketi. Adaptör sözleşmesi hazırdır, sürücü takılı değildir.
3. SMS, SMTP, e-Fatura, banka entegrasyonu, KDV beyanı ve gerçek bordro. `outbox` kuyruğu ve kuru çalıştırma vardır, canlı gönderim yoktur.
4. Profil paketinin sunucu tarafında sürüm geçmişi, çakışma birleştirme ve geri alma işlemi. Şu an içe alma yeni fabrika olarak yapılır; mevcut fabrikanın üzerine yazmaz.
5. Standart maliyet ile ağırlıklı ortalama / FIFO karşılaştırması, 17 tondan 14 tona dağıtım kuralı ve `docs/06` içindeki sekiz açık soru.
6. Gerçek tarayıcı ve tablet testi; şu ana kadarki DOM denetimi linkedom üzerinde yapılmıştır.

Sürüm 1.3'te bu yapıya **fabrikadaki tek bilgisayarda çalışan exe ajan** eklenmiştir (`docs/13`). Ajan bu dokümandaki fabrika profil paketini okur, aynı adaptör sözleşmesini kullanır, dört sinyale ek olarak sıcaklık telemetrisi üretir ve veriyi yerel SQLite + ERP kuyruğuna yazar. Profil değişince ajanın kodu değişmez.

Bu sınırlar, kullanıcının istediği "kolayca bağlama" hedefini engellemez: sahada yapılan iş veri girişi, profil kopyası ve bağlantı testidir; kod derlemesi veya veritabanı taşıması değildir. Sürücü ve sunucu katmanı eklendiğinde aynı profil paketi, aynı modül kaydı ve aynı adaptör sözleşmesi kullanılmaya devam eder.
