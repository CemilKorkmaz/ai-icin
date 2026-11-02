# 02 — Faz 1 Detaylı Plan: Satın Alma & Hammadde / Stok

**Amaç:** Üretim modülüne geçmeden önce, sohbette tarif edilen başlangıç işlerini (satın alma, mal kabul, kırıcı/fire, stok) ekran ekran, alan alan ve tablo tablo planlamak.
**Kaynak:** `docs/00` Mesaj 2 ve Mesaj 3; temiz süreç anlatımı `docs/01`.
**Kapsam dışı:** Ergitme, döküm, testere, homojenizasyon, paketleme, sevkiyat (Faz 2 — `docs/01` ve `docs/03`).

---

## 1. Genel Bakış

| Başlık | Değer |
| --- | --- |
| Fabrika türü | Alüminyum dökümhane (sürekli döküm / biyet) |
| Faz 1 kapsamı | Satın Alma → Mal Kabul → Kırıcı & Fire → Hammadde/Stok |
| Yaklaşım | Aşamalı geliştirme; önce veri girişi ve stok bütünlüğü, sonra üretim |
| Kritik ilke | Tüm malzeme, kategori, birim ve eşikler **değişken** (kullanıcı tanımlı) |
| Entegrasyon noktası | Üretim modülü malzemeyi bu stoklardan otomatik düşer |

Faz 1'in iş akışı özetle şöyledir: satın alma personeli malzeme kartını tanımlar ve güncel fiyatla emir oluşturur; mal geldiğinde stok sorumlusu mal kabul kaydı açar; hurda ise kırıcı operatörü brüt/fire/net kaydını girer; sistem stok bakiyelerini ve hareket loglarını güncelleyerek anlık stok ekranını besler.

---

## 2. Sayfa Yapısı Önerisi: Tek Sayfa mı, Ayrı Sayfalar mı?

**Öneri: Ayrı sayfalar, ortak bir menü grubu altında.**

Gerekçeler:

1. **Farklı kullanıcılar, farklı işler.** Satın alma personeli fiyat ve emir girer; stok sorumlusu tonaj ve kabul girer; kırıcı operatörü yalnızca fire kaydı girer. Tek sayfada üç rolün alanları birbirine karışır.
2. **Farklı veri yoğunluğu.** Fiyat grafiği, emir kalemleri ve stok tablosu aynı ekranda kullanılabilirliği düşürür; özellikle tablette.
3. **Yetkilendirme kolaylığı.** Sayfa bazında rol kısıtı koymak, tek devasa ekranda alan bazında kısıt koymaktan daha güvenlidir.
4. **Yine de bütünlük korunur.** Tüm sayfalar aynı `SATIN ALMA & STOK` menü grubundadır; mal kabul ekranı emirden, stok detayı hareketlerden, kritik stok ekranı satın alma ekranına tek tıkla geçiş verir. Ortak üst bilgi çubuğunda (firma, tarih, bağlantı durumu, bildirimler) her sayfa aynı kabuğu kullanır.

Tek ekranda tutulacak tek şey **özet paneldir (Dashboard)**: kritik stok sayısı, bugünkü giriş/çıkış, bekleyen emirler ve son hareketler.

### 2.1 Menü Yapısı

| Grup | Sayfalar |
| --- | --- |
| Genel | Panel (özet) |
| Satın Alma | Malzeme Tanımları · Satın Alma Emirleri · Fiyat Takibi & Grafikler · Tedarikçiler |
| Hammadde & Stok | Stok Durumu · Mal Kabul · Kırıcı & Fire İşlemleri · Stok Hareketleri · Kritik Stok Uyarıları |
| Üretim (Faz 2) | Ergitme · Döküm · Testere · Homojenizasyon · Paketleme · Mamul Stok · Sevkiyat |
| Raporlama | İstatistik & Raporlar |
| Sistem | Kullanıcılar & Roller · Birimler & Kategoriler · Eşikler · Bildirim Kuyruğu · Yedekleme |

---

## 3. Modül Detayları — Satın Alma

### 3.1 Malzeme Tanımları

Katalog ekranı: arama, kategori filtresi, aktif/pasif filtresi, kod, ad, kategori, birim, son fiyat, mevcut stok ve işlem düğmeleri. Kategori ağacı kullanıcı tarafından düzenlenebilir.

