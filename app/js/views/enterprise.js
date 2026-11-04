// Genel ERP karşılaştırmasıyla eklenen 8 ekran (docs/11).
// Bu dosya ticari zinciri, cari/fatura/muhasebe fişini, maliyet, depo ve vardiyayı
// üretim tarafındaki olay günlüğüne bağlar. Saf görünüm katmanıdır; hesaplar
// ../posting.js içinde, veri app/js/seed.js içindedir.

import {
  D, store, uid, nowISO, todayISO, addActivity, addNotification, moveStock,
  appendJournal, customer, customerName, matName, accountName, warehouseName, supplierName
} from '../store.js';
import { icon } from '../icons.js';
import {
  esc, fmtNum, fmtMoney, fmtDate, fmtDateTime, pill, field, input, select,
  formData, modal, toast, confirmDialog, emptyState, csvExport, progress
} from '../ui.js';
import {
  amounts, salesEntry, purchaseEntry, buildEntry, trialBalance, isBalanced,
  lotCost, salesMargin, creditCheck, kpiSnapshot, postingEffects,
  INTEGRATION_MATRIX, round2
} from '../posting.js';

const refresh = () => window.App.refresh();
const cur = () => D().settings.currency || '₺';
const byId = (arr, id) => (arr || []).find((x) => x.id === id) || null;
const nameOfCustomer = (id) => customerName(id);
const statusPill = (s) => {
  const map = {
    'Açık': 'indigo', 'Onaylandı': 'ok', 'Sevk Edildi': 'ok', 'Tamamlandı': 'ok',
    'Kapatıldı': 'ok', 'Ödendi': 'ok', 'Aktif': 'ok', 'Hesaplandı': 'ok',
    'Kısmi Sevk': 'info', 'Kısmi': 'info', 'Bekliyor': 'warn', 'Onay Bekliyor': 'warn',
    'Kredi Onayı Bekliyor': 'warn', 'Muhasebe Onayı Bekliyor': 'warn', 'Fark Bekliyor': 'warn',
    'Taslak': 'neutral', 'Reddedildi': 'danger', 'İptal': 'danger', 'Kaybedildi': 'danger'
  };
  return pill(s || '—', map[s] || 'neutral');
};

/* ==================================================================== */
/* 1. SATIŞ SİPARİŞLERİ                                                  */
/* ==================================================================== */

