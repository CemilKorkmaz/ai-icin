# 03 — Dökümhane ERP Sistemi / Ana Plan Dokümanı

**Sürüm:** 1.0 — sohbet temel alınarak birleştirilmiş ve **alüminyum dökümhanesine göre düzeltilmiş** ana plan
**Kaynaklar:** `docs/00` (ham metin), `docs/01` (uçtan uca rapor), `docs/02` (Faz 1), sohbetteki genel planlama dokümanı
**Amaç:** Uygulamanın nasıl tasarlanacağı, nasıl yapılacağı ve içeriğinin ne olacağına dair yol haritası; ayrıca Word çıktısına girecek ana metin.

---

## İçindekiler

1. Projenin Amacı ve Kapsamı
2. Sektörel Analiz ve Süreç Akışı
3. Modül Yapısı
4. Modül Detayları
5. Teknik Mimari
6. Kullanıcı Arayüzü Tasarımı
7. Geliştirme Planı (Fazlar)
8. Proje Klasör Yapısı
9. Önceliklendirme
10. Riskler ve Çözüm Önerileri
11. Genel Plandaki Sektörel Sapmaların Düzeltilmesi
12. Saha Görüşmesiyle Gelen Kapsam Genişlemesi
13. Genel ERP Karşılaştırmasıyla Gelen Ticari ve Finansal Katman
14. Sonraki Adımlar

---

## 1. Projenin Amacı ve Kapsamı

### 1.1 Amaç

Alüminyum dökümhanesinin satın alma, stok, üretim, sevkiyat ve raporlama süreçlerini uçtan uca dijitalleştirmek; her biyeti döküm kodu üzerinden hammaddeye ve tedarikçiye kadar izlenebilir kılmak; fire, sarfiyat ve verimliliği ölçülebilir hâle getirmek. Sistem, internet olmadan yalnızca firmanın yerel ağına bağlıyken de üretimi sürdürebilmelidir.

### 1.2 Hedef Kullanıcılar

| Kullanıcı | Sistemdeki yeri |
| --- | --- |
| Firma sahibi / Genel Müdür | Panel, raporlar, onaylar, uzaktan salt-okunur erişim |
| Üretim Müdürü / Şefi | Reçeteler, proses uyarıları, süre aşımları |
| Satın Alma Sorumlusu | Malzeme kartları, emirler, fiyat takibi |
| Depo / Stok Sorumlusu | Mal kabul, stok durumu, kritik seviyeler |
| Kırıcı Operatörü | Brüt/fire/net kaydı |
| Ocakçı (Ergitme) | Şarj girişi, reçete uyarıları, kalan metal, cüruf |
| Döküm Operatörü | Sayaç, metraj, fire, sarf tüketimi |
| Testere Operatörü | Kesim, kafa, talaş, yağ, süre |
| Homojenizasyon Operatörü | Reçete, süre, soğutma |
| Paketleme / Sevkiyat Sorumlusu | Mamul stok, kantar fişi, çıkış seçimi |
| Muhasebe / Fatura Sorumlusu | İkinci onay, fatura no, arşiv |
| Bakım Birimi | PLC kaynaklı SMS bildirimleri |
| Yapımcı / Geliştirici | Talep mailleri, salt-okunur denetim erişimi |

### 1.3 Kapsam

**Kapsam içi (ilk sürüm):** Satın alma, mal kabul, kırıcı/fire, stok ve stok hareketleri, değişken malzeme/kategori/birim tanımları, fiyat geçmişi ve grafikleri, alaşım ve proses reçeteleri, ergitme, döküm, testere, homojenizasyon, soğutma, paketleme, mamul stok, iki kademeli onaylı sevkiyat, arşiv, istatistik ve raporlar, bildirimler, çevrimdışı giden kutusu, yedekleme, rol bazlı yetkilendirme.

**Kapsam dışı (ilk sürüm):** Tam muhasebe / e-fatura / e-defter entegrasyonu, native mobil uygulama (PWA yeterli), kalıphane ve kum döküm süreçleri, CNC / boyama gibi alüminyum biyet hattında bulunmayan operasyonlar, LME canlı fiyat API'si, bulut zorunluluğu.

---

## 2. Sektörel Analiz ve Süreç Akışı

