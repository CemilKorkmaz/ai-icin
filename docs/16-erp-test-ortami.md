# 16 — Simülasyonu ERP Test Ortamına Çevirmek: Senaryolar, Olaylar ve Bildirimler (Sürüm 1.6)

**Amaç:** Kullanıcının simülasyonda yaptığı bir şeyin ERP'de görünmesini sağlamak. Örneğin simülasyonda bir fırında **sensör arızası** yaratıldığında ERP'de zil sayacı artar, ekranın üstünde kırmızı uyarı bandı çıkar, **PLC Durum** ekranında kalite `BAD` görünür ve **Bildirimler** merkezinde kayıt oluşur. Böylece gerçek fabrika bağlanmadan önce ERP'nin uçtan uca davranışı sınanır.

**Kapsam:** `Simulasyon/erp-simulasyon-denemesi-main` (FastAPI simülasyonu, `:8000`), `server/sim_bridge` (köprü + ERP Studio, `:8080`) ve `app/` (ERP arayüzü). Simülasyon yalnızca `localhost` üzerinde çalışır; internete açılmaz.

> **Temel kural:** Simülasyon olayı ERP'de **bildirim ve uyarı** üretir; stok, cari, muhasebe, satın alma veya üretim kaydı **oluşturmaz**. “İş akışı testleri” de aynı kurala uyar ve arayüzde `TEST` etiketiyle görünür.

---

## 1. Ne değişti?

Sürüm 1.5'te simülasyon yalnızca fırın sıcaklığı, durum ve emir yayınlıyordu; alarm paneli tarayıcıda tutuluyordu ve sayfa yenilenince kayboluyordu. Sürüm 1.6'da:

| Yetenek | Önce | Şimdi |
| --- | --- | --- |
| Fırın arızası | Yoktu; yalnızca sıcaklık sınırı aşılınca alarm | Sensör, aşırı sıcaklık, brülör, kapı ve döküm senaryoları tek tıkla |
| Sensör kalitesi | Yoktu | `sensor_ok` + `quality: BAD/SIMULATED`; trend donar, alarm kalır |
| Olay günlüğü | Tarayıcıda, sayfa yenilenince kaybolur | Sunucuda, artan kimlikli, son 300 olay |
| ERP bildirimi | Sadece canlı fırın kartında alarm metni | Bildirim merkezi + zil sayacı + kritik uyarı bandı + PLC ekranı |
| İş akışı bildirimleri | Yoktu | Stok, kalite, bakım, sevkiyat, cari, kredi, üretim için “TEST” olayları |
| Eşleme | “Biyet Isıtma Fırını” eşleşmiyordu | `biyet / ısıtma / billet` kuralı ile `FURNACE` makinesine eşleşir |

---

## 2. Veri akışı

```
Simülasyon ekranı (:8000)
   │  POST /api/scenarios {scenario, furnace}
   ▼
erp_backend + simulator/plant.py
   │  fırın durumunu değiştirir · olayı events[] içine yazar
   ▼
Köprü (:8080)
   │  GET /api/sim/events?after=…     (3 sn'de bir, ERP tarayıcısından)
   ▼
ERP Studio (app/js/sim_feed.js)
   │  yeni olay → addNotification({simEventId, type, title, body})
   ▼
Bildirim Merkezi · zil sayacı · kritik uyarı bandı · PLC Durum · Simülasyon Bağlantısı
```

Köprü tarayıcı ile simülasyon arasındaki tek kapıdır. Tarayıcı `:8000`'e doğrudan gitmez; CORS ve farklı port sorunu oluşmaz. WebSocket kullanılmaz; bağlantı kopunca sayfa yenilenmez.

---

## 3. Başlatma