export const salesOrdersView = {
  title: 'Satış Siparişleri',
  subtitle: 'Teklif, sipariş, kredi kontrolü, rezervasyon ve sevkiyatın ticari zinciri',

  render() {
    const d = D();
    const orders = d.salesOrders || [];
    const quotes = d.quotations || [];
    const open = orders.filter((o) => o.status !== 'Sevk Edildi');
    const reserved = round2(orders.reduce((a, o) => a + (Number(o.reservedTon) || 0), 0));
    const shipped = round2(orders.reduce((a, o) => a + (Number(o.shippedTon) || 0), 0));

    return `
      <div class="info-banner">${icon('cart', 18)}<span>Genel ERP tanımındaki en önemli ilke burada uygulanır: satış kaydı bir kez girilir; stok rezervasyonu, kredi kontrolü, sevkiyat, fatura, cari bakiye, muhasebe fişi ve yönetici raporu <strong>aynı kayıttan türetilir</strong>. Beş departman aynı bilgiyi yeniden girmez.</span></div>

      <div class="stat-strip">
        <div><span>Açık Sipariş</span><strong>${open.length}</strong></div>
        <div><span>Rezerve Ton</span><strong>${fmtNum(reserved, 1)} t</strong></div>
        <div><span>Sevk Edilen</span><strong>${fmtNum(shipped, 1)} t</strong></div>
        <div><span>Kredi Bekleyen</span><strong class="text-warn">${orders.filter((o) => !o.creditApproved).length}</strong></div>
        <div><span>Teklif</span><strong>${quotes.length}</strong></div>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Siparişler</strong><p class="muted">Müşteri kartı, kredi limiti ve döküm kodu rezervasyonu ile bağlı</p></div>
          <div class="toolbar">
            <button class="btn btn-ghost btn-sm" id="so-export">${icon('download', 15)} CSV</button>
            <button class="btn btn-primary" id="so-new">${icon('plus', 16)} Yeni Sipariş</button>
          </div>
        </div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Sipariş</th><th>Müşteri</th><th>Alaşım / Çap</th><th>Ton</th><th>Birim Fiyat (₺/t)</th><th>Tutar</th><th>Teslim</th><th>Durum</th><th></th></tr></thead>
          <tbody>${orders.map((o) => `
            <tr><td class="cell-strong">${esc(o.no)}</td><td>${esc(nameOfCustomer(o.customerId))}</td>
            <td>${esc(o.alloy)} · ${fmtNum(o.diameterMm)} mm</td><td class="num">${fmtNum(o.ton, 1)}</td>
            <td class="num">${fmtNum(o.unitPrice)}</td><td class="num">${fmtMoney((Number(o.ton) || 0) * (Number(o.unitPrice) || 0), cur())}</td>
            <td>${fmtDate(o.deliveryDate)}</td><td>${statusPill(o.status)}</td>
            <td>${!o.creditApproved ? `<button class="btn btn-ghost btn-sm" data-so-approve="${esc(o.id)}">Kredi Onayı</button>` : ''}</td></tr>`).join('')}
          </tbody>
        </table></div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Satış Teklifleri</strong><p class="muted">Teklif onaylandığında sipariş oluşur; fiyat ve geçerlilik tarihi korunur</p></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Teklif</th><th>Müşteri</th><th>Alaşım</th><th>Ton</th><th>Fiyat</th><th>Geçerlilik</th><th>Durum</th></tr></thead>
          <tbody>${quotes.map((q) => `<tr><td class="cell-strong">${esc(q.no)}</td><td>${esc(nameOfCustomer(q.customerId))}</td>
            <td>${esc(q.alloy)} · ${fmtNum(q.diameterMm)} mm</td><td class="num">${fmtNum(q.ton, 1)}</td><td class="num">${fmtNum(q.unitPrice)}</td>
            <td>${fmtDate(q.validUntil)}</td><td>${statusPill(q.status)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  },

  mount(root) {
    root.querySelector('#so-new')?.addEventListener('click', () => {
      const d = D();
      const mo = modal({
        title: 'Yeni Satış Siparişi', subtitle: 'Kredi limiti ve stok rezervasyonu otomatik kontrol edilir.', size: 'wide',
        body: `<div class="form-grid">
          ${field('Müşteri', select('customerId', (d.customers || []).map((c) => ({ value: c.id, label: c.name }))))}
          ${field('Alaşım', select('alloy', ['6063', '6061', '6060', '6082']))}
          ${field('Çap (mm)', input('diameterMm', '178', { type: 'number', min: 0 }))}
          ${field('Boy (mm)', input('lengthMm', '6000', { type: 'number', min: 0 }))}
          ${field('Ton', input('ton', '10', { type: 'number', min: 0.1, step: 0.1 }))}
          ${field('Birim Fiyat (₺/ton)', input('unitPrice', '118500', { type: 'number', min: 0 }))}
          ${field('Teslim Tarihi', input('deliveryDate', todayISO(), { type: 'date' }))}
          ${field('Not', input('notes', ''))}
        </div><div id="so-check" class="micro muted" style="margin-top:10px"></div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_m, close) => close() },
          { label: 'Siparişi Oluştur', kind: 'primary', icon: 'check', onClick: (m, close) => {
            const f = formData(m);
            const c = byId(D().customers, f.customerId);
            const ton = Number(f.ton) || 0;
            const total = ton * (Number(f.unitPrice) || 0);
            const credit = creditCheck(c, total);
            const orderNo = `SS-${new Date().getFullYear()}-${String((D().salesOrders || []).length + 216).padStart(4, '0')}`;
            store.change((data) => {
              data.salesOrders.unshift({
                id: uid('SO'), no: orderNo, customerId: f.customerId, quotationId: null,
                date: todayISO(), deliveryDate: f.deliveryDate, alloy: f.alloy,
                diameterMm: Number(f.diameterMm) || 0, lengthMm: Number(f.lengthMm) || 0,
                ton, unitPrice: Number(f.unitPrice) || 0, shippedTon: 0,
                reservedTon: credit.ok ? ton : 0,
                status: credit.ok ? 'Açık' : 'Kredi Onayı Bekliyor',
                creditApproved: credit.ok, createdBy: 'U01', notes: f.notes || ''
              });
              if (credit.ok) {
                const lots = (data.lots || []).filter((l) => l.stage === 'Mamul Stok');
                data.reservations.unshift({
                  id: uid('RSV'), salesOrderId: data.salesOrders[0].id,
                  lotId: lots[0]?.id || '—', warehouseId: data.settings.defaultWarehouseId || 'W4',
                  ton, status: 'Aktif', createdAt: nowISO(), note: 'Siparişten otomatik rezervasyon'
                });
              }
              addActivity(`${orderNo} oluşturuldu · ${credit.reason}`, 'cart');
              addNotification({
                type: credit.ok ? 'success' : 'warning',
                title: credit.ok ? 'Sipariş ve rezervasyon oluştu' : 'Kredi onayı gerekiyor',
                body: `${orderNo} · ${fmtNum(ton, 1)} t · kullanılabilir limit ${fmtMoney(credit.available, cur())}`,
                source: 'Satış'
              });
            });
            close(); refresh();
            toast(credit.ok ? 'Sipariş, rezervasyon ve bildirim tek kayıttan oluştu' : 'Kredi limiti yetersiz, sipariş onaya düştü', credit.ok ? 'success' : 'info');
          } }
        ]
      });
      const draw = () => {
        const f = formData(mo.el);
        const credit = creditCheck(byId(D().customers, f.customerId), (Number(f.ton) || 0) * (Number(f.unitPrice) || 0));
        const el = mo.el.querySelector('#so-check');
        if (el) el.innerHTML = `Limit kullanımı: %${fmtNum(credit.usagePct)} · Kullanılabilir: ${fmtMoney(credit.available, cur())} · Bu sipariş: ${fmtMoney(credit.requested, cur())} · <strong>${esc(credit.reason)}</strong>`;
      };
      draw();
      mo.el.addEventListener('input', draw);
      mo.el.addEventListener('change', draw);
    });

    root.querySelectorAll('[data-so-approve]').forEach((btn) => btn.addEventListener('click', () => {
      store.change((d) => {
        const o = byId(d.salesOrders, btn.dataset.soApprove);
        if (!o) return;
        o.creditApproved = true; o.status = 'Açık'; o.reservedTon = Number(o.ton) || 0;
        const lots = (d.lots || []).filter((l) => l.stage === 'Mamul Stok');
        d.reservations.unshift({ id: uid('RSV'), salesOrderId: o.id, lotId: lots[0]?.id || '—', warehouseId: d.settings.defaultWarehouseId || 'W4', ton: o.reservedTon, status: 'Aktif', createdAt: nowISO(), note: 'Kredi onayı sonrası aktifleşti' });
        addActivity(`${o.no} kredi onayı verildi, stok rezerve edildi`, 'shield');
      });
      refresh(); toast('Kredi onayı verildi, rezervasyon aktifleşti');
    }));

    root.querySelector('#so-export')?.addEventListener('click', () => {
      const rows = (D().salesOrders || []).map((o) => [o.no, nameOfCustomer(o.customerId), o.alloy, o.ton, o.unitPrice, o.status, o.deliveryDate]);
      csvExport('satis-siparisleri.csv', ['Sipariş', 'Müşteri', 'Alaşım', 'Ton', 'Birim Fiyat', 'Durum', 'Teslim'], rows);
    });
  }
};

/* ==================================================================== */
/* 2. MÜŞTERİLER & CARİ                                                  */
/* ==================================================================== */

export const customersView = {
  title: 'Müşteriler & Cari',
  subtitle: 'Müşteri kartları, kredi limiti, cari bakiye, tahsilat ve borç / alacak fişi',

  render() {
    const d = D();
    const cs = d.customers || [];
    const totalBalance = round2(cs.reduce((a, c) => a + (Number(c.balance) || 0), 0));
    const totalLimit = round2(cs.reduce((a, c) => a + (Number(c.creditLimit) || 0), 0));
    const payments = d.payments || [];

    return `
      <div class="info-banner">${icon('users', 18)}<span>Genel ERP anlatımındaki "cari hesaplar, borç ve alacak takibi, nakit akışı" başlıkları bu ekranda karşılanır. Tahsilat kaydı girildiğinde müşteri bakiyesi, banka hareketi ve muhasebe fişi <strong>aynı işlemde</strong> yazılır; maaş ve bordro hesabı kasten bu sistemin dışında tutulur.</span></div>

      <div class="stat-strip">
        <div><span>Müşteri Kartı</span><strong>${cs.length}</strong></div>
        <div><span>Toplam Alacak</span><strong>${fmtMoney(totalBalance, cur())}</strong></div>
        <div><span>Toplam Limit</span><strong>${fmtMoney(totalLimit, cur())}</strong></div>
        <div><span>Limit Kullanımı</span><strong>%${fmtNum(totalLimit ? totalBalance / totalLimit * 100 : 0, 1)}</strong></div>
        <div><span>Tahsilat Kaydı</span><strong>${payments.filter((p) => p.kind === 'Tahsilat').length}</strong></div>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Cari Kartlar</strong><p class="muted">Vade, risk, limit ve güncel bakiye</p></div>
          <button class="btn btn-primary" id="cus-new">${icon('plus', 16)} Müşteri Ekle</button></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Kod</th><th>Müşteri</th><th>Şehir</th><th>Vade</th><th>Limit</th><th>Bakiye</th><th>Kullanım</th><th>Risk</th><th></th></tr></thead>
          <tbody>${cs.map((c) => {
            const pct = c.creditLimit ? (Number(c.balance) || 0) / c.creditLimit * 100 : 0;
            return `<tr><td class="cell-strong">${esc(c.code)}</td><td>${esc(c.name)}<div class="cell-sub">${esc(c.contact || '')}</div></td>
              <td>${esc(c.city)}</td><td>${esc(c.paymentTerm)}</td><td class="num">${fmtMoney(c.creditLimit, cur())}</td>
              <td class="num">${fmtMoney(c.balance, cur())}</td>
              <td style="min-width:130px">${progress(pct, 100, pct > 80 ? '#ef4444' : '#4f46e5')}<span class="micro muted">%${fmtNum(pct, 1)}</span></td>
              <td>${pill(c.risk, c.risk === 'Orta' ? 'warn' : c.risk === 'Yeni' ? 'info' : 'ok')}</td>
              <td><button class="btn btn-ghost btn-sm" data-cus-pay="${esc(c.id)}">Tahsilat</button></td></tr>`;
          }).join('')}</tbody>
        </table></div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Son Tahsilat ve Ödemeler</strong><p class="muted">Banka / kasa hareketleri ile eşleşir</p></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Belge</th><th>Tür</th><th>Taraf</th><th>Tutar</th><th>Yöntem</th><th>Tarih</th><th>Fiş</th></tr></thead>
          <tbody>${payments.map((p) => `<tr><td class="cell-strong">${esc(p.no)}</td><td>${pill(p.kind, p.kind === 'Tahsilat' ? 'ok' : 'info')}</td>
            <td>${esc(p.partyType === 'customer' ? nameOfCustomer(p.partyId) : supplierName(p.partyId))}</td>
            <td class="num">${fmtMoney(p.amount, cur())}</td><td>${esc(p.method)}</td><td>${fmtDate(p.date)}</td>
            <td class="cell-sub">${esc(p.journalId || 'Fiş bekliyor')}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  },

  mount(root) {
    root.querySelector('#cus-new')?.addEventListener('click', () => {
      modal({
        title: 'Yeni Müşteri Kartı', size: 'wide',
        body: `<div class="form-grid">
          ${field('Müşteri Adı', input('name', '', { required: true }))}
          ${field('Vergi No', input('tax', ''))}
          ${field('Şehir', input('city', ''))}
          ${field('İletişim', input('contact', ''))}
          ${field('Ödeme Vadesi', select('paymentTerm', ['Peşin', '15 gün', '30 gün', '45 gün', '60 gün']))}
          ${field('Kredi Limiti (₺)', input('creditLimit', '500000', { type: 'number', min: 0 }))}
        </div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_m, close) => close() },
          { label: 'Kaydet', kind: 'primary', onClick: (m, close) => {
            const f = formData(m);
            if (!f.name) { toast('Müşteri adı zorunludur', 'danger'); return; }
            store.change((d) => {
              const n = (d.customers || []).length + 1;
              d.customers.unshift({
                id: uid('M'), code: `M${String(n).padStart(2, '0')}`, name: f.name,
                tax: f.tax || '', city: f.city || '', contact: f.contact || '', phone: '',
                paymentTerm: f.paymentTerm, creditLimit: Number(f.creditLimit) || 0,
                balance: 0, risk: 'Yeni', active: true
              });
              addActivity(`${f.name} müşteri kartı açıldı`, 'users');
            });
            close(); refresh(); toast('Müşteri kartı oluşturuldu');
          } }
        ]
      });
    });

    root.querySelectorAll('[data-cus-pay]').forEach((btn) => btn.addEventListener('click', () => {
      const c = byId(D().customers, btn.dataset.cusPay);
      if (!c) return;
      modal({
        title: 'Tahsilat Kaydı', subtitle: `${c.name} · güncel bakiye ${fmtMoney(c.balance, cur())}`,
        body: `<div class="form-grid">
          ${field('Tutar (₺)', input('amount', '100000', { type: 'number', min: 1 }))}
          ${field('Yöntem', select('method', ['Banka', 'Kasa']))}
          ${field('Tarih', input('date', todayISO(), { type: 'date' }))}
          ${field('Not', input('notes', ''))}
        </div><p class="micro muted" style="margin-top:10px">Kaydedildiğinde cari bakiye, banka hareketi ve borç / alacak fişi aynı işlemde yazılır.</p>`,
        actions: [
          { label: 'Vazgeç', onClick: (_m, close) => close() },
          { label: 'Tahsilatı Kaydet', kind: 'primary', icon: 'wallet', onClick: (m, close) => {
            const f = formData(m);
            const amount = Math.min(Number(f.amount) || 0, Number(c.balance) || 0);
            if (amount <= 0) { toast('Geçerli bir tutar girin', 'danger'); return; }
            const payId = uid('PAY');
            const entry = buildEntry({
              id: uid('JE'), no: `MF-${payId}`, date: f.date, period: D().settings.currentPeriod,
              description: `${c.name} tahsilatı`, sourceModule: 'Finans', sourceId: payId, clientId: `PAY-${payId}`,
              postedBy: 'U11',
              lines: [
                { accountId: 'A102', accountCode: '102', debit: amount, credit: 0, note: 'Banka / kasa' },
                { accountId: 'A120', accountCode: '120', debit: 0, credit: amount, note: 'Alıcılar' }
              ]
            });
            store.change((d) => {
              d.payments.unshift({ id: payId, no: `TH-${payId}`, kind: 'Tahsilat', partyType: 'customer', partyId: c.id, date: f.date, amount, method: f.method, invoiceId: null, journalId: entry.id, notes: f.notes || '' });
              appendJournal(entry);
              const target = byId(d.customers, c.id);
              if (target) target.balance = round2((Number(target.balance) || 0) - amount);
              addActivity(`${c.name} için ${fmtMoney(amount, cur())} tahsilat ve muhasebe fişi yazıldı`, 'wallet');
            });
            close(); refresh(); toast('Tahsilat, cari bakiye ve muhasebe fişi yazıldı');
          } }
        ]
      });
    }));
  }
};

