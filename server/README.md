# Sunucu Tarafı — Firma İçi `ERP/` Klasörü

Bu klasör, sohbette tarif edilen *"bir firmanın server dosyalarında tutucaz, erp sistemi diye bir klasörde çalışacak"* yapısının depodaki somut modelidir.

```
server/
└── erp/                       # Firma sunucusundaki ERP klasörü
    ├── README.md              # Kurulum, klasörler, zamanlanmış görevler
    ├── data/                  # JSON arşiv (uygulamanın okuyup görselleştirdiği veriler)
    ├── scripts/               # backup.py · outbox_worker.py · validate_data.py
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
