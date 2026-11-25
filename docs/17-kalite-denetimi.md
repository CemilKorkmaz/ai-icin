# 17 — Uçtan Uca Kalite Denetimi ve Sertleştirme (Sürüm 1.7)

**Amaç:** ERP prototipini, saha veri toplama ajanını, simülasyon köprüsünü ve kullanıcı fırın simülasyonunu baştan aşağı yeniden denetlemek; bulunan kusurları testle kanıtlayarak düzeltmek ve kalan riskleri açıkça kayda geçirmek. Bu doküman bir pazarlama özeti değil, **denetim izi**dir: her bulgu, düzeltme ve doğrulama komutu birlikte yazılır.

**Kime hitap eder:** Sistemi teslim alacak teknik ekip, fabrika BT sorumlusu ve üretim yöneticisi.

---

## 1. Denetim yöntemi

Denetim, `github.com/affaan-m/ECC` deposunun çalışma yönteminden **ilham alınarak** yapıldı. ECC bir ajan çalıştırma ortamıdır (skills, instincts, memory, güvenlik, araştırma-önce geliştirme); ERP'ye kurulan bir bağımlılık değildir. Bu depoya uyarlanan beş ilke:

| İlke | Bu depodaki karşılığı |
| --- | --- |
| **Araştırma önce** | Önce depo, veri, uçlar ve mevcut testler okundu; sonra değişiklik yapıldı. Varsayımla düzeltme yapılmadı. |
| **En az yetki** | Köprü yalnızca belgelenen REST uçlarını kullanır; statik yayın yalnızca `/app/` ve `index.html`; SQLite yazımı sütun beyaz listesiyle sınırlıdır. |
| **Kanıtla doğrula** | Her düzeltme için test eklendi veya mevcut test çalıştırıldı; "çalışıyor" ifadesi test çıktısına bağlandı. |
| **Hafıza ve gerileme** | Bulgular numaralandırıldı; düzeltmeler testlere bağlandı; aynı hatanın geri dönmesi kalite kapısında yakalanır. |
| **Tek kapı** | Dağınık komutlar yerine `tools/check_all.py`; CI aynı komutu çalıştırır. |

**Sınır:** ECC'nin ajan/otomasyon araçları bu depoya eklenmedi. Amaç araç ithal etmek değil, denetimi tekrarlanabilir ve kanıtlı yapmaktır.

---

## 2. Kapsam ve kanıt tabanı

| Katman | İncelenen | Kanıt |
| --- | --- | --- |
| ERP verisi | 59 JSON varlık, şema sürümü 4, mizan, stok/maliyet zinciri | `server/erp/scripts/validate_data.py` |
| ERP arayüzü | 35 ekran, 11 JSON ucu, canlı mod, bildirim tekilleştirme | `tools/smoke_test.mjs` |
| Simülasyon çekirdeği | Fırın fiziği, emir yaşam döngüsü, senaryolar, olay günlüğü, SQLite | `tools/simulation_smoke_test.py` |
| Simülasyon köprüsü | REST proxy, eşleme, HMAC ingest, statik yayın, yol güvenliği | `tools/sim_bridge_smoke_test.py` |
| Edge ajanı | Dört sinyal, SQLite kuyruğu, imzalı gönderim, adaptörler | `tools/edge_smoke_test.py` |
| Dokümanlar | 00–17 numaralı dosyalar ve birleşik DOCX | `tools/build_docx.py` |
| İşletim | CI, sürüm damgaları, yeniden üretilebilirlik | `.github/workflows/ci.yml`, `tools/check_all.py` |

---

## 3. Bulgular ve düzeltmeler

Şiddet ölçeği: **Yüksek** = yanlış veri veya yetkisiz erişim; **Orta** = hizmet reddi, sızıntı veya tekrarlanamayan kurulum; **Düşük** = bakım/performans; **Bilgi** = kabul edilen tasarım sınırı.