/* ==================================================================== */
/* 3. SATIN ALMA TALEPLERİ & TEKLİFLER                                   */
/* ==================================================================== */

export const purchaseRequestsView = {
  title: 'Talep & Teklif Akışı',
  subtitle: 'Talep, onay, tedarikçi teklifi, karşılaştırma ve siparişe dönüştürme',

  render() {
    const d = D();
    const reqs = d.purchaseRequests || [];
    const quotes = d.purchaseQuotes || [];
    const limit = Number(d.settings.approvalLimitPurchase) || 0;

    return `
      <div class="info-banner">${icon('clipboard', 18)}<span>Kaynak metindeki satın alma sırası birebir uygulanır: talep oluşturulur, yetkili onaylar, tedarikçilerden teklif alınır, uygun teklif seçilir, sipariş açılır, mal depoya girince stok güncellenir, fatura muhasebeye aktarılır. Onay limiti ${fmtMoney(limit, cur())} olarak ayarlardan değiştirilebilir.</span></div>

      <div class="stat-strip">
        <div><span>Talep</span><strong>${reqs.length}</strong></div>
        <div><span>Onay Bekleyen</span><strong class="text-warn">${reqs.filter((r) => r.status === 'Onay Bekliyor').length}</strong></div>
        <div><span>Teklif</span><strong>${quotes.length}</strong></div>
        <div><span>Seçilen Teklif</span><strong class="text-ok">${quotes.filter((q) => q.status === 'Seçildi').length}</strong></div>
        <div><span>Siparişe Dönüşen</span><strong>${reqs.filter((r) => r.orderId).length}</strong></div>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Satın Alma Talepleri</strong><p class="muted">Kritik stok veya üretim ihtiyacından doğar</p></div>
          <div class="toolbar"><button class="btn btn-ghost btn-sm" id="pr-export">${icon('download', 15)} CSV</button>
          <button class="btn btn-primary" id="pr-new">${icon('plus', 16)} Talep Aç</button></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Talep</th><th>Malzeme</th><th>Miktar</th><th>İsteyen</th><th>Gerekçe</th><th>İhtiyaç</th><th>Durum</th><th></th></tr></thead>
          <tbody>${reqs.map((r) => `<tr><td class="cell-strong">${esc(r.no)}</td><td>${esc(matName(r.materialId))}</td>
            <td class="num">${fmtNum(r.quantity)} ${esc(r.unit)}</td><td class="cell-sub">${esc(r.department)}</td>
            <td class="cell-sub">${esc(r.reason)}</td><td>${fmtDate(r.neededBy)}</td><td>${statusPill(r.status)}</td>
            <td>${r.status === 'Onay Bekliyor' ? `<button class="btn btn-ghost btn-sm" data-pr-approve="${esc(r.id)}">Onayla</button>` : ''}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Tedarikçi Teklifleri</strong><p class="muted">Fiyat, teslim süresi ve değerlendirme puanı birlikte görülür</p></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Talep</th><th>Tedarikçi</th><th>Birim Fiyat</th><th>Miktar</th><th>Teslim Süresi</th><th>Puan</th><th>Durum</th><th></th></tr></thead>
          <tbody>${quotes.map((q) => `<tr><td class="cell-strong">${esc(byId(D().purchaseRequests, q.requestId)?.no || '—')}</td>
            <td>${esc(supplierName(q.supplierId))}</td><td class="num">${fmtMoney(q.unitPrice, cur())}</td>
            <td class="num">${fmtNum(q.quantity)}</td><td>${fmtNum(q.leadDays)} gün</td>
            <td class="num">${fmtNum(q.score)}</td><td>${statusPill(q.status)}</td>
            <td>${q.status === 'Bekliyor' ? `<button class="btn btn-ghost btn-sm" data-pq-select="${esc(q.id)}">Seç</button>` : ''}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  },

  mount(root) {
    root.querySelector('#pr-new')?.addEventListener('click', () => {
      const d = D();
      modal({
        title: 'Satın Alma Talebi', size: 'wide',
        body: `<div class="form-grid">
          ${field('Malzeme', select('materialId', (d.materials || []).map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }))))}
          ${field('Miktar', input('quantity', '100', { type: 'number', min: 1 }))}
          ${field('Birim', select('unit', d.units || ['kg']))}
          ${field('İhtiyaç Tarihi', input('neededBy', todayISO(), { type: 'date' }))}
          ${field('Gerekçe', input('reason', 'Kritik stok seviyesi'))}
        </div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_m, close) => close() },
          { label: 'Talebi Gönder', kind: 'primary', onClick: (m, close) => {
            const f = formData(m);
            store.change((data) => {
              data.purchaseRequests.unshift({
                id: uid('PR'), no: `ST-${new Date().getFullYear()}-${String(data.purchaseRequests.length + 86).padStart(4, '0')}`,
                materialId: f.materialId, quantity: Number(f.quantity) || 0, unit: f.unit,
                requestedBy: 'U03', department: 'Hammadde', neededBy: f.neededBy,
                reason: f.reason || '', status: 'Onay Bekliyor', approvedBy: null, orderId: null,
                createdAt: nowISO()
              });
              addActivity('Yeni satın alma talebi onaya gönderildi', 'clipboard');
            });
            close(); refresh(); toast('Talep onay kuyruğuna girdi');
          } }
        ]
      });
    });

    root.querySelectorAll('[data-pr-approve]').forEach((btn) => btn.addEventListener('click', () => {
      store.change((d) => {
        const r = byId(d.purchaseRequests, btn.dataset.prApprove);
        if (!r) return;
        r.status = 'Onaylandı'; r.approvedBy = 'U01';
        addActivity(`${r.no} onaylandı, teklif çağrısı açıldı`, 'shield');
        addNotification({ type: 'info', title: 'Satın alma onayı', body: `${r.no} için tedarikçi teklifi bekleniyor`, source: 'Satın Alma' });
      });
      refresh(); toast('Talep onaylandı, teklif aşaması açıldı');
    }));

    root.querySelectorAll('[data-pq-select]').forEach((btn) => btn.addEventListener('click', () => {
      store.change((d) => {
        const q = byId(d.purchaseQuotes, btn.dataset.pqSelect);
        if (!q) return;
        const r = byId(d.purchaseRequests, q.requestId);
        const total = (Number(q.quantity) || 0) * (Number(q.unitPrice) || 0);
        const overLimit = total > (Number(d.settings.approvalLimitPurchase) || 0);
        const poId = uid('PO');
        d.purchaseOrders.unshift({
          id: poId, no: `SA-${new Date().getFullYear()}-${String(d.purchaseOrders.length + 46).padStart(4, '0')}`,
          date: todayISO(), supplierId: q.supplierId,
          status: overLimit ? 'Onay Bekliyor' : 'Yolda', paymentTerm: '30 gün',
          notes: `${q.id} teklifinden dönüştürüldü`, createdBy: 'Satın Alma',
          items: [{ materialId: r?.materialId || 'H01', quantity: Number(q.quantity) || 0, unit: r?.unit || 'kg', unitPrice: Number(q.unitPrice) || 0, receivedQty: 0 }]
        });
        d.purchaseQuotes.filter((x) => x.requestId === q.requestId && x.id !== q.id).forEach((x) => { x.status = 'Reddedildi'; });
        q.status = 'Seçildi';
        if (r) { r.status = 'Siparişe Dönüştü'; r.orderId = poId; }
        d.priceHistory.unshift({
          id: uid('PH'), materialId: r?.materialId || 'H01', supplierId: q.supplierId,
          date: todayISO(), unitPrice: Number(q.unitPrice) || 0, quantity: Number(q.quantity) || 0,
          orderNo: d.purchaseOrders[0].no
        });
        addActivity(`${q.id} teklifi seçildi, satın alma emri ve fiyat geçmişi yazıldı`, 'cart');
      });
      refresh(); toast('Teklif seçildi; emir ve fiyat geçmişi aynı işlemde oluştu');
    }));

    root.querySelector('#pr-export')?.addEventListener('click', () => {
      csvExport('satinalma-talep-teklif.csv', ['Talep', 'Durum', 'Teklif Sayısı'],
        (D().purchaseRequests || []).map((r) => [r.no, r.status, (D().purchaseQuotes || []).filter((q) => q.requestId === r.id).length]));
    });
  }
};