Öntanımlı kategori ağacı:

| Kategori | Örnek malzemeler |
| --- | --- |
| Hammadde | Alüminyum külçe, alüminyum hurda (profil / levha / talaş), silisyum, magnezyum, bakır, çinko, altibor |
| Sarf Malzeme | Seramik filtre, tıkaç, besleyici, kalıp ayırıcı |
| Yardımcı Malzeme | Testere yağı, kesici uç, refrakter, flux, argon, azot |
| Yan Ürün | Cüruf, talaş, kafa kesimi, yolluk/filtre artığı, fire biyet |

Malzeme kartı alanları:

| Alan | Açıklama |
| --- | --- |
| Kod | Otomatik veya manuel, benzersiz |
| Ad | Kullanıcı tarafından serbestçe değiştirilebilir |
| Kategori / Alt kategori | Kullanıcı tanımlı ağaçtan seçilir |
| Birim | kg, ton, adet, litre, metre, paket (tanımlar genişletilebilir) |
| Varsayılan tedarikçi | İsteğe bağlı |
| Kritik alt / üst sınır | Renk kodlaması ve uyarı üretimi için |
| Son alış fiyatı | Her emirde otomatik güncellenir, elle de düzeltilebilir |
| Açıklama, Aktif/Pasif | Serbest metin ve durum |

> **Kritik not:** Sohbette özellikle vurgulandığı gibi külçe, silisyum, magnezyum, altibor ve hurda "sistemde sabit kayıtlı ürünler" değildir. Hepsi kart olarak sonradan oluşturulur; reçeteler bu kartlara referans verir. Bir kartın adı değişirse geçmiş kayıtlar kod üzerinden bağlı kalmaya devam eder.

### 3.2 Satın Alma Emirleri

Liste ekranı tarih, tedarikçi ve durum filtreleriyle çalışır. Sütunlar: emir no, tarih, tedarikçi, kalem sayısı, toplam tutar, durum, işlemler.

Emir oluşturma ekranı alanları: emir no (otomatik), tarih, tedarikçi, ödeme vadesi, not; kalem satırlarında malzeme, miktar, birim, **o anki birim fiyat**, satır toplamı ve alınan miktar. Kalem ekleme/çıkarma dinamiktir. Kayıt anında her kalem için `price_history` satırı yazılır.

Durum akışı: `Taslak → Onay Bekliyor → Onaylandı → Yolda → Mal Kabulde → Kısmen Tamamlandı → Tamamlandı` (herhangi bir aşamada `İptal`).

### 3.3 Fiyat Takibi & Grafikler

Malzeme seçici, tarih aralığı, tedarikçi filtresi ve görünüm (günlük / haftalık / aylık / yıllık) bulunur. Çizgi grafik; altında ortalama, minimum, maksimum, son alış ve önceki döneme göre yüzdesel değişim kartları; en altta fiyat geçmişi tablosu (tarih, tedarikçi, miktar, birim fiyat, değişim, emir no). Aynı malzemenin farklı tedarikçilerdeki fiyatları ayrı serilerle karşılaştırılabilir.

### 3.4 Tedarikçiler

Kod, firma adı, kategori, iletişim kişisi, telefon, e-posta, vergi no, adres, son alış tarihi ve aktiflik. Tedarikçi detayında geçmiş alışlar ve malzeme bazlı fiyat karşılaştırması gösterilir.

---

## 4. Modül Detayları — Hammadde & Stok

### 4.1 Stok Durumu (Ana Ekran)

Üstte dört özet kartı: toplam malzeme, kritik malzeme, bugünkü giriş, bugünkü çıkış. Altında kategori başlıklarına ayrılmış tablo: kod, malzeme, mevcut stok, kritik alt/üst, durum, son hareket. Arama ve durum filtresi vardır.

Renk kodlaması:

| Durum | Koşul | Anlam |
| --- | --- | --- |
| Yeşil | Alt sınırın üzerinde, üst sınırın altında | Normal |
| Sarı | Alt sınırın %20 üzerindeki banda yaklaşmış | Uyarı |
| Kırmızı | Alt sınırın altında | Kritik, acil sipariş |
| Mavi | Üst sınırın üzerinde | Aşırı stok |

