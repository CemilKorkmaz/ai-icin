# ai-icin — Alüminyum Dökümhane ERP

Bu depo, sohbette tarif edilen **alüminyum biyet dökümhanesi** için uçtan uca ERP planını, çalışan bir web prototipini ve firma sunucusundaki `ERP/` klasörünün dosya tabanlı modelini içerir. Genel dökümhane planı değil; sürekli döküm, ergitme, testere, homojenizasyon, soğutma, paketleme ve iki onaylı sevkiyat akışı esas alınır.

**Sürüm:** 1.2 · Modüler Saha Kurulumu · `schemaVersion: 4` · **34 ekran** · **59 varlık** · **13 doküman**

---

## 1. Depoda ne var?

| Yol | İçerik |
| --- | --- |
| `docs/00-ham-gereksinimler.md` | İlk sohbetteki kullanıcı mesajlarının ham metni (kaynak girdi) |
| `docs/01-uctan-uca-surec-raporu.md` | **Satın almadan sevkiyata kadar** şekilsiz/şemasız, yalnızca başlık + anlatım süreç raporu |
| `docs/02-faz1-plan.md` | Faz 1: Satın Alma + Hammadde/Stok detaylı planı, sayfa yapısı, roller, 8 haftalık sıra |
| `docs/03-ana-plan-dokumani.md` | Ana plan: 12 modül, teknik mimari, UI, fazlar, sektörel sapma düzeltmeleri, saha ve genel ERP genişlemesi |
| `docs/04-teknik-mimari-kararlar.md` | İlk sohbette **cevapsız kalan** mimari soruların cevabı; iki mod, dört PLC sinyali, olay arşivi, tek kayıt çok etki |
| `docs/05-veri-modeli-ve-ekranlar.md` | **59 varlık**, JSON şemaları, hesap kuralları, API uçları, **34 ekran** envanteri, ticari/finansal ve modüler kurulum şemaları |
| `docs/06-saha-gorusmesi-duzeltilmis-metin.md` | **Ses kaydının düzeltilmiş, anlaşılır teknik anlatımı**: terim düzeltmeleri, sitenin düzenlemesinin değerlendirilmesi, abiye sorulacak 8 soru |
| `docs/07-uretim-hesap-motoru.md` | 6300/6000/300/3 mm, Ø178, yoğunluk; kafa, talaş, yolluk, 21/18/17/14 ton kütle dengesi; yağ ve bıçak ömrü |
| `docs/08-moduler-makine-ve-merkezi-yonetim.md` | Boş makine parkı, fabrika profilleri, `MANUAL`/`PLC` modları, dört sinyal, tek makine kaynağı, güvenli çıkarma, sihirbaz ve modül kaydı |
| `docs/09-olay-tabanli-json-arsivleme.md` | Her aşamadan bir satır: olay şeması, `inbox`/`archive` ayrımı, silme yerine doğrulama, geri yükleme |
| `docs/10-kurulum-ve-yol-haritasi-v2.md` | Mini PC ile kurulum, aşama sırası, Sürüm 1.1 eki, riskler ve doğrulanacaklar |
| `docs/11-genel-erp-karsilastirma-ve-bosluk-analizi.md` | **Genel ERP metninin modül bazında karşılaştırması**, bulunan boşluklar, eklenenler ve kasten kapsam dışı bırakılanlar |
| `docs/12-saha-kurulum-ve-modul-yasam-dongusu.md` | **Gerçek fabrikaya kolay bağlanma**: profil paketi, 1 / 2 / 5 fırın, kurulum sihirbazı, makine ekleme-çıkarma, modül kaydı, adaptör sözleşmesi |
| `docs/Dokumhane-ERP-Plan.docx` | **13 dokümanın tamamını** birleştiren tek **Word** dosyası ("AI'a atılacak" çıktı) |
| `app/` | Çalışan PWA prototipi: bağımlılık yok, saf HTML/CSS/JS, **34 ekran**, `calc.js` + `posting.js` + `modularity.js` + `adapters.js` |
| `server/erp/` | Firma sunucusundaki `ERP/` klasörünün modeli: **59 JSON dosyası**, olay kuyruğu, arşiv, worker'lar |
| `tools/` | Word üretici, seed aktarımı, ikon üretici, duman testi |

