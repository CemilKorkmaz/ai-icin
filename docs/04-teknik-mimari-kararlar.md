# 04 — Teknik Mimari Kararları ve Altyapı Önerisi

**Durum:** Sohbetteki son kullanıcı mesajı (arayüz, sunucu, HTML/exe, SMS, mail, JSON, kapalı çevrim, yedekleme, uzak erişim) asistan tarafından cevaplanmamıştı. Bu doküman o soruların tamamını yanıtlar ve uygulamanın altyapı kararlarını netleştirir.

**Kısa cevap:** Windows Forms / exe değil; **firma içi sunucuda çalışan, tarayıcıdan açılan, yüklenebilir bir PWA (HTML/CSS/JS)**. Veri işlemsel bir veritabanında tutulur, JSON arşiv/aktarım formatı olarak kullanılır. İnternet olmadan üretim devam eder; SMS, e-posta ve raporlar **giden kutu kuyruğunda** bekler. Sunucu arızasına karşı düzenli harici disk yedeği alınır. Evden/geliştirici erişimi **VPN + MFA + rol bazlı yetki** ile verilir, doğrudan IP açılmaz.

---

## 1. Soru: HTML arayüzü mü, EXE / Windows Forms mu, başka bir öneri mi?

### 1.1 Seçeneklerin karşılaştırması

| Seçenek | PC | Tablet | Dokunmatik | Dağıtım / güncelleme | Kapalı çevrim | Değerlendirme |
| --- | --- | --- | --- | --- | --- | --- |
| Windows Forms / WPF (.exe) | Evet | Hayır (Windows tablet hariç) | Zayıf | Her makineye kurulum, sürüm dağıtımı zor | Evet | **Önerilmez.** Sohbette belirtildiği gibi daha önce yapılan uygulamanın yalnızca bilgisayarlarda çalışması tam olarak bu kısıttır |
| Her istemciye ayrı exe + ortak HTML | Evet | Kısmen | Orta | İki katman, iki kurulum | Evet | Gereksiz karmaşıklık |
| Electron / Tauri masaüstü paketi | Evet | Hayır | Orta | Her cihaza kurulum | Evet | Tablet desteği ve tek noktadan güncelleme avantajı yok |
| Native mobil uygulama | Hayır | Evet | İyi | Mağaza / MDM | Evet | Ayrı kod tabanı, PC'de çalışmaz |
| **Tarayıcı + PWA (öneri)** | **Evet** | **Evet** | **İyi** | **Yalnızca sunucuda güncelle** | **Evet** | **Tek kod tabanı, kısayol ikonu, service worker ile önbellek** |
| Salt bulut SaaS | Evet | Evet | İyi | Bulut | **Hayır** | İnternet kesintisinde üretim durur; şartı karşılamaz |

### 1.2 Karar ve gerekçe

İstemci tarafı **HTML + CSS + JavaScript** ile, tercihen React/Next.js veya Vue gibi bir framework ile yazılır; bu depodaki prototip aynı yaklaşımın bağımlılıksız hâlidir. Windows Forms yerine PWA seçilmesinin nedenleri:

1. **Tek kod, her cihaz.** Aynı adres PC'de, tablette, dokunmatik panelde ve telefonda açılır.
2. **Kısayol ikonu tam olarak karşılanır.** PWA "Uygulamayı yükle" ile masaüstüne/ana ekrana ikon olarak eklenir; Windows'ta `.url` kısayolu, tablette kiosk modu da kullanılabilir. Kullanıcı açtığında tam ekran, tarayıcı çubuksuz bir uygulama görür.
3. **Güncelleme tek noktadan.** Yeni sürüm sunucuya kopyalanır; istemcilere exe dağıtılmaz, sürüm uyumsuzluğu olmaz.
4. **Dokunmatik ve sürükle-bırak.** Pointer Events ile hem fare hem parmak çalışır; büyük dokunma hedefleri, responsive tablolar.
5. **Kapalı çevrim.** Service worker uygulama kabuğunu ve son veriyi önbelleğe alır; LAN içinde sunucuya erişim varken tüm işlemler çalışır, internet hiç gerekmez.
6. **Sunucu tarafı ayrı bir exe değil, servistir.** Kullanıcının önerdiği "server bilgisayarı için ayrı bir exe" fikri modern karşılığıyla bir **Windows Service / systemd unit / Docker container** olarak düşünülmelidir: API, zamanlayıcı, yedekleme ve giden kutu işçisi burada koşar. Arayüz kodundan bağımsızdır ve kullanıcıların bilgisayarlarına kurulmaz.

