import { D, store, stockState, material, matName, supplierName, order, uid, todayISO, moveStock, addActivity, addNotification } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmtNum, fmtMoney, fmtDate, fmtDateTime, pill, dot, progress, field, input, select, formData, modal, toast, sparkline, csvExport, emptyState } from '../ui.js';
import { CATEGORY_ORDER } from '../seed.js';

let stockCat = '';
let moveType = 'Tümü';
let moveMaterial = '';

/* ============================ STOK DURUMU ============================ */

export const stockView = {
  title: 'Stok Durumu',
  subtitle: 'Anlık bakiyeler, kritik seviye renk kodlaması ve malzeme detayları',

  render() {
    const d = D();
    const counts = { critical: 0, warn: 0, ok: 0, over: 0 };
    d.materials.forEach((m) => counts[stockState(m).key]++);
    const todayIn = d.movements.filter((m) => (m.at || '').startsWith('2026-11-02') && m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
    const todayOut = d.movements.filter((m) => (m.at || '').startsWith('2026-11-02') && m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0);

    const groups = CATEGORY_ORDER.filter((c) => !stockCat || c === stockCat).map((cat) => {
      const items = d.materials.filter((m) => m.category === cat);
      const rows = items.map((m) => {
        const st = stockState(m);
        const max = Math.max(Number(m.criticalMax) || 1, Number(m.stock) || 1);
        return `<tr class="clickable" data-stock="${esc(m.id)}">
          <td><span class="code">${esc(m.code)}</span></td>
          <td><div class="cell-strong">${esc(m.name)}</div><div class="cell-sub">${esc(m.description || '')}</div></td>
          <td class="num"><strong style="color:${st.color}">${fmtNum(m.stock)}</strong> <small class="muted">${esc(m.unit)}</small></td>
          <td class="num muted">${fmtNum(m.criticalMin)} / ${fmtNum(m.criticalMax)}</td>
          <td class="bar-cell">${progress(m.stock, max, st.color)}</td>
          <td>${dot(st.color)}${pill(st.label, st.cls)}</td>
          <td class="num">${fmtMoney(m.lastPrice, d.settings.currency)}</td>
        </tr>`;
      }).join('');
      return `<div class="stock-group"><div class="stock-group-head">${icon(cat === 'Hammadde' ? 'box' : cat === 'Sarf Malzeme' ? 'layers' : cat === 'Yan Ürün' ? 'recycle' : 'sliders', 16)}<span>${esc(cat)}</span><small>${items.length} malzeme</small></div>
        <div class="table-wrap"><table class="data compact"><thead><tr><th>Kod</th><th>Malzeme</th><th class="num">Mevcut Stok</th><th class="num">Alt / Üst</th><th>Seviye</th><th>Durum</th><th class="num">Son Fiyat</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }).join('');

    const criticalList = d.materials.filter((m) => ['critical', 'warn'].includes(stockState(m).key)).map((m) => {
      const st = stockState(m);
      return `<div class="alert-row ${st.cls}"><span class="alert-ico">${icon('alert', 17)}</span><div><strong>${esc(m.name)}</strong><span>${fmtNum(m.stock)} ${esc(m.unit)} · kritik alt ${fmtNum(m.criticalMin)} ${esc(m.unit)}</span></div>${pill(st.label, st.cls)}</div>`;
    }).join('');

    return `
      <div class="stat-strip">
        <div><span>Toplam malzeme</span><strong>${d.materials.length}</strong></div>
        <div><span>Kritik</span><strong class="text-danger">${counts.critical}</strong></div>
        <div><span>Uyarı</span><strong class="text-warn">${counts.warn}</strong></div>
        <div><span>Bugünkü giriş</span><strong class="text-ok">+${fmtNum(todayIn)} kg</strong></div>
        <div><span>Bugünkü çıkış</span><strong class="text-danger">-${fmtNum(todayOut)} kg</strong></div>
      </div>

      ${criticalList ? `<section class="card alert-card"><div class="card-head"><div><h3>Kritik Stok Uyarıları</h3><p>Kritik alt sınıra inen veya yaklaşan malzemeler</p></div><button class="btn btn-ghost btn-sm" data-nav="orders">${icon('cart', 14)} Satın Alma Talebi</button></div><div class="alert-list">${criticalList}</div></section>` : ''}

      <section class="card">
        <div class="toolbar">
          ${select('cat', [{ value: '', label: 'Tüm Kategoriler' }, ...CATEGORY_ORDER], stockCat, 'id="stock-cat"')}
          <span class="toolbar-spacer"></span>
          <button class="btn btn-ghost" id="stock-adjust">${icon('sliders', 16)} Stok Düzeltmesi</button>
          <button class="btn btn-ghost" id="stock-export">${icon('download', 16)} CSV</button>
        </div>
        <div class="legend-row"><span>${dot('#16a34a')} Normal</span><span>${dot('#f59e0b')} Alt sınıra yakın</span><span>${dot('#ef4444')} Kritik</span><span>${dot('#3b82f6')} Aşırı stok</span></div>
        ${groups}
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    root.querySelector('#stock-cat').addEventListener('change', (e) => { stockCat = e.target.value; refresh(); });
    root.querySelector('#stock-export').addEventListener('click', () => {
      csvExport('stok-durumu.csv', ['Kod', 'Malzeme', 'Kategori', 'Stok', 'Birim', 'Kritik Alt', 'Kritik Üst', 'Durum'],
        D().materials.map((m) => [m.code, m.name, m.category, m.stock, m.unit, m.criticalMin, m.criticalMax, stockState(m).label]));
      toast('Stok durumu CSV olarak indirildi');
    });
    root.querySelector('#stock-adjust').addEventListener('click', () => {
      modal({
        title: 'Yetkili Stok Düzeltmesi', subtitle: 'Her düzeltme ayrı bir hareket kaydı olarak loglanır.',
        body: `<div class="form-grid">
          ${field('Malzeme', select('materialId', D().materials.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }))))}
          ${field('Miktar (+/-)', input('quantity', '', { type: 'number', step: 1, placeholder: 'Örn. -50', required: true }))}
        </div>${field('Neden (zorunlu)', `<textarea class="input" name="notes" rows="2" placeholder="Sayım farkı, tartı düzeltmesi…"></textarea>`)}`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Düzeltmeyi Uygula', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            if (!Number(f.quantity) || !String(f.notes).trim()) { toast('Miktar ve neden zorunludur', 'danger'); return; }
            store.change((d) => { moveStock({ materialId: f.materialId, quantity: Number(f.quantity), type: 'Düzeltme', source: 'Yetkili Düzeltme', notes: f.notes }); addActivity(`${matName(f.materialId)} için stok düzeltmesi: ${f.quantity}`, 'sliders'); });
            close(); toast('Stok düzeltmesi kaydedildi'); refresh();
          } }
        ]
      });
    });
    root.querySelectorAll('[data-stock]').forEach((tr) => tr.addEventListener('click', () => {
      const m = material(tr.dataset.stock); if (!m) return;
      const moves = D().movements.filter((x) => x.materialId === m.id).slice(0, 6);
      const st = stockState(m);
      modal({
        title: `${m.code} · ${m.name}`, subtitle: `${m.category} · ${m.unit}`,
        body: `<div class="detail-grid">
          <div class="detail-item"><span>Mevcut Stok</span><strong style="color:${st.color}">${fmtNum(m.stock)} ${esc(m.unit)}</strong></div>
          <div class="detail-item"><span>Kritik Alt</span><strong>${fmtNum(m.criticalMin)}</strong></div>
          <div class="detail-item"><span>Kritik Üst</span><strong>${fmtNum(m.criticalMax)}</strong></div>
          <div class="detail-item"><span>Son Alış Fiyatı</span><strong>${fmtMoney(m.lastPrice)}</strong></div>
        </div>
        <div class="detail-section"><h4>Son 30 Gün Stok Eğrisi</h4>${sparkline([m.criticalMax * 0.8, m.criticalMin * 1.4, m.criticalMin * 1.1, m.stock * 1.2, m.stock], st.color, 420, 60)}</div>
        <div class="detail-section"><h4>Son Hareketler</h4>${moves.map((x) => `<div class="mini-row"><span>${fmtDateTime(x.at)}</span><span>${esc(x.type)} · ${esc(x.source)}</span><strong class="${x.quantity < 0 ? 'text-danger' : 'text-ok'}">${x.quantity > 0 ? '+' : ''}${fmtNum(x.quantity)}</strong></div>`).join('') || '<p class="muted">Hareket yok</p>'}</div>`,
        actions: [{ label: 'Kapat', kind: 'primary', onClick: (_e, close) => close() }]
      });
    }));
  }
};

