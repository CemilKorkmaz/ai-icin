# ERP Klasörü — Sunucu Yapısı

Firma içi sunucuda (Windows Server, Linux veya NAS) `C:\ERP` / `/srv/erp` altına konur. İç DNS kaydı `erp.firma.local`, reverse proxy (Nginx/Caddy) üzerinden HTTPS ile sunulur. İnternet **gerekmez**; LAN yeterlidir.

## Klasörler

| Klasör | İçerik | Bu depoda |
| --- | --- | --- |
| `data/` | 59 JSON dosyası: 58 koleksiyon + `manifest.json` (`schema_version: 4`) | ✅ Gerçek dosyalar var |
| `scripts/` | Yedekleme, giden kutu, doğrulama, olay işçisi, PLC denetçisi | ✅ Çalışan scriptler var |
| `inbox/` | Arayüzden gelen olay kuyruğu | ✅ README + örnek kayıtlar var |
| `archive/` | Döküm kodu bazlı olay günlüğü | ✅ README + örnek `events.jsonl` var |
| `backups/` | Günlük anlık görüntüler | ⚙️ `backup.py` çalışınca oluşur |
| `logs/` | İşlem logları | ⚙️ Scriptler çalışınca oluşur |
| `db/` | Canlı veritabanı / dump | ⚙️ Gerçek kurulumda eklenir |
| `files/` | Kantar fişi, sertifika, rapor PDF'leri | ⚙️ Gerçek kurulumda eklenir |
| `api/` | Node/FastAPI servisi, JWT, RBAC | ⚙️ Faz 1'de eklenir |
| `app/` | Derlenmiş frontend | Bu depoda kökteki `app/` prototiptir |

> **Önemli:** `data/*.json` **arşiv / aktarım / AI girdisi** formatıdır. Canlı çok kullanıcılı kayıtlar işlemsel bir veritabanında (SQLite veya PostgreSQL) tutulur; aynı anda iki operatör stok düşerse JSON dosyasında yarış oluşmaması için `stock_movements` transaction ile yazılır. Ayrıntı: `docs/04` Bölüm 5.

## Komutlar

```bash
# 1) Veri bütünlüğü (referanslar, kabul/fire, mizan, KDV, maliyet, sayım, dönem)
python3 scripts/validate_data.py

# 2) Yedekleme: snapshot + checksum + harici disk + 30 gün saklama
python3 scripts/backup.py --retention-days 30

# 3) Olay kuyruğu: arayüzden gelen JSON'ları hesaplayıp arşivle (SİLMEZ)
python3 scripts/event_worker.py --dry-run             # örnekleri raporlar
python3 scripts/event_worker.py --once                # tek tur
python3 scripts/event_worker.py --loop --interval 3   # 1–3 sn tarama

# 4) PLC konfigürasyon denetimi (gerçek sürücü yok, dört sinyal kuralı)
python3 scripts/plc_poller.py --dry-run

# 5) Giden kutu: çevrimdışı biriken SMS / e-posta / bulut yedeğini işle
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
* * * * *  cd /srv/erp && python3 scripts/event_worker.py --once >> logs/cron.log 2>&1
```

> `report_generator.py` (günlük/haftalık/aylık raporları üretip `outbox`'a yazan zamanlayıcı) hâlâ **yer tutucudur**, bu depoda dosyası yoktur; prototipte **Bildirimler & Kuyruk → Zamanlanmış Raporlar** ekranı bu davranışı gösterir. `event_worker.py` ise gerçekten çalışır.

`ERP/inbox/` ile `ERP/archive/` ayrımı, konuşmada "JSON'ları HTML'ler sadece okur, veri yazacaksa bir şeye yazar" denilen kuralın dosya sistemindeki karşılığıdır. Kuyruk kaydı **silinmez**: önce arşive yazılıp SHA-256 ile doğrulanır, sonra `archived` durumuna alınır. Ayrıntı `docs/09`.

## Dayanıklılık kontrol listesi

- [x] Günlük JSON snapshot + SHA-256 sağlama toplamı
- [x] Harici diske ikinci kopya (`settings.json → backupPath`)
- [x] Saklama süresi temizliği
- [x] Başarısız yedeklemenin loglanması
- [ ] Aylık **restore testi** (operasyonel süreç)
- [ ] İkinci "soğuk yedek" sunucu ve UPS (altyapı)
- [x] Olay günlüğü + kuyruk ayrımı, idempotent `clientId`, dead-letter ve checksum
- [x] Arşiv, `inbox/processed/` ve checksum dosyalarının yedek kapsamına alınması
- [x] Finansal koleksiyonların (fiş, fatura, cari, maliyet) `data/` yedeğine dahil edilmesi
- [ ] İstemci IndexedDB senkronizasyon kuyruğu (Faz 4)

## Uzak erişim

İnternetten doğrudan IP/port açılmaz. WireGuard/Tailscale VPN + MFA + rol bazlı yetki kullanılır; geliştirici hesabı salt-okunurdur. Bkz. `docs/04` Bölüm 7.

---

## Ticari ve finansal koleksiyonlar (Sürüm 1.1)

Sürüm 1.2'de altı modüler kurulum koleksiyonu daha eklenmiştir; ayrıntı `../data/README.md` ve `docs/12` içindedir. Sürüm 1.3'te fabrikadaki exe ajanı bu dosyalara doğrudan yazmaz, `/api/edge/ingest` üzerinden worker'a besler (`docs/13`). Sürüm 1.4'te `server/sim_bridge` aynı ucu prototip düzeyinde kabul eder; batch'i ayrı kayıt defterine yazar, bu JSON koleksiyonlarını değiştirmez (`docs/14`).

`docs/11` karşılaştırmasıyla `data/` altına 18 koleksiyon eklendi. Bunlar üretim olaylarının finansal karşılığıdır; ayrı bir veritabanı veya servis gerektirmezler.

| Koleksiyon | Görevi |
| --- | --- |
| `accounts.json` | 12 hesaplı örnek tekdüzen hesap planı |
| `customers.json`, `quotations.json`, `sales-orders.json` | Müşteri kartı, satış teklifi, sipariş ve kredi kontrolü |
| `purchase-requests.json`, `purchase-quotes.json` | Talep, onay ve tedarikçi teklifi |
| `invoices.json`, `journal-entries.json`, `payments.json` | Fatura, çift taraflı muhasebe fişi, tahsilat ve ödeme |
| `warehouses.json`, `stock-counts.json`, `reservations.json` | Depo, fiziki sayım ve sipariş rezervasyonu |
| `cost-records.json`, `budgets.json`, `period-closures.json` | Döküm kodu maliyeti, bütçe ve dönem kapanışı |
| `employees.json`, `shifts.json` | Personel ve vardiya; bordro harici servistedir |
| `integration-rules.json` | Tetikleyici başına üretilen kayıtların matrisi |

`validate_data.py` her fişte borç ile alacağın eşitliğini, `clientId` benzersizliğini, KDV ve fatura tutarlarını, maliyet kalemleri toplamını ve sayım farkını doğrular; mizan dengeli değilse dönem kapatılamaz. Prototipte aynı mantık `app/js/posting.js` içinde çalışır. Gerçek kurulumda bütün bu yazımlar `db/` içinde tek transaction ile yapılır.

