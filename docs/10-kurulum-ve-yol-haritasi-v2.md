# 10 — Kurulum Düzeni ve Yol Haritası (Sürüm 2)

Bu doküman, saha görüşmesinin sonundaki isteğe cevap verir: "Sen yapın nasıl kuracağımızı bir bul bakayım... Biz bir mini PC, bu senin laptopun olur, sistemi kuracağız, çalıştıracağız. Ama bizim merkezi yönetimi önce yapmamız gerekiyor." Ayrıca düzenleme sitesinin önerdiği geliştirme sırası, yeni görüşmedeki bulgularla birlikte güncellenir.

Önceki `docs/03` içindeki Faz 0–5 sırası korunur; bu doküman onu **çok fabrikalı, modüler ve olay tabanlı** ürün yapısına göre yeniden sıralar. Şekil ve şema çizilmez.

---

## 1. İlk hedef: çalışan bir iskelet, tamamlanmış bir ürün değil

Abi konuşmanın sonunda bütün yazılımın hemen yazılmasını istemez. İstenen şey, sistemin nasıl kurulacağının ve nasıl çalıştırılacağının ortaya konması, ardından örnek verilerle denenmesidir. Buna göre ilk teslim:

1. Merkezi yönetim altyapısı.
2. Fabrika ve makine tanımlama sistemi.
3. JSON veri alışverişi mekanizması.
4. Üretim süreçlerinin temel modülleri.
5. Örnek verilerle uçtan uca test.
6. En sonda gerçek PLC bağlantıları.

**PLC en başta ele alınmaz.** Önce PLC'siz, operatör veri girişiyle çalışan sistem kurulur; üretim mantığı, kütle dengesi, kesim hesabı ve arşiv oturtulur. PLC haberleşmesi daha sonra ayrı bir modül olarak eklenir. Bu karar, görüşmedeki iki çalışma modu tarifiyle de uyumludur.

---

## 2. Merkezi bilgisayar (Mini PC / laptop)

| Katman | İlk kurulum (mini PC) | Olgun kurulum (sunucu) |
| --- | --- | --- |
| Donanım | Mini PC veya sıradan laptop, 8 GB RAM, 256 GB SSD | Rack/sunucu, RAID 1, UPS |
| İşletim sistemi | Windows 11 veya Linux | Linux sunucu + Windows istemciler |
| Uygulama sunucusu | Python `http.server` / hafif web sunucusu | Nginx + API servisi |
| Kalıcı kayıt | SQLite dosyası | PostgreSQL |
| Kuyruk ve arşiv | `ERP/inbox/`, `ERP/archive/` klasörleri | Aynı yapı + kuyruk servisi |
| Yedek | Harici USB disk | Harici disk + şifreli uzak kopya |
| Erişim | LAN, `http://{mini-pc-ip}:8080/app/` | `https://erp.firma.local`, VPN + MFA |
| İstemci | PC ve tablet tarayıcı, PWA kısayolu | Aynı |

İlk kurulumda **hiçbir `npm install`, Docker veya bulut hesabı gerekmez**. Depo kökünde `python3 -m http.server 8080 --bind 0.0.0.0` komutu yeterlidir. Mini PC'nin LAN IP'si girilerek tabletlerden ve PC'lerden erişilir; PWA olarak yüklendiğinde masaüstünde kısayol ikonu oluşur. Bu, ilk sohbetteki "server dosyalarında erp klasörü, LAN'da kısayol ikonu, kapalı çevrimde çalışsın" isteklerini korur.

İnternet yokken üretim LAN içinde devam eder. SMS, e-posta, raporlar ve uzak yedek `outbox` kuyruğuna yazılır; bağlantı geldiğinde `outbox_worker.py` gönderir. Ayrıntı `docs/04` Bölüm 3'tedir.

---

## 3. `ERP` klasör düzeni (güncellenmiş)

| Klasör | İçerik | Bu sürümde eklenen |
| --- | --- | --- |
| `app/` | Tarayıcı PWA'sı | 8 yeni ekran, `calc.js` hesap motoru |
| `api/` | Gerçek kurulumda API servisi | Yer tutucu |
| `data/` | Koleksiyon JSON'ları ve `manifest.json` | 14 yeni koleksiyon |
| `db/` | SQLite / PostgreSQL dosyası | Yer tutucu |
| `files/` | Kantar fişi, fatura, PDF | Yer tutucu |
| `inbox/` | Arayüzden gelen olay kuyruğu | **Yeni** |
| `archive/` | Döküm kodu bazlı olay günlüğü | **Yeni** |
| `scripts/` | Worker, yedek, doğrulama | `event_worker.py`, `plc_poller.py` |
| `backups/` | Snapshot ve sağlama toplamları | Arşiv de kapsama alındı |
| `logs/` | Çalışma günlükleri | `event_worker.log` |

`inbox/` ve `archive/` ayrımı, konuşmada "JSON'ları HTML'ler sadece okur, veri yazacaksa bir şeye yazacak" denilen kuralın dosya sistemindeki karşılığıdır. Ayrıntı `docs/09` içindedir.

---

## 4. Aşamalı geliştirme sırası