> Özet: **İstemcide exe yok, sunucuda servis var.** Eğer ileride kantar tartısı, barkod yazıcı veya seri port gibi yerel donanım erişimi gerekirse, yalnızca o istasyonlara küçük bir "yerel ajan" (Tauri/Electron veya .NET servisi) kurulur; ana uygulama yine web'de kalır. Bu, mimariyi bozmadan donanım ihtiyacını karşılar.

---

## 2. Soru: Sistem nerede çalışacak? Sunucu mu, bulut mu?

### 2.1 Karar: On-premise (firma içi) sunucu + opsiyonel bulut yedeği

Sohbetteki istek nettir: *"bu sistemi bir firmanın server dosyalarında tutucaz, erp sistemi diye bir klasörde çalışacak"* ve *"interneti olmadığında da server'a bağlıyken çalışabiliyor olması gerekiyor"*. Bu, bulut zorunluluğunu doğrudan dışlar.

Firma içi sunucuda (fiziksel sunucu, NAS veya güçlü bir iş istasyonu) şu yapı kurulur:

| Bileşen | Yer / görev |
| --- | --- |
| `ERP/app/` | Derlenmiş frontend dosyaları (statik) |
| `ERP/api/` | Uygulama servisi (Node/FastAPI), JWT, rol kontrolü, denetim logu |
| `ERP/data/` | JSON arşiv / snapshot / dışa aktarma dosyaları |
| `ERP/db/` | Ana veritabanı (PostgreSQL veya SQLite dosyası) |
| `ERP/files/` | Kantar fişleri, rapor PDF'leri, sertifikalar |
| `ERP/backups/` | Yerel günlük yedekler |
| `ERP/scripts/` | Yedekleme, giden kutu işçisi, veri doğrulama, zamanlanmış raporlar |
| `ERP/logs/` | Uygulama ve denetim logları |

Sunucuya iç ağdan `https://erp.firma.local` adresiyle erişilir (Nginx/Caddy reverse proxy + iç DNS + kurum içi sertifika). İstemciler yalnızca bu adresi bilir; uygulama ve veri hiçbir zaman istemciye dağıtılmaz.

### 2.2 Bulutun rolü

Bulut **birincil çalışma ortamı değil**, isteğe bağlı üç amaçla kullanılabilir: şifreli uzak yedek, VPN relay/koordinasyon (Tailscale) ve yazılım güncelleme dağıtımı. İnternet kesilse bile fabrika içi sistem bundan etkilenmez.

### 2.3 Metin olarak sistem mimarisi

İstemci katmanı, sunucuya HTTPS ile bağlanan tarayıcı/PWA'dır; kendi önbelleği (service worker + IndexedDB) vardır. Sunucu katmanında reverse proxy gelen isteği statik arayüze veya API'ye yönlendirir. API; kimlik doğrulama, rol kontrolü, iş kuralları, stok hareketi yazma, reçete hesabı, onay akışları ve denetim logundan sorumludur. Veri katmanı işlemsel veritabanı + JSON arşiv + dosya deposudur. Arka plan katmanında zamanlayıcı (rapor üretimi), giden kutu işçisi (SMS/e-posta), yedekleme işçisi ve PLC telemetri toplayıcı çalışır. Dış dünya ile tek temas noktası giden kutu işçisidir; üretim akışının hiçbir adımı dış servise doğrudan bağlı değildir. Evden veya geliştirici tarafından gelen istekler VPN tünelinden geçip aynı reverse proxy'ye ulaşır, ancak rol bazlı olarak salt-okunur yetkiyle sınırlıdır.

