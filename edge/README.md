# ERP Edge Collector — fabrikadaki tek bilgisayar için veri toplama ajanı

Bu klasör, fabrikaya kurulan tek bilgisayarda çalışacak **exe programının** kaynağıdır. Görevi: ocak içi sıcaklık, alarm ve diğer sensör/PLC verilerini okumak, **yerel SQL veritabanına (SQLite)** yazmak ve yaptığımız **ERP sistemine göndermek**. Kendi Türkçe web arayüzü vardır.

> Önemli ayrım: bu exe, ERP'nin **kullanıcı arayüzü değildir**. ERP hâlâ tarayıcıdan açılan PWA'dır (`app/`). Bu program bir **kenar (edge) veri toplama ajanıdır**: operatörün veri girdiği ekran değil, makinelerle ERP arasındaki köprüdür. `docs/04` içindeki "istemcide exe yerine sunucuda servis" kararı bu nedenle ihlal edilmez; burada söz konusu olan istemci bilgisayarı değil, sahadaki **tek veri toplama bilgisayarıdır**. Gerekçe ve sınırlar `docs/13` içindedir.

---

## 1. Hızlı başlangıç (bu depoda, Linux/macOS/Windows)

```bash
python3 edge/main.py --dry-run          # tek döngü, hiçbir yere yazmaz
python3 edge/main.py --once             # tek döngü, SQLite + kuyruk
python3 edge/main.py --bind 0.0.0.0 --port 8787 --no-browser
```

Arayüz `http://127.0.0.1:8787` adresinde açılır. `--bind 0.0.0.0` yalnızca uzaktan önizleme içindir; üretimde arayüz `127.0.0.1`'e bağlı kalmalıdır.

## 2. Windows'ta .exe üretimi

```bat
cd edge
build_exe.bat
```

Betiğin yaptığı işler: PyInstaller'ı kurar (yalnızca üretim bilgisayarında), `erp-edge.spec` ile tek dosya üretir, `config/` ve `data/` klasörlerini yanına kopyalar. Çıktı:

```
dist\ERP-Edge-Collector.exe
dist\config\edge-config.json
dist\config\ornek-fabrika-profili.json
dist\data\edge.db            (ilk çalıştırmada oluşur)
dist\logs\agent.log
```

Fabrikadaki bilgisayarda **Python kurmak gerekmez**; exe kendi yorumlayıcısını taşır. Otomatik başlatma için yönetici PowerShell ile `install-task.ps1` çalıştırılır (oturum açılışında `--no-browser` ile başlar, çökerse 3 kez yeniden dener). Alternatif NSSM ile servis yapmaktır.

> Bu depo bir Linux sandbox'ta geliştirildiği için Windows `.exe` ikilisi buraya konmamıştır; kaynak, spec ve tek komutluk üretim betiği eksiksizdir. Windows'ta `build_exe.bat` ikiliyi üretir.

## 3. Ne okunur

| Kategori | İçerik | ERP'deki karşılığı |
| --- | --- | --- |
| Dört sinyal | `door`, `casting`, `alarm`, `running` | `signalStates` — `docs/08` Bölüm 4'teki kural korunur |
| Telemetri | `temperatureC` (ocak), `chamberTempC` (homojen), `oilTempC` (testere) | ölçüm kaydı; eşik aşımı bakım bildirimi taslağı |

Sıcaklık, konuşmadaki "firinin icindeki sicaklik bilgisi" isteğidir. **Beşinci bir kontrol sinyali değildir**: dört sinyal kuralı bozulmaz, ölçüm ayrı `kind: telemetry` alanında taşınır. Hangi ölçümün hangi makine tipinden alınacağı `config/edge-config.json` içindeki `telemetryProfiles` ile veridir; sabit makine kimliği yazılmaz. Alarm yine yalnızca **var/yok** bilgisidir; "ateşleyicilerden biri çalışmıyor" ayrıntısı kapsam dışıdır.

## 4. Nereye yazılır

1. **SQLite (`data/edge.db`, WAL).** `readings`, `events`, `outbox`, `runs`, `app_log`. Her satırda `client_id` benzersizdir; ajan yeniden başlasa veya aynı okuma iki kez gelse çift kayıt oluşmaz. `docs/09` içindeki "silme yerine doğrulama" ilkesi burada da geçerlidir: kuyruk kayıtları silinmez.
2. **ERP (`POST /api/edge/ingest`).** Tek yazma ucu. HMAC-SHA256 imza, `X-Edge-Client-Id` ve batch kimliği ile idempotenttir. ERP erişilemezse kayıt `queued` kalır, üstel geri çekilme ile yeniden denenir, azami deneme aşılınca `dead` işaretlenir ama **silinmez**.
3. Ajan **hiçbir zaman** stok, maliyet, fatura veya muhasebe tablosuna doğrudan yazmaz. ERP worker doğrular, `signalStates`, telemetri ve gerekiyorsa bakım bildirimi üretir (`docs/04` Bölüm 4, `docs/12` Bölüm 8).

