# 09 — Olay Tabanlı JSON Arşivleme ve Kuyruk Mimarisi

Bu doküman, saha görüşmesinde en çok tekrarlanan soruya cevap verir: "Bunların hepsini bir JSON'a yazıyoruz, hepsinden birer tane satır düşüyoruz. Nasıl bir dosyalama, nasıl bir arşivleme yapmamız gerekiyor? Hangisi satırlarda ne bilgiler yazacak? İş böyle oldu mu kabarıyor."

Şekil ve şema çizilmez. Akış sıralı maddelerle, dosya yapısı ve olay alanları tablolarla anlatılır.

---

## 1. Konuşmadaki tarif ve kabul edilen teknik düzeltme

Abinin tarif ettiği çalışma biçimi şöyledir: operatör HTML arayüzünde bir tuşa basar, bir JSON kaydı oluşur. Merkezi yazılım arşivdeki ilgili JSON'ları tarar, yeni bir kayıt görürse alır, hesapları yapar, sonuçları gerekli yerlere yazar ve kaydı işlem kuyruğundan kaldırır. Arayüzde 1 ilâ 3 saniyelik bir bekleme mesajı gösterilir. Tarama çevrimi 1 saniye veya anlık 3 saniye olarak düşünülmüştür. Ayrıca net bir ayrım vardır: **JSON dosyalarını HTML arayüzleri yalnızca okur; arayüz bir şey yazacaksa ayrı bir kuyruğa yazar.**

Bu tarif doğrudur ve korunur. Yalnızca bir noktada teknik düzeltme yapılır: işlenen kayıt **silinmez**. Silme yerine şu sıra uygulanır:

1. Kuyruk kaydı `pending` durumundayken atomik olarak `processing` durumuna alınır.
2. Hesaplar yapılır ve sonuç olayları üretilir.
3. Olaylar kalıcı arşive append-only biçimde yazılır, dosya `fsync` ile diske sabitlenir.
4. Yazılan dosyanın SHA-256 sağlama toplamı hesaplanıp `checksums` dosyasına eklenir.
5. Ancak bundan sonra kuyruk kaydı `archived` durumuna geçirilir ve `processed/` klasörüne taşınır.
6. Hata oluşursa kayıt `dead-letter/` klasörüne `lastError` bilgisiyle taşınır, `retryCount` artar.

Gerekçe: elektrik kesintisi, disk doluluğu veya yazılım hatasında silinmiş bir kayıt geri getirilemez; üretim kaydı kaybolur ve kütle dengesi kapanmaz. Düzenleme sitesinin bu konudaki önerisi yerindedir ve bu projeye alınmıştır.

**İkinci karar:** JSON, veri alışverişi ve arşiv formatıdır; kalıcı işlemsel kayıt alanı SQLite veya PostgreSQL veritabanıdır. Bu, `docs/04` Bölüm 5'teki kararla aynıdır. Prototipte veritabanı yerine tarayıcı `localStorage`'ı kullanılır; sunucu tarafındaki `event_worker.py` dosya tabanlı referans uygulamadır.

---

## 2. Her aşamadan bir satır: olay günlüğü

Kayıtlar tek bir büyük "döküm JSON'u" olarak sürekli üzerine yazılmaz. Her işlem, döküm koduna bağlı **bir olay satırı** olarak eklenir. Böylece dosya kabarmaz, geçmiş değiştirilemez, "homojeni açtıktan sonra bir şey oldu" gibi sonradan gelen bilgiler doğrudan yeni satır olarak eklenir. Bu, konuşmadaki "modifiye ettik, sonra bir şey oldu, bunları nasıl tutacağız" endişesinin çözümüdür.

### 2.1 Olay satırı şeması