---

## 3. Soru: İnternet yokken üretim devam etsin, internet gelince mail/SMS devam etsin

### 3.1 Kapalı çevrim ilkesi

İki ayrı bağlantı kavramı birbirine karıştırılmamalıdır:

- **LAN bağlantısı (istemci ↔ firma sunucusu):** Üretim için zorunludur ve internete ihtiyaç duymaz. Satın alma, stok, ergitme, döküm, testere, homojenizasyon, sevkiyat onayları, raporların ekranda görüntülenmesi tamamen bu bağlantı üzerinde çalışır.
- **WAN bağlantısı (sunucu ↔ dış servisler):** Yalnızca SMS, e-posta, bulut yedek ve opsiyonel güncelleme için gerekir.

### 3.2 Giden kutu (outbox) deseni

Dışa bağlı her iş **doğrudan gönderilmez**, önce kuyruğa yazılır:

| Alan | Açıklama |
| --- | --- |
| `id`, `created_at` | Kuyruk kaydı |
| `channel` | `sms` / `email` / `cloud_backup` |
| `to` | Telefon numarası veya e-posta adresi |
| `subject`, `body` | İçerik (rapor özeti, alarm metni, talep maili) |
| `payload` | Ek veri (ör. rapor PDF yolu, PLC etiketi, ölçüm değeri) |
| `status` | `queued` → `sending` → `sent` / `failed` |
| `attempt`, `next_retry_at`, `last_error` | Yeniden deneme bilgileri |
| `source` | Hangi modülün ürettiği (stok uyarısı, proses alarmı, zamanlanmış rapor) |

Akış: modül bildirimi üretir → sistem içi bildirim anında ekrana düşer → dış kanala gidecekse `outbox` satırı yazılır → internet varsa işçi hemen, yoksa bağlantı gelince işler → başarısızlıkta üstel geri çekilmeyle yeniden denenir, tekrar eden hata yöneticiye sistem içi uyarı olur. **Kuyruk yüzünden hiçbir üretim adımı beklemez veya bloklanmaz.**

Bu desen sohbetteki şu isteklerin tamamını karşılar: belli telefon numaralarına mesaj, PLC verilerinin bakım birimine iletilmesi, günlük/haftalık/aylık durum raporlarının maili, kullanıcıların yapımcıya talep maili göndermesi.

### 3.3 İstemci tamamen koparsa

Service worker uygulama kabuğunu önbellekte tuttuğu için arayüz açılır. Operatörün girdiği kayıtlar tarayıcının yerel kuyruğuna (IndexedDB) yazılır ve ekranda "senkronizasyon bekliyor" olarak işaretlenir; sunucu geri geldiğinde API'ye gönderilir. Çakışma olmaması için her kayıt istemci tarafında üretilmiş benzersiz bir kimlik taşır ve sunucu aynı kimliği ikinci kez kabul etmez (idempotent yazma). Bu sayede "server çökmez ama çöktüğü durumlarda" bile sahadaki veri girişi kaybolmaz.

---

## 4. Soru: Bildirimler, SMS servisleri, PLC verileri

| İhtiyaç | Önerilen uygulama |
| --- | --- |
| Belli numaralara SMS | Outbox → SMS sağlayıcı (Netgsm, İletNet, Twilio) veya LAN içi GSM modem. Alıcı listesi ayarlardan yönetilir, koda gömülmez |
| PLC'den veri | PLC'ler genellikle internet değil **LAN** üzerindedir; OPC UA / Modbus TCP gateway ile ölçümler `telemetry` tablosuna yazılır. Eşik aşımı → sistem içi alarm + bakım birimine SMS kuyruğu |
| Günlük / haftalık / aylık rapor maili | Zamanlayıcı (cron / Windows Task Scheduler) raporu üretir, PDF'i `ERP/files/` altına yazar, `outbox`'a mail kaydı bırakır |
| Kullanıcı → yapımcı talep maili | Ayarlar/Bildirim ekranında form; gönder düğmesi outbox'a yazar; internet yoksa "kuyruğa alındı" bilgisi gösterilir |
| Süreç alarmları | Ergitme 2. saat karıştırma, Mg/Si ekleme, testere ve homojenizasyon süre aşımı, kritik stok, onay bekleyen sevkiyat |

