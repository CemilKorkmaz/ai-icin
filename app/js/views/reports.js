import { D, store, matName, addActivity, addNotification } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmtNum, fmtMoney, pill, dot, progress, barChart, lineChart, select, toast, csvExport, printPage } from '../ui.js';

let period = 'Aylık';

const SERIES = {
  'Günlük': { labels: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00'], values: [8.4, 12.1, 10.6, 14.2, 9.8, 11.4, 7.2] },
  'Haftalık': { labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'], values: [58.2, 62.4, 60.1, 47.9, 64.1, 52.6, 44.8] },
  'Aylık': { labels: ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'], values: [232.4, 248.6, 261.2, 219.8] },
  'Yıllık': { labels: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki'], values: [780, 812, 846, 821, 902, 878, 910, 886, 934, 962] }
};

export const reportsView = {
  title: 'Raporlar & İstatistik',
  subtitle: 'Üretim, tüketim, fire ve giren-çıkan karşılaştırması · anlık görünümler ve çıktılar',

  render() {
    const d = D();
    const s = SERIES[period];
    const total = s.values.reduce((a, b) => a + b, 0);
    const produced = d.lots.reduce((a, l) => a + Number(l.weightTon || 0), 0);
    const entered = d.movements.filter((m) => m.quantity > 0 && m.type === 'Giriş').reduce((a, m) => a + m.quantity, 0);
    const consumed = d.movements.filter((m) => m.quantity < 0 && ['Çıkış', 'Fire'].includes(m.type)).reduce((a, m) => a + Math.abs(m.quantity), 0);
    const byProduct = d.materials.filter((m) => m.category === 'Yan Ürün').reduce((a, m) => a + Number(m.stock || 0), 0);
    const waste = d.crusher.reduce((a, c) => a + c.waste, 0);
    const efficiency = entered > 0 ? Math.min(99.9, (produced * 1000 / entered) * 100) : 0;

    const catRows = ['Hammadde', 'Sarf Malzeme', 'Yardımcı Malzeme'].map((cat) => {
      const ids = d.materials.filter((m) => m.category === cat).map((m) => m.id);
      const v = d.movements.filter((m) => ids.includes(m.materialId) && m.quantity < 0 && m.type === 'Çıkış').reduce((a, m) => a + Math.abs(m.quantity), 0);
      return { cat, v };
    });
    const maxCat = Math.max(...catRows.map((c) => c.v), 1);

    const reportRows = [
      { name: 'Günlük Üretim Raporu', desc: 'Döküm tonajı, fire, duruşlar', kind: 'Günlük', ico: 'chart' },
      { name: 'Haftalık Durum Raporu', desc: 'Ocak verimliliği ve sarf tüketimi', kind: 'Haftalık', ico: 'calendar' },
      { name: 'Aylık Sarfiyat Raporu', desc: 'Hammadde, gaz, enerji ve fire', kind: 'Aylık', ico: 'database' },
      { name: 'Giren-Çıkan Karşılaştırması', desc: 'Verimlilik ve kayıp analizi', kind: 'Aylık', ico: 'trend' },
      { name: 'Yıllık Üretim Özeti', desc: 'Alaşım ve dönem bazlı üretim', kind: 'Yıllık', ico: 'archive' }
    ];

    return `
      <div class="stat-strip">
        <div><span>${esc(period)} üretim</span><strong>${fmtNum(total, 1)} ton</strong></div>
        <div><span>Aktif parti tonajı</span><strong>${fmtNum(produced, 1)} ton</strong></div>
        <div><span>Giren hammadde</span><strong>${fmtNum(entered / 1000, 1)} ton</strong></div>
        <div><span>Yan ürün stoku</span><strong>${fmtNum(byProduct / 1000, 1)} ton</strong></div>
        <div><span>Kırıcı firesi</span><strong class="text-warn">${fmtNum(waste)} kg</strong></div>
      </div>

      <section class="card">
        <div class="toolbar">
          <div class="segmented">${['Günlük', 'Haftalık', 'Aylık', 'Yıllık'].map((p) => `<button class="${p === period ? 'active' : ''}" data-period="${p}">${p}</button>`).join('')}</div>
          <span class="toolbar-spacer"></span>
          <button class="btn btn-ghost" id="rep-mail">${icon('mail', 16)} Raporu Maille</button>
          <button class="btn btn-ghost" id="rep-csv">${icon('download', 16)} CSV</button>
          <button class="btn btn-primary" id="rep-print">${icon('printer', 16)} Yazdır / PDF</button>
        </div>
        <div class="card-head"><div><h3>Üretim Eğrisi</h3><p>${esc(period)} bazında döküm tonajı</p></div><span class="card-tag">${icon('trend', 14)} ${fmtNum(total, 1)} ton</span></div>
        ${barChart({ labels: s.labels, values: s.values, color: '#4f46e5', unit: 'ton', height: 250 })}
      </section>

      <div class="grid-2">
        <section class="card">
          <div class="card-head"><div><h3>Malzeme Tüketimi</h3><p>Dönem bazında stok çıkışları</p></div></div>
          <div class="cons-bars">${catRows.map((c, i) => `<div class="cons-bar-row"><span>${esc(c.cat)}</span>${progress(c.v, maxCat, ['#4f46e5', '#06b6d4', '#8b5cf6'][i])}<strong>${fmtNum(c.v)} kg</strong></div>`).join('')}</div>
          <div class="card-divider"></div>
          <div class="mini-grid">
            <div><span>Doğalgaz</span><strong>${fmtNum(2840)} m³</strong></div>
            <div><span>Argon</span><strong>${fmtNum(6)} tüp</strong></div>
            <div><span>Testere yağı</span><strong>${fmtNum(24)} litre</strong></div>
            <div><span>Seramik filtre</span><strong>${fmtNum(38)} adet</strong></div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h3>Giren – Çıkan Karşılaştırması</h3><p>Üretimin genel verimliliği</p></div><span class="card-tag">${icon('gauge', 14)} %${fmtNum(efficiency, 1)}</span></div>
          <div class="flow-compare">
            <div class="flow-item"><span class="flow-ico in">${icon('download', 18)}</span><div><span>Giren hammadde</span><strong>${fmtNum(entered / 1000, 1)} ton</strong></div></div>
            <div class="flow-item"><span class="flow-ico out">${icon('package', 18)}</span><div><span>Üretilen mamul</span><strong>${fmtNum(produced, 1)} ton</strong></div></div>
            <div class="flow-item"><span class="flow-ico by">${icon('recycle', 18)}</span><div><span>Yan ürün / fire</span><strong>${fmtNum(byProduct / 1000, 1)} ton</strong></div></div>
          </div>
          <div class="detail-section"><h4>Verim Göstergesi</h4>${progress(efficiency, 100, efficiency > 85 ? '#16a34a' : '#f59e0b')}<p class="micro">Giren ile çıkan arasındaki fark fire ve kayıp olarak analiz edilir. Yolluk/filtre artığı döngüsel olduğu için ayrı stokta tutulur ve bu hesabı bozmaz.</p></div>
        </section>
      </div>

      <section class="card">
        <div class="card-head"><div><h3>Hazır Raporlar</h3><p>Zamanlanmış dönemsel raporlar ve anlık çıktılar</p></div><span class="card-tag">${icon('clock', 14)} Otomatik</span></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Rapor</th><th>Açıklama</th><th>Periyot</th><th>Mail Kuyruğu</th><th></th></tr></thead>
          <tbody>${reportRows.map((r, i) => `<tr>
            <td><div class="cell-strong">${icon(r.ico, 15)} ${esc(r.name)}</div></td><td class="muted">${esc(r.desc)}</td>
            <td>${pill(r.kind, 'neutral')}</td>
            <td>${pill(d.settings.online ? 'Gönderime hazır' : 'Kuyrukta', d.settings.online ? 'ok' : 'warn')}</td>
            <td class="row-actions"><button class="btn btn-ghost btn-sm" data-report-json="${i}">${icon('download', 14)} Çıktı</button></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => { period = b.dataset.period; window.App.refresh(); }));
    root.querySelector('#rep-csv').addEventListener('click', () => {
      const s = SERIES[period];
      csvExport(`uretim-raporu-${period.toLocaleLowerCase('tr')}.csv`, ['Dönem', 'Üretim (ton)'], s.labels.map((l, i) => [l, s.values[i]]));
      toast('Rapor CSV olarak indirildi');
    });
    root.querySelector('#rep-print').addEventListener('click', () => { toast('Yazdırma penceresi açılıyor', 'info'); setTimeout(printPage, 120); });
    root.querySelector('#rep-mail').addEventListener('click', () => {
      const s = SERIES[period];
      store.change((d) => {
        addNotification({ type: 'info', title: `${period} rapor maili`, body: `Üretim ${fmtNum(s.values.reduce((a, b) => a + b, 0), 1)} ton · dönem raporu`, source: 'Zamanlanmış Rapor', channel: 'email', to: d.settings.reportMail, subject: `${period} Üretim Raporu` });
        addActivity(`${period} üretim raporu ${d.settings.online ? 'mail olarak gönderildi' : 'giden kutuya alındı'}`, 'mail');
      });
      toast(D().settings.online ? 'Rapor maili gönderildi' : 'İnternet yok: rapor maili kuyruğa alındı', D().settings.online ? 'success' : 'info');
      window.App.refresh();
    });
    root.querySelectorAll('[data-report-json]').forEach((b) => b.addEventListener('click', () => {
      const s = SERIES[period];
      csvExport(`erp-rapor-${period.toLocaleLowerCase('tr')}.csv`, ['Dönem', 'Üretim (ton)', 'Giriş (kg)', 'Çıkış (kg)', 'Fire (kg)'],
        s.labels.map((l, i) => [l, s.values[i], 0, 0, 0]));
      toast('Rapor çıktısı hazırlandı');
    }));
  }
};
