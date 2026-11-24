# Sunucu Tarafı — Firma İçi `ERP/` Klasörü

Bu klasör, sohbette tarif edilen *"bir firmanın server dosyalarında tutucaz, erp sistemi diye bir klasörde çalışacak"* yapısının depodaki somut modelidir.

Sunucu kökünde `erp/` klasörü bulunur. `README.md` kurulumu, `data/` JSON arşivini, `scripts/` yedekleme ve worker'ları, `inbox/` olay kuyruğunu, `archive/` döküm kodu bazlı kalıcı olay günlüğünü taşır. `backups/` ve `logs/` scriptler çalışınca oluşur. Gerçek kurulumda `db/` canlı veritabanını, `files/` kantar fişi ve rapor PDF'lerini, `api/` uygulama servisini, `app/` derlenmiş frontend'i barındırır; bu depoda kökteki `app/` prototiptir.

| Klasör | İçerik | Bu depoda |
| --- | --- | --- |
| `erp/data/` | 59 JSON dosyası, `manifest.json` (`schema_version: 4`) | Gerçek dosyalar var |
| `erp/scripts/` | `backup.py`, `outbox_worker.py`, `validate_data.py`, `event_worker.py`, `plc_poller.py` | Çalışan scriptler var |
| `erp/inbox/` | Arayüzden gelen olay kuyruğu | README + örnek kayıtlar |
| `erp/archive/` | Append-only olay günlüğü | README + örnek `events.jsonl` |
| `erp/backups/`, `erp/logs/` | Yedek ve loglar | Çalışınca oluşur |
| `erp/db/`, `erp/files/`, `erp/api/` | Veritabanı, belgeler, servis | Gerçek kurulumda |

## Neden sunucuda servis, istemcide exe değil?

`docs/04-teknik-mimari-kararlar.md` içinde ayrıntılı gerekçesi vardır. Özetle: istemciler yalnızca tarayıcıdan `https://erp.firma.local` adresine bağlanır (PWA kısayol ikonu); API, zamanlayıcı, yedekleme ve giden kutu işçisi **sunucuda** çalışır. Böylece PC ve tablet aynı kodu kullanır, güncelleme tek noktadan yapılır ve internet olmadan üretim devam eder.

## Hızlı kontrol

```bash
python3 server/erp/scripts/validate_data.py     # 52 koleksiyon: referans, mizan, KDV, maliyet
python3 server/erp/scripts/backup.py            # yedek al (harici disk yoksa atlar, loglar)
python3 server/erp/scripts/outbox_worker.py --dry-run   # kuyruğu ağa çıkmadan dene
```


---

## Saha görüşmesiyle eklenen katman

Mühendis görüşmesi (`docs/06`–`docs/10`) sistemi tek fabrikaya yazılmış bir ERP olmaktan çıkarıp çok fabrikalı, modüler ve olay tabanlı bir ürün hâline getirdi. Sunucu tarafında iki yeni klasör ve iki yeni script vardır:

| Yol | Görevi |
| --- | --- |
| `erp/inbox/` | Arayüzün oluşturduğu JSON kayıtları; `processing/`, `processed/`, `dead-letter/` alt klasörleriyle |
| `erp/archive/YYYY/MM/{döküm kodu}/events.jsonl` | Her aşamadan bir satır düşen kalıcı olay günlüğü |
| `erp/scripts/event_worker.py` | Kuyruğu 1–3 sn'de tarar, `docs/07` formülleriyle hesaplar, arşive yazar, doğrular, sonra arşivler (silmez) |
| `erp/scripts/plc_poller.py` | Dört sinyal kuralını ve merkezi tag eşleştirmesini denetler; gerçek ağ bağlantısı yapmaz |

```bash
python3 server/erp/scripts/event_worker.py --dry-run
python3 server/erp/scripts/plc_poller.py --dry-run
```

İlk kurulum bir **mini PC veya laptop** üzerinde yapılır; Nginx, Docker veya bulut hesabı gerekmez. Önce merkezi yönetim altyapısı, sonra makine tanımlama, JSON veri alışverişi ve üretim modülleri, en son gerçek PLC bağlantıları gelir. Ayrıntı: `docs/10`.

---

## Genel ERP karşılaştırmasıyla eklenen ticari katman

`docs/11` ile birlikte `app/js/posting.js` ve 18 yeni JSON koleksiyonu eklendi: hesap planı, müşteri/cari, satış teklifi ve siparişi, satın alma talebi ve teklifi, fatura, muhasebe fişi, ödeme, depo, sayım, rezervasyon, maliyet, personel, vardiya, bütçe, dönem kapanışı ve entegrasyon kuralları. `validate_data.py` artık borç ile alacağın eşitliğini, KDV hesabını, fatura tutarlarını, maliyet kalemleri toplamını, sayım farkını ve dönem kapanış koşulunu da denetler.

Bu katman sunucuda yeni bir servis gerektirmez; veri `data/` altında, hesap mantığı prototipte `app/js/posting.js` içindedir. Gerçek kurulumda fiş, stok hareketi ve cari bakiye `db/` içinde tek veritabanı işlemiyle yazılır. `data/*.json` arşiv ve aktarım görünümü olarak kalır. Ayrıntı: `docs/04` Bölüm 13.

## Fabrikadaki veri toplama bilgisayarı

`server/sim_bridge/` klasöründeki köprü, ERP Studio'yu fabrika testinden önce kullanıcı fırın simülasyonuna bağlar; statik arayüzü sunar, simülasyon REST uçlarını proxy'ler ve imzalı edge batch'lerini kendi SQLite kayıt defterine yazar (`docs/14`). İşletme koleksiyonlarına yazmaz.

`edge/` klasöründeki `ERP-Edge-Collector.exe` sensör verisini **doğrudan bu JSON dosyalarına yazmaz**. Önce kendi yerel SQLite veritabanına kaydeder, ardından imzalı `POST /api/edge/ingest` isteğiyle ERP'ye iletir; sunucu tarafındaki worker doğrulayıp koleksiyonları üretir. Bu ayrım, arşiv dosyalarının yarış koşuluna girmesini ve ham PLC verisinin işletme kayıtlarına karışmasını engeller. Ayrıntı `docs/13` Bölüm 3 ve 6'dadır.