---

## 2. Prototipi çalıştırma

Bağımlılık kurulumu gerekmez. Depo kökünde:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Tarayıcıdan `http://localhost:8080/app/` adresine girilir; kök `index.html` otomatik yönlendirir. Tablet ve PC aynı LAN'daki mini PC'nin IP'siyle erişir, PWA olarak yüklendiğinde masaüstünde kısayol ikonu oluşur. İnternet olmadan üretim devam eder; SMS, e-posta ve raporlar `outbox` kuyruğunda bekler.

Veriyi sıfırlamak için **Ayarlar → Demo Verisini Sıfırla**. Yerel depolama anahtarı şema sürümüne bağlıdır (`erp_demo_state_v4`), böylece eski sürümden kalan eksik veri ekranları bozmaz. Yeni bir fabrikayı koda dokunmadan tanımlamak için **Saha Kurulum Sihirbazı** (`#/setup`) kullanılır.

---

## 3. Sohbetten çıkan ana kararlar

1. **Alüminyum biyet dökümhanesi.** Kum döküm, kalıp/model, maça, pik demir, CNC ve NDT gibi genel dökümhane modülleri kapsam dışıdır.
2. **Faz sırası korunur.** Faz 1 Satın Alma + Hammadde/Stok, Faz 2 Üretim. Sonraki genişlemeler bu sırayı bozmaz.
3. **Değişken kart yapısı.** Malzeme, kategori, birim, fiyat, kritik eşik, reçete, makine tipi ve eşikler kullanıcı tanımlıdır; sabit ürün listesi yoktur.
4. **Hurda kırıcıya da girebilir, doğrudan üretime de.** Mal kabul brüt, fire ve net olarak ayrı kaydedilir.
5. **Modern, sade, dokunmatik arayüz.** Windows 98 görünümü ve PC-only WinForms reddedildi; sürükle-bırak, tablet, koyu tema, PWA kısayolu var.
6. **Operatör ekranı ile geliştirici merkezi yönetim ekranı ayrı.** Modüler makine parkı fabrika operatörü için değil, yazılımı geliştiren ekip içindir.
7. **İlk açılışta hiçbir makine tanımlı değildir.** Makine tipleri, kapasiteler, döküm yolları ve 1 / 1,5 / 2 ton tutma miktarları fabrikaya göre eklenir.
8. **İki mod, dört sinyal.** `MANUAL` ve `PLC`; başlangıçta yalnızca kapı, döküm modu/devrilme, alarm ve çalışma okunur.
9. **Kütle dengesi ve kesim hesabı.** 21 / 18 / 17 / 14 ton zinciri, 6300/6000/300/3 mm, Ø178 ve 2700 kg/m³; kafa geri ergitilir, talaş ayrı kaydedilip dışarı satılır.
10. **Olay tabanlı arşiv.** Her aşamadan bir JSON olayı; `inbox` kuyruğu silinmez, doğrulanıp `archive/YYYY/MM/DK-.../events.jsonl` altına yazılır.
11. **Kapalı çevrim.** LAN içinde üretim, internet gelince kuyruktaki SMS/e-posta/rapor, düzenli harici disk yedeği, VPN + MFA + RBAC ile uzaktan erişim; doğrudan IP açılmaz.
12. **Şekil ve şema çizilmez.** `docs/01` yalnızca başlık ve anlatımdır; diğer dokümanlarda tablo kullanılır, kutu çizimi ve ok şeması yoktur.
13. **Tek kayıt, çok etki (Sürüm 1.1).** Onaylanan bir sevkiyat stok, fatura, muhasebe fişi, cari bakiye, maliyet, olay, bildirim ve rapor kuyruğunu tek işlemde üretir.
14. **Modüler saha kurulumu (Sürüm 1.2).** Aynı yazılım 1, 2 veya 5 fırınlı fabrikaya kod değişikliği olmadan bağlanır; makineler eklenir, gerekçeyle devre dışı bırakılır (silinmez), fabrika profili JSON olarak indirilir/içe alınır, modüller ve PLC adaptörleri veriyle yönetilir.
14. **Maliyet nesnesi döküm kodudur.** Genel ERP'deki proje modülü burada `DK-...` partisi olarak tercüme edilir; bordro, CAD/BIM ve kampanya CRM'i kasten dışarıda kalır.
15. **Belirsiz terimler sabitlenmez.** `PIS`, `GNSL`, `Stone`, `Barsa piyazesi` ve `Saf küçük` için `docs/06` Bölüm 5'teki 8 soru hâlâ açıktır.