| Alan | Tip | Açıklama |
| --- | --- | --- |
| `id` | string | Olay kimliği, örn. `EV-000014` |
| `seq` | integer | Döküm kodu içinde artan sıra numarası |
| `lotId` | string | Döküm kodu, örn. `DK-2026-0133` |
| `plantId` | string | Fabrika profili |
| `machineId` | string | Olayın gerçekleştiği makine (yoksa null) |
| `type` | string | Olay türü, aşağıdaki listeden |
| `at` | string | ISO 8601 zaman damgası, saat dilimiyle |
| `actor` | string | Operatör / kullanıcı / `system` / `plc` / `worker` |
| `source` | string | `MANUAL`, `PLC`, `WORKER`, `IMPORT` |
| `grossTon` | number | İşlem öncesi kütle |
| `deltaTon` | number | Bu olayda değişen kütle (negatif düşüş) |
| `balanceTon` | number | İşlem sonrası bakiye |
| `materialId` | string | İlgili malzeme / yan ürün kartı |
| `fate` | string | `remelt`, `recycle`, `sale`, `waste`, `product` |
| `ref` | string | Belge no, kantar fişi, parti kodu |
| `payload` | object | Olaya özgü ölçüm ve parametreler |
| `note` | string | Serbest açıklama |
| `clientId` | string | Tekrar gönderimde aynı olayın iki kez yazılmaması için istemci anahtarı |
| `checksum` | string | Satırın SHA-256 değeri |

Zaman damgaları her zaman ISO 8601 ve `+03:00` biçimindedir. Kütleler `ton` veya `kg` olarak **birim alanıyla birlikte** yazılır; birimsiz sayı kabul edilmez. Bu, `docs/04` Bölüm 5.2'deki JSON sözleşmesinin devamıdır.

### 2.2 Olay türleri

| Tür | Ne zaman | Zorunlu payload |
| --- | --- | --- |
| `CAST_START` | Döküm kodu açıldı | `machineId`, `alloy`, `grossTon` |
| `TRANSFER` | Metal başka ocağa aktarıldı | `toMachineId`, `deltaTon` |
| `PATH_HOLD` | Yollukta metal tutuldu | `pathId`, `holdTon` |
| `CAST_NET` | Fiilen dökülen miktar | `diameterMm`, `castLengthMm`, `count` |
| `CUT_START` | Testere kesimi başladı | `sawId`, `bladeMm` |
| `HEAD_CUT` | Kafa kesimi ayrıldı | `headMm`, `headPerBillet`, `headKg` |
| `SAWDUST` | Talaş ayrıldı | `bladeMm`, `cuts`, `sawdustKg` |
| `SCRAP_BILLET` | Fire biyet | `scrapKg`, `reason` |
| `NET_BILLET` | Net ürün tonajı ve adedi | `count`, `productLengthMm`, `netTon` |
| `GEOMETRY_MISMATCH` | Geometri ile tartım uyuşmadı | `expectedTon`, `recordedTon`, `deviationPct` |
| `OIL_WARNING` | Yağ eşiğine gelindi | `cutsSinceFill`, `cutsPerTank` |
| `BLADE_WARNING` | Bıçak ömrü doldu | `cutsSinceChange`, `maxCuts` |
| `MAINTENANCE` | Dolum / değişim / bakıma gönderme | `kind`, `bladeNo` |
| `HOMOGEN_START` | Parti başladı | `batchId`, `recipeId`, `lots[]`, `plannedMinutes` |
| `HOMOGEN_OVERRUN` | Süre doldu, fırın hâlâ çalışıyor | `elapsedMinutes`, `plannedMinutes` |
| `HOMOGEN_END` | Parti bitti | `actualMinutes`, `overrunMinutes` |
| `COOLING_END` | Soğutma tamamlandı | `method`, `targetTempC` |
| `PACKING_END` | Paketleme tamamlandı | `packageCount` |
| `SHIPMENT` | İki onay sonrası sevk | `shipmentId`, `weighbridgeKg` |
| `SIGNAL_DOOR` | PLC kapı sinyali | `value` |
| `SIGNAL_CASTING` | PLC döküm modu / devrilme | `value` |
| `SIGNAL_ALARM` | PLC alarm | `value` |
| `SIGNAL_RUNNING` | PLC çalışma durumu | `value` |

### 2.3 Örnek olay zinciri

Aşağıdaki satırlar, `docs/07` Bölüm 5'teki 21 tondan 14 tona inen zincirin arşivdeki karşılığıdır. Her satır kendi bakiyesini taşır; hiçbiri bir öncekinin üzerine yazılmaz.