1. **Simülasyon:** `Simulasyon/erp-simulasyon-denemesi-main` klasöründe `./start.sh 10` (Windows: `Baslat.bat` veya `bash start.sh 10`). `:8000` açılır; hız `10x` test için uygundur.
2. **Köprü:** Depo kökünde `python3 server/sim_bridge/run.py --open` veya çift tıkla `Baslat.bat` / `Baslat.command`. `:8080` açılır ve tarayıcı ERP'de açılır.
3. **İki sekme:** Simülasyon `http://localhost:8000`, ERP `http://localhost:8080/app/#/dashboard`. Simülasyon ekranının üstündeki **ERP'yi aç ↗** düğmesi de ERP'yi yeni sekmede açar.
4. **Doğrulama:** ERP'de üst çubukta **Canlı simülasyon** yazar; **Entegrasyon → Simülasyon Bağlantısı** ekranında eşleme `3/3` görünür.

> Simülasyon kapalıysa köprü `--demo` ile yerleşik kopyayı çalıştırır. Demo kopya da aynı senaryo ve olay uçlarını sunar; bkz. Bölüm 10.

---

## 4. Simülasyon ekranı: ERP Test Senaryoları paneli

Simülasyon ekranının en üstünde **ERP Test Senaryoları** bölümü vardır. Her fırın için ayrı düğme satırı bulunur:

| Düğme | Ne yapar | ERP'de ne görünür |
| --- | --- | --- |
| **Sensör** | Sıcaklık sensörü yanıt vermez; son değer donar, kalite `BAD` olur | Kritik bildirim, üstte kırmızı bant, PLC'de `Sensör BAD`, fırın kartında `alarm` |
| **Aşırı sıcaklık** | Sıcaklığı güvenlik sınırının üstüne çıkarır, brülörü kapatır | Kritik bildirim, `ALARM` durumu, brülör `KAPALI` |
| **Brülör** | Brülörü devre dışı bırakır; ısıtma yapılamaz | Kritik bildirim, `Brülör arıza` rozeti, bakım modülü kaynağı |
| **Kapı** | Kapı sinyalini `open` yapar, güvenlik gereği brülörü kapatır | Uyarı bildirimi, PLC'de `Kapı Durumu: Açık` |
| **Döküm** | Döküm/devrilme sinyalini `pouring` yapar | Bilgi bildirimi, PLC'de `Döküm Modu: Döküm Yapılıyor` |
| **Senaryoyu sıfırla** | Sensör, kapı, brülör ve alarmı temizler; fırın `KAPALI` ve ortam sıcaklığına döner | “Test senaryosu sıfırlandı” bilgisi; çalışan emir varsa `CANCELLED` |

Senaryo uygulanınca simülasyon ekranındaki **Olay Günlüğü** anında güncellenir; ayrıca fırın kartında `SENSÖR BAD`, `KAPI AÇIK`, `BRÜLÖR ARIZA`, `DÖKÜM` etiketleri çıkar. Sayfa yenilense de olaylar kaybolmaz; günlük sunucudadır.

### 4.1 İş akışı bildirim testleri

Aynı bölümün altındaki düğmeler yalnızca **bildirim** üretir. Amaç, ERP'nin bildirim merkezini ve uyarı bandını işletme kaydı oluşturmadan sınamaktır:

| Düğme | ERP kaynağı | Önem |
| --- | --- | --- |
| Kritik stok uyarısı | Stok | Uyarı |
| Kalite reddi | Partiler | Kritik |
| Bakım gecikmesi | Bakım | Uyarı |
| Sevkiyat onayı | Sevkiyat | Bilgi |
| Vadesi geçen cari | Finans | Uyarı |
| Kredi limiti | Cariler | Kritik |
| Üretim emri hazır | Üretim | Bilgi |

Bu olayların `data` alanında `test: true` ve `createsRecord: false` bulunur. ERP'de bildirim gövdesinde **“TEST — yalnızca bildirim üretir, işletme kaydı oluşturmaz.”** yazar.

---

## 5. ERP'de nereye bakılır?

