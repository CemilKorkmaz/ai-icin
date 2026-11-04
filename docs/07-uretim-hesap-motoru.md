# 07 — Üretim Hesap Motoru

Bu doküman, saha görüşmesindeki "işin içinde çok güzel hesaplar var, geometri yani" cümlesini somut kurallara çevirir. Bütün formüller tek bir modülde toplanır (`app/js/calc.js`), ekranlar hesap yapmaz; yalnızca parametreleri gönderir ve sonucu gösterir. Böylece aynı kural prototipte, sunucu tarafındaki olay işçisinde ve ileride eklenecek API'de aynı sonucu verir.

Şekil ve şema kullanılmaz; kurallar madde madde ve formül olarak yazılır.

---

## 1. Temel büyüklükler ve birim sözleşmesi

| Büyüklük | Birim | Varsayılan | Nereden gelir |
| --- | --- | --- | --- |
| Çap `D` | mm | 178 | Döküm kodu kartı |
| Döküm boyu `L_cast` | mm | 6300 | Döküm ölçümü |
| Ürün boyu `L_product` | mm | 6000 | Müşteri siparişi |
| Kafa payı `L_head` | mm | 300 | Operatör / fabrika parametresi |
| Bıçak kerf payı `L_blade` | mm | 3 | Testere kartı |
| Yoğunluk `ρ` | kg/m³ | 2700 | Alaşım kartı (kullanıcı tanımlar) |
| Kesim adedi `cuts` | adet | 1 | Testere sayacı |
| Biyet adedi `count` | adet | — | Döküm kodu / kesim kaydı |
| Tonaj | ton | — | 1000 kg = 1 ton |

Konuşmada "su gibi değil, bir kilogram değil" denerek anlatılan kural şudur: bütün kütleler uzunluk ve kesit alanından türetilir. Hiçbir kayıp sabit kilogram olarak yazılmaz. Yoğunluk alaşıma göre değişebileceği için sabit kodlanmaz; malzeme veya alaşım kartından okunur.

---

## 2. Geometrik kütle formülü

Kesit alanı, çapın metreye çevrilmiş yarıçapı üzerinden hesaplanır:

```
r_metre       = D_mm / 2000
L_metre       = L_mm / 1000
alan_m2       = π · r_metre²
kütle_kg      = alan_m2 · L_metre · ρ · adet
kütle_ton     = kütle_kg / 1000
```

`app/js/calc.js` içindeki karşılığı `cylinderMassKg(D_mm, L_mm, ρ, adet)` fonksiyonudur. Bütün diğer hesaplar bu fonksiyonu çağırır.

**178 mm çap ve 2700 kg/m³ için referans değerler**

| Parça | Uzunluk | Kütle (adet başına) |
| --- | --- | --- |
| Ürün biyet | 6000 mm | 403,130 kg |
| Döküm biyet | 6300 mm | 423,286 kg |
| Kafa kesimi | 300 mm | 20,157 kg |
| Kafa kesimi (bıçak payı düşülmüş) | 297 mm | 19,955 kg |
| Bıçak talaşı (tek kesim) | 3 mm | 0,2016 kg |

Bu tablo, prototipteki **Kesim Hesap Motoru** ekranının canlı olarak ürettiği değerlerdir. 86 adet biyet ve ikişer kesim varsayıldığında talaş toplamı 34,67 kg, ikişer kafa varsayıldığında kafa kesimi toplamı 3,467 tondur.

---

## 3. 6300 / 6000 / 300 / 3 mm ilişkisi ve açık çelişki

Konuşmada "6300 dökmüştü, 6 metre 3, 30 santim" denir. Üç uzunluğun toplamı `6000 + 300 + 3 = 6303 mm` olduğundan, 6300 mm'lik döküm boyuna birebir sığmaz. İki yorum mümkündür ve sistem ikisini de destekler:

1. **Bıçak payı döküm boyuna dâhil.** Kafa payı `6300 − 6000 − 3 = 297 mm` olur. Kafa kütlesi 19,955 kg/adet.
2. **Kafa payı 300 mm olarak ölçülmüş, bıçak payı ayrıca kaydedilmiş.** Döküm boyu fiilen 6303 mm kabul edilir ve 3 mm sapma "ölçüm toleransı" olarak olaya yazılır.