| No | Şiddet | Bulgu | Düzeltme | Kanıt |
| --- | --- | --- | --- | --- |
| K-01 | Yüksek | Varsayılan HMAC anahtarı (`degistirin-bu-gizli-anahtari`) fark edilmeden saha kurulumuna taşınabilir. | Anahtar kaldırılmadı (demo ve mevcut kurulumlarla uyumluluk); köprü `/api/health` ve `/api/bridge/info` içinde `DEFAULT_EDGE_SECRET` uyarısı yayınlıyor. Uzak simülasyon adresi için `REMOTE_SIM_NO_AUTH` uyarısı eklendi. | `sim_bridge_smoke_test.py::test_11b` |
| K-02 | Yüksek | Simülasyon API'si geçersiz emri kabul ediyordu: olmayan fırın, 0/negatif veya 1300 °C hedef, 0 veya 2000 dk süre. | `Plant.create_order` ve Pydantic `OrderIn` iki katmanda doğruluyor; API 400 döndürüyor. | `simulation_smoke_test.py::test_gecersiz_emir_reddedilir`, `test_08d` |
| K-03 | Yüksek | `reset` senaryosu çalışan emri bellekte `CANCELLED` yapıyor, SQLite'ta `RUNNING` bırakıyordu. | `apply_scenario` iptal edilen kimlikleri döndürüyor; API kalıcı kaydı da `CANCELLED` yapıyor. | `simulation_smoke_test.py::test_sifirlama_calisan_emri_iptal_eder` |
| K-04 | Orta | `Database.update_order` alan adlarını doğrudan SQL'e ekliyordu; ileride kullanıcı girdisi geçerse enjeksiyon riski. | Sütun beyaz listesi (`ORDER_COLUMNS`); bilinmeyen alan `ValueError`. | `test_emir_alanlari_beyaz_liste` |
| K-05 | Orta | `/api/readings/{furnace}?limit=` sınırsızdı; çok büyük istek belleği zorlayabilirdi. | API 1–500, SQLite katmanı 1–1000 aralığına kırpıyor. | `test_okuma_limiti_sinirlanir` |
| K-06 | Orta | Köprü, simülasyon, demo ve edge yanıtlarında MIME sniffing / referer sızıntısı başlıkları yoktu. | `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` dört sunucuya eklendi. | `test_11b`, demo/köprü başlık testleri |
| K-07 | Orta | Negatif `Content-Length` gövde okumasında `read(-1)` ile tüm akış okunabilirdi; demo gövdesi sınırsızdı. | Negatif/sıfır uzunluk boş gövde; demo 1 MiB, köprü `edge.maxBodyBytes` (5 MiB) sınırı. | `sim_bridge_smoke_test.py`, `edge_smoke_test.py` |
| K-08 | Orta | CI yoktu; testler yalnızca elle ve dağınık komutlarla çalışıyordu. | `.github/workflows/ci.yml` + `tools/check_all.py` (5 adım, ilk hatada başarısız). | CI çalıştırması |
| K-09 | Düşük | Her canlı yenilemede `/api/furnaces` iki kez okunuyordu (sağlık + liste). | `SimClient.health(furnaces)` ile tek okuma; normal turda istek sayısı 3 → 2. | Köprü canlı testi |
| K-10 | Düşük | `config.json` sürümü 1.4.0'da, kod 1.6.0'da kalmıştı. | Tüm sürüm damgaları 1.7.0; README ve doküman sayısı 18. | `test_11` ailesi, DOCX |
| K-11 | Düşük | Geniş `except Exception` blokları hataları yutabilir. | Sınır katmanlarında (ağ, DB, WebSocket) bilinçli yedekleme olarak korundu; kritik yollarda dar `ValueError`/`HTTPException` kullanıldı ve günlük mesajları Türkçeleştirildi. | Kod incelemesi; kalan riskler Bölüm 5 |
| K-12 | Düşük | Simülasyon çekirdeğinin kendi testi yoktu; köprü testleri demo motorunu kapsıyor, kullanıcı simülasyonunu değil. | 11 testlik çekirdek paketi: fiziği, senaryoları, iptali, olay limitini ve SQLite'ı kapsar. | `simulation_smoke_test.py` |
| K-13 | Bilgi | Depo kökünde `requirements.txt` yok. | Doğru durum: Python tarafı sıfır üçüncü taraf bağımlılıkla çalışır; edge yalnızca stdlib, simülasyonun kendi `requirements.txt` dosyası vardır. Kök dosya eklemek yanıltıcı olurdu. | README, `edge/requirements.txt` |

### 3.1 Veri bütünlüğü kararları

1. **Tek kaynak:** Simülasyon emirlerinin canlı doğrusu `Plant.orders`; SQLite özet/geçmiş kaydıdır. İkisi artık iptal ve tamamlanmada birlikte güncellenir.
2. **Kimlik ve idempotency:** Edge batch'leri `batch_id` ile tekilleştirilir; aynı batch ikinci kez yazılmaz.
3. **Sınırlı bellek:** Simülasyon olay günlüğü 300, edge okuma okuma sayısı yapılandırılmış saklama ile sınırlıdır.
4. **Test kaydı üretmez:** İş akışı senaryoları `test:true`, `createsRecord:false` taşır; stok/cari/muhasebe kaydı oluşturmaz. Bu, test ortamının en önemli güvenlik kuralıdır.