/* ============================ MAL KABUL ============================ */

export const receiptsView = {
  title: 'Mal Kabul',
  subtitle: 'Satın alma emrinden gelen malın tartımı, kabul / red ve stok girişi',

  render() {
    const d = D();
    const rows = d.receipts.map((r) => `<tr class="clickable" data-receipt="${esc(r.id)}">
      <td><span class="code">${esc(r.no)}</span></td><td>${fmtDate(r.date)}</td>
      <td>${esc(supplierName(r.supplierId))}</td><td>${esc(order(r.orderId)?.no || '—')}</td>
      <td class="num">${fmtNum(r.items.reduce((s, i) => s + Number(i.acceptedQty || 0), 0))} kg</td>
      <td>${esc(r.weighbridgeNo)}</td><td>${esc(r.plate)}</td>
      <td>${r.toCrusher ? pill('Kırıcıya sevk', 'warn') : pill('Doğrudan stok', 'info')}</td>
      <td>${pill(r.status, r.status === 'Tamamlandı' ? 'ok' : 'warn')}</td>
    </tr>`).join('');
    return `
      <div class="info-banner">${icon('activity', 17)}<span><strong>Akış:</strong> Satın alma emri → tartım / mal kabul → kabul edilen net miktar stoğa eklenir → hurda işaretliyse kırıcı kaydı bekler. Kabul + red = gelen miktar doğrulaması sistem tarafından yapılır.</span></div>
      <section class="card">
        <div class="toolbar"><span class="toolbar-spacer"></span><button class="btn btn-primary" id="rec-new">${icon('plus', 16)} Yeni Mal Kabul</button></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Kabul No</th><th>Tarih</th><th>Tedarikçi</th><th>Emir No</th><th class="num">Kabul Edilen</th><th>Tartı Fişi</th><th>Plaka</th><th>Yönlendirme</th><th>Durum</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    root.querySelector('#rec-new').addEventListener('click', () => {
      const open = D().purchaseOrders.filter((o) => !['Tamamlandı', 'İptal'].includes(o.status));
      if (!open.length) { toast('Açık satın alma emri bulunamadı', 'danger'); return; }
      const renderItems = (poId) => {
        const po = order(poId);
        return po.items.map((i) => `<div class="rec-row" data-material="${esc(i.materialId)}">
          <div><strong>${esc(matName(i.materialId))}</strong><span>Sipariş: ${fmtNum(i.quantity)} ${esc(i.unit)}</span></div>
          ${input('received', i.quantity, { type: 'number', min: 0, step: 1 })}
          ${input('rejected', 0, { type: 'number', min: 0, step: 1 })}
          <span class="rec-net">${fmtNum(i.quantity)}</span>
        </div>`).join('');
      };
      const mo = modal({
        title: 'Yeni Mal Kabul', subtitle: 'Emri seçin; gelen ve red miktarlarını girin. Net kabul otomatik hesaplanır.', size: 'wide',
        body: `<div class="form-grid">
          ${field('Satın Alma Emri', select('orderId', open.map((o) => ({ value: o.id, label: `${o.no} · ${supplierName(o.supplierId)}` })), open[0].id, 'id="rec-po"'))}
          ${field('Tarih', input('date', todayISO(), { type: 'date' }))}
          ${field('Tartı Fişi No', input('weighbridgeNo', `TF-${new Date().getFullYear()}-${String(D().receipts.length + 413).padStart(4, '0')}`))}
          ${field('Araç Plakası', input('plate', ''))}
          ${field('Teslim Alan', input('receivedBy', 'Ahmet Yılmaz'))}
          ${field('Hurda kırıcıya sevk edilecek', `<label class="switch-line"><input type="checkbox" name="toCrusher"><span>Evet, kırıcı kaydı oluşturulsun</span></label>`)}
        </div>
        <div class="detail-section"><h4>Kabul Kalemleri</h4><div class="rec-head"><span>Malzeme</span><span>Gelen</span><span>Red / Fire</span><span>Net Kabul</span></div><div id="rec-items">${renderItems(open[0].id)}</div></div>
        ${field('Not', `<textarea class="input" name="notes" rows="2" placeholder="Nem oranı, hasar, iade notu…"></textarea>`)}`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Kabul Et & Stoğa İşle', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            const items = Array.from(el.querySelectorAll('.rec-row')).map((r) => {
              const rd = formData(r);
              const received = Number(rd.received) || 0, rejected = Number(rd.rejected) || 0;
              return { materialId: r.dataset.material, orderedQty: order(f.orderId).items.find((x) => x.materialId === r.dataset.material).quantity, receivedQty: received, acceptedQty: received - rejected, rejectedQty: rejected };
            });
            if (items.some((i) => i.acceptedQty < 0)) { toast('Red miktarı gelen miktarı aşamaz', 'danger'); return; }
            const po = order(f.orderId);
            store.change((d) => {
              const rid = uid('RC');
              d.receipts.unshift({ id: rid, no: `MK-${new Date().getFullYear()}-${String(d.receipts.length + 46).padStart(4, '0')}`, date: f.date, orderId: f.orderId, supplierId: po.supplierId, plate: f.plate, weighbridgeNo: f.weighbridgeNo, receivedBy: f.receivedBy, toCrusher: f.toCrusher, status: f.toCrusher ? 'Kırıcıda' : 'Tamamlandı', notes: f.notes, items });
              items.forEach((i) => {
                moveStock({ materialId: i.materialId, quantity: i.acceptedQty, type: 'Giriş', source: 'Mal Kabul', ref: d.receipts[0].no, notes: f.notes });
              });
              po.status = 'Mal Kabulde';
              addActivity(`${d.receipts[0].no} mal kabulü: ${items.reduce((s, i) => s + i.acceptedQty, 0)} kg stoğa girdi`, 'clipboard');
              addNotification({ type: 'success', title: 'Mal kabul tamamlandı', body: `${d.receipts[0].no} · ${po.no} emrinden ${items.length} kalem stoğa işlendi.`, source: 'Mal Kabul' });
            });
            close(); toast('Mal kabul tamamlandı, stok güncellendi'); refresh();
          } }
        ]
      });
      const recalc = () => mo.el.querySelectorAll('.rec-row').forEach((r) => {
        const rd = formData(r);
        const net = (Number(rd.received) || 0) - (Number(rd.rejected) || 0);
        r.querySelector('.rec-net').textContent = fmtNum(net);
      });
      mo.el.addEventListener('input', (e) => { if (e.target.closest('.rec-row')) recalc(); });
      mo.el.querySelector('#rec-po').addEventListener('change', (e) => { mo.el.querySelector('#rec-items').innerHTML = renderItems(e.target.value); recalc(); });
    });
    root.querySelectorAll('[data-receipt]').forEach((tr) => tr.addEventListener('click', () => {
      const r = D().receipts.find((x) => x.id === tr.dataset.receipt); if (!r) return;
      modal({
        title: r.no, subtitle: `${supplierName(r.supplierId)} · ${fmtDate(r.date)} · ${r.weighbridgeNo}`, size: 'wide',
        body: `<div class="detail-grid"><div class="detail-item"><span>Emir</span><strong>${esc(order(r.orderId)?.no || '—')}</strong></div><div class="detail-item"><span>Plaka</span><strong>${esc(r.plate)}</strong></div><div class="detail-item"><span>Teslim Alan</span><strong>${esc(r.receivedBy)}</strong></div><div class="detail-item"><span>Yönlendirme</span><strong>${r.toCrusher ? 'Kırıcıya sevk' : 'Doğrudan stok'}</strong></div></div>
        <div class="table-wrap"><table class="data compact"><thead><tr><th>Malzeme</th><th class="num">Sipariş</th><th class="num">Gelen</th><th class="num">Red</th><th class="num">Kabul</th></tr></thead><tbody>${r.items.map((i) => `<tr><td>${esc(matName(i.materialId))}</td><td class="num">${fmtNum(i.orderedQty)}</td><td class="num">${fmtNum(i.receivedQty)}</td><td class="num">${fmtNum(i.rejectedQty)}</td><td class="num text-ok">${fmtNum(i.acceptedQty)}</td></tr>`).join('')}</tbody></table></div>
        ${r.notes ? `<p class="detail-desc">${esc(r.notes)}</p>` : ''}`,
        actions: [{ label: 'Kapat', kind: 'primary', onClick: (_e, close) => close() }]
      });
    }));
  }
};

/* ============================ KIRICI & FİRE ============================ */

export const crusherView = {
  title: 'Kırıcı & Fire İşlemleri',
  subtitle: 'Brüt giriş, ayıklanan fire, net çıkış ve fire oranı takibi',

  render() {
    const d = D();
    const avg = d.crusher.length ? d.crusher.reduce((s, c) => s + c.wasteRatio, 0) / d.crusher.length : 0;
    const rows = d.crusher.map((c) => `<tr class="clickable" data-crusher="${esc(c.id)}">
      <td>${fmtDate(c.date)}</td><td><div class="cell-strong">${esc(matName(c.materialId))}</div><div class="cell-sub">${esc(c.unit)}</div></td>
      <td class="num">${fmtNum(c.gross)} kg</td><td class="num text-danger">${fmtNum(c.waste)} kg</td><td class="num text-ok">${fmtNum(c.net)} kg</td>
      <td class="num">${pill(`%${fmtNum(c.wasteRatio, 2)}`, c.wasteRatio >= d.settings.wasteThreshold ? 'danger' : c.wasteRatio >= 8 ? 'warn' : 'ok')}</td>
      <td>${esc(c.wasteReason)}</td><td>${esc(c.wasteDestination)}</td><td>${esc(c.operator)}</td>
    </tr>`).join('');
    return `
      <div class="stat-strip">
        <div><span>İşlem kaydı</span><strong>${d.crusher.length}</strong></div>
        <div><span>Ortalama fire</span><strong>%${fmtNum(avg, 2)}</strong></div>
        <div><span>Uyarı eşiği</span><strong>%${d.settings.wasteThreshold}</strong></div>
        <div><span>Son işlem fire</span><strong class="text-warn">${fmtNum(d.crusher[0]?.waste || 0)} kg</strong></div>
      </div>
      <div class="info-banner">${icon('recycle', 17)}<span><strong>Örnek:</strong> 10 ton hurda geldi, kırıcıda 700 kg fire ayrıldı → net 9,3 ton hammadde stoğu, 700 kg yan ürün stoğu. Giren malzemenin tamamının muhasebesi bu ekranda kapanır.</span></div>
      <section class="card">
        <div class="toolbar"><span class="toolbar-spacer"></span><button class="btn btn-primary" id="cr-new">${icon('plus', 16)} Yeni Kırıcı Kaydı</button></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Tarih</th><th>Malzeme / Birim</th><th class="num">Brüt Giriş</th><th class="num">Fire</th><th class="num">Net Çıkış</th><th class="num">Oran</th><th>Fire Nedeni</th><th>Gittiği Yer</th><th>Operatör</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    root.querySelector('#cr-new').addEventListener('click', () => {
      const mo = modal({
        title: 'Yeni Kırıcı / Fire Kaydı', subtitle: 'Net çıkış ve fire oranı otomatik hesaplanır.', size: 'wide',
        body: `<div class="form-grid">
          ${field('Tarih', input('date', todayISO(), { type: 'date' }))}
          ${field('İşlem Birimi', select('unit', ['Kırıcı', 'Ayıklama', 'Manyetik Ayırıcı', 'Eleme'], 'Kırıcı'))}
          ${field('Malzeme', select('materialId', D().materials.filter((m) => m.category === 'Hammadde').map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }))))}
          ${field('Kaynak Mal Kabul', select('sourceReceiptId', D().receipts.map((r) => ({ value: r.id, label: r.no }))))}
          ${field('Brüt Giriş (kg)', input('gross', 10000, { type: 'number', min: 1, step: 1 }))}
          ${field('Fire Miktarı (kg)', input('waste', 700, { type: 'number', min: 0, step: 1 }))}
          ${field('Fire Nedeni', select('wasteReason', ['Nemli malzeme', 'Yabancı madde', 'Paslı malzeme', 'Plastik karışık', 'Diğer'], 'Nemli malzeme'))}
          ${field('Firenin Gittiği Yer', select('wasteDestination', ['Hurda sahası', 'Geri dönüşüm', 'Çöp / Atık', 'Yan ürün stoku'], 'Hurda sahası'))}
          ${field('Operatör', input('operator', 'Mehmet Kaya'))}
        </div>
        <div class="calc-box"><div><span>Net Çıkış</span><strong id="cr-net">9.300 kg</strong></div><div><span>Fire Oranı</span><strong id="cr-ratio">%7,00</strong></div></div>
        ${field('Not', `<textarea class="input" name="notes" rows="2" placeholder="İşlem notu"></textarea>`)}`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Kaydet & Stok Güncelle', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            const gross = Number(f.gross), waste = Number(f.waste);
            if (gross <= 0 || waste < 0 || waste > gross) { toast('Brüt ve fire miktarlarını kontrol edin', 'danger'); return; }
            const net = gross - waste, ratio = (waste / gross) * 100;
            store.change((d) => {
              const cid = uid('CR');
              d.crusher.unshift({ id: cid, date: f.date, materialId: f.materialId, unit: f.unit, sourceReceiptId: f.sourceReceiptId, gross, waste, net, wasteRatio: Number(ratio.toFixed(2)), wasteReason: f.wasteReason, wasteDestination: f.wasteDestination, operator: f.operator, notes: f.notes });
              moveStock({ materialId: f.materialId, quantity: -waste, type: 'Fire', source: f.unit, ref: cid, notes: f.wasteReason });
              const by = d.materials.find((m) => m.name === 'Kırıcı Firesi');
              if (by) moveStock({ materialId: by.id, quantity: waste, type: 'Yan Ürün', source: f.unit, ref: cid, notes: 'Ayıklanan fire yan ürün stoğuna girdi' });
              addActivity(`Kırıcı kaydı: ${fmtNum(gross)} kg → ${fmtNum(net)} kg net (fire %${fmtNum(ratio, 2)})`, 'recycle');
              if (ratio >= d.settings.wasteThreshold) addNotification({ type: 'warning', title: 'Fire oranı eşiği aşıldı', body: `${f.unit} işleminde fire oranı %${fmtNum(ratio, 2)} (eşik %${d.settings.wasteThreshold}).`, source: 'Kırıcı', channel: 'sms', to: d.settings.smsNumbers.split(',')[0].trim(), subject: 'Fire oranı uyarısı' });
            });
            close(); toast('Kırıcı kaydı işlendi, stok ve yan ürün güncellendi'); refresh();
          } }
        ]
      });
      const calc = () => {
        const f = formData(mo.el.querySelector('.modal'));
        const g = Number(f.gross) || 0, w = Number(f.waste) || 0;
        mo.el.querySelector('#cr-net').textContent = `${fmtNum(g - w)} kg`;
        mo.el.querySelector('#cr-ratio').textContent = `%${fmtNum(g ? (w / g) * 100 : 0, 2)}`;
      };
      mo.el.addEventListener('input', (e) => { if (['gross', 'waste'].includes(e.target.name)) calc(); });
      calc();
    });
    root.querySelectorAll('[data-crusher]').forEach((tr) => tr.addEventListener('click', () => {
      const c = D().crusher.find((x) => x.id === tr.dataset.crusher); if (!c) return;
      modal({ title: 'Kırıcı İşlem Detayı', subtitle: `${fmtDate(c.date)} · ${c.unit}`, body: `<div class="detail-grid">
        <div class="detail-item"><span>Brüt Giriş</span><strong>${fmtNum(c.gross)} kg</strong></div>
        <div class="detail-item"><span>Fire</span><strong class="text-danger">${fmtNum(c.waste)} kg</strong></div>
        <div class="detail-item"><span>Net Çıkış</span><strong class="text-ok">${fmtNum(c.net)} kg</strong></div>
        <div class="detail-item"><span>Fire Oranı</span><strong>%${fmtNum(c.wasteRatio, 2)}</strong></div>
        <div class="detail-item"><span>Neden</span><strong>${esc(c.wasteReason)}</strong></div>
        <div class="detail-item"><span>Gittiği Yer</span><strong>${esc(c.wasteDestination)}</strong></div></div>
        ${c.notes ? `<p class="detail-desc">${esc(c.notes)}</p>` : ''}`,
        actions: [{ label: 'Kapat', kind: 'primary', onClick: (_e, close) => close() }] });
    }));
  }
};

