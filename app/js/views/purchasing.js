import { D, store, stockState, orderTotal, supplierName, matName, material, uid, nowISO, todayISO, addActivity, addNotification } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmtNum, fmtMoney, fmtDate, fmtDateTime, pill, dot, field, input, select, formData, modal, confirmDialog, toast, lineChart, sparkline, csvExport } from '../ui.js';
import { CATEGORY_ORDER } from '../seed.js';

let materialFilter = { q: '', cat: '' };
let orderFilter = 'Tümü';
let selectedPriceMaterial = 'H01';
let pricePeriod = 'Tümü';

const materialOptions = () => D().materials.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` }));
const supplierOptions = () => D().suppliers.map((s) => ({ value: s.id, label: s.name }));

/* ============================ MALZEME TANIMLARI ============================ */

export const materialsView = {
  title: 'Malzeme Tanımları',
  subtitle: 'Değişken malzeme kartları, kategoriler, birimler ve kritik stok eşikleri',

  render() {
    const d = D();
    const q = materialFilter.q.trim().toLocaleLowerCase('tr');
    const list = d.materials.filter((m) =>
      (!materialFilter.cat || m.category === materialFilter.cat) &&
      (!q || `${m.code} ${m.name} ${m.description}`.toLocaleLowerCase('tr').includes(q))
    );
    const rows = list.map((m) => {
      const st = stockState(m);
      return `<tr data-material="${esc(m.id)}" class="clickable">
        <td><span class="code">${esc(m.code)}</span></td>
        <td><div class="cell-strong">${esc(m.name)}</div><div class="cell-sub">${esc(m.description || '—')}</div></td>
        <td>${pill(m.category, m.category === 'Hammadde' ? 'indigo' : m.category === 'Sarf Malzeme' ? 'cyan' : m.category === 'Yan Ürün' ? 'warn' : m.category === 'Mamul' ? 'ok' : 'violet')}</td>
        <td>${esc(m.unit)}</td>
        <td class="num">${fmtNum(m.stock)}</td>
        <td class="num">${fmtNum(m.criticalMin)} / ${fmtNum(m.criticalMax)}</td>
        <td class="num">${fmtMoney(m.lastPrice, d.settings.currency)}</td>
        <td>${dot(st.color)}${pill(st.label, st.cls)}</td>
        <td class="row-actions"><button class="icon-btn" data-edit-material="${esc(m.id)}" title="Düzenle">${icon('edit', 16)}</button><button class="icon-btn danger" data-del-material="${esc(m.id)}" title="Sil">${icon('trash', 16)}</button></td>
      </tr>`;
    }).join('');

    return `
      <div class="stat-strip">
        <div><span>Toplam malzeme</span><strong>${d.materials.length}</strong></div>
        <div><span>Aktif kart</span><strong>${d.materials.filter((m) => m.active).length}</strong></div>
        <div><span>Kategori</span><strong>${d.categories.length}</strong></div>
        <div><span>Birim tanımı</span><strong>${d.units.length}</strong></div>
        <div><span>Kritik / uyarı</span><strong class="text-danger">${d.materials.filter((m) => ['critical', 'warn'].includes(stockState(m).key)).length}</strong></div>
      </div>

      <section class="card">
        <div class="toolbar">
          <div class="search-box">${icon('search', 16)}<input class="input" id="mat-q" placeholder="Malzeme kodu, adı veya açıklama ara…" value="${esc(materialFilter.q)}"></div>
          ${select('cat', [{ value: '', label: 'Tüm Kategoriler' }, ...CATEGORY_ORDER], materialFilter.cat, 'id="mat-cat"')}
          <button class="btn btn-ghost" id="mat-export">${icon('download', 16)} CSV</button>
          <button class="btn btn-primary" id="mat-new">${icon('plus', 16)} Yeni Malzeme</button>
        </div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Kod</th><th>Malzeme</th><th>Kategori</th><th>Birim</th><th class="num">Stok</th><th class="num">Kritik Alt / Üst</th><th class="num">Son Fiyat</th><th>Durum</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="9" class="muted pad">Eşleşen malzeme bulunamadı.</td></tr>`}</tbody>
        </table></div>
        <div class="table-foot">${list.length} kayıt gösteriliyor · Kartlar kullanıcı tanımlıdır, hiçbir malzeme sabit kodlanmamıştır.</div>
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    root.querySelector('#mat-q').addEventListener('input', (e) => {
      const pos = e.target.selectionStart ?? e.target.value.length;
      materialFilter.q = e.target.value;
      refresh();
      const inp = root.querySelector('#mat-q');
      if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); }
    });
    root.querySelector('#mat-cat').addEventListener('change', (e) => { materialFilter.cat = e.target.value; refresh(); });

    root.querySelector('#mat-export').addEventListener('click', () => {
      csvExport('malzeme-kartlari.csv', ['Kod', 'Malzeme', 'Kategori', 'Birim', 'Stok', 'Kritik Alt', 'Kritik Üst', 'Son Fiyat'],
        D().materials.map((m) => [m.code, m.name, m.category, m.unit, m.stock, m.criticalMin, m.criticalMax, m.lastPrice]));
      toast('Malzeme kartları CSV olarak indirildi');
    });

    const openForm = (id = null) => {
      const m = id ? material(id) : { id: '', code: '', name: '', category: 'Hammadde', unit: 'kg', criticalMin: 0, criticalMax: 0, stock: 0, lastPrice: 0, supplierId: '', description: '' };
      const body = `<div class="form-grid">
        ${field('Malzeme Kodu', input('code', m.code, { required: true, placeholder: 'H08' }))}
        ${field('Malzeme Adı', input('name', m.name, { required: true, placeholder: 'Örn. Silisyum' }))}
        ${field('Kategori', select('category', CATEGORY_ORDER, m.category))}
        ${field('Birim', select('unit', D().units, m.unit))}
        ${field('Kritik Alt Sınır', input('criticalMin', m.criticalMin, { type: 'number', min: 0, step: 1 }))}
        ${field('Kritik Üst Sınır', input('criticalMax', m.criticalMax, { type: 'number', min: 0, step: 1 }))}
        ${field('Mevcut Stok', input('stock', m.stock, { type: 'number', min: 0, step: 1 }))}
        ${field('Son Alış Fiyatı', input('lastPrice', m.lastPrice, { type: 'number', min: 0, step: 0.01 }))}
        ${field('Varsayılan Tedarikçi', select('supplierId', [{ value: '', label: 'Seçilmedi' }, ...supplierOptions()], m.supplierId || ''))}
        ${field('Aktif', `<label class="switch-line"><input type="checkbox" name="active" ${m.active !== false ? 'checked' : ''}><span>Kart kullanımda</span></label>`)}
      </div>${field('Açıklama', `<textarea class="input" name="description" rows="2" placeholder="Kullanım notu">${esc(m.description || '')}</textarea>`)}`;
      const mo = modal({
        title: id ? 'Malzeme Kartını Düzenle' : 'Yeni Malzeme Kartı',
        subtitle: 'Ad, birim, fiyat ve eşikler dilediğiniz zaman değiştirilebilir.',
        body, size: 'wide',
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: id ? 'Değişiklikleri Kaydet' : 'Kartı Oluştur', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            if (!f.code || !f.name) { toast('Kod ve ad zorunludur', 'danger'); return; }
            const rec = { id: id || f.code, code: f.code, name: f.name, category: f.category, unit: f.unit, criticalMin: Number(f.criticalMin), criticalMax: Number(f.criticalMax), stock: Number(f.stock), lastPrice: Number(f.lastPrice), supplierId: f.supplierId, active: f.active, description: f.description };
            store.change((d) => {
              if (id) { const i = d.materials.findIndex((x) => x.id === id); d.materials[i] = { ...d.materials[i], ...rec }; }
              else d.materials.push(rec);
              addActivity(`${rec.code} malzeme kartı ${id ? 'güncellendi' : 'oluşturuldu'}`, 'tag');
            });
            close(); toast(id ? 'Malzeme kartı güncellendi' : 'Yeni malzeme kartı oluşturuldu'); refresh();
          } }
        ]
      });
      return mo;
    };

    root.querySelector('#mat-new').addEventListener('click', () => openForm());
    root.querySelectorAll('[data-edit-material]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); openForm(b.dataset.editMaterial); }));
    root.querySelectorAll('[data-del-material]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.dataset.delMaterial;
      confirmDialog('Malzeme Kartını Sil', `${matName(id)} kartı silinecek. Geçmiş hareket kayıtları korunur. Devam edilsin mi?`, () => {
        store.change((d) => { d.materials = d.materials.filter((m) => m.id !== id); addActivity(`${id} malzeme kartı silindi`, 'trash'); });
        toast('Malzeme kartı silindi'); refresh();
      }, 'Sil');
    }));
    root.querySelectorAll('[data-material]').forEach((tr) => tr.addEventListener('click', () => {
      const m = material(tr.dataset.material); if (!m) return;
      const hist = D().priceHistory.filter((p) => p.materialId === m.id);
      const moves = D().movements.filter((x) => x.materialId === m.id).slice(0, 5);
      modal({
        title: `${m.code} · ${m.name}`, subtitle: `${m.category} · ${m.unit}`,
        body: `<div class="detail-grid">
          <div class="detail-item"><span>Mevcut Stok</span><strong>${fmtNum(m.stock)} ${esc(m.unit)}</strong></div>
          <div class="detail-item"><span>Kritik Alt / Üst</span><strong>${fmtNum(m.criticalMin)} / ${fmtNum(m.criticalMax)}</strong></div>
          <div class="detail-item"><span>Son Alış Fiyatı</span><strong>${fmtMoney(m.lastPrice)}</strong></div>
          <div class="detail-item"><span>Tedarikçi</span><strong>${esc(supplierName(m.supplierId))}</strong></div>
        </div>
        <p class="detail-desc">${esc(m.description || 'Açıklama girilmemiş.')}</p>
        <div class="detail-section"><h4>Fiyat Geçmişi</h4>${hist.length ? sparkline(hist.map((p) => p.unitPrice), '#4f46e5', 320, 46) : '<p class="muted">Fiyat kaydı yok</p>'}</div>
        <div class="detail-section"><h4>Son Stok Hareketleri</h4>${moves.map((x) => `<div class="mini-row"><span>${fmtDateTime(x.at)}</span><span>${esc(x.type)} · ${esc(x.source)}</span><strong class="${x.quantity < 0 ? 'text-danger' : 'text-ok'}">${x.quantity > 0 ? '+' : ''}${fmtNum(x.quantity)}</strong></div>`).join('') || '<p class="muted">Hareket yok</p>'}</div>`,
        actions: [{ label: 'Kapat', kind: 'primary', onClick: (_e, close) => close() }]
      });
    }));
  }
};

/* ============================ SATIN ALMA EMİRLERİ ============================ */

const ORDER_STATUS = ['Taslak', 'Onay Bekliyor', 'Onaylandı', 'Yolda', 'Mal Kabulde', 'Kısmen Tamamlandı', 'Tamamlandı', 'İptal'];

export const ordersView = {
  title: 'Satın Alma Emirleri',
  subtitle: 'Emir kalemleri, anlık alış fiyatı ve durum takibi',

  render() {
    const d = D();
    const list = d.purchaseOrders.filter((o) => orderFilter === 'Tümü' || o.status === orderFilter);
    const cards = list.map((o) => {
      const total = orderTotal(o);
      const stCls = o.status === 'Tamamlandı' ? 'ok' : o.status === 'Onay Bekliyor' ? 'warn' : o.status === 'İptal' ? 'danger' : 'info';
      return `<div class="order-card" data-order="${esc(o.id)}">
        <div class="order-top"><span class="order-no">${icon('cart', 16)} ${esc(o.no)}</span>${pill(o.status, stCls)}</div>
        <div class="order-supplier">${esc(supplierName(o.supplierId))}</div>
        <div class="order-meta"><span>${icon('calendar', 14)} ${fmtDate(o.date)}</span><span>${icon('box', 14)} ${o.items.length} kalem</span><span>${icon('clock', 14)} ${esc(o.paymentTerm)}</span></div>
        <div class="order-items">${o.items.slice(0, 3).map((i) => `<span class="order-chip">${esc(matName(i.materialId))} · ${fmtNum(i.quantity)} ${esc(i.unit)}</span>`).join('')}${o.items.length > 3 ? `<span class="order-chip">+${o.items.length - 3}</span>` : ''}</div>
        <div class="order-foot"><strong>${fmtMoney(total, d.settings.currency)}</strong><button class="btn btn-ghost btn-sm">Detay ${icon('chevron', 14)}</button></div>
      </div>`;
    }).join('');

    return `
      <div class="stat-strip">
        <div><span>Toplam emir</span><strong>${d.purchaseOrders.length}</strong></div>
        <div><span>Açık emir</span><strong>${d.purchaseOrders.filter((o) => !['Tamamlandı', 'İptal'].includes(o.status)).length}</strong></div>
        <div><span>Bu ay alış tutarı</span><strong>${fmtMoney(d.purchaseOrders.reduce((s, o) => s + orderTotal(o), 0), d.settings.currency)}</strong></div>
        <div><span>Fiyat kaydı</span><strong>${d.priceHistory.length}</strong></div>
      </div>
      <section class="card">
        <div class="toolbar">
          ${select('status', [{ value: 'Tümü', label: 'Tüm Durumlar' }, ...ORDER_STATUS], orderFilter, 'id="order-filter"')}
          <span class="toolbar-spacer"></span>
          <button class="btn btn-ghost" id="order-export">${icon('download', 16)} CSV</button>
          <button class="btn btn-primary" id="order-new">${icon('plus', 16)} Yeni Satın Alma Emri</button>
        </div>
        <div class="order-grid">${cards || '<div class="muted pad">Bu durumda emir yok.</div>'}</div>
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    root.querySelector('#order-filter').addEventListener('change', (e) => { orderFilter = e.target.value; refresh(); });
    root.querySelector('#order-export').addEventListener('click', () => {
      csvExport('satin-alma-emirleri.csv', ['Emir No', 'Tarih', 'Tedarikçi', 'Kalem', 'Miktar', 'Birim Fiyat', 'Toplam', 'Durum'],
        D().purchaseOrders.flatMap((o) => o.items.map((i) => [o.no, o.date, supplierName(o.supplierId), matName(i.materialId), i.quantity, i.unitPrice, Number(i.quantity) * Number(i.unitPrice), o.status])));
      toast('Emirler CSV olarak indirildi');
    });

    const newOrder = () => {
      const row = () => `<div class="po-row">${select('materialId', materialOptions())}${input('quantity', '', { type: 'number', min: 1, step: 1, placeholder: 'Miktar', required: true })}${input('unitPrice', '', { type: 'number', min: 0, step: 0.01, placeholder: 'Birim fiyat', required: true })}<button type="button" class="icon-btn danger po-remove" title="Kalemi sil">${icon('trash', 15)}</button></div>`;
      const mo = modal({
        title: 'Yeni Satın Alma Emri', subtitle: 'Her kalemde girdiğiniz güncel fiyat, fiyat geçmişine otomatik yazılır.',
        size: 'wide',
        body: `<div class="form-grid">
          ${field('Emir Numarası', input('no', `SA-${new Date().getFullYear()}-${String(D().purchaseOrders.length + 46).padStart(4, '0')}`, { required: true }))}
          ${field('Tarih', input('date', todayISO(), { type: 'date', required: true }))}
          ${field('Tedarikçi', select('supplierId', supplierOptions(), D().suppliers[0].id))}
          ${field('Ödeme Vadesi', select('paymentTerm', ['15 gün', '30 gün', '45 gün', '60 gün'], '30 gün'))}
        </div>
        <div class="detail-section"><h4>Emir Kalemleri</h4><div class="po-head"><span>Malzeme</span><span>Miktar</span><span>Birim Fiyat</span><span></span></div><div id="po-items">${row()}</div><button type="button" class="btn btn-ghost btn-sm" id="po-add">${icon('plus', 14)} Kalem Ekle</button></div>
        ${field('Not', `<textarea class="input" name="notes" rows="2" placeholder="İsteğe bağlı açıklama"></textarea>`)}`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Emri Oluştur', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            const items = Array.from(el.querySelectorAll('.po-row')).map((r) => {
              const rdata = formData(r);
              const m = material(rdata.materialId);
              return { materialId: rdata.materialId, quantity: Number(rdata.quantity), unit: m ? m.unit : 'kg', unitPrice: Number(rdata.unitPrice), receivedQty: 0 };
            }).filter((i) => i.quantity > 0 && i.unitPrice >= 0);
            if (!items.length) { toast('En az bir geçerli kalem girin', 'danger'); return; }
            const oid = uid('PO');
            store.change((d) => {
              d.purchaseOrders.unshift({ id: oid, no: f.no, date: f.date, supplierId: f.supplierId, status: 'Onay Bekliyor', paymentTerm: f.paymentTerm, notes: f.notes, createdBy: 'Siz', items });
              items.forEach((i) => {
                d.priceHistory.push({ id: uid('PH'), materialId: i.materialId, supplierId: f.supplierId, date: f.date, unitPrice: i.unitPrice, quantity: i.quantity, orderNo: f.no });
                const m = d.materials.find((x) => x.id === i.materialId); if (m) m.lastPrice = i.unitPrice;
              });
              addActivity(`${f.no} satın alma emri oluşturuldu (${items.length} kalem)`, 'cart');
              addNotification({ type: 'info', title: 'Onay bekleyen satın alma emri', body: `${f.no} emri onay kuyruğuna alındı.`, source: 'Satın Alma' });
            });
            close(); toast(`${f.no} emri oluşturuldu, fiyat geçmişi güncellendi`); refresh();
          } }
        ]
      });
      const add = () => mo.el.querySelector('#po-items').insertAdjacentHTML('beforeend', row());
      mo.el.querySelector('#po-add').addEventListener('click', add);
      mo.el.addEventListener('click', (e) => { const b = e.target.closest('.po-remove'); if (b) b.closest('.po-row').remove(); });
    };

    root.querySelector('#order-new').addEventListener('click', newOrder);
    root.querySelectorAll('[data-order]').forEach((card) => card.addEventListener('click', () => {
      const o = D().purchaseOrders.find((x) => x.id === card.dataset.order); if (!o) return;
      const rows = o.items.map((i) => `<tr><td>${esc(matName(i.materialId))}</td><td class="num">${fmtNum(i.quantity)} ${esc(i.unit)}</td><td class="num">${fmtMoney(i.unitPrice)}</td><td class="num">${fmtMoney(i.quantity * i.unitPrice)}</td><td class="num">${fmtNum(i.receivedQty)}</td></tr>`).join('');
      modal({
        title: o.no, subtitle: `${supplierName(o.supplierId)} · ${fmtDate(o.date)} · ${o.paymentTerm}`, size: 'wide',
        body: `<div class="detail-grid">
            <div class="detail-item"><span>Emir Tutarı</span><strong>${fmtMoney(orderTotal(o))}</strong></div>
            <div class="detail-item"><span>Durum</span><strong>${esc(o.status)}</strong></div>
            <div class="detail-item"><span>Oluşturan</span><strong>${esc(o.createdBy)}</strong></div>
            <div class="detail-item"><span>Kalem</span><strong>${o.items.length}</strong></div>
          </div>
          <div class="table-wrap"><table class="data compact"><thead><tr><th>Malzeme</th><th class="num">Miktar</th><th class="num">Birim Fiyat</th><th class="num">Toplam</th><th class="num">Gelen</th></tr></thead><tbody>${rows}</tbody></table></div>
          ${o.notes ? `<p class="detail-desc">${esc(o.notes)}</p>` : ''}
          <div class="detail-section">${field('Emir Durumu', select('newStatus', ORDER_STATUS, o.status, 'id="order-status"'))}</div>`,
        actions: [
          { label: 'Kapat', onClick: (_e, close) => close() },
          { label: 'Durumu Güncelle', kind: 'primary', icon: 'save', onClick: (el, close) => {
            const v = el.querySelector('#order-status').value;
            store.change((d) => { const t = d.purchaseOrders.find((x) => x.id === o.id); t.status = v; addActivity(`${o.no} durumu "${v}" olarak güncellendi`, 'cart'); });
            close(); toast('Emir durumu güncellendi'); refresh();
          } }
        ]
      });
    }));
  }
};