Hangi yorumun geçerli olduğu abiye sorulacak sorulardan biridir (`docs/06` Bölüm 5). Kesinleşene kadar `bladeInsideCastLength` adlı bir parametre üzerinden seçilir; varsayılan 1. yorumdur. Sistem, seçilen yorumdan bağımsız olarak toplam uzunluk sapmasını olay kaydına yazar ve sapma 10 mm'yi aşarsa uyarı üretir. **Sessizce yuvarlama yapılmaz.**

---

## 4. Kesim raporu

`cuttingReport(...)` fonksiyonu aşağıdaki alanları döndürür. Her alan ayrı bir olay satırına karşılık gelir; toplu "fire" yazımı yapılmaz.

| Alan | Hesap | Akıbet |
| --- | --- | --- |
| `productKg` | `cylinderMassKg(D, L_product, ρ, count)` | Mamul biyet |
| `headKg` | `cylinderMassKg(D, L_head, ρ, count · headPerBillet)` | `remelt` — tekrar fırına |
| `sawdustKg` | `cylinderMassKg(D, L_blade, ρ, cuts)` | `sale` — talaş eritilemez, satılır |
| `scrapBilletKg` | Operatör girer veya fire biyet kartından gelir | `remelt` veya `sale`, parametreye göre |
| `kerfCuts` | `count · cutsPerBillet` | Testere ve yağ sayaçlarını besler |
| `netProductKg` | `castKg − headKg − sawdustKg − scrapBilletKg` | Mamul stok |
| `lengthDeviationMm` | `L_cast − (L_product + L_head + L_blade)` | Ölçüm sapması olayı |

`headPerBillet` ve `cutsPerBillet` fabrika parametresidir. Konuşmada kafa kesiminin tek uçtan mı iki uçtan mı yapıldığı net değildir; varsayılan değer 2'dir ve ekrandan değiştirilebilir. Bu sayede 17 tondan 14 tona düşüşün hesabı, tek bir sabit yerine ölçülebilir üç ayrı kalemle kapatılır.

---

## 5. Kütle dengesi zinciri

Konuşmada verilen zincir, sistemde ardışık olaylar olarak tutulur. Her satır bir önceki bakiyeden düşülerek yeni bakiyeyi üretir.

| Sıra | Olay | İşlem | Bakiye (ton) |
| --- | --- | --- | --- |
| 1 | `CAST_START` | Başlangıç metali | 21,000 |
| 2 | `TRANSFER` | Başka ocağa aktarılan 3 ton | 18,000 |
| 3 | `PATH_HOLD` | Döküm yolluğunda tutulan 1 ton | 17,000 |
| 4 | `CAST_NET` | Fiilen dökülen | 17,000 |
| 5 | `HEAD_CUT` | Kafa kesimleri (yeniden fırına) | azalır |
| 6 | `SAWDUST` | 3 mm bıçak talaşı (satışa) | azalır |
| 7 | `SCRAP_BILLET` | Fire biyet | azalır |
| 8 | `NET_BILLET` | Operatörün elindeki net biyet | 14,000 |
| 9 | `HOMOGEN_START` | Partiye giriş | 14,000 |
| 10 | `HOMOGEN_END` | Süre ve sapma kaydı | 14,000 |
| 11 | `COOLING_END` | Soğutma tamamlandı | 14,000 |
| 12 | `SHIPMENT` | İki onay sonrası stoktan düşer | azalır |

**Kritik tasarım kararı:** 5, 6 ve 7 numaralı satırların toplamı yaklaşık 3 tondur, fakat bu dağılım konuşmada verilmemiştir. Sistem 3 tonu tek bir "kafa" kalemi olarak **varsaymaz**. Her biri ölçülerek girilir; girilmeyen kalem için bakiye `balanceGap` alanında açıkça gösterilir ve `kütle dengesi kapanmadı` uyarısı üretilir. Bu, abinin "iş böyle oldu mu kabarıyor" endişesinin çözümüdür: kabarma, olay satırlarının ayrıştırılmasıyla önlenir.