---

## 4. Güvenlik modeli

### 4.1 Uygulanan kontroller

| Kontrol | Nerede | Not |
| --- | --- | --- |
| HMAC-SHA256 imza | `POST /api/edge/ingest` | Zaman damgası ve `client_id` ile birlikte; yanlış imza 401. |
| Batch tekilleştirme | `IngestStore.insert_batch` | `UNIQUE(batch_id)`, WAL, `busy_timeout`. |
| Statik yayın beyaz listesi | Köprü `_static` | Yalnızca `/app/` ve `index.html`; `.git`, `config.json`, `edge-config.json` asla yayınlanmaz. |
| Yol gezinmesi engeli | Köprü `_static` | Yüzde kodlu `..`, gizli dosya ve kök dışı hedef 403/404. |
| Gövde sınırı | Köprü, demo, simülasyon | Aşırı gövde 413 / boş gövde; negatif uzunluk reddedilir. |
| Gizli alan maskeleme | `public_config` | `edge.secret` ve `edge.token` arayüzde `••••••••`. |
| Girdi doğrulama | Simülasyon API'si | Pydantic + `Plant`; 400 ve Türkçe gerekçe. |
| SQL sütun beyaz listesi | `Database.update_order` | Dinamik SQL'e kullanıcı alanı giremez. |
| Tarayıcı sertleştirme | Tüm HTTP yanıtları | `nosniff`, `no-referrer`, izin politikası. |
| Yapılandırma uyarıları | `/api/health`, `/api/bridge/info` | Varsayılan anahtar ve uzak simülasyon görünür. |

### 4.2 Kalan riskler (kabul edilen sınırlar)

| Risk | Etki | Azaltma / koşul |
| --- | --- | --- |
| Köprü ve simülasyonda kullanıcı kimlik doğrulaması yok | Aynı ağdaki biri API'yi okuyabilir/yazabilir | Yalnızca güvenilir LAN'da çalıştırın; üretimde ters vekil arkasına alın. `0.0.0.0` yerine `127.0.0.1` tercih edin. |
| Varsayılan HMAC anahtarı depoda | Edge ingest taklit edilebilir | Saha kurulumunda değiştirin; `/api/health` uyarısı `DEFAULT_EDGE_SECRET` görünüyorsa kurulum tamamlanmamıştır. |
| HTTP, TLS yok | Ağda dinleme | Üretimde HTTPS sonlandıran ters vekil; köprüyü internete açmayın. |
| `Access-Control-Allow-Origin: *` | Tarayıcı tabanlı okuma | Yerel prototip için kabul; üretimde kökene kısıtlayın. |
| Simülasyon adresi değiştirilebilir (`/api/bridge/config`) | SSRF benzeri yönlendirme | Yalnızca yönetici erişimi olan makinede kullanın; uzak adres uyarısı vardır. |
| ERP verisi tarayıcı `localStorage`'ında | Cihaz/ tarayıcı kaybı, çok kullanıcı yok | Prototip sınırı; gerçek dağıtımda sunucu tarafı veritabanı + RBAC gerekir. |
| SQLite dosyaları şifresiz | Disk erişimi | İşletim sistemi disk şifreleme + dosya izinleri; üretimde yönetilen veritabanı. |
| Simülasyon `requirements.txt` sürümleri sabit değil | Tekrarlanamayan kurulum | Kurulumdan önce sürümleri sabitleyin (`pip freeze`), CI'da aynı sürümleri kullanın. |
| Geniş istisna yakalama | Gizli hata | Sınır katmanlarında bilinçli; yeni kodda dar istisna ve günlük zorunlu. |

**Sonuç:** Sistem, **tek kullanıcılı yerel prototip ve fabrika öncesi test ortamı** olarak kullanılabilir. İnternete açık, çok kullanıcılı üretim ERP'si değildir; bu doküman bunu gizlemez.

---

## 5. Test matrisi ve kabul kanıtı

Tek komut:

```bash
python3 tools/check_all.py
```