### 2.1 İş Akışı

Süreç şu sırayı izler: müşteri talebi ve sipariş → satın alma emri → mal kabul → kırıcı/ayıklama → hammadde ve sarf stokları → ergitme (ocak, şarj, alaşım reçetesi, zamanlı uyarılar, kalan metal, cüruf) → döküm (döküm kodu, metraj, tonaj, fire, yolluk/filtre artığı, sarf tüketimi) → testere (kesim, kafa, talaş, fire, süre, yağ) → homojenizasyon → soğutma → paketleme → mamul stok → sevkiyat (kantar + yönetici onayı + muhasebe onayı) → arşiv → istatistik ve dönemsel raporlar.

Bu akışın her adımı stok hareketi üretir. Yan ürünler (cüruf, talaş, kafa, yolluk, fire biyet) hat boyunca yeniden stoka girer ve aynı kontrollü sevkiyat süreciyle satılır.

### 2.2 Bu Tesisin Ayırt Edici Özellikleri

| Özellik | Sisteme etkisi |
| --- | --- |
| Sürekli döküm / biyet üretimi | Kalıp, maça, kum reçetesi yok; bunun yerine çap, boy, metraj ve tonaj hesabı var |
| Alaşım üretimi (6063 vb.) | Ocak kapasitesi + alaşım + tonaj bazlı matematiksel reçete, önerilen/gerçekleşen miktar farkı |
| Döngüsel yolluk fire | Ayrı yan ürün kodu; verim hesabında sonsuz döngüye girmez |
| Döner ocak (opsiyonel) | Cüruf geri kazanımı, tuz/kutu kola girdileri, net metal ve fire hesabı |
| Homojenizasyon + soğutma | Reçeteye bağlı süre sayaçları ve süre aşımı alarmları |
| İki kademeli sevkiyat onayı | Kantar → yönetici → muhasebe; stok düşümü yalnızca son onayda |
| Değişken malzeme yapısı | Hiçbir malzeme/kategori sabit kodlanmaz |
| Kapalı çevrim zorunluluğu | Yerel sunucu + önbellek + giden kutu kuyruğu |

---

## 3. Modül Yapısı

| # | Modül | Alt bileşenler |
| --- | --- | --- |
| 1 | Satın Alma | Malzeme tanımları, emirler, fiyat takibi, tedarikçiler |
| 2 | Hammadde & Stok | Stok durumu, mal kabul, kırıcı/fire, hareketler, kritik uyarılar |
| 3 | Üretim | Ergitme, döküm, testere, homojenizasyon, soğutma, paketleme, reçeteler |
| 4 | Mamul Stok & Sevkiyat | Biyet seçimi, kantar, iki kademeli onay, fatura, arşiv, yan ürün satışı |
| 5 | İstatistik & Raporlama | Üretim, tüketim, fire, giren-çıkan, çıktı alma |
| 6 | Bildirim & Entegrasyon | Sistem içi bildirim, SMS, e-posta, PLC telemetri, giden kutu |
| 7 | Sistem Yönetimi | Kullanıcılar, roller, temel tanımlar, yedekleme, denetim logu, bağlantı ayarları |
| 8 | Satış & Müşteri | Müşteri kartı, satış teklifi, sipariş, kredi limiti, rezervasyon, cari bakiye |
| 9 | Muhasebe & Finans | Hesap planı, alış/satış faturası, çift taraflı fiş, mizan, tahsilat/ödeme, dönem kapanışı |
| 10 | Maliyet & Bütçe | Döküm kodu bazında beş kalem maliyet, birim maliyet, brüt kâr, dönemsel bütçe |
| 11 | Depo & Personel | Depo lokasyonları, fiziki sayım, personel kartı, vardiya, operatör izi |
| 12 | Entegrasyon | Tetikleyici başına üretilen kayıtlar, tek kayıt çok etki, idempotent muhasebeleştirme |

Modüller bağımsız ekranlar hâlinde tasarlanır ancak tek veri modelini paylaşır: malzeme kartı, stok hareketi, döküm kodu, onay akışı, cari hesap, muhasebe fişi ve bildirim kuyruğu. 8 ile 12 arasındaki modüller `docs/11` içindeki genel ERP karşılaştırmasıyla eklenmiştir; üretim ve satın alma akışını değiştirmez, ortak veri modelini ticari ve finansal tarafa genişletir.

