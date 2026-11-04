// Ticari ve finansal çekirdek — tek kayıt, çok etki.
// Saf modül: DOM, localStorage veya store'a bağımlı değildir; Node tarafında da test edilir.
// Gereksinim kaynağı: docs/11 (genel ERP karşılaştırması), docs/04 (mimari), docs/09 (olay).

export const DEFAULT_VAT_RATE = 20; // parametrik; settings.vatRate ile değiştirilebilir

// Tekdüzen hesap planı. Kodlar Türkiye tekdüzen hesap planı geleneğine göre örneklenmiştir.
export const ACCOUNT_CODES = {
  CASH: '100',
  BANK: '102',
  RECEIVABLES: '120',
  GOODS: '153',
  RAW_MATERIAL: '150',
  VAT_DEDUCTIBLE: '191',
  PAYABLES: '320',
  VAT_PAYABLE: '391',
  SALES: '600',
  COGS: '620',
  PRODUCTION_COST: '730',
  OVERHEAD: '740'
};

// Hangi işlemin hangi kayıtları ürettiği. Operatör bir kez girer, sistem gerisini yazar.
// Bu matris aynı zamanda seed.js içindeki integrationRules koleksiyonunun kaynağıdır.
export const INTEGRATION_MATRIX = [
  { id: 'IR-01', trigger: 'Satış siparişi onayı', module: 'Satış', produces: ['Rezervasyon', 'Kredi kontrolü', 'Müşteri cari hareketi'], accountEffect: 'Henüz muhasebe fişi yok', autoPost: true, requiresApproval: false },
  { id: 'IR-02', trigger: 'İki kademeli sevkiyat onayı', module: 'Sevkiyat', produces: ['Stok çıkış hareketi', 'Satış faturası', 'Borç / alacak fişi', 'Müşteri bakiyesi', 'Maliyet yansıması', 'Bildirim + giden kutu', 'Olay satırı'], accountEffect: '120 borç / 600 + 391 alacak', autoPost: true, requiresApproval: true },
  { id: 'IR-03', trigger: 'Mal kabul', module: 'Satın Alma', produces: ['Stok giriş hareketi', 'Fiyat geçmişi', 'Emir karşılama durumu', 'Olay satırı'], accountEffect: 'Fatura gelene kadar bekler', autoPost: true, requiresApproval: false },
  { id: 'IR-04', trigger: 'Alış faturası', module: 'Muhasebe', produces: ['Borç / alacak fişi', 'Satıcı cari hareketi', 'Ödeme vadesi', 'Bütçe gerçekleşen'], accountEffect: '150 + 191 borç / 320 alacak', autoPost: true, requiresApproval: true },
  { id: 'IR-05', trigger: 'Satın alma talebi onayı', module: 'Satın Alma', produces: ['Teklif çağrısı', 'Onay izi', 'Bildirim'], accountEffect: 'Yok', autoPost: true, requiresApproval: true },
  { id: 'IR-06', trigger: 'Teklif seçimi', module: 'Satın Alma', produces: ['Satın alma emri', 'Fiyat geçmişi önizlemesi', 'Talep durumu'], accountEffect: 'Yok', autoPost: true, requiresApproval: false },
  { id: 'IR-07', trigger: 'Üretim olayı (NET_BILLET)', module: 'Üretim', produces: ['Yan ürün kaydı', 'Mamul stok', 'Döküm kodu maliyeti', 'Olay günlüğü'], accountEffect: '730 borç / 150 alacak', autoPost: true, requiresApproval: false },
  { id: 'IR-08', trigger: 'Fiziki sayım farkı', module: 'Depo', produces: ['Düzeltme hareketi', 'Borç / alacak fişi', 'Denetim izi'], accountEffect: '153 borç / 730 alacak', autoPost: false, requiresApproval: true },
  { id: 'IR-09', trigger: 'Tahsilat / ödeme', module: 'Finans', produces: ['Cari bakiye', 'Banka hareketi', 'Borç / alacak fişi'], accountEffect: '102 borç / 120 alacak', autoPost: true, requiresApproval: false },
  { id: 'IR-10', trigger: 'Dönem kapanışı', module: 'Finans', produces: ['Mizan kontrolü', 'Bütçe sapması', 'Yönetim raporu', 'Arşiv'], accountEffect: 'Borç = alacak doğrulaması', autoPost: false, requiresApproval: true }
];

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const round4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000;

/** Net tutardan KDV ve brüt tutarı üretir. */
export function amounts(net, vatRate = DEFAULT_VAT_RATE) {
  const n = round2(net);
  const vat = round2(n * (Number(vatRate) || 0) / 100);
  return { net: n, vatRate: Number(vatRate) || 0, vat, gross: round2(n + vat) };
}

/** Borç / alacak toplamları. */
export function sumLines(lines = []) {
  return lines.reduce((acc, l) => ({
    debit: round2(acc.debit + (Number(l.debit) || 0)),
    credit: round2(acc.credit + (Number(l.credit) || 0))
  }), { debit: 0, credit: 0 });
}

