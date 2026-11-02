import { D, store, material, matName, lot, uid, nowISO, todayISO, moveStock, addActivity, addNotification } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmtNum, fmtDate, fmtDateTime, pill, field, input, select, formData, modal, confirmDialog, toast, csvExport } from '../ui.js';

let shipFilter = 'Tümü';

function statusOf(s) {
  if (s.archived) return { text: 'Arşivlendi', cls: 'ok' };
  if (!s.managerApproved) return { text: 'Yönetici Onayı Bekliyor', cls: 'warn' };
  if (!s.accountingApproved) return { text: 'Muhasebe Onayı Bekliyor', cls: 'info' };
  return { text: 'Onaylandı', cls: 'ok' };
}

export const shipmentsView = {
  title: 'Sevkiyat & Onaylar',
  subtitle: 'Biyet seçimi, kantar fişi, iki kademeli onay ve stok düşümü',

  render() {
    const d = D();
    const list = d.shipments.filter((s) => shipFilter === 'Tümü' || (shipFilter === 'Bekleyen' ? !s.archived : s.archived));
    const rows = list.map((s) => {
      const st = statusOf(s);
      const diff = Number(s.weighbridgeKg || 0) - Number(s.requestedKg || 0);
      return `<div class="ship-card" data-ship="${esc(s.id)}">
        <div class="ship-head"><span class="code">${icon('truck', 15)} ${esc(s.no)}</span>${pill(st.text, st.cls)}</div>
        <div class="ship-customer">${esc(s.customer || '—')}</div>
        <div class="ship-meta"><span>${icon('calendar', 14)} ${fmtDate(s.date)}</span><span>${icon('tag', 14)} ${esc(s.kind)}</span><span>${icon('truck', 14)} ${esc(s.plate || '—')}</span></div>
        <div class="ship-weights"><div><span>Seçilen</span><strong>${fmtNum(s.requestedKg)} kg</strong></div><div><span>Kantar</span><strong>${fmtNum(s.weighbridgeKg)} kg</strong></div><div><span>Fark</span><strong class="${Math.abs(diff) > 200 ? 'text-danger' : 'text-ok'}">${diff > 0 ? '+' : ''}${fmtNum(diff)} kg</strong></div></div>
        <div class="approval-track">
          <div class="ap-step ${s.managerApproved ? 'done' : 'pending'}">${icon(s.managerApproved ? 'check' : 'clock', 14)}<span>Yönetici</span></div>
          <span class="ap-line"></span>
          <div class="ap-step ${s.accountingApproved ? 'done' : 'pending'}">${icon(s.accountingApproved ? 'check' : 'clock', 14)}<span>Muhasebe / Fatura</span></div>
          <span class="ap-line"></span>
          <div class="ap-step ${s.archived ? 'done' : 'pending'}">${icon(s.archived ? 'check' : 'archive', 14)}<span>Stok & Arşiv</span></div>
        </div>
        <div class="ship-foot"><span class="muted small">${s.invoiceNo ? `Fatura: ${esc(s.invoiceNo)}` : 'Fatura henüz kesilmedi'}</span><button class="btn btn-ghost btn-sm">Detay ${icon('chevron', 14)}</button></div>
      </div>`;
    }).join('');
    const pending = d.shipments.filter((s) => !s.archived).length;
    return `
      <div class="stat-strip"><div><span>Toplam sevkiyat</span><strong>${d.shipments.length}</strong></div><div><span>Onay bekleyen</span><strong class="text-warn">${pending}</strong></div><div><span>Arşivlenen</span><strong>${d.shipments.filter((s) => s.archived).length}</strong></div><div><span>Bugünkü çıkış</span><strong>${fmtNum(d.shipments.filter((s) => s.date === '2026-11-02').reduce((a, s) => a + Number(s.weighbridgeKg || 0), 0))} kg</strong></div></div>
      <div class="info-banner">${icon('shield', 17)}<span><strong>Görev ayrılığı:</strong> Yönetici kantar fişini onaylar; stok düşümü yalnızca muhasebe/fatura onayından sonra gerçekleşir. Aynı kullanıcı iki onayı birden veremez. Cüruf, talaş, hammadde veya sarf satışı da aynı akıştan geçer.</span></div>
      <section class="card">
        <div class="toolbar">
          ${select('filter', [{ value: 'Tümü', label: 'Tümü' }, { value: 'Bekleyen', label: 'Onay Bekleyenler' }, { value: 'Arşiv', label: 'Arşivlenenler' }], shipFilter, 'id="ship-filter"')}
          <span class="toolbar-spacer"></span>
          <button class="btn btn-primary" id="ship-new">${icon('plus', 16)} Yeni Çıkış / Sevkiyat</button>
        </div>
        <div class="ship-grid">${rows || '<div class="muted pad">Bu filtrede kayıt yok.</div>'}</div>
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    root.querySelector('#ship-filter').addEventListener('change', (e) => { shipFilter = e.target.value; refresh(); });

    root.querySelector('#ship-new').addEventListener('click', () => {
      const readyLots = D().lots.filter((l) => l.stage === 'Mamul Stok');
      const mo = modal({
        title: 'Yeni Çıkış / Sevkiyat', subtitle: 'Mamul biyet, yan ürün veya hammadde çıkışı — hepsi aynı onay akışını kullanır.', size: 'wide',
        body: `<div class="form-grid">
          ${field('Çıkış Türü', select('kind', ['Mamul', 'Yan Ürün', 'Hammadde', 'Sarf'], 'Mamul', 'id="ship-kind"'))}
          ${field('Müşteri / Alıcı', input('customer', '', { required: true, placeholder: 'Firma unvanı' }))}
          ${field('Tarih', input('date', todayISO(), { type: 'date' }))}
          ${field('Araç Plakası', input('plate', ''))}
          ${field('Kantar Fişi No', input('weighbridgeNo', `TF-${new Date().getFullYear()}-${String(D().shipments.length + 419).padStart(4, '0')}`))}
          ${field('Kantar Ağırlığı (kg)', input('weighbridgeKg', 9000, { type: 'number', min: 1 }))}
        </div>
        <div class="detail-section" id="ship-lot-area"><h4>Döküm Kodu Seçimi (Mamul)</h4><div class="check-list">${readyLots.map((l) => `<label class="check-row"><input type="checkbox" name="lotIds" value="${esc(l.id)}"><span><strong>${esc(l.code)}</strong> · ${esc(l.alloy)} · ${fmtNum(l.weightTon, 1)} t · Ø${l.diameterMm}</span></label>`).join('') || '<p class="muted">Mamul stokta hazır biyet yok.</p>'}</div></div>
        <div class="detail-section" id="ship-mat-area" hidden><h4>Malzeme Seçimi</h4>${select('materialId', D().materials.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` })))}</div>
        ${field('Not', `<textarea class="input" name="notes" rows="2"></textarea>`)}`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Çıkış Kaydı Oluştur', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            const lotIds = Array.from(el.querySelectorAll('input[name="lotIds"]:checked')).map((x) => x.value);
            const isMamul = f.kind === 'Mamul';
            if (isMamul && !lotIds.length) { toast('En az bir döküm kodu seçin', 'danger'); return; }
            const requestedKg = isMamul ? Math.round(lotIds.reduce((s, id) => s + Number(lot(id)?.weightTon || 0), 0) * 1000) : Number(f.weighbridgeKg);
            store.change((d) => {
              d.shipments.unshift({ id: uid('SV'), no: `SV-${new Date().getFullYear()}-${String(d.shipments.length + 93).padStart(4, '0')}`, date: f.date, lotIds: isMamul ? lotIds : [], materialId: isMamul ? null : f.materialId, kind: f.kind, customer: f.customer, plate: f.plate, weighbridgeKg: Number(f.weighbridgeKg), requestedKg, managerApproved: false, managerBy: null, accountingApproved: false, accountBy: null, invoiceNo: '', status: 'Yönetici Onayı Bekliyor', archived: false, notes: f.notes });
              addActivity(`${d.shipments[0].no} çıkış kaydı oluşturuldu, yönetici onayı bekliyor`, 'truck');
              addNotification({ type: 'info', title: 'Onay bekleyen sevkiyat', body: `${d.shipments[0].no} · ${f.customer} · ${fmtNum(f.weighbridgeKg)} kg`, source: 'Sevkiyat' });
            });
            close(); toast('Çıkış kaydı oluşturuldu, onay kuyruğuna düştü'); refresh();
          } }
        ]
      });
      const kindSel = mo.el.querySelector('#ship-kind');
      const toggle = () => {
        const isMamul = kindSel.value === 'Mamul';
        mo.el.querySelector('#ship-lot-area').hidden = !isMamul;
        mo.el.querySelector('#ship-mat-area').hidden = isMamul;
      };
      kindSel.addEventListener('change', toggle); toggle();
    });

    root.querySelectorAll('[data-ship]').forEach((card) => card.addEventListener('click', () => {
      const s = D().shipments.find((x) => x.id === card.dataset.ship); if (!s) return;
      const diff = Number(s.weighbridgeKg) - Number(s.requestedKg);
      const lotsText = s.lotIds.length ? s.lotIds.map((id) => `<span class="order-chip">${esc(id)}</span>`).join(' ') : `<span class="order-chip">${esc(matName(s.materialId))}</span>`;
      modal({
        title: s.no, subtitle: `${s.customer} · ${fmtDate(s.date)} · ${s.kind}`, size: 'wide',
        body: `<div class="detail-grid">
          <div class="detail-item"><span>Kantar Fişi Ağırlığı</span><strong>${fmtNum(s.weighbridgeKg)} kg</strong></div>
          <div class="detail-item"><span>Sistemde Seçili</span><strong>${fmtNum(s.requestedKg)} kg</strong></div>
          <div class="detail-item"><span>Fark</span><strong class="${Math.abs(diff) > 200 ? 'text-danger' : 'text-ok'}">${diff > 0 ? '+' : ''}${fmtNum(diff)} kg</strong></div>
          <div class="detail-item"><span>Fatura No</span><strong>${esc(s.invoiceNo || '—')}</strong></div>
        </div>
        <div class="detail-section"><h4>Seçilen Kalemler</h4><div class="order-items">${lotsText}</div></div>
        <div class="detail-section"><h4>Onay Durumu</h4><div class="mini-row"><span>1. Yönetici</span><span>${esc(s.managerBy || '—')}</span><strong>${s.managerApproved ? '✓ Onaylı' : '◷ Bekliyor'}</strong></div><div class="mini-row"><span>2. Muhasebe / Fatura</span><span>${esc(s.accountBy || '—')}</span><strong>${s.accountingApproved ? '✓ Onaylı' : '◷ Bekliyor'}</strong></div></div>
        ${s.notes ? `<p class="detail-desc">${esc(s.notes)}</p>` : ''}`,
        actions: [
          { label: 'Kapat', onClick: (_e, close) => close() },
          ...(!s.managerApproved ? [{ label: 'Yönetici Onayı', kind: 'primary', icon: 'check', onClick: (_e, close) => {
            close();
            confirmDialog('Yönetici Onayı', `Kantar ${fmtNum(s.weighbridgeKg)} kg, sistemde seçili ${fmtNum(s.requestedKg)} kg. Fark ${fmtNum(diff)} kg. Bu çıkışı onaylıyor musunuz?`, () => {
              store.change((d) => { const t = d.shipments.find((x) => x.id === s.id); t.managerApproved = true; t.managerBy = 'U01'; t.status = 'Muhasebe Onayı Bekliyor'; addActivity(`${s.no} yönetici onayı verildi`, 'shield'); });
              toast('Yönetici onayı verildi, muhasebe ekranına düştü'); refresh();
            }, 'Onayla');
          } }] : []),
          ...(s.managerApproved && !s.accountingApproved ? [{ label: 'Muhasebe Onayı & Fatura', kind: 'primary', icon: 'file', onClick: (_e, close) => {
            close();
            modal({
              title: 'Muhasebe / Fatura Onayı', subtitle: `${s.no} · Onay sonrası stok düşümü gerçekleşir`, size: 'wide',
              body: `<div class="form-grid">
                ${field('Müşteri Bilgisi', input('customer', s.customer, { required: true }))}
                ${field('Araç Plakası', input('plate', s.plate, { required: true }))}
                ${field('Fatura Numarası', input('invoiceNo', `FTR-${new Date().getFullYear()}-${String(D().shipments.length + 1143).padStart(4, '0')}`, { required: true }))}
                ${field('Onaylanan Miktar (kg)', input('approvedKg', s.weighbridgeKg, { type: 'number', min: 1 }))}
              </div>`,
              actions: [
                { label: 'Vazgeç', onClick: (_e, c) => c() },
                { label: 'Onayla, Stoktan Düş & Arşivle', kind: 'primary', icon: 'check', onClick: (el, c) => {
                  const f = formData(el);
                  if (!f.invoiceNo || !f.customer || !f.plate) { toast('Müşteri, plaka ve fatura no zorunludur', 'danger'); return; }
                  const qty = Number(f.approvedKg) || s.weighbridgeKg;
                  store.change((d) => {
                    const t = d.shipments.find((x) => x.id === s.id);
                    t.customer = f.customer; t.plate = f.plate; t.invoiceNo = f.invoiceNo;
                    t.accountingApproved = true; t.accountBy = 'U11'; t.archived = true; t.status = 'Arşivlendi'; t.weighbridgeKg = qty;
                    const mid = t.kind === 'Mamul' ? 'M01' : t.materialId;
                    moveStock({ materialId: mid, quantity: -qty, type: 'Çıkış', source: 'Sevkiyat', ref: t.no, notes: `${f.customer} · ${f.invoiceNo} · ${f.plate}` });
                    addActivity(`${s.no} arşivlendi: ${fmtNum(qty)} kg stoktan düştü`, 'archive');
                    addNotification({ type: 'success', title: 'Sevkiyat tamamlandı', body: `${s.no} · ${f.invoiceNo} · ${fmtNum(qty)} kg`, source: 'Sevkiyat' });
                  });
                  c(); toast('İkinci onay tamamlandı, stok düşüldü ve arşivlendi'); refresh();
                } }
              ]
            });
          } }] : [])
        ]
      });
    }));
  }
};