| Aşama | İş | Çıkış kriteri | Bu depodaki durumu |
| --- | --- | --- | --- |
| 0 | Merkezi yönetim iskeleti, fabrika profili, makine tipleri | Boş makine parkı açılıyor, fabrika eklenebiliyor | **Prototipte hazır** |
| 1 | Veri altyapısı: olay şeması, kuyruk, arşiv, doğrulama | Bir olay kuyruğa yazılıp arşive taşınıyor | **Prototipte hazır** (dosya tabanlı) |
| 2 | Makine tanımlama, döküm yolları, iki çalışma modu | Farklı iki fabrika profili aynı kodla çalışıyor | **Prototipte hazır** |
| 3 | Döküm ve kütle dengesi modülü | 21 / 18 / 17 / 14 ton zinciri olay satırlarıyla kapanıyor | **Prototipte hazır** |
| 4 | Billet ve testere hesap motoru | 6300 / 6000 / 300 / 3 mm, Ø178, yoğunluk ile kafa ve talaş ayrılıyor | **Prototipte hazır** |
| 5 | Yağ, bıçak ömrü ve bakım uyarıları | Parametrik eşik aşılınca bildirim ve olay üretiliyor | **Prototipte hazır** |
| 6 | Homojenizasyon, soğutma, sevkiyat zinciri | Karışık parti, 8/9 saat sapması, izlenebilirlik | **Prototipte hazır** |
| 7 | Raporlar, giden kutu, yedekleme, izlenebilirlik sorguları | Günlük/haftalık/aylık çıktı, arşivden geri oynatma | Kısmen hazır (raporlar var) |
| 8 | Gerçek API + veritabanı + RBAC | Çok kullanıcılı, eşzamanlı, yetkili kurulum | **Yapılacak** |
| 9 | PLC haberleşme modülü | OPC UA / Modbus ile dört sinyal canlı okunuyor | **Yapılacak** (demo simülasyonu var) |
| 10 | Uzaktan güncelleme ve bakım hizmeti | İmzalı paket, sürüm geçmişi, geri alma | **Prototipte kayıt düzeyinde** |

Aşama 0 ile 6 arası, abinin "önce merkezi yönetimi yapmamız gerekiyor" cümlesinin somut karşılığıdır. Aşama 8'den sonrası gerçek saha kurulumunda, VPN + MFA + rol bazlı yetki ile birlikte yapılır.

---

## 5. Her aşamada uygulanacak doğrulama

1. `node tools/smoke_test.mjs` ile bütün ekranlar render edilir, menü ve veri bütünlüğü kontrol edilir.
2. `python3 server/erp/scripts/validate_data.py` ile koleksiyon referansları, kütle dengesi ve yeni makine/olay şemaları doğrulanır.
3. `python3 server/erp/scripts/event_worker.py --dry-run` ile kuyruk işleme simüle edilir.
4. `python3 server/erp/scripts/backup.py` ile yedek alınır, sağlama toplamları doğrulanır.
5. `python3 tools/build_docx.py` ile bütün dokümanlar tek Word dosyasına derlenir.
6. Örnek veriyle uçtan uca senaryo: DK kodu aç, aktarım ve yolluk olaylarını gir, kesim hesabını çalıştır, karışık homojenizasyon partisi başlat, süre aşımı üret, soğutma ve iki onaylı sevkiyatı tamamla, olay zincirini arşivden oku.

Bu sıra, konuşmadaki "çalıştıracağız sistemi, deneyeceğiz" isteğinin test edilebilir hâle getirilmiş biçimidir.

---

## 6. Riskler ve alınan önlemler

| Risk | Önlem | Doküman |
| --- | --- | --- |
| Elektrik kesintisinde kuyruk kaydının silinmesi | Arşive yazıp doğrulamadan silme yok, dead-letter ve retry | `docs/09` |
| Fabrikaya özel kuralların çekirdeği bozması | Parametre ve fabrika profili, kural motoru ayrı | `docs/08` |
| Operatör ekranının PLC verisiyle kalabalıklaşması | Dört sinyal kuralı, merkezi ekranda tag adresleri | `docs/08` |
| Kütle dengesinin tek kalemde kapatılması | Kafa, talaş, fire biyet ayrı olaylar; `balanceGap` uyarısı | `docs/07` |
| Adet ile tonajın geometrik olarak uyuşmaması | `GEOMETRY_MISMATCH` kontrolü | `docs/07` |
| 5–10 yıl sonra yeni fırın eklenememesi | Modüler tipler, sürüm geçmişi, uzaktan güncelleme | `docs/08` |
| Ses kaydındaki belirsiz terimlerin koda girmesi | Parametre/serbest metin, doğrulama listesi | `docs/06` |
| Tek fabrikaya özel sabit kod | `plantId` üzerinden çok fabrikalı profil | `docs/08` |

---

## 7. Bir sonraki görüşmede netleştirilecekler

`docs/06` Bölüm 5'teki sekiz soru, aşama 8'e geçmeden önce mühendisle birlikte kapatılmalıdır. Özellikle 17 tondan 14 tona düşüşün üç kaleme dağılımı, 300 mm kafa payının tek/çift uç olması, bıçak payının döküm boyuna dâhil olup olmadığı ve yolluk tutma miktarının çarpan mı sabit tonaj mı olduğu, hesap motorunun varsayılanlarını doğrudan etkiler. `Stone`, `PIS`, `GNSL` ve `Barsa piyazesi` ifadeleri kesinleşene kadar kodda sabit değer olarak yer almaz.

Bu dokümanlar tamamlandığında `docs/Dokumhane-ERP-Plan.docx` dosyası yeniden üretilir; sohbetin en baştaki hedefi olan "tüm işlevleri bir Word'e döküp yapay zekâya atıp genel yazılım altyapı şemasını oluşturmak" adımı, artık hem ilk sohbeti hem de bu saha görüşmesini kapsayan tek girdiyle yapılabilir.
