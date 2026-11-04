# `archive/` — Döküm Kodu Bazlı Olay Günlüğü

Üretim kayıtlarının **kalıcı, append-only** tutulduğu yerdir. Saha görüşmesindeki "bunların hepsini bir JSON'a yazıyoruz, hepsinden birer tane satır düşüyoruz, nasıl bir dosyalama yapacağız, iş böyle oldu mu kabarıyor" sorusunun cevabı buradadır: her aşama tek bir olay satırı olarak eklenir, hiçbir satırın üzerine yazılmaz, hiçbir satır silinmez.

## Dosyalama

```
archive/2026/11/DK-2026-0139/events.jsonl     her satırda tek JSON nesnesi
archive/2026/11/DK-2026-0139/snapshot.json    son durum özeti (yeniden üretilebilir)
archive/2026/11/checksums.sha256              gün/ay bazlı sağlama toplamları
archive/processed-clients.json                idempotency için işlenmiş clientId'ler
```

Yıl ve ay klasörleri, döküm kodu klasörleri çalışma zamanında oluşur ve sürüm kontrolüne girmez. Bu README ile örnek olay dosyası takip edilir.

## Olay satırı

`seq`, `lotId`, `plantId`, `machineId`, `type`, `at`, `actor`, `source`, `grossTon`, `deltaTon`, `balanceTon`, `materialId`, `fate`, `ref`, `payload`, `note`, `clientId` alanlarını taşır. Olay türleri ve örnek 21 → 18 → 17 → 14 ton zinciri `docs/09` içindedir.

## Geri yükleme ve denetim

`snapshot.json` olaylar yeniden oynatılarak her zaman üretilebilir; yedeği zorunlu değildir. `backup.py` bu klasörü, `inbox/processed/` klasörünü ve sağlama toplamlarını da kapsar. Bir kayıt düzeltilmek istenirse satır silinmez, ters işlem içeren yeni bir olay eklenir; böylece denetim izi bozulmaz. Ayda bir geri yükleme tatbikatı yapılır.
