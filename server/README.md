# Sunucu Tarafı — Firma İçi `ERP/` Klasörü

Bu klasör, sohbette tarif edilen *"bir firmanın server dosyalarında tutucaz, erp sistemi diye bir klasörde çalışacak"* yapısının depodaki somut modelidir.

```
server/
└── erp/                       # Firma sunucusundaki ERP klasörü
    ├── README.md              # Kurulum, klasörler, zamanlanmış görevler
    ├── data/                  # JSON arşiv (uygulamanın okuyup görselleştirdiği veriler)
    ├── scripts/               # backup.py · outbox_worker.py · validate_data.py · event_worker.py · plc_poller.py
    ├── inbox/                 # HTML arayüzünün yazdığı olay kuyruğu (YENİ)
    ├── archive/               # Döküm kodu bazlı append-only olay günlüğü (YENİ)
    ├── backups/               # Yerel günlük yedekler (çalışınca oluşur)
    ├── logs/                  # Yedekleme ve gönderim logları (çalışınca oluşur)
    ├── db/                    # Canlı veritabanı (gerçek kurulumda SQLite / PostgreSQL dump)
    ├── files/                 # Kantar fişleri, sertifikalar, rapor PDF'leri
    ├── api/                   # Uygulama servisi (gerçek kurulumda)
    └── app/                   # Derlenmiş frontend (bu depoda app/ prototiptir)
```

## Neden sunucuda servis, istemcide exe değil?

`docs/04-teknik-mimari-kararlar.md` içinde ayrıntılı gerekçesi vardır. Özetle: istemciler yalnızca tarayıcıdan `https://erp.firma.local` adresine bağlanır (PWA kısayol ikonu); API, zamanlayıcı, yedekleme ve giden kutu işçisi **sunucuda** çalışır. Böylece PC ve tablet aynı kodu kullanır, güncelleme tek noktadan yapılır ve internet olmadan üretim devam eder.

## Hızlı kontrol

```bash
python3 server/erp/scripts/validate_data.py     # arşiv bütünlüğü
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