### 5.1 Döküm yolu tutma miktarı

`PATH_HOLD` satırı, fırından döküm tablasına giden hattın geometrisine bağlıdır. Aynı fabrikada iki ocak ve iki yol olabilir:

| Yol | Kaynak ocak | Tabla | Tutma miktarı | Not |
| --- | --- | --- | --- | --- |
| Kısa yol | A Fırını | Tabla 1 | 1,0 ton | Konuşmadaki örnek |
| Uzun yol | B Fırını | Tabla 1 | 2,0 ton | Aynı metal, uzun kanal |
| Orta yol | B Fırını | Tabla 2 | 1,5 ton | Hat parametresi |

Bu bir **hat parametresidir**, döküm kodu başına girilen bir fire oranı değildir. `castingPaths` koleksiyonunda `fromMachineId`, `tableId`, `holdTon`, `label` alanlarıyla tutulur. Döküm kodu, hangi yoldan yapıldığını `pathId` ile referans eder. Abinin "1 tonsa burada 2 tona tekabül ediyor ya da 1,5 tona" cümlesi bu koleksiyonla karşılanır. Çarpan mı sabit tonaj mı olduğu doğrulanana kadar her satır bağımsız tonaj olarak girilir; çarpan gerekiyorsa sonradan `holdFactor` alanı eklenir.

### 5.2 Geometri ile tonaj çapraz doğrulaması

Kayıtlı net biyet tonajı ile geometriden hesaplanan tonaj karşılaştırılır:

```
beklenen_ton = count · cylinderMassKg(D, L_product, ρ, 1) / 1000
sapma_yüzde = |kayıtlı_ton − beklenen_ton| / kayıtlı_ton · 100
```

Sapma yüzde 2'yi aşarsa sistem `GEOMETRY_MISMATCH` uyarısı üretir. Bu kontrol, demo verisindeki adet/tonaj çiftlerinin de doğrulanmasını sağlar; prototipin demo verisi bu kurala göre düzeltilmiştir. Gerçek kurulumda tartım fişi ile geometrik tahmin arasındaki fark, ölçüm hatası veya yoğunluk parametresi hatası olarak ayrı bir olaya yazılır.

---

## 6. Yan ürün akıbeti (fate)

Konuşmada iki yan ürünün birbirinden kesin olarak ayrıldığı görülür. Önceki sürümde tek "Yan Ürün" kategorisi altında toplanan kayıtlar, artık `byProductFates` parametre tablosuyla ayrılır.

| Malzeme | Akıbet kodu | Anlamı | Stok etkisi |
| --- | --- | --- | --- |
| Kafa Kesimi | `remelt` | Fırına tekrar atılır | Yan ürün stoğuna girer, ergitmede tüketilir |
| Yolluk / Filtre Artığı | `recycle` | Döngüsel, tekrar ocağa | Yan ürün stoğuna girer |
| Cüruf | `recycle` | Döner ocakta geri kazanılır | Geri kazanım kaydı |
| Fire Biyet | `remelt` | Tekrar ergitilir | Yan ürün stoğuna girer |
| Talaş | `sale` | Eritilemez, dışarı satılır | Satış sevkiyatına gider |
| Kırıcı Firesi | `waste` | Nem / yabancı madde | Atık |

`fate` kullanıcı tanımlı bir parametredir; yeni bir yan ürün kartı açıldığında akıbeti seçilir. "Talaş stone'a gidiyor" ifadesindeki `Stone`, doğrulanana kadar serbest metin `destination` alanında tutulur, sabit müşteri kodu olarak yazılmaz.

---

## 7. Yağ tüketimi ve bıçak ömrü

İki kural aynı sayaç mantığıyla çalışır ve fabrikadan fabrikaya değişen değerler parametre olarak girilir.

### 7.1 Yağ kuralı