export function isBalanced(entry, tolerance = 0.01) {
  const s = sumLines(entry && entry.lines);
  return Math.abs(s.debit - s.credit) <= tolerance && s.debit > 0;
}

/**
 * Borç / alacak fişi oluşturur. clientId aynı işlemin iki kez yazılmasını engeller.
 * Dengesiz fiş üretilmez; balanced=false döner ve kaydedilmez.
 */
export function buildEntry({ id, no, date, period, description = '', lines = [], sourceModule = '', sourceId = '', clientId = '', postedBy = 'Sistem' }) {
  const clean = lines.map((l) => ({
    accountId: l.accountId, accountCode: l.accountCode || '',
    debit: round2(l.debit || 0), credit: round2(l.credit || 0), note: l.note || ''
  }));
  const s = sumLines(clean);
  return {
    id, no, date, period, description,
    sourceModule, sourceId, clientId, postedBy,
    lines: clean,
    totalDebit: s.debit, totalCredit: s.credit,
    balanced: Math.abs(s.debit - s.credit) <= 0.01 && s.debit > 0
  };
}

/** Satış faturası fişi: alıcı borçlanır, satış ve hesaplanan KDV alacaklanır. */
export function salesEntry(invoice, { id, no, date, period, clientId, description = 'Satış faturası' } = {}) {
  const a = amounts(invoice.net, invoice.vatRate ?? DEFAULT_VAT_RATE);
  return buildEntry({
    id: id || `JE-${invoice.no}`, no: no || `MF-${invoice.no}`,
    date: date || invoice.date, period: period || invoice.period,
    description, sourceModule: 'Satış', sourceId: invoice.no,
    clientId: clientId || `SALE-${invoice.no}`,
    lines: [
      { accountId: 'A120', accountCode: ACCOUNT_CODES.RECEIVABLES, debit: a.gross, credit: 0, note: 'Alıcılar' },
      { accountId: 'A600', accountCode: ACCOUNT_CODES.SALES, debit: 0, credit: a.net, note: 'Yurt içi satışlar' },
      { accountId: 'A391', accountCode: ACCOUNT_CODES.VAT_PAYABLE, debit: 0, credit: a.vat, note: 'Hesaplanan KDV' }
    ]
  });
}

/** Alış faturası fişi: malzeme ve indirilecek KDV borçlanır, satıcı alacaklanır. */
export function purchaseEntry(invoice, { id, no, date, period, clientId, description = 'Alış faturası' } = {}) {
  const a = amounts(invoice.net, invoice.vatRate ?? DEFAULT_VAT_RATE);
  return buildEntry({
    id: id || `JE-${invoice.no}`, no: no || `MF-${invoice.no}`,
    date: date || invoice.date, period: period || invoice.period,
    description, sourceModule: 'Satın Alma', sourceId: invoice.no,
    clientId: clientId || `PURCHASE-${invoice.no}`,
    lines: [
      { accountId: 'A150', accountCode: ACCOUNT_CODES.RAW_MATERIAL, debit: a.net, credit: 0, note: 'İlk madde ve malzeme' },
      { accountId: 'A191', accountCode: ACCOUNT_CODES.VAT_DEDUCTIBLE, debit: a.vat, credit: 0, note: 'İndirilecek KDV' },
      { accountId: 'A320', accountCode: ACCOUNT_CODES.PAYABLES, debit: 0, credit: a.gross, note: 'Satıcılar' }
    ]
  });
}

/** Mizan: hesap bazında borç, alacak ve bakiye. */
export function trialBalance(entries = [], accounts = []) {
  const rows = new Map();
  accounts.forEach((a) => rows.set(a.id, { accountId: a.id, code: a.code, name: a.name, type: a.type, debit: 0, credit: 0, balance: 0 }));
  entries.forEach((e) => (e.lines || []).forEach((l) => {
    if (!rows.has(l.accountId)) rows.set(l.accountId, { accountId: l.accountId, code: l.accountCode || '—', name: l.accountCode || l.accountId, type: '—', debit: 0, credit: 0, balance: 0 });
    const r = rows.get(l.accountId);
    r.debit = round2(r.debit + (Number(l.debit) || 0));
    r.credit = round2(r.credit + (Number(l.credit) || 0));
    r.balance = round2(r.debit - r.credit);
  }));
  const list = [...rows.values()];
  const totals = list.reduce((acc, r) => ({ debit: round2(acc.debit + r.debit), credit: round2(acc.credit + r.credit) }), { debit: 0, credit: 0 });
  return { rows: list, totals, balanced: Math.abs(totals.debit - totals.credit) <= 0.01 };
}