Prototipte üstteki davranış **çevrimiçi/çevrimdışı anahtarıyla** canlı olarak gösterilir: çevrimdışıyken oluşturulan SMS/mail "Kuyrukta" durumuna düşer, çevrimiçine geçildiğinde "Gönderildi" olur.

---

## 5. Soru: Her şey JSON mu, başka format mı?

### 5.1 Karar: Ana kayıt veritabanında, JSON arşiv ve aktarım formatında

Kullanıcı "tüm her şey JSON olarak yada önerebileceğin başka bir formatta saklanabilir" demiştir. Öneri şudur:

| Kullanım | Format | Gerekçe |
| --- | --- | --- |
| Canlı, çok kullanıcılı kayıtlar | **SQLite** (tek sunucu) veya **PostgreSQL** (birden çok istemci/rapor yükü) | Aynı anda iki operatör stok düşerse JSON dosyasında yarış/bozulma riski vardır; veritabanı transaction, kilit, indeks ve sorgu sağlar |
| Arşiv, yedek, dışa aktarma, AI girdisi | **JSON** (UTF-8, tarih/saat ISO 8601, ondalık ayırıcı nokta, birim açıkça yazılı) | Okunabilir, taşınabilir, sürüm kontrolüne uygun, uygulamanın "kendi anlayacağı dilde alıp görselleştirdiği" format |
| Büyük dosyalar | PDF / JPEG / XLSX `ERP/files/` altında, yolu JSON/DB'de referans | Kantar fişi, sertifika, rapor çıktıları |
| Rapor alışverişi | CSV / XLSX | Muhasebe ve Excel kullanan birimler için |
| Zaman serisi (PLC) | DB tablosu + günlük JSON özet | Ham veri çok hızlı büyür; özet arşivlenir |

### 5.2 JSON sözleşmesi

- Her dosya tek bir kök nesne veya dizi; `schema_version`, `generated_at`, `records` alanları bulunur.
- Tüm referanslar **ID ile** yapılır (malzeme adıyla değil); ad değişse geçmiş kayıtlar bozulmaz.
- Miktar ve para birimi ayrı alanlardır; `quantity` + `unit` + `currency` birlikte yazılır.
- Her işlem kaydında `id`, `occurred_at`, `source`, `user_id` ve gerekirse `reference_no` vardır; stok bakiyesi JSON'a "anlık fotoğraf" olarak yazılır, doğrulama hareketlerden yeniden hesaplanır.
- Şemalar `docs/05` içinde, örnek dosyalar `server/erp/data/` içindedir. Prototip aynı şemayı kullanır; **Ayarlar → Veri Yönetimi** ile JSON dışa/içe aktarılabilir.

> Bu ayrım sayesinde kullanıcının istediği "JSON'ları alıp görsel ekranda gösterme" birebir korunur: uygulama `data/*.json` dosyalarını okur, doğrular ve ekranlara bağlar. Aynı zamanda eşzamanlı kullanımda veri güvenliği sağlanmış olur.

---

## 6. Soru: Sunucu çökerse veriler düzenli olarak bir harddiske kaydedilsin

### 6.1 3-2-1 yedekleme politikası

1. **3 kopya:** canlı veritabanı, sunucudaki günlük yedek klasörü, harici/farklı fiziksel disk.
2. **2 farklı ortam:** sunucu diski + harici USB/NAS disk (veya ikinci bir makine).
3. **1 uzak kopya (opsiyonel):** internet varken şifreli bulut yedeği; kapalı çevrimde atlanır, kuyruğa alınır.

### 6.2 Somut uygulama