/* ============================ STOK HAREKETLERİ ============================ */

export const movementsView = {
  title: 'Stok Hareketleri',
  subtitle: 'Giriş, çıkış, fire, yan ürün, transfer ve düzeltme kayıtları (kronolojik log)',

  render() {
    const d = D();
    const list = d.movements.filter((m) =>
      (moveType === 'Tümü' || m.type === moveType) && (!moveMaterial || m.materialId === moveMaterial)
    );
    const typeCls = { 'Giriş': 'ok', 'Çıkış': 'danger', 'Fire': 'warn', 'Yan Ürün': 'cyan', 'Transfer': 'info', 'Düzeltme': 'violet' };
    const rows = list.map((m) => `<tr>
      <td>${fmtDateTime(m.at)}</td><td>${pill(m.type, typeCls[m.type] || 'neutral')}</td>
      <td><div class="cell-strong">${esc(matName(m.materialId))}</div><div class="cell-sub">${esc(m.materialId)}</div></td>
      <td class="num ${m.quantity < 0 ? 'text-danger' : 'text-ok'}"><strong>${m.quantity > 0 ? '+' : ''}${fmtNum(m.quantity)}</strong></td>
      <td>${esc(m.source)}</td><td><span class="code">${esc(m.ref || '—')}</span></td>
      <td class="num">${fmtNum(m.remaining)}</td><td>${esc(m.userId)}</td><td class="muted">${esc(m.notes || '—')}</td>
    </tr>`).join('');
    return `
      <section class="card">
        <div class="toolbar">
          ${select('type', ['Tümü', 'Giriş', 'Çıkış', 'Fire', 'Yan Ürün', 'Transfer', 'Düzeltme'], moveType, 'id="mv-type"')}
          ${select('material', [{ value: '', label: 'Tüm Malzemeler' }, ...d.materials.map((m) => ({ value: m.id, label: m.name }))], moveMaterial, 'id="mv-material"')}
          <span class="toolbar-spacer"></span>
          <button class="btn btn-ghost" id="mv-export">${icon('download', 16)} CSV</button>
        </div>
        <div class="table-wrap"><table class="data compact">
          <thead><tr><th>Tarih / Saat</th><th>Tür</th><th>Malzeme</th><th class="num">Miktar</th><th>Kaynak</th><th>Referans</th><th class="num">Kalan Stok</th><th>Kullanıcı</th><th>Not</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="9" class="muted pad">Eşleşen hareket yok.</td></tr>`}</tbody>
        </table></div>
        <div class="table-foot">${list.length} hareket kaydı · Stok bakiyesi yalnızca bu kayıtlardan türetilir.</div>
      </section>`;
  },

  mount(root) {
    root.querySelector('#mv-type').addEventListener('change', (e) => { moveType = e.target.value; window.App.refresh(); });
    root.querySelector('#mv-material').addEventListener('change', (e) => { moveMaterial = e.target.value; window.App.refresh(); });
    root.querySelector('#mv-export').addEventListener('click', () => {
      csvExport('stok-hareketleri.csv', ['Tarih', 'Tür', 'Malzeme', 'Miktar', 'Kaynak', 'Referans', 'Kalan', 'Kullanıcı', 'Not'],
        D().movements.map((m) => [m.at, m.type, matName(m.materialId), m.quantity, m.source, m.ref, m.remaining, m.userId, m.notes]));
      toast('Stok hareketleri CSV olarak indirildi');
    });
  }
};