| seq | type | deltaTon | balanceTon | fate |
| --- | --- | --- | --- | --- |
| 1 | `CAST_START` | +21,000 | 21,000 | product |
| 2 | `TRANSFER` | −3,000 | 18,000 | remelt |
| 3 | `PATH_HOLD` | −1,000 | 17,000 | recycle |
| 4 | `CAST_NET` | 0 | 17,000 | product |
| 5 | `HEAD_CUT` | −2,850 | 14,150 | remelt |
| 6 | `SAWDUST` | −0,035 | 14,115 | sale |
| 7 | `SCRAP_BILLET` | −0,115 | 14,000 | remelt |
| 8 | `NET_BILLET` | 0 | 14,000 | product |

5, 6 ve 7 numaralı değerler **örnek dağılımdır**; gerçek kurulumda her biri ölçülerek girilir. Dağılım girilmezse `balanceGap` açıkça gösterilir ve kütle dengesi uyarısı üretilir. Konuşmada 17'den 14'e düşüşün nedeni verilmediği için sistem bu üç kalemi asla tek bir "kafa" değeriyle doldurmaz.

---

## 3. Kuyruk kaydı şeması (`inbox`)

Arayüzün yazdığı kayıt, arşiv olayından ayrı bir nesnedir.

| Alan | Açıklama |
| --- | --- |
| `clientId` | İstemcinin ürettiği benzersiz anahtar; idempotency için kullanılır |
| `type` | Üretilecek olay türü |
| `lotId` | İlgili döküm kodu |
| `createdAt` | ISO 8601 |
| `source` | `HTML` veya `HMI` |
| `payload` | Form verisi |
| `schemaVersion` | Şema sürümü |

Kuyruk dosya adı `{createdAt-tarih}_{clientId}.json` biçimindedir. Aynı `clientId` ikinci kez gelirse worker kaydı işlemez ve `duplicate` olarak işaretler; böylece operatör butona iki kez basarsa çift stok hareketi oluşmaz.

---

## 4. Dosyalama yapısı

Dosyalar düz bir klasöre yığılmaz; yıl, ay ve döküm kodu bazında bölünür. Bu, "iş böyle oldu mu kabarıyor" sorusunun ikinci cevabıdır.

| Yol | İçerik |
| --- | --- |
| `server/erp/inbox/` | Arayüzün yazdığı `pending` kayıtları |
| `server/erp/inbox/processing/` | Worker'ın üzerinde çalıştığı kayıtlar |
| `server/erp/inbox/processed/` | Arşivlendikten sonra taşınan kayıtlar |
| `server/erp/inbox/dead-letter/` | Hatalı, yeniden denenecek kayıtlar |
| `server/erp/inbox/examples/` | Belgelenmiş örnek kayıtlar (sürüm kontrolünde) |
| `server/erp/archive/2026/11/DK-2026-0133/events.jsonl` | Döküm kodunun tüm olay satırları |
| `server/erp/archive/2026/11/DK-2026-0133/snapshot.json` | Son durum özeti (okuma kolaylığı için) |
| `server/erp/archive/2026/11/checksums.sha256` | Gün/ay bazlı sağlama toplamları |
| `server/erp/data/*.json` | Koleksiyonların güncel görünümü (`node tools/export_seed.mjs` ile üretilir) |
| `server/erp/db/` | Kalıcı veritabanı (gerçek kurulum; prototipte yer tutucu) |
| `server/erp/backups/` | `backup.py` çıktıları |
| `server/erp/logs/` | Worker ve yedekleme günlükleri |

`events.jsonl` her satırında tek bir JSON nesnesi bulunan, yalnızca sonuna ekleme yapılan bir dosyadır. `snapshot.json`, olaylar yeniden oynatılarak her zaman üretilebilir; bu yüzden yedeği zorunlu değildir, yalnızca hızlı okuma içindir. Arşiv dizinleri `.gitignore` ile sürüm kontrolü dışında tutulur; `README.md` ve örnek kayıtlar takip edilir.

---

## 5. Worker'ın çalışma sırası

`server/erp/scripts/event_worker.py` standart kütüphane ile yazılmış, çalışan bir referans uygulamadır. Sıra şöyledir:

1. `inbox/` klasörünü `pollSeconds` aralığında tarar (varsayılan 1 saniye, `--interval 3` ile değişir).
2. Dosyayı atomik `os.replace` ile `processing/` altına alır. Aynı anda iki worker çalışırsa yalnızca biri dosyayı kapar.
3. JSON'u doğrular: `schemaVersion`, zorunlu alanlar, `clientId` benzersizliği, sayısal alanların birimi.
4. `docs/07` formülleriyle hesapları yapar; gerekirse `HEAD_CUT`, `SAWDUST`, `NET_BILLET` gibi birden fazla olay üretir.
5. Olayları `archive/YYYY/MM/{lotId}/events.jsonl` dosyasına ekler, `fsync` uygular.
6. `snapshot.json` dosyasını günceller, `checksums.sha256` yazar.
7. Kuyruk kaydını `archived` durumuna getirip `processed/` altına taşır.
8. Hata varsa `dead-letter/` altına taşır, `retryCount` ve `lastError` yazar; `--max-retry` değeri aşıldıysa bakım bildirimi üretir.
9. Bütün adımlar `logs/event_worker.log` dosyasına yazılır.

`--dry-run` ile hiçbir dosya taşınmaz, yalnızca yapılacak işlemler raporlanır. `--once` tek tur çalışır; varsayılan sürekli çevrimdir. Prototipte 1–3 saniyelik bekleme mesajı, arayüzdeki "Kaydediliyor…" durumu olarak gösterilir; gerçek sistemde bu süre worker'ın polling aralığına karşılık gelir.

---

## 6. İzlenebilirlik sorguları

Olay günlüğü sayesinde tek bir döküm kodu üzerinden şu sorular yanıtlanır:

1. Hangi fırında, hangi döküm yolundan, hangi alaşımla ve hangi reçeteyle üretildi?
2. 21 ton metalin hangi bölümü aktarıma, yolluğa, kafaya, talaşa ve fire biyete gitti?
3. Hangi testerede kaç kesim yapıldı, yağ ve bıçak sayaçları o anda kaçtı?
4. Hangi homojenizasyon partisi hangi döküm kodlarından kaçar adet aldı, planlanan ve gerçekleşen süre neydi?
5. Soğutma ve paketleme ne zaman bitti, hangi sevkiyatla ve hangi kantar fişiyle çıktı?
6. Arada PLC alarmı veya süre aşımı oldu mu, operatör ne zaman müdahale etti?

`Olay & Arşiv Görüntüleyici` ekranı bu zinciri satır satır, bakiye sütunuyla birlikte gösterir. Raporlar ekranı aynı olaylardan günlük, haftalık ve aylık özetleri üretir. Verinin tek kaynağı olay günlüğüdür; özet ekranları yeniden hesaplanabilir.

---

## 7. Yedekleme, geri yükleme ve denetim

`backup.py` artık yalnızca `data/` klasörünü değil, `archive/`, `inbox/processed/` ve `checksums.sha256` dosyalarını da kapsar. 3-2-1 politikası korunur: üç kopya, iki farklı ortam, biri harici disk veya uzak konum. Her yedekten sonra sağlama toplamları doğrulanır ve ayda bir **geri yükleme tatbikatı** yapılır.

Denetim izi değiştirilemez: bir olay düzeltilmek istenirse satır silinmez, `CORRECTION` türünde ters işlem içeren yeni bir olay eklenir. Böylece "kim, ne zaman, neyi değiştirdi" sorusu her zaman cevaplanır. Bu kural, iki kademeli sevkiyat onayı ve kullanıcı/rol ayrımıyla birlikte `docs/04` Bölüm 9'daki güvenlik kararlarını tamamlar.

---

## 8. Prototipin sınırları

Bu depodaki uygulama, tarayıcı `localStorage`'ı üzerinde çalışan bir plan doğrulama aracıdır. `event_worker.py` dosya tabanlı, bağımlılıksız ve gerçekten çalışan bir referans uygulamadır; ancak üretim kurulumunda yerini API + veritabanı + kuyruk servisine bırakır. Gerçek OPC UA / Modbus sürücüsü, SMTP/SMS sağlayıcısı, VPN/MFA/RBAC altyapısı ve PLC donanımı bu prototipe bağlı değildir. Bu sınırlar bilinçlidir ve `docs/10` içindeki yol haritasında aşama aşama kaldırılır.