`server/erp/scripts/backup.py` (stdlib, bağımlılık yok) şunu yapar: veritabanının tutarlı anlık görüntüsünü alır, tüm tabloları JSON olarak `data/` altına yazar, `ERP/backups/YYYY-MM-DD_HHMM/` klasörüne kopyalar, harici disk yoluna (`D:\ERP_Yedek` veya `/mnt/backup`) ikinci kopyayı atar, sağlama toplamı (checksum) üretir, belirlenen saklama süresinden eski yedekleri temizler ve sonucu loglar. Windows'ta Görev Zamanlayıcı, Linux'ta cron ile saatlik/günlük çalıştırılır.

Ek önlemler:

- Yedekleme **başarısız olursa** sistem içi bildirim + yöneticiye SMS kuyruğu oluşur.
- Ayda bir **restore testi** yapılır; yedek almak tek başına yeterli değildir.
- İkinci bir "soğuk yedek" sunucu aynı `ERP` klasörünü alır; ana sunucu arızalanırsa DNS kaydı oraya çevrilir.
- Güç kesintisine karşı UPS; veritabanı WAL/transaction modunda.
- İstemci yerel kuyruğu (Bölüm 3.3) sunucu kapalıyken yapılan girişleri korur.

---

## 7. Soru: Kullanıcı evinden / geliştirici uzaktan erişebilir mi, IP girerek olur mu?

### 7.1 Doğrudan IP açmak neden riskli

"Bir IP girip sisteme ulaştırmak" teknik olarak mümkündür (port yönlendirme + sabit IP/DDNS), ancak üretim verisi, personel bilgileri ve onay akışları internete açılmış olur; brute-force, tarayıcı açıkları ve yanlış yetki riski doğar. **Önerilmez.**

### 7.2 Önerilen yöntem

| Adım | Uygulama |
| --- | --- |
| 1 | **WireGuard veya Tailscale VPN** kurulur; sunucuya dışarıdan port açılmaz |
| 2 | Kullanıcı evden VPN'e bağlanır ve aynı `https://erp.firma.local` adresini kullanır |
| 3 | **MFA / cihaz onayı** zorunlu; her cihaz ayrı VPN anahtarı taşır, anahtar iptali anında yapılabilir |
| 4 | **Rol bazlı kısıt:** evden bakan yönetici salt-okunur panel + raporlar; onay yetkisi istenirse ayrıca verilir |
| 5 | **Geliştirici hesabı:** salt-okunur, kişisel verilerden arındırılmış görünüm, denetim logu erişimi, zaman sınırlı erişim |
| 6 | Tüm uzak oturumlar `audit_logs` içinde kayıt altındadır; olağandışı erişim uyarı üretir |

Acil durumlar için alternatif: ters tünel / relay (Tailscale Funnel benzeri) veya ısmarlama bir "okuma servisi" ile yalnızca özet KPI'ların dışarı verilmesi. Hiçbir durumda yazma yetkisi doğrudan internete açılmaz.

---

## 8. Arayüz ve etkileşim kararları

| İstek | Karar |
| --- | --- |
| "Windows 98 değil, yeni nesil" | Bileşen tabanlı tasarım sistemi: tipografi ölçeği, 8 px ızgara, tutarlı gölge/radius, anlamlı renk paleti, boşluk hiyerarşisi |
| "Profesyonel web sitesi gibi" | Koyu lacivert yan menü + açık yüzey, indigo/cyan vurgu, KPI kartları, SVG grafikler, durum rozetleri |
| "Sürükle bırak" | Üretim akışı kartları Pointer Events ile taşınır; hem fare hem dokunmatik; klavye ile de taşıma alternatifi |
| "Tablet uygulaması gibi" | Responsive grid, ≥44 px dokunma hedefi, çekmece menü, yatay kaydırmalı tablolar, PWA tam ekran |
| "Kısayol ikonu" | PWA install / `.url` kısayolu / kiosk modu; tek adres |
| Renklerle anlaşılabilirlik | Stokta yeşil/sarı/kırmızı/mavi, onaylarda gri/amber/yeşil, alarmlarda kırmızı; renk + metin + ikon birlikte (erişilebilirlik) |
| Grafikler internetsiz | Harici CDN/ grafik kütüphanesi yerine yerel SVG çizimi; fontlar sistem fontu |

