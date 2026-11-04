# ai-icin — Alüminyum Dökümhane ERP

Bu depo, iki aşamalı bir sohbetten çıkan **tüm gereksinimleri**, bunlardan üretilen **plan / rapor dokümanlarını** ve **çalışan, modern bir web arayüzü prototipini** içerir.

> İlk hedef: *"Windows 98 değil, yeni nesil bir arayüz… firmanın server dosyalarında `ERP` klasöründe çalışsın… internet olmasa da kapalı çevrimde üretim devam etsin… en son tüm işlevleri bir Word'e döküp yazılım altyapı şemasını oluşturalım."*
>
> İkinci hedef (mühendis saha görüşmesi): *"21 tondan 3 ton aktarıldı, 1 ton yollukta kaldı, 17 ton döktüm, kafaları kesince 14 ton biyet kaldı… bunların hepsini JSON'a nasıl tutacağız, makineler modül modül olmalı, bizim kendi merkezi yönetim ekranımız olmalı, önce mini PC'de nasıl kuracağımızı bul."*

---

## 1. Depoda ne var?

| Yol | İçerik |
| --- | --- |
| `docs/00-ham-gereksinimler.md` | İlk sohbetteki kullanıcı mesajlarının ham metni (kaynak girdi) |
| `docs/01-uctan-uca-surec-raporu.md` | **Satın almadan sevkiyata kadar** şekilsiz/şemasız, yalnızca başlık + anlatım süreç raporu |
| `docs/02-faz1-plan.md` | Faz 1: Satın Alma + Hammadde/Stok detaylı planı, sayfa yapısı, tablolar, roller, 8 haftalık sıra |
| `docs/03-ana-plan-dokumani.md` | Ana plan: kapsam, modüller, teknik mimari, UI, fazlar, sektörel sapma düzeltmeleri + saha görüşmesi kapsam genişlemesi |
| `docs/04-teknik-mimari-kararlar.md` | İlk sohbette **cevapsız kalan** mimari soruların cevabı + iki çalışma modu, dört PLC sinyali, merkezi yönetim, olay arşivi |
| `docs/05-veri-modeli-ve-ekranlar.md` | 35 varlık, JSON şemaları, hesap kuralları, API uçları, **24 ekran** envanteri ve dosya düzeni |
| `docs/06-saha-gorusmesi-duzeltilmis-metin.md` | **Ses kaydının düzeltilmiş, anlaşılır teknik anlatımı**: terim düzeltmeleri, sitenin düzenlemesinin değerlendirilmesi, abiye sorulacak 8 soru |
| `docs/07-uretim-hesap-motoru.md` | 6300/6000/300/3 mm, Ø178, yoğunluk; kafa, talaş, yolluk, 21→18→17→14 ton kütle dengesi; yağ ve bıçak ömrü formülleri |
| `docs/08-moduler-makine-ve-merkezi-yonetim.md` | Boş makine parkı, fabrika profilleri, `MANUAL`/`PLC` modları, dört sinyal, geliştirici konsolu, uzaktan güncelleme |
| `docs/09-olay-tabanli-json-arsivleme.md` | Her aşamadan bir satır: olay şeması, `inbox`/`archive` ayrımı, silme yerine doğrulama, dosyalama ve geri yükleme |
| `docs/10-kurulum-ve-yol-haritasi-v2.md` | Mini PC ile kurulum, güncellenmiş aşama sırası, riskler ve doğrulanacaklar |
| `docs/Dokumhane-ERP-Plan.docx` | **11 dokümanın tamamını** birleştiren tek **Word** dosyası ("AI'a atılacak" çıktı) |
| `app/` | Çalışan PWA prototipi: bağımlılık yok, saf HTML/CSS/JS, **24 ekran** |
| `server/erp/` | Firma sunucusundaki `ERP/` klasörünün modeli: 35 JSON koleksiyonu, olay kuyruğu, arşiv, worker'lar |
| `tools/` | Word üretici, seed→JSON, ikon üretici, duman testi |