---

## 4. Prototipteki ekranlar (32)

| Grup | Ekranlar |
| --- | --- |
| Genel | Panel |
| Satın Alma | Malzeme Tanımları, Satın Alma Emirleri, Fiyat Takibi, Tedarikçiler, **Talep & Teklif Akışı** |
| Hammadde & Stok | Stok Durumu, Mal Kabul, Kırıcı & Fire, Stok Hareketleri |
| Üretim | Üretim Akışı (sürükle-bırak), Reçeteler, Homojenizasyon Partisi, Olay & Arşiv |
| Makine & Kurulum | Makine Parkı, Döküm Yolları, Kesim Hesap Motoru, Yağ & Bakım, PLC Durum |
| **Ticari & Finans** | **Satış Siparişleri**, **Müşteriler & Cari**, **Muhasebe & Fişler**, **Maliyet & Kârlılık** |
| **Depolama & Personel** | **Depo, Rezervasyon & Sayım**, **Personel & Vardiya** |
| Sevkiyat | Sevkiyat & Onaylar, Arşiv |
| Raporlama | Raporlar & İstatistik |
| **Entegrasyon** | **Entegrasyon Matrisi** |
| Yönetim | **Saha Kurulum Sihirbazı**, **Modül Kaydı**, Merkezi Yönetim |
| Sistem | Bildirimler & Kuyruk, Ayarlar |

Kalın olan 8 ekran Sürüm 1.1'de, **Saha Kurulum Sihirbazı** ve **Modül Kaydı** Sürüm 1.2'de eklendi; gerekçeler `docs/11` ve `docs/12` içindedir.

---

## 5. Sürüm 1.1 ve 1.2'de kapatılan boşluklar

Genel ERP anlatımı bu projeye uygulandığında en büyük eksik **modül sayısı değil, departmanlar arası otomatik veri akışıydı**. Önceki sürüm üretim, kütle dengesi ve olay günlüğünde güçlüydü; müşteri kartı, satış siparişi, satın alma talebi, hesap planı, muhasebe fişi, mizan, fatura, cari bakiye, ürün maliyeti, bütçe, depo lokasyonu ve vardiya yoktu.