```
kalan_yüzde  = 100 · (1 − cutsSinceFill / cutsPerTank)
uyarı        = cutsSinceFill ≥ warnAt
durum        = cutsSinceFill ≥ cutsPerTank ise "Dolum Gerekli"
```

Örnek: `cutsPerTank = 100`, `warnAt = 90`, `cutsSinceFill = 86`. Yüzde 14 yağ kaldı, uyarı henüz tetiklenmedi. 90. kesimde bakım personeline bildirim gider. Başka fabrika `cutsPerTank = 150`, `warnAt = 140` girebilir. Yağ dolumu yapıldığında `cutsSinceFill = 0` yapılır ve `maintenanceEvents` içine bir kayıt düşer; sayaç sıfırlanırken eski değer olayda saklanır.

Kesim sayacı `kerfCuts` değerinden beslenir. Abiye sorulan açık soru şudur: sayaç kesim **adedi** üzerinden mi, yoksa kesilen **toplam kesit alanı / tonaj** üzerinden mi ilerleyecek? İlk uygulama adet üzerindedir; `cutBasis` parametresi `count` veya `area` değerlerini alacak şekilde ayrılmıştır.

### 7.2 Bıçak kuralı

```
kullanım_yüzde = 100 · cutsSinceChange / maxCuts
durum          = cutsSinceChange ≥ maxCuts ise "Ömür Doldu"
```

Bıçak bakıma gönderildiğinde veya yenisi takıldığında yeni bıçak numarası, tarih, kesim sayısı ve operatör kaydedilir. `maintenanceEvents` koleksiyonu `Yağ Dolumu`, `Bıçak Değişimi`, `Bakıma Gönderildi`, `Yeni Bıçak Takıldı` türlerini taşır. Bütün uyarılar giden kutuya da yazılır; çevrimdışı dönemde kaybolmaz.

---

## 8. Homojenizasyon süre kuralı

```
planlanan_dk    = reçete.plannedMinutes            (örn. 480 dk = 8 saat)
gerçekleşen_dk  = bitiş − başlangıç                (örn. 540 dk = 9 saat)
sapma_dk        = gerçekleşen_dk − planlanan_dk
durum           = sapma_dk > tolerans ise "Süre Aşımı"
```

Süre dolduğunda fırın hâlâ çalışıyorsa işlem **durdurulmaz**; `HOMOGEN_OVERRUN` olayı yazılır ve operatöre uyarı gider. Parti tamamlandığında `HOMOGEN_END` olayına planlanan, gerçekleşen ve sapma değerleri birlikte kaydedilir. Parti, farklı döküm kodlarından gelen biyetleri `lots: [{ lotId, count }]` dizisiyle ilişkilendirir; böylece karışık atım bozulmadan izlenebilir.

Soğutma partisi, homojenizasyon partisinin verisini devralır. Sevkiyat da soğutma verisini devralır. Zincirin tamamı `docs/09` içindeki olay günlüğünde tutulur.

---

## 9. Prototipteki karşılığı

| Kural | Modül / ekran | Sunucu tarafı |
| --- | --- | --- |
| Geometrik kütle | `app/js/calc.js` → Kesim Hesap Motoru | `event_worker.py` aynı formülü uygular |
| Kütle dengesi | Olay & Arşiv Görüntüleyici | `events.jsonl` olay zinciri |
| Döküm yolu | Döküm Yolları ekranı | `casting-paths.json` |
| Yan ürün akıbeti | Kesim Hesap Motoru, Stok | `by-product-fates.json` |
| Yağ / bıçak | Yağ & Bakım ekranı | `oil-rules.json`, `blade-rules.json`, `maintenance-events.json` |
| Homojenizasyon | Homojenizasyon Partisi ekranı | `homogenization-batches.json` |
| Sapma uyarıları | Bildirimler & Kuyruk | `outbox.json` |

Bütün eşikler, yoğunluk, bıçak kalınlığı, kafa payı, kesim adedi ve tutma tonajı kullanıcı tanımlıdır; hiçbiri kod içinde sabit değildir. Varsayılanlar yalnızca demo verisi olarak `app/js/seed.js` içinde verilir.