| # | Adım | Kapsam | Beklenen |
| --- | --- | --- | --- |
| 1 | Veri doğrulama | 59 varlık, mizan, şema | 0 hata, 1 bilgilendirici uyarı |
| 2 | Simülasyon çekirdeği | 11 test: doğrulama, fizik, senaryo, iptal, SQLite | TÜM TESTLER GEÇTİ |
| 3 | Simülasyon köprüsü | 20 test: proxy, eşleme, HMAC, başlık, yol, doğrulama | TÜM TESTLER GEÇTİ |
| 4 | Edge ajanı | 13 test: sinyal, kuyruk, imza, adaptör, dry-run | TÜM TESTLER GEÇTİ |
| 5 | ERP arayüzü | 35 ekran, 11 uç, canlı mod, bildirim tekilleştirme | TÜM TESTLER GEÇTİ |

Ek doğrulamalar:

- `python3 tools/simulation_smoke_test.py` — 11/11.
- `python3 tools/sim_bridge_smoke_test.py` — 20/20.
- `python3 tools/edge_smoke_test.py` — 13/13.
- `node tools/smoke_test.mjs` — 35/35 ekran.
- `python3 tools/build_docx.py` — 18 doküman, geçerli OOXML.

---

## 6. CI ve tekrar üretilebilirlik

`.github/workflows/ci.yml` her push ve `main` hedefli pull request'te Python 3.12 + Node 22 ile `python tools/check_all.py` çalıştırır. Böylece:

1. testler yalnızca geliştiricinin makinesinde değil, temiz ortamda da geçer;
2. yeni bir bağımlılık sessizce eklenemez (köprü/edge testleri stdlib ile çalışır);
3. bozulan bir düzeltme aynı kapıda yakalanır.

**Yerel ön koşul:** Python 3.10+ ve Node.js 18+. Node yoksa kalite kapısı açıkça hata verir; sessizce atlamaz.

---

## 7. Sürüm ve uyumluluk

| Bileşen | Sürüm | Not |
| --- | --- | --- |
| ERP arayüzü | 1.7.0 | 35 ekran, PWA `erp-studio-v8` |
| Simülasyon köprüsü | 1.7.0 | `/api/health`, `/api/bridge/info` güvenlik uyarıları |
| Kullanıcı simülasyonu (depo kopyası) | 1.7.0 | Girdi doğrulama, kalıcı iptal, başlıklar |
| Edge ajanı | 1.3 | Değişmedi |
| Veri şeması | 4 | Değişmedi |
| Doküman | 18 dosya | 17 numaralı bu denetim dahil |

**Geriye dönük uyumluluk:** REST uçları ve alan adları değişmedi; yalnızca yeni doğrulamalar, uyarı alanları ve başlıklar eklendi. Eski edge ajanı aynı HMAC sözleşmesiyle çalışmaya devam eder.

---

## 8. Öncelikli kalan işler

| Öncelik | İş | Neden |
| --- | --- | --- |
| 1 | Köprüye isteğe bağlı token/oturum doğrulaması | LAN dışına çıkarsa yetkisiz yazma riski |
| 2 | Simülasyon bağımlılıklarını sürüm sabitleme | Tekrarlanabilir kurulum |
| 3 | Sunucu tarafı kalıcı ERP veritabanı | `localStorage` prototip sınırı |
| 4 | TLS sonlandıran ters vekil örneği | Ağda dinleme |
| 5 | Yedekleme/geri yükleme provası | SQLite ve JSON arşiv dayanıklılığı |
| 6 | Geniş istisnaların günlük seviyelerinin standartlaştırılması | Üretimde gözlemlenebilirlik |

Bu işler yapılmadan sistem **üretim ERP'si** ilan edilmemelidir. Mevcut haliyle fabrika öncesi doğrulama, eğitim ve simülasyon testleri için hazırdır.

---

## 9. Kabul kontrol listesi

- [x] 59 varlık doğrulandı; mizan borç = alacak.
- [x] 35 ekran ve 11 JSON ucu çalışıyor.
- [x] Simülasyon emirleri geçersiz girdiyi reddediyor.
- [x] `reset` hem bellekte hem SQLite'ta iptal üretiyor.
- [x] HMAC ingest yanlış imzayı reddediyor; batch tekilleştiriyor.
- [x] Statik yayın gizli dosyaları ve yol gezinmesini engelliyor.
- [x] Varsayılan anahtar ve uzak simülasyon uyarısı görünür.
- [x] Köprü, simülasyon ve demo güvenlik başlıkları gönderiyor.
- [x] 5 adımlı kalite kapısı yerelde yeşil; CI aynı komutu çalıştırıyor.
- [x] 18 doküman DOCX'te birleşiyor.
- [ ] Üretim kimlik doğrulaması, TLS ve sunucu veritabanı (kapsam dışı; Bölüm 8).
