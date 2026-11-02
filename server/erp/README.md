# ERP Klasörü — Sunucu Yapısı

Firma içi sunucuda (Windows Server, Linux veya NAS) `C:\ERP` / `/srv/erp` altına konur. İç DNS kaydı `erp.firma.local`, reverse proxy (Nginx/Caddy) üzerinden HTTPS ile sunulur. İnternet **gerekmez**; LAN yeterlidir.

## Klasörler

| Klasör | İçerik | Bu depoda |
| --- | --- | --- |
| `data/` | Koleksiyon bazlı JSON arşiv + `manifest.json` | ✅ Gerçek dosyalar var |
| `scripts/` | Yedekleme, giden kutu işçisi, veri doğrulama | ✅ Çalışan scriptler var |
| `backups/` | Günlük anlık görüntüler | ⚙️ `backup.py` çalışınca oluşur |
| `logs/` | İşlem logları | ⚙️ Scriptler çalışınca oluşur |
| `db/` | Canlı veritabanı / dump | ⚙️ Gerçek kurulumda eklenir |
| `files/` | Kantar fişi, sertifika, rapor PDF'leri | ⚙️ Gerçek kurulumda eklenir |
| `api/` | Node/FastAPI servisi, JWT, RBAC | ⚙️ Faz 1'de eklenir |
| `app/` | Derlenmiş frontend | Bu depoda kökteki `app/` prototiptir |

> **Önemli:** `data/*.json` **arşiv / aktarım / AI girdisi** formatıdır. Canlı çok kullanıcılı kayıtlar işlemsel bir veritabanında (SQLite veya PostgreSQL) tutulur; aynı anda iki operatör stok düşerse JSON dosyasında yarış oluşmaması için `stock_movements` transaction ile yazılır. Ayrıntı: `docs/04` Bölüm 5.

## Komutlar

```bash
# 1) Veri bütünlüğü (referanslar, kabul/fire hesapları, aşama adları)
python3 scripts/validate_data.py

# 2) Yedekleme: snapshot + checksum + harici disk + 30 gün saklama
python3 scripts/backup.py --retention-days 30

# 3) Giden kutu: çevrimdışı biriken SMS / e-posta / bulut yedeğini işle
python3 scripts/outbox_worker.py --dry-run      # önce deneme
python3 scripts/outbox_worker.py                # gerçek (env değişkenleriyle)
```

Ortam değişkenleri: `ERP_SMTP_HOST`, `ERP_SMTP_PORT`, `ERP_SMTP_USER`, `ERP_SMTP_PASS`, `ERP_SMTP_FROM`, `ERP_SMS_API_URL`, `ERP_SMS_API_KEY`. Tanımlı değilse işçi **demo modunda** çalışır, ağa çıkmaz, yalnızca log yazar.

## Zamanlanmış görevler

**Windows (Görev Zamanlayıcı):**
```
Program: python.exe   Argüman: C:\ERP\scripts\backup.py --retention-days 30
Tetikleyici: Her gün 03:00 ve her saat başı (artımlı)
```

**Linux (cron):**
```cron
0 3 * * *  cd /srv/erp && python3 scripts/backup.py --retention-days 30 >> logs/cron.log 2>&1
*/15 * * * * cd /srv/erp && python3 scripts/outbox_worker.py >> logs/cron.log 2>&1
0 8 * * *  cd /srv/erp && python3 scripts/report_generator.py >> logs/cron.log 2>&1
```

> `report_generator.py` (günlük/haftalık/aylık raporları üretip `outbox`'a yazan zamanlayıcı) Faz 3'te eklenir; prototipte **Bildirimler & Kuyruk → Zamanlanmış Raporlar** ekranı bu davranışı gösterir.

## Dayanıklılık kontrol listesi

- [x] Günlük JSON snapshot + SHA-256 sağlama toplamı
- [x] Harici diske ikinci kopya (`settings.json → backupPath`)
- [x] Saklama süresi temizliği
- [x] Başarısız yedeklemenin loglanması
- [ ] Aylık **restore testi** (operasyonel süreç)
- [ ] İkinci "soğuk yedek" sunucu ve UPS (altyapı)
- [ ] İstemci IndexedDB senkronizasyon kuyruğu (Faz 4)

## Uzak erişim

İnternetten doğrudan IP/port açılmaz. WireGuard/Tailscale VPN + MFA + rol bazlı yetki kullanılır; geliştirici hesabı salt-okunurdur. Bkz. `docs/04` Bölüm 7.
