"""ERP test senaryoları — fırın arızaları ve iş akışı bildirimleri.

Bu modül yalnızca tanımları tutar. Durum değişikliğini `simulator.plant.Plant`
uygular; böylece API, arayüz ve testler aynı kaynağı kullanır.

İki grup vardır:

* **Fırın senaryoları** gerçek simülasyon durumunu değiştirir: sıcaklık, durum,
  sensör/kapı/brülör sinyalleri. ERP bu değişikliği canlı ekranlarda ve dört
  sinyalde görür.
* **İş akışı bildirimleri** ERP'nin bildirim/uyarı zincirini sınamak için
  niyetli olarak yalnızca olay üretir. Stok, cari, muhasebe veya üretim
  kayıtlarını değiştirmez; arayüzde “TEST” etiketiyle görünür.
"""
from __future__ import annotations

SCENARIO_DEFS = [
    {
        "id": "sensor_failure",
        "label": "Sensör arızası",
        "short": "Sensör",
        "severity": "critical",
        "module": "plc",
        "title": "Sensör arızası",
        "description": "Sıcaklık sensörü yanıt vermiyor; kalite BAD, alarm ve bildirim üretilir.",
    },
    {
        "id": "overheat",
        "label": "Aşırı sıcaklık",
        "short": "Aşırı sıcaklık",
        "severity": "critical",
        "module": "plc",
        "title": "Aşırı sıcaklık alarmı",
        "description": "Fırın güvenlik sınırının üstüne çıkar; brülör kapanır.",
    },
    {
        "id": "burner_failure",
        "label": "Brülör arızası",
        "short": "Brülör",
        "severity": "critical",
        "module": "maintenance",
        "title": "Brülör arızası",
        "description": "Brülör devre dışı kalır; sıcaklık yükselmez, bakım bildirimi üretilir.",
    },
    {
        "id": "door_open",
        "label": "Kapı açık",
        "short": "Kapı",
        "severity": "warning",
        "module": "plc",
        "title": "Fırın kapısı açık",
        "description": "Kapı sinyali açılır; brülör güvenlik gereği kapanır.",
    },
    {
        "id": "casting",
        "label": "Döküm başlat",
        "short": "Döküm",
        "severity": "info",
        "module": "production",
        "title": "Döküm modu başladı",
        "description": "Döküm/devrilme sinyali etkinleşir; üretim akışı bilgilendirilir.",
    },
    {
        "id": "reset",
        "label": "Senaryoyu sıfırla",
        "short": "Sıfırla",
        "severity": "info",
        "module": "machines",
        "title": "Test senaryosu sıfırlandı",
        "description": "Sensör, kapı, brülör ve alarm durumu temizlenir; fırın normale döner.",
    },
]

SCENARIO_BY_ID = {item["id"]: item for item in SCENARIO_DEFS}

BUSINESS_EVENT_DEFS = [
    {
        "id": "stock_critical",
        "label": "Kritik stok uyarısı",
        "severity": "warning",
        "module": "stock",
        "title": "Kritik stok seviyesi",
        "message": "Alüminyum külçe stok seviyesi kritik sınırın altına indi. Satın alma talebi açılmalı.",
    },
    {
        "id": "quality_reject",
        "label": "Kalite reddi",
        "severity": "danger",
        "module": "batches",
        "title": "Kalite reddi",
        "message": "Bir döküm partisinde sertlik değeri reçete dışında ölçüldü; parti karantinaya alınmalı.",
    },
    {
        "id": "maintenance_due",
        "label": "Bakım gecikmesi",
        "severity": "warning",
        "module": "maintenance",
        "title": "Bakım gecikti",
        "message": "Planlı bakım tarihi geçti. Makine parkındaki bakım kaydı kontrol edilmeli.",
    },
    {
        "id": "shipment_pending",
        "label": "Sevkiyat onayı bekliyor",
        "severity": "info",
        "module": "shipments",
        "title": "Sevkiyat iki onay bekliyor",
        "message": "Hazır sevkiyat için ikinci onay bekleniyor; stok ve fatura henüz oluşmadı.",
    },
    {
        "id": "finance_overdue",
        "label": "Vadesi geçen cari",
        "severity": "warning",
        "module": "finance",
        "title": "Vadesi geçen cari bakiye",
        "message": "Bir müşterinin vadesi geçen bakiyesi var; muhasebe takibine düştü.",
    },
    {
        "id": "customer_credit",
        "label": "Kredi limiti aşımı",
        "severity": "danger",
        "module": "customers",
        "title": "Kredi limiti aşıldı",
        "message": "Yeni sipariş müşterinin kredi limitini aşıyor; sipariş onaya düşmeli.",
    },
    {
        "id": "production_ready",
        "label": "Üretim emri hazır",
        "severity": "info",
        "module": "production",
        "title": "Üretim emri planlandı",
        "message": "Yeni üretim emri planlandı; döküm akışında operatör onayı bekliyor.",
    },
]
BUSINESS_BY_ID = {item["id"]: item for item in BUSINESS_EVENT_DEFS}
