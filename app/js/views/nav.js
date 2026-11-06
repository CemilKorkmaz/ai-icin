// Menü tanımı veridir. Fabrikaya göre filtreleme app/js/modularity.js -> visibleNav() ile yapılır.
// Ayrı dosyada tutulmasının nedeni: setup.js menü önizlemesini index.js'e döngüsel bağımlılık olmadan okuyabilsin.

export const NAV = [
  { group: 'GENEL', items: [{ id: 'dashboard', label: 'Panel', icon: 'grid' }] },
  { group: 'SATIN ALMA', items: [
    { id: 'materials', label: 'Malzeme Tanımları', icon: 'tag' },
    { id: 'orders', label: 'Satın Alma Emirleri', icon: 'cart' },
    { id: 'prices', label: 'Fiyat Takibi', icon: 'trend' },
    { id: 'suppliers', label: 'Tedarikçiler', icon: 'users' },
    { id: 'requests', label: 'Talep & Teklif Akışı', icon: 'clipboard' }
  ] },
  { group: 'HAMMADDE & STOK', items: [
    { id: 'stock', label: 'Stok Durumu', icon: 'warehouse' },
    { id: 'receipts', label: 'Mal Kabul', icon: 'clipboard' },
    { id: 'crusher', label: 'Kırıcı & Fire', icon: 'recycle' },
    { id: 'movements', label: 'Stok Hareketleri', icon: 'activity' }
  ] },
  { group: 'ÜRETİM', items: [
    { id: 'production', label: 'Üretim Akışı', icon: 'flame' },
    { id: 'recipes', label: 'Reçeteler', icon: 'sliders' },
    { id: 'batches', label: 'Homojenizasyon Partisi', icon: 'clock' },
    { id: 'events', label: 'Olay & Arşiv', icon: 'archive' }
  ] },
  { group: 'MAKİNE & KURULUM', items: [
    { id: 'machines', label: 'Makine Parkı', icon: 'cpu' },
    { id: 'paths', label: 'Döküm Yolları', icon: 'layers' },
    { id: 'cutting', label: 'Kesim Hesap Motoru', icon: 'scissors' },
    { id: 'maintenance', label: 'Yağ & Bakım', icon: 'gauge' },
    { id: 'plc', label: 'PLC Durum', icon: 'activity' }
  ] },
  { group: 'TİCARİ & FİNANS', items: [
    { id: 'sales', label: 'Satış Siparişleri', icon: 'cart' },
    { id: 'customers', label: 'Müşteriler & Cari', icon: 'wallet' },
    { id: 'finance', label: 'Muhasebe & Fişler', icon: 'receipt' },
    { id: 'costing', label: 'Maliyet & Kârlılık', icon: 'scale' }
  ] },
  { group: 'DEPOLAMA & PERSONEL', items: [
    { id: 'warehouse', label: 'Depo, Rezervasyon & Sayım', icon: 'warehouse' },
    { id: 'hr', label: 'Personel & Vardiya', icon: 'briefcase' }
  ] },
  { group: 'SEVKİYAT', items: [
    { id: 'shipments', label: 'Sevkiyat & Onaylar', icon: 'truck' },
    { id: 'archive', label: 'Arşiv', icon: 'archive' }
  ] },
  { group: 'RAPORLAMA', items: [{ id: 'reports', label: 'Raporlar & İstatistik', icon: 'chart' }] },
  { group: 'ENTEGRASYON', items: [{ id: 'integration', label: 'Entegrasyon Matrisi', icon: 'link' }] },
  { group: 'YÖNETİM', items: [
    { id: 'setup', label: 'Saha Kurulum Sihirbazı', icon: 'cpu' },
    { id: 'modules', label: 'Modül Kaydı', icon: 'grid' },
    { id: 'vendor', label: 'Merkezi Yönetim', icon: 'shield' }
  ] },
  { group: 'SİSTEM', items: [
    { id: 'notifications', label: 'Bildirimler & Kuyruk', icon: 'bell' },
    { id: 'settings', label: 'Ayarlar', icon: 'settings' }
  ] }
];

export const GROUP_OF = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.id, g.group])));