---

## 4. Modül Detayları

### 4.1 Satın Alma

Malzeme kartları kullanıcı tanımlıdır; ad, kategori, birim, fiyat ve kritik eşikler değiştirilebilir. Emir kalemlerinde anlık alış fiyatı girilir ve fiyat geçmişine yazılır. Malzeme detayında tarihsel fiyat grafiği, tedarikçi karşılaştırması ve dönemsel değişim özetleri bulunur. Tedarikçi kartlarında iletişim, vergi bilgileri ve geçmiş alışlar tutulur. Ayrıntılar `docs/02` Bölüm 3'te verilmiştir.

### 4.2 Hammadde & Stok

Mal kabul, kırıcı/fire, renk kodlu stok durumu ve kronolojik hareket logu. Giren hurdanın tamamı hammadde olabileceği gibi bir kısmı fireye ayrılabilir; sistem brüt, fire ve net değerleri ayrı ayrı kaydeder. Hurda kırıcıya girebildiği gibi doğrudan üretime de sokulabilir. Ayrıntılar `docs/02` Bölüm 4'te verilmiştir.

### 4.3 Üretim

Ocak tanımları (kapasite, tip, döner ocak), alaşım reçeteleri (ocak + alaşım + tonaj bazlı matematik), reçete adımları (örneğin 2. saatte karıştırma, ileri saatte Mg/Si ekleme), önerilen/gerçekleşen miktar farkı ve anlık stok düşümü. Dökümde döküm kodu, sayaç, metrajdan tonaj hesabı, fire biyet, yolluk/filtre artığı ve sarf tüketimi. Testerede kafa kesimi, 3 mm bıçak kalınlığına göre talaş, fire biyet, süre takibi ve yağ tüketimi. Homojenizasyon ve soğutmada reçete süreleri, duraklatma ve süre aşımı uyarıları. Paketlemede mamul stoka geçiş. Ayrıntılar `docs/01` Bölüm 3–7'de verilmiştir.

### 4.4 Mamul Stok & Sevkiyat

Döküm kodu + alaşım + çap + boy + adet ile mamul stok. Çıkışta biyet seçimi, kantar fişi, yönetici onayı, muhasebe/fatura onayı (müşteri, plaka, fatura no) ve arşiv. Onaysız kayıt "onay bekliyor" durumunda kalır ve stoktan düşmez. Yan ürün, hammadde veya sarf satışı da aynı akışı kullanır. Ayrıntılar `docs/01` Bölüm 8'de verilmiştir.

### 4.5 İstatistik & Raporlama

Günlük / haftalık / aylık / yıllık üretim, alaşım ve ocak bazlı verim, hammadde / gaz / sarf / enerji tüketimi, fire oranları, giren-çıkan karşılaştırması, proses süre sapmaları; PDF ve Excel çıktıları; zamanlanmış dönemsel rapor mailleri.

### 4.6 Bildirim & Entegrasyon

Kritik stok, zamanlama, süre aşımı, fire oranı ve onay bekleyen işlemler için sistem içi bildirim. Dışa dönük kanallar (SMS sağlayıcı, SMTP, PLC telemetrisi) doğrudan çağrılmaz; önce `outbox` kuyruğuna yazılır. İnternet yokken üretim etkilenmez, bağlantı geldiğinde kuyruk işlenir. Ayrıntılar `docs/04` içindedir.

### 4.7 Sistem Yönetimi

Kullanıcı ve rol yönetimi, görev ayrılığı, temel tanımlar (birim, kategori, ocak, eşik, vardiya), denetim logu, otomatik yedekleme, JSON içe/dışa aktarma, bağlantı durumu ve sunucu adresi ayarları.

### 4.8 Satış & Müşteri

Müşteri kartında vergi numarası, ödeme vadesi, kredi limiti, güncel bakiye ve risk tutulur. Satış teklifinden sipariş doğar; sipariş onayında kredi kontrolü yapılır ve uygun döküm kodu rezerve edilir. Sevkiyat iki onaydan geçtikten sonra fatura, muhasebe fişi, cari bakiye, maliyet yansıması ve olay satırı aynı işlemde yazılır. Ayrıntılar `docs/11` Bölüm 3 ve 4'tedir.