## 5. Fabrika profili ile ilişki

`config/ornek-fabrika-profili.json`, `docs/12` içindeki `erp-plant-profile` paketinin bir kopyasıdır. Ajan makineleri, tipleri ve dört sinyalin PLC adreslerini buradan okur. Farklı bir fabrikaya gidildiğinde **yalnızca bu JSON değiştirilir**; 1 fırınlı veya 5 fırınlı park aynı exe ile çalışır. Devre dışı bırakılmış makineler (`decommissionedAt`) taranmaz, geçmiş kayıtları korunur.

## 6. Arayüz sekmeleri

| Sekme | İçerik |
| --- | --- |
| Genel Bakış | KPI'lar, canlı makine kartları (dört sinyal + sıcaklık), durum/eşik olayları, ajan günlüğü |
| Sensörler | Son okumalar (kalite, kaynak, birim), tarama döngüleri |
| SQL Veritabanı | Tablo şemaları, satır sayıları, `readings` son kayıtları, saklama temizliği |
| ERP Kuyruğu | Batch durumları, deneme sayıları, "Şimdi Gönder", gönderim sözleşmesi |
| Fabrika Profili | Profil özeti, adaptör sözleşmeleri, telemetri şablonları |
| Ayarlar | IP/port, adaptör, ERP URL, gizli anahtar, tarama aralığı, saklama süresi |

Üst çubuktaki **Bağlantıyı Test Et**, adaptörü ve ERP uç noktasını ayrı ayrı dener; **Şimdi Oku** tek döngü çalıştırır; **Durdur/Başlat** tarama işçisini kontrol eder.

## 7. Adaptörler

`simulated` hazırdır ve ağ olmadan dört sinyal + telemetri üretir; veriler `SIMULATED` kalitesiyle işaretlenir. `opcua` ve `modbus` **sözleşmeye hazırdır**: `connect / test / readFourSignals / readTelemetry / disconnect` arayüzünü taşır, sürücüleri sonraki aşamada takılır. Sürücü yoksa ajan hata verip kapanmaz, `MANUAL` yedeğe düşer ve bunu arayüzde sarı uyarı olarak gösterir. Bu, `app/js/adapters.js` ile aynı sözleşmedir.

## 8. Güvenlik ve işletme

- Arayüz üretimde yalnızca `127.0.0.1`'e bağlanır; fabrika dışına port açılmaz.
- ERP ile haberleşme LAN üzerinden, paylaşılan gizli anahtarla imzalıdır. Uzaktan erişim `docs/04` Bölüm 7'deki VPN + MFA + RBAC düzeniyle yapılır.
- Gizli anahtar arayüzde maskeli görünür, dokunulmazsa korunur.
- SQLite dosyası `server/erp/scripts/backup.py` ile düzenli yedeğe alınır; WAL modu ani elektrik kesintisinde bozulma riskini azaltır.
- `retentionDays` eski `readings` satırlarını temizler; `outbox`, `events` ve `runs` silinmez.

## 9. Testler

```bash
python3 tools/edge_smoke_test.py
```

12 test: konfigürasyon birleştirme, profil türetme ve dört sinyalin tamamlanması, adaptör yedeği, SQLite idempotency, durum değişimi ve eşik geçişi olayları, imzalı batch, çevrimdışı kuyruk, SQL şeması, `--dry-run`, exe üretim dosyaları ve yerel arayüzün 11 JSON ucu doğrulanır. Sonuç: `TÜM TESTLER GEÇTİ`.

## 10. Dosyalar

| Yol | İçerik |
| --- | --- |
| `main.py` | Giriş noktası, CLI, yaşam döngüsü |
| `erp_edge/config.py` | Tek JSON yapılandırma + profil okuma |
| `erp_edge/db.py` | SQLite şeması, WAL, idempotency, kuyruk |
| `erp_edge/adapters.py` | Üç adaptör ve ortak sözleşme |
| `erp_edge/collector.py` | Tarama, durum/eşik olayı, batch üretimi |
| `erp_edge/transport.py` | İmzalı gönderim, yeniden deneme |
| `erp_edge/server.py` | Yerel arayüz ve JSON API |
| `erp_edge/ui/` | HTML / CSS / JS arayüz |
| `erp-edge.spec`, `build_exe.bat`, `install-task.ps1` | Windows exe ve kurulum |
| `config/edge-config.json` | Fabrikaya göre düzenlenen tek ayar dosyası |
| `config/ornek-fabrika-profili.json` | `docs/12` profil paketinden üretilmiş örnek: 14 makine / 10 tag |