/** Döküm kodu maliyeti: beş kalem, ton ve kg başına birim maliyet. */
export function lotCost(record) {
  if (!record) return null;
  const parts = {
    Hammadde: Number(record.materialCost) || 0,
    Enerji: Number(record.energyCost) || 0,
    Sarf: Number(record.consumableCost) || 0,
    İşçilik: Number(record.laborCost) || 0,
    Fire: Number(record.scrapCost) || 0
  };
  const total = round2(Object.values(parts).reduce((a, b) => a + b, 0));
  const netTon = Number(record.netTon) || 0;
  return {
    lotId: record.lotId, period: record.period, parts, total, netTon,
    unitCostPerTon: netTon ? round2(total / netTon) : 0,
    unitCostPerKg: netTon ? round4(total / (netTon * 1000)) : 0,
    recordedTotal: round2(record.totalCost),
    consistent: Math.abs(total - (Number(record.totalCost) || 0)) <= 0.01
  };
}

/** Satış geliri ile üretim maliyetinden brüt kâr. */
export function salesMargin({ revenue, costTon, unitCostPerTon }) {
  const rev = round2(revenue);
  const cost = round2((Number(costTon) || 0) * (Number(unitCostPerTon) || 0));
  const grossProfit = round2(rev - cost);
  return { revenue: rev, cost, grossProfit, marginPct: rev ? round2(grossProfit / rev * 100) : 0 };
}

/** Kredi limiti kontrolü. Genel ERP metnindeki "müşteri kayıtları" ile bağlantılıdır. */
export function creditCheck(customer, extraAmount = 0) {
  const limit = Number(customer?.creditLimit) || 0;
  const used = Number(customer?.balance) || 0;
  const available = round2(limit - used);
  const requested = round2(extraAmount);
  return {
    ok: requested <= available,
    limit, used, available, requested,
    usagePct: limit ? round2(used / limit * 100) : 0,
    reason: requested > available ? 'Kredi limiti yetersiz: sipariş onay bekler' : 'Limit uygun'
  };
}

/** Yönetici paneli için çapraz modül göstergeleri. */
export function kpiSnapshot(d) {
  const invoices = d.invoices || [];
  const sales = invoices.filter((i) => i.direction === 'Satış');
  const purchases = invoices.filter((i) => i.direction === 'Alış');
  const sum = (arr, key) => round2(arr.reduce((a, x) => a + (Number(x[key]) || 0), 0));
  const customers = d.customers || [];
  const suppliers = d.suppliers || [];
  const salesOrders = d.salesOrders || [];
  const budgets = (d.budgets || []).filter((b) => b.period === d.settings?.currentPeriod);
  const planned = sum(budgets, 'planned');
  const actual = sum(budgets, 'actual');
  const lots = d.lots || [];
  const netTon = round4(lots.reduce((a, l) => a + (Number(l.netTon || l.weightTon) || 0), 0));
  const scrapTon = round4(lots.reduce((a, l) => a + (Number(l.scrapTon) || 0), 0));
  const delivered = salesOrders.filter((o) => o.status === 'Sevk Edildi').length;
  return {
    period: d.settings?.currentPeriod || '—',
    revenue: sum(sales, 'net'),
    purchaseCost: sum(purchases, 'net'),
    receivables: sum(customers, 'balance'),
    payables: sum(purchases.filter((i) => i.status !== 'Ödendi'), 'gross'),
    openOrders: salesOrders.filter((o) => o.status !== 'Sevk Edildi').length,
    onTimeDeliveryPct: salesOrders.length ? round2(delivered / salesOrders.length * 100) : 0,
    productionTon: netTon,
    scrapPct: netTon ? round2(scrapTon / netTon * 100) : 0,
    budgetPlanned: planned,
    budgetActual: actual,
    budgetUsagePct: planned ? round2(actual / planned * 100) : 0,
    supplierCount: suppliers.length,
    customerCount: customers.length
  };
}

/**
 * Tek bir onaylı belgeden türeyen kayıtların listesi.
 * Görüntüleme ve test amaçlıdır; kalıcı yazımı view tek bir store.change içinde yapar.
 */
export function postingEffects(kind, ctx = {}) {
  const { shipment, invoice, journal, customer, movement, costRecord } = ctx;
  if (kind === 'SHIPMENT_APPROVED' && shipment && invoice && journal) {
    return [
      { collection: 'invoices', label: 'Satış faturası', record: invoice },
      { collection: 'journalEntries', label: 'Borç / alacak fişi', record: journal },
      { collection: 'movements', label: 'Stok çıkış hareketi', record: movement },
      { collection: 'customers', label: 'Müşteri cari bakiyesi', record: { id: customer?.id, delta: invoice.gross } },
      { collection: 'costRecords', label: 'Maliyet yansıması', record: costRecord },
      { collection: 'notifications', label: 'Sistem bildirimi', record: { title: 'Sevkiyat muhasebeleştirildi' } },
      { collection: 'outbox', label: 'Rapor maili kuyruğu', record: { subject: 'Günlük satış raporu' } },
      { collection: 'events', label: 'Olay satırı', record: { type: 'SHIPMENT', lotId: (shipment.lotIds || [])[0] || '—' } }
    ];
  }
  return [];
}