---

## 9. Güvenlik ve yönetişim

- Rol bazlı yetkilendirme (RBAC); her ekran ve her yazma işlemi yetki kontrolünden geçer.
- **Görev ayrılığı:** sevkiyatı yönetici onaylar, stok düşümünü muhasebe onayı tetikler; aynı kullanıcı iki onayı birden veremez.
- Her stok değişikliği bir `stock_movements` kaydıdır; manuel düzeltme ayrı türdedir ve neden zorunludur.
- Denetim logu: kim, ne zaman, hangi kaydı, önce/sonra değerleriyle değiştirdi.
- Parolalar hash'lenir; oturumlar süreli; HTTPS kurum içi sertifikayla bile zorunludur.
- Outbox içeriğinde hassas veri en aza indirilir: rapor maillerinde kişisel veri bulunmaz, ekler erişim kontrollü dosya yoluyla iletilir.
- Yedekler şifrelenir; harici disk fiziksel olarak kilitli tutulur.

---

## 10. Aşamalı uygulama sırası

| Aşama | Yapılacak iş | Çıktı |
| --- | --- | --- |
| 0 | Bu dokümanlar + UI prototipi + veri şeması + Word çıktısı | Onaylanan plan |
| 1 | Sunucu kurulumu, `ERP/` klasör düzeni, iç DNS, HTTPS, API iskeleti, kimlik/rol | Çalışan iskelet |
| 2 | Faz 1 ekranları (satın alma, stok, mal kabul, kırıcı), veritabanı ve hareket motoru | Stok bütünlüğü |
| 3 | Üretim modülleri, reçeteler, sayaçlar, alarmlar | Uçtan uca üretim |
| 4 | Sevkiyat onayları, arşiv, raporlar, PDF/Excel | Yönetim görünürlüğü |
| 5 | Outbox worker (SMS/SMTP), PLC/OPC UA, yedekleme işçisi, VPN, restore testi | Dayanıklı, kapalı çevrim sistem |
| 6 | Sahada pilot, eğitim, performans ve erişilebilirlik iyileştirmeleri | Canlı kullanım |

---

## 11. Karar Özeti Tablosu

| Soru | Cevap |
| --- | --- |
| HTML mi exe mi? | **HTML/PWA**; sunucuda servis, istemcide exe yok (donanım istasyonu hariç) |
| Sunucu mu bulut mu? | **Firma içi sunucu**, `ERP/` klasörü; bulut yalnızca opsiyonel yedek |
| İnternet yokken çalışır mı? | **Evet**, LAN yeterli; service worker + yerel kuyruk |
| İnternet gelince ne olur? | **Outbox kuyruğu** işlenir: SMS, mail, dönemsel raporlar, bulut yedek |
| Veri formatı? | **DB canlı kayıt + JSON arşiv/aktarım**, dosyalar PDF/JPEG/XLSX |
| PLC verisi? | LAN üzerinden OPC UA/Modbus → telemetri → eşik → bakım SMS kuyruğu |
| Server çökerse? | 3-2-1 yedek, harici disk, restore testi, soğuk yedek sunucu, istemci kuyruğu |
| Evden erişim? | **VPN + MFA + rol bazlı salt-okunur**; doğrudan IP/port açılmaz |
| Kısayol ikonu? | PWA yükle / `.url` / kiosk; tek adres |
| Tablet? | Aynı uygulama, responsive + dokunmatik + sürükle-bırak |



---

## 12. Saha Görüşmesi Sonrası Ek Kararlar

İlk sohbetteki mimari soruların cevapları korunur; aşağıdaki kararlar mühendis görüşmesinden (`docs/06`) doğmuştur.

### 12.1 İki çalışma modu

