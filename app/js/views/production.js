import { D, store, material, matName, furnace, recipe, lot, uid, nowISO, moveStock, addActivity, addNotification, billetTonnage } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmtNum, fmtDateTime, fmtDate, pill, dot, field, input, select, formData, modal, confirmDialog, toast, progress } from '../ui.js';
import { STAGES } from '../seed.js';

let recipeTab = 'Ergitme';
let collapsed = {};

const stageMeta = {
  'Ergitme': { ico: 'flame', color: '#f97316' },
  'Döküm': { ico: 'layers', color: '#4f46e5' },
  'Testere': { ico: 'scissors', color: '#06b6d4' },
  'Homojenizasyon': { ico: 'gauge', color: '#8b5cf6' },
  'Soğutma': { ico: 'clock', color: '#0ea5e9' },
  'Paketleme': { ico: 'package', color: '#14b8a6' },
  'Mamul Stok': { ico: 'warehouse', color: '#16a34a' },
  'Sevkiyat': { ico: 'truck', color: '#64748b' }
};

function elapsedMin(iso) {
  const t = new Date(iso).getTime();
  return Math.max(0, Math.round((new Date('2026-11-02T15:00:00+03:00').getTime() - t) / 60000));
}

function lotCard(l) {
  const meta = stageMeta[l.stage] || { ico: 'box', color: '#4f46e5' };
  const elapsed = elapsedMin(l.stageStartedAt || l.startedAt);
  const alert = l.alerts && l.alerts.length;
  return `<article class="lot-card ${alert ? 'has-alert' : ''}" data-lot="${esc(l.id)}" style="--stage:${meta.color}">
    <div class="lot-top"><span class="lot-code">${esc(l.code)}</span>${alert ? `<span class="lot-alert">${icon('alert', 13)}</span>` : ''}</div>
    <div class="lot-alloy">${esc(l.alloy)} <span>· Ø${l.diameterMm} mm</span></div>
    <div class="lot-nums"><span>${icon('package', 13)} ${fmtNum(l.weightTon, 1)} t</span><span>${icon('box', 13)} ${fmtNum(l.billetCount)} biyet</span></div>
    <div class="lot-foot"><span class="lot-time">${icon('clock', 13)} ${elapsed} dk</span>${pill(l.status, l.status === 'Süre Aşımı' ? 'danger' : l.status === 'Sevke Hazır' ? 'ok' : 'info')}</div>
  </article>`;
}

/* ============================ ÜRETİM AKIŞI (KANBAN) ============================ */