---

## 2. Prototipi çalıştırma

Hiçbir `npm install` gerekmez. Depo kökünden:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Tarayıcıdan `http://localhost:8080/app/` adresini açın (kök `index.html` otomatik yönlendirir). Tablet/PC'de **"Uygulamayı yükle"** (PWA) ile masaüstüne kısayol ikonu olarak eklenir; service worker uygulama kabuğunu önbelleğe aldığı için sunucuya erişim kesilse de arayüz açılmaya devam eder.

Demo verisi tarayıcı `localStorage`'ında tutulur. **Ayarlar → Veri Yönetimi** ekranından tüm veriyi JSON olarak dışa/içe aktarabilirsiniz; bu JSON, `server/erp/data/` altındaki sunucu arşiviyle aynı şemadır.

> Prototip bir **plan doğrulama / UI onay aracıdır**. Gerçek çok kullanıcılı kurulum için `docs/04` ve `docs/10` içindeki API + veritabanı + worker mimarisi uygulanmalıdır. PLC, SMTP/SMS, VPN/MFA/RBAC entegrasyonları bu depoda **demo/simülasyon** düzeydedir.

---

## 3. Sohbetten çıkan ana kararlar

1. **Arayüz:** Windows Forms / .exe değil; **tarayıcı tabanlı, responsive, dokunmatik uyumlu PWA**. PC + tablet + tek kod tabanı.
2. **Konum:** Firma içi sunucuda `ERP/` klasörü; LAN üzerinden `https://erp.firma.local`, istemcilerde kısayol ikonu. İlk kurulum bir **mini PC veya laptop** ile yapılır.
3. **Kapalı çevrim:** Üretim ve stok tamamen LAN içinde çalışır; SMS / e-posta / raporlar **giden kutu (outbox)** kuyruğuna yazılır, internet gelince gönderilir.
4. **Veri:** Ana kayıt işlemsel bir veritabanında (SQLite/PostgreSQL), **JSON** ise arşiv / aktarım / yedek formatıdır. Her gece snapshot + harici diske 3-2-1 yedek.
5. **Uzak erişim:** Port açıp IP vermek yerine **WireGuard/Tailscale VPN + MFA + rol bazlı yetki**; geliştirici hesabı salt-okunur.
6. **İş akışı:** Satın Alma → Mal Kabul → Kırıcı/Fire → Stok → Ergitme → Döküm → Testere → Homojenizasyon → Soğutma → Paketleme → Mamul Stok → **2 kademeli onaylı** Sevkiyat → Arşiv → Raporlama.
7. **Değişken yapı:** Malzeme, kategori, birim, fiyat, reçete, eşikler ve makine tipleri sabit kodlanmaz; kullanıcı tanımlar.
8. **Hesap motoru:** Kesim kaybı sabit kg değil, **hacim × yoğunluk** ile hesaplanır. Kafa kesimi `remelt`, talaş `sale`, yolluk `recycle` olarak ayrılır; 21→18→17→14 ton zinciri olay satırlarıyla kapanır.
9. **Modüler makine parkı:** Program ilk açıldığında **hiç makine yok**. Fabrikadan fabrikaya makine sayısı, isim (A Fırını / 1. Ocak) ve kapasite (20/35 t) değişir. Bu modülerlik **müşteri için değil, yazılımı geliştiren ekip içindir**.
10. **İki mod, dört sinyal:** `MANUAL` (operatör girer) ve `PLC` (otomatik okur). PLC'den yalnızca kapı, döküm modu/devrilme, alarm ve çalışma durumu okunur; ekran kalabalıklaştırılmaz.
11. **İki arayüz:** Fabrika operatör ekranı + **Merkezi Yönetim** (firma, PLC IP, tag eşleştirme, uzaktan güncelleme). Adresler operatör ekranında görünmez.
12. **Olay tabanlı arşiv:** Her aşamadan bir JSON satırı düşer. Kuyruk kaydı **silinmez**; önce arşive yazılıp SHA-256 ile doğrulanır, sonra `archived` yapılır. Aynı `clientId` iki kez gelirse çift yazım engellenir.