/* ============================ ARŞİV ============================ */

export const archiveView = {
  title: 'Sevkiyat Arşivi',
  subtitle: 'Aylık bazda saklanan fatura, müşteri, kantar ve döküm kodu kayıtları',

  render() {
    const d = D();
    const items = d.shipments.filter((s) => s.archived);
    const months = [...new Set(items.map((s) => (s.date || '').slice(0, 7)))].sort().reverse();
    const groups = months.map((mo) => {
      const list = items.filter((s) => (s.date || '').startsWith(mo));
      const total = list.reduce((a, s) => a + Number(s.weighbridgeKg || 0), 0);
      const rows = list.map((s) => `<tr><td><span class="code">${esc(s.no)}</span></td><td>${fmtDate(s.date)}</td><td>${esc(s.customer)}</td><td>${esc(s.plate)}</td><td>${esc(s.invoiceNo)}</td><td>${esc(s.kind)}</td><td class="num">${fmtNum(s.weighbridgeKg)} kg</td><td>${(s.lotIds || []).map((x) => `<span class="order-chip">${esc(x)}</span>`).join(' ') || esc(matName(s.materialId))}</td></tr>`).join('');
      return `<div class="archive-month"><div class="archive-head"><div><h3>${icon('archive', 17)} ${esc(mo)}</h3><span>${list.length} sevkiyat · ${fmtNum(total)} kg</span></div>${pill('Arşiv', 'ok')}</div><div class="table-wrap"><table class="data compact"><thead><tr><th>Sevkiyat No</th><th>Tarih</th><th>Müşteri</th><th>Plaka</th><th>Fatura No</th><th>Tür</th><th class="num">Miktar</th><th>Döküm Kodu / Malzeme</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }).join('');
    return `
      <div class="info-banner">${icon('archive', 17)}<span>İki onay tamamlanmadan hiçbir kayıt arşive taşınmaz ve stoktan düşüm yapılmaz. Arşiv kayıtları geçmişe dönük sorgulanabilir.</span></div>
      <section class="card">
        <div class="toolbar"><span class="toolbar-spacer"></span><button class="btn btn-ghost" id="arc-export">${icon('download', 16)} CSV</button></div>
        ${groups || '<div class="muted pad">Arşivlenmiş sevkiyat yok.</div>'}
      </section>`;
  },

  mount(root) {
    root.querySelector('#arc-export').addEventListener('click', () => {
      csvExport('sevkiyat-arşivi.csv', ['Sevkiyat No', 'Tarih', 'Müşteri', 'Plaka', 'Fatura No', 'Tür', 'Miktar (kg)', 'Döküm Kodları'],
        D().shipments.filter((s) => s.archived).map((s) => [s.no, s.date, s.customer, s.plate, s.invoiceNo, s.kind, s.weighbridgeKg, s.lotIds.join(' ')]));
      toast('Arşiv CSV olarak indirildi');
    });
  }
};