/* ============================ FİYAT TAKİBİ ============================ */

export const pricesView = {
  title: 'Fiyat Takibi & Grafikler',
  subtitle: 'Tarihsel alış fiyatları, değişim grafiği ve tedarikçi karşılaştırması',

  render() {
    const d = D();
    let hist = d.priceHistory.filter((p) => p.materialId === selectedPriceMaterial).sort((a, b) => a.date.localeCompare(b.date));
    if (pricePeriod === 'Son 3 Ay') hist = hist.filter((p) => p.date >= '2026-08-01');
    if (pricePeriod === 'Son 6 Ay') hist = hist.filter((p) => p.date >= '2026-05-01');
    const vals = hist.map((p) => p.unitPrice);
    const min = vals.length ? Math.min(...vals) : 0, max = vals.length ? Math.max(...vals) : 0;
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const last = vals.length ? vals[vals.length - 1] : 0;
    const prev = vals.length > 1 ? vals[vals.length - 2] : last;
    const change = prev ? ((last - prev) / prev) * 100 : 0;
    const otherSuppliers = [...new Set(d.priceHistory.filter((p) => p.materialId === selectedPriceMaterial).map((p) => p.supplierId))].filter((s) => s !== (hist[0]?.supplierId));
    const compare = otherSuppliers.length ? otherSuppliers[0] : null;
    const series = [{ name: 'Alış Fiyatı', color: '#4f46e5', values: vals }];
    const labels = hist.map((p) => fmtDate(p.date).slice(0, 5));
    if (compare && hist.length) {
      series.push({ name: supplierName(compare), color: '#06b6d4', values: hist.map((p) => p.supplierId === compare ? p.unitPrice : null) });
    }
    const changePct = (a, b) => b ? `${a >= b ? '▲ +' : '▼ '}${fmtNum(((a - b) / b) * 100, 1)}%` : '—';
    const rows = [...hist].reverse().map((p, i, arr) => {
      const earlier = arr[i + 1];
      return `<tr><td>${fmtDate(p.date)}</td><td>${esc(supplierName(p.supplierId))}</td><td class="num">${fmtNum(p.quantity)} kg</td><td class="num">${fmtMoney(p.unitPrice)}</td><td class="num ${p.unitPrice >= (earlier?.unitPrice ?? p.unitPrice) ? 'text-ok' : 'text-danger'}">${earlier ? changePct(p.unitPrice, earlier.unitPrice) : '—'}</td><td><span class="code">${esc(p.orderNo)}</span></td></tr>`;
    }).join('');

    return `
      <section class="card">
        <div class="toolbar">
          ${select('material', materialOptions(), selectedPriceMaterial, 'id="price-material"')}
          ${select('period', ['Tümü', 'Son 6 Ay', 'Son 3 Ay'], pricePeriod, 'id="price-period"')}
          <span class="toolbar-spacer"></span>
          <button class="btn btn-ghost" id="price-export">${icon('download', 16)} CSV</button>
        </div>
        <div class="price-summary">
          <div><span>Ortalama</span><strong>${fmtMoney(avg)}</strong></div>
          <div><span>En düşük</span><strong>${fmtMoney(min)}</strong></div>
          <div><span>En yüksek</span><strong>${fmtMoney(max)}</strong></div>
          <div><span>Son alış</span><strong>${fmtMoney(last)}</strong></div>
          <div><span>Değişim</span><strong class="${change >= 0 ? 'text-ok' : 'text-danger'}">${change >= 0 ? '▲ +' : '▼ '}${fmtNum(change, 1)}%</strong></div>
        </div>
        <div class="chart-large">${lineChart({ series, labels, unit: '₺', decimals: 2, height: 280 })}</div>
      </section>
      <section class="card">
        <div class="card-head"><div><h3>Fiyat Geçmişi</h3><p>${esc(matName(selectedPriceMaterial))} · ${hist.length} alış kaydı</p></div><span class="card-tag">${icon('trend', 14)} Tarihsel</span></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Tarih</th><th>Tedarikçi</th><th class="num">Miktar</th><th class="num">Birim Fiyat</th><th class="num">Değişim</th><th>Emir No</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" class="muted pad">Bu dönemde fiyat kaydı yok.</td></tr>'}</tbody>
        </table></div>
      </section>`;
  },

  mount(root) {
    root.querySelector('#price-material').addEventListener('change', (e) => { selectedPriceMaterial = e.target.value; window.App.refresh(); });
    root.querySelector('#price-period').addEventListener('change', (e) => { pricePeriod = e.target.value; window.App.refresh(); });
    root.querySelector('#price-export').addEventListener('click', () => {
      csvExport('fiyat-gecmisi.csv', ['Tarih', 'Tedarikçi', 'Malzeme', 'Miktar', 'Birim Fiyat', 'Emir No'],
        D().priceHistory.map((p) => [p.date, supplierName(p.supplierId), matName(p.materialId), p.quantity, p.unitPrice, p.orderNo]));
      toast('Fiyat geçmişi CSV olarak indirildi');
    });
  }
};