| Yer | Ne görünür | Nasıl açılır |
| --- | --- | --- |
| **Zil sayacı** | Okunmamış simülasyon bildirimi sayısı | Üst çubuk, zil simgesi |
| **Kritik uyarı bandı** | En güncel okunmamış kritik/uyarı bildirimi; “Bildirimler”, “PLC ekranı”, “Okundu” düğmeleri | Her ekranın üstü, sayfa başlığının hemen altı |
| **Bildirimler** | Kaynak `Simülasyon · <fırın>`, önem, saat, gövde | Zil → **Bildirim Merkezi** veya **Sistem → Bildirimler & Giden Kutu** |
| **PLC Durum** | Kapı, döküm, alarm ve çalışma sinyalleri; kalite `BAD`; sıcaklık telemetrisi | **Mühendislik → PLC Durum** |
| **Makine Parkı** | Sensör BAD / kapı açık / brülör arıza rozetleri, alarmlı kart | **Mühendislik → Makine Parkı** |
| **Simülasyon Bağlantısı** | Son simülasyon olayları tablosu, fırınlar, eşleme | **Entegrasyon → Simülasyon Bağlantısı** |
| **Üretim Akışı** | Simülasyon emirleri `Oluşturuldu → Çalışıyor → Tamamlandı` kolonlarında, salt okunur | **Üretim → Üretim Akışı** |
| **Panel** | Canlı fırınlar, açık emirler ve alarm özeti | **Panel** |

**Bildirim neden tekrar etmez?** Her olayın artan bir `id` değeri vardır. ERP son gördüğü kimliği tarayıcıda saklar (`erp_sim_last_event_v1`) ve aynı olayı ikinci kez bildirime dönüştürmez. Simülasyon yeniden başlayıp kimlikler `1`'e dönerse ERP bunu algılar ve sıfırdan okur.

**Bildirimler neden kalıcı?** Bildirimler ERP'nin kendi demo verisinde (`localStorage`) tutulur. **Ayarlar → Demo Verisini Sıfırla** bildirimleri de temizler; simülasyon olay günlüğü ise sunucuda kalır ve son 300 olayı saklar.

---

## 6. API ile aynı senaryolar

Senaryolar arayüz olmadan da çalıştırılabilir. Doğrudan simülasyon:

```bash
# Senaryo kataloğu
curl http://localhost:8000/api/scenarios

# Sensör arızası
curl -X POST http://localhost:8000/api/scenarios \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"sensor_failure","furnace":"Biyet Isıtma Fırını"}'

# Sıfırla
curl -X POST http://localhost:8000/api/scenarios \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"reset","furnace":"Biyet Isıtma Fırını"}'

# Olaylar (ERP'nin okuduğu uç)
curl 'http://localhost:8000/api/events?after=0&limit=50'
```