Satıra tıklanınca açılan detay: mevcut stok, kritik sınırlar, son 5 hareket, son 30 günlük stok eğrisi, "Stok Hareketi Ekle" (yetkili) kısayolu. Prototipte bu ekran `Stok Durumu` sayfasında birebir uygulanmıştır.

### 4.2 Mal Kabul

Emir seçildiğinde kalemler sipariş miktarıyla doldurulur. Kullanıcı gelen miktar, kabul miktarı ve red/fire miktarı girer; sistem kabul + red = gelen doğrulamasını yapar. Tartı fişi no, plaka, teslim alan ve not zorunlu/isteğe bağlı alanlardır. Onayda stok yalnızca kabul miktarı kadar artar, hareket logu yazılır, emir durumu güncellenir. Kısmi kabul ve iade seçenekleri desteklenir.

Hurda için ek alan: **"Kırıcıya sevk edilecek mi?"** İşaretli ise kırıcı ekranında bekleyen kayıt oluşur; işaretli değilse malzeme doğrudan üretime hazır stokta kalır (Mesaj 3'teki düzeltme).

### 4.3 Kırıcı & Fire İşlemleri

Alanlar: tarih, işlem birimi (kırıcı, ayıklama, manyetik ayırıcı), malzeme, kaynak mal kabul kaydı, brüt giriş, fire miktarı, net çıkış (otomatik), fire oranı (otomatik), fire nedeni, firenin gittiği yer, operatör, not.

Sohbetteki örnek: 10 ton hurda gelir, kırıcıdan 700 kg fire ayrılır → net 9,3 ton stok, fire oranı %7,00. Prototipte 10,2 ton / 700 kg örneği kullanılmıştır; hesap motoru aynıdır. Fire oranı eşiği aşarsa yöneticiye bildirim oluşur.

### 4.4 Stok Hareketleri

Filtreler: tarih aralığı, işlem türü, malzeme, kaynak birim. Sütunlar: tarih, saat, tür, malzeme, miktar, kaynak, referans no, işlem sonrası bakiye, kullanıcı.

Türler: Giriş (mal kabul / üretim / iade), Çıkış (üretim tüketimi / sevkiyat), Fire, Transfer (depo/ocak arası), Düzeltme (yalnızca yetkili, neden zorunlu).

### 4.5 Kritik Stok Uyarıları

Acil (kırmızı) ve uyarı (sarı) listeleri; eksik miktar hesabı; "Otomatik Satın Alma Talebi Oluştur" düğmesi ilgili malzeme ve önerilen miktarla satın alma emri ekranını açar.

---

## 5. Veritabanı Yapısı (Faz 1)

| Tablo | Ana alanlar |
| --- | --- |
| `categories` | id, name, parent_id, type, is_active |
| `units` | id, name, symbol, factor_to_base |
| `materials` | id, code, name, category_id, unit_id, critical_min, critical_max, current_stock, last_purchase_price, default_supplier_id, description, is_active, created_at, updated_at |
| `suppliers` | id, code, name, contact_person, phone, email, address, tax_number, category, is_active |
| `purchase_orders` | id, order_no, date, supplier_id, total_amount, status, payment_term, notes, created_by, created_at |
| `purchase_order_items` | id, order_id, material_id, quantity, unit_id, unit_price, total_price, received_quantity, notes |
| `price_history` | id, material_id, supplier_id, purchase_date, unit_price, quantity, order_id |
| `stock_receipts` | id, receipt_no, date, order_id, supplier_id, vehicle_plate, weighbridge_no, received_by, notes, status, to_crusher |
| `stock_receipt_items` | id, receipt_id, material_id, ordered_qty, received_qty, accepted_qty, rejected_qty, notes |
| `crusher_operations` | id, date, material_id, source_receipt_id, unit, gross_weight, waste_weight, net_weight, waste_ratio, waste_reason, waste_destination, operator_id, notes |
| `stock_movements` | id, occurred_at, material_id, movement_type, quantity, remaining_stock, source_type, source_id, reference_no, user_id, notes |
| `warehouses` / `locations` | id, name, type, parent_id, is_active |
| `users` / `roles` | id, username, password_hash, full_name, role, department, is_active |
| `settings` | key, value, description, updated_at |
| `notifications` / `outbox` | Sistem bildirimleri ve internet bekleyen giden işler (`docs/04`) |

İlişkiler özetle: kategoriler malzemeleri gruplar; tedarikçiler emirleri; emirler kalemleri ve fiyat geçmişini; emirler mal kabul kayıtlarını; mal kabul kırıcı kayıtlarını; tüm bu kayıtlar `stock_movements` satırları üretir ve `materials.current_stock` güncellenir. Stok bakiyesi **asla** doğrudan elle yazılmaz; yalnızca hareket kayıtlarından türetilir (düzeltme dahil bir harekettir).

---

## 6. Kullanıcı Rolleri (Faz 1)

| Rol | Yetkiler |
| --- | --- |
| Admin | Tüm erişim, ayarlar, kullanıcı ve eşik yönetimi, düzeltme hareketi |
| Satın Alma Personeli | Malzeme kartları, emirler, fiyat takibi, tedarikçiler |
| Stok / Hammadde Sorumlusu | Stok durumu, mal kabul, hareketler, kritik stok |
| Kırıcı Operatörü | Yalnızca kırıcı/fire kaydı ve kendi biriminin geçmişi |
| Görüntüleyici (Müdür) | Salt-okunur panel, stok ve raporlar |
| Geliştirici | Salt-okunur, denetim logu erişimi, VPN ile sınırlı (`docs/04`) |

---

## 7. Uçtan Uca İş Akışı (Faz 1)

1. Satın alma personeli malzeme kartlarını tanımlar, güncel fiyatlarla satın alma emri oluşturur. Fiyat geçmişi otomatik yazar.
2. Mal fabrikaya gelir; stok sorumlusu ilgili emri seçip tartım sonucunu, kabul ve red miktarlarını girer. Stok kabul miktarı kadar artar.
3. Hurda kırıcıya sevk edildiyse operatör brüt, fire ve net değerlerini girer; fire yan ürün stokuna taşınır, fire oranı kontrol edilir.
4. Anlık stok ekranı güncel bakiyeleri renk kodlamasıyla gösterir; kritik seviyeye inen malzemeler için uyarı ve satın alma talebi üretilir.
5. Tüm giriş/çıkış/fire/transfer kayıtları kronolojik logda izlenebilir.
6. Faz 2'de ergitme ocağına malzeme sevk edildiğinde aynı hareket mekanizması üzerinden stok otomatik düşer; Faz 1'de yazılan hiçbir kod değişmez.

---

## 8. Geliştirme Sırası (8 Hafta)

| Hafta | Çıktı |
| --- | --- |
| 1 | Proje altyapısı, veritabanı tabloları, giriş & yetkilendirme, menü kabuğu |
| 2 | Kategori, birim, malzeme ve tedarikçi CRUD'ları |
| 3 | Satın alma emri, kalemler, durum akışı, fiyat geçmişi |
| 4 | Fiyat takibi grafiği, tedarikçi karşılaştırması, özet kartları |
| 5 | Mal kabul ekranı, tartı fişi, stok giriş entegrasyonu |
| 6 | Kırıcı & fire işlemleri, brüt/net/fire hesabı, eşik uyarısı |
| 7 | Stok durumu ekranı, renk kodlaması, kritik stok uyarıları, hareket logu |
| 8 | Panel, testler, kullanıcı geri bildirimi, Faz 2 için API sözleşmeleri |

---

## 9. Faz 2'ye Geçiş Notu

Faz 2'de ergitme, döküm, testere, homojenizasyon, paketleme, mamul stok ve sevkiyat modülleri eklenir. Bu modüller Faz 1'deki üç sözleşmeyi yeniden kullanır: malzeme kartı referansı (`material_id`), stok hareketi yazma (`stock_movements`) ve bildirim/outbox mekanizması. Üretim tarafının ayrıntılı işlevleri `docs/01` Bölüm 3–8'de, ekran karşılıkları `docs/05` içinde verilmiştir.

**Cevaplanan açık soru:** Başlangıç işleri için tek sayfa değil, **ayrı sayfalar + ortak özet paneli** önerilir. Prototipte bu yapı birebir uygulanmıştır.