Yazılım `MANUAL` ve `PLC` olmak üzere iki modda çalışır. `MANUAL` modda makinelerden hiç veri alınmaz, operatör bütün üretim verilerini kendisi girer; bu eksik bir sürüm değil, birinci sınıf bir çalışma biçimidir. `PLC` modda dört temel sinyal otomatik okunur. İki mod arasında yalnızca veri kaynağı değişir; hesap motoru, olay günlüğü, arşiv ve raporlar aynıdır.

### 12.2 Dört sinyal kuralı

HMI panelindeki onlarca sinyalin tamamı okunmaz. İlk fazda yalnızca kapı durumu, döküm modu ve devrilme durumu, alarm durumu ve çalışma durumu alınır. Alarm yalnızca "arıza var" bilgisini taşır; ateşleyici arızası gibi ayrıntılar ilk faza alınmaz. Amaç hem ekranı kalabalıklaştırmamak hem geliştirme yükünü artırmamaktır. Ayrıntılar `docs/08` içindedir.

### 12.3 İki ayrı arayüz

Fabrika operatörünün gördüğü ekran ile yazılımı geliştiren ekibin merkezi yönetim ekranı birbirinden ayrıdır. Merkezi ekranda fabrika ekleme, makine tanımlama, PLC IP adresi, protokol, veri adresi eşleştirmesi, modül yapılandırması ve uzaktan güncelleme yapılır; bu adresler operatör ekranında görünmez. Ekip yalnızca aletleri eşleştirir, sistem kendiliğinden çalışır.

### 12.4 Modülerlik kime hizmet ediyor

Program ilk açıldığında hiçbir makine tanımlı değildir. Ancak makineleri **fabrika çalışanı değil, geliştirici ekip** tanımlar. Yeni ocak alındığında uzaktan bağlanılır veya imzalı güncelleme gönderilir. Bu aynı zamanda sunulacak bakım hizmetidir. Her fabrikaya özel kod yazılmaz; fabrika profili `plantId` ile ayrılır.

### 12.5 Olay tabanlı JSON arşivi ve kuyruk

Konuşmada tarif edilen "tuşa basınca JSON'a kayıt düşer, merkezi yazılım 1 ilâ 3 saniyede tarar, hesaplar ve kaydı siler" akışı korunur; yalnızca son adım düzeltilir. Kayıt silinmez, önce kalıcı arşive yazılıp SHA-256 ile doğrulanır, sonra `archived` durumuna alınır. Kuyruk `ERP/inbox/`, arşiv `ERP/archive/YYYY/MM/{döküm kodu}/events.jsonl` altında ayrı tutulur. Her aşamadan bir olay satırı düşer; döküm kodu üzerinden bütün zincir geriye dönük okunur. Ayrıntılar `docs/09` içindedir.

### 12.6 Merkezi bilgisayar

İlk kurulum bir mini PC veya laptop üzerinde yapılır; Nginx, Docker veya bulut hesabı gerekmez. Önce merkezi yönetim altyapısı kurulur, sonra fabrika/makine tanımlama, JSON veri alışverişi ve üretim modülleri, en son gerçek PLC bağlantıları gelir. Kurulum sırası `docs/10` içindedir.

| Karar | Önceki durum | Yeni durum |
| --- | --- | --- |
| PLC verisi | Telemetri + eşik + bakım SMS | İki mod, dört sinyal, merkezi tag eşleştirme |
| Makine tanımları | Sabit ocak listesi (`furnaces.json`) | Boş başlangıç, modüler tipler, fabrika profili |
| Arayüz | Tek operatör arayüzü | Operatör + merkezi yönetim |
| JSON | Arşiv / aktarım / yedek | Arşiv + **olay günlüğü** + işlem kuyruğu |
| Kurulum | On-premise sunucu | Mini PC ile başlangıç, aşamalı büyüme |

Bu doküman, `docs/Dokumhane-ERP-Plan.docx` içinde de yer alır ve "yapay zekâya verilip genel yazılım altyapı şemasının oluşturulması" için gereken teknik girdiyi sağlar.