### 4.9 Muhasebe & Finans

On iki hesaplı örnek hesap planı, alış ve satış faturaları, parametrik KDV, çift taraflı borç/alacak fişleri, mizan, tahsilat/ödeme kayıtları ve dönem kapanışı. Her fişte borç alacağa eşittir; dengesiz fiş yazılmaz, aynı `clientId` ile çift kayıt oluşmaz, düzeltme ters fişle yapılır.

### 4.10 Maliyet & Bütçe

Maliyet nesnesi döküm kodudur. Hammadde, enerji, sarf, işçilik ve fire ayrı kalemlerde toplanır; net tona bölünerek birim maliyet üretilir ve satış geliriyle karşılaştırılıp brüt kâr hesaplanır. Dönemsel bütçe kalemlerinde planlanan ve gerçekleşen birlikte izlenir.

### 4.11 Depo & Personel

Beş depo lokasyonu, sipariş rezervasyonları ve fiziki sayım kayıtları tutulur. Sayım farkı onaylandığında stok düzeltme hareketi, düzeltme fişi ve denetim izi birlikte yazılır. Personel kartı kullanıcı hesabına ve vardiyaya bağlanır; olay günlüğündeki aktör bu yapıya dayanır. Maaş ve bordro hesabı harici serviste kalır.

---

## 5. Teknik Mimari

> Sohbetteki genel plan bir web stack önermişti (Next.js + Node + PostgreSQL + Docker + Nginx). Bu öneri **doğru yöndedir**; aşağıda kapalı çevrim ve yedekleme gereksinimleriyle tamamlanmıştır. Ayrıntılı gerekçe ve karar tablosu `docs/04` içindedir.

| Katman | Öneri | Not |
| --- | --- | --- |
| İstemci | Tarayıcıda çalışan PWA (HTML + CSS + JS) | PC ve tablette aynı kod; kısayol ikonu; dokunmatik; sürükle-bırak |
| Uygulama kabuğu | Service worker + IndexedDB/localStorage | Sunucuya erişim kesilse de arayüz açılır, girişler yerel kuyruğa alınır |
| Sunucu | Firma içi sunucu / NAS üzerinde `ERP/` klasörü | `https://erp.firma.local`, Nginx/Caddy reverse proxy, iç DNS |
| API | Node.js (Express/Fastify) veya Python FastAPI | RESTful + JWT + rol bazlı yetki + denetim logu |
| Ana veri | PostgreSQL (çok kullanıcılı) veya SQLite (tek sunucu) | İşlemsel bütünlük, eşzamanlı yazma, sorgu |
| Arşiv / aktarım | JSON dosyaları (`server/erp/data/`) | Gece snapshot, dışa aktarma, AI'a verilecek girdi |
| Dosyalar | Kantar fişi, sertifika, rapor PDF'leri | Sunucu diskinde klasör + erişim kontrolü |
| Dış servisler | SMS gateway, SMTP, PLC/OPC UA | Yalnızca outbox worker üzerinden, internet olduğunda |
| Yedekleme | Zamanlanmış snapshot + harici disk + 3-2-1 | `server/erp/scripts/backup.py` |
| Uzak erişim | WireGuard / Tailscale VPN + MFA | Port forwarding yerine, salt-okunur geliştirici hesabı |
| Gerçek zamanlı | WebSocket / SSE | Uyarılar, sayaçlar, onay bildirimleri |

Bu depodaki `app/` klasörü, yukarıdaki istemci katmanının **bağımlılıksız, çalışan prototipidir**; `server/erp/` klasörü ise sunucu tarafı veri ve script düzeninin somut modelidir.

---

## 6. Kullanıcı Arayüzü Tasarımı

### 6.1 Tasarım İlkeleri

Sohbetteki ifadeyle "Windows 98 değil, yeni nesil bir arayüz": profesyonel web sitesi kalitesinde tipografi, yumuşak gölgeler, belirgin hiyerarşi, dengeli boşluklar, anlamlı renk kullanımı ve tutarlı bir bileşen sistemi. Koyu lacivert yan menü, açık çalışma yüzeyi, indigo/cyan vurgu, durum renkleri (yeşil/sarı/kırmızı/mavi) ve KPI kartları.