/* ============================ TEDARİKÇİLER ============================ */

export const suppliersView = {
  title: 'Tedarikçiler',
  subtitle: 'Firma kartları, iletişim bilgileri ve geçmiş alışlar',

  render() {
    const rows = D().suppliers.map((s) => `<tr class="clickable" data-supplier="${esc(s.id)}">
      <td><span class="code">${esc(s.code)}</span></td>
      <td><div class="cell-strong">${esc(s.name)}</div><div class="cell-sub">${esc(s.contact)}</div></td>
      <td>${pill(s.category, 'neutral')}</td><td>${esc(s.phone)}</td><td>${esc(s.email)}</td>
      <td>${fmtDate(s.lastPurchase)}</td><td>${pill(s.active ? 'Aktif' : 'Pasif', s.active ? 'ok' : 'neutral')}</td>
      <td class="row-actions"><button class="icon-btn" data-edit-supplier="${esc(s.id)}">${icon('edit', 16)}</button></td>
    </tr>`).join('');
    return `
      <section class="card">
        <div class="toolbar"><span class="toolbar-spacer"></span><button class="btn btn-primary" id="sup-new">${icon('plus', 16)} Yeni Tedarikçi</button></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Kod</th><th>Firma / Yetkili</th><th>Kategori</th><th>Telefon</th><th>E-posta</th><th>Son Alış</th><th>Durum</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    const open = (id = null) => {
      const s = id ? D().suppliers.find((x) => x.id === id) : { code: '', name: '', category: 'Hammadde', contact: '', phone: '', email: '', tax: '', address: '' };
      modal({
        title: id ? 'Tedarikçiyi Düzenle' : 'Yeni Tedarikçi', size: 'wide',
        body: `<div class="form-grid">
          ${field('Kod', input('code', s.code, { required: true }))}${field('Firma Adı', input('name', s.name, { required: true }))}
          ${field('Kategori', select('category', ['Hammadde', 'Sarf / Yardımcı', 'Yardımcı', 'Yan Ürün'], s.category))}${field('İletişim Kişisi', input('contact', s.contact))}
          ${field('Telefon', input('phone', s.phone))}${field('E-posta', input('email', s.email, { type: 'email' }))}
          ${field('Vergi No', input('tax', s.tax))}${field('Adres', input('address', s.address))}
        </div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Kaydet', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            store.change((d) => {
              if (id) { const t = d.suppliers.find((x) => x.id === id); Object.assign(t, f); }
              else d.suppliers.push({ id: uid('T'), ...f, lastPurchase: todayISO(), active: true });
              addActivity(`Tedarikçi kartı kaydedildi: ${f.name}`, 'users');
            });
            close(); toast('Tedarikçi kartı kaydedildi'); refresh();
          } }
        ]
      });
    };
    root.querySelector('#sup-new').addEventListener('click', () => open());
    root.querySelectorAll('[data-edit-supplier]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); open(b.dataset.editSupplier); }));
    root.querySelectorAll('[data-supplier]').forEach((tr) => tr.addEventListener('click', () => {
      const s = D().suppliers.find((x) => x.id === tr.dataset.supplier);
      const hist = D().priceHistory.filter((p) => p.supplierId === s.id);
      modal({ title: s.name, subtitle: `${s.category} · ${s.contact}`, body: `<div class="detail-grid">
        <div class="detail-item"><span>Telefon</span><strong>${esc(s.phone)}</strong></div><div class="detail-item"><span>E-posta</span><strong>${esc(s.email)}</strong></div>
        <div class="detail-item"><span>Vergi No</span><strong>${esc(s.tax)}</strong></div><div class="detail-item"><span>Adres</span><strong>${esc(s.address)}</strong></div></div>
        <div class="detail-section"><h4>Geçmiş Alışlar (${hist.length})</h4>${hist.slice(0, 6).map((p) => `<div class="mini-row"><span>${fmtDate(p.date)}</span><span>${esc(matName(p.materialId))}</span><strong>${fmtMoney(p.unitPrice)}</strong></div>`).join('') || '<p class="muted">Kayıt yok</p>'}</div>`,
        actions: [{ label: 'Kapat', kind: 'primary', onClick: (_e, close) => close() }] });
    }));
  }
};