---

## 4. Prototipteki ekranlar (24)

| Grup | Ekranlar |
| --- | --- |
| Genel | Panel |
| Satın Alma | Malzeme Tanımları, Satın Alma Emirleri, Fiyat Takibi, Tedarikçiler |
| Hammadde & Stok | Stok Durumu, Mal Kabul, Kırıcı & Fire, Stok Hareketleri |
| Üretim | Üretim Akışı (sürükle-bırak), Reçeteler, **Homojenizasyon Partisi**, **Olay & Arşiv** |
| Makine & Kurulum | **Makine Parkı**, **Döküm Yolları**, **Kesim Hesap Motoru**, **Yağ & Bakım**, **PLC Durum** |
| Sevkiyat | Sevkiyat & Onaylar, Arşiv |
| Raporlama | Raporlar & İstatistik |
| Yönetim | **Merkezi Yönetim** |
| Sistem | Bildirimler & Kuyruk, Ayarlar |

Çalışan akışlar: malzeme kartı CRUD, satın alma emri + fiyat geçmişi, mal kabul ile stok girişi, kırıcı net/fire, renk kodlu stok, sürükle-bırak üretim, **canlı kesim hesabı (kafa/talaş/net)**, **olaylara kayıt yazma**, **karışık homojenizasyon partisi ve 8/9 saat sapması**, **parametrik yağ/bıçak uyarıları**, iki kademeli sevkiyat onayı, arşiv, raporlar, çevrimiçi/çevrimdışı kuyruk, JSON içe/dışa aktarma, açık/koyu tema.

---

## 5. Kontroller ve testler

```bash
node tools/smoke_test.mjs                              # 24 ekran + hesap motoru + veri bütünlüğü
python3 server/erp/scripts/validate_data.py            # 34 koleksiyon, referanslar, olay bakiyesi
python3 server/erp/scripts/event_worker.py --dry-run   # olay kuyruğu simülasyonu
python3 server/erp/scripts/plc_poller.py --dry-run     # dört sinyal kuralı denetimi
python3 server/erp/scripts/outbox_worker.py --dry-run  # SMS / e-posta kuyruğu
python3 server/erp/scripts/backup.py --retention-days 30
node tools/export_seed.mjs                             # seed.js → data/*.json (35 dosya)
python3 tools/build_docx.py                            # 11 doküman → tek Word
```

Sunucu scriptleri yalnızca Python standart kütüphanesini kullanır; ağa çıkmaz. `event_worker.py --once` gerçekten çalışır: `inbox/` kaydını alır, `docs/07` formülleriyle olay üretir, `archive/YYYY/MM/{döküm kodu}/events.jsonl` dosyasına yazar, checksum üretir, sonra kaydı `processed/` altına taşır.

---

## 6. Sonraki adım

`docs/Dokumhane-ERP-Plan.docx`, sohbetin en baştaki hedefi olan **"tüm işlevleri bir Word'e döküp yapay zekâya atıp genel yazılım altyapı şemasını oluşturmak"** için hazırdır; artık hem ilk sohbeti hem de saha görüşmesini kapsar.

Geliştirmeden önce `docs/06` Bölüm 5'teki **8 doğrulama sorusu** mühendisle kapatılmalıdır. Özellikle 17→14 ton düşüşünün üç kaleme dağılımı, 300 mm kafa payının tek/çift uç olması, bıçak payının döküm boyuna dâhil olup olmadığı ve `Stone`, `PIS`, `GNSL` ifadelerinin karşılığı hesap motorunun varsayılanlarını doğrudan etkiler; kesinleşene kadar kodda sabit değer olarak yer almazlar.

Aşama sırası `docs/10` içindedir: önce merkezi yönetim ve veri altyapısı, sonra modüller, **en sonda gerçek PLC bağlantısı**.
