// Demo verisi — prototipin tek kaynağı.
// `node tools/export_seed.mjs` bu dosyadan server/erp/data/*.json arşivini üretir.

export const STAGES = [
  'Ergitme', 'Döküm', 'Testere', 'Homojenizasyon', 'Soğutma', 'Paketleme', 'Mamul Stok', 'Sevkiyat'
];

export const CATEGORY_ORDER = ['Hammadde', 'Sarf Malzeme', 'Yardımcı Malzeme', 'Yan Ürün', 'Mamul'];

export const SEED = {
  schemaVersion: 1,

  settings: {
    company: 'Anadolu Alüminyum Dökümhane',
    serverUrl: 'https://erp.firma.local',
    serverIp: '192.168.1.10',
    backupPath: 'D:\\ERP_Yedek',
    currency: '₺',
    theme: 'light',
    online: true,
    wasteThreshold: 10,
    density: 2700,
    bladeThicknessMm: 3,
    dailyReport: true,
    weeklyReport: true,
    monthlyReport: true,
    smsNumbers: '+9053x xxx xx 01, +9053x xxx xx 02',
    reportMail: 'yonetim@anadolu-aluminyum.local',
    developerMail: 'gelistirici@anadolu-aluminyum.local',
    lastBackup: '2026-11-02T03:00:00+03:00'
  },

  units: ['kg', 'ton', 'adet', 'litre', 'metre', 'paket', 'tüp', 'm³'],

  categories: [
    { id: 'C1', name: 'Hammadde', color: '#4f46e5' },
    { id: 'C2', name: 'Sarf Malzeme', color: '#06b6d4' },
    { id: 'C3', name: 'Yardımcı Malzeme', color: '#8b5cf6' },
    { id: 'C4', name: 'Yan Ürün', color: '#f59e0b' },
    { id: 'C5', name: 'Mamul', color: '#16a34a' }
  ],

  materials: [
    { id: 'H01', code: 'H01', name: 'Alüminyum Külçe', category: 'Hammadde', unit: 'kg', criticalMin: 5000, criticalMax: 50000, stock: 18500, lastPrice: 85.2, supplierId: 'T01', active: true, description: 'Saf alüminyum, alaşımın ana bileşeni' },
    { id: 'H02', code: 'H02', name: 'Alüminyum Hurda', category: 'Hammadde', unit: 'kg', criticalMin: 5000, criticalMax: 30000, stock: 3200, lastPrice: 62.5, supplierId: 'T03', active: true, description: 'Profil / levha hurdası; kırıcıya veya doğrudan üretime' },
    { id: 'H03', code: 'H03', name: 'Silisyum', category: 'Hammadde', unit: 'kg', criticalMin: 200, criticalMax: 2000, stock: 850, lastPrice: 96.0, supplierId: 'T02', active: true, description: '6063 alaşım elementi' },
    { id: 'H04', code: 'H04', name: 'Magnezyum', category: 'Hammadde', unit: 'kg', criticalMin: 50, criticalMax: 500, stock: 120, lastPrice: 225.0, supplierId: 'T02', active: true, description: 'Reçeteye göre zamanlı eklenir' },
    { id: 'H05', code: 'H05', name: 'Altibor', category: 'Hammadde', unit: 'kg', criticalMin: 100, criticalMax: 1500, stock: 410, lastPrice: 118.0, supplierId: 'T02', active: true, description: 'Tane inceltme' },
    { id: 'H06', code: 'H06', name: 'Bakır', category: 'Hammadde', unit: 'kg', criticalMin: 30, criticalMax: 300, stock: 45, lastPrice: 310.0, supplierId: 'T04', active: true, description: 'Alaşım elementi' },
    { id: 'H07', code: 'H07', name: 'Çinko', category: 'Hammadde', unit: 'kg', criticalMin: 80, criticalMax: 800, stock: 260, lastPrice: 118.0, supplierId: 'T04', active: true, description: 'Alaşım elementi' },
    { id: 'S01', code: 'S01', name: 'Seramik Filtre', category: 'Sarf Malzeme', unit: 'adet', criticalMin: 50, criticalMax: 500, stock: 145, lastPrice: 12.0, supplierId: 'T02', active: true, description: 'Her dökümde tüketilir' },
    { id: 'S02', code: 'S02', name: 'Tıkaç', category: 'Sarf Malzeme', unit: 'adet', criticalMin: 30, criticalMax: 200, stock: 28, lastPrice: 5.5, supplierId: 'T02', active: true, description: 'Döküm reçetesine göre düşer' },
    { id: 'S03', code: 'S03', name: 'Besleyici', category: 'Sarf Malzeme', unit: 'adet', criticalMin: 100, criticalMax: 1000, stock: 320, lastPrice: 8.4, supplierId: 'T02', active: true, description: 'Yolluk besleyici' },
    { id: 'Y01', code: 'Y01', name: 'Testere Yağı', category: 'Yardımcı Malzeme', unit: 'litre', criticalMin: 50, criticalMax: 500, stock: 180, lastPrice: 45.0, supplierId: 'T02', active: true, description: 'Kesim sayısına göre tahmini tüketim' },
    { id: 'Y02', code: 'Y02', name: 'Flux', category: 'Yardımcı Malzeme', unit: 'kg', criticalMin: 100, criticalMax: 1000, stock: 250, lastPrice: 28.0, supplierId: 'T02', active: true, description: 'Temizleme / örtücü' },
    { id: 'Y03', code: 'Y03', name: 'Kesici Uç', category: 'Yardımcı Malzeme', unit: 'adet', criticalMin: 10, criticalMax: 50, stock: 12, lastPrice: 640.0, supplierId: 'T04', active: true, description: 'Testere bıçağı ucu' },
    { id: 'Y04', code: 'Y04', name: 'Argon', category: 'Yardımcı Malzeme', unit: 'tüp', criticalMin: 5, criticalMax: 40, stock: 14, lastPrice: 320.0, supplierId: 'T05', active: true, description: 'Degassing gazı' },
    { id: 'Y05', code: 'Y05', name: 'Doğalgaz', category: 'Yardımcı Malzeme', unit: 'm³', criticalMin: 0, criticalMax: 0, stock: 0, lastPrice: 14.8, supplierId: 'T05', active: true, description: 'Tüketim raporlarında izlenir, stok tutulmaz' },
    { id: 'B01', code: 'B01', name: 'Cüruf', category: 'Yan Ürün', unit: 'kg', criticalMin: 0, criticalMax: 5000, stock: 2800, lastPrice: 18.0, supplierId: 'T03', active: true, description: 'Döner ocak varsa geri kazanılır' },
    { id: 'B02', code: 'B02', name: 'Talaş', category: 'Yan Ürün', unit: 'kg', criticalMin: 0, criticalMax: 3000, stock: 1500, lastPrice: 34.0, supplierId: 'T03', active: true, description: '3 mm bıçak kalınlığı ile hesaplanır' },
    { id: 'B03', code: 'B03', name: 'Kafa Kesimi', category: 'Yan Ürün', unit: 'kg', criticalMin: 0, criticalMax: 2000, stock: 620, lastPrice: 41.0, supplierId: 'T03', active: true, description: 'Biyet iki ucu' },
    { id: 'B04', code: 'B04', name: 'Yolluk / Filtre Artığı', category: 'Yan Ürün', unit: 'kg', criticalMin: 0, criticalMax: 1500, stock: 480, lastPrice: 0, supplierId: 'T03', active: true, description: 'Döngüsel fire; tekrar ocağa atılır' },
    { id: 'B05', code: 'B05', name: 'Fire Biyet', category: 'Yan Ürün', unit: 'kg', criticalMin: 0, criticalMax: 2500, stock: 930, lastPrice: 55.0, supplierId: 'T03', active: true, description: 'Döküm ve testere firesi' },
    { id: 'B06', code: 'B06', name: 'Kırıcı Firesi', category: 'Yan Ürün', unit: 'kg', criticalMin: 0, criticalMax: 2000, stock: 700, lastPrice: 12.0, supplierId: 'T03', active: true, description: 'Nem / yabancı madde' },
    { id: 'M01', code: 'M01', name: 'Mamul Biyet (Sevke Hazır)', category: 'Mamul', unit: 'kg', criticalMin: 5000, criticalMax: 200000, stock: 54000, lastPrice: 0, supplierId: '', active: true, description: 'Paketlemeden çıkan biyetler; sevkiyatta buradan düşülür' }
  ],

  suppliers: [
    { id: 'T01', code: 'T01', name: 'ABC Metal', category: 'Hammadde', contact: 'Selim Arslan', phone: '0212 444 01 01', email: 'satış@abcmetal.example', tax: '1234567801', address: 'İstanbul', lastPurchase: '2026-10-28', active: true },
    { id: 'T02', code: 'T02', name: 'XYZ Kimya', category: 'Sarf / Yardımcı', contact: 'Elif Demir', phone: '0216 444 02 02', email: 'siparis@xyzkimya.example', tax: '2234567802', address: 'Kocaeli', lastPurchase: '2026-10-25', active: true },
    { id: 'T03', code: 'T03', name: 'DEF Hurda', category: 'Hammadde', contact: 'Murat Kaya', phone: '0224 444 03 03', email: 'info@defhurda.example', tax: '3234567803', address: 'Bursa', lastPurchase: '2026-11-02', active: true },
    { id: 'T04', code: 'T04', name: 'GHI Alaşım', category: 'Hammadde', contact: 'Zeynep Ak', phone: '0232 444 04 04', email: 'satis@ghialasim.example', tax: '4234567804', address: 'İzmir', lastPurchase: '2026-10-14', active: true },
    { id: 'T05', code: 'T05', name: 'Endüstriyel Gaz', category: 'Yardımcı', contact: 'Can Öz', phone: '0212 444 05 05', email: 'siparis@endustriyelgaz.example', tax: '5234567805', address: 'İstanbul', lastPurchase: '2026-10-30', active: true }
  ],

  purchaseOrders: [
    {
      id: 'PO-001', no: 'SA-2026-0041', date: '2026-10-28', supplierId: 'T01', status: 'Tamamlandı', paymentTerm: '30 gün', notes: 'Ekim sonu külçe alımı', createdBy: 'Satın Alma',
      items: [
        { materialId: 'H01', quantity: 10000, unit: 'kg', unitPrice: 85.2, receivedQty: 10000 },
        { materialId: 'H07', quantity: 200, unit: 'kg', unitPrice: 118.0, receivedQty: 200 }
      ]
    },
    {
      id: 'PO-002', no: 'SA-2026-0042', date: '2026-10-25', supplierId: 'T02', status: 'Tamamlandı', paymentTerm: '45 gün', notes: 'Sarf malzeme takviyesi', createdBy: 'Satın Alma',
      items: [
        { materialId: 'S01', quantity: 200, unit: 'adet', unitPrice: 12.0, receivedQty: 200 },
        { materialId: 'S03', quantity: 150, unit: 'adet', unitPrice: 8.4, receivedQty: 150 },
        { materialId: 'Y01', quantity: 100, unit: 'litre', unitPrice: 45.0, receivedQty: 100 }
      ]
    },
    {
      id: 'PO-003', no: 'SA-2026-0043', date: '2026-11-01', supplierId: 'T03', status: 'Mal Kabulde', paymentTerm: '15 gün', notes: 'Yağmurlu havada gelen hurda, nem oranı yüksek', createdBy: 'Satın Alma',
      items: [
        { materialId: 'H02', quantity: 10000, unit: 'kg', unitPrice: 62.5, receivedQty: 10200 }
      ]
    },
    {
      id: 'PO-004', no: 'SA-2026-0044', date: '2026-10-30', supplierId: 'T05', status: 'Yolda', paymentTerm: '30 gün', notes: 'Degassing gazı', createdBy: 'Satın Alma',
      items: [
        { materialId: 'Y04', quantity: 12, unit: 'tüp', unitPrice: 320.0, receivedQty: 0 }
      ]
    },
    {
      id: 'PO-005', no: 'SA-2026-0045', date: '2026-11-02', supplierId: 'T02', status: 'Onay Bekliyor', paymentTerm: '30 gün', notes: 'Kritik stok: tıkaç ve magnezyum', createdBy: 'Satın Alma',
      items: [
        { materialId: 'S02', quantity: 150, unit: 'adet', unitPrice: 5.5, receivedQty: 0 },
        { materialId: 'H04', quantity: 200, unit: 'kg', unitPrice: 225.0, receivedQty: 0 }
      ]
    }
  ],

  priceHistory: [
    { id: 'PH-001', materialId: 'H01', supplierId: 'T01', date: '2026-01-12', unitPrice: 82.1, quantity: 12000, orderNo: 'SA-2026-0003' },
    { id: 'PH-002', materialId: 'H01', supplierId: 'T01', date: '2026-02-09', unitPrice: 83.0, quantity: 10000, orderNo: 'SA-2026-0008' },
    { id: 'PH-003', materialId: 'H01', supplierId: 'T04', date: '2026-03-11', unitPrice: 86.4, quantity: 8000, orderNo: 'SA-2026-0012' },
    { id: 'PH-004', materialId: 'H01', supplierId: 'T01', date: '2026-04-18', unitPrice: 83.1, quantity: 10000, orderNo: 'SA-2026-0017' },
    { id: 'PH-005', materialId: 'H01', supplierId: 'T01', date: '2026-05-02', unitPrice: 85.0, quantity: 12000, orderNo: 'SA-2026-0021' },
    { id: 'PH-006', materialId: 'H01', supplierId: 'T04', date: '2026-05-15', unitPrice: 85.7, quantity: 8000, orderNo: 'SA-2026-0023' },
    { id: 'PH-007', materialId: 'H01', supplierId: 'T01', date: '2026-05-28', unitPrice: 84.8, quantity: 15000, orderNo: 'SA-2026-0025' },
    { id: 'PH-008', materialId: 'H01', supplierId: 'T01', date: '2026-06-12', unitPrice: 85.2, quantity: 10000, orderNo: 'SA-2026-0028' },
    { id: 'PH-009', materialId: 'H01', supplierId: 'T01', date: '2026-07-08', unitPrice: 87.3, quantity: 9000, orderNo: 'SA-2026-0030' },
    { id: 'PH-010', materialId: 'H01', supplierId: 'T04', date: '2026-08-14', unitPrice: 89.5, quantity: 7000, orderNo: 'SA-2026-0033' },
    { id: 'PH-011', materialId: 'H01', supplierId: 'T01', date: '2026-09-10', unitPrice: 86.1, quantity: 11000, orderNo: 'SA-2026-0036' },
    { id: 'PH-012', materialId: 'H01', supplierId: 'T01', date: '2026-10-05', unitPrice: 84.4, quantity: 10000, orderNo: 'SA-2026-0039' },
    { id: 'PH-013', materialId: 'H01', supplierId: 'T01', date: '2026-10-28', unitPrice: 85.2, quantity: 10000, orderNo: 'SA-2026-0041' },
    { id: 'PH-014', materialId: 'H02', supplierId: 'T03', date: '2026-08-02', unitPrice: 58.4, quantity: 12000, orderNo: 'SA-2026-0032' },
    { id: 'PH-015', materialId: 'H02', supplierId: 'T03', date: '2026-09-14', unitPrice: 60.1, quantity: 12500, orderNo: 'SA-2026-0037' },
    { id: 'PH-016', materialId: 'H02', supplierId: 'T03', date: '2026-11-01', unitPrice: 62.5, quantity: 10000, orderNo: 'SA-2026-0043' },
    { id: 'PH-017', materialId: 'S01', supplierId: 'T02', date: '2026-06-20', unitPrice: 10.8, quantity: 300, orderNo: 'SA-2026-0029' },
    { id: 'PH-018', materialId: 'S01', supplierId: 'T02', date: '2026-10-25', unitPrice: 12.0, quantity: 200, orderNo: 'SA-2026-0042' }
  ],

  receipts: [
    {
      id: 'RC-001', no: 'MK-2026-0043', date: '2026-10-28', orderId: 'PO-001', supplierId: 'T01', plate: '34 ABC 123', weighbridgeNo: 'TF-2026-0398', receivedBy: 'Ahmet Yılmaz', toCrusher: false, status: 'Tamamlandı', notes: 'Külçe ve çinko, eksiksiz teslim',
      items: [
        { materialId: 'H01', orderedQty: 10000, receivedQty: 10000, acceptedQty: 10000, rejectedQty: 0 },
        { materialId: 'H07', orderedQty: 200, receivedQty: 200, acceptedQty: 200, rejectedQty: 0 }
      ]
    },
    {
      id: 'RC-002', no: 'MK-2026-0044', date: '2026-10-25', orderId: 'PO-002', supplierId: 'T02', plate: '34 XYZ 456', weighbridgeNo: 'TF-2026-0395', receivedBy: 'Ahmet Yılmaz', toCrusher: false, status: 'Tamamlandı', notes: 'Sarf malzeme',
      items: [
        { materialId: 'S01', orderedQty: 200, receivedQty: 200, acceptedQty: 200, rejectedQty: 0 },
        { materialId: 'S03', orderedQty: 150, receivedQty: 150, acceptedQty: 150, rejectedQty: 0 },
        { materialId: 'Y01', orderedQty: 100, receivedQty: 100, acceptedQty: 100, rejectedQty: 0 }
      ]
    },
    {
      id: 'RC-003', no: 'MK-2026-0045', date: '2026-11-02', orderId: 'PO-003', supplierId: 'T03', plate: '34 DEF 789', weighbridgeNo: 'TF-2026-0412', receivedBy: 'Ahmet Yılmaz', toCrusher: true, status: 'Kırıcıda', notes: 'Yağmurlu havada gelen hurda, nem oranı yüksek',
      items: [
        { materialId: 'H02', orderedQty: 10000, receivedQty: 10200, acceptedQty: 10200, rejectedQty: 0 }
      ]
    }
  ],

  crusher: [
    { id: 'CR-001', date: '2026-11-02', materialId: 'H02', unit: 'Kırıcı', sourceReceiptId: 'RC-003', gross: 10200, waste: 700, net: 9500, wasteRatio: 6.86, wasteReason: 'Nemli malzeme', wasteDestination: 'Hurda sahası', operator: 'Mehmet Kaya', notes: 'Yağmur sonrası teslimat' },
    { id: 'CR-002', date: '2026-10-29', materialId: 'H02', unit: 'Kırıcı', sourceReceiptId: 'RC-001', gross: 8000, waste: 400, net: 7600, wasteRatio: 5.0, wasteReason: 'Yabancı madde', wasteDestination: 'Geri dönüşüm', operator: 'Mehmet Kaya', notes: '' },
    { id: 'CR-003', date: '2026-10-20', materialId: 'H02', unit: 'Ayıklama', sourceReceiptId: 'RC-001', gross: 12500, waste: 1700, net: 10800, wasteRatio: 13.6, wasteReason: 'Plastik karışık', wasteDestination: 'Hurda sahası', operator: 'Mehmet Kaya', notes: 'Eşik aşıldı, yöneticiye bildirildi' },
    { id: 'CR-004', date: '2026-10-12', materialId: 'H02', unit: 'Manyetik Ayırıcı', sourceReceiptId: 'RC-001', gross: 5000, waste: 100, net: 4900, wasteRatio: 2.0, wasteReason: 'Paslı malzeme', wasteDestination: 'Geri dönüşüm', operator: 'Mehmet Kaya', notes: '' }
  ],

  movements: [
    { id: 'MV-0001', at: '2026-11-02T14:30:00+03:00', type: 'Çıkış', materialId: 'H02', quantity: -800, source: 'Ergitme / F20', ref: 'DK-2026-0138', remaining: 3200, userId: 'U06', notes: 'Şarj girişi' },
    { id: 'MV-0002', at: '2026-11-02T11:15:00+03:00', type: 'Fire', materialId: 'H02', quantity: -700, source: 'Kırıcı', ref: 'CR-001', remaining: 4000, userId: 'U04', notes: 'Nemli malzeme ayıklandı' },
    { id: 'MV-0003', at: '2026-11-02T11:15:00+03:00', type: 'Yan Ürün', materialId: 'B06', quantity: 700, source: 'Kırıcı', ref: 'CR-001', remaining: 700, userId: 'U04', notes: 'Kırıcı firesi stoğa girdi' },
    { id: 'MV-0004', at: '2026-11-02T10:00:00+03:00', type: 'Giriş', materialId: 'H02', quantity: 10200, source: 'Mal Kabul', ref: 'MK-2026-0045', remaining: 4700, userId: 'U03', notes: 'Tartı fişi TF-2026-0412' },
    { id: 'MV-0005', at: '2026-11-02T09:05:00+03:00', type: 'Yan Ürün', materialId: 'B04', quantity: 120, source: 'Döküm', ref: 'DK-2026-0137', remaining: 480, userId: 'U07', notes: 'Yolluk / filtre artığı (döngüsel)' },
    { id: 'MV-0006', at: '2026-11-02T08:40:00+03:00', type: 'Çıkış', materialId: 'S01', quantity: -12, source: 'Döküm', ref: 'DK-2026-0137', remaining: 145, userId: 'U07', notes: 'Döküm reçetesi sarf tüketimi' },
    { id: 'MV-0007', at: '2026-11-02T08:40:00+03:00', type: 'Çıkış', materialId: 'S02', quantity: -6, source: 'Döküm', ref: 'DK-2026-0137', remaining: 28, userId: 'U07', notes: 'Tıkaç tüketimi' },
    { id: 'MV-0008', at: '2026-11-02T07:50:00+03:00', type: 'Çıkış', materialId: 'H03', quantity: -50, source: 'Ergitme / F20', ref: 'DK-2026-0138', remaining: 850, userId: 'U06', notes: 'Önerilen 80 kg, gerçekleşen 50 kg' },
    { id: 'MV-0009', at: '2026-11-02T07:50:00+03:00', type: 'Çıkış', materialId: 'H04', quantity: -32, source: 'Ergitme / F20', ref: 'DK-2026-0138', remaining: 120, userId: 'U06', notes: 'Magnezyum' },
    { id: 'MV-0010', at: '2026-11-02T06:10:00+03:00', type: 'Çıkış', materialId: 'H01', quantity: -13600, source: 'Ergitme / F20', ref: 'DK-2026-0138', remaining: 18500, userId: 'U06', notes: '20 ton şarj' },
    { id: 'MV-0011', at: '2026-11-01T16:20:00+03:00', type: 'Yan Ürün', materialId: 'B02', quantity: 310, source: 'Testere', ref: 'DK-2026-0136', remaining: 1500, userId: 'U08', notes: '3 mm bıçak talaşı' },
    { id: 'MV-0012', at: '2026-11-01T16:20:00+03:00', type: 'Çıkış', materialId: 'Y01', quantity: -8, source: 'Testere', ref: 'DK-2026-0136', remaining: 180, userId: 'U08', notes: 'Kesim sayısına göre yağ' },
    { id: 'MV-0013', at: '2026-11-01T15:10:00+03:00', type: 'Yan Ürün', materialId: 'B03', quantity: 240, source: 'Testere', ref: 'DK-2026-0136', remaining: 620, userId: 'U08', notes: 'Kafa kesimleri' },
    { id: 'MV-0014', at: '2026-11-01T11:30:00+03:00', type: 'Yan Ürün', materialId: 'B01', quantity: 430, source: 'Ergitme / F35', ref: 'DK-2026-0135', remaining: 2800, userId: 'U06', notes: 'Cüruf çekimi' },
    { id: 'MV-0015', at: '2026-10-31T09:00:00+03:00', type: 'Giriş', materialId: 'S01', quantity: 200, source: 'Mal Kabul', ref: 'MK-2026-0044', remaining: 157, userId: 'U03', notes: '' },
    { id: 'MV-0016', at: '2026-10-30T14:00:00+03:00', type: 'Transfer', materialId: 'B01', quantity: 0, source: 'Döner Ocak', ref: 'RO-2026-0007', remaining: 2800, userId: 'U06', notes: 'Geri kazanım: 1,2 t tuz, 2,8 t cüruf → 1,6 t net metal' },
    { id: 'MV-0017', at: '2026-10-29T11:15:00+03:00', type: 'Fire', materialId: 'H02', quantity: -400, source: 'Kırıcı', ref: 'CR-002', remaining: 7600, userId: 'U04', notes: '' },
    { id: 'MV-0018', at: '2026-10-28T10:00:00+03:00', type: 'Giriş', materialId: 'H01', quantity: 10000, source: 'Mal Kabul', ref: 'MK-2026-0043', remaining: 32100, userId: 'U03', notes: '' },
    { id: 'MV-0019', at: '2026-10-27T13:40:00+03:00', type: 'Düzeltme', materialId: 'Y03', quantity: -2, source: 'Sayım', ref: 'SY-2026-0011', remaining: 12, userId: 'U01', notes: 'Aylık sayım farkı' },
    { id: 'MV-0020', at: '2026-10-26T17:00:00+03:00', type: 'Çıkış', materialId: 'B01', quantity: -1200, source: 'Sevkiyat', ref: 'SV-2026-0088', remaining: 2370, userId: 'U10', notes: 'Cüruf satışı, iki onay tamam' }
  ],

  furnaces: [
    { id: 'F20', code: 'F20', name: 'Ocak 1', capacityTon: 20, type: 'Yatay ergitme', rotary: false, status: 'Çalışıyor' },
    { id: 'F35', code: 'F35', name: 'Ocak 2', capacityTon: 35, type: 'Yatay ergitme', rotary: false, status: 'Çalışıyor' },
    { id: 'FD', code: 'FD', name: 'Döner Ocak', capacityTon: 8, type: 'Cüruf geri kazanım', rotary: true, status: 'Beklemede' }
  ],

  recipes: [
    {
      id: 'RCP-01', type: 'Ergitme', name: '6063 / 20 Ton Ocak', alloy: '6063', furnaceId: 'F20', capacityTon: 20, tempC: 750, durationMin: 240, diameterMm: null, coolingMin: 0,
      items: [
        { materialId: 'H01', perTon: 820, unit: 'kg', label: 'Külçe' },
        { materialId: 'H02', perTon: 160, unit: 'kg', label: 'Hurda' },
        { materialId: 'H03', perTon: 4.0, unit: 'kg', label: 'Silisyum' },
        { materialId: 'H04', perTon: 2.6, unit: 'kg', label: 'Magnezyum' },
        { materialId: 'H05', perTon: 1.2, unit: 'kg', label: 'Altibor' }
      ],
      steps: [
        { atMin: 120, label: 'Karıştırma yapılacak', materialId: null, suggestedQty: 0 },
        { atMin: 165, label: 'Silisyum ekle (önerilen 80 kg)', materialId: 'H03', suggestedQty: 80 },
        { atMin: 180, label: 'Magnezyum ekle (önerilen 52 kg)', materialId: 'H04', suggestedQty: 52 }
      ]
    },
    {
      id: 'RCP-02', type: 'Ergitme', name: '6063 / 35 Ton Ocak', alloy: '6063', furnaceId: 'F35', capacityTon: 35, tempC: 755, durationMin: 300, diameterMm: null, coolingMin: 0,
      items: [
        { materialId: 'H01', perTon: 825, unit: 'kg', label: 'Külçe' },
        { materialId: 'H02', perTon: 155, unit: 'kg', label: 'Hurda' },
        { materialId: 'H03', perTon: 4.1, unit: 'kg', label: 'Silisyum' },
        { materialId: 'H04', perTon: 2.5, unit: 'kg', label: 'Magnezyum' }
      ],
      steps: [
        { atMin: 150, label: 'Karıştırma yapılacak', materialId: null, suggestedQty: 0 },
        { atMin: 210, label: 'Alaşım elementleri ekle', materialId: 'H03', suggestedQty: 140 }
      ]
    },
    {
      id: 'RCP-03', type: 'Ergitme', name: '6061 / 20 Ton Ocak', alloy: '6061', furnaceId: 'F20', capacityTon: 20, tempC: 760, durationMin: 260, diameterMm: null, coolingMin: 0,
      items: [
        { materialId: 'H01', perTon: 790, unit: 'kg', label: 'Külçe' },
        { materialId: 'H02', perTon: 180, unit: 'kg', label: 'Hurda' },
        { materialId: 'H03', perTon: 6.0, unit: 'kg', label: 'Silisyum' },
        { materialId: 'H04', perTon: 8.0, unit: 'kg', label: 'Magnezyum' },
        { materialId: 'H06', perTon: 3.0, unit: 'kg', label: 'Bakır' }
      ],
      steps: [{ atMin: 130, label: 'Karıştırma ve numune', materialId: null, suggestedQty: 0 }]
    },
    {
      id: 'RCP-04', type: 'Döküm', name: '178 mm Biyet / Sarf Reçetesi', alloy: '6063', furnaceId: null, capacityTon: null, tempC: 720, durationMin: 0, diameterMm: 178, coolingMin: 0,
      items: [
        { materialId: 'S01', perTon: 0.7, unit: 'adet', label: 'Seramik filtre' },
        { materialId: 'S02', perTon: 0.35, unit: 'adet', label: 'Tıkaç' },
        { materialId: 'S03', perTon: 1.5, unit: 'adet', label: 'Besleyici' },
        { materialId: 'H05', perTon: 0.4, unit: 'kg', label: 'Altibor' },
        { materialId: 'B04', perTon: 7.0, unit: 'kg', label: 'Yolluk / filtre artığı (döngüsel)' }
      ],
      steps: []
    },
    {
      id: 'RCP-05', type: 'Homojenizasyon', name: '6063 / 178 mm', alloy: '6063', furnaceId: null, capacityTon: null, tempC: 580, durationMin: 360, diameterMm: 178, coolingMin: 120,
      items: [{ materialId: 'Y05', perTon: 42, unit: 'm³', label: 'Doğalgaz (tahmini)' }],
      steps: [
        { atMin: 360, label: 'Homojenizasyon süresi doldu, soğutmaya aktar', materialId: null, suggestedQty: 0 },
        { atMin: 480, label: 'Soğutma süresi doldu, paketlemeye aktar', materialId: null, suggestedQty: 0 }
      ]
    },
    {
      id: 'RCP-06', type: 'Homojenizasyon', name: '6061 / 152 mm', alloy: '6061', furnaceId: null, capacityTon: null, tempC: 570, durationMin: 420, diameterMm: 152, coolingMin: 150,
      items: [{ materialId: 'Y05', perTon: 46, unit: 'm³', label: 'Doğalgaz (tahmini)' }],
      steps: [{ atMin: 420, label: 'Soğutmaya aktar', materialId: null, suggestedQty: 0 }]
    }
  ],

  lots: [
    { id: 'DK-2026-0131', code: 'DK-2026-0131', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 92, weightTon: 18.4, furnaceId: 'F20', recipeId: 'RCP-01', stage: 'Mamul Stok', status: 'Sevke Hazır', startedAt: '2026-10-30T05:40:00+03:00', stageStartedAt: '2026-10-31T12:20:00+03:00', paused: false, scrapTon: 0.22, remainingMetalTon: 1.6, remainingDecision: 'Ocakta bırakıldı', alerts: [], history: [{ stage: 'Ergitme', at: '2026-10-30T05:40:00+03:00' }, { stage: 'Döküm', at: '2026-10-30T07:55:00+03:00' }, { stage: 'Testere', at: '2026-10-30T10:10:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-10-30T13:00:00+03:00' }, { stage: 'Soğutma', at: '2026-10-30T19:00:00+03:00' }, { stage: 'Paketleme', at: '2026-10-31T10:00:00+03:00' }, { stage: 'Mamul Stok', at: '2026-10-31T12:20:00+03:00' }] },
    { id: 'DK-2026-0132', code: 'DK-2026-0132', alloy: '6061', diameterMm: 152, lengthM: 6.0, billetCount: 88, weightTon: 14.6, furnaceId: 'F35', recipeId: 'RCP-03', stage: 'Mamul Stok', status: 'Sevke Hazır', startedAt: '2026-10-31T06:10:00+03:00', stageStartedAt: '2026-11-01T09:15:00+03:00', paused: false, scrapTon: 0.31, remainingMetalTon: 0, remainingDecision: 'Boş dökülüp hammaddeye', alerts: [], history: [{ stage: 'Ergitme', at: '2026-10-31T06:10:00+03:00' }, { stage: 'Döküm', at: '2026-10-31T08:30:00+03:00' }, { stage: 'Testere', at: '2026-10-31T11:00:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-10-31T14:00:00+03:00' }, { stage: 'Soğutma', at: '2026-10-31T21:00:00+03:00' }, { stage: 'Paketleme', at: '2026-11-01T08:00:00+03:00' }, { stage: 'Mamul Stok', at: '2026-11-01T09:15:00+03:00' }] },
    { id: 'DK-2026-0133', code: 'DK-2026-0133', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 90, weightTon: 18.0, furnaceId: 'F20', recipeId: 'RCP-01', stage: 'Paketleme', status: 'Devam ediyor', startedAt: '2026-11-01T05:30:00+03:00', stageStartedAt: '2026-11-02T08:10:00+03:00', paused: false, scrapTon: 0.18, remainingMetalTon: 2.0, remainingDecision: 'Ocakta bırakıldı', alerts: [], history: [{ stage: 'Ergitme', at: '2026-11-01T05:30:00+03:00' }, { stage: 'Döküm', at: '2026-11-01T07:45:00+03:00' }, { stage: 'Testere', at: '2026-11-01T10:20:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-11-01T13:00:00+03:00' }, { stage: 'Soğutma', at: '2026-11-01T19:00:00+03:00' }, { stage: 'Paketleme', at: '2026-11-02T08:10:00+03:00' }] },
    { id: 'DK-2026-0134', code: 'DK-2026-0134', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 86, weightTon: 17.2, furnaceId: 'F20', recipeId: 'RCP-01', stage: 'Soğutma', status: 'Devam ediyor', startedAt: '2026-11-01T12:00:00+03:00', stageStartedAt: '2026-11-02T07:20:00+03:00', paused: false, scrapTon: 0.27, remainingMetalTon: 0, remainingDecision: 'Başka ocağa aktarıldı', alerts: [], history: [{ stage: 'Ergitme', at: '2026-11-01T12:00:00+03:00' }, { stage: 'Döküm', at: '2026-11-01T14:30:00+03:00' }, { stage: 'Testere', at: '2026-11-01T17:00:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-11-01T20:00:00+03:00' }, { stage: 'Soğutma', at: '2026-11-02T07:20:00+03:00' }] },
    { id: 'DK-2026-0135', code: 'DK-2026-0135', alloy: '6061', diameterMm: 152, lengthM: 6.0, billetCount: 80, weightTon: 13.5, furnaceId: 'F35', recipeId: 'RCP-03', stage: 'Homojenizasyon', status: 'Süre Aşımı', startedAt: '2026-11-01T18:00:00+03:00', stageStartedAt: '2026-11-01T22:00:00+03:00', paused: false, scrapTon: 0.44, remainingMetalTon: 3.2, remainingDecision: null, alerts: ['Homojenizasyon reçete süresi aşıldı'], history: [{ stage: 'Ergitme', at: '2026-11-01T18:00:00+03:00' }, { stage: 'Döküm', at: '2026-11-01T20:10:00+03:00' }, { stage: 'Testere', at: '2026-11-01T21:20:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-11-01T22:00:00+03:00' }] },
    { id: 'DK-2026-0136', code: 'DK-2026-0136', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 84, weightTon: 16.9, furnaceId: 'F20', recipeId: 'RCP-01', stage: 'Testere', status: 'Devam ediyor', startedAt: '2026-11-02T00:30:00+03:00', stageStartedAt: '2026-11-02T09:40:00+03:00', paused: false, scrapTon: 0.35, remainingMetalTon: 1.1, remainingDecision: null, alerts: [], history: [{ stage: 'Ergitme', at: '2026-11-02T00:30:00+03:00' }, { stage: 'Döküm', at: '2026-11-02T03:00:00+03:00' }, { stage: 'Testere', at: '2026-11-02T09:40:00+03:00' }] },
    { id: 'DK-2026-0137', code: 'DK-2026-0137', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 0, weightTon: 17.6, furnaceId: 'F35', recipeId: 'RCP-02', stage: 'Döküm', status: 'Devam ediyor', startedAt: '2026-11-02T04:00:00+03:00', stageStartedAt: '2026-11-02T08:05:00+03:00', paused: false, scrapTon: 0.12, remainingMetalTon: null, remainingDecision: null, alerts: [], history: [{ stage: 'Ergitme', at: '2026-11-02T04:00:00+03:00' }, { stage: 'Döküm', at: '2026-11-02T08:05:00+03:00' }] },
    { id: 'DK-2026-0138', code: 'DK-2026-0138', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 0, weightTon: 20.0, furnaceId: 'F20', recipeId: 'RCP-01', stage: 'Ergitme', status: 'Devam ediyor', startedAt: '2026-11-02T06:10:00+03:00', stageStartedAt: '2026-11-02T06:10:00+03:00', paused: false, scrapTon: 0, remainingMetalTon: 3.0, remainingDecision: null, alerts: ['2. saatte karıştırma uyarısı'], history: [{ stage: 'Ergitme', at: '2026-11-02T06:10:00+03:00' }] }
  ],

  shipments: [
    { id: 'SV-0001', no: 'SV-2026-0089', date: '2026-11-01', lotIds: [], materialId: null, kind: 'Mamul', customer: 'Anadolu Profil A.Ş.', plate: '34 XYZ 987', weighbridgeKg: 18420, requestedKg: 18400, managerApproved: true, managerBy: 'U01', accountingApproved: true, accountBy: 'U11', invoiceNo: 'FTR-2026-1142', status: 'Arşivlendi', archived: true, notes: 'DK-2026-0130 parti sevki' },
    { id: 'SV-0002', no: 'SV-2026-0090', date: '2026-11-02', lotIds: ['DK-2026-0131'], materialId: null, kind: 'Mamul', customer: 'Marmara Alüminyum Ltd.', plate: '34 ABC 456', weighbridgeKg: 9200, requestedKg: 9200, managerApproved: true, managerBy: 'U01', accountingApproved: false, accountBy: null, invoiceNo: '', status: 'Muhasebe Onayı Bekliyor', archived: false, notes: 'Kantar fişi TF-2026-0418' },
    { id: 'SV-0003', no: 'SV-2026-0091', date: '2026-11-02', lotIds: [], materialId: 'B02', kind: 'Yan Ürün', customer: 'DEF Hurda', plate: '34 DEF 121', weighbridgeKg: 1450, requestedKg: 1450, managerApproved: false, managerBy: null, accountingApproved: false, accountBy: null, invoiceNo: '', status: 'Yönetici Onayı Bekliyor', archived: false, notes: 'Talaş satışı' },
    { id: 'SV-0004', no: 'SV-2026-0092', date: '2026-11-02', lotIds: ['DK-2026-0132'], materialId: null, kind: 'Mamul', customer: 'Ege Ekstrüzyon', plate: '35 EGE 212', weighbridgeKg: 7300, requestedKg: 7300, managerApproved: false, managerBy: null, accountingApproved: false, accountBy: null, invoiceNo: '', status: 'Yönetici Onayı Bekliyor', archived: false, notes: '' }
  ],

  notifications: [
    { id: 'NT-001', at: '2026-11-02T14:35:00+03:00', type: 'warning', title: 'Kritik stok: Alüminyum Hurda', body: 'Mevcut 3.200 kg, kritik alt sınır 5.000 kg. Acil sipariş önerilir.', read: false, source: 'Stok' },
    { id: 'NT-002', at: '2026-11-02T14:20:00+03:00', type: 'danger', title: 'Homojenizasyon süre aşımı', body: 'DK-2026-0135 beklenen 420 dk süreyi aştı, operatör duraklatmadı.', read: false, source: 'Üretim' },
    { id: 'NT-003', at: '2026-11-02T13:05:00+03:00', type: 'info', title: 'Ergitme zamanı: Karıştırma', body: 'DK-2026-0138 için 2. saat karıştırma uyarısı.', read: false, source: 'Ergitme' },
    { id: 'NT-004', at: '2026-11-02T11:16:00+03:00', type: 'warning', title: 'Fire oranı yükseldi', body: 'CR-001 işleminde fire oranı %6,86. Eşik %10.', read: true, source: 'Kırıcı' },
    { id: 'NT-005', at: '2026-11-02T10:45:00+03:00', type: 'info', title: 'Onay bekleyen sevkiyat', body: 'SV-2026-0090 muhasebe onayı bekliyor.', read: true, source: 'Sevkiyat' },
    { id: 'NT-006', at: '2026-11-02T09:00:00+03:00', type: 'success', title: 'Günlük yedekleme tamamlandı', body: 'Harici disk kopyası ve sağlama toplamı doğrulandı.', read: true, source: 'Sistem' },
    { id: 'NT-007', at: '2026-11-02T08:00:00+03:00', type: 'info', title: 'PLC telemetrisi', body: 'Ocak 1 sıcaklık sensörü 752 °C, eşik içinde.', read: true, source: 'PLC' }
  ],

  outbox: [
    { id: 'OB-0001', createdAt: '2026-11-02T14:21:00+03:00', channel: 'sms', to: '+9053x xxx xx 01', subject: 'Homojenizasyon süre aşımı', body: 'DK-2026-0135 homojenizasyon süresi aşıldı. Bakım kontrolü gerekli.', source: 'Üretim / Homojenizasyon', status: 'queued', attempt: 0, nextRetryAt: null, lastError: '' },
    { id: 'OB-0002', createdAt: '2026-11-02T13:06:00+03:00', channel: 'sms', to: '+9053x xxx xx 02', subject: 'Ergitme karıştırma uyarısı', body: 'DK-2026-0138: 2. saat karıştırma zamanı.', source: 'Üretim / Ergitme', status: 'queued', attempt: 0, nextRetryAt: null, lastError: '' },
    { id: 'OB-0003', createdAt: '2026-11-02T08:00:00+03:00', channel: 'email', to: 'yonetim@anadolu-aluminyum.local', subject: 'Günlük üretim raporu / 01.11.2026', body: 'Üretim 68,4 ton · Fire %2,1 · Kritik stok 2 kalem.', source: 'Zamanlanmış Rapor', status: 'sent', attempt: 1, nextRetryAt: null, lastError: '' },
    { id: 'OB-0004', createdAt: '2026-11-02T09:30:00+03:00', channel: 'email', to: 'gelistirici@anadolu-aluminyum.local', subject: 'Talep: Fiyat grafiğinde tedarikçi filtresi', body: 'Satın alma ekranında tedarikçi bazlı karşılaştırma istiyoruz.', source: 'Kullanıcı Talebi', status: 'sent', attempt: 1, nextRetryAt: null, lastError: '' },
    { id: 'OB-0005', createdAt: '2026-11-02T03:00:00+03:00', channel: 'cloud_backup', to: 'Şifreli uzak yedek', subject: 'Günlük yedek', body: 'backup_2026-11-02_0300.zip', source: 'Yedekleme', status: 'queued', attempt: 0, nextRetryAt: null, lastError: '' }
  ],

  users: [
    { id: 'U01', name: 'Cemil Korkmaz', username: 'c.korkmaz', role: 'Admin / Yönetici', department: 'Yönetim', active: true },
    { id: 'U02', name: 'Ayşe Yılmaz', username: 'a.yilmaz', role: 'Satın Alma', department: 'Satın Alma', active: true },
    { id: 'U03', name: 'Ahmet Yılmaz', username: 'ahmet.y', role: 'Stok Sorumlusu', department: 'Hammadde', active: true },
    { id: 'U04', name: 'Mehmet Kaya', username: 'm.kaya', role: 'Kırıcı Operatörü', department: 'Hammadde', active: true },
    { id: 'U06', name: 'Hasan Çelik', username: 'h.celik', role: 'Ocakçı / Ergitme', department: 'Üretim', active: true },
    { id: 'U07', name: 'Emre Şahin', username: 'e.sahin', role: 'Döküm Operatörü', department: 'Üretim', active: true },
    { id: 'U08', name: 'Fatih Aydın', username: 'f.aydin', role: 'Testere Operatörü', department: 'Üretim', active: true },
    { id: 'U09', name: 'Serkan Koç', username: 's.koc', role: 'Homojenizasyon', department: 'Üretim', active: true },
    { id: 'U10', name: 'Burak Öz', username: 'b.oz', role: 'Sevkiyat Sorumlusu', department: 'Sevkiyat', active: true },
    { id: 'U11', name: 'Elif Arslan', username: 'e.arslan', role: 'Muhasebe / Fatura', department: 'Muhasebe', active: true },
    { id: 'U12', name: 'Geliştirici (VPN)', username: 'dev.readonly', role: 'Görüntüleyici', department: 'Dış Erişim', active: true }
  ],

  activity: [
    { id: 'AC-001', at: '2026-11-02T14:30:00+03:00', text: 'DK-2026-0138 şarjına 800 kg hurda girildi', icon: 'flame', user: 'U06' },
    { id: 'AC-002', at: '2026-11-02T11:15:00+03:00', text: 'CR-001 kırıcı kaydı: 10,2 t → 9,5 t net', icon: 'recycle', user: 'U04' },
    { id: 'AC-003', at: '2026-11-02T10:00:00+03:00', text: 'MK-2026-0045 mal kabulü tamamlandı', icon: 'clipboard', user: 'U03' },
    { id: 'AC-004', at: '2026-11-02T08:40:00+03:00', text: 'DK-2026-0137 döküm sarf reçetesi uygulandı', icon: 'layers', user: 'U07' },
    { id: 'AC-005', at: '2026-11-02T08:05:00+03:00', text: 'DK-2026-0137 dökümü başlatıldı', icon: 'play', user: 'U07' },
    { id: 'AC-006', at: '2026-11-02T03:00:00+03:00', text: 'Günlük yedekleme harici diske yazıldı', icon: 'database', user: 'Sistem' },
    { id: 'AC-007', at: '2026-11-01T16:20:00+03:00', text: 'DK-2026-0136 testere kesimi tamamlandı', icon: 'scissors', user: 'U08' },
    { id: 'AC-008', at: '2026-11-01T09:15:00+03:00', text: 'DK-2026-0132 mamul stoka aktarıldı', icon: 'package', user: 'U09' }
  ]
};