/* ==================================================================== */
/* 4. MUHASEBE & FİŞLER                                                  */
/* ==================================================================== */

export const financeView = {
  title: 'Muhasebe & Fişler',
  subtitle: 'Tekdüzen hesap planı, çift taraflı kayıt, mizan, fatura, ödeme ve dönem kapanışı',

  render() {
    const d = D();
    const entries = d.journalEntries || [];
    const tb = trialBalance(entries, d.accounts || []);
    const invoices = d.invoices || [];
    const kpi = kpiSnapshot(d);
    const active = byId(d.periodClosures, d.settings.currentPeriod) || (d.periodClosures || [])[0] || {};

    return `
      <div class="info-banner">${icon('receipt', 18)}<span>Bu ekran kaynak metindeki en büyük boşluğu kapatır. Her muhasebe fişinde <strong>borç toplamı alacak toplamına eşittir</strong>; dengesiz fiş yazılmaz. Aynı <code>clientId</code> ikinci kez gelirse çift kayıt oluşmaz. Fişler olay günlüğü gibi düzeltilerek değil, ters işlem fişiyle değiştirilir.</span></div>

      <div class="stat-strip">
        <div><span>Borç Toplamı</span><strong>${fmtMoney(tb.totals.debit, cur())}</strong></div>
        <div><span>Alacak Toplamı</span><strong>${fmtMoney(tb.totals.credit, cur())}</strong></div>
        <div><span>Mizan</span><strong class="${tb.balanced ? 'text-ok' : 'text-danger'}">${tb.balanced ? 'Dengeli' : 'Dengesiz'}</strong></div>
        <div><span>Fiş Sayısı</span><strong>${entries.length}</strong></div>
        <div><span>Açık Dönem</span><strong>${esc(d.settings.currentPeriod)}</strong></div>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Mizan</strong><p class="muted">Hesap bazında borç, alacak ve bakiye</p></div>
          <div class="toolbar"><button class="btn btn-ghost btn-sm" id="fin-export">${icon('download', 15)} CSV</button>
          <button class="btn btn-ghost btn-sm" id="fin-check">${icon('check', 15)} Dönem Kontrolü</button>
          <button class="btn btn-primary" id="fin-new-invoice">${icon('plus', 16)} Alış Faturası</button></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Hesap</th><th>Adı</th><th>Tür</th><th>Borç</th><th>Alacak</th><th>Bakiye</th></tr></thead>
          <tbody>${tb.rows.map((r) => `<tr><td class="cell-strong">${esc(r.code)}</td><td>${esc(r.name)}</td><td class="cell-sub">${esc(r.type)}</td>
            <td class="num">${fmtMoney(r.debit, cur())}</td><td class="num">${fmtMoney(r.credit, cur())}</td>
            <td class="num"><strong>${fmtMoney(r.balance, cur())}</strong></td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="3"><strong>Toplam</strong></td><td class="num"><strong>${fmtMoney(tb.totals.debit, cur())}</strong></td><td class="num"><strong>${fmtMoney(tb.totals.credit, cur())}</strong></td><td>${pill(tb.balanced ? 'Dengeli' : 'Dengesiz', tb.balanced ? 'ok' : 'danger')}</td></tr></tfoot>
        </table></div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Muhasebe Fişleri</strong><p class="muted">Kaynak modül ve belge referansı ile birlikte</p></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Fiş</th><th>Tarih</th><th>Açıklama</th><th>Kaynak</th><th>Borç</th><th>Alacak</th><th>Durum</th><th></th></tr></thead>
          <tbody>${entries.map((e) => `<tr><td class="cell-strong">${esc(e.no)}</td><td>${fmtDate(e.date)}</td><td>${esc(e.description)}</td>
            <td class="cell-sub">${esc(e.sourceModule)} · ${esc(e.sourceId)}</td><td class="num">${fmtMoney(e.totalDebit, cur())}</td>
            <td class="num">${fmtMoney(e.totalCredit, cur())}</td>
            <td>${pill(e.balanced ? 'Dengeli' : 'Dengesiz', e.balanced ? 'ok' : 'danger')}</td>
            <td><button class="btn btn-ghost btn-sm" data-fin-detail="${esc(e.id)}">Satırlar</button></td></tr>`).join('')}</tbody>
        </table></div>
      </section>

      <div class="grid-2">
        <section class="card">
          <div class="card-head"><div><strong>Faturalar</strong><p class="muted">Alış / satış, KDV ve ödeme durumu</p></div></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Belge</th><th>Yön</th><th>Net</th><th>KDV</th><th>Brüt</th><th>Durum</th></tr></thead>
            <tbody>${invoices.map((i) => `<tr><td class="cell-strong">${esc(i.no)}</td><td>${pill(i.direction, i.direction === 'Satış' ? 'ok' : 'info')}</td>
              <td class="num">${fmtMoney(i.net, cur())}</td><td class="num">${fmtMoney(i.vat, cur())}</td><td class="num">${fmtMoney(i.gross, cur())}</td>
              <td>${statusPill(i.status)}</td></tr>`).join('')}</tbody></table></div>
        </section>
        <section class="card">
          <div class="card-head"><div><strong>Dönem Kapanışı</strong><p class="muted">Mizan, bütçe sapması ve yönetim raporu</p></div></div>
          <div class="stat-strip" style="margin-bottom:12px">
            <div><span>Dönem</span><strong>${esc(active.period || '—')}</strong></div>
            <div><span>Durum</span><strong>${esc(active.status || '—')}</strong></div>
            <div><span>Satış Geliri</span><strong>${fmtMoney(kpi.revenue, cur())}</strong></div>
            <div><span>Bütçe Kullanımı</span><strong>%${fmtNum(kpi.budgetUsagePct, 1)}</strong></div>
          </div>
          <p class="micro muted">${esc(active.notes || '')}</p>
          <button class="btn btn-ghost btn-full" id="fin-close">${icon('lock', 15)} Dönemi Kapat</button>
        </section>
      </div>`;
  },

  mount(root) {
    root.querySelectorAll('[data-fin-detail]').forEach((btn) => btn.addEventListener('click', () => {
      const e = byId(D().journalEntries, btn.dataset.finDetail);
      if (!e) return;
      modal({
        title: `${e.no} · Muhasebe Fişi`, subtitle: `${e.description} · ${e.period}`, size: 'wide',
        body: `<div class="table-wrap"><table class="data"><thead><tr><th>Hesap</th><th>Açıklama</th><th>Borç</th><th>Alacak</th></tr></thead>
          <tbody>${(e.lines || []).map((l) => `<tr><td class="cell-strong">${esc(accountName(l.accountId))}</td><td>${esc(l.note)}</td>
            <td class="num">${fmtMoney(l.debit, cur())}</td><td class="num">${fmtMoney(l.credit, cur())}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2"><strong>Toplam</strong></td><td class="num"><strong>${fmtMoney(e.totalDebit, cur())}</strong></td><td class="num"><strong>${fmtMoney(e.totalCredit, cur())}</strong></td></tr></tfoot></table></div>
          <p class="micro muted" style="margin-top:10px">clientId: <code>${esc(e.clientId || '—')}</code> · kaynak: ${esc(e.sourceModule)} / ${esc(e.sourceId)} · ${isBalanced(e) ? 'borç = alacak doğrulandı' : 'DENGESİZ'}</p>`,
        actions: [{ label: 'Kapat', onClick: (_m, close) => close() }]
      });
    }));

    root.querySelector('#fin-export')?.addEventListener('click', () => {
      const tb = trialBalance(D().journalEntries || [], D().accounts || []);
      csvExport('mizan.csv', ['Hesap', 'Ad', 'Borç', 'Alacak', 'Bakiye'], tb.rows.map((r) => [r.code, r.name, r.debit, r.credit, r.balance]));
    });

    root.querySelector('#fin-check')?.addEventListener('click', () => {
      const d = D();
      const tb = trialBalance(d.journalEntries || [], d.accounts || []);
      store.change((data) => {
        const pc = (data.periodClosures || []).find((x) => x.period === data.settings.currentPeriod);
        if (pc) { pc.trialBalanceOk = tb.balanced; pc.postedEntries = (data.journalEntries || []).length; }
        addActivity(`Mizan kontrolü: ${tb.balanced ? 'borç = alacak' : 'dengesizlik var'}`, 'receipt');
      });
      refresh(); toast(tb.balanced ? 'Mizan dengeli, dönem kontrolü geçti' : 'Mizan dengesiz, kapanış engellendi', tb.balanced ? 'success' : 'danger');
    });

    root.querySelector('#fin-new-invoice')?.addEventListener('click', () => {
      const d = D();
      modal({
        title: 'Alış Faturası', subtitle: 'Fatura kaydı, borç / alacak fişi ve satıcı cari hareketi birlikte yazılır.', size: 'wide',
        body: `<div class="form-grid">
          ${field('Tedarikçi', select('supplierId', (d.suppliers || []).map((s) => ({ value: s.id, label: s.name }))))}
          ${field('Net Tutar (₺)', input('net', '100000', { type: 'number', min: 1 }))}
          ${field('KDV Oranı (%)', input('vatRate', String(d.settings.vatRate ?? 20), { type: 'number', min: 0 }))}
          ${field('Tarih', input('date', todayISO(), { type: 'date' }))}
          ${field('Belge No', input('no', `AF-${new Date().getFullYear()}-${String((d.invoices || []).length + 314).padStart(4, '0')}`))}
          ${field('Vade', select('paymentTerm', ['15 gün', '30 gün', '45 gün', '60 gün']))}
        </div><div id="fin-preview" class="micro muted" style="margin-top:10px"></div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_m, close) => close() },
          { label: 'Fatura ve Fişi Yaz', kind: 'primary', icon: 'receipt', onClick: (m, close) => {
            const f = formData(m);
            const a = amounts(f.net, f.vatRate);
            const invId = uid('INV');
            const invoice = {
              id: invId, no: f.no || `AF-${invId}`, direction: 'Alış', partyType: 'supplier', partyId: f.supplierId,
              date: f.date, dueDate: f.date, net: a.net, vatRate: a.vatRate, vat: a.vat, gross: a.gross,
              status: 'Bekliyor', sourceType: 'Satın Alma', sourceId: 'Manuel', currency: cur(),
              period: D().settings.currentPeriod
            };
            const entry = purchaseEntry(invoice, { id: uid('JE'), no: `MF-${invId}`, period: D().settings.currentPeriod });
            store.change((data) => {
              data.invoices.unshift(invoice);
              appendJournal(entry);
              const bg = (data.budgets || []).find((b) => b.period === data.settings.currentPeriod && b.category === 'Hammadde');
              if (bg) bg.actual = round2((Number(bg.actual) || 0) + a.net);
              addActivity(`${invoice.no} alış faturası ve ${entry.no} muhasebe fişi yazıldı`, 'receipt');
              addNotification({ type: 'info', title: 'Alış faturası kaydedildi', body: `${invoice.no} · ${fmtMoney(a.gross, cur())} · ödeme vadesi ${f.paymentTerm}`, source: 'Muhasebe' });
            });
            close(); refresh(); toast('Fatura, muhasebe fişi ve bütçe gerçekleşeni tek işlemde güncellendi');
          } }
        ]
      });
      // Önizleme: modal içindeki form alanlarından hesaplanır.
      const mo = document.querySelector('.modal-backdrop:last-of-type');
      if (mo) {
        const update = () => {
          const f = formData(mo.querySelector('.modal') || mo);
          const a = amounts(f.net, f.vatRate);
          const el = mo.querySelector('#fin-preview');
          if (el) el.innerHTML = `Net ${fmtMoney(a.net, cur())} · KDV ${fmtMoney(a.vat, cur())} · Brüt <strong>${fmtMoney(a.gross, cur())}</strong> · 150 + 191 borç / 320 alacak`;
        };
        update();
        mo.addEventListener('input', update);
      }
    });

    root.querySelector('#fin-close')?.addEventListener('click', () => {
      const d = D();
      const tb = trialBalance(d.journalEntries || [], d.accounts || []);
      if (!tb.balanced) { toast('Mizan dengesizken dönem kapatılamaz', 'danger'); return; }
      confirmDialog('Dönemi kapat', `${d.settings.currentPeriod} dönemi kapatılacak. Fişler değiştirilemez; düzeltme ters fişle yapılır.`, () => {
        store.change((data) => {
          const pc = (data.periodClosures || []).find((x) => x.period === data.settings.currentPeriod);
          if (pc) { pc.status = 'Kapatıldı'; pc.trialBalanceOk = true; pc.checkedBy = 'U11'; pc.closedAt = nowISO(); pc.notes = 'Mizan dengeli, bütçe sapması raporlandı'; }
          addActivity(`${data.settings.currentPeriod} dönemi kapatıldı`, 'lock');
        });
        refresh(); toast('Dönem kapatıldı');
      }, 'Kapat');
    });
  }
};

/* ==================================================================== */
/* 5. MALİYET & KÂRLILIK                                                 */
/* ==================================================================== */

export const costingView = {
  title: 'Maliyet & Kârlılık',
  subtitle: 'Döküm kodu bazında üretim maliyeti, birim maliyet, brüt kâr ve bütçe sapması',

  render() {
    const d = D();
    const kpi = kpiSnapshot(d);
    const records = d.costRecords || [];
    const orders = d.salesOrders || [];
    const budgets = (d.budgets || []).filter((b) => b.period === d.settings.currentPeriod);

    const costRows = records.map((r) => {
      const c = lotCost(r);
      const order = orders.find((o) => (d.reservations || []).some((x) => x.salesOrderId === o.id && x.lotId === r.lotId));
      const margin = order ? salesMargin({ revenue: (Number(order.ton) || 0) * (Number(order.unitPrice) || 0), costTon: c.netTon, unitCostPerTon: c.unitCostPerTon }) : null;
      return { r, c, order, margin };
    });

    return `
      <div class="info-banner">${icon('scale', 18)}<span>Kaynak metin "bir ürünün üretim maliyeti ne kadardır" sorusunu sorar. Burada maliyet nesnesi bir inşaat projesi değil, <strong>döküm kodudur</strong>. Hammadde, enerji, sarf, işçilik ve fire ayrı kalemlerde tutulur; satış geliriyle karşılaştırılıp brüt kâr üretilir. Bordro hesabı dışarıda kalır, işçilik maliyeti vardiya verisinden aktarılır.</span></div>

      <div class="kpi-grid">
        <div class="kpi kpi-indigo"><div class="kpi-top"><span class="kpi-icon">${icon('trend', 18)}</span></div><div class="kpi-value">${fmtMoney(kpi.revenue, cur())}</div><div class="kpi-label">Satış Geliri</div><div class="kpi-foot"><span>${esc(kpi.period)}</span></div></div>
        <div class="kpi kpi-cyan"><div class="kpi-top"><span class="kpi-icon">${icon('flame', 18)}</span></div><div class="kpi-value">${fmtNum(kpi.productionTon, 1)}<small>t</small></div><div class="kpi-label">Üretim</div><div class="kpi-foot"><span>Fire %${fmtNum(kpi.scrapPct, 2)}</span></div></div>
        <div class="kpi kpi-amber"><div class="kpi-top"><span class="kpi-icon">${icon('wallet', 18)}</span></div><div class="kpi-value">%${fmtNum(kpi.budgetUsagePct, 1)}</div><div class="kpi-label">Bütçe Kullanımı</div><div class="kpi-foot"><span>${fmtMoney(kpi.budgetActual, cur())} / ${fmtMoney(kpi.budgetPlanned, cur())}</span></div></div>
        <div class="kpi kpi-violet"><div class="kpi-top"><span class="kpi-icon">${icon('truck', 18)}</span></div><div class="kpi-value">%${fmtNum(kpi.onTimeDeliveryPct, 0)}</div><div class="kpi-label">Zamanında Sevk</div><div class="kpi-foot"><span>${kpi.openOrders} açık sipariş</span></div></div>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Döküm Kodu Maliyetleri</strong><p class="muted">Beş kalem maliyet ve birim maliyet</p></div>
          <div class="toolbar"><button class="btn btn-ghost btn-sm" id="cost-export">${icon('download', 15)} CSV</button>
          <button class="btn btn-ghost btn-sm" id="cost-recalc">${icon('refresh', 15)} Birimleri Yeniden Hesapla</button></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Döküm Kodu</th><th>Net Ton</th><th>Hammadde</th><th>Enerji</th><th>Sarf</th><th>İşçilik</th><th>Fire</th><th>Toplam</th><th>₺ / ton</th><th>₺ / kg</th><th>Durum</th></tr></thead>
          <tbody>${costRows.map(({ r, c }) => `<tr><td class="cell-strong">${esc(r.lotId)}</td><td class="num">${fmtNum(c.netTon, 1)}</td>
            <td class="num">${fmtMoney(c.parts.Hammadde, cur())}</td><td class="num">${fmtMoney(c.parts.Enerji, cur())}</td>
            <td class="num">${fmtMoney(c.parts.Sarf, cur())}</td><td class="num">${fmtMoney(c.parts.İşçilik, cur())}</td>
            <td class="num">${fmtMoney(c.parts.Fire, cur())}</td><td class="num"><strong>${fmtMoney(c.total, cur())}</strong></td>
            <td class="num">${fmtNum(c.unitCostPerTon, 2)}</td><td class="num">${fmtNum(c.unitCostPerKg, 4)}</td>
            <td>${statusPill(r.status)}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="micro muted" style="margin-top:10px">Kayıtlı toplam ile kalemler toplamı uyuşmazsa satır "tutarsız" işaretlenir; tutarlılık ${costRows.filter((x) => x.c.consistent).length}/${costRows.length}.</p>
      </section>

      <div class="grid-2">
        <section class="card">
          <div class="card-head"><div><strong>Sipariş Kârlılığı</strong><p class="muted">Satış geliri karşısında üretim maliyeti</p></div></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Sipariş</th><th>Gelir</th><th>Maliyet</th><th>Brüt Kâr</th><th>Marj</th></tr></thead>
            <tbody>${costRows.filter((x) => x.margin).map(({ order, margin }) => `<tr><td class="cell-strong">${esc(order.no)}</td>
              <td class="num">${fmtMoney(margin.revenue, cur())}</td><td class="num">${fmtMoney(margin.cost, cur())}</td>
              <td class="num ${margin.grossProfit >= 0 ? 'text-ok' : 'text-danger'}">${fmtMoney(margin.grossProfit, cur())}</td>
              <td>${pill(`%${fmtNum(margin.marginPct, 1)}`, margin.marginPct >= 0 ? 'ok' : 'danger')}</td></tr>`).join('') || `<tr><td colspan="5">${emptyState('Eşleşen sipariş yok', 'cart')}</td></tr>`}</tbody>
          </table></div>
        </section>
        <section class="card">
          <div class="card-head"><div><strong>Bütçe ve Gerçekleşen</strong><p class="muted">${esc(d.settings.currentPeriod)} dönemi, kalem bazında sapma</p></div></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Kalem</th><th>Planlanan</th><th>Gerçekleşen</th><th>Kullanım</th></tr></thead>
            <tbody>${budgets.map((b) => `<tr><td class="cell-strong">${esc(b.category)}</td><td class="num">${fmtMoney(b.planned, cur())}</td>
              <td class="num">${fmtMoney(b.actual, cur())}</td>
              <td style="min-width:120px">${progress(b.planned ? b.actual / b.planned * 100 : 0, 100, b.actual > b.planned ? '#ef4444' : '#16a34a')}
              <span class="micro muted">%${fmtNum(b.planned ? b.actual / b.planned * 100 : 0, 1)}</span></td></tr>`).join('')}</tbody>
          </table></div>
        </section>
      </div>`;
  },

  mount(root) {
    root.querySelector('#cost-recalc')?.addEventListener('click', () => {
      let n = 0;
      store.change((d) => (d.costRecords || []).forEach((r) => {
        const c = lotCost(r);
        r.totalCost = c.total;
        r.unitCostPerTon = c.unitCostPerTon;
        r.unitCostPerKg = c.unitCostPerKg;
        r.status = 'Hesaplandı';
        n += 1;
      }));
      refresh(); toast(`${n} döküm kodunun birim maliyeti yeniden hesaplandı`);
    });
    root.querySelector('#cost-export')?.addEventListener('click', () => {
      const rows = (D().costRecords || []).map((r) => {
        const c = lotCost(r);
        return [r.lotId, c.netTon, c.parts.Hammadde, c.parts.Enerji, c.parts.Sarf, c.parts.İşçilik, c.parts.Fire, c.total, c.unitCostPerTon, c.unitCostPerKg];
      });
      csvExport('maliyet.csv', ['Döküm Kodu', 'Net Ton', 'Hammadde', 'Enerji', 'Sarf', 'İşçilik', 'Fire', 'Toplam', '₺/ton', '₺/kg'], rows);
    });
  }
};

/* ==================================================================== */
/* 6. DEPO, REZERVASYON & SAYIM                                         */
/* ==================================================================== */

export const warehouseView = {
  title: 'Depo, Rezervasyon & Sayım',
  subtitle: 'Depo lokasyonları, sipariş rezervasyonu ve fiziki sayım farkı',

  render() {
    const d = D();
    const whs = d.warehouses || [];
    const rsv = d.reservations || [];
    const counts = d.stockCounts || [];

    return `
      <div class="info-banner">${icon('warehouse', 18)}<span>Kaynak metin "hangi ürün hangi depoda, hangi malzeme hangi işe gönderildi" sorusunu sorar. Burada cevap depo lokasyonu ve rezervasyon kaydıdır. Fiziki sayımda beklenen ile sayılan arasındaki fark <strong>stok hareketi + düzeltme fişi + denetim izi</strong> olarak üç yere birden yazılır; fark tek başına stok kartına işlenmez.</span></div>

      <div class="stat-strip">
        <div><span>Depo Lokasyonu</span><strong>${whs.length}</strong></div>
        <div><span>Aktif Rezervasyon</span><strong>${rsv.filter((r) => r.status === 'Aktif').length}</strong></div>
        <div><span>Rezerve Ton</span><strong>${fmtNum(round2(rsv.filter((r) => r.status === 'Aktif').reduce((a, r) => a + (Number(r.ton) || 0), 0)), 1)} t</strong></div>
        <div><span>Sayım Kaydı</span><strong>${counts.length}</strong></div>
        <div><span>Fark Bekleyen</span><strong class="text-warn">${counts.filter((c) => c.differenceKg !== 0 && c.status !== 'Onaylandı').length}</strong></div>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Depolar</strong><p class="muted">Fabrika, kapasite ve sorumlu</p></div></div>
        <div class="grid-3">${whs.map((w) => `<div class="data-card">
          <div class="data-ico">${icon('warehouse', 20)}</div><div class="cell-strong">${esc(w.name)}</div>
          <div class="cell-sub">${esc(w.code)} · ${esc(w.kind)} · ${fmtNum(w.capacityTon)} t</div>
          <div class="toolbar" style="margin-top:10px">${pill(w.active ? 'Aktif' : 'Pasif', w.active ? 'ok' : 'warn')}
          <span class="toolbar-spacer"></span><span class="micro muted">${esc(w.keeperId || '')}</span></div>
        </div>`).join('')}</div>
      </section>

      <div class="grid-2">
        <section class="card">
          <div class="card-head"><div><strong>Stok Rezervasyonları</strong><p class="muted">Satış siparişi ile döküm kodu bağlantısı</p></div></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Sipariş</th><th>Döküm Kodu</th><th>Depo</th><th>Ton</th><th>Durum</th><th></th></tr></thead>
            <tbody>${rsv.map((r) => `<tr><td class="cell-strong">${esc(byId(D().salesOrders, r.salesOrderId)?.no || r.salesOrderId)}</td>
              <td>${esc(r.lotId)}</td><td class="cell-sub">${esc(warehouseName(r.warehouseId))}</td>
              <td class="num">${fmtNum(r.ton, 1)}</td><td>${statusPill(r.status)}</td>
              <td>${r.status === 'Aktif' ? `<button class="btn btn-ghost btn-sm" data-rsv-release="${esc(r.id)}">Serbest Bırak</button>` : ''}</td></tr>`).join('')}</tbody>
          </table></div>
        </section>
        <section class="card">
          <div class="card-head"><div><strong>Fiziki Sayım</strong><p class="muted">Beklenen, sayılan ve fark</p></div>
            <button class="btn btn-primary btn-sm" id="wh-count">${icon('plus', 15)} Sayım Gir</button></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Belge</th><th>Malzeme</th><th>Beklenen</th><th>Sayılan</th><th>Fark</th><th>Durum</th><th>Fiş</th></tr></thead>
            <tbody>${counts.map((c) => `<tr><td class="cell-strong">${esc(c.no)}</td><td>${esc(matName(c.materialId))}</td>
              <td class="num">${fmtNum(c.expectedKg)} kg</td><td class="num">${fmtNum(c.countedKg)} kg</td>
              <td class="num ${c.differenceKg !== 0 ? 'text-warn' : ''}">${c.differenceKg > 0 ? '+' : ''}${fmtNum(c.differenceKg)} kg</td>
              <td>${statusPill(c.status)}</td><td class="cell-sub">${esc(c.journalId || '—')}</td></tr>`).join('')}</tbody>
          </table></div>
        </section>
      </div>`;
  },

  mount(root) {
    root.querySelectorAll('[data-rsv-release]').forEach((btn) => btn.addEventListener('click', () => {
      store.change((d) => {
        const r = byId(d.reservations, btn.dataset.rsvRelease);
        if (r) { r.status = 'İptal'; addActivity(`${r.id} rezervasyonu serbest bırakıldı`, 'warehouse'); }
      });
      refresh(); toast('Rezervasyon serbest bırakıldı');
    }));

    root.querySelector('#wh-count')?.addEventListener('click', () => {
      const d = D();
      modal({
        title: 'Fiziki Sayım Girişi', subtitle: 'Fark varsa düzeltme hareketi ve muhasebe fişi birlikte üretilir.', size: 'wide',
        body: `<div class="form-grid">
          ${field('Depo', select('warehouseId', (d.warehouses || []).map((w) => ({ value: w.id, label: w.name }))))}
          ${field('Malzeme', select('materialId', (d.materials || []).map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }))))}
          ${field('Beklenen (kg)', input('expectedKg', '1000', { type: 'number', min: 0 }))}
          ${field('Sayılan (kg)', input('countedKg', '1010', { type: 'number', min: 0 }))}
          ${field('Durum', select('status', ['Taslak', 'Onaylandı']))}
        </div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_m, close) => close() },
          { label: 'Sayımı Kaydet', kind: 'primary', onClick: (m, close) => {
            const f = formData(m);
            const diff = (Number(f.countedKg) || 0) - (Number(f.expectedKg) || 0);
            const countId = uid('SC');
            const value = Math.abs(diff) * 100; // örnek birim değer, parametre yapılabilir
            const approved = f.status === 'Onaylandı' && diff !== 0;
            const entry = approved ? buildEntry({
              id: uid('JE'), no: `MF-${countId}`, date: todayISO(), period: D().settings.currentPeriod,
              description: 'Fiziki sayım farkı düzeltmesi', sourceModule: 'Depo', sourceId: countId,
              clientId: `COUNT-${countId}`, postedBy: 'U11',
              lines: [
                { accountId: 'A153', accountCode: '153', debit: value, credit: 0, note: 'Sayım farkı' },
                { accountId: 'A730', accountCode: '730', debit: 0, credit: value, note: 'Maliyet düzeltmesi' }
              ]
            }) : null;
            store.change((data) => {
              data.stockCounts.unshift({
                id: countId, no: `SY-${countId}`, warehouseId: f.warehouseId, materialId: f.materialId,
                expectedKg: Number(f.expectedKg) || 0, countedKg: Number(f.countedKg) || 0,
                differenceKg: diff, countedBy: 'U03', at: nowISO(), status: f.status,
                journalId: entry ? entry.id : null
              });
              if (approved) {
                moveStock({ materialId: f.materialId, quantity: diff, type: 'Sayım Farkı', source: 'Fiziki Sayım', ref: countId, notes: 'Beklenen ile sayılan farkı' });
                appendJournal(entry);
                addActivity(`Sayım farkı ${diff > 0 ? '+' : ''}${fmtNum(diff)} kg için stok ve fiş yazıldı`, 'scale');
              }
            });
            close(); refresh(); toast(approved ? 'Sayım farkı stok hareketi ve düzeltme fişi olarak yazıldı' : 'Sayım kaydedildi');
          } }
        ]
      });
    });
  }
};

/* ==================================================================== */
/* 7. PERSONEL & VARDİYA                                                 */
/* ==================================================================== */

export const hrView = {
  title: 'Personel & Vardiya',
  subtitle: 'Operatör ataması, vardiya devri ve olay günlüğündeki sorumluluk izi',

  render() {
    const d = D();
    const emps = d.employees || [];
    const shifts = d.shifts || [];
    const events = (d.events || []).slice(0, 7);
    const userName = (id) => byId(d.users, id)?.name || id || '—';

    return `
      <div class="info-banner">${icon('briefcase', 18)}<span>Genel ERP metnindeki insan kaynakları modülünün bu fabrika için gerekli kısmı <strong>vardiya ve operatör izlenebilirliğidir</strong>. Maaş, bordro, izin ve özlük hesabı harici bordro servisinde kalır; sistem yalnızca "hangi olay hangi vardiyada, hangi operatör tarafından yazıldı" bilgisini tutar. Bu ayrım operatör ekranını gereksiz kalabalıktan korur.</span></div>

      <div class="stat-strip">
        <div><span>Personel</span><strong>${emps.length}</strong></div>
        <div><span>Vardiya</span><strong>${shifts.length}</strong></div>
        <div><span>Aktif Operatör</span><strong>${new Set(shifts.flatMap((s) => s.operatorIds || [])).size}</strong></div>
        <div><span>Vardiyalı Olay</span><strong>${events.length}</strong></div>
        <div><span>Bordro</span><strong>Harici</strong></div>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Vardiya Planı</strong><p class="muted">${fmtDate('2026-11-03')} · devir notları üretim olaylarına bağlanır</p></div>
          <button class="btn btn-ghost btn-sm" id="hr-export">${icon('download', 15)} CSV</button></div>
        <div class="grid-2">${shifts.map((s) => `<div class="data-card">
          <div class="data-ico">${icon('clock', 20)}</div><div class="cell-strong">${esc(s.name)}</div>
          <div class="cell-sub">${esc(s.start)} – ${esc(s.end)} · Sorumlu ${esc(userName(s.supervisorId))}</div>
          <p class="micro muted" style="margin-top:9px">${esc(s.handoverNote || 'Devir notu yok')}</p>
          <div class="toolbar" style="margin-top:9px">${pill(`${(s.operatorIds || []).length} operatör`, 'indigo')}
            <span class="toolbar-spacer"></span><span class="micro muted">${fmtNum(s.eventCount)} olay</span></div>
        </div>`).join('')}</div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Personel Kartları</strong><p class="muted">Kullanıcı hesabı, rol ve vardiya eşleşmesi</p></div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Personel</th><th>Bölüm</th><th>Rol</th><th>Vardiya</th><th>İşe Giriş</th><th>Bordro</th><th></th></tr></thead>
          <tbody>${emps.map((e) => `<tr><td class="cell-strong">${esc(e.name)}<div class="cell-sub">${esc(e.id)} · ${esc(e.userId)}</div></td>
            <td>${esc(e.department)}</td><td>${esc(e.role)}</td><td>${esc(byId(D().shifts, e.shiftId)?.name || '—')}</td>
            <td>${fmtDate(e.startDate)}</td><td class="cell-sub">${esc(e.payrollRef)}</td>
            <td><button class="btn btn-ghost btn-sm" data-hr-shift="${esc(e.id)}">Vardiya Değiştir</button></td></tr>`).join('')}</tbody>
        </table></div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Olaylarda Sorumluluk İzi</strong><p class="muted">docs/09 olay günlüğündeki actor alanı personel kartına bağlanır</p></div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Olay</th><th>Döküm Kodu</th><th>Aktör</th><th>Kaynak</th><th>Zaman</th></tr></thead>
          <tbody>${events.map((e) => `<tr><td>${pill(e.type, 'indigo')}</td><td>${esc(e.lotId)}</td>
            <td>${esc(userName(e.actor))}</td><td>${esc(e.source)}</td><td>${fmtDateTime(e.at)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-hr-shift]').forEach((btn) => btn.addEventListener('click', () => {
      const e = byId(D().employees, btn.dataset.hrShift);
      if (!e) return;
      modal({
        title: 'Vardiya Ataması', subtitle: `${e.name} · mevcut ${byId(D().shifts, e.shiftId)?.name || '—'}`,
        body: field('Yeni Vardiya', select('shiftId', (D().shifts || []).map((s) => ({ value: s.id, label: s.name })), e.shiftId)),
        actions: [
          { label: 'Vazgeç', onClick: (_m, close) => close() },
          { label: 'Kaydet', kind: 'primary', onClick: (m, close) => {
            const f = formData(m);
            store.change((d) => {
              const t = byId(d.employees, e.id);
              if (t) t.shiftId = f.shiftId;
              addActivity(`${e.name} vardiyası güncellendi`, 'users');
            });
            close(); refresh(); toast('Vardiya ataması güncellendi');
          } }
        ]
      });
    }));
    root.querySelector('#hr-export')?.addEventListener('click', () => {
      csvExport('personel-vardiya.csv', ['Personel', 'Bölüm', 'Rol', 'Vardiya'],
        (D().employees || []).map((e) => [e.name, e.department, e.role, byId(D().shifts, e.shiftId)?.name || '']));
    });
  }
};

/* ==================================================================== */
/* 8. ENTEGRASYON MATRİSİ                                               */
/* ==================================================================== */

export const integrationView = {
  title: 'Entegrasyon Matrisi',
  subtitle: 'Tek kayıt, çok etki: bir onaydan türeyen stok, fatura, fiş, cari, maliyet ve olay',

  render() {
    const d = D();
    const rules = d.integrationRules || INTEGRATION_MATRIX;
    const eligible = (d.shipments || []).filter((s) => s.managerApproved && s.accountingApproved && !s.postingDone);
    const kpi = kpiSnapshot(d);

    return `
      <div class="info-banner">${icon('link', 18)}<span>Kaynak metnin "aynı işlem için beş farklı departmanın ayrı ayrı veri girmesine gerek kalmaz" cümlesi bu ekranın gerekçesidir. Aşağıdaki kurallar hangi tetikleyicinin hangi kayıtları ürettiğini gösterir. <strong>Onaylı Sevkiyatı Muhasebeleştir</strong> düğmesi bunu gerçekten uygular: tek bir <code>store.change</code> içinde sekiz koleksiyon güncellenir.</span></div>

      <div class="stat-strip">
        <div><span>Entegrasyon Kuralı</span><strong>${rules.length}</strong></div>
        <div><span>Otomatik</span><strong class="text-ok">${rules.filter((r) => r.autoPost).length}</strong></div>
        <div><span>Onay İsteyen</span><strong>${rules.filter((r) => r.requiresApproval).length}</strong></div>
        <div><span>Bekleyen Sevkiyat</span><strong class="text-warn">${eligible.length}</strong></div>
        <div><span>Muhasebe Fişi</span><strong>${(d.journalEntries || []).length}</strong></div>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Tetikleyici ve Ürettiği Kayıtlar</strong><p class="muted">Kaynak modül, muhasebe etkisi ve onay gereksinimi</p></div>
          <div class="toolbar"><button class="btn btn-ghost btn-sm" id="int-export">${icon('download', 15)} CSV</button>
          <button class="btn btn-primary" id="int-run">${icon('play', 16)} Onaylı Sevkiyatı Muhasebeleştir</button></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>#</th><th>Tetikleyici</th><th>Modül</th><th>Üretilen Kayıtlar</th><th>Hesap Etkisi</th><th>Otomatik</th><th>Onay</th></tr></thead>
          <tbody>${rules.map((r) => `<tr><td class="cell-strong">${esc(r.id)}</td><td>${esc(r.trigger)}</td><td>${esc(r.module)}</td>
            <td class="cell-sub">${(r.produces || []).map((p) => pill(p, 'neutral')).join(' ')}</td>
            <td class="cell-sub">${esc(r.accountEffect)}</td>
            <td>${pill(r.autoPost ? 'Evet' : 'Hayır', r.autoPost ? 'ok' : 'neutral')}</td>
            <td>${pill(r.requiresApproval ? 'Gerekli' : '—', r.requiresApproval ? 'warn' : 'neutral')}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Tek Kayıt Simülasyonu</strong><p class="muted">Son çalıştırmada üretilen kayıtlar</p></div></div>
        <div id="int-effects" class="micro muted">Henüz çalıştırılmadı. Uygun sevkiyat: ${eligible.length ? esc(eligible[0].no) : 'yok'}.</div>
        <div class="card-divider"></div>
        <div class="stat-strip">
          <div><span>Satış Geliri</span><strong>${fmtMoney(kpi.revenue, cur())}</strong></div>
          <div><span>Müşteri Alacağı</span><strong>${fmtMoney(kpi.receivables, cur())}</strong></div>
          <div><span>Tedarikçi Borcu</span><strong>${fmtMoney(kpi.payables, cur())}</strong></div>
          <div><span>Olay Satırı</span><strong>${(d.events || []).length}</strong></div>
        </div>
      </section>`;
  },

  mount(root) {
    root.querySelector('#int-export')?.addEventListener('click', () => {
      csvExport('entegrasyon-matrisi.csv', ['Kural', 'Tetikleyici', 'Modül', 'Üretilen Kayıtlar', 'Hesap Etkisi'],
        (D().integrationRules || []).map((r) => [r.id, r.trigger, r.module, (r.produces || []).join(' | '), r.accountEffect]));
    });

    root.querySelector('#int-run')?.addEventListener('click', () => {
      const d = D();
      const shipment = (d.shipments || []).find((s) => s.managerApproved && s.accountingApproved && !s.postingDone);
      if (!shipment) { toast('Muhasebeleştirilecek onaylı sevkiyat kalmadı', 'info'); return; }

      const cust = (d.customers || []).find((c) => c.name === shipment.customer) || (d.customers || [])[0];
      const lotId = (shipment.lotIds || [])[0] || '—';
      const pricePerKg = ((d.salesOrders || [])[0]?.unitPrice || 118500) / 1000;
      const net = round2((Number(shipment.weighbridgeKg) || 0) * pricePerKg);
      const a = amounts(net, d.settings.vatRate ?? 20);
      const invoiceNo = `FTR-${new Date().getFullYear()}-${String(1145 + (d.invoices || []).length).padStart(4, '0')}`;
      const invoice = {
        id: uid('INV'), no: invoiceNo, direction: 'Satış', partyType: 'customer',
        partyId: cust?.id || 'M01', date: todayISO(), dueDate: todayISO(),
        net: a.net, vatRate: a.vatRate, vat: a.vat, gross: a.gross,
        status: 'Bekliyor', sourceType: 'Sevkiyat', sourceId: shipment.id,
        currency: cur(), period: d.settings.currentPeriod
      };
      const journal = salesEntry(invoice, {
        id: uid('JE'), no: `MF-${invoiceNo}`, date: todayISO(), period: d.settings.currentPeriod,
        clientId: `POST-${shipment.id}`, description: `${shipment.no} satış faturası`
      });
      const movement = {
        id: uid('MV'), at: nowISO(), type: 'Çıkış', materialId: 'M01',
        quantity: -(Number(shipment.weighbridgeKg) || 0), source: 'Entegrasyon',
        ref: shipment.no, remaining: 0, userId: 'Siz', notes: `${shipment.customer} · ${invoiceNo}`
      };
      const costRecord = (d.costRecords || []).find((r) => r.lotId === lotId) || null;
      const effects = postingEffects('SHIPMENT_APPROVED', { shipment, invoice, journal, customer: cust, movement, costRecord });
      const lastSeq = Math.max(0, ...(d.events || []).filter((e) => e.lotId === lotId).map((e) => Number(e.seq) || 0));
      const lastBal = (d.events || []).filter((e) => e.lotId === lotId).sort((x, y) => (Number(x.seq) || 0) - (Number(y.seq) || 0)).at(-1)?.balanceTon || 0;

      store.change((data) => {
        data.invoices.unshift(invoice);
        appendJournal(journal);
        data.movements.unshift(movement);
        if (cust) {
          const target = byId(data.customers, cust.id);
          if (target) target.balance = round2((Number(target.balance) || 0) + invoice.gross);
        }
        const t = byId(data.shipments, shipment.id);
        if (t) { t.postingDone = true; t.invoiceNo = invoiceNo; t.archived = true; t.status = 'Arşivlendi'; }
        data.events.unshift({
          id: uid('EV'), seq: lastSeq + 1, lotId, plantId: data.settings.activePlantId || 'P1',
          machineId: null, type: 'SHIPMENT', at: nowISO(), actor: 'U11', source: 'WORKER',
          grossTon: lastBal, deltaTon: 0, balanceTon: lastBal,
          materialId: null, fate: 'product', ref: invoiceNo,
          payload: { invoiceNo, gross: invoice.gross, weighbridgeKg: shipment.weighbridgeKg },
          note: 'Tek kayıt çok etki: sevkiyat muhasebeleştirildi', clientId: `POST-${shipment.id}`
        });
        addNotification({ type: 'success', title: 'Sevkiyat muhasebeleştirildi', body: `${shipment.no} · ${invoiceNo} · ${fmtMoney(invoice.gross, cur())}`, source: 'Entegrasyon' });
        data.outbox.unshift({
          id: uid('OB'), createdAt: nowISO(), channel: 'mail', to: data.settings.reportMail || '',
          subject: 'Günlük satış raporu', body: `${shipment.no} satış kaydı muhasebeye aktarıldı.`,
          source: 'Entegrasyon', status: data.settings.online ? 'sent' : 'queued',
          attempt: data.settings.online ? 1 : 0, nextRetryAt: null, lastError: ''
        });
        addActivity(`${shipment.no} için ${effects.length} kayıt tek işlemde üretildi`, 'link');
      });

      const box = root.querySelector('#int-effects');
      if (box) box.innerHTML = `<strong>${esc(shipment.no)}</strong> için üretilen ${effects.length} kayıt:<br>` +
        effects.map((e) => `<span class="order-chip">${esc(e.label)}</span>`).join(' ') +
        `<br><span class="muted">Borç ${fmtMoney(journal.totalDebit, cur())} = Alacak ${fmtMoney(journal.totalCredit, cur())} · clientId ${esc(journal.clientId)} · ikinci tıklamada çift yazım engellenir.</span>`;
      toast(`${effects.length} kayıt tek işlemde üretildi (stok, fatura, fiş, cari, olay, bildirim)`);
    });
  }
};
