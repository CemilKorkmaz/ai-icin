// Demo verisi — prototipin tek kaynağı.
// `node tools/export_seed.mjs` bu dosyadan server/erp/data/*.json arşivini üretir.

export const STAGES = [
  'Ergitme', 'Döküm', 'Testere', 'Homojenizasyon', 'Soğutma', 'Paketleme', 'Mamul Stok', 'Sevkiyat'
];

export const CATEGORY_ORDER = ['Hammadde', 'Sarf Malzeme', 'Yardımcı Malzeme', 'Yan Ürün', 'Mamul'];

// Tek makine kaynağı. `furnaces` ve bütün referanslar buradan türetilir (docs/12 Bölüm 2).
const MACHINE_ROWS = [
    { id: 'MCH-01', plantId: 'P1', type: 'FURNACE', name: 'A Fırını', capacityTon: 20, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2021-04-12' },
    { id: 'MCH-02', plantId: 'P1', type: 'FURNACE', name: 'B Fırını', capacityTon: 35, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2021-04-12' },
    { id: 'MCH-03', plantId: 'P1', type: 'FURNACE', name: 'C Fırını', capacityTon: 20, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2022-08-03' },
    { id: 'MCH-04', plantId: 'P1', type: 'FURNACE', name: 'D Fırını', capacityTon: 35, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2023-02-19' },
    { id: 'MCH-05', plantId: 'P1', type: 'FURNACE', name: 'E Fırını', capacityTon: 20, mode: 'PLC', plcId: 'PLC-1', active: false, installedAt: '2025-06-11' },
    { id: 'MCH-06', plantId: 'P1', type: 'CAST_TABLE', name: 'Tabla 1', capacityTon: 1, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2021-04-12' },
    { id: 'MCH-07', plantId: 'P1', type: 'CAST_TABLE', name: 'Tabla 2', capacityTon: 1, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2022-08-03' },
    { id: 'MCH-08', plantId: 'P1', type: 'SAW', name: 'Testere 1', capacityTon: 0, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2021-05-02' },
    { id: 'MCH-09', plantId: 'P1', type: 'SAW', name: 'Testere 2', capacityTon: 0, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2023-01-18' },
    { id: 'MCH-10', plantId: 'P1', type: 'HOMO_FURNACE', name: 'Homojen 1', capacityTon: 25, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2021-04-12' },
    { id: 'MCH-11', plantId: 'P1', type: 'HOMO_FURNACE', name: 'Homojen 2', capacityTon: 25, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2021-04-12' },
    { id: 'MCH-12', plantId: 'P1', type: 'HOMO_FURNACE', name: 'Homojen 3', capacityTon: 25, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2022-09-14' },
    { id: 'MCH-13', plantId: 'P1', type: 'HOMO_FURNACE', name: 'Homojen 4', capacityTon: 25, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2024-03-07' },
    { id: 'MCH-14', plantId: 'P1', type: 'CONT_HOMO', name: 'Continue Homojen 1', capacityTon: 12, mode: 'PLC', plcId: 'PLC-1', active: true, installedAt: '2024-11-20' },
    { id: 'MCH-15', plantId: 'P2', type: 'FURNACE', name: '1. Ocak', capacityTon: 20, mode: 'MANUAL', plcId: null, active: true, installedAt: '2019-03-05' },
    { id: 'MCH-16', plantId: 'P2', type: 'FURNACE', name: '2. Ocak', capacityTon: 35, mode: 'MANUAL', plcId: null, active: true, installedAt: '2019-03-05' },
    { id: 'MCH-17', plantId: 'P2', type: 'CAST_TABLE', name: 'Tabla 1', capacityTon: 1, mode: 'MANUAL', plcId: null, active: true, installedAt: '2019-03-05' },
    { id: 'MCH-18', plantId: 'P2', type: 'SAW', name: 'Testere 1', capacityTon: 0, mode: 'MANUAL', plcId: null, active: true, installedAt: '2020-07-22' },
    { id: 'MCH-19', plantId: 'P2', type: 'HOMO_FURNACE', name: 'Homojen 1', capacityTon: 25, mode: 'MANUAL', plcId: null, active: true, installedAt: '2020-07-22' },
    { id: 'MCH-20', plantId: 'P2', type: 'ROTARY', name: 'Döner Ocak', capacityTon: 8, mode: 'MANUAL', plcId: null, active: true, installedAt: '2018-01-15' }
  ];

export const SEED = {
  schemaVersion: 4,

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
    lastBackup: '2026-11-02T03:00:00+03:00',
    activePlantId: 'P1',
    pollSeconds: 3,
    geometryTolerancePct: 2,
    version: '1.2',
    setupWizard: true,
    adapterMode: 'simulated',
    modulePolicy: 'plant',
    vatRate: 20,
    costingMethod: 'Ağırlıklı Ortalama',
    currentPeriod: '2026-11',
    defaultWarehouseId: 'W4',
    approvalLimitPurchase: 250000,
    creditCheckEnabled: true,
    autoPosting: true
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
    { id: 'MV-0001', at: '2026-11-02T14:30:00+03:00', type: 'Çıkış', materialId: 'H02', quantity: -800, source: 'Ergitme / A Fırını', ref: 'DK-2026-0138', remaining: 3200, userId: 'U06', notes: 'Şarj girişi' },
    { id: 'MV-0002', at: '2026-11-02T11:15:00+03:00', type: 'Fire', materialId: 'H02', quantity: -700, source: 'Kırıcı', ref: 'CR-001', remaining: 4000, userId: 'U04', notes: 'Nemli malzeme ayıklandı' },
    { id: 'MV-0003', at: '2026-11-02T11:15:00+03:00', type: 'Yan Ürün', materialId: 'B06', quantity: 700, source: 'Kırıcı', ref: 'CR-001', remaining: 700, userId: 'U04', notes: 'Kırıcı firesi stoğa girdi' },
    { id: 'MV-0004', at: '2026-11-02T10:00:00+03:00', type: 'Giriş', materialId: 'H02', quantity: 10200, source: 'Mal Kabul', ref: 'MK-2026-0045', remaining: 4700, userId: 'U03', notes: 'Tartı fişi TF-2026-0412' },
    { id: 'MV-0005', at: '2026-11-02T09:05:00+03:00', type: 'Yan Ürün', materialId: 'B04', quantity: 120, source: 'Döküm', ref: 'DK-2026-0137', remaining: 480, userId: 'U07', notes: 'Yolluk / filtre artığı (döngüsel)' },
    { id: 'MV-0006', at: '2026-11-02T08:40:00+03:00', type: 'Çıkış', materialId: 'S01', quantity: -12, source: 'Döküm', ref: 'DK-2026-0137', remaining: 145, userId: 'U07', notes: 'Döküm reçetesi sarf tüketimi' },
    { id: 'MV-0007', at: '2026-11-02T08:40:00+03:00', type: 'Çıkış', materialId: 'S02', quantity: -6, source: 'Döküm', ref: 'DK-2026-0137', remaining: 28, userId: 'U07', notes: 'Tıkaç tüketimi' },
    { id: 'MV-0008', at: '2026-11-02T07:50:00+03:00', type: 'Çıkış', materialId: 'H03', quantity: -50, source: 'Ergitme / A Fırını', ref: 'DK-2026-0138', remaining: 850, userId: 'U06', notes: 'Önerilen 80 kg, gerçekleşen 50 kg' },
    { id: 'MV-0009', at: '2026-11-02T07:50:00+03:00', type: 'Çıkış', materialId: 'H04', quantity: -32, source: 'Ergitme / A Fırını', ref: 'DK-2026-0138', remaining: 120, userId: 'U06', notes: 'Magnezyum' },
    { id: 'MV-0010', at: '2026-11-02T06:10:00+03:00', type: 'Çıkış', materialId: 'H01', quantity: -13600, source: 'Ergitme / A Fırını', ref: 'DK-2026-0138', remaining: 18500, userId: 'U06', notes: '20 ton şarj' },
    { id: 'MV-0011', at: '2026-11-01T16:20:00+03:00', type: 'Yan Ürün', materialId: 'B02', quantity: 310, source: 'Testere', ref: 'DK-2026-0136', remaining: 1500, userId: 'U08', notes: '3 mm bıçak talaşı' },
    { id: 'MV-0012', at: '2026-11-01T16:20:00+03:00', type: 'Çıkış', materialId: 'Y01', quantity: -8, source: 'Testere', ref: 'DK-2026-0136', remaining: 180, userId: 'U08', notes: 'Kesim sayısına göre yağ' },
    { id: 'MV-0013', at: '2026-11-01T15:10:00+03:00', type: 'Yan Ürün', materialId: 'B03', quantity: 240, source: 'Testere', ref: 'DK-2026-0136', remaining: 620, userId: 'U08', notes: 'Kafa kesimleri' },
    { id: 'MV-0014', at: '2026-11-01T11:30:00+03:00', type: 'Yan Ürün', materialId: 'B01', quantity: 430, source: 'Ergitme / B Fırını', ref: 'DK-2026-0135', remaining: 2800, userId: 'U06', notes: 'Cüruf çekimi' },
    { id: 'MV-0015', at: '2026-10-31T09:00:00+03:00', type: 'Giriş', materialId: 'S01', quantity: 200, source: 'Mal Kabul', ref: 'MK-2026-0044', remaining: 157, userId: 'U03', notes: '' },
    { id: 'MV-0016', at: '2026-10-30T14:00:00+03:00', type: 'Transfer', materialId: 'B01', quantity: 0, source: 'Döner Ocak', ref: 'RO-2026-0007', remaining: 2800, userId: 'U06', notes: 'Geri kazanım: 1,2 t tuz, 2,8 t cüruf → 1,6 t net metal' },
    { id: 'MV-0017', at: '2026-10-29T11:15:00+03:00', type: 'Fire', materialId: 'H02', quantity: -400, source: 'Kırıcı', ref: 'CR-002', remaining: 7600, userId: 'U04', notes: '' },
    { id: 'MV-0018', at: '2026-10-28T10:00:00+03:00', type: 'Giriş', materialId: 'H01', quantity: 10000, source: 'Mal Kabul', ref: 'MK-2026-0043', remaining: 32100, userId: 'U03', notes: '' },
    { id: 'MV-0019', at: '2026-10-27T13:40:00+03:00', type: 'Düzeltme', materialId: 'Y03', quantity: -2, source: 'Sayım', ref: 'SY-2026-0011', remaining: 12, userId: 'U01', notes: 'Aylık sayım farkı' },
    { id: 'MV-0020', at: '2026-10-26T17:00:00+03:00', type: 'Çıkış', materialId: 'B01', quantity: -1200, source: 'Sevkiyat', ref: 'SV-2026-0088', remaining: 2370, userId: 'U10', notes: 'Cüruf satışı, iki onay tamam' }
  ],

  // `furnaces` artık bağımsız bir kart değil, `machines` koleksiyonunun salt-okunur
  // projeksiyonudur. Eski ekranlar aynı alan adlarıyla çalışmaya devam eder.
  furnaces: MACHINE_ROWS.filter((m) => m.type === 'FURNACE' || m.type === 'ROTARY').map((m) => ({
    id: m.id, code: m.id, name: m.name, capacityTon: m.capacityTon,
    type: m.type === 'ROTARY' ? 'Cüruf geri kazanım' : 'Yatay ergitme',
    rotary: m.type === 'ROTARY', status: m.active ? 'Çalışıyor' : 'Beklemede',
    machineId: m.id, plantId: m.plantId
  })),

  recipes: [
    {
      id: 'RCP-01', type: 'Ergitme', name: '6063 / 20 Ton Ocak', alloy: '6063', machineId: 'MCH-01', capacityTon: 20, tempC: 750, durationMin: 240, diameterMm: null, coolingMin: 0,
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
      id: 'RCP-02', type: 'Ergitme', name: '6063 / 35 Ton Ocak', alloy: '6063', machineId: 'MCH-02', capacityTon: 35, tempC: 755, durationMin: 300, diameterMm: null, coolingMin: 0,
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
      id: 'RCP-03', type: 'Ergitme', name: '6061 / 20 Ton Ocak', alloy: '6061', machineId: 'MCH-01', capacityTon: 20, tempC: 760, durationMin: 260, diameterMm: null, coolingMin: 0,
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
      id: 'RCP-04', type: 'Döküm', name: '178 mm Biyet / Sarf Reçetesi', alloy: '6063', machineId: null, capacityTon: null, tempC: 720, durationMin: 0, diameterMm: 178, coolingMin: 0,
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
      id: 'RCP-05', type: 'Homojenizasyon', name: '6063 / 178 mm', alloy: '6063', machineId: null, capacityTon: null, tempC: 580, durationMin: 360, diameterMm: 178, coolingMin: 120,
      items: [{ materialId: 'Y05', perTon: 42, unit: 'm³', label: 'Doğalgaz (tahmini)' }],
      steps: [
        { atMin: 360, label: 'Homojenizasyon süresi doldu, soğutmaya aktar', materialId: null, suggestedQty: 0 },
        { atMin: 480, label: 'Soğutma süresi doldu, paketlemeye aktar', materialId: null, suggestedQty: 0 }
      ]
    },
    {
      id: 'RCP-06', type: 'Homojenizasyon', name: '6061 / 152 mm', alloy: '6061', machineId: null, capacityTon: null, tempC: 570, durationMin: 420, diameterMm: 152, coolingMin: 150,
      items: [{ materialId: 'Y05', perTon: 46, unit: 'm³', label: 'Doğalgaz (tahmini)' }],
      steps: [{ atMin: 420, label: 'Soğutmaya aktar', materialId: null, suggestedQty: 0 }]
    }
  ],

  lots: [
    { id: 'DK-2026-0131', code: 'DK-2026-0131', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 46, castLengthMm: 6300, netTon: 18.4, weightTon: 18.4, machineId: 'MCH-01', pathId: 'CP-1', recipeId: 'RCP-01', stage: 'Mamul Stok', status: 'Sevke Hazır', startedAt: '2026-10-30T05:40:00+03:00', stageStartedAt: '2026-10-31T12:20:00+03:00', paused: false, scrapTon: 0.22, remainingMetalTon: 1.6, remainingDecision: 'Ocakta bırakıldı', alerts: [], history: [{ stage: 'Ergitme', at: '2026-10-30T05:40:00+03:00' }, { stage: 'Döküm', at: '2026-10-30T07:55:00+03:00' }, { stage: 'Testere', at: '2026-10-30T10:10:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-10-30T13:00:00+03:00' }, { stage: 'Soğutma', at: '2026-10-30T19:00:00+03:00' }, { stage: 'Paketleme', at: '2026-10-31T10:00:00+03:00' }, { stage: 'Mamul Stok', at: '2026-10-31T12:20:00+03:00' }] },
    { id: 'DK-2026-0132', code: 'DK-2026-0132', alloy: '6061', diameterMm: 152, lengthM: 6.0, billetCount: 50, castLengthMm: 6300, netTon: 14.6, weightTon: 14.6, machineId: 'MCH-02', pathId: 'CP-2', recipeId: 'RCP-03', stage: 'Mamul Stok', status: 'Sevke Hazır', startedAt: '2026-10-31T06:10:00+03:00', stageStartedAt: '2026-11-01T09:15:00+03:00', paused: false, scrapTon: 0.31, remainingMetalTon: 0, remainingDecision: 'Boş dökülüp hammaddeye', alerts: [], history: [{ stage: 'Ergitme', at: '2026-10-31T06:10:00+03:00' }, { stage: 'Döküm', at: '2026-10-31T08:30:00+03:00' }, { stage: 'Testere', at: '2026-10-31T11:00:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-10-31T14:00:00+03:00' }, { stage: 'Soğutma', at: '2026-10-31T21:00:00+03:00' }, { stage: 'Paketleme', at: '2026-11-01T08:00:00+03:00' }, { stage: 'Mamul Stok', at: '2026-11-01T09:15:00+03:00' }] },
    { id: 'DK-2026-0133', code: 'DK-2026-0133', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 45, castLengthMm: 6300, netTon: 18.0, weightTon: 18.0, machineId: 'MCH-01', pathId: 'CP-1', recipeId: 'RCP-01', stage: 'Paketleme', status: 'Devam ediyor', startedAt: '2026-11-01T05:30:00+03:00', stageStartedAt: '2026-11-02T08:10:00+03:00', paused: false, scrapTon: 0.18, remainingMetalTon: 2.0, remainingDecision: 'Ocakta bırakıldı', alerts: [], history: [{ stage: 'Ergitme', at: '2026-11-01T05:30:00+03:00' }, { stage: 'Döküm', at: '2026-11-01T07:45:00+03:00' }, { stage: 'Testere', at: '2026-11-01T10:20:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-11-01T13:00:00+03:00' }, { stage: 'Soğutma', at: '2026-11-01T19:00:00+03:00' }, { stage: 'Paketleme', at: '2026-11-02T08:10:00+03:00' }] },
    { id: 'DK-2026-0134', code: 'DK-2026-0134', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 43, castLengthMm: 6300, netTon: 17.2, weightTon: 17.2, machineId: 'MCH-01', pathId: 'CP-3', recipeId: 'RCP-01', stage: 'Soğutma', status: 'Devam ediyor', startedAt: '2026-11-01T12:00:00+03:00', stageStartedAt: '2026-11-02T07:20:00+03:00', paused: false, scrapTon: 0.27, remainingMetalTon: 0, remainingDecision: 'Başka ocağa aktarıldı', alerts: [], history: [{ stage: 'Ergitme', at: '2026-11-01T12:00:00+03:00' }, { stage: 'Döküm', at: '2026-11-01T14:30:00+03:00' }, { stage: 'Testere', at: '2026-11-01T17:00:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-11-01T20:00:00+03:00' }, { stage: 'Soğutma', at: '2026-11-02T07:20:00+03:00' }] },
    { id: 'DK-2026-0135', code: 'DK-2026-0135', alloy: '6061', diameterMm: 152, lengthM: 6.0, billetCount: 46, castLengthMm: 6300, netTon: 13.5, weightTon: 13.5, machineId: 'MCH-02', pathId: 'CP-2', recipeId: 'RCP-03', stage: 'Homojenizasyon', status: 'Süre Aşımı', startedAt: '2026-11-01T18:00:00+03:00', stageStartedAt: '2026-11-01T22:00:00+03:00', paused: false, scrapTon: 0.44, remainingMetalTon: 3.2, remainingDecision: null, alerts: ['Homojenizasyon reçete süresi aşıldı'], history: [{ stage: 'Ergitme', at: '2026-11-01T18:00:00+03:00' }, { stage: 'Döküm', at: '2026-11-01T20:10:00+03:00' }, { stage: 'Testere', at: '2026-11-01T21:20:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-11-01T22:00:00+03:00' }] },
    { id: 'DK-2026-0136', code: 'DK-2026-0136', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 42, castLengthMm: 6300, netTon: 16.9, weightTon: 16.9, machineId: 'MCH-01', pathId: 'CP-1', recipeId: 'RCP-01', stage: 'Testere', status: 'Devam ediyor', startedAt: '2026-11-02T00:30:00+03:00', stageStartedAt: '2026-11-02T09:40:00+03:00', paused: false, scrapTon: 0.35, remainingMetalTon: 1.1, remainingDecision: null, alerts: [], history: [{ stage: 'Ergitme', at: '2026-11-02T00:30:00+03:00' }, { stage: 'Döküm', at: '2026-11-02T03:00:00+03:00' }, { stage: 'Testere', at: '2026-11-02T09:40:00+03:00' }] },
    { id: 'DK-2026-0137', code: 'DK-2026-0137', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 0, weightTon: 17.6, machineId: 'MCH-02', pathId: 'CP-1', recipeId: 'RCP-02', stage: 'Döküm', status: 'Devam ediyor', startedAt: '2026-11-02T04:00:00+03:00', stageStartedAt: '2026-11-02T08:05:00+03:00', paused: false, scrapTon: 0.12, remainingMetalTon: null, remainingDecision: null, alerts: [], history: [{ stage: 'Ergitme', at: '2026-11-02T04:00:00+03:00' }, { stage: 'Döküm', at: '2026-11-02T08:05:00+03:00' }] },
    { id: 'DK-2026-0139', code: 'DK-2026-0139', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 35, weightTon: 14.0, castLengthMm: 6300, netTon: 14.0, machineId: 'MCH-01', pathId: 'CP-1', recipeId: 'RCP-01', stage: 'Mamul Stok', status: 'Sevke Hazır', startedAt: '2026-11-01T06:00:00+03:00', stageStartedAt: '2026-11-02T10:00:00+03:00', paused: false, scrapTon: 0.115, remainingMetalTon: 1.0, remainingDecision: 'Yollukta kaldı', alerts: [], note: 'Saha görüşmesi örneği: 21 t → 3 t aktarım → 1 t yolluk → 17 t döküm → 14 t net biyet', history: [{ stage: 'Ergitme', at: '2026-11-01T06:00:00+03:00' }, { stage: 'Döküm', at: '2026-11-01T08:20:00+03:00' }, { stage: 'Testere', at: '2026-11-01T11:30:00+03:00' }, { stage: 'Homojenizasyon', at: '2026-11-01T14:00:00+03:00' }, { stage: 'Soğutma', at: '2026-11-01T23:10:00+03:00' }, { stage: 'Paketleme', at: '2026-11-02T08:00:00+03:00' }, { stage: 'Mamul Stok', at: '2026-11-02T10:00:00+03:00' }] },
    { id: 'DK-2026-0138', code: 'DK-2026-0138', alloy: '6063', diameterMm: 178, lengthM: 6.0, billetCount: 0, weightTon: 20.0, machineId: 'MCH-01', pathId: 'CP-1', recipeId: 'RCP-01', stage: 'Ergitme', status: 'Devam ediyor', startedAt: '2026-11-02T06:10:00+03:00', stageStartedAt: '2026-11-02T06:10:00+03:00', paused: false, scrapTon: 0, remainingMetalTon: 3.0, remainingDecision: null, alerts: ['2. saatte karıştırma uyarısı'], history: [{ stage: 'Ergitme', at: '2026-11-02T06:10:00+03:00' }] }
  ],

  shipments: [
    { id: 'SV-0001', no: 'SV-2026-0089', date: '2026-11-01', lotIds: [], materialId: null, kind: 'Mamul', customer: 'Anadolu Profil A.Ş.', plate: '34 XYZ 987', weighbridgeKg: 18420, requestedKg: 18400, managerApproved: true, managerBy: 'U01', accountingApproved: true, accountBy: 'U11', invoiceNo: 'FTR-2026-1142', status: 'Arşivlendi', archived: true, postingDone: true, notes: 'DK-2026-0130 parti sevki' },
    { id: 'SV-0002', no: 'SV-2026-0090', date: '2026-11-02', lotIds: ['DK-2026-0131'], materialId: null, kind: 'Mamul', customer: 'Marmara Alüminyum Ltd.', plate: '34 ABC 456', weighbridgeKg: 9200, requestedKg: 9200, managerApproved: true, managerBy: 'U01', accountingApproved: false, accountBy: null, invoiceNo: '', status: 'Muhasebe Onayı Bekliyor', archived: false, postingDone: false, notes: 'Kantar fişi TF-2026-0418' },
    { id: 'SV-0003', no: 'SV-2026-0091', date: '2026-11-02', lotIds: [], materialId: 'B02', kind: 'Yan Ürün', customer: 'DEF Hurda', plate: '34 DEF 121', weighbridgeKg: 1450, requestedKg: 1450, managerApproved: false, managerBy: null, accountingApproved: false, accountBy: null, invoiceNo: '', status: 'Yönetici Onayı Bekliyor', archived: false, postingDone: false, notes: 'Talaş satışı' },
    { id: 'SV-0004', no: 'SV-2026-0092', date: '2026-11-02', lotIds: ['DK-2026-0132'], materialId: null, kind: 'Mamul', customer: 'Ege Ekstrüzyon', plate: '35 EGE 212', weighbridgeKg: 7300, requestedKg: 7300, managerApproved: false, managerBy: null, accountingApproved: false, accountBy: null, invoiceNo: '', status: 'Yönetici Onayı Bekliyor', archived: false, postingDone: false, notes: '' },
    { id: 'SV-0005', no: 'SV-2026-0093', date: '2026-11-03', lotIds: ['DK-2026-0139'], materialId: null, kind: 'Mamul', customer: 'Anadolu Profil A.Ş.', plate: '34 ENT 118', weighbridgeKg: 14000, requestedKg: 14000, managerApproved: true, managerBy: 'U01', accountingApproved: true, accountBy: 'U11', invoiceNo: '', status: 'Onaylandı', archived: false, postingDone: false, notes: 'Entegrasyon demosu: iki onay tamam, muhasebe fişi bekliyor' },  ],

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

  plants: [
    { id: 'P1', code: 'FIRM1', name: 'Anadolu Alüminyum', city: 'Kocaeli', mode: 'PLC', active: true, note: '5 fırın, 2 döküm tablası, 4 homojen fırın, 2 testere, 1 sürekli homojenizasyon' },
    { id: 'P2', code: 'FIRM2', name: 'Marmara Alüminyum', city: 'Bursa', mode: 'MANUAL', active: true, note: 'Döner ocak var; PLC bağlantısı istenmiyor, operatör veri giriyor' },
    { id: 'P3', code: 'FIRM3', name: 'Ege Ekstrüzyon', city: 'İzmir', mode: 'PLC', active: false, note: 'Pasif demo profili' }
  ],

  machineTypes: [
    { id: 'MT1', code: 'FURNACE', name: 'Ergitme / Döküm Ocağı', icon: 'flame', capacityUnit: 'ton', signals: ['door', 'casting', 'alarm', 'running'] },
    { id: 'MT2', code: 'CAST_TABLE', name: 'Döküm Tablası', icon: 'layers', capacityUnit: 'hat', signals: ['casting', 'alarm', 'running'] },
    { id: 'MT3', code: 'SAW', name: 'Testere', icon: 'scissors', capacityUnit: 'kesim', signals: ['alarm', 'running'] },
    { id: 'MT4', code: 'HOMO_FURNACE', name: 'Homojenizasyon Fırını', icon: 'flame', capacityUnit: 'ton', signals: ['door', 'alarm', 'running'] },
    { id: 'MT5', code: 'CONT_HOMO', name: 'Sürekli Homojenizasyon Hattı', icon: 'refresh', capacityUnit: 'ton/saat', signals: ['alarm', 'running'] },
    { id: 'MT6', code: 'ROTARY', name: 'Döner Ocak', icon: 'recycle', capacityUnit: 'ton', signals: ['door', 'alarm', 'running'] }
  ],

  machines: MACHINE_ROWS.map((m) => ({
    status: m.active ? 'Aktif' : 'Devre Dışı',
    decommissionedAt: m.active ? null : '2025-06-11T00:00:00+03:00',
    decommissionReason: m.active ? '' : 'Bakıma alındı, parktan çıkarıldı',
    ...m
  })),

  castingPaths: [
    { id: 'CP-1', plantId: 'P1', fromMachineId: 'MCH-01', tableId: 'MCH-06', label: 'Kısa yol', holdTon: 1.0, note: 'A Fırını, Tabla 1' },
    { id: 'CP-2', plantId: 'P1', fromMachineId: 'MCH-02', tableId: 'MCH-06', label: 'Uzun yol', holdTon: 2.0, note: 'B Fırını, aynı tabla' },
    { id: 'CP-3', plantId: 'P1', fromMachineId: 'MCH-02', tableId: 'MCH-07', label: 'Orta yol', holdTon: 1.5, note: 'B Fırını, Tabla 2' },
    { id: 'CP-4', plantId: 'P2', fromMachineId: 'MCH-15', tableId: 'MCH-17', label: 'Kısa yol', holdTon: 0.8, note: 'PLC yok, operatör ölçer' },
    { id: 'CP-5', plantId: 'P2', fromMachineId: 'MCH-16', tableId: 'MCH-17', label: 'Uzun yol', holdTon: 1.4, note: 'PLC yok, operatör ölçer' }
  ],

  plcConnections: [
    { id: 'PLC-1', plantId: 'P1', name: 'Fırın hattı PLC', ip: '192.168.1.50', protocol: 'OPC UA', port: 4840, pollSeconds: 3, active: true },
    { id: 'PLC-2', plantId: 'P3', name: 'Ege hat PLC', ip: '192.168.2.50', protocol: 'Modbus TCP', port: 502, pollSeconds: 3, active: false }
  ],

  plcTags: [
    { id: 'TAG-01', plcId: 'PLC-1', machineId: 'MCH-01', signal: 'door', address: 'ns=2;s=F1.DoorOpen', invert: false, label: 'A Fırını Kapı' },
    { id: 'TAG-02', plcId: 'PLC-1', machineId: 'MCH-01', signal: 'casting', address: 'ns=2;s=F1.Pouring', invert: false, label: 'A Fırını Döküm Modu' },
    { id: 'TAG-03', plcId: 'PLC-1', machineId: 'MCH-01', signal: 'alarm', address: 'ns=2;s=F1.FaultLamp', invert: false, label: 'A Fırını Arıza Lambası' },
    { id: 'TAG-04', plcId: 'PLC-1', machineId: 'MCH-01', signal: 'running', address: 'ns=2;s=F1.Running', invert: false, label: 'A Fırını Çalışıyor' },
    { id: 'TAG-05', plcId: 'PLC-1', machineId: 'MCH-08', signal: 'door', address: 'ns=2;s=SAW1.Guard', invert: false, label: 'Testere 1 Koruma' },
    { id: 'TAG-06', plcId: 'PLC-1', machineId: 'MCH-08', signal: 'casting', address: 'ns=2;s=SAW1.CutActive', invert: false, label: 'Testere 1 Kesim' },
    { id: 'TAG-07', plcId: 'PLC-1', machineId: 'MCH-08', signal: 'alarm', address: 'ns=2;s=SAW1.FaultLamp', invert: false, label: 'Testere 1 Arıza Lambası' },
    { id: 'TAG-08', plcId: 'PLC-1', machineId: 'MCH-08', signal: 'running', address: 'ns=2;s=SAW1.Running', invert: false, label: 'Testere 1 Çalışıyor' },
    { id: 'TAG-09', plcId: 'PLC-1', machineId: 'MCH-10', signal: 'alarm', address: 'ns=2;s=H1.FaultLamp', invert: false, label: 'Homojen 1 Arıza Lambası' },
    { id: 'TAG-10', plcId: 'PLC-1', machineId: 'MCH-10', signal: 'running', address: 'ns=2;s=H1.Running', invert: false, label: 'Homojen 1 Çalışıyor' }
  ],

  signalStates: [
    { id: 'SIG-01', machineId: 'MCH-01', signal: 'door', value: 'closed', at: '2026-11-02T14:32:00+03:00', source: 'PLC' },
    { id: 'SIG-02', machineId: 'MCH-01', signal: 'casting', value: 'pouring', at: '2026-11-02T14:32:00+03:00', source: 'PLC' },
    { id: 'SIG-03', machineId: 'MCH-01', signal: 'alarm', value: 'ok', at: '2026-11-02T14:32:00+03:00', source: 'PLC' },
    { id: 'SIG-04', machineId: 'MCH-01', signal: 'running', value: 'running', at: '2026-11-02T14:32:00+03:00', source: 'PLC' },
    { id: 'SIG-05', machineId: 'MCH-08', signal: 'door', value: 'closed', at: '2026-11-02T14:32:00+03:00', source: 'PLC' },
    { id: 'SIG-06', machineId: 'MCH-08', signal: 'casting', value: 'idle', at: '2026-11-02T14:32:00+03:00', source: 'PLC' },
    { id: 'SIG-07', machineId: 'MCH-08', signal: 'alarm', value: 'fault', at: '2026-11-02T14:30:00+03:00', source: 'PLC' },
    { id: 'SIG-08', machineId: 'MCH-08', signal: 'running', value: 'stopped', at: '2026-11-02T14:32:00+03:00', source: 'PLC' },
    { id: 'SIG-09', machineId: 'MCH-10', signal: 'alarm', value: 'ok', at: '2026-11-02T14:32:00+03:00', source: 'PLC' },
    { id: 'SIG-10', machineId: 'MCH-10', signal: 'running', value: 'running', at: '2026-11-02T14:32:00+03:00', source: 'PLC' },
    { id: 'SIG-11', machineId: 'MCH-15', signal: 'door', value: 'open', at: '2026-11-02T14:20:00+03:00', source: 'MANUAL' },
    { id: 'SIG-12', machineId: 'MCH-15', signal: 'casting', value: 'tilting', at: '2026-11-02T14:20:00+03:00', source: 'MANUAL' },
    { id: 'SIG-13', machineId: 'MCH-15', signal: 'alarm', value: 'ok', at: '2026-11-02T14:20:00+03:00', source: 'MANUAL' },
    { id: 'SIG-14', machineId: 'MCH-15', signal: 'running', value: 'running', at: '2026-11-02T14:20:00+03:00', source: 'MANUAL' }
  ],

  homogenizationRecipes: [
    { id: 'HR-01', name: '6063 Standart', alloy: '6063', tempC: 575, plannedMinutes: 480, toleranceMin: 15, active: true },
    { id: 'HR-02', name: '6061 Uzun', alloy: '6061', tempC: 585, plannedMinutes: 540, toleranceMin: 20, active: true },
    { id: 'HR-03', name: '6063 Hızlı', alloy: '6063', tempC: 570, plannedMinutes: 420, toleranceMin: 10, active: true }
  ],

  homogenizationBatches: [
    { id: 'HMB-001', code: 'HMB-2026-0041', plantId: 'P1', machineId: 'MCH-10', recipeId: 'HR-01', status: 'Süre Aşımı', startedAt: '2026-11-01T22:00:00+03:00', endedAt: '2026-11-02T07:00:00+03:00', plannedMinutes: 480, actualMinutes: 540, lots: [{ lotId: 'DK-2026-0135', count: 20 }], totalCount: 20, operator: 'U09', note: '8 saat doldu, fırın 1 saat daha çalıştı' },
    { id: 'HMB-002', code: 'HMB-2026-0042', plantId: 'P1', machineId: 'MCH-11', recipeId: 'HR-01', status: 'Devam ediyor', startedAt: '2026-11-02T09:00:00+03:00', endedAt: null, plannedMinutes: 480, actualMinutes: null, lots: [{ lotId: 'DK-2026-0131', count: 20 }, { lotId: 'DK-2026-0132', count: 15 }, { lotId: 'DK-2026-0133', count: 10 }], totalCount: 45, operator: 'U09', note: 'Karışık parti: üç farklı döküm kodu' },
    { id: 'HMB-003', code: 'HMB-2026-0043', plantId: 'P1', machineId: 'MCH-12', recipeId: 'HR-02', status: 'Tamamlandı', startedAt: '2026-11-01T06:00:00+03:00', endedAt: '2026-11-01T15:00:00+03:00', plannedMinutes: 540, actualMinutes: 540, lots: [{ lotId: 'DK-2026-0134', count: 30 }], totalCount: 30, operator: 'U09', note: 'Planlanan sürede tamamlandı' },
    { id: 'HMB-004', code: 'HMB-2026-0044', plantId: 'P2', machineId: 'MCH-19', recipeId: 'HR-03', status: 'Tamamlandı', startedAt: '2026-10-31T08:00:00+03:00', endedAt: '2026-10-31T15:00:00+03:00', plannedMinutes: 420, actualMinutes: 420, lots: [{ lotId: 'DK-2026-0136', count: 25 }], totalCount: 25, operator: 'Operatör', note: 'PLC yok, süre operatör tarafından girildi' }
  ],

  coolingBatches: [
    { id: 'CL-001', code: 'SGT-2026-0041', batchId: 'HMB-003', plantId: 'P1', method: 'Hava + su spreyi', targetTempC: 40, startedAt: '2026-11-01T15:10:00+03:00', endedAt: '2026-11-01T19:00:00+03:00', status: 'Tamamlandı', operator: 'U09' },
    { id: 'CL-002', code: 'SGT-2026-0042', batchId: 'HMB-001', plantId: 'P1', method: 'Hava', targetTempC: 45, startedAt: '2026-11-02T07:10:00+03:00', endedAt: null, status: 'Devam ediyor', operator: 'U09' },
    { id: 'CL-003', code: 'SGT-2026-0043', batchId: 'HMB-004', plantId: 'P2', method: 'Doğal soğutma', targetTempC: 50, startedAt: '2026-10-31T15:10:00+03:00', endedAt: '2026-10-31T21:00:00+03:00', status: 'Tamamlandı', operator: 'Operatör' }
  ],

  oilRules: [
    { id: 'OIL-1', machineId: 'MCH-08', tankLitres: 120, cutsPerTank: 100, warnAt: 90, cutsSinceFill: 86, cutBasis: 'count', lastFillAt: '2026-11-01T08:00:00+03:00', active: true },
    { id: 'OIL-2', machineId: 'MCH-09', tankLitres: 120, cutsPerTank: 150, warnAt: 140, cutsSinceFill: 42, cutBasis: 'count', lastFillAt: '2026-11-02T06:00:00+03:00', active: true }
  ],

  bladeRules: [
    { id: 'BLD-1', machineId: 'MCH-08', maxCuts: 1200, warnAt: 1100, cutsSinceChange: 1140, bladeNo: 'B-2026-0088', bladeMm: 3, lastChangeAt: '2026-10-24T07:30:00+03:00', active: true },
    { id: 'BLD-2', machineId: 'MCH-09', maxCuts: 1500, warnAt: 1400, cutsSinceChange: 310, bladeNo: 'B-2026-0091', bladeMm: 3, lastChangeAt: '2026-11-01T07:30:00+03:00', active: true }
  ],

  maintenanceEvents: [
    { id: 'ME-001', kind: 'Yağ Dolumu', machineId: 'MCH-08', at: '2026-11-01T08:00:00+03:00', cutsAt: 100, user: 'U08', notes: 'Bir tank dolumu, sayaç sıfırlandı' },
    { id: 'ME-002', kind: 'Bıçak Değişimi', machineId: 'MCH-08', at: '2026-10-24T07:30:00+03:00', cutsAt: 1200, user: 'U08', notes: 'B-2026-0087 söküldü, B-2026-0088 takıldı' },
    { id: 'ME-003', kind: 'Bakıma Gönderildi', machineId: 'MCH-08', at: '2026-11-02T14:30:00+03:00', cutsAt: 1140, user: 'U08', notes: 'Arıza lambası yandı, ekip çağrıldı' },
    { id: 'ME-004', kind: 'Yağ Dolumu', machineId: 'MCH-09', at: '2026-11-02T06:00:00+03:00', cutsAt: 150, user: 'U08', notes: 'Firma 2 eşiği farklı: 150 kesim' }
  ],

  byProductFates: [
    { id: 'BF-1', materialId: 'B01', fate: 'recycle', destination: 'Döner ocak', note: 'Cüruf geri kazanımı' },
    { id: 'BF-2', materialId: 'B02', fate: 'sale', destination: 'Stone (doğrulanacak)', note: 'Talaş eritilemez, dışarı satılır' },
    { id: 'BF-3', materialId: 'B03', fate: 'remelt', destination: 'A Fırını', note: 'Kafa kesimi tekrar fırına' },
    { id: 'BF-4', materialId: 'B04', fate: 'recycle', destination: 'Döküm yolluğu', note: 'Döngüsel artık' },
    { id: 'BF-5', materialId: 'B05', fate: 'remelt', destination: 'Ergitme', note: 'Fire biyet' },
    { id: 'BF-6', materialId: 'B06', fate: 'waste', destination: 'Atık sahası', note: 'Nem / yabancı madde' }
  ],

  events: [
    { id: 'EV-0001', seq: 1, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-01', type: 'CAST_START', at: '2026-11-01T06:00:00+03:00', actor: 'U06', source: 'MANUAL', grossTon: 21, deltaTon: 21, balanceTon: 21, materialId: null, fate: 'product', ref: '', payload: { alloy: '6063', grossTon: 21 }, note: 'Şarj başlangıcı', clientId: 'CL-0001' },
    { id: 'EV-0002', seq: 2, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-01', type: 'TRANSFER', at: '2026-11-01T07:10:00+03:00', actor: 'U06', source: 'MANUAL', grossTon: 21, deltaTon: -3, balanceTon: 18, materialId: null, fate: 'remelt', ref: '', payload: { toMachineId: 'MCH-02' }, note: '3 ton başka ocağa aktarıldı', clientId: 'CL-0002' },
    { id: 'EV-0003', seq: 3, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-06', type: 'PATH_HOLD', at: '2026-11-01T08:20:00+03:00', actor: 'U07', source: 'MANUAL', grossTon: 18, deltaTon: -1, balanceTon: 17, materialId: 'B04', fate: 'recycle', ref: 'CP-1', payload: { pathId: 'CP-1', holdTon: 1 }, note: 'Kısa yol, yollukta 1 ton', clientId: 'CL-0003' },
    { id: 'EV-0004', seq: 4, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-06', type: 'CAST_NET', at: '2026-11-01T08:25:00+03:00', actor: 'U07', source: 'MANUAL', grossTon: 17, deltaTon: 0, balanceTon: 17, materialId: null, fate: 'product', ref: '', payload: { diameterMm: 178, castLengthMm: 6300, count: 40 }, note: 'Fiilen dökülen 17 ton', clientId: 'CL-0004' },
    { id: 'EV-0005', seq: 5, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-08', type: 'HEAD_CUT', at: '2026-11-01T11:30:00+03:00', actor: 'U08', source: 'MANUAL', grossTon: 17, deltaTon: -2.85, balanceTon: 14.15, materialId: 'B03', fate: 'remelt', ref: '', payload: { headMm: 300, headPerBillet: 2, headKg: 2850 }, note: 'Kafalar tekrar fırına', clientId: 'CL-0005' },
    { id: 'EV-0006', seq: 6, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-08', type: 'SAWDUST', at: '2026-11-01T11:35:00+03:00', actor: 'U08', source: 'MANUAL', grossTon: 14.15, deltaTon: -0.035, balanceTon: 14.115, materialId: 'B02', fate: 'sale', ref: '', payload: { bladeMm: 3, cuts: 172, sawdustKg: 34.7 }, note: '3 mm bıçak talaşı, satışa', clientId: 'CL-0006' },
    { id: 'EV-0007', seq: 7, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-08', type: 'SCRAP_BILLET', at: '2026-11-01T11:40:00+03:00', actor: 'U08', source: 'MANUAL', grossTon: 14.115, deltaTon: -0.115, balanceTon: 14, materialId: 'B05', fate: 'remelt', ref: '', payload: { scrapKg: 115, reason: 'Boy ölçüm hatası' }, note: 'Fire biyet', clientId: 'CL-0007' },
    { id: 'EV-0008', seq: 8, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-08', type: 'NET_BILLET', at: '2026-11-01T11:45:00+03:00', actor: 'U08', source: 'MANUAL', grossTon: 14, deltaTon: 0, balanceTon: 14, materialId: 'M01', fate: 'product', ref: '', payload: { count: 35, productLengthMm: 6000, netTon: 14 }, note: '14 ton net biyet', clientId: 'CL-0008' },
    { id: 'EV-0009', seq: 9, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-10', type: 'HOMOGEN_START', at: '2026-11-01T14:00:00+03:00', actor: 'U09', source: 'MANUAL', grossTon: 14, deltaTon: 0, balanceTon: 14, materialId: null, fate: 'product', ref: 'HMB-2026-0041', payload: { recipeId: 'HR-01', plannedMinutes: 480 }, note: 'Homojenizasyon start', clientId: 'CL-0009' },
    { id: 'EV-0010', seq: 10, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-10', type: 'HOMOGEN_OVERRUN', at: '2026-11-01T22:00:00+03:00', actor: 'system', source: 'WORKER', grossTon: 14, deltaTon: 0, balanceTon: 14, materialId: null, fate: 'product', ref: 'HMB-2026-0041', payload: { elapsedMinutes: 480, plannedMinutes: 480 }, note: '8 saat doldu, fırın hâlâ çalışıyor', clientId: 'CL-0010' },
    { id: 'EV-0011', seq: 11, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-10', type: 'HOMOGEN_END', at: '2026-11-01T23:00:00+03:00', actor: 'U09', source: 'MANUAL', grossTon: 14, deltaTon: 0, balanceTon: 14, materialId: null, fate: 'product', ref: 'HMB-2026-0041', payload: { actualMinutes: 540, overrunMinutes: 60 }, note: '9 saatte tamamlandı', clientId: 'CL-0011' },
    { id: 'EV-0012', seq: 12, lotId: 'DK-2026-0139', plantId: 'P1', machineId: null, type: 'COOLING_END', at: '2026-11-01T23:10:00+03:00', actor: 'U09', source: 'MANUAL', grossTon: 14, deltaTon: 0, balanceTon: 14, materialId: null, fate: 'product', ref: 'SGT-2026-0041', payload: { method: 'Hava + su spreyi', targetTempC: 40 }, note: 'Soğutma tamamlandı', clientId: 'CL-0012' },
    { id: 'EV-0013', seq: 13, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-08', type: 'OIL_WARNING', at: '2026-11-02T09:00:00+03:00', actor: 'system', source: 'WORKER', grossTon: 14, deltaTon: 0, balanceTon: 14, materialId: null, fate: null, ref: 'OIL-1', payload: { cutsSinceFill: 90, cutsPerTank: 100 }, note: 'Bakımcılara yağ dolum uyarısı', clientId: 'CL-0013' },
    { id: 'EV-0014', seq: 14, lotId: 'DK-2026-0139', plantId: 'P1', machineId: 'MCH-08', type: 'SIGNAL_ALARM', at: '2026-11-02T14:30:00+03:00', actor: 'plc', source: 'PLC', grossTon: 14, deltaTon: 0, balanceTon: 14, materialId: null, fate: null, ref: 'TAG-07', payload: { value: 'fault' }, note: 'Testere 1 arıza lambası yandı', clientId: 'CL-0014' }
  ],

  inboxQueue: [
    { id: 'IQ-0001', clientId: 'CL-1001', fileName: '2026-11-02_CL-1001.json', lotId: 'DK-2026-0139', type: 'NET_BILLET', status: 'archived', createdAt: '2026-11-02T14:00:00+03:00', processedAt: '2026-11-02T14:00:02+03:00', retryCount: 0, lastError: '' },
    { id: 'IQ-0002', clientId: 'CL-1002', fileName: '2026-11-02_CL-1002.json', lotId: 'DK-2026-0138', type: 'CAST_START', status: 'pending', createdAt: '2026-11-02T14:34:00+03:00', processedAt: null, retryCount: 0, lastError: '' },
    { id: 'IQ-0003', clientId: 'CL-1003', fileName: '2026-11-02_CL-1003.json', lotId: 'DK-2026-0137', type: 'PATH_HOLD', status: 'processing', createdAt: '2026-11-02T14:35:00+03:00', processedAt: null, retryCount: 0, lastError: '' },
    { id: 'IQ-0004', clientId: 'CL-1004', fileName: '2026-11-02_CL-1004.json', lotId: 'DK-2026-0136', type: 'HEAD_CUT', status: 'archived', createdAt: '2026-11-02T14:20:00+03:00', processedAt: '2026-11-02T14:20:01+03:00', retryCount: 0, lastError: '' },
    { id: 'IQ-0005', clientId: 'CL-1005', fileName: '2026-11-02_CL-1005.json', lotId: 'DK-2026-0135', type: 'HOMOGEN_END', status: 'dead', createdAt: '2026-11-02T13:10:00+03:00', processedAt: null, retryCount: 3, lastError: 'endedAt alanı eksik' }
  ],

  vendorUpdates: [
    { id: 'VU-001', plantId: 'P1', version: '0.9.0', kind: 'Kurulum', note: 'Firma 1 profili ve 14 makine tanımlandı', appliedBy: 'Max', at: '2026-10-01T09:00:00+03:00' },
    { id: 'VU-002', plantId: 'P1', version: '0.9.1', kind: 'Tag Eşlemesi', note: 'A Fırını dört PLC sinyali eşleştirildi', appliedBy: 'Max', at: '2026-10-03T11:20:00+03:00' },
    { id: 'VU-003', plantId: 'P2', version: '0.9.2', kind: 'Makine Eklendi', note: 'Döner ocak modülü, PLC olmadan', appliedBy: 'Max', at: '2026-10-18T15:45:00+03:00' },
    { id: 'VU-004', plantId: 'P1', version: '1.0.0', kind: 'Parametre Değişikliği', note: 'Uzun yol tutma miktarı 2,0 tona güncellendi', appliedBy: 'Max', at: '2026-11-01T10:00:00+03:00' },
    { id: 'VU-005', plantId: 'P1', version: '1.0.0', kind: 'Modül Güncellemesi', note: 'Olay tabanlı arşiv ve kesim hesap motoru', appliedBy: 'Max', at: '2026-11-02T08:30:00+03:00' }
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
  ],

  /* ------------------------------------------------------------------ */
  /* Genel ERP karşılaştırmasıyla eklenen ticari / finansal katman (v3)   */
  /* docs/11: tek kayıt çok etki, cari, fatura, maliyet, depo, vardiya    */
  /* ------------------------------------------------------------------ */

  accounts: [
    { id: 'A100', code: '100', name: 'Kasa', type: 'Dönen Varlık', normal: 'Borç', active: true },
    { id: 'A102', code: '102', name: 'Bankalar', type: 'Dönen Varlık', normal: 'Borç', active: true },
    { id: 'A120', code: '120', name: 'Alıcılar', type: 'Dönen Varlık', normal: 'Borç', active: true },
    { id: 'A150', code: '150', name: 'İlk Madde ve Malzeme', type: 'Dönen Varlık', normal: 'Borç', active: true },
    { id: 'A153', code: '153', name: 'Ticari Mallar', type: 'Dönen Varlık', normal: 'Borç', active: true },
    { id: 'A191', code: '191', name: 'İndirilecek KDV', type: 'Dönen Varlık', normal: 'Borç', active: true },
    { id: 'A320', code: '320', name: 'Satıcılar', type: 'Kısa Vadeli Borç', normal: 'Alacak', active: true },
    { id: 'A391', code: '391', name: 'Hesaplanan KDV', type: 'Kısa Vadeli Borç', normal: 'Alacak', active: true },
    { id: 'A600', code: '600', name: 'Yurt İçi Satışlar', type: 'Gelir', normal: 'Alacak', active: true },
    { id: 'A620', code: '620', name: 'Satılan Ticari Mal Maliyeti', type: 'Gider', normal: 'Borç', active: true },
    { id: 'A730', code: '730', name: 'Üretim Maliyeti', type: 'Maliyet', normal: 'Borç', active: true },
    { id: 'A740', code: '740', name: 'Genel Üretim Gideri', type: 'Maliyet', normal: 'Borç', active: true }
  ],

  customers: [
    { id: 'M01', code: 'M01', name: 'Anadolu Profil A.Ş.', tax: '1122334455', city: 'İstanbul', contact: 'Kemal Yıldız', phone: '0212 444 11 01', paymentTerm: '30 gün', creditLimit: 2500000, balance: 480000, risk: 'Düşük', active: true },
    { id: 'M02', code: 'M02', name: 'Marmara Alüminyum Ltd.', tax: '2233445566', city: 'Kocaeli', contact: 'Sibel Tunç', phone: '0262 444 22 02', paymentTerm: '45 gün', creditLimit: 1800000, balance: 620000, risk: 'Orta', active: true },
    { id: 'M03', code: 'M03', name: 'Ege Ekstrüzyon', tax: '3344556677', city: 'İzmir', contact: 'Onur Aksoy', phone: '0232 444 33 03', paymentTerm: '30 gün', creditLimit: 1200000, balance: 210000, risk: 'Düşük', active: true },
    { id: 'M04', code: 'M04', name: 'DEF Hurda', tax: '3234567803', city: 'Bursa', contact: 'Murat Kaya', phone: '0224 444 03 03', paymentTerm: 'Peşin', creditLimit: 600000, balance: 95000, risk: 'Düşük', active: true },
    { id: 'M05', code: 'M05', name: 'Bursa Profil Sanayi', tax: '4455667788', city: 'Bursa', contact: 'Nazlı Erdem', phone: '0224 444 55 05', paymentTerm: '60 gün', creditLimit: 900000, balance: 0, risk: 'Yeni', active: true }
  ],

  quotations: [
    { id: 'QT-001', no: 'TK-2026-0071', customerId: 'M01', date: '2026-10-20', alloy: '6063', diameterMm: 178, lengthMm: 6000, ton: 18, unitPrice: 118500, validUntil: '2026-11-05', status: 'Onaylandı', salesOrderId: 'SO-001', notes: 'Kasım sevki' },
    { id: 'QT-002', no: 'TK-2026-0072', customerId: 'M02', date: '2026-10-24', alloy: '6061', diameterMm: 152, lengthMm: 6000, ton: 14, unitPrice: 122000, validUntil: '2026-11-08', status: 'Onaylandı', salesOrderId: 'SO-002', notes: '' },
    { id: 'QT-003', no: 'TK-2026-0073', customerId: 'M03', date: '2026-10-28', alloy: '6063', diameterMm: 178, lengthMm: 6000, ton: 16, unitPrice: 119200, validUntil: '2026-11-12', status: 'Bekliyor', salesOrderId: null, notes: 'Fiyat revizyonu istendi' },
    { id: 'QT-004', no: 'TK-2026-0074', customerId: 'M05', date: '2026-10-15', alloy: '6063', diameterMm: 152, lengthMm: 6000, ton: 12, unitPrice: 117800, validUntil: '2026-10-30', status: 'Kaybedildi', salesOrderId: null, notes: 'Rakip daha düşük teklif verdi' }
  ],

  salesOrders: [
    { id: 'SO-001', no: 'SS-2026-0211', customerId: 'M01', quotationId: 'QT-001', date: '2026-10-22', deliveryDate: '2026-11-04', alloy: '6063', diameterMm: 178, lengthMm: 6000, ton: 18, unitPrice: 118500, shippedTon: 0, reservedTon: 18, status: 'Açık', creditApproved: true, createdBy: 'U01', notes: 'DK-2026-0131 rezerve edildi' },
    { id: 'SO-002', no: 'SS-2026-0212', customerId: 'M02', quotationId: 'QT-002', date: '2026-10-25', deliveryDate: '2026-11-06', alloy: '6061', diameterMm: 152, lengthMm: 6000, ton: 14, unitPrice: 122000, shippedTon: 9.2, reservedTon: 4.8, status: 'Kısmi Sevk', creditApproved: true, createdBy: 'U01', notes: 'SV-2026-0092 kısmi çıkış' },
    { id: 'SO-003', no: 'SS-2026-0213', customerId: 'M03', quotationId: null, date: '2026-10-29', deliveryDate: '2026-11-10', alloy: '6063', diameterMm: 178, lengthMm: 6000, ton: 16, unitPrice: 119500, shippedTon: 0, reservedTon: 0, status: 'Kredi Onayı Bekliyor', creditApproved: false, createdBy: 'U02', notes: 'Limit kullanımı yüksek' },
    { id: 'SO-004', no: 'SS-2026-0214', customerId: 'M04', quotationId: null, date: '2026-11-01', deliveryDate: '2026-11-03', alloy: 'Yan Ürün', diameterMm: 0, lengthMm: 0, ton: 1.45, unitPrice: 34000, shippedTon: 1.45, reservedTon: 0, status: 'Sevk Edildi', creditApproved: true, createdBy: 'U10', notes: 'Talaş satışı' },
    { id: 'SO-005', no: 'SS-2026-0215', customerId: 'M05', quotationId: 'QT-004', date: '2026-11-02', deliveryDate: '2026-11-15', alloy: '6063', diameterMm: 152, lengthMm: 6000, ton: 12, unitPrice: 118000, shippedTon: 0, reservedTon: 0, status: 'Onay Bekliyor', creditApproved: false, createdBy: 'U02', notes: 'Yeni müşteri, ön ödeme talep edildi' }
  ],

  purchaseRequests: [
    { id: 'PR-001', no: 'ST-2026-0081', materialId: 'H02', quantity: 10000, unit: 'kg', requestedBy: 'U03', department: 'Hammadde', neededBy: '2026-11-06', reason: 'Kritik stok: 3.200 kg, alt sınır 5.000 kg', status: 'Siparişe Dönüştü', approvedBy: 'U01', orderId: 'PO-003', createdAt: '2026-10-30T09:20:00+03:00' },
    { id: 'PR-002', no: 'ST-2026-0082', materialId: 'S02', quantity: 150, unit: 'adet', requestedBy: 'U07', department: 'Döküm', neededBy: '2026-11-05', reason: 'Döküm sarfı tükendi', status: 'Onaylandı', approvedBy: 'U01', orderId: null, createdAt: '2026-11-01T08:10:00+03:00' },
    { id: 'PR-003', no: 'ST-2026-0083', materialId: 'H04', quantity: 200, unit: 'kg', requestedBy: 'U06', department: 'Ergitme', neededBy: '2026-11-07', reason: '6063 reçetesi Mg takviyesi', status: 'Onay Bekliyor', approvedBy: null, orderId: null, createdAt: '2026-11-02T07:45:00+03:00' },
    { id: 'PR-004', no: 'ST-2026-0084', materialId: 'Y03', quantity: 8, unit: 'adet', requestedBy: 'U08', department: 'Testere', neededBy: '2026-11-09', reason: 'Bıçak ömrü 150 kesime yaklaştı', status: 'Onaylandı', approvedBy: 'U01', orderId: null, createdAt: '2026-11-02T09:30:00+03:00' },
    { id: 'PR-005', no: 'ST-2026-0085', materialId: 'Y02', quantity: 500, unit: 'kg', requestedBy: 'U06', department: 'Ergitme', neededBy: '2026-11-12', reason: 'Döner ocak tuz/flux ihtiyacı', status: 'Reddedildi', approvedBy: 'U01', orderId: null, createdAt: '2026-11-02T13:05:00+03:00' }
  ],

  purchaseQuotes: [
    { id: 'PQ-001', requestId: 'PR-002', supplierId: 'T02', unitPrice: 5.5, quantity: 150, leadDays: 3, validUntil: '2026-11-10', status: 'Seçildi', score: 92 },
    { id: 'PQ-002', requestId: 'PR-002', supplierId: 'T04', unitPrice: 5.9, quantity: 150, leadDays: 7, validUntil: '2026-11-12', status: 'Reddedildi', score: 74 },
    { id: 'PQ-003', requestId: 'PR-003', supplierId: 'T02', unitPrice: 225.0, quantity: 200, leadDays: 5, validUntil: '2026-11-15', status: 'Bekliyor', score: 88 },
    { id: 'PQ-004', requestId: 'PR-003', supplierId: 'T04', unitPrice: 219.0, quantity: 200, leadDays: 9, validUntil: '2026-11-16', status: 'Bekliyor', score: 81 },
    { id: 'PQ-005', requestId: 'PR-004', supplierId: 'T04', unitPrice: 640.0, quantity: 8, leadDays: 4, validUntil: '2026-11-14', status: 'Bekliyor', score: 90 },
    { id: 'PQ-006', requestId: 'PR-004', supplierId: 'T02', unitPrice: 665.0, quantity: 8, leadDays: 2, validUntil: '2026-11-11', status: 'Bekliyor', score: 86 }
  ],

  invoices: [
    { id: 'INV-001', no: 'FTR-2026-1142', direction: 'Satış', partyType: 'customer', partyId: 'M01', date: '2026-11-01', dueDate: '2026-12-01', net: 1542000, vatRate: 20, vat: 308400, gross: 1850400, status: 'Kısmi', sourceType: 'Sevkiyat', sourceId: 'SV-0001', currency: '₺', period: '2026-11' },
    { id: 'INV-002', no: 'FTR-2026-1143', direction: 'Satış', partyType: 'customer', partyId: 'M02', date: '2026-11-02', dueDate: '2026-12-17', net: 920000, vatRate: 20, vat: 184000, gross: 1104000, status: 'Bekliyor', sourceType: 'Sevkiyat', sourceId: 'SV-0002', currency: '₺', period: '2026-11' },
    { id: 'INV-003', no: 'AF-2026-0311', direction: 'Alış', partyType: 'supplier', partyId: 'T01', date: '2026-10-28', dueDate: '2026-11-27', net: 852000, vatRate: 20, vat: 170400, gross: 1022400, status: 'Ödendi', sourceType: 'Satın Alma', sourceId: 'PO-001', currency: '₺', period: '2026-10' },
    { id: 'INV-004', no: 'AF-2026-0312', direction: 'Alış', partyType: 'supplier', partyId: 'T02', date: '2026-10-25', dueDate: '2026-12-09', net: 315000, vatRate: 20, vat: 63000, gross: 378000, status: 'Bekliyor', sourceType: 'Satın Alma', sourceId: 'PO-002', currency: '₺', period: '2026-10' },
    { id: 'INV-005', no: 'FTR-2026-1144', direction: 'Satış', partyType: 'customer', partyId: 'M04', date: '2026-11-02', dueDate: '2026-11-02', net: 49300, vatRate: 20, vat: 9860, gross: 59160, status: 'Ödendi', sourceType: 'Sevkiyat', sourceId: 'SV-0003', currency: '₺', period: '2026-11' },
    { id: 'INV-006', no: 'AF-2026-0313', direction: 'Alış', partyType: 'supplier', partyId: 'T05', date: '2026-10-30', dueDate: '2026-11-29', net: 3840, vatRate: 20, vat: 768, gross: 4608, status: 'Ödendi', sourceType: 'Satın Alma', sourceId: 'PO-004', currency: '₺', period: '2026-10' }
  ],

  journalEntries: [
    { id: 'JE-001', no: 'MF-2026-0001', date: '2026-11-01', period: '2026-11', description: 'SV-2026-0089 satış faturası', sourceModule: 'Satış', sourceId: 'FTR-2026-1142', clientId: 'SALE-FTR-2026-1142', postedBy: 'U11', totalDebit: 1850400, totalCredit: 1850400, balanced: true, lines: [
      { accountId: 'A120', accountCode: '120', debit: 1850400, credit: 0, note: 'Alıcılar' },
      { accountId: 'A600', accountCode: '600', debit: 0, credit: 1542000, note: 'Yurt içi satışlar' },
      { accountId: 'A391', accountCode: '391', debit: 0, credit: 308400, note: 'Hesaplanan KDV' }
    ] },
    { id: 'JE-002', no: 'MF-2026-0002', date: '2026-10-28', period: '2026-10', description: 'PO-001 alış faturası', sourceModule: 'Satın Alma', sourceId: 'AF-2026-0311', clientId: 'PURCHASE-AF-2026-0311', postedBy: 'U11', totalDebit: 1022400, totalCredit: 1022400, balanced: true, lines: [
      { accountId: 'A150', accountCode: '150', debit: 852000, credit: 0, note: 'İlk madde ve malzeme' },
      { accountId: 'A191', accountCode: '191', debit: 170400, credit: 0, note: 'İndirilecek KDV' },
      { accountId: 'A320', accountCode: '320', debit: 0, credit: 1022400, note: 'Satıcılar' }
    ] },
    { id: 'JE-003', no: 'MF-2026-0003', date: '2026-11-02', period: '2026-11', description: 'Müşteri tahsilatı', sourceModule: 'Finans', sourceId: 'PAY-001', clientId: 'PAY-001', postedBy: 'U11', totalDebit: 480000, totalCredit: 480000, balanced: true, lines: [
      { accountId: 'A102', accountCode: '102', debit: 480000, credit: 0, note: 'Banka' },
      { accountId: 'A120', accountCode: '120', debit: 0, credit: 480000, note: 'Alıcılar' }
    ] },
    { id: 'JE-004', no: 'MF-2026-0004', date: '2026-11-02', period: '2026-11', description: 'Tedarikçi ödemesi', sourceModule: 'Finans', sourceId: 'PAY-002', clientId: 'PAY-002', postedBy: 'U11', totalDebit: 620000, totalCredit: 620000, balanced: true, lines: [
      { accountId: 'A320', accountCode: '320', debit: 620000, credit: 0, note: 'Satıcılar' },
      { accountId: 'A102', accountCode: '102', debit: 0, credit: 620000, note: 'Banka' }
    ] },
    { id: 'JE-005', no: 'MF-2026-0005', date: '2026-11-02', period: '2026-11', description: 'DK-2026-0139 üretim maliyeti aktarımı', sourceModule: 'Üretim', sourceId: 'CR-004', clientId: 'COST-CR-004', postedBy: 'U11', totalDebit: 412000, totalCredit: 412000, balanced: true, lines: [
      { accountId: 'A730', accountCode: '730', debit: 412000, credit: 0, note: 'Üretim maliyeti' },
      { accountId: 'A150', accountCode: '150', debit: 0, credit: 355000, note: 'Hammadde çıkışı' },
      { accountId: 'A102', accountCode: '102', debit: 0, credit: 57000, note: 'Enerji + işçilik' }
    ] },
    { id: 'JE-006', no: 'MF-2026-0006', date: '2026-11-02', period: '2026-11', description: 'Mamul biyet stok girişi', sourceModule: 'Üretim', sourceId: 'DK-2026-0139', clientId: 'STOCK-DK-2026-0139', postedBy: 'U11', totalDebit: 412000, totalCredit: 412000, balanced: true, lines: [
      { accountId: 'A153', accountCode: '153', debit: 412000, credit: 0, note: 'Ticari mallar' },
      { accountId: 'A730', accountCode: '730', debit: 0, credit: 412000, note: 'Üretim maliyeti' }
    ] },
    { id: 'JE-007', no: 'MF-2026-0007', date: '2026-11-02', period: '2026-11', description: 'Satılan mal maliyeti', sourceModule: 'Maliyet', sourceId: 'SV-0001', clientId: 'COGS-SV-0001', postedBy: 'U11', totalDebit: 371000, totalCredit: 371000, balanced: true, lines: [
      { accountId: 'A620', accountCode: '620', debit: 371000, credit: 0, note: 'Satılan mal maliyeti' },
      { accountId: 'A153', accountCode: '153', debit: 0, credit: 371000, note: 'Ticari mallar' }
    ] },
    { id: 'JE-008', no: 'MF-2026-0008', date: '2026-11-03', period: '2026-11', description: 'Fiziki sayım fazlası düzeltmesi', sourceModule: 'Depo', sourceId: 'SC-001', clientId: 'COUNT-SC-001', postedBy: 'U11', totalDebit: 12500, totalCredit: 12500, balanced: true, lines: [
      { accountId: 'A153', accountCode: '153', debit: 12500, credit: 0, note: 'Sayım fazlası 125 kg' },
      { accountId: 'A730', accountCode: '730', debit: 0, credit: 12500, note: 'Maliyet düzeltmesi' }
    ] }
  ],

  payments: [
    { id: 'PAY-001', no: 'TH-2026-0041', kind: 'Tahsilat', partyType: 'customer', partyId: 'M01', date: '2026-11-02', amount: 480000, method: 'Banka', invoiceId: 'INV-001', journalId: 'JE-003', notes: 'Kısmi tahsilat' },
    { id: 'PAY-002', no: 'OD-2026-0038', kind: 'Ödeme', partyType: 'supplier', partyId: 'T01', date: '2026-11-02', amount: 620000, method: 'Banka', invoiceId: 'INV-003', journalId: 'JE-004', notes: 'Külçe alımı' },
    { id: 'PAY-003', no: 'TH-2026-0042', kind: 'Tahsilat', partyType: 'customer', partyId: 'M04', date: '2026-11-02', amount: 59160, method: 'Kasa', invoiceId: 'INV-005', journalId: null, notes: 'Talaş satışı peşin' },
    { id: 'PAY-004', no: 'OD-2026-0039', kind: 'Ödeme', partyType: 'supplier', partyId: 'T05', date: '2026-10-30', amount: 4608, method: 'Banka', invoiceId: 'INV-006', journalId: null, notes: 'Argon tüp' },
    { id: 'PAY-005', no: 'TH-2026-0043', kind: 'Tahsilat', partyType: 'customer', partyId: 'M02', date: '2026-11-03', amount: 250000, method: 'Banka', invoiceId: 'INV-002', journalId: null, notes: 'Ön ödeme' },
    { id: 'PAY-006', no: 'OD-2026-0040', kind: 'Ödeme', partyType: 'supplier', partyId: 'T02', date: '2026-11-03', amount: 180000, method: 'Banka', invoiceId: 'INV-004', journalId: null, notes: 'Sarf malzeme kısmi' }
  ],

  warehouses: [
    { id: 'W1', code: 'W1', name: 'Hammadde Deposu', plantId: 'P1', kind: 'Hammadde', capacityTon: 200, keeperId: 'U03', active: true },
    { id: 'W2', code: 'W2', name: 'Sarf Deposu', plantId: 'P1', kind: 'Sarf Malzeme', capacityTon: 40, keeperId: 'U03', active: true },
    { id: 'W3', code: 'W3', name: 'Yan Ürün Deposu', plantId: 'P1', kind: 'Yan Ürün', capacityTon: 60, keeperId: 'U04', active: true },
    { id: 'W4', code: 'W4', name: 'Mamul Biyet Deposu', plantId: 'P1', kind: 'Mamul', capacityTon: 500, keeperId: 'U10', active: true },
    { id: 'W5', code: 'W5', name: 'Sevkiyat Sahası', plantId: 'P1', kind: 'Geçici', capacityTon: 80, keeperId: 'U10', active: true }
  ],

  stockCounts: [
    { id: 'SC-001', no: 'SY-2026-0011', warehouseId: 'W4', materialId: 'M01', expectedKg: 54000, countedKg: 54125, differenceKg: 125, countedBy: 'U03', at: '2026-11-03T08:30:00+03:00', status: 'Onaylandı', journalId: 'JE-008' },
    { id: 'SC-002', no: 'SY-2026-0012', warehouseId: 'W1', materialId: 'H01', expectedKg: 18500, countedKg: 18480, differenceKg: -20, countedBy: 'U03', at: '2026-11-03T09:10:00+03:00', status: 'Fark Bekliyor', journalId: null },
    { id: 'SC-003', no: 'SY-2026-0013', warehouseId: 'W2', materialId: 'S02', expectedKg: 28, countedKg: 28, differenceKg: 0, countedBy: 'U04', at: '2026-11-03T09:40:00+03:00', status: 'Onaylandı', journalId: null },
    { id: 'SC-004', no: 'SY-2026-0014', warehouseId: 'W3', materialId: 'B02', expectedKg: 1500, countedKg: 1505, differenceKg: 5, countedBy: 'U04', at: '2026-11-03T10:05:00+03:00', status: 'Taslak', journalId: null }
  ],

  reservations: [
    { id: 'RSV-001', salesOrderId: 'SO-001', lotId: 'DK-2026-0131', warehouseId: 'W4', ton: 18, status: 'Aktif', createdAt: '2026-10-22T10:00:00+03:00', note: 'Tüm döküm kodu rezerve' },
    { id: 'RSV-002', salesOrderId: 'SO-002', lotId: 'DK-2026-0132', warehouseId: 'W4', ton: 14, status: 'Kısmi Sevk', createdAt: '2026-10-25T11:20:00+03:00', note: '9,2 t sevk edildi' },
    { id: 'RSV-003', salesOrderId: 'SO-003', lotId: 'DK-2026-0134', warehouseId: 'W4', ton: 16, status: 'Onay Bekliyor', createdAt: '2026-10-29T14:10:00+03:00', note: 'Kredi onayı sonrası aktifleşir' },
    { id: 'RSV-004', salesOrderId: 'SO-004', lotId: '—', warehouseId: 'W3', ton: 1.45, status: 'Sevk Edildi', createdAt: '2026-11-01T09:00:00+03:00', note: 'Talaş, döküm kodu yok' },
    { id: 'RSV-005', salesOrderId: 'SO-005', lotId: 'DK-2026-0133', warehouseId: 'W4', ton: 12, status: 'İptal', createdAt: '2026-11-02T15:00:00+03:00', note: 'Müşteri siparişi askıda' }
  ],

  costRecords: [
    { id: 'CR-001', lotId: 'DK-2026-0131', period: '2026-11', netTon: 18.4, materialCost: 462000, energyCost: 41000, consumableCost: 12500, laborCost: 15000, scrapCost: 4500, totalCost: 535000, unitCostPerTon: 29076.09, unitCostPerKg: 29.0761, method: 'Ağırlıklı Ortalama', status: 'Hesaplandı' },
    { id: 'CR-002', lotId: 'DK-2026-0132', period: '2026-11', netTon: 14.6, materialCost: 372000, energyCost: 34000, consumableCost: 9800, laborCost: 13000, scrapCost: 3200, totalCost: 432000, unitCostPerTon: 29589.04, unitCostPerKg: 29.5890, method: 'Ağırlıklı Ortalama', status: 'Hesaplandı' },
    { id: 'CR-003', lotId: 'DK-2026-0133', period: '2026-11', netTon: 18.0, materialCost: 455000, energyCost: 40000, consumableCost: 12100, laborCost: 14800, scrapCost: 4100, totalCost: 526000, unitCostPerTon: 29222.22, unitCostPerKg: 29.2222, method: 'Ağırlıklı Ortalama', status: 'Hesaplandı' },
    { id: 'CR-004', lotId: 'DK-2026-0139', period: '2026-11', netTon: 14.0, materialCost: 355000, energyCost: 32000, consumableCost: 9500, laborCost: 12000, scrapCost: 3500, totalCost: 412000, unitCostPerTon: 29428.57, unitCostPerKg: 29.4286, method: 'Ağırlıklı Ortalama', status: 'Hesaplandı' },
    { id: 'CR-005', lotId: 'DK-2026-0134', period: '2026-11', netTon: 17.2, materialCost: 440000, energyCost: 38000, consumableCost: 11000, laborCost: 14000, scrapCost: 3900, totalCost: 506900, unitCostPerTon: 29470.93, unitCostPerKg: 29.4709, method: 'Ağırlıklı Ortalama', status: 'Taslak' }
  ],

  employees: [
    { id: 'EMP-01', userId: 'U06', name: 'Hasan Çelik', department: 'Üretim', role: 'Ocakçı / Ergitme', shiftId: 'SH-01', startDate: '2021-03-15', payrollRef: 'Harici bordro servisi', active: true },
    { id: 'EMP-02', userId: 'U07', name: 'Emre Şahin', department: 'Üretim', role: 'Döküm Operatörü', shiftId: 'SH-01', startDate: '2022-06-01', payrollRef: 'Harici bordro servisi', active: true },
    { id: 'EMP-03', userId: 'U08', name: 'Fatih Aydın', department: 'Üretim', role: 'Testere Operatörü', shiftId: 'SH-02', startDate: '2020-09-10', payrollRef: 'Harici bordro servisi', active: true },
    { id: 'EMP-04', userId: 'U09', name: 'Serkan Koç', department: 'Üretim', role: 'Homojenizasyon', shiftId: 'SH-02', startDate: '2023-01-09', payrollRef: 'Harici bordro servisi', active: true },
    { id: 'EMP-05', userId: 'U03', name: 'Ahmet Yılmaz', department: 'Hammadde', role: 'Stok Sorumlusu', shiftId: 'SH-03', startDate: '2019-11-04', payrollRef: 'Harici bordro servisi', active: true },
    { id: 'EMP-06', userId: 'U11', name: 'Elif Arslan', department: 'Muhasebe', role: 'Muhasebe / Fatura', shiftId: 'SH-03', startDate: '2021-07-19', payrollRef: 'Harici bordro servisi', active: true }
  ],

  shifts: [
    { id: 'SH-01', name: 'A Vardiyası', start: '06:00', end: '14:00', plantId: 'P1', date: '2026-11-03', supervisorId: 'U06', operatorIds: ['U06', 'U07'], handoverNote: 'DK-2026-0138 şarjı devredildi', eventCount: 4 },
    { id: 'SH-02', name: 'B Vardiyası', start: '14:00', end: '22:00', plantId: 'P1', date: '2026-11-03', supervisorId: 'U09', operatorIds: ['U08', 'U09'], handoverNote: 'Testere 1 yağ sayacı 90 kesim', eventCount: 3 },
    { id: 'SH-03', name: 'C Vardiyası', start: '22:00', end: '06:00', plantId: 'P1', date: '2026-11-03', supervisorId: 'U03', operatorIds: ['U03', 'U11'], handoverNote: 'Sayım farkı onaya bekliyor', eventCount: 2 },
    { id: 'SH-04', name: 'İdari', start: '08:00', end: '18:00', plantId: 'P1', date: '2026-11-03', supervisorId: 'U01', operatorIds: ['U01', 'U02'], handoverNote: 'Satın alma talep onayları', eventCount: 0 }
  ],

  budgets: [
    { id: 'BG-001', period: '2026-11', category: 'Hammadde', planned: 3200000, actual: 2410000, currency: '₺', owner: 'Satın Alma', status: 'Açık' },
    { id: 'BG-002', period: '2026-11', category: 'Enerji', planned: 480000, actual: 412000, currency: '₺', owner: 'Üretim', status: 'Açık' },
    { id: 'BG-003', period: '2026-11', category: 'Sarf Malzeme', planned: 120000, actual: 96500, currency: '₺', owner: 'Üretim', status: 'Açık' },
    { id: 'BG-004', period: '2026-11', category: 'Bakım', planned: 90000, actual: 74000, currency: '₺', owner: 'Bakım', status: 'Açık' },
    { id: 'BG-005', period: '2026-11', category: 'İşçilik', planned: 380000, actual: 340000, currency: '₺', owner: 'İnsan Kaynakları', status: 'Açık' }
  ],

  periodClosures: [
    { id: 'PC-001', period: '2026-09', status: 'Kapatıldı', trialBalanceOk: true, postedEntries: 42, checkedBy: 'U11', closedAt: '2026-10-02T10:00:00+03:00', notes: 'Mizan dengeli, KDV beyanı hazırlandı' },
    { id: 'PC-002', period: '2026-10', status: 'Kapatıldı', trialBalanceOk: true, postedEntries: 51, checkedBy: 'U11', closedAt: '2026-11-02T11:30:00+03:00', notes: 'Alış faturaları ve stok değerlemesi kontrol edildi' },
    { id: 'PC-003', period: '2026-11', status: 'Açık', trialBalanceOk: true, postedEntries: 8, checkedBy: null, closedAt: null, notes: 'Ay içi; kapanış için mizan ve bütçe sapması beklenir' }
  ],

  integrationRules: [
    { id: 'IR-01', moduleCode: 'SALES', trigger: 'Satış siparişi onayı', module: 'Satış', produces: ['Rezervasyon', 'Kredi kontrolü', 'Müşteri cari hareketi'], accountEffect: 'Henüz muhasebe fişi yok', autoPost: true, requiresApproval: false },
    { id: 'IR-02', moduleCode: 'SHIPPING', trigger: 'İki kademeli sevkiyat onayı', module: 'Sevkiyat', produces: ['Stok çıkış hareketi', 'Satış faturası', 'Borç / alacak fişi', 'Müşteri bakiyesi', 'Maliyet yansıması', 'Bildirim + giden kutu', 'Olay satırı'], accountEffect: '120 borç / 600 + 391 alacak', autoPost: true, requiresApproval: true },
    { id: 'IR-03', moduleCode: 'PURCHASING', trigger: 'Mal kabul', module: 'Satın Alma', produces: ['Stok giriş hareketi', 'Fiyat geçmişi', 'Emir karşılama durumu', 'Olay satırı'], accountEffect: 'Fatura gelene kadar bekler', autoPost: true, requiresApproval: false },
    { id: 'IR-04', moduleCode: 'FINANCE', trigger: 'Alış faturası', module: 'Muhasebe', produces: ['Borç / alacak fişi', 'Satıcı cari hareketi', 'Ödeme vadesi', 'Bütçe gerçekleşen'], accountEffect: '150 + 191 borç / 320 alacak', autoPost: true, requiresApproval: true },
    { id: 'IR-05', moduleCode: 'PURCHASING', trigger: 'Satın alma talebi onayı', module: 'Satın Alma', produces: ['Teklif çağrısı', 'Onay izi', 'Bildirim'], accountEffect: 'Yok', autoPost: true, requiresApproval: true },
    { id: 'IR-06', moduleCode: 'PURCHASING', trigger: 'Teklif seçimi', module: 'Satın Alma', produces: ['Satın alma emri', 'Fiyat geçmişi önizlemesi', 'Talep durumu'], accountEffect: 'Yok', autoPost: true, requiresApproval: false },
    { id: 'IR-07', moduleCode: 'PRODUCTION', trigger: 'Üretim olayı (NET_BILLET)', module: 'Üretim', produces: ['Yan ürün kaydı', 'Mamul stok', 'Döküm kodu maliyeti', 'Olay günlüğü'], accountEffect: '730 borç / 150 alacak', autoPost: true, requiresApproval: false },
    { id: 'IR-08', moduleCode: 'WAREHOUSE', trigger: 'Fiziki sayım farkı', module: 'Depo', produces: ['Düzeltme hareketi', 'Borç / alacak fişi', 'Denetim izi'], accountEffect: '153 borç / 730 alacak', autoPost: false, requiresApproval: true },
    { id: 'IR-09', moduleCode: 'FINANCE', trigger: 'Tahsilat / ödeme', module: 'Finans', produces: ['Cari bakiye', 'Banka hareketi', 'Borç / alacak fişi'], accountEffect: '102 borç / 120 alacak', autoPost: true, requiresApproval: false },
    { id: 'IR-10', moduleCode: 'FINANCE', trigger: 'Dönem kapanışı', module: 'Finans', produces: ['Mizan kontrolü', 'Bütçe sapması', 'Yönetim raporu', 'Arşiv'], accountEffect: 'Borç = alacak doğrulaması', autoPost: false, requiresApproval: true }
  ],

  /* ------------------------------------------------------------------ */
  /* Saha kurulumu ve modüler yaşam döngüsü (v4, docs/12)                 */
  /* ------------------------------------------------------------------ */

  machineAliases: [
    { id: 'MA-01', legacyCode: 'F20', machineId: 'MCH-01', plantId: 'P1', note: 'Eski 20 ton ocak kodu' },
    { id: 'MA-02', legacyCode: 'F35', machineId: 'MCH-02', plantId: 'P1', note: 'Eski 35 ton ocak kodu' },
    { id: 'MA-03', legacyCode: 'FD', machineId: 'MCH-20', plantId: 'P2', note: 'Eski döner ocak kodu' }
  ],

  moduleRegistry: [
  {
    "id": "MOD-CORE",
    "code": "CORE",
    "label": "Çekirdek",
    "group": "Genel / Sistem",
    "views": [
      "dashboard",
      "notifications",
      "settings"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Panel, bildirim ve ayarlar her fabrikada açıktır"
  },
  {
    "id": "MOD-PURCHASING",
    "code": "PURCHASING",
    "label": "Satın Alma",
    "group": "Ticari",
    "views": [
      "materials",
      "orders",
      "prices",
      "suppliers",
      "requests"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Değişken malzeme kartları ve talep/teklif akışı"
  },
  {
    "id": "MOD-INVENTORY",
    "code": "INVENTORY",
    "label": "Hammadde & Stok",
    "group": "Üretim",
    "views": [
      "stock",
      "receipts",
      "crusher",
      "movements"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Faz 1 kapsamı, her fabrikada zorunlu"
  },
  {
    "id": "MOD-PRODUCTION",
    "code": "PRODUCTION",
    "label": "Üretim",
    "group": "Üretim",
    "views": [
      "production",
      "recipes",
      "batches",
      "events"
    ],
    "defaultEnabled": true,
    "requiresMachineType": "FURNACE",
    "requiresMode": null,
    "note": "En az bir ergitme ocağı tanımlı olmalı"
  },
  {
    "id": "MOD-MACHINES",
    "code": "MACHINES",
    "label": "Makine Parkı",
    "group": "Kurulum",
    "views": [
      "machines",
      "paths",
      "cutting",
      "maintenance"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Ekleme, düzenleme ve devre dışı bırakma"
  },
  {
    "id": "MOD-ROTARY",
    "code": "ROTARY",
    "label": "Döner Ocak / Cüruf",
    "group": "Kurulum",
    "views": [],
    "defaultEnabled": false,
    "requiresMachineType": "ROTARY",
    "requiresMode": null,
    "note": "Yalnızca döner ocağı olan fabrikada görünür"
  },
  {
    "id": "MOD-PLC",
    "code": "PLC",
    "label": "PLC Durum",
    "group": "Kurulum",
    "views": [
      "plc"
    ],
    "defaultEnabled": false,
    "requiresMachineType": null,
    "requiresMode": "PLC",
    "note": "Fabrika modu PLC değilse menüde görünmez"
  },
  {
    "id": "MOD-SALES",
    "code": "SALES",
    "label": "Satış & Müşteri",
    "group": "Ticari",
    "views": [
      "sales",
      "customers"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "docs/11 ile eklenen ticari katman"
  },
  {
    "id": "MOD-FINANCE",
    "code": "FINANCE",
    "label": "Muhasebe & Maliyet",
    "group": "Ticari",
    "views": [
      "finance",
      "costing"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Fiş, mizan, fatura, döküm kodu maliyeti"
  },
  {
    "id": "MOD-WAREHOUSE",
    "code": "WAREHOUSE",
    "label": "Depo & Sayım",
    "group": "Lojistik",
    "views": [
      "warehouse"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Depo lokasyonu ve rezervasyon"
  },
  {
    "id": "MOD-HR",
    "code": "HR",
    "label": "Personel & Vardiya",
    "group": "Lojistik",
    "views": [
      "hr"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Bordro harici; yalnızca operatör izi"
  },
  {
    "id": "MOD-SHIPPING",
    "code": "SHIPPING",
    "label": "Sevkiyat",
    "group": "Lojistik",
    "views": [
      "shipments",
      "archive"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "İki kademeli onay ve arşiv"
  },
  {
    "id": "MOD-REPORTS",
    "code": "REPORTS",
    "label": "Raporlama",
    "group": "Yönetim",
    "views": [
      "reports"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Günlük / haftalık / aylık çıktılar"
  },
  {
    "id": "MOD-INTEGRATION",
    "code": "INTEGRATION",
    "label": "Entegrasyon",
    "group": "Yönetim",
    "views": [
      "integration"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Tek kayıt çok etki matrisi"
  },
  {
    "id": "MOD-VENDOR",
    "code": "VENDOR",
    "label": "Merkezi Yönetim",
    "group": "Yönetim",
    "views": [
      "vendor",
      "setup",
      "modules"
    ],
    "defaultEnabled": true,
    "requiresMachineType": null,
    "requiresMode": null,
    "note": "Yalnızca geliştirici ekibi; operatör ekranı değildir"
  }
],

  plantModules: [
    { id: 'PM-01', plantId: 'P1', enabled: { ...{"CORE": true, "PURCHASING": true, "INVENTORY": true, "PRODUCTION": true, "MACHINES": true, "ROTARY": false, "PLC": false, "SALES": true, "FINANCE": true, "WAREHOUSE": true, "HR": true, "SHIPPING": true, "REPORTS": true, "INTEGRATION": true, "VENDOR": true}, PLC: true, ROTARY: false }, note: 'PLC modlu, döner ocaksız fabrika' },
    { id: 'PM-02', plantId: 'P2', enabled: { ...{"CORE": true, "PURCHASING": true, "INVENTORY": true, "PRODUCTION": true, "MACHINES": true, "ROTARY": false, "PLC": false, "SALES": true, "FINANCE": true, "WAREHOUSE": true, "HR": true, "SHIPPING": true, "REPORTS": true, "INTEGRATION": true, "VENDOR": true}, PLC: false, ROTARY: true }, note: 'MANUAL modlu, döner ocaklı fabrika' },
    { id: 'PM-03', plantId: 'P3', enabled: { ...{"CORE": true, "PURCHASING": true, "INVENTORY": true, "PRODUCTION": true, "MACHINES": true, "ROTARY": false, "PLC": false, "SALES": true, "FINANCE": true, "WAREHOUSE": true, "HR": true, "SHIPPING": true, "REPORTS": true, "INTEGRATION": true, "VENDOR": true}, PLC: true, ROTARY: false }, note: 'Pasif demo profili' }
  ],

  setupDrafts: [
    { id: 'SD-1', step: 1, updatedAt: '2026-11-04T09:00:00+03:00', note: 'Yarım kalan saha kurulumu örneği', values: { code: 'FIRM4', name: 'Yeni Fabrika', city: 'İzmir', mode: 'MANUAL', note: '', counts: { FURNACE: 1, CAST_TABLE: 1, SAW: 1, HOMO_FURNACE: 1, CONT_HOMO: 0, ROTARY: 0 }, defaultCapacity: { FURNACE: 20, CAST_TABLE: 1, SAW: 0, HOMO_FURNACE: 25, CONT_HOMO: 12, ROTARY: 8 }, holdTon: 1, connection: { name: 'Fırın hattı PLC', ip: '192.168.1.50', protocol: 'OPC UA', port: 4840, pollSeconds: 3, adapter: 'simulated' }, modules: { ...{"CORE": true, "PURCHASING": true, "INVENTORY": true, "PRODUCTION": true, "MACHINES": true, "ROTARY": false, "PLC": false, "SALES": true, "FINANCE": true, "WAREHOUSE": true, "HR": true, "SHIPPING": true, "REPORTS": true, "INTEGRATION": true, "VENDOR": true} }, lastTest: null } }
  ],

  adapterContracts: [
  {
    "id": "ADP-simulated",
    "code": "simulated",
    "label": "Simülasyon / MANUAL",
    "protocol": "Yerel",
    "implemented": true,
    "capabilities": [
      "connect",
      "test",
      "readFourSignals",
      "disconnect"
    ],
    "note": "Saha kurulumunda ağ olmadan dört sinyali üretir; her fabrikada yedek moddur"
  },
  {
    "id": "ADP-opcua",
    "code": "opcua",
    "label": "OPC UA",
    "protocol": "OPC UA",
    "implemented": false,
    "capabilities": [
      "connect",
      "test",
      "readFourSignals",
      "disconnect"
    ],
    "note": "Gerçek sürücü docs/10 aşama 9'da aynı sözleşmeyle takılır"
  },
  {
    "id": "ADP-modbus",
    "code": "modbus",
    "label": "Modbus TCP",
    "protocol": "Modbus",
    "implemented": false,
    "capabilities": [
      "connect",
      "test",
      "readFourSignals",
      "disconnect"
    ],
    "note": "Gerçek sürücü docs/10 aşama 9'da aynı sözleşmeyle takılır"
  }
],

  profilePackages: []
};

// Kayıtlı profil paketleri: sahada "indir, götür, içe al" için hazır örnekler.
// Paketler daima güncel `plants` / `machines` / `castingPaths` verisinden üretilir.
function makePlantPackage(plantId, code, name) {
  const plant = SEED.plants.find((p) => p.id === plantId);
  if (!plant) return null;
  const machines = SEED.machines.filter((m) => m.plantId === plantId);
  const ids = new Set(machines.map((m) => m.id));
  const plcIds = new Set(SEED.plcConnections.filter((c) => c.plantId === plantId).map((c) => c.id));
  return {
    id: `PKG-${plantId}`, code, name, plantId, createdAt: '2026-11-04T09:00:00+03:00',
    machineCount: machines.length, furnaceCount: machines.filter((m) => m.type === 'FURNACE').length,
    note: plant.note || '',
    payload: {
      kind: 'erp-plant-profile', packageVersion: 1, schemaVersion: SEED.schemaVersion,
      code, name, generatedAt: '2026-11-04T09:00:00+03:00', source: 'ERP Studio · fabrika profil paketi',
      plant: { ...plant },
      machineTypes: SEED.machineTypes.map((x) => ({ ...x })),
      machines: machines.map((x) => ({ ...x })),
      castingPaths: SEED.castingPaths.filter((x) => x.plantId === plantId).map((x) => ({ ...x })),
      plcConnections: SEED.plcConnections.filter((x) => x.plantId === plantId).map((x) => ({ ...x })),
      plcTags: SEED.plcTags.filter((x) => plcIds.has(x.plcId)).map((x) => ({ ...x })),
      oilRules: SEED.oilRules.filter((x) => ids.has(x.machineId)).map((x) => ({ ...x })),
      bladeRules: SEED.bladeRules.filter((x) => ids.has(x.machineId)).map((x) => ({ ...x })),
      maintenanceEvents: SEED.maintenanceEvents.filter((x) => ids.has(x.machineId)).map((x) => ({ ...x })),
      signalStates: SEED.signalStates.filter((x) => ids.has(x.machineId)).map((x) => ({ ...x })),
      homogenizationBatches: SEED.homogenizationBatches.filter((x) => ids.has(x.machineId)).map((x) => ({ ...x })),
      plantModules: SEED.plantModules.find((x) => x.plantId === plantId) || null,
      moduleRegistry: SEED.moduleRegistry.map((x) => ({ ...x }))
    }
  };
}
SEED.profilePackages = [
  makePlantPackage('P1', 'FIRM1', 'Anadolu Alüminyum · 5 fırın'),
  makePlantPackage('P2', 'FIRM2', 'Marmara Alüminyum · 2 fırın')
];