### 6.2 Kabuk

Sol sabit menü (gruplu), üst bilgi çubuğu (sayfa başlığı, genel arama, çevrimiçi/çevrimdışı göstergesi, bildirim zili, kullanıcı), içerik alanı (kartlar + tablolar + grafikler). Tablet ve telefonda menü çekmeceye dönüşür; dokunma hedefleri büyütülür; tablolar yatay kaydırmalı ya da karta dönüşür.

### 6.3 Etkileşim

Sürükle-bırak üretim akışı (Pointer Events ile fare + dokunmatik), modal formlar, anlık arama ve filtreler, sekmeler, toast bildirimleri, durum rozetleri, satır detay çekmeceleri, CSV/PDF çıktı, açık/koyu tema. Tüm grafikler harici kütüphane olmadan SVG ile çizilir; böylece internetsiz ortamda boş grafik kalmaz.

### 6.4 Önemli Ekranlar

Panel (KPI'lar, üretim eğrisi, kritik stoklar, son hareketler), Stok Durumu (renk kodlu), Mal Kabul, Kırıcı & Fire, Fiyat Takibi (çizgi grafik), Üretim Akışı (sürükle-bırak kapan/kanban), Reçeteler, Sevkiyat & Onaylar, Raporlar, Bildirim Kuyruğu, Ayarlar.

Prototipte bu ekranların tamamı çalışır durumdadır.

---

## 7. Geliştirme Planı (Fazlar)

| Faz | Süre | Kapsam |
| --- | --- | --- |
| Faz 0 — Plan & Prototip | 1 hafta | Bu dokümanlar, UI prototipi, veri modeli, Word çıktısı |
| Faz 1 — Temel & Satın Alma / Stok | 8 hafta | `docs/02` haftalık planı; altyapı, CRUD, emirler, mal kabul, kırıcı, stok |
| Faz 2 — Üretim | 8-10 hafta | Reçeteler, ergitme, döküm, testere, homojenizasyon, paketleme, sayaç ve alarmlar |
| Faz 3 — Sevkiyat & Raporlama | 6 hafta | İki kademeli onay, kantar, arşiv, istatistik, PDF/Excel, dönemsel rapor mailleri |
| Faz 4 — Entegrasyon & Dayanıklılık | 4-6 hafta | PLC/OPC UA, SMS ve SMTP outbox worker, yedekleme/restore testi, VPN, denetim logu |
| Faz 5 — İyileştirme | Sürekli | Performans, kullanıcı geri bildirimi, QR/barkod, gelişmiş analitik |

Her faz sonunda dokümanlar güncellenir; kapsam kaymasını önlemek için yeni istekler faz listesine yazılarak sıraya alınır.

---

## 8. Proje Klasör Yapısı

Bu deponun gerçek düzeni planlanan yapıyı yansıtır:

Depo kökünde `README.md` genel bakışı ve çalıştırma adımlarını verir. `docs/` klasörü plan, rapor, mimari kararları ve tek Word çıktısını taşır. `app/` çalışan PWA prototipidir: giriş dosyaları `index.html`, `manifest.webmanifest` ve `sw.js`; tasarım sistemi `css/style.css`; JavaScript modülleri `js/` altında `seed`, `store`, `calc`, `posting`, `icons`, `ui`, `views` ve `app` olarak ayrılır; simgeler `assets/` içindedir. `posting.js` muhasebeleştirme, maliyet ve entegrasyon hesaplarını taşır.

`server/erp/` firma sunucusundaki `ERP` klasörünün modelidir. `data/` altında elli üç JSON dosyası ve `manifest.json` bulunur; bunların elli ikisi koleksiyon dizisidir, biri `settings.json` nesnesidir. `scripts/` altında `backup.py`, `outbox_worker.py`, `validate_data.py`, `event_worker.py` ve `plc_poller.py` çalışır. `inbox/` arayüzden gelen olay kuyruğunu, `archive/` döküm kodu bazlı kalıcı olay günlüğünü tutar. `backups/` ve `logs/` çalışma zamanında oluşur. `tools/` altında `build_docx.py`, `export_seed.mjs`, `make_icons.py` ve `smoke_test.mjs` bulunur.

| Klasör | İçerik |
| --- | --- |
| `docs/` | `00`–`11` Markdown dokümanlar + `Dokumhane-ERP-Plan.docx` |
| `app/` | PWA: kabuk, 34 ekran, `calc.js` + `posting.js` + `modularity.js` + `adapters.js`, tasarım sistemi, ikonlar |
| `server/erp/data/` | 59 JSON dosyası (58 koleksiyon + `manifest.json`), `README.md` |
| `server/erp/scripts/` | Yedekleme, giden kutu, 52 koleksiyonu doğrulama, olay işçisi, PLC denetçisi |
| `server/erp/inbox/` | Olay kuyruğu ve örnek kayıtlar |
| `server/erp/archive/` | Append-only olay günlüğü ve örnek `events.jsonl` |
| `tools/` | Word üretici, seed aktarımı, ikon üretici, duman testi |

Gerçek üretim kurulumunda `app/` bir API'ye bağlanır, `server/erp/data/` JSON snapshot'ları arşiv olarak kalır; istemci tarafındaki geçici `localStorage` yerini sunucu veritabanı ve IndexedDB senkronizasyonuna bırakır.

---

## 9. Önceliklendirme

**Olmazsa olmaz:** Değişken malzeme kartları, satın alma emri ve fiyat geçmişi, mal kabul, kırıcı/fire, stok hareketleri ve renk kodlu stok, döküm kodu ile izlenebilirlik, reçeteler ve otomatik stok düşümü, iki kademeli sevkiyat onayı, rol/yetki, yedekleme, çevrimdışı çalışma.

**Olmalı:** Fiyat grafikleri ve tedarikçi karşılaştırması, süre sayaçları ve uyarılar, yan ürün döngüsü, giren-çıkan raporu, PDF/Excel çıktısı, SMS/e-posta kuyruğu, PLC telemetrisi.

**Sonraya:** QR/barkod, LME canlı fiyat, e-fatura, gelişmiş planlama (GANTT), tahmine dayalı analitik, native mobil uygulama.

---

## 10. Riskler ve Çözüm Önerileri

| Risk | Derece | Çözüm |
| --- | --- | --- |
| Kapsam kayması | Yüksek | Faz bazlı geliştirme; her yeni istek dokümana yazılıp sıraya alınır |
| Kullanıcı adaptasyonu | Yüksek | Sade ve tutarlı UI, büyük dokunma hedefleri, saha eğitimi, aşamalı geçiş |
| İnternet kesintisinde dış servislerin başarısız olması | Yüksek | Outbox kuyruğu; üretim hiçbir zaman dış servise bağımlı değil |
| Sunucu arızasında veri kaybı | Yüksek | İşlemsel DB + günlük JSON snapshot + harici disk + restore testi |
| Eşzamanlı stok yazımlarında tutarsızlık | Orta | Tek kaynak: hareket tablosu; bakiye türetilir; transaction ve kilit |
| Operatörün önerilen/gerçekleşen miktarı girmemesi | Orta | Onay zorunluluğu, uyarı ve denetim logu |
| Yan ürün döngüsünün verim hesabını bozması | Orta | Yolluk/filtre artığı ayrı kod ve ayrı stok; giren-çıkan raporunda ayrı satır |
| Uzak erişimde güvenlik açığı | Yüksek | VPN + MFA + rol bazlı yetki + denetim logu; doğrudan IP/port açılmaz |
| Sektörel bilgi eksikliği | Orta | Bu dokümanların sahada doğrulanması, operatörlerle gözden geçirme |

---

## 11. Genel Plandaki Sektörel Sapmaların Düzeltilmesi

Sohbette üretilen ilk "Döküm Hane ERP Sistemi - Planlama Dokümanı" genel bir dökümhane (kum/kokil döküm, pik demir) varsaymıştır. Sonraki mesajlarda tesisin **alüminyum biyet dökümhanesi** olduğu netleşmiştir. Ana plan bu sapmaları aşağıdaki gibi düzeltir:

| Genel planda geçen | Bu tesisteki karşılığı / karar |
| --- | --- |
| Kum döküm, kokil, basınçlı döküm, hassas döküm türleri | Sürekli döküm (biyet) hattı; tür karşılaştırma tablosu kaldırıldı |
| Model / kalıp / maça kutusu yönetimi, kalıp ömrü | Bu hatta yok; yerine ocak tanımları, çap/boy/metraj ve döküm kodu |
| Pik demir, FeSi, FeMn, küreselleştirici, karbürizan | Külçe, hurda, silisyum, magnezyum, altibor, bakır, çinko |
| Kalıp bozma, kumlama, taşlama, CNC, boyama | Testere kesimi, kafa, talaş, homojenizasyon, soğutma, paketleme |
| Kum testleri, NDT, mekanik test modülü | İlk sürümde kapsam dışı; ileride spektrometre/alaşım analizi olarak eklenebilir |
| Teklif → Sipariş → İş Emri akışı | Korunur ama ana akış **Satın Alma → Üretim → Sevkiyat**'tır; iş emri yerine döküm kodu |
| Mamul "parça" tanımı | Mamul "biyet grubu": döküm kodu, alaşım, çap, boy, adet, tonaj |
| LME entegrasyonu "nice to have" | Korunur; ancak fiyat geçmişi elle girilen alış fiyatlarından üretilir |
| Mobil uygulama ilk fazda yok | PWA ile tablet desteği **ilk fazda** var (kullanıcının şartı) |
| Bulut/VPS varsayımı | On-premise zorunlu; bulut yalnızca opsiyonel yedek/uzaktan erişim |

Ayrıca genel planda bulunmayıp sohbette sonradan eklenen ve bu plana dahil edilen başlıklar: **değişken malzeme/kart yapısı**, **hurda → kırıcı veya doğrudan üretim**, **ocak + alaşım + tonaj reçete matematiği**, **zamanlı şarj uyarıları**, **önerilen/gerçekleşen miktar farkı**, **döküm sonrası kalan metalin üç akıbeti**, **döner ocak/cüruf geri kazanımı**, **yolluk-filtre döngüsel firesi**, **talaş ve kafa hesabı**, **süre aşımı alarmları**, **iki kademeli sevkiyat onayı**, **kapalı çevrim / outbox / yedekleme / VPN erişimi**.

---

## 12. Saha Görüşmesiyle Gelen Kapsam Genişlemesi

İlk sohbetten sonra mühendisle yapılan saha görüşmesi (`docs/06`) sistemi tek fabrikaya yazılmış bir ERP olmaktan çıkarıp **çok fabrikalı, modüler, olay tabanlı bir endüstriyel ürün** hâline getirmiştir. Ana plana eklenen başlıklar aşağıdadır.

| Yeni başlık | Plana etkisi | Ayrıntı |
| --- | --- | --- |
| Kütle dengesi zinciri | Üretim modülü | 21 ton başlangıç, 3 ton aktarım, 1 ton yolluk, 17 ton döküm, 14 ton net biyet; her adım ayrı olay |
| Döküm yolu tutma miktarı | Makine modülü | Aynı metal kısa yolda 1 ton, uzun yolda 1,5 veya 2 ton tutar; hat parametresi |
| Kesim hesap motoru | Üretim modülü | 6300 / 6000 / 300 / 3 mm, Ø178, yoğunluk ile kafa, talaş ve net ürün ayrımı |
| Yan ürün akıbeti | Stok modülü | Kafa `remelt`, talaş `sale`, yolluk `recycle`, kırıcı firesi `waste` |
| Parametrik bakım | Bildirim modülü | Yağ tankı kesim eşiği, bıçak ömrü, bakım kaydı ve uyarı |
| Karışık homojenizasyon partisi | Üretim modülü | Tek partiye birden fazla döküm kodundan adet satırları; 8 saat planlanan, 9 saat gerçekleşen |
| Modüler makine parkı | Sistem modülü | İlk açılışta boş; makine tipleri ve kapasiteler fabrika profiline göre |
| İki çalışma modu | Sistem modülü | `MANUAL` operatör girişi, `PLC` otomatik okuma; iş mantığı aynı |
| Dört PLC sinyali | Entegrasyon modülü | Kapı, döküm modu/devrilme, alarm, çalışma; gereksiz veri okunmaz |
| Merkezi yönetim ekranı | Yeni arayüz | Firma, PLC IP, protokol, tag eşleştirme, uzaktan güncelleme; **geliştirici ekip içindir** |
| Olay tabanlı arşiv | Veri katmanı | `inbox` kuyruğu, `archive/YYYY/MM/DK-.../events.jsonl`, silme yerine doğrula ve arşivle |
| Mini PC ile kurulum | Uygulama sırası | Önce merkezi yönetim, sonra modüller, en son gerçek PLC |

En önemli düzeltme şudur: modüler yapı **fabrika operatörüne değil, yazılımı geliştiren ekibe** hizmet eder. Yeni makine veya fabrikaya özel kural gerektiğinde yapılandırmayı geliştirici ekip uzaktan uygular; operatör ekranı sade kalır. Bu karar, bakım hizmeti ve 5 ilâ 10 yıllık ürün ömrü planının temelini oluşturur.

Güncel aşama sırası ve kurulum düzeni `docs/10` içinde verilmiştir; `docs/03` Bölüm 6'daki Faz 0–5 sırası korunmakla birlikte bu yeni sırayla eşleştirilmiştir.

---

## 13. Genel ERP Karşılaştırmasıyla Gelen Ticari ve Finansal Katman

İlk iki sohbetten sonra gelen genel ERP anlatımı (`docs/11`), sistemin departmanlar arası otomatik veri akışı ilkesini üretim tarafından finans tarafına taşımıştır. Kaynak metin bir elektrik taahhüt firmasının otel projesini örnek alır; bu projede maliyet nesnesi bir inşaat projesi değil, döküm kodudur. AutoCAD, BIM, bordro ve kampanya yönetimi kapsam dışında bırakılmıştır.

| Eklenen kavram | Plana etkisi | Ayrıntı |
| --- | --- | --- |
| Müşteri kartı ve cari hesap | Yeni modül | Kredi limiti, bakiye, vade, risk, tahsilat |
| Satış teklifi ve sipariş | Yeni modül | Rezervasyon, kısmi sevk, kredi onayı |
| Talep, onay ve tedarikçi teklifi | Satın Alma genişletildi | Onay limiti, teklif karşılaştırması, emre dönüşüm |
| Hesap planı ve çift taraflı fiş | Yeni modül | Borç = alacak, mizan, ters fişle düzeltme |
| Fatura, ödeme, dönem kapanışı | Yeni modül | Parametrik KDV, vade, kapanış kontrolü |
| Döküm kodu maliyeti | Üretim güçlendirildi | Beş kalem, birim maliyet, brüt kâr |
| Depo, sayım, vardiya | Yeni modül | Lokasyon, denetim izi, operatör bağlantısı |
| Entegrasyon matrisi | Çapraz katman | Tek kayıttan sekiz koleksiyona yazım |

Bu katman Faz 1 ile Faz 2 sırasını bozmaz. Satın Alma ve Stok birinci faz, Üretim ikinci faz olarak korunur; ticari ve finansal kayıtlar bu iki fazın ortak veri modeli üzerine eklenir. Entegrasyon kuralı, onaylanmış bir sevkiyatın stok, fatura, fiş, cari, maliyet, olay, bildirim ve rapor kuyruğunu tek işlemde üretmesidir. Ayrıntılı boşluk analizi ve kapsam dışı kararlar `docs/11` içindedir.

---

## 14. Sonraki Adımlar

1. Bu dokümanların ve `docs/Dokumhane-ERP-Plan.docx` çıktısının onaylanması.
2. Prototip ekranlarının sahada operatörlerle gözden geçirilmesi; renk/akış geri bildirimleri.
3. `docs/04` içindeki mimari kararların (sunucu, DB, VPN, outbox) IT ekibiyle netleştirilmesi.
4. `docs/05` veri modelinin API sözleşmesine dönüştürülmesi ve Faz 1 geliştirmeye başlanması.
5. Her faz sonunda bu planın güncellenmesi.

> **Not:** Sohbetin sonunda belirtildiği gibi, tüm işlevleri tek bir Word dosyasına döküp yazılım altyapı şemasını oluşturmak için gereken girdi hazırdır: `docs/Dokumhane-ERP-Plan.docx`.