Köprü üzerinden (ERP'nin kullandığı yol):

```bash
curl http://localhost:8080/api/sim/scenarios
curl -X POST http://localhost:8080/api/sim/scenarios \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"burner_failure","furnace":"Homojenizasyon Fırını"}'
curl 'http://localhost:8080/api/sim/events?after=0'
```

`POST /api/sim/scenarios` gövdesinde `furnace` yoksa ve senaryo iş akışı testlerinden biriyse yalnızca bildirim olayı üretilir; fırın senaryosunda `furnace` zorunludur.

### 6.1 Olay biçimi

```json
{
  "id": 7,
  "at": "2026-11-24T15:03:38+00:00",
  "type": "scenario_sensor_failure",
  "severity": "critical",
  "module": "plc",
  "title": "Sensör arızası",
  "message": "Biyet Isıtma Fırını: Sıcaklık sensörü arızalı; son geçerli sıcaklık korunuyor.",
  "code": "SENSOR_FAILURE",
  "furnace": "Biyet Isıtma Fırını",
  "data": { "scenario": "sensor_failure", "quality": "BAD" }
}
```

ERP `severity` alanını şöyle eşler: `critical` → kırmızı/kritik, `warning` → sarı/uyarı, `info` → mavi/bilgi, `success` → yeşil. Bilinmeyen önem `info` sayılır.

---

## 7. Üretim emri yaşam döngüsü

Simülasyon ekranındaki **Üretim Emirleri** tablosunda emir oluşturulur ve ilgili fırından **Başlat** ile çalıştırılır. Emir önce `CREATED`, sonra `RUNNING`, süre dolunca `COMPLETED` olur; alarm/arıza sıfırlamasında `CANCELLED` olabilir.

ERP bu emirleri **Üretim Akışı** ekranında dört kolonda gösterir: Oluşturuldu, Çalışıyor, Tamamlandı, İptal. Emirler salt okunurdur; ERP'den simülasyona emir yazılmaz (köprü yalnızca okur ve kullanıcının açık eylemiyle kendi emir uçlarını kullanır).

Önemli kural: **Arızalı fırında emir başlatılamaz.** Sensör, kapı veya brülör arızası sıfırlanmadan `Başlat` isteği reddedilir; bu, gerçek güvenlik mantığının testidir.

---

## 8. Uçtan uca test — 5 dakikalık oynatma

1. Simülasyonu `10x` hızla, köprüyü `--demo` olmadan açın; ERP'de **Canlı simülasyon** yazdığını doğrulayın.
2. ERP'de zili ve **Bildirimler** ekranını açık bırakın.
3. Simülasyon sekmesinde `Aluminyum Eritme Fırını → Sensör` düğmesine basın.
4. ERP'ye dönün: zil sayacı arttı, üstte **Sensör arızası · Aluminyum Eritme Fırını** bandı çıktı, bildirim listesinde kaynak `Simülasyon · Aluminyum Eritme Fırını` göründü.
5. **PLC ekranı** düğmesine basın: alarm `Sensör BAD`, kalite `BAD`, sıcaklık telemetrisi son değerde donmuş.
6. Simülasyonda `Senaryoyu sıfırla` deyin; ERP'de “Test senaryosu sıfırlandı” bilgisi düşer, PLC normale döner.
7. Simülasyonda `Homojenizasyon Fırını` için kısa süreli (ör. `1` dk) bir emir oluşturup **Başlat** deyin. ERP **Üretim Akışı** ekranında emri `Çalışıyor` kolonunda görün.
8. `Biyet Isıtma Fırını → Döküm` deyin; PLC'de `Döküm Modu: Döküm Yapılıyor`, kapı `Kapalı`, bildirim bilgi türünde.
9. **Bildirimler** ekranında satıra tıklayıp okundu işaretleyin; zil sayacı azalır, bant kaybolur.
10. İş akışı testlerinden **Kredi limiti** deyin; kritik bildirim gelir, ancak stok/cari/muhasebe ekranlarında yeni kayıt **oluşmaz**.

---

## 9. Ne yazılmaz? (sınırlar)

* Simülasyon olayı **stok hareketi**, **satın alma emri**, **cari fiş**, **muhasebe kaydı**, **döküm partisi** veya **sevkiyat** oluşturmaz.
* Bildirimler ERP'nin tarayıcı demo verisinde tutulur; başka bir tarayıcıya veya sunucuya taşınmaz.
* Sensör arızası sıcaklığı “gerçek” olarak değiştirmez; okuma geçersiz olduğu için son değer dondurulur. Bu, gerçek PLC'deki `BAD` kalitesinin karşılığıdır.
* Aşırı sıcaklık senaryosu fırın sıcaklığını güvenlik sınırının üstüne çıkarır; ardından soğuma modeli devreye girer ve alarm kendiliğinden temizlenebilir. Sensör/kapı/brülör arızaları ise **sıfırlanana kadar** alarmda kalır.
* Sıfırlama, çalışan emri yalnızca bellekte değil SQLite kaydında da `CANCELLED` yapar; böylece emir listesi ile kalıcı özet çelişmez.
* Simülasyon emirleri ve olayları bellekte tutulur; simülasyon süreci kapanınca kaybolur. Kalıcı kayıt simülasyonun kendi SQLite dosyasındadır, ERP'ye taşınmaz.
* Bu bir üretim hattı değildir. Gerçek PLC'ye geçiş için `docs/13` ve `docs/14` Bölüm 13'e bakın.

---

## 10. Demo kopya ile çalışma

Simülasyon kapalıyken köprü yerleşik demo kopyayı başlatır:

```bash
python3 server/sim_bridge/run.py --demo --demo-speed 10
```

Demo kopyada fırın adları `Aluminyum Eritme Fırını`, `Homojenizasyon Fırını`, `Yaşlandırma Fırını`'dır; aynı `/api/scenarios`, `/api/events` uçlarını **ve simülasyon ekranını** (`:8000/`) sunar. Senaryolar gerçek simülasyondaki gibi çalışır; ERP'de aynı bildirimler görünür. Fark: demo kopyanın ısı modeli ve SQLite'ı yoktur, veriler yalnızca bellekte tutulur.

---

## 11. Otomatik doğrulama

```bash
python3 tools/check_all.py                # 5 adım: veri + simülasyon + köprü + edge + arayüz
python3 tools/simulation_smoke_test.py    # 11 test: fizik, doğrulama, senaryo, iptal, SQLite
python3 tools/sim_bridge_smoke_test.py    # 20 test: senaryo, olay, eşleme, proxy, HMAC, başlık
python3 tools/edge_smoke_test.py          # 13 test: edge ajanı ve dört sinyal
node tools/smoke_test.mjs                 # 35 ekran + simülasyon bildirimi tekilleştirme
python3 server/erp/scripts/validate_data.py
```

Köprü testi gerçek FastAPI gerektirmez; demo motoru ve sahte istemcilerle ağ davranışını sınar. Sürüm 1.7 denetiminde eklenen girdi doğrulama, güvenlik başlıkları, varsayılan anahtar uyarısı ve SQLite sütun beyaz listesi testleri de bu paketlerdedir (`docs/17`). `node tools/smoke_test.mjs` simülasyon olayının bildirim merkezine düştüğünü, aynı olayın ikinci kez eklenmediğini ve kaynak etiketini doğrular.

---

## 12. Sorun giderme

| Belirti | Olası neden | Çözüm |
| --- | --- | --- |
| Simülasyon ekranında senaryo paneli yok | Eski simülasyon sürümü çalışıyor | `Simulasyon/erp-simulasyon-denemesi-main` güncel kodla yeniden başlatılır; `/api/scenarios` 200 dönmeli |
| ERP'de zil artmıyor | Köprü eski sürüm (1.5) veya simülasyon kapalı | Köprüyü yeniden başlatın; `/api/sim/events` yanıtını kontrol edin |
| Bildirim geliyor ama bant yok | Bildirim okunmuş veya `info` türünde | **Bildirimler**'de okunmamış kritik/uyarı kaydı olmalı; bilgi türü bant üretmez |
| Aynı olay iki kez düştü | Tarayıcı depolaması temizlendi veya farklı tarayıcı | Tekilleştirme tarayıcı başına çalışır; normaldir |
| Sensör sıfırlanmıyor | `reset` yanlış fırına uygulandı | Fırın adını birebir seçin; `/api/furnaces` adlarıyla eşleşmeli |
| Eşleme 3/3 değil | Profilde boş `FURNACE` yok veya ad tanınmıyor | **Simülasyon Bağlantısı → eşleme** tablosuna bakın; `biyet / ısıtma` kuralı v1.6'da eklendi |
| Sayfa sürekli yenileniyor | Eski WebSocket davranışı | Bu sürümde WebSocket yok; service worker önbelleğini temizleyip sayfayı bir kez yenileyin |

---

## 13. İlgili belgeler

* `docs/14-simulasyon-baglantisi.md` — köprü, proxy, edge ingest ve eşleme.
* `docs/15-erp-sistemi-kapsamli-ozet.md` — ERP'nin genel kapsamı ve ekran envanteri.
* `docs/13-edge-veri-toplama-ajani.md` — saha ajanı ve gerçek PLC'ye geçiş.
* `README.md` — hızlı başlatma ve test komutları.