| Eklenen | Neden | Nerede |
| --- | --- | --- |
| 18 yeni koleksiyon, `schemaVersion: 3` | Ticari ve finansal kayıtlar ortak veri modeline bağlandı | `app/js/seed.js`, `server/erp/data/` |
| Tek `machines` kaynağı | `furnaces` projeksiyon oldu, `F20`/`F35`/`P1`/`MCH-08` sabitleri kaldırıldı | `app/js/seed.js`, `app/js/store.js` |
| Güvenli makine çıkarma | Bağımlılık raporu + gerekçe + geri alma; hiçbir geçmiş kayıt silinmez | `app/js/modularity.js`, `engineering.js` |
| Fabrika profil paketi | İndir / kopyala / içe al; 5 fırın → 1 fırın veya 2 fırın | `app/js/modularity.js`, `views/setup.js` |
| Kurulum sihirbazı | Fabrika → makine → yol → bağlantı → modül, beş adım | `app/js/views/setup.js` |
| Modül kaydı ve adaptör | Menü/kurallar veriyle filtrelenir, `MANUAL` yedek garanti | `app/js/modularity.js`, `app/js/adapters.js` |
| `app/js/posting.js` | KDV, çift taraflı fiş, mizan, maliyet, kredi kontrolü ve KPI saf hesap modülü | Saf JS, Node'da test edilir |
| 8 yeni ekran | Cari, sipariş, talep, muhasebe, maliyet, depo, vardiya, entegrasyon | `app/js/views/enterprise.js` |
| Entegrasyon matrisi | Bir onaydan sekiz koleksiyona atomik yazım, `clientId` ile çift yazım engeli | `integrationRules`, `Entegrasyon Matrisi` |
| Genişletilmiş doğrulama | Borç = alacak, KDV, fatura tutarı, maliyet toplamı, sayım farkı, dönem kapanışı | `validate_data.py`, `smoke_test.mjs` |
| `docs/11` + güncellenen 5 doküman | Karşılaştırma, boşluk analizi ve kapsam dışı kararların gerekçesi | `docs/`, tek Word çıktısı |
| `docs/12` + 34. ekran | Saha kurulum, profil paketi, modül yaşam döngüsü, adaptör sözleşmesi | `docs/12`, `app/js/views/setup.js` |

Kasten eklenmeyenler: bordro ve özlük, kampanya CRM'i, inşaat proje kartı, AutoCAD/BIM, perakende POS, e-fatura, banka mutabakatı, KDV beyannamesi, çoklu para birimi. Kaynak metindeki otel/elektrik taahhüt örneği bu fabrikaya uygulanmadı.

---

## 6. Kontroller ve testler

```bash
node tools/smoke_test.mjs                              # 34 ekran + hesaplar + mizan + profil + çıkarma + adaptör
python3 server/erp/scripts/validate_data.py           # 58 koleksiyon, referans, finansal ve modüler bütünlük
node tools/export_seed.mjs                            # 59 JSON + manifest (schema_version: 4)
python3 server/erp/scripts/event_worker.py --dry-run  # kuyruk simülasyonu (silmez)
python3 server/erp/scripts/plc_poller.py --dry-run    # dört sinyal kuralı
python3 server/erp/scripts/outbox_worker.py --dry-run # çevrimdışı kuyruk
python3 server/erp/scripts/backup.py --no-external    # yedek + checksum
python3 tools/build_docx.py                           # 13 dokümanı tek Word'e derle
```

Son doğrulama sonuçları: 34 menü / 34 ekran eşleşiyor, mizan borç = alacak, maliyet kalemleri tutarlı, 1 ve 2 fırınlı profil testleri ve devre dışı bırakma/geri alma geçti, 58 koleksiyonda 0 hata ve 1 bilgilendirici uyarı (demo stok fotoğrafı), geçerli OOXML Word çıktısı.

> **Sınır:** Bu bir plan doğrulama prototipidir. Gerçek API/veritabanı, RBAC/VPN, OPC UA/Modbus sürücüsü, SMTP/SMS sağlayıcısı ve PLC donanımı bağlı değildir. Canlı kurulumda doğruluk kaynağı işlemsel veritabanı, JSON dosyaları arşiv ve aktarım görünümüdür.

---

## 7. Sonraki adım

1. `docs/06` Bölüm 5'teki 8 soruyu mühendisle kapatmak (özellikle 17 tondan 14 tona düşüşün dağılımı ve 300 mm kafa payı).
2. `docs/10` aşama 8: gerçek API + veritabanı + RBAC; fiş, stok ve cari yazımlarını tek transaction içine almak.
3. Standart maliyet ve stok değerleme yöntemini (ağırlıklı ortalama / FIFO) netleştirmek.
4. e-Fatura, banka mutabakatı ve KDV entegrasyonlarını ayrı servis olarak eklemek.
5. `docs/Dokumhane-ERP-Plan.docx` dosyasını yapay zekâya verip genel yazılım altyapı şemasını oluşturmak — sohbetin en baştaki hedefi için girdi hazırdır.
