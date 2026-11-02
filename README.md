# ai-icin — Alüminyum Dökümhane ERP

Bu depo, aşağıdaki sohbetten çıkan **tüm gereksinimleri**, bunlardan üretilen **plan / rapor dokümanlarını** ve **çalışan, modern bir web arayüzü prototipini** içerir.

> Sohbette geçen hedef: *"Windows 98 değil, yeni nesil bir arayüz… firmanın server dosyalarında `ERP` klasöründe çalışsın… internet olmasa da kapalı çevrimde üretim devam etsin… en son tüm işlevleri bir Word'e döküp yazılım altyapı şemasını oluşturalım."*

---

## 1. Depoda ne var?

| Yol | İçerik |
| --- | --- |
| `docs/00-ham-gereksinimler.md` | Sohbetteki kullanıcı mesajlarının ham metni (kaynak girdi) |
| `docs/01-uctan-uca-surec-raporu.md` | **Satın almadan sevkiyata kadar** pür pak, şekilsiz/şemasız süreç raporu |
| `docs/02-faz1-plan.md` | Faz 1: Satın Alma + Hammadde/Stok detaylı planı, sayfa yapısı önerisi, tablolar, roller, 8 haftalık sıra |
| `docs/03-ana-plan-dokumani.md` | Ana plan dokümanı: kapsam, modüller, teknik mimari, UI, fazlar, riskler + genel plandaki sektörel sapmaların düzeltilmesi |
| `docs/04-teknik-mimari-kararlar.md` | **Sohbette cevapsız kalan mimari soruların cevabı**: HTML mi / EXE mi, kapalı çevrim, SMS-e-posta kuyruğu, PLC, JSON mu DB mi, yedekleme, evden/geliştirici erişimi |
| `docs/05-veri-modeli-ve-ekranlar.md` | Varlıklar, JSON şemaları, API uçları, ekran envanteri ve dosya düzeni |
| `docs/Dokumhane-ERP-Plan.docx` | Tüm dokümanların tek **Word** dosyası ("AI'a atılacak" çıktı) |
| `app/` | Çalışan PWA prototipi (bağımlılık yok, saf HTML/CSS/JS) |
| `server/erp/` | Firma sunucusundaki `ERP` klasörünün modeli: JSON arşivi + yedekleme + giden kutu işçisi |
| `tools/` | Word üretici ve seed/JSON senkronizasyon scriptleri |

## 2. Prototipi çalıştırma

Hiçbir `npm install` gerekmez. Depo kökünden:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Tarayıcıdan `http://localhost:8080/app/` adresini açın. Tablet/PC'de **"Uygulamayı yükle"** (PWA) ile masaüstüne kısayol ikonu olarak eklenir; service worker uygulama kabuğunu önbelleğe aldığı için sunucuya erişim kesilse de arayüz açılmaya devam eder.

Demo verisi tarayıcı `localStorage`'ında tutulur. **Ayarlar → Veri Yönetimi** ekranından tüm veriyi JSON olarak dışa/içe aktarabilirsiniz; bu JSON, `server/erp/data/` altındaki sunucu arşiviyle aynı şemadır.

> Prototip bir **plan doğrulama / UI onay aracıdır**; gerçek çok kullanıcılı kurulum için `docs/04` içindeki sunucu mimarisi (API + veritabanı + outbox worker) uygulanmalıdır.

## 3. Sohbetten çıkan ana kararlar (özet)

1. **Arayüz:** Windows Forms / .exe değil; **tarayıcı tabanlı, responsive, dokunmatik uyumlu PWA**. PC + tablet + tek kod tabanı.
2. **Konum:** Firma içi sunucuda `ERP/` klasörü; LAN üzerinden `https://erp.firma.local`, istemcilerde kısayol ikonu.
3. **Kapalı çevrim:** Üretim ve stok tamamen LAN içinde çalışır; SMS / e-posta / raporlar **giden kutu (outbox)** kuyruğuna yazılır, internet gelince gönderilir.
4. **Veri:** Ana kayıt işlemsel bir veritabanında (SQLite/PostgreSQL), **JSON** ise arşiv / aktarım / yedek formatıdır. Her gece snapshot + harici diske 3-2-1 yedek.
5. **Uzak erişim:** Port açıp IP vermek yerine **WireGuard/Tailscale VPN + MFA + rol bazlı yetki**; geliştirici hesabı salt-okunur.
6. **İş akışı:** Satın Alma → Mal Kabul → Kırıcı/Fire → Stok → Ergitme → Döküm → Testere → Homojenizasyon → Paketleme → Mamul Stok → **2 kademeli onaylı** Sevkiyat → Arşiv → Raporlama.
7. **Değişken yapı:** Malzeme, kategori, birim, fiyat, reçete ve kritik stok eşikleri sabit kodlanmaz; kullanıcı tanımlar.

## 4. Kontroller ve testler

```bash
node tools/smoke_test.mjs                       # 16 ekranın render + veri bütünlüğü
python3 server/erp/scripts/validate_data.py     # JSON arşivi referans kontrolü
python3 server/erp/scripts/backup.py            # yedekleme (harici disk yoksa atlar, loglar)
python3 server/erp/scripts/outbox_worker.py --dry-run   # kuyruk işçisi denemesi
python3 tools/build_docx.py                     # Word çıktısını yeniden üret
```

Prototipte çalışan akışlar: malzeme kartı CRUD, satın alma emri + otomatik fiyat geçmişi, fiyat grafiği, mal kabul ile stok girişi, kırıcı brüt/fire/net hesabı, renk kodlu stok, **sürükle-bırak üretim akışı** (fare + dokunmatik), önerilen/gerçekleşen tüketim farkı, reçeteye göre sarf düşümü, yan ürün girişi, **iki kademeli sevkiyat onayı**, arşiv, rapor çıktıları, çevrimiçi/çevrimdışı kuyruk, JSON içe/dışa aktarma ve açık/koyu tema.

Kök `index.html` canlı önizlemeyi doğrudan `/app/` adresine yönlendirir.

## 5. Sonraki adım

`docs/Dokumhane-ERP-Plan.docx` dosyası, sohbetin sonunda planlandığı gibi **yapay zekâya verilecek tek girdi** olarak hazırlanmıştır: *"tüm işlevleri bir Word'e döküp genel yazılım altyapı şemasını oluşturmak"*.

Dokümanı yeniden üretmek için:

```bash
python3 tools/build_docx.py
```

JSON arşivini prototipin demo verisinden yenilemek için:

```bash
node tools/export_seed.mjs
```