export const productionView = {
  title: 'Üretim Akışı',
  subtitle: 'Döküm kodu bazlı aşama takibi · sürükle-bırak kartlar fare ve dokunmatik ile çalışır',

  render() {
    const d = D();
    const active = d.lots.filter((l) => !['Mamul Stok', 'Sevkiyat'].includes(l.stage));
    const alarms = d.lots.filter((l) => l.alerts && l.alerts.length).length;
    const totalTon = d.lots.reduce((s, l) => s + Number(l.weightTon || 0), 0);
    const columns = STAGES.map((st) => {
      const items = d.lots.filter((l) => l.stage === st);
      const meta = stageMeta[st];
      return `<div class="kanban-col" data-stage="${esc(st)}" style="--stage:${meta.color}">
        <div class="kanban-head"><span class="kanban-ico">${icon(meta.ico, 15)}</span><strong>${esc(st)}</strong><span class="kanban-count">${items.length}</span></div>
        <div class="kanban-body">${items.map(lotCard).join('') || `<div class="kanban-empty">Kart yok</div>`}</div>
      </div>`;
    }).join('');

    return `
      <div class="stat-strip">
        <div><span>Aktif döküm kodu</span><strong>${active.length}</strong></div>
        <div><span>Toplam tonaj</span><strong>${fmtNum(totalTon, 1)} t</strong></div>
        <div><span>Ocak</span><strong>${d.furnaces.length}</strong></div>
        <div><span>Aktif alarm</span><strong class="text-danger">${alarms}</strong></div>
        <div><span>Aşama</span><strong>${STAGES.length}</strong></div>
      </div>
      <div class="info-banner">${icon('activity', 17)}<span><strong>Sürükle-bırak:</strong> Kartı tutup hedef aşama sütununa bırakın; dokunmatik ekranda parmakla da çalışır. Karta dokunmak döküm detayını, reçete uyarılarını, fire ve tüketim girişlerini açar.</span></div>
      <section class="card">
        <div class="toolbar">
          <button class="btn btn-primary" id="lot-new">${icon('plus', 16)} Yeni Döküm Başlat</button>
          <span class="toolbar-spacer"></span>
          <span class="muted small">${icon('cpu', 15)} PLC telemetrisi: Ocak 1 · 752 °C · eşik içinde</span>
          <button class="btn btn-ghost btn-sm" data-nav="recipes">${icon('sliders', 14)} Reçeteler</button>
        </div>
        <div class="kanban" id="kanban">${columns}</div>
      </section>`;
  },

  mount(root) {
    /* --- Yeni döküm --- */
    root.querySelector('#lot-new').addEventListener('click', () => {
      const ergitme = D().recipes.filter((r) => r.type === 'Ergitme');
      modal({
        title: 'Yeni Döküm Başlat', subtitle: 'Sistem benzersiz bir döküm kodu üretir ve sayaç başlar.', size: 'wide',
        body: `<div class="form-grid">
          ${field('Ocak', select('furnaceId', D().furnaces.filter((f) => !f.rotary).map((f) => ({ value: f.id, label: `${f.name} · ${f.capacityTon} ton` }))))}
          ${field('Alaşım Reçetesi', select('recipeId', ergitme.map((r) => ({ value: r.id, label: r.name }))))}
          ${field('Biyet Çapı (mm)', input('diameterMm', 178, { type: 'number', min: 50, step: 1 }))}
          ${field('Biyet Boyu (m)', input('lengthM', 6, { type: 'number', min: 0.5, step: 0.1 }))}
          ${field('Şarj Tonajı', input('weightTon', 20, { type: 'number', min: 1, step: 0.1 }))}
          ${field('Operatör', input('operator', 'Hasan Çelik'))}
        </div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Start · Döküm Kodu Oluştur', kind: 'primary', icon: 'play', onClick: (el, close) => {
            const f = formData(el);
            const r = recipe(f.recipeId);
            const code = `DK-${new Date().getFullYear()}-${String(D().lots.length + 139).padStart(4, '0')}`;
            store.change((d) => {
              d.lots.unshift({ id: code, code, alloy: r ? r.alloy : '6063', diameterMm: Number(f.diameterMm), lengthM: Number(f.lengthM), billetCount: 0, weightTon: Number(f.weightTon), furnaceId: f.furnaceId, recipeId: f.recipeId, stage: 'Ergitme', status: 'Devam ediyor', startedAt: nowISO(), stageStartedAt: nowISO(), paused: false, scrapTon: 0, remainingMetalTon: null, remainingDecision: null, alerts: [], history: [{ stage: 'Ergitme', at: nowISO() }] });
              addActivity(`${code} dökümü başlatıldı (${furnace(f.furnaceId)?.name || ''}, ${f.weightTon} t)`, 'play');
              addNotification({ type: 'info', title: 'Yeni döküm başlatıldı', body: `${code} · ${r?.name || ''} · sayaç çalışıyor.`, source: 'Ergitme' });
            });
            close(); toast(`${code} döküm kodu oluşturuldu`); window.App.refresh();
          } }
        ]
      });
    });

    /* --- Pointer tabanlı sürükle-bırak (fare + dokunmatik) --- */
    const kanban = root.querySelector('#kanban');
    let drag = null;

    const cleanup = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (drag?.ghost) drag.ghost.remove();
      kanban.querySelectorAll('.drop-target').forEach((c) => c.classList.remove('drop-target'));
      if (drag?.card) drag.card.classList.remove('dragging');
      drag = null;
    };

    const onMove = (e) => {
      if (!drag) return;
      if (!drag.active) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
        drag.active = true;
        const r = drag.card.getBoundingClientRect();
        drag.offsetX = drag.x - r.left; drag.offsetY = drag.y - r.top;
        const ghost = drag.card.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.width = r.width + 'px';
        document.body.appendChild(ghost);
        drag.ghost = ghost;
        drag.card.classList.add('dragging');
      }
      e.preventDefault();
      drag.ghost.style.left = `${e.clientX - drag.offsetX}px`;
      drag.ghost.style.top = `${e.clientY - drag.offsetY}px`;
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const col = under && under.closest('.kanban-col');
      kanban.querySelectorAll('.drop-target').forEach((c) => c.classList.remove('drop-target'));
      if (col && col.dataset.stage !== drag.stage) col.classList.add('drop-target');
      drag.target = col ? col.dataset.stage : null;
    };

    const onUp = (e) => {
      if (!drag) return;
      const { id, active, target, stage } = drag;
      cleanup();
      if (active && target && target !== stage) moveLot(id, target);
      else if (!active) openLot(id);
    };

    kanban.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.lot-card');
      if (!card || e.target.closest('button')) return;
      drag = { id: card.dataset.lot, card, x: e.clientX, y: e.clientY, active: false, stage: card.closest('.kanban-col').dataset.stage };
      document.addEventListener('pointermove', onMove, { passive: false });
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });

    /* --- Döküm detayı --- */
    function openLot(id) {
      const l = lot(id); if (!l) return;
      const r = recipe(l.recipeId);
      const f = furnace(l.furnaceId);
      const elapsed = elapsedMin(l.stageStartedAt || l.startedAt);
      const recipeItems = r ? r.items.map((it) => {
        const suggested = Number((it.perTon * l.weightTon).toFixed(1));
        return `<div class="cons-row" data-mat="${esc(it.materialId)}" data-suggested="${suggested}"><span>${esc(it.label || matName(it.materialId))}</span><span>${fmtNum(suggested)} ${esc(it.unit)} önerilir</span><strong>${fmtNum(material(it.materialId)?.stock || 0)} ${esc(it.unit)} stokta</strong></div>`;
      }).join('') : '<p class="muted">Reçete seçilmemiş</p>';
      const timeline = l.history.map((h, i) => `<div class="tl-row ${i === l.history.length - 1 ? 'active' : ''}"><span class="tl-dot">${icon('check', 11)}</span><div><strong>${esc(h.stage)}</strong><span>${fmtDateTime(h.at)}</span></div></div>`).join('');
      const alerts = (l.alerts || []).map((a) => `<div class="alert-row warn"><span class="alert-ico">${icon('alert', 16)}</span><div><strong>${esc(a)}</strong><span>Operatör duraklatmadıysa yöneticiye bildirim gönderilir</span></div></div>`).join('');

      const mo = modal({
        title: l.code, subtitle: `${l.alloy} · Ø${l.diameterMm} mm · ${fmtNum(l.weightTon, 1)} ton · ${f?.name || '—'}`, size: 'wide',
        body: `<div class="detail-grid">
            <div class="detail-item"><span>Aşama</span><strong style="color:${stageMeta[l.stage].color}">${esc(l.stage)}</strong></div>
            <div class="detail-item"><span>Geçen Süre</span><strong>${elapsed} dk ${l.paused ? '(duraklatıldı)' : ''}</strong></div>
            <div class="detail-item"><span>Biyet</span><strong>${fmtNum(l.billetCount)} adet</strong></div>
            <div class="detail-item"><span>Fire</span><strong>${fmtNum(l.scrapTon, 2)} ton</strong></div>
          </div>
          ${alerts ? `<div class="detail-section"><h4>Uyarılar</h4>${alerts}</div>` : ''}
          <div class="detail-section"><h4>Reçete Önerisi / Gerçekleşen Tüketim</h4><p class="micro">Sistem önerir, operatör sahadaki gerçek miktarı girip onaylar; stok gerçekleşen miktar kadar düşer.</p>
            ${recipeItems}
            <div class="cons-form">${select('consumptionMaterial', r ? r.items.map((it) => ({ value: it.materialId, label: it.label || matName(it.materialId) })) : [], '')}${input('actualQty', '', { type: 'number', min: 0, step: 0.1, placeholder: 'Gerçekleşen miktar' })}<button type="button" class="btn btn-ghost btn-sm" id="cons-save">${icon('check', 14)} Onayla & Stoktan Düş</button></div>
          </div>
          <div class="detail-section"><h4>Fire / Yan Ürün Ekle</h4><div class="cons-form">
            ${select('byProduct', D().materials.filter((m) => m.category === 'Yan Ürün').map((m) => ({ value: m.id, label: m.name })), 'B05')}
            ${input('byQty', '', { type: 'number', min: 0, step: 1, placeholder: 'Miktar (kg)' })}
            <button type="button" class="btn btn-ghost btn-sm" id="by-save">${icon('plus', 14)} Yan Ürünü Stoğa Ekle</button></div></div>
          <div class="detail-section"><h4>Döküm Sonrası Kalan Metal</h4>${field('Karar', select('remainingDecision', ['', 'Ocakta bırakıldı', 'Başka ocağa aktarıldı', 'Boş dökülüp hammadde olarak saklandı'], l.remainingDecision || '', 'id="remaining-decision"'))}<p class="micro">Seçim kaydedildiğinde ilgili stok hareketi otomatik oluşur.</p></div>
          <div class="detail-section"><h4>Aşama Geçmişi</h4><div class="timeline">${timeline}</div></div>`,
        actions: [
          { label: 'Kapat', onClick: (_e, close) => close() },
          { label: l.paused ? 'Devam Et' : 'Duraklat', icon: l.paused ? 'play' : 'pause', onClick: (_e, close) => {
            store.change((d) => { const t = d.lots.find((x) => x.id === id); t.paused = !t.paused; addActivity(`${id} ${t.paused ? 'duraklatıldı' : 'devam ettirildi'}`, 'clock'); });
            close(); toast('Süreç durumu güncellendi'); window.App.refresh();
          } },
          { label: 'Sonraki Aşamaya Taşı', kind: 'primary', icon: 'arrow', onClick: (el, close) => {
            const dec = el.querySelector('#remaining-decision').value;
            if (dec) store.change((d) => { const t = d.lots.find((x) => x.id === id); t.remainingDecision = dec; });
            const i = STAGES.indexOf(l.stage);
            close();
            if (i < STAGES.length - 1) moveLot(id, STAGES[i + 1]); else toast('Son aşamadasınız', 'info');
          } }
        ]
      });

      mo.el.querySelector('#cons-save').addEventListener('click', () => {
        const f2 = formData(mo.el.querySelector('.modal'));
        const mid = f2.consumptionMaterial, qty = Number(f2.actualQty);
        if (!mid || qty <= 0) { toast('Malzeme ve gerçekleşen miktar gerekli', 'danger'); return; }
        store.change((d) => {
          moveStock({ materialId: mid, quantity: -qty, type: 'Çıkış', source: `${l.stage} / ${l.code}`, ref: l.code, notes: 'Operatör onaylı gerçekleşen tüketim' });
          addActivity(`${l.code}: ${matName(mid)} ${fmtNum(qty)} kg gerçekleşen tüketim ile stoktan düştü`, 'flame');
        });
        toast(`${matName(mid)} ${fmtNum(qty)} kg stoktan düşüldü`); mo.close(); window.App.refresh();
      });
      mo.el.querySelector('#by-save').addEventListener('click', () => {
        const f2 = formData(mo.el.querySelector('.modal'));
        const mid = f2.byProduct, qty = Number(f2.byQty);
        if (!mid || qty <= 0) { toast('Yan ürün ve miktar gerekli', 'danger'); return; }
        store.change((d) => {
          moveStock({ materialId: mid, quantity: qty, type: 'Yan Ürün', source: `${l.stage} / ${l.code}`, ref: l.code, notes: 'Fire / yan ürün girişi' });
          const t = d.lots.find((x) => x.id === id); t.scrapTon = Number((t.scrapTon + qty / 1000).toFixed(3));
          addActivity(`${l.code}: ${fmtNum(qty)} kg ${matName(mid)} yan ürün stoğuna eklendi`, 'recycle');
        });
        toast('Yan ürün stoğa eklendi'); mo.close(); window.App.refresh();
      });
    }

    /* --- Aşama taşıma & otomatik stok kuralları --- */
    function moveLot(id, target) {
      const l = lot(id); if (!l) return;
      const prev = l.stage;
      const idx = STAGES.indexOf(prev), tidx = STAGES.indexOf(target);
      if (tidx !== idx + 1 && tidx < idx) {
        // Geriye / ileriye sıçrama: yine de izin ver, ama uyarı üret
        addNotification({ type: 'warning', title: 'Aşama atlaması', body: `${l.code} ${prev} → ${target} sıçraması yapıldı.`, source: 'Üretim' });
      }
      store.change((d) => {
        const t = d.lots.find((x) => x.id === id);
        t.stage = target; t.stageStartedAt = nowISO(); t.paused = false;
        t.status = target === 'Mamul Stok' ? 'Sevke Hazır' : 'Devam ediyor';
        t.history.push({ stage: target, at: nowISO() });

        if (target === 'Döküm') {
          const rc = d.recipes.find((r) => r.type === 'Döküm');
          if (rc) rc.items.forEach((it) => {
            const qty = Number((it.perTon * t.weightTon).toFixed(1));
            if (it.materialId === 'B04') moveStock({ materialId: it.materialId, quantity: qty, type: 'Yan Ürün', source: 'Döküm', ref: t.code, notes: 'Yolluk / filtre artığı (döngüsel fire)' });
            else moveStock({ materialId: it.materialId, quantity: -qty, type: 'Çıkış', source: 'Döküm reçetesi', ref: t.code, notes: 'Sarf malzeme otomatik düşümü' });
          });
        }
        if (target === 'Testere') {
          const oil = Math.max(1, Math.round((t.billetCount || 40) * 0.1));
          const talas = Number(billetTonnage(t.billetCount || 40, 0.003, t.diameterMm, d.settings.density).toFixed(0));
          const kafa = Math.max(20, Math.round(talas * 0.8));
          moveStock({ materialId: 'Y01', quantity: -oil, type: 'Çıkış', source: 'Testere', ref: t.code, notes: 'Kesim sayısına göre tahmini yağ' });
          moveStock({ materialId: 'B02', quantity: talas, type: 'Yan Ürün', source: 'Testere', ref: t.code, notes: '3 mm bıçak talaşı' });
          moveStock({ materialId: 'B03', quantity: kafa, type: 'Yan Ürün', source: 'Testere', ref: t.code, notes: 'Kafa kesimleri' });
        }
        if (target === 'Homojenizasyon') {
          const rc = d.recipes.find((r) => r.type === 'Homojenizasyon' && Number(r.diameterMm) === Number(t.diameterMm));
          if (rc) moveStock({ materialId: 'Y05', quantity: -Math.round(rc.items[0].perTon * t.weightTon), type: 'Çıkış', source: 'Homojenizasyon', ref: t.code, notes: 'Tahmini gaz tüketimi' });
        }
        if (target === 'Mamul Stok' && !t.billetCount) {
          t.billetCount = Math.max(1, Math.round((t.weightTon * 1000) / (Math.PI * Math.pow(t.diameterMm / 2000, 2) * t.lengthM * d.settings.density)));
        }
        if (target === 'Mamul Stok') {
          moveStock({ materialId: 'M01', quantity: t.weightTon * 1000, type: 'Giriş', source: 'Paketleme', ref: t.code, notes: 'Mamul biyet sevke hazır stoka girdi' });
        }
        if (t.remainingDecision === 'Boş dökülüp hammadde olarak saklandı' && t.remainingMetalTon) {
          moveStock({ materialId: 'H01', quantity: t.remainingMetalTon * 1000, type: 'Transfer', source: 'Kalan metal', ref: t.code, notes: 'Boş dökülen metal hammaddeye' });
          t.remainingMetalTon = 0;
        }
        addActivity(`${t.code}: ${prev} → ${target}`, 'arrow');

        const elapsed = elapsedMin(l.stageStartedAt || l.startedAt);
        const rc2 = d.recipes.find((r) => r.type === 'Homojenizasyon' && Number(r.diameterMm) === Number(t.diameterMm));
        if ((target === 'Homojenizasyon' || target === 'Testere') && elapsed > (rc2?.durationMin || 300) && !l.paused) {
          t.status = 'Süre Aşımı'; t.alerts.push(`${target} süresi aşıldı (${elapsed} dk)`);
          addNotification({ type: 'danger', title: 'Proses süre aşımı', body: `${t.code} ${target} beklenen süreyi aştı. Arıza / anomali kontrolü gerekli.`, source: 'Üretim', channel: 'sms', to: d.settings.smsNumbers.split(',')[0].trim(), subject: 'Proses süre aşımı' });
        }
      });
      toast(`${l.code} → ${target} aşamasına taşındı`);
      window.App.refresh();
    }
  }
};

/* ============================ REÇETELER ============================ */

export const recipesView = {
  title: 'Reçeteler',
  subtitle: 'Ocak + alaşım + tonaj bazlı ergitme, döküm sarf ve homojenizasyon reçeteleri',

  render() {
    const d = D();
    const tabs = ['Ergitme', 'Döküm', 'Homojenizasyon'].map((t) => `<button class="tab ${recipeTab === t ? 'active' : ''}" data-recipe-tab="${t}">${t} <span>${d.recipes.filter((r) => r.type === t).length}</span></button>`).join('');
    const cards = d.recipes.filter((r) => r.type === recipeTab).map((r) => {
      const rows = r.items.map((it) => `<tr><td>${esc(it.label || matName(it.materialId))}</td><td class="num">${fmtNum(it.perTon, 2)}</td><td>${esc(it.unit)} / ton</td><td class="num">${fmtNum(it.perTon * (r.capacityTon || 20), 1)} ${esc(it.unit)}</td></tr>`).join('');
      const steps = (r.steps || []).map((s) => `<div class="step-row"><span class="step-time">${icon('clock', 13)} ${s.atMin}. dk</span><span>${esc(s.label)}</span>${s.suggestedQty ? `<strong>${fmtNum(s.suggestedQty)} kg</strong>` : ''}</div>`).join('') || '<p class="muted">Zamanlı adım tanımlanmamış.</p>';
      return `<div class="recipe-card" data-recipe="${esc(r.id)}">
        <div class="recipe-head"><div><span class="recipe-type">${esc(r.type)}</span><h3>${esc(r.name)}</h3><p>${r.alloy ? `Alaşım ${esc(r.alloy)}` : ''} ${r.furnaceId ? `· ${esc(furnace(r.furnaceId)?.name || '')}` : ''} ${r.capacityTon ? `· ${r.capacityTon} ton` : ''} ${r.diameterMm ? `· Ø${r.diameterMm} mm` : ''}</p></div><span class="recipe-badge">${icon('sliders', 16)}</span></div>
        <div class="recipe-metrics"><span>${icon('flame', 14)} ${r.tempC || '—'} °C</span><span>${icon('clock', 14)} ${r.durationMin || '—'} dk</span>${r.coolingMin ? `<span>${icon('gauge', 14)} Soğutma ${r.coolingMin} dk</span>` : ''}<span>${icon('box', 14)} ${r.items.length} kalem</span></div>
        <div class="table-wrap"><table class="data compact"><thead><tr><th>Malzeme</th><th class="num">Birim / Ton</th><th>Tip</th><th class="num">Örnek Şarj</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="recipe-steps"><h4>${icon('clock', 14)} Zamanlı Uyarılar</h4>${steps}</div>
      </div>`;
    }).join('');
    return `
      <div class="info-banner">${icon('sliders', 17)}<span><strong>Reçete mantığı:</strong> Önerilen miktar = birim/ton × fiilî şarj tonajı. Operatör farklı bir miktar atarsa "gerçekleşen" değeri girip onaylar; stok yalnızca gerçekleşen kadar düşer. Zamanlı adımlar ekranda uyarı üretir.</span></div>
      <section class="card">
        <div class="toolbar"><div class="tabs">${tabs}</div><span class="toolbar-spacer"></span><button class="btn btn-primary" id="recipe-new">${icon('plus', 16)} Yeni Reçete</button></div>
        <div class="recipe-grid">${cards || '<div class="muted pad">Bu türde reçete yok.</div>'}</div>
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    root.querySelectorAll('[data-recipe-tab]').forEach((b) => b.addEventListener('click', () => { recipeTab = b.dataset.recipeTab; refresh(); }));
    root.querySelector('#recipe-new').addEventListener('click', () => {
      modal({
        title: 'Yeni Reçete', subtitle: 'Oluşturduktan sonra kart üzerinden malzeme kalemi ekleyebilirsiniz.', size: 'wide',
        body: `<div class="form-grid">
          ${field('Reçete Türü', select('type', ['Ergitme', 'Döküm', 'Homojenizasyon'], recipeTab))}
          ${field('Reçete Adı', input('name', '', { required: true, placeholder: 'Örn. 6063 / 20 Ton Ocak' }))}
          ${field('Alaşım', input('alloy', '6063'))}
          ${field('Ocak', select('furnaceId', [{ value: '', label: 'Yok' }, ...D().furnaces.map((f) => ({ value: f.id, label: f.name }))]))}
          ${field('Kapasite (ton)', input('capacityTon', 20, { type: 'number', min: 0, step: 1 }))}
          ${field('Çap (mm)', input('diameterMm', 178, { type: 'number', min: 0, step: 1 }))}
          ${field('Sıcaklık (°C)', input('tempC', 750, { type: 'number', min: 0 }))}
          ${field('Süre (dk)', input('durationMin', 240, { type: 'number', min: 0 }))}
          ${field('Soğutma (dk)', input('coolingMin', 0, { type: 'number', min: 0 }))}
        </div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Reçeteyi Oluştur', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            if (!f.name) { toast('Reçete adı zorunludur', 'danger'); return; }
            store.change((d) => {
              d.recipes.push({ id: uid('RCP'), type: f.type, name: f.name, alloy: f.alloy, furnaceId: f.furnaceId || null, capacityTon: Number(f.capacityTon) || null, tempC: Number(f.tempC), durationMin: Number(f.durationMin), diameterMm: Number(f.diameterMm) || null, coolingMin: Number(f.coolingMin), items: [], steps: [] });
              addActivity(`Yeni reçete oluşturuldu: ${f.name}`, 'sliders');
            });
            recipeTab = f.type; close(); toast('Reçete oluşturuldu'); refresh();
          } }
        ]
      });
    });
    root.querySelectorAll('[data-recipe]').forEach((card) => card.addEventListener('click', () => {
      const r = recipe(card.dataset.recipe); if (!r) return;
      const mo = modal({
        title: r.name, subtitle: `${r.type} · ${r.alloy || ''} · ${r.items.length} kalem`, size: 'wide',
        body: `<div class="detail-grid"><div class="detail-item"><span>Sıcaklık</span><strong>${r.tempC || '—'} °C</strong></div><div class="detail-item"><span>Süre</span><strong>${r.durationMin || '—'} dk</strong></div><div class="detail-item"><span>Soğutma</span><strong>${r.coolingMin || '—'} dk</strong></div><div class="detail-item"><span>Ocak</span><strong>${esc(furnace(r.furnaceId)?.name || '—')}</strong></div></div>
          <div class="detail-section"><h4>Reçete Kalemleri</h4>${r.items.map((it) => `<div class="mini-row"><span>${esc(it.label || matName(it.materialId))}</span><span>${fmtNum(it.perTon, 2)} ${esc(it.unit)}/ton</span><strong>${esc(it.materialId)}</strong></div>`).join('') || '<p class="muted">Kalem yok</p>'}</div>
          <div class="detail-section"><h4>Kalem Ekle</h4><div class="cons-form">${select('newItemMaterial', D().materials.map((m) => ({ value: m.id, label: m.name })))}${input('newItemPerTon', '', { type: 'number', min: 0, step: 0.1, placeholder: 'Birim / ton' })}<button type="button" class="btn btn-ghost btn-sm" id="recipe-add-item">${icon('plus', 14)} Ekle</button></div></div>`,
        actions: [{ label: 'Kapat', kind: 'primary', onClick: (_e, close) => close() }]
      });
      mo.el.querySelector('#recipe-add-item').addEventListener('click', () => {
        const f = formData(mo.el.querySelector('.modal'));
        const perTon = Number(f.newItemPerTon);
        if (!f.newItemMaterial || perTon <= 0) { toast('Malzeme ve miktar gerekli', 'danger'); return; }
        store.change((d) => {
          const t = d.recipes.find((x) => x.id === r.id);
          t.items.push({ materialId: f.newItemMaterial, perTon, unit: material(f.newItemMaterial)?.unit || 'kg', label: matName(f.newItemMaterial) });
          addActivity(`${r.name} reçetesine ${matName(f.newItemMaterial)} eklendi`, 'sliders');
        });
        mo.close(); toast('Reçete kalemi eklendi'); refresh();
      });
    }));
  }
};
