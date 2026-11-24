// Saha görüşmesinden gelen 8 yeni ekran.
// docs/06 (düzeltilmiş metin), docs/07 (hesap motoru), docs/08 (modüler makine),
// docs/09 (olay arşivi) ve docs/10 (kurulum) bu dosyanın gereksinim kaynağıdır.

import { D, store, uid, nowISO, addActivity, addNotification, activePlantId, machinesOfType, firstMachineId } from '../store.js';
import { machineRefs, decommissionMachine, recommissionMachine, isModuleEnabled } from '../modularity.js';
import { icon } from '../icons.js';
import {
  esc, fmtNum, fmtDateTime, fmtDate, pill, field, input, select, formData,
  modal, toast, downloadText, progress, emptyState, confirmDialog
} from '../ui.js';
import {
  cuttingReport, geometryCheck, maintenanceStatus, durationCheck,
  FATES, DEFAULT_DIAMETER_MM, DEFAULT_CAST_MM, DEFAULT_PRODUCT_MM,
  DEFAULT_HEAD_MM, DEFAULT_BLADE_MM, DEFAULT_DENSITY
} from '../calc.js';
import { liveEnabled, liveSnapshot, liveStats, mapLiveFurnaces, statusLabel, statusTone } from '../live.js';

let activePlant = null;
let vendorTab = 'Fabrikalar';
let lastCutReport = null;

const machineName = (id) => D().machines.find((m) => m.id === id)?.name || '—';
const machineType = (code) => D().machineTypes.find((t) => t.code === code)?.name || code || '—';
const plantName = (id) => D().plants.find((p) => p.id === id)?.name || '—';
const recipeName = (id) => D().homogenizationRecipes.find((r) => r.id === id)?.name || id || '—';
const pathName = (id) => D().castingPaths.find((p) => p.id === id)?.label || id || '—';
const fatePill = (fate) => {
  const f = FATES[fate] || { label: fate || '—', kind: 'neutral' };
  return pill(f.label, f.kind);
};
const refresh = () => window.App.refresh();
const currentPlant = () => {
  const d = D();
  if (activePlant && d.plants.some((p) => p.id === activePlant)) return activePlant;
  return activePlantId(d);
};

/* ==================================================================== */
/* 1. MAKİNE PARKI                                                      */
/* ==================================================================== */

function liveMachinesRender() {
  const d = D();
  const snap = liveSnapshot();
  if (!snap) return `<section class="card">${emptyState('Simülasyon bağlantısı yok. Köprüyü başlatıp Yeniden Dene deyin.', 'wifiOff')}</section>`;
  const stats = liveStats(snap);
  const rows = mapLiveFurnaces(snap, d.machines);
  const used = new Set(rows.map((r) => r.id));
  const others = d.machines.filter((m) => m.plantId === activePlantId(d) && m.active && !m.decommissionedAt && !used.has(m.id));
  return `
    <div class="stat-strip">
      <div><span>Simüle Fırın</span><strong>${stats.furnaceCount}</strong></div>
      <div><span>Profil Eşleşmesi</span><strong>${stats.mappedCount}/${stats.furnaceCount}</strong></div>
      <div><span>Aktif Alarm</span><strong class="text-danger">${stats.alarms}</strong></div>
      <div><span>Diğer Profil Makinesi</span><strong>${others.length}</strong></div>
      <div><span>Veri Kaynağı</span><strong>${esc(snap.mode === 'DEMO' ? 'Demo sim' : 'Simülasyon')}</strong></div>
    </div>
    <div class="info-banner">${icon('activity', 18)}<span><strong>Bu ekran ana ERP makine parkıdır.</strong> Fırınlar simülasyondan canlı gelir; her kartta sıcaklık, hedef, alarm ve durum görünür. Makine ekleme/devre dışı bırakma işlemleri için demo moduna geçin; canlı mod salt okunurdur.</span></div>
    <section class="card">
      <div class="card-head"><div><h3>Canlı fırınlar</h3><p>Fırın adı → profil makine kimliği eşlemesi ve anlık durum.</p></div><span class="card-tag">${icon('activity', 14)} ${esc(snap.checkedAt ? fmtDateTime(snap.checkedAt) : 'canlı')}</span></div>
      <div class="grid-3">
        ${rows.map((m) => {
          const l = m.live || {};
          const alarm = l.alarmActive || String(l.status || '').toUpperCase() === 'ALARM';
          return `<div class="data-card ${alarm ? 'live-alarm' : ''}">
            <div class="data-ico">${icon('flame', 20)}</div>
            <div class="cell-strong">${esc(m.name)}</div>
            <div class="cell-sub">${esc(m.id)} · ${esc(m.simName || '')}${m.mapped ? '' : ' · eşleşmedi'}</div>
            <div class="live-temp-row"><strong>${l.temperatureC === null || l.temperatureC === undefined ? '—' : fmtNum(l.temperatureC, 1)}</strong><small>°C</small><span>hedef ${l.targetC === null || l.targetC === undefined ? '—' : fmtNum(l.targetC, 0)} °C</span></div>
            <div class="toolbar" style="margin:10px 0 0">
              ${pill(statusLabel(l.status), statusTone(l.status))}
              ${pill(m.mapped ? 'Profil eşleşti' : 'Eşleşmedi', m.mapped ? 'ok' : 'warn')}
              <span class="toolbar-spacer"></span>
              ${pill('CANLI', 'cyan')}
            </div>
            ${alarm ? `<div class="sim-alarm" style="margin-top:8px">${icon('alert', 13)} ${esc(l.alarm || 'Güvenlik sınırı aşıldı')}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </section>
    <section class="card">
      <div class="card-head"><div><h3>Profilde tanımlı diğer makineler</h3><p>Tabla, testere ve homojenizasyon makineleri simülasyonda yok; profil paketinden gelir.</p></div><span class="card-tag">${others.length} makine</span></div>
      ${others.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Kimlik</th><th>Makine</th><th>Tip</th><th>Kapasite</th><th>Mod</th></tr></thead><tbody>${others.slice(0, 12).map((m) => `<tr><td class="cell-strong">${esc(m.id)}</td><td>${esc(m.name)}</td><td>${esc(machineType(m.type))}</td><td>${m.capacityTon ? fmtNum(m.capacityTon) + ' t' : '—'}</td><td>${pill(m.mode === 'PLC' ? 'PLC' : 'Manuel', m.mode === 'PLC' ? 'cyan' : 'neutral')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted pad">Başka makine tanımlı değil.</div>'}
    </section>`;
}

export const machinesView = {
  title: 'Makine Parkı',
  subtitle: 'Modüler kurulum: fabrika profili, makine tipleri ve iki çalışma modu',

  render() {
    if (liveEnabled()) return liveMachinesRender();
    const d = D();
    const pid = currentPlant();
    const plant = d.plants.find((p) => p.id === pid) || d.plants[0] || {};
    const machines = d.machines.filter((m) => m.plantId === pid);
    const byType = d.machineTypes.map((t) => ({
      type: t, rows: machines.filter((m) => m.type === t.code)
    })).filter((g) => g.rows.length);

    return `
      <div class="info-banner">${icon('cpu', 18)}<span>Makineler <strong>eklenir, düzenlenir ve devre dışı bırakılır</strong>; hiçbir kayıt silinmez. Çıkarma öncesi bağımlılık raporu gösterilir. Program ilk açıldığında <strong>hiçbir makine tanımlı değildir</strong>. Makineler modül modül eklenir; ancak bu yapı <strong>fabrika operatörü için değil, yazılımı geliştiren ekip içindir</strong>. Yeni ocak alındığında yapılandırma Merkezi Yönetim ekranından uzaktan uygulanır.</span></div>

      <div class="stat-strip">
        <div><span>Aktif Fabrika</span><strong>${esc(plant.name || '—')}</strong></div>
        <div><span>Çalışma Modu</span><strong>${plant.mode === 'PLC' ? 'PLC' : 'Manuel'}</strong></div>
        <div><span>Tanımlı Makine</span><strong>${machines.length}</strong></div>
        <div><span>Aktif</span><strong class="text-ok">${machines.filter((m) => m.active).length}</strong></div>
        <div><span>Makine Tipi</span><strong>${d.machineTypes.length}</strong></div>
        <div><span>Devre Dışı</span><strong class="text-warn">${machines.filter((m) => m.decommissionedAt).length}</strong></div>
      </div>

      <section class="card">
        <div class="toolbar">
          ${field('Fabrika Profili', select('plantId', d.plants.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })), pid, 'id="mch-plant"'))}
          <span class="toolbar-spacer"></span>
          <button class="btn btn-ghost btn-sm" id="mch-profile">${icon('eye', 15)} Profil Özeti</button>
          <button class="btn btn-primary" id="mch-new">${icon('plus', 16)} Makine Ekle</button>
        </div>
        <div class="micro muted">${esc(plant.note || '')}</div>
      </section>

      ${byType.length ? byType.map((g) => `
        <section class="card">
          <div class="card-head"><div><strong>${esc(g.type.name)}</strong><span class="muted"> · ${g.rows.length} makine</span></div><span class="card-tag">${esc(g.type.code)}</span></div>
          <div class="grid-3">
            ${g.rows.map((m) => `
              <div class="data-card">
                <div class="data-ico">${icon(g.type.icon || 'cpu', 20)}</div>
                <div class="cell-strong">${esc(m.name)}</div>
                <div class="cell-sub">${esc(m.id)} · ${m.capacityTon > 0 ? `${fmtNum(m.capacityTon)} ${esc(g.type.capacityUnit)}` : 'Kapasite yok'}</div>
                <div class="toolbar" style="margin:10px 0 0">
                  ${pill(m.mode === 'PLC' ? 'PLC' : 'Manuel', m.mode === 'PLC' ? 'cyan' : 'neutral')}
                  ${pill(m.decommissionedAt ? 'Devre Dışı' : m.active ? 'Aktif' : 'Pasif', m.decommissionedAt ? 'danger' : m.active ? 'ok' : 'warn')}
                  <span class="toolbar-spacer"></span>
                  <button class="btn btn-ghost btn-sm" data-mch-edit="${esc(m.id)}" title="Düzenle">${icon('edit', 13)}</button>
                  ${m.decommissionedAt
                    ? `<button class="btn btn-ghost btn-sm" data-mch-back="${esc(m.id)}" title="Geri al">${icon('refresh', 13)}</button>`
                    : `<button class="btn btn-ghost btn-sm" data-mch-remove="${esc(m.id)}" title="Devre dışı bırak">${icon('x', 13)}</button>`}
                </div>
                ${m.decommissionedAt ? `<div class="micro muted" style="margin-top:8px">${esc(m.decommissionReason || '')}</div>` : ''}
              </div>`).join('')}
          </div>
        </section>`).join('') : `<section class="card">${emptyState('Bu fabrikada henüz makine yok. Kurulum sihirbazı ile ekleyin.', 'cpu')}</section>`}

      <section class="card">
        <div class="card-head"><div><strong>Fabrika Profilleri</strong><span class="muted"> · aynı yazılım, farklı konfigürasyon</span></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Kod</th><th>Fabrika</th><th>Şehir</th><th>Mod</th><th>Makine</th><th>Fırın</th><th>Tabla</th><th>Testere</th><th>Homojen</th><th>Not</th></tr></thead>
          <tbody>${d.plants.map((p) => {
            const ms = d.machines.filter((m) => m.plantId === p.id);
            const cnt = (t) => ms.filter((m) => m.type === t).length;
            return `<tr><td>${esc(p.code)}</td><td class="cell-strong">${esc(p.name)}</td><td>${esc(p.city || '—')}</td>
              <td>${pill(p.mode === 'PLC' ? 'PLC' : 'Manuel', p.mode === 'PLC' ? 'cyan' : 'neutral')}</td>
              <td>${ms.length}</td><td>${cnt('FURNACE')}</td><td>${cnt('CAST_TABLE')}</td><td>${cnt('SAW')}</td><td>${cnt('HOMO_FURNACE') + cnt('CONT_HOMO')}</td>
              <td class="cell-sub">${esc(p.note || '—')}</td></tr>`;
          }).join('')}</tbody></table></div>
      </section>`;
  },

  mount(root) {
    root.querySelector('#mch-plant')?.addEventListener('change', (e) => { activePlant = e.target.value; refresh(); });
    root.querySelector('#mch-profile')?.addEventListener('click', () => {
      const p = D().plants.find((x) => x.id === currentPlant()) || {};
      modal({ title: 'Fabrika Profili', subtitle: 'Merkezi yönetimde tutulan özel kurallar',
        body: `<div class="detail-grid"><div class="detail-item"><span>Kod</span><strong>${esc(p.code || '—')}</strong></div><div class="detail-item"><span>Mod</span><strong>${esc(p.mode || '—')}</strong></div></div><p class="detail-desc">${esc(p.note || 'Özel kural tanımlanmadı.')}</p>`,
        actions: [{ label: 'Kapat', onClick: (_e, close) => close() }] });
    });
    root.querySelectorAll('[data-mch-edit]').forEach((b) => b.addEventListener('click', () => openMachineModal(b.dataset.mchEdit)));
    root.querySelectorAll('[data-mch-remove]').forEach((b) => b.addEventListener('click', () => openDecommissionModal(b.dataset.mchRemove)));
    root.querySelectorAll('[data-mch-back]').forEach((b) => b.addEventListener('click', () => {
      store.change((d) => {
        recommissionMachine(d, b.dataset.mchBack);
        addActivity(`${b.dataset.mchBack} yeniden makine parkına alındı`, 'cpu');
      });
      toast('Makine yeniden aktif'); refresh();
    }));
    root.querySelector('#mch-new')?.addEventListener('click', () => openMachineModal(null));
  }
};

function openMachineModal(id) {
  const d = D();
  const m = id ? d.machines.find((x) => x.id === id) : null;
  modal({
    title: m ? 'Makineyi Düzenle' : 'Yeni Makine Ekle',
    subtitle: 'İlk kurulumda boş makine parkı; yalnızca dört alan tanımlanır.', size: 'wide',
    body: `<div class="form-grid">
      ${field('Fabrika', select('plantId', d.plants.map((p) => ({ value: p.id, label: p.name })), m?.plantId || currentPlant()))}
      ${field('Makine Tipi', select('type', d.machineTypes.map((t) => ({ value: t.code, label: t.name })), m?.type || 'FURNACE'))}
      ${field('Fabrikadaki Adı', input('name', m?.name || '', { required: true, placeholder: 'Örn. A Fırını veya 1. Ocak' }))}
      ${field('Kapasite (ton)', input('capacityTon', m?.capacityTon ?? 20, { type: 'number', min: 0, step: 1 }))}
      ${field('Çalışma Modu', select('mode', [{ value: 'MANUAL', label: 'MANUAL · operatör girer' }, { value: 'PLC', label: 'PLC · otomatik okunur' }], m?.mode || 'MANUAL'))}
      ${field('PLC Bağlantısı', select('plcId', [{ value: '', label: 'Yok' }, ...d.plcConnections.map((c) => ({ value: c.id, label: c.name }))], m?.plcId || ''))}
    </div><div class="info-banner" style="margin-top:14px">${icon('alert', 16)}<span>Brülör sayısı, yakıt tipi gibi alanlar bilinçli olarak eklenmez: konuşmada "tonaj dışında başka değişim yok, ekran kalabalık olmasın" denmiştir.</span></div>`,
    actions: [
      { label: 'Vazgeç', onClick: (_e, close) => close() },
      { label: m ? 'Kaydet' : 'Makineyi Ekle', kind: 'primary', icon: 'check', onClick: (el, close) => {
        const f = formData(el);
        if (!f.name) { toast('Makine adı zorunludur', 'danger'); return; }
        store.change((data) => {
          if (m) Object.assign(data.machines.find((x) => x.id === m.id), {
            plantId: f.plantId, type: f.type, name: f.name, capacityTon: Number(f.capacityTon) || 0,
            mode: f.mode, plcId: f.plcId || null
          });
          else data.machines.push({
            id: uid('MCH'), plantId: f.plantId, type: f.type, name: f.name,
            capacityTon: Number(f.capacityTon) || 0, mode: f.mode, plcId: f.plcId || null,
            active: true, status: 'Aktif', decommissionedAt: null, decommissionReason: '',
            installedAt: nowISO().slice(0, 10)
          });
          data.vendorUpdates.unshift({ id: uid('VU'), plantId: f.plantId, version: data.settings.version || '1.0',
            kind: m ? 'Parametre Değişikliği' : 'Makine Eklendi', note: `${f.name} (${f.type}) ${m ? 'güncellendi' : 'eklendi'}`, appliedBy: 'Max', at: nowISO() });
          addActivity(`${f.name} ${m ? 'güncellendi' : 'makine parkına eklendi'}`, 'cpu');
        });
        activePlant = f.plantId;
        close(); toast(m ? 'Makine güncellendi' : 'Makine eklendi, sistem otomatik çalışacak'); refresh();
      } }
    ]
  });
}


/** Makine silinmez; önce bağımlılıklar gösterilir, sonra devre dışı işaretlenir (docs/12 Bölüm 3). */
function openDecommissionModal(id) {
  const d = D();
  const m = d.machines.find((x) => x.id === id);
  if (!m) return;
  const refs = machineRefs(d, id);
  const groups = [...new Set(refs.map((r) => r.collection))].map((c) => ({
    collection: c, label: refs.find((r) => r.collection === c).label,
    rows: refs.filter((r) => r.collection === c)
  }));
  modal({
    title: 'Makineyi Devre Dışı Bırak', subtitle: `${m.name} · ${m.id} · ${m.type}`, size: 'wide',
    body: `<div class="info-banner">${icon('alert', 17)}<span><strong>Kayıt silinmez.</strong> Makine pasife alınır; geçmiş olaylar, bakım kayıtları ve döküm kodları korunur. Bağımlı ${refs.length} kayıt etkilenmez, yalnızca referans olarak kalır.</span></div>
      <div class="stat-strip">
        <div><span>Bağımlı Kayıt</span><strong>${refs.length}</strong></div>
        <div><span>Etkilenen Koleksiyon</span><strong>${groups.length}</strong></div>
        <div><span>Makine Tipi</span><strong>${esc(m.type)}</strong></div>
      </div>
      ${groups.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Koleksiyon</th><th>Kayıt</th><th>Kayıt Kimliği</th><th>Alan</th></tr></thead>
        <tbody>${groups.map((g) => g.rows.map((r) => `<tr><td>${esc(g.label)}</td><td class="cell-sub">${esc(g.collection)}</td><td class="cell-strong">${esc(r.recordId)}</td><td>${esc(r.field)}</td></tr>`).join('')).join('')}</tbody></table></div>`
        : `<div class="micro muted">Bu makineye bağlı kayıt yok; güvenle devre dışı bırakılabilir.</div>`}
      ${field('Gerekçe', input('reason', 'Söküldü / kullanım dışı', { placeholder: 'Örn. yeni hat kuruldu, eski ocak söküldü' }))}
      <p class="micro muted" style="margin-top:10px">Geri almak için kart üzerindeki geri alma düğmesi kullanılır; fabrika profili paketi bu değişikliği de taşır.</p>`,
    actions: [
      { label: 'Vazgeç', onClick: (_e, close) => close() },
      { label: 'Devre Dışı Bırak', kind: 'danger', icon: 'x', onClick: (el, close) => {
        const f = formData(el);
        store.change((data) => {
          decommissionMachine(data, id, f.reason);
          data.vendorUpdates.unshift({ id: uid('VU'), plantId: m.plantId, version: data.settings.version || '1.2',
            kind: 'Makine Çıkarıldı', note: `${m.name} devre dışı bırakıldı (${refs.length} bağımlı kayıt korundu)`, appliedBy: 'Max', at: nowISO() });
          addActivity(`${m.name} devre dışı bırakıldı, ${refs.length} kayıt korundu`, 'cpu');
        });
        close(); refresh(); toast('Makine silinmedi, devre dışı olarak işaretlendi', 'info');
      } }
    ]
  });
}

/* ==================================================================== */
/* 2. DÖKÜM YOLLARI                                                     */
/* ==================================================================== */

export const pathsView = {
  title: 'Döküm Yolları',
  subtitle: 'Fırından tablaya giden hat ve yollukta tutulan metal miktarı',

  render() {
    const d = D();
    const holds = d.castingPaths.map((p) => Number(p.holdTon) || 0);
    const avg = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;
    return `
      <div class="info-banner">${icon('flame', 18)}<span>Aynı fabrikada iki ocak ve bir döküm tablası varken yol kısa veya uzun olur. Kısa yolda yollukta <strong>1 ton</strong> kalan metal, uzun yolda <strong>1,5 veya 2 ton</strong> olabilir. Bu bir <strong>hat parametresidir</strong>, döküm kodu başına girilen sabit bir fire oranı değildir.</span></div>

      <div class="stat-strip">
        <div><span>Tanımlı Yol</span><strong>${d.castingPaths.length}</strong></div>
        <div><span>En Az Tutma</span><strong>${fmtNum(Math.min(...(holds.length ? holds : [0])), 1)} t</strong></div>
        <div><span>En Çok Tutma</span><strong>${fmtNum(Math.max(...(holds.length ? holds : [0])), 1)} t</strong></div>
        <div><span>Ortalama</span><strong>${fmtNum(avg, 2)} t</strong></div>
        <div><span>Fark</span><strong class="text-warn">${fmtNum(Math.max(...(holds.length ? holds : [0])) - Math.min(...(holds.length ? holds : [0])), 1)} t</strong></div>
      </div>

      <section class="card">
        <div class="toolbar"><div class="card-head" style="margin:0"><div><strong>Yol Tanımları</strong><span class="muted"> · her satır bir fırın/tabla çifti</span></div></div>
          <span class="toolbar-spacer"></span><button class="btn btn-primary" id="path-new">${icon('plus', 16)} Yol Ekle</button></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Kod</th><th>Fabrika</th><th>Kaynak Ocak</th><th>Döküm Tablası</th><th>Yol</th><th>Tutma (ton)</th><th>Not</th><th></th></tr></thead>
          <tbody>${d.castingPaths.map((p) => `<tr>
            <td>${esc(p.id)}</td><td>${esc(plantName(p.plantId))}</td>
            <td class="cell-strong">${esc(machineName(p.fromMachineId))}</td><td>${esc(machineName(p.tableId))}</td>
            <td>${pill(p.label, 'indigo')}</td><td><strong>${fmtNum(p.holdTon, 2)}</strong></td>
            <td class="cell-sub">${esc(p.note || '—')}</td>
            <td class="row-actions"><button class="btn btn-ghost btn-sm" data-path-edit="${esc(p.id)}">${icon('edit', 14)}</button></td>
          </tr>`).join('')}</tbody></table></div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Kütle Dengesine Etkisi</strong><span class="muted"> · 21 ton örneği</span></div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Adım</th><th>İşlem</th><th>Delta</th><th>Bakiye</th></tr></thead><tbody>
          <tr><td>1</td><td>Başlangıç metali</td><td class="text-ok">+21,000 t</td><td><strong>21,000 t</strong></td></tr>
          <tr><td>2</td><td>Başka ocağa aktarılan</td><td class="text-danger">−3,000 t</td><td><strong>18,000 t</strong></td></tr>
          <tr><td>3</td><td>Yollukta tutulan (seçilen yola göre)</td><td class="text-danger">−1,000 t</td><td><strong>17,000 t</strong></td></tr>
          <tr><td>4</td><td>Fiilen dökülen</td><td>—</td><td><strong>17,000 t</strong></td></tr>
          <tr><td>5</td><td>Kafa, talaş ve fire biyet sonrası net biyet</td><td class="text-danger">−3,000 t</td><td><strong>14,000 t</strong></td></tr>
        </tbody></table></div>
        <p class="micro muted" style="margin-top:10px">5. satırdaki 3 ton tek bir kayıp değildir; kafa kesimi, talaş ve fire biyet olarak ayrı olaylara bölünür. Dağılım ölçülmezse sistem bakiye boşluğunu açıkça gösterir.</p>
      </section>`;
  },

  mount(root) {
    const open = (id) => {
      const d = D();
      const p = id ? d.castingPaths.find((x) => x.id === id) : null;
      modal({ title: p ? 'Yolu Düzenle' : 'Yeni Döküm Yolu', size: 'wide',
        body: `<div class="form-grid">
          ${field('Fabrika', select('plantId', d.plants.map((x) => ({ value: x.id, label: x.name })), p?.plantId || currentPlant()))}
          ${field('Yol Adı', input('label', p?.label || '', { required: true, placeholder: 'Kısa yol / Uzun yol' }))}
          ${field('Kaynak Ocak', select('fromMachineId', d.machines.filter((m) => m.type === 'FURNACE').map((m) => ({ value: m.id, label: m.name })), p?.fromMachineId || ''))}
          ${field('Döküm Tablası', select('tableId', d.machines.filter((m) => m.type === 'CAST_TABLE').map((m) => ({ value: m.id, label: m.name })), p?.tableId || ''))}
          ${field('Yollukta Tutulan Metal (ton)', input('holdTon', p?.holdTon ?? 1, { type: 'number', min: 0, step: 0.1 }))}
          ${field('Not', input('note', p?.note || '', { placeholder: 'Örn. A Fırını, Tabla 1' }))}
        </div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Kaydet', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            if (!f.label) { toast('Yol adı zorunludur', 'danger'); return; }
            store.change((data) => {
              const row = { plantId: f.plantId, label: f.label, fromMachineId: f.fromMachineId,
                tableId: f.tableId, holdTon: Number(f.holdTon) || 0, note: f.note };
              if (p) Object.assign(data.castingPaths.find((x) => x.id === p.id), row);
              else data.castingPaths.push({ id: uid('CP'), ...row });
              addActivity(`${f.label} tutma miktarı ${fmtNum(row.holdTon, 2)} t olarak kaydedildi`, 'flame');
            });
            close(); toast('Döküm yolu kaydedildi'); refresh();
          } }
        ] });
    };
    root.querySelector('#path-new')?.addEventListener('click', () => open(null));
    root.querySelectorAll('[data-path-edit]').forEach((b) => b.addEventListener('click', () => open(b.dataset.pathEdit)));
  }
};

/* ==================================================================== */
/* 3. KESİM HESAP MOTORU                                                */
/* ==================================================================== */

export const cuttingView = {
  title: 'Kesim Hesap Motoru',
  subtitle: '6300 / 6000 / 300 / 3 mm, Ø178 ve yoğunluk ile kafa, talaş ve net biyet',

  render() {
    const d = D();
    return `
      <div class="info-banner">${icon('scissors', 18)}<span>Kesim kaybı uzunlukla değil <strong>hacim ve özkütle</strong> ile hesaplanır: <code>π · (çap/2)² · uzunluk · ρ</code>. Kafa kesimi tekrar fırına gider, talaş eritilemediği için satılır. İkisi asla tek kalemde birleştirilmez.</span></div>

      <div class="grid-2">
        <section class="card">
          <div class="card-head"><div><strong>Parametreler</strong><span class="muted"> · tamamı kullanıcı tanımlı</span></div></div>
          <div class="form-grid" id="cut-form">
            ${field('Döküm Kodu', select('lotId', d.lots.map((l) => ({ value: l.id, label: `${l.code} · ${fmtNum(l.weightTon, 1)} t` })), 'DK-2026-0139', 'id="cut-lot"'))}
            ${field('Çap (mm)', input('diameterMm', DEFAULT_DIAMETER_MM, { type: 'number', min: 1, step: 1 }))}
            ${field('Döküm Boyu (mm)', input('castLengthMm', DEFAULT_CAST_MM, { type: 'number', min: 1, step: 1 }))}
            ${field('Ürün Boyu (mm)', input('productLengthMm', DEFAULT_PRODUCT_MM, { type: 'number', min: 1, step: 1 }))}
            ${field('Kafa Payı (mm)', input('headMm', DEFAULT_HEAD_MM, { type: 'number', min: 0, step: 1 }))}
            ${field('Bıçak Kalınlığı (mm)', input('bladeMm', DEFAULT_BLADE_MM, { type: 'number', min: 0, step: 0.5 }))}
            ${field('Yoğunluk (kg/m³)', input('density', DEFAULT_DENSITY, { type: 'number', min: 1, step: 10 }))}
            ${field('Biyet Adedi', input('count', 35, { type: 'number', min: 1, step: 1 }))}
            ${field('Biyet Başına Kafa', input('headPerBillet', 2, { type: 'number', min: 1, step: 1 }))}
            ${field('Biyet Başına Kesim', input('cutsPerBillet', 2, { type: 'number', min: 1, step: 1 }))}
            ${field('Fire Biyet (kg)', input('scrapBilletKg', 115, { type: 'number', min: 0, step: 1 }))}
            ${field('Ölçüm Yorumu', select('bladeInsideCastLength', [{ value: 'true', label: 'Bıçak payı döküm boyuna dâhil (297 mm kafa)' }, { value: 'false', label: '300 mm kafa + ayrı 3 mm bıçak' }], 'true'))}
          </div>
          <div class="toolbar" style="margin-top:14px">
            <label class="check-row"><input type="checkbox" name="bladeInside" id="cut-inside" checked> <span>Bıçak payını döküm boyuna dâhil et</span></label>
            <span class="toolbar-spacer"></span>
            <button class="btn btn-ghost btn-sm" id="cut-reset">${icon('refresh', 14)} Varsayılana Dön</button>
            <button class="btn btn-primary" id="cut-save">${icon('save', 15)} Olaylara Yaz</button>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><div><strong>Canlı Sonuç</strong><span class="muted"> · her değişiklikte yeniden hesaplanır</span></div></div>
          <div id="cut-results"></div>
        </section>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Yan Ürün Akıbeti</strong><span class="muted"> · fate parametresi fabrikaya göre değişir</span></div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Malzeme</th><th>Akıbet</th><th>Hedef</th><th>Açıklama</th></tr></thead><tbody>
          ${d.byProductFates.map((f) => `<tr><td class="cell-strong">${esc(d.materials.find((m) => m.id === f.materialId)?.name || f.materialId)}</td>
            <td>${fatePill(f.fate)}</td><td>${esc(f.destination || '—')}</td><td class="cell-sub">${esc(f.note || '—')}</td></tr>`).join('')}
        </tbody></table></div>
      </section>`;
  },

  mount(root) {
    const form = root.querySelector('#cut-form');
    const out = root.querySelector('#cut-results');
    const draw = () => {
      const f = formData(form);
      const inside = root.querySelector('#cut-inside').checked;
      const r = cuttingReport({
        diameterMm: Number(f.diameterMm), castLengthMm: Number(f.castLengthMm),
        productLengthMm: Number(f.productLengthMm), headMm: Number(f.headMm),
        bladeMm: Number(f.bladeMm), density: Number(f.density), count: Number(f.count),
        headPerBillet: Number(f.headPerBillet), cutsPerBillet: Number(f.cutsPerBillet),
        scrapBilletKg: Number(f.scrapBilletKg), bladeInsideCastLength: inside
      });
      lastCutReport = { ...r, lotId: f.lotId, bladeInsideCastLength: inside };
      const lot = D().lots.find((l) => l.id === f.lotId);
      const geo = lot ? geometryCheck({
        recordedTon: lot.weightTon, count: r.count, diameterMm: r.diameterMm,
        productLengthMm: r.productLengthMm, density: r.density,
        tolerancePct: D().settings.geometryTolerancePct || 2
      }) : null;
      const gapWarn = r.balanceGapKg > 1;
      out.innerHTML = `
        <div class="stat-strip">
          <div><span>Birim Ürün</span><strong>${fmtNum(r.unitProductKg, 1)} kg</strong></div>
          <div><span>Birim Kafa</span><strong>${fmtNum(r.unitHeadKg, 2)} kg</strong></div>
          <div><span>Birim Talaş</span><strong>${fmtNum(r.unitSawdustKg, 4)} kg</strong></div>
          <div><span>Kesim Sayısı</span><strong>${fmtNum(r.kerfCuts)}</strong></div>
        </div>
        <div class="calc-box">
          <div class="calc-row"><span>Efektif kafa payı</span><strong>${fmtNum(r.effectiveHeadMm)} mm</strong><small>Operatör 300 mm ölçtü; bıçak payı düşülünce ${fmtNum(r.effectiveHeadMm)} mm</small></div>
          <div class="calc-row"><span>Uzunluk sapması</span><strong class="${r.deviationMm !== 0 ? 'text-warn' : ''}">${fmtNum(r.deviationMm)} mm</strong><small>6000 + ${fmtNum(r.effectiveHeadMm)} + ${fmtNum(r.bladeMm)} = ${fmtNum(6000 + r.effectiveHeadMm + r.bladeMm)} mm</small></div>
          <div class="calc-row"><span>Kafa kesimi toplamı</span><strong>${fmtNum(r.headKg, 1)} kg</strong><small>${fatePill('remelt')} tekrar fırına</small></div>
          <div class="calc-row"><span>Talaş toplamı</span><strong>${fmtNum(r.sawdustKg, 2)} kg</strong><small>${fatePill('sale')} eritilemez, satılır</small></div>
          <div class="calc-row"><span>Fire biyet</span><strong>${fmtNum(r.scrapBilletKg, 1)} kg</strong><small>${fatePill('remelt')}</small></div>
          <div class="calc-row"><span>Toplam kayıp</span><strong>${fmtNum(r.totalLossKg, 1)} kg</strong><small>Üç ayrı olay satırı</small></div>
          <div class="calc-row big"><span>Net biyet</span><strong>${fmtNum(r.netBilletTon, 3)} t</strong><small>${fmtNum(r.netBilletKg, 1)} kg · ${fmtNum(r.count)} adet</small></div>
        </div>
        ${gapWarn ? `<div class="info-banner" style="margin-top:12px">${icon('alert', 16)}<span><strong>Kütle dengesi kapanmadı:</strong> geometriden beklenen ürün ile ölçülen bakiye arasında ${fmtNum(r.balanceGapKg, 1)} kg boşluk var. 17 tondan 14 tona düşüşün kafa, talaş ve fire biyet dağılımı ölçülerek girilmelidir.</span></div>` : ''}
        ${geo ? `<div class="table-wrap" style="margin-top:14px"><table class="data"><thead><tr><th>Geometri Doğrulaması</th><th>Değer</th></tr></thead><tbody>
          <tr><td>Kayıtlı tonaj (${esc(lot.code)})</td><td><strong>${fmtNum(geo.recordedTon, 2)} t</strong></td></tr>
          <tr><td>Geometriden beklenen</td><td><strong>${fmtNum(geo.expectedTon, 2)} t</strong></td></tr>
          <tr><td>Sapma</td><td>${pill(`${fmtNum(geo.deviationPct, 1)}% · ${geo.ok ? 'Tutarlı' : 'Uyumsuz'}`, geo.ok ? 'ok' : 'warn')}</td></tr>
        </tbody></table></div>` : ''}
        <p class="micro muted" style="margin-top:12px">Not: "su gibi değil, bir kilogram değil" kuralı gereği hiçbir kayıp sabit kg olarak yazılmaz; yoğunluk alaşım kartından okunur.</p>`;
    };
    form.addEventListener('input', (e) => {
      if (e.target && e.target.name === 'bladeInsideCastLength') root.querySelector('#cut-inside').checked = e.target.value === 'true';
      draw();
    });
    root.querySelector('#cut-inside').addEventListener('change', (e) => {
      const sel = form.querySelector('[name="bladeInsideCastLength"]');
      if (sel) sel.value = e.target.checked ? 'true' : 'false';
      draw();
    });
    root.querySelector('#cut-reset').addEventListener('click', () => {
      const defaults = { diameterMm: DEFAULT_DIAMETER_MM, castLengthMm: DEFAULT_CAST_MM, productLengthMm: DEFAULT_PRODUCT_MM,
        headMm: DEFAULT_HEAD_MM, bladeMm: DEFAULT_BLADE_MM, density: DEFAULT_DENSITY, count: 35,
        headPerBillet: 2, cutsPerBillet: 2, scrapBilletKg: 115 };
      Object.entries(defaults).forEach(([k, v]) => { const el = form.querySelector(`[name="${k}"]`); if (el) el.value = String(v); });
      root.querySelector('#cut-inside').checked = true; draw(); toast('Varsayılan parametreler yüklendi', 'info');
    });
    root.querySelector('#cut-save').addEventListener('click', () => {
      const r = lastCutReport;
      if (!r) return;
      store.change((d) => {
        const seq0 = d.events.filter((e) => e.lotId === r.lotId).length;
        const base = { lotId: r.lotId, plantId: activePlantId(d), machineId: firstMachineId('SAW', d), actor: 'Siz', source: 'MANUAL', at: nowISO(), grossTon: 0, deltaTon: 0, balanceTon: 0, ref: '', note: '' };
        const rows = [
          { type: 'HEAD_CUT', materialId: 'B03', fate: 'remelt', deltaTon: -r.headKg / 1000, payload: { headMm: r.effectiveHeadMm, headPerBillet: r.headPerBillet, headKg: r.headKg }, note: 'Kafa kesimleri tekrar fırına' },
          { type: 'SAWDUST', materialId: 'B02', fate: 'sale', deltaTon: -r.sawdustKg / 1000, payload: { bladeMm: r.bladeMm, cuts: r.kerfCuts, sawdustKg: r.sawdustKg }, note: '3 mm bıçak talaşı satışa' },
          { type: 'NET_BILLET', materialId: 'M01', fate: 'product', deltaTon: 0, payload: { count: r.count, productLengthMm: r.productLengthMm, netTon: r.netBilletTon }, note: 'Net biyet tonajı' }
        ];
        let balance = d.events.filter((e) => e.lotId === r.lotId).slice(-1)[0]?.balanceTon || 0;
        rows.forEach((row, i) => {
          balance = Number((balance + (Number(row.deltaTon) || 0)).toFixed(4));
          d.events.push({ id: uid('EV'), seq: seq0 + i + 1, ...base, ...row, deltaTon: Number(row.deltaTon), balanceTon: balance, clientId: uid('CL') });
        });
        d.inboxQueue.unshift({ id: uid('IQ'), clientId: uid('CL'), fileName: `${nowISO().slice(0, 10)}_kesim.json`, lotId: r.lotId, type: 'CUT_BATCH', status: 'pending', createdAt: nowISO(), processedAt: null, retryCount: 0, lastError: '' });
        addActivity(`Kesim hesabı olaylara yazıldı: ${fmtNum(r.headKg, 1)} kg kafa, ${fmtNum(r.sawdustKg, 2)} kg talaş`, 'scissors');
      });
      toast('3 olay satırı arşive, 1 kayıt kuyruğa yazıldı'); refresh();
    });
    draw();
  }
};

/* ==================================================================== */
/* 4. YAĞ & BAKIM                                                       */
/* ==================================================================== */

export const maintenanceView = {
  title: 'Yağ & Bakım',
  subtitle: 'Parametrik kesim eşikleri, bıçak ömrü ve bakım kayıtları',

  render() {
    const d = D();
    const oilWarn = d.oilRules.filter((r) => maintenanceStatus({ used: r.cutsSinceFill, limit: r.cutsPerTank, warnAt: r.warnAt }).level !== 'ok').length;
    const bladeWarn = d.bladeRules.filter((r) => maintenanceStatus({ used: r.cutsSinceChange, limit: r.maxCuts, warnAt: r.warnAt }).level !== 'ok').length;
    return `
      <div class="info-banner">${icon('gauge', 18)}<span>Fabrika "bir tank yağ bana <strong>100 kesim</strong> gidiyor" der, sistem kesim sayacını izler ve eşiğe gelince bakımcılara uyarı gönderir. Başka fabrika <strong>150 kesim</strong> girebilir. Bütün değerler parametredir.</span></div>

      <div class="stat-strip">
        <div><span>Yağ Kuralı</span><strong>${d.oilRules.length}</strong></div>
        <div><span>Yağ Uyarısı</span><strong class="text-warn">${oilWarn}</strong></div>
        <div><span>Bıçak Kuralı</span><strong>${d.bladeRules.length}</strong></div>
        <div><span>Bıçak Uyarısı</span><strong class="text-warn">${bladeWarn}</strong></div>
        <div><span>Bakım Kaydı</span><strong>${d.maintenanceEvents.length}</strong></div>
      </div>

      <section class="card">
        <div class="card-head"><div><strong>Yağ Tankı Sayaçları</strong><span class="muted"> · kesim adedi üzerinden</span></div></div>
        <div class="grid-2">${d.oilRules.map((r) => {
          const st = maintenanceStatus({ used: r.cutsSinceFill, limit: r.cutsPerTank, warnAt: r.warnAt });
          return `<div class="data-card">
            <div class="data-ico">${icon('gauge', 20)}</div>
            <div class="cell-strong">${esc(machineName(r.machineId))}</div>
            <div class="cell-sub">${fmtNum(r.tankLitres)} L tank · ${fmtNum(r.cutsPerTank)} kesim/dolum · uyarı ${fmtNum(r.warnAt)}</div>
            <div style="margin:12px 0 6px">${progress(st.percent, 100, st.level === 'danger' ? '#ef4444' : st.level === 'warn' ? '#f59e0b' : '#16a34a')}</div>
            <div class="toolbar" style="margin:0"><strong>${fmtNum(st.percent, 1)}% kullanıldı</strong>${pill(st.label, st.level === 'danger' ? 'danger' : st.level === 'warn' ? 'warn' : 'ok')}
              <span class="toolbar-spacer"></span><button class="btn btn-ghost btn-sm" data-oil-edit="${esc(r.id)}">${icon('sliders', 13)} Parametre</button>
              <button class="btn btn-primary btn-sm" data-oil-fill="${esc(r.id)}">${icon('refresh', 13)} Yağ Doldur</button></div>
          </div>`;
        }).join('')}</div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Testere Bıçağı Ömrü</strong><span class="muted"> · kesim miktarına göre</span></div></div>
        <div class="grid-2">${d.bladeRules.map((r) => {
          const st = maintenanceStatus({ used: r.cutsSinceChange, limit: r.maxCuts, warnAt: r.warnAt });
          return `<div class="data-card">
            <div class="data-ico">${icon('scissors', 20)}</div>
            <div class="cell-strong">${esc(machineName(r.machineId))} · ${esc(r.bladeNo)}</div>
            <div class="cell-sub">${fmtNum(r.maxCuts)} kesim ömür · ${fmtNum(r.bladeMm)} mm bıçak · son değişim ${fmtDate(r.lastChangeAt)}</div>
            <div style="margin:12px 0 6px">${progress(st.percent, 100, st.level === 'danger' ? '#ef4444' : st.level === 'warn' ? '#f59e0b' : '#16a34a')}</div>
            <div class="toolbar" style="margin:0"><strong>${fmtNum(st.percent, 1)}%</strong>${pill(st.label, st.level === 'danger' ? 'danger' : st.level === 'warn' ? 'warn' : 'ok')}
              <span class="toolbar-spacer"></span><button class="btn btn-ghost btn-sm" data-blade-edit="${esc(r.id)}">${icon('sliders', 13)} Parametre</button>
              <button class="btn btn-primary btn-sm" data-blade-change="${esc(r.id)}">${icon('refresh', 13)} Bıçak Değiştir</button></div>
          </div>`;
        }).join('')}</div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Bakım Kayıtları</strong><span class="muted"> · dolum, değişim, bakıma gönderme</span></div>
          <span class="toolbar-spacer"></span><button class="btn btn-ghost btn-sm" id="me-new">${icon('plus', 14)} Kayıt Ekle</button></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Tarih</th><th>Tür</th><th>Makine</th><th>Kesim Sayacı</th><th>Kullanıcı</th><th>Not</th></tr></thead><tbody>
          ${d.maintenanceEvents.map((e) => `<tr><td>${fmtDateTime(e.at)}</td><td>${pill(e.kind, e.kind === 'Bakıma Gönderildi' ? 'danger' : 'indigo')}</td>
            <td>${esc(machineName(e.machineId))}</td><td>${fmtNum(e.cutsAt)}</td><td>${esc(e.user)}</td><td class="cell-sub">${esc(e.notes || '—')}</td></tr>`).join('')}
        </tbody></table></div>
      </section>`;
  },

  mount(root) {
    const paramModal = (kind, id) => {
      const d = D();
      const isOil = kind === 'oil';
      const r = (isOil ? d.oilRules : d.bladeRules).find((x) => x.id === id);
      modal({ title: isOil ? 'Yağ Parametreleri' : 'Bıçak Parametreleri',
        subtitle: 'Fabrikadan fabrikaya değişen eşikler',
        body: `<div class="form-grid">
          ${field(isOil ? 'Bir Tankta Yapılan Kesim' : 'Bıçak Ömrü (kesim)', input('limit', isOil ? r.cutsPerTank : r.maxCuts, { type: 'number', min: 1, step: 1 }))}
          ${field('Uyarı Eşiği (kesim)', input('warnAt', r.warnAt, { type: 'number', min: 1, step: 1 }))}
          ${field('Ölçüm Esası', select('cutBasis', [{ value: 'count', label: 'Kesim adedi' }, { value: 'area', label: 'Toplam kesit alanı (ileride)' }], r.cutBasis || 'count'))}
        </div><p class="micro muted" style="margin-top:10px">Kesim sayacı, Kesim Hesap Motorundaki kerf sayısından beslenir.</p>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Kaydet', kind: 'primary', onClick: (el, close) => {
            const f = formData(el);
            store.change((data) => {
              const row = (isOil ? data.oilRules : data.bladeRules).find((x) => x.id === id);
              if (isOil) { row.cutsPerTank = Number(f.limit) || 100; row.warnAt = Number(f.warnAt) || 90; row.cutBasis = f.cutBasis; }
              else { row.maxCuts = Number(f.limit) || 1200; row.warnAt = Number(f.warnAt) || 1100; row.cutBasis = f.cutBasis; }
              addActivity('Bakım eşikleri güncellendi', 'gauge');
            });
            close(); toast('Parametreler kaydedildi'); refresh();
          } }
        ] });
    };
    root.querySelectorAll('[data-oil-edit]').forEach((b) => b.addEventListener('click', () => paramModal('oil', b.dataset.oilEdit)));
    root.querySelectorAll('[data-blade-edit]').forEach((b) => b.addEventListener('click', () => paramModal('blade', b.dataset.bladeEdit)));
    root.querySelectorAll('[data-oil-fill]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.oilFill;
      store.change((d) => {
        const r = d.oilRules.find((x) => x.id === id);
        const cutsAt = r.cutsSinceFill;
        r.cutsSinceFill = 0; r.lastFillAt = nowISO();
        d.maintenanceEvents.unshift({ id: uid('ME'), kind: 'Yağ Dolumu', machineId: r.machineId, at: nowISO(), cutsAt, user: 'Siz', notes: 'Sayaç sıfırlandı' });
        d.events.push({ id: uid('EV'), seq: d.events.length + 1, lotId: '—', plantId: d.settings.activePlantId, machineId: r.machineId, type: 'MAINTENANCE', at: nowISO(), actor: 'Siz', source: 'MANUAL', grossTon: 0, deltaTon: 0, balanceTon: 0, materialId: null, fate: null, ref: id, payload: { kind: 'Yağ Dolumu', cutsAt }, note: 'Yağ tankı dolduruldu', clientId: uid('CL') });
        addActivity(`${machineName(r.machineId)} yağ dolumu yapıldı (${cutsAt} kesim)`, 'gauge');
      });
      toast('Yağ dolumu kaydedildi, sayaç sıfırlandı'); refresh();
    }));
    root.querySelectorAll('[data-blade-change]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.bladeChange;
      store.change((d) => {
        const r = d.bladeRules.find((x) => x.id === id);
        const cutsAt = r.cutsSinceChange;
        r.cutsSinceChange = 0; r.lastChangeAt = nowISO(); r.bladeNo = uid('B-');
        d.maintenanceEvents.unshift({ id: uid('ME'), kind: 'Bıçak Değişimi', machineId: r.machineId, at: nowISO(), cutsAt, user: 'Siz', notes: `Yeni bıçak ${r.bladeNo}` });
        addActivity(`${machineName(r.machineId)} bıçağı değiştirildi (${cutsAt} kesim)`, 'scissors');
      });
      toast('Yeni bıçak takıldı, ömür sayacı sıfırlandı'); refresh();
    }));
    root.querySelector('#me-new')?.addEventListener('click', () => {
      const d = D();
      modal({ title: 'Bakım Kaydı Ekle', size: 'wide',
        body: `<div class="form-grid">
          ${field('Tür', select('kind', ['Yağ Dolumu', 'Bıçak Değişimi', 'Bakıma Gönderildi', 'Yeni Bıçak Takıldı'], 'Bakıma Gönderildi'))}
          ${field('Makine', select('machineId', machinesOfType('SAW', d).map((m) => ({ value: m.id, label: m.name })), firstMachineId('SAW', d) || ''))}
          ${field('Kesim Sayacı', input('cutsAt', 0, { type: 'number', min: 0, step: 1 }))}
          ${field('Not', input('notes', '', { placeholder: 'Arıza / değişim açıklaması' }))}
        </div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Kaydet', kind: 'primary', onClick: (el, close) => {
            const f = formData(el);
            store.change((data) => {
              data.maintenanceEvents.unshift({ id: uid('ME'), kind: f.kind, machineId: f.machineId, at: nowISO(), cutsAt: Number(f.cutsAt) || 0, user: 'Siz', notes: f.notes });
              if (f.kind === 'Bakıma Gönderildi') addNotification({ type: 'warning', title: 'Bakım talebi', body: `${machineName(f.machineId)} bakıma gönderildi.`, source: 'Bakım', channel: 'sms', to: D().settings.smsNumbers || '', subject: 'Bakım talebi' });
              addActivity('Bakım kaydı eklendi', 'gauge');
            });
            close(); toast('Bakım kaydı eklendi'); refresh();
          } }
        ] });
    });
  }
};

/* ==================================================================== */
/* 5. HOMOJENİZASYON PARTİSİ                                           */
/* ==================================================================== */

export const batchesView = {
  title: 'Homojenizasyon Partisi',
  subtitle: 'Farklı döküm kodlarından karışık biyet, reçete ve süre takibi',

  render() {
    const d = D();
    const mixed = d.homogenizationBatches.filter((b) => (b.lots || []).length > 1).length;
    return `
      <div class="info-banner">${icon('flame', 18)}<span>Operatör aynı fırına <strong>farklı döküm kodlarından karışık biyet</strong> atabilir. Parti, her döküm için ayrı adet satırı taşır. Reçete 8 saat derse ve fırın 9 saat çalışırsa işlem durdurulmaz; planlanan, gerçekleşen ve sapma ayrı ayrı kaydedilir.</span></div>

      <div class="stat-strip">
        <div><span>Parti</span><strong>${d.homogenizationBatches.length}</strong></div>
        <div><span>Devam Eden</span><strong class="text-warn">${d.homogenizationBatches.filter((b) => b.status === 'Devam ediyor').length}</strong></div>
        <div><span>Süre Aşımı</span><strong class="text-danger">${d.homogenizationBatches.filter((b) => b.status === 'Süre Aşımı').length}</strong></div>
        <div><span>Karışık Parti</span><strong>${mixed}</strong></div>
        <div><span>Reçete</span><strong>${d.homogenizationRecipes.length}</strong></div>
      </div>

      <section class="card">
        <div class="toolbar"><div class="card-head" style="margin:0"><div><strong>Partiler</strong></div></div><span class="toolbar-spacer"></span>
          <button class="btn btn-primary" id="batch-new">${icon('plus', 16)} Yeni Parti Başlat</button></div>
        <div class="grid-2">${d.homogenizationBatches.map((b) => {
          const dur = durationCheck({ startedAt: b.startedAt, endedAt: b.endedAt, plannedMinutes: b.plannedMinutes, nowMs: Date.now() });
          const statusKind = b.status === 'Süre Aşımı' ? 'danger' : b.status === 'Devam ediyor' ? 'warn' : 'ok';
          return `<div class="recipe-card">
            <div class="recipe-head"><div><strong>${esc(b.code)}</strong><span class="muted"> · ${esc(machineName(b.machineId))}</span></div>${pill(b.status, statusKind)}</div>
            <div class="recipe-metrics">
              <div><span>Reçete</span><strong>${esc(recipeName(b.recipeId))}</strong></div>
              <div><span>Planlanan</span><strong>${fmtNum(b.plannedMinutes)} dk</strong></div>
              <div><span>Gerçekleşen</span><strong>${b.actualMinutes ? `${fmtNum(b.actualMinutes)} dk` : fmtNum(dur.elapsedMinutes, 0) + ' dk'}</strong></div>
              <div><span>Toplam Adet</span><strong>${fmtNum(b.totalCount)}</strong></div>
            </div>
            <div class="recipe-steps">${(b.lots || []).map((l) => `<div class="step-row"><span>${esc(l.lotId)}</span><strong>${fmtNum(l.count)} adet</strong></div>`).join('')}</div>
            <div class="toolbar" style="margin:12px 0 0"><span class="micro muted">Başlangıç ${fmtDateTime(b.startedAt)}</span><span class="toolbar-spacer"></span>
              ${b.endedAt ? '' : `<button class="btn btn-ghost btn-sm" data-batch-check="${esc(b.id)}">${icon('clock', 13)} Süreyi Kontrol Et</button>
              <button class="btn btn-primary btn-sm" data-batch-finish="${esc(b.id)}">${icon('check', 13)} Bitir</button>`}
              ${b.endedAt ? `<span class="micro muted">${esc(b.note || '')}</span>` : ''}
            </div>
          </div>`;
        }).join('')}</div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Soğutma Partileri</strong><span class="muted"> · homojenizasyon verisini devralır</span></div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Kod</th><th>Kaynak Parti</th><th>Yöntem</th><th>Hedef Sıcaklık</th><th>Başlangıç</th><th>Bitiş</th><th>Durum</th></tr></thead><tbody>
          ${d.coolingBatches.map((c) => `<tr><td class="cell-strong">${esc(c.code)}</td><td>${esc(c.batchId)}</td><td>${esc(c.method)}</td>
            <td>${fmtNum(c.targetTempC)} °C</td><td>${fmtDateTime(c.startedAt)}</td><td>${c.endedAt ? fmtDateTime(c.endedAt) : '—'}</td>
            <td>${pill(c.status, c.status === 'Tamamlandı' ? 'ok' : 'warn')}</td></tr>`).join('')}
        </tbody></table></div>
      </section>`;
  },

  mount(root) {
    root.querySelector('#batch-new')?.addEventListener('click', () => {
      const d = D();
      modal({ title: 'Yeni Homojenizasyon Partisi', subtitle: 'Farklı döküm kodlarından karışık biyet atılabilir', size: 'wide',
        body: `<div class="form-grid">
          ${field('Homojenizasyon Fırını', select('machineId', d.machines.filter((m) => ['HOMO_FURNACE', 'CONT_HOMO'].includes(m.type)).map((m) => ({ value: m.id, label: m.name })), 'MCH-10'))}
          ${field('Reçete', select('recipeId', d.homogenizationRecipes.map((r) => ({ value: r.id, label: `${r.name} · ${r.plannedMinutes} dk` })), 'HR-01'))}
        </div>
        <div class="card-divider"></div>
        <p class="micro muted">Partiye giren döküm kodları ve adetler</p>
        <div class="form-grid">
          ${field('1. Döküm Kodu', select('lot1', d.lots.map((l) => ({ value: l.id, label: l.code })), 'DK-2026-0131'))}
          ${field('1. Adet', input('cnt1', 20, { type: 'number', min: 0, step: 1 }))}
          ${field('2. Döküm Kodu', select('lot2', [{ value: '', label: 'Yok' }, ...d.lots.map((l) => ({ value: l.id, label: l.code }))], 'DK-2026-0132'))}
          ${field('2. Adet', input('cnt2', 15, { type: 'number', min: 0, step: 1 }))}
          ${field('3. Döküm Kodu', select('lot3', [{ value: '', label: 'Yok' }, ...d.lots.map((l) => ({ value: l.id, label: l.code }))], 'DK-2026-0133'))}
          ${field('3. Adet', input('cnt3', 10, { type: 'number', min: 0, step: 1 }))}
        </div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Start Ver', kind: 'primary', icon: 'play', onClick: (el, close) => {
            const f = formData(el);
            const lots = [['lot1', 'cnt1'], ['lot2', 'cnt2'], ['lot3', 'cnt3']]
              .filter(([k]) => f[k]).map(([k, c]) => ({ lotId: f[k], count: Number(f[c]) || 0 })).filter((x) => x.count > 0);
            if (!lots.length) { toast('En az bir döküm kodu ve adet gerekli', 'danger'); return; }
            store.change((data) => {
              const rec = data.homogenizationRecipes.find((r) => r.id === f.recipeId);
              const id = uid('HMB');
              data.homogenizationBatches.unshift({ id, code: uid('HMB-2026'), plantId: data.settings.activePlantId, machineId: f.machineId,
                recipeId: f.recipeId, status: 'Devam ediyor', startedAt: nowISO(), endedAt: null,
                plannedMinutes: rec?.plannedMinutes || 480, actualMinutes: null, lots,
                totalCount: lots.reduce((s, x) => s + x.count, 0), operator: 'Siz', note: 'Operatör start verdi' });
              lots.forEach((l) => data.events.push({ id: uid('EV'), seq: data.events.length + 1, lotId: l.lotId, plantId: data.settings.activePlantId, machineId: f.machineId, type: 'HOMOGEN_START', at: nowISO(), actor: 'Siz', source: 'MANUAL', grossTon: 0, deltaTon: 0, balanceTon: 0, materialId: null, fate: 'product', ref: id, payload: { batchId: id, recipeId: f.recipeId, count: l.count, plannedMinutes: rec?.plannedMinutes || 480 }, note: 'Karışık homojenizasyon partisi', clientId: uid('CL') }));
              data.inboxQueue.unshift({ id: uid('IQ'), clientId: uid('CL'), fileName: `${nowISO().slice(0, 10)}_hmb.json`, lotId: lots[0].lotId, type: 'HOMOGEN_START', status: 'pending', createdAt: nowISO(), processedAt: null, retryCount: 0, lastError: '' });
              addActivity(`Homojenizasyon partisi başlatıldı: ${lots.length} döküm kodu`, 'flame');
            });
            close(); toast('Parti başladı, süre sayacı çalışıyor'); refresh();
          } }
        ] });
    });
    root.querySelectorAll('[data-batch-check]').forEach((b) => b.addEventListener('click', () => {
      const batch = D().homogenizationBatches.find((x) => x.id === b.dataset.batchCheck);
      if (!batch) return;
      const dur = durationCheck({ startedAt: batch.startedAt, plannedMinutes: batch.plannedMinutes, nowMs: Date.now() });
      modal({ title: 'Süre Kontrolü', subtitle: batch.code,
        body: `<div class="detail-grid">
          <div class="detail-item"><span>Planlanan</span><strong>${fmtNum(dur.plannedMinutes)} dk</strong></div>
          <div class="detail-item"><span>Geçen</span><strong>${fmtNum(dur.elapsedMinutes, 0)} dk</strong></div>
          <div class="detail-item"><span>Sapma</span><strong>${fmtNum(dur.overrunMinutes, 0)} dk</strong></div>
          <div class="detail-item"><span>Durum</span><strong>${esc(dur.status)}</strong></div>
        </div><p class="detail-desc">Süre dolduğu hâlde fırın çalışıyorsa işlem durdurulmaz; HOMOGEN_OVERRUN olayı yazılır ve operatöre uyarı gider.</p>`,
        actions: [{ label: 'Kapat', onClick: (_e, close) => close() }] });
    }));
    root.querySelectorAll('[data-batch-finish]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.batchFinish;
      const batch = D().homogenizationBatches.find((x) => x.id === id);
      if (!batch) return;
      modal({ title: 'Partiyi Bitir', subtitle: `${batch.code} · planlanan ${batch.plannedMinutes} dk`,
        body: `<div class="form-grid">${field('Gerçekleşen Süre (dk)', input('actualMinutes', batch.plannedMinutes, { type: 'number', min: 1, step: 1 }))}${field('Not', input('note', batch.note || '', { placeholder: 'Gecikme nedeni' }))}</div>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Bitir & Kaydet', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            const actual = Number(f.actualMinutes) || batch.plannedMinutes;
            const over = Math.max(0, actual - batch.plannedMinutes);
            store.change((d) => {
              const x = d.homogenizationBatches.find((b2) => b2.id === id);
              x.endedAt = nowISO(); x.actualMinutes = actual; x.status = over > 0 ? 'Süre Aşımı' : 'Tamamlandı'; x.note = f.note || x.note;
              (x.lots || []).forEach((l) => d.events.push({ id: uid('EV'), seq: d.events.length + 1, lotId: l.lotId, plantId: d.settings.activePlantId, machineId: x.machineId, type: over > 0 ? 'HOMOGEN_OVERRUN' : 'HOMOGEN_END', at: nowISO(), actor: 'Siz', source: 'MANUAL', grossTon: 0, deltaTon: 0, balanceTon: 0, materialId: null, fate: 'product', ref: x.id, payload: { plannedMinutes: x.plannedMinutes, actualMinutes: actual, overrunMinutes: over }, note: `${fmtNum(actual)} dk sürdü, sapma ${fmtNum(over)} dk`, clientId: uid('CL') }));
              if (over > 0) addNotification({ type: 'warning', title: 'Homojenizasyon süre aşımı', body: `${x.code} planlanan ${x.plannedMinutes} dk yerine ${actual} dk sürdü.`, source: 'Üretim', channel: 'sms', to: d.settings.smsNumbers || '', subject: 'Homojenizasyon süre aşımı' });
              addActivity(`${x.code} tamamlandı: ${actual} dk (sapma ${over} dk)`, 'flame');
            });
            close(); toast(over > 0 ? 'Süre aşımı olaylara yazıldı, uyarı gönderildi' : 'Parti tamamlandı', over > 0 ? 'info' : 'success'); refresh();
          } }
        ] });
    }));
  }
};

/* ==================================================================== */
/* 6. OLAY & ARŞİV GÖRÜNTÜLEYİCİ                                       */
/* ==================================================================== */

export const eventsView = {
  title: 'Olay & Arşiv',
  subtitle: 'Her aşamadan bir satır: kütle dengesi zinciri ve JSON kuyruğu',

  render() {
    const d = D();
    const lots = [...new Set(d.events.map((e) => e.lotId))];
    const pending = d.inboxQueue.filter((q) => q.status === 'pending').length;
    return `
      <div class="info-banner">${icon('archive', 18)}<span>Kayıtlar tek bir büyük JSON olarak üzerine yazılmaz. Her işlem, döküm koduna bağlı <strong>bir olay satırı</strong> olarak eklenir. Kuyruk kaydı <strong>silinmez</strong>; önce arşive yazılıp doğrulanır, sonra "arşivlendi" durumuna geçer.</span></div>

      <div class="stat-strip">
        <div><span>Olay Satırı</span><strong>${d.events.length}</strong></div>
        <div><span>Döküm Kodu</span><strong>${lots.length}</strong></div>
        <div><span>Kuyrukta</span><strong class="text-warn">${pending}</strong></div>
        <div><span>Arşivlenen</span><strong class="text-ok">${d.inboxQueue.filter((q) => q.status === 'archived').length}</strong></div>
        <div><span>Hatalı</span><strong class="text-danger">${d.inboxQueue.filter((q) => q.status === 'dead').length}</strong></div>
      </div>

      <section class="card">
        <div class="toolbar">
          ${field('Döküm Kodu', select('lotId', lots.map((l) => ({ value: l, label: l })), lots[0] || '', 'id="ev-lot"'))}
          <span class="toolbar-spacer"></span>
          <button class="btn btn-ghost btn-sm" id="ev-simulate">${icon('refresh', 14)} Worker'ı Çalıştır</button>
          <button class="btn btn-ghost btn-sm" id="ev-export">${icon('download', 14)} JSONL İndir</button>
        </div>
        <div id="ev-summary"></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>#</th><th>Olay</th><th>Zaman</th><th>Kaynak</th><th>Delta</th><th>Bakiye</th><th>Akıbet</th><th>Açıklama</th></tr></thead>
          <tbody id="ev-rows"></tbody>
        </table></div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>İşlem Kuyruğu</strong><span class="muted"> · inbox / processing / archived / dead-letter</span></div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>clientId</th><th>Dosya</th><th>Tür</th><th>Döküm Kodu</th><th>Durum</th><th>Oluşturma</th><th>İşlenme</th><th>Deneme</th><th>Hata</th></tr></thead><tbody>
          ${d.inboxQueue.map((q) => `<tr><td class="cell-strong">${esc(q.clientId)}</td><td class="cell-sub">${esc(q.fileName)}</td><td>${esc(q.type)}</td><td>${esc(q.lotId)}</td>
            <td>${pill(q.status === 'archived' ? 'Arşivlendi' : q.status === 'pending' ? 'Bekliyor' : q.status === 'processing' ? 'İşleniyor' : 'Hatalı', q.status === 'archived' ? 'ok' : q.status === 'dead' ? 'danger' : 'warn')}</td>
            <td>${fmtDateTime(q.createdAt)}</td><td>${q.processedAt ? fmtDateTime(q.processedAt) : '—'}</td><td>${fmtNum(q.retryCount)}</td>
            <td class="cell-sub">${esc(q.lastError || '—')}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="micro muted" style="margin-top:10px">Dosyalama: <code>archive/YYYY/MM/{döküm kodu}/events.jsonl</code> · Worker tarama çevrimi ${fmtNum(D().settings.pollSeconds || 3)} saniye.</p>
      </section>`;
  },

  mount(root) {
    const draw = () => {
      const lotId = root.querySelector('#ev-lot')?.value;
      const rows = D().events.filter((e) => e.lotId === lotId).sort((a, b) => a.seq - b.seq);
      const tbody = root.querySelector('#ev-rows');
      tbody.innerHTML = rows.length ? rows.map((e) => `<tr>
        <td>${fmtNum(e.seq)}</td><td>${pill(e.type, e.type.includes('WARNING') || e.type.includes('OVERRUN') || e.type.includes('MISMATCH') ? 'warn' : e.type.includes('ALARM') ? 'danger' : 'indigo')}</td>
        <td>${fmtDateTime(e.at)}</td><td>${esc(e.source || '—')}</td>
        <td class="${Number(e.deltaTon) < 0 ? 'text-danger' : Number(e.deltaTon) > 0 ? 'text-ok' : ''}">${Number(e.deltaTon) > 0 ? '+' : ''}${fmtNum(e.deltaTon, 3)} t</td>
        <td><strong>${fmtNum(e.balanceTon, 3)} t</strong></td><td>${fatePill(e.fate)}</td>
        <td class="cell-sub">${esc(e.note || '—')}</td></tr>`).join('')
        : `<tr><td colspan="8">${emptyState('Bu döküm kodu için olay yok', 'archive')}</td></tr>`;
      const first = rows[0]?.balanceTon || 0;
      const last = rows[rows.length - 1]?.balanceTon || 0;
      root.querySelector('#ev-summary').innerHTML = `<div class="stat-strip">
        <div><span>Seçili Döküm</span><strong>${esc(lotId || '—')}</strong></div>
        <div><span>Satır</span><strong>${rows.length}</strong></div>
        <div><span>Başlangıç Bakiyesi</span><strong>${fmtNum(first, 3)} t</strong></div>
        <div><span>Son Bakiye</span><strong>${fmtNum(last, 3)} t</strong></div>
        <div><span>Net Değişim</span><strong class="${last < first ? 'text-danger' : ''}">${fmtNum(last - first, 3)} t</strong></div>
      </div>`;
    };
    root.querySelector('#ev-lot')?.addEventListener('change', draw);
    root.querySelector('#ev-export')?.addEventListener('click', () => {
      const lotId = root.querySelector('#ev-lot')?.value;
      const rows = D().events.filter((e) => e.lotId === lotId).sort((a, b) => a.seq - b.seq);
      downloadText(`events_${lotId || 'tum'}.jsonl`, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'application/x-ndjson');
      toast(`${rows.length} olay satırı indirildi`);
    });
    root.querySelector('#ev-simulate')?.addEventListener('click', () => {
      let n = 0;
      store.change((d) => {
        d.inboxQueue.forEach((q) => {
          if (q.status === 'pending' || q.status === 'processing') { q.status = 'archived'; q.processedAt = nowISO(); q.lastError = ''; n += 1; }
        });
        addActivity(`${n} kuyruk kaydı doğrulandı ve arşivlendi`, 'archive');
      });
      toast(n ? `${n} kayıt arşivlendi (silinmedi)` : 'Bekleyen kayıt yok', n ? 'success' : 'info'); refresh();
    });
    draw();
  }
};

/* ==================================================================== */
/* 7. PLC DURUM                                                         */
/* ==================================================================== */

const SIGNAL_LABELS = { door: 'Kapı Durumu', casting: 'Döküm Modu / Devrilme', alarm: 'Alarm', running: 'Çalışma Durumu' };
const SIGNAL_VALUES = {
  door: [{ value: 'closed', label: 'Kapalı' }, { value: 'open', label: 'Açık' }],
  casting: [{ value: 'idle', label: 'Beklemede' }, { value: 'tilting', label: 'Devrildi' }, { value: 'pouring', label: 'Döküm Yapılıyor' }],
  alarm: [{ value: 'ok', label: 'Arıza Yok' }, { value: 'fault', label: 'Arıza Var' }],
  running: [{ value: 'running', label: 'Çalışıyor' }, { value: 'stopped', label: 'Durdu' }]
};

function livePlcRender() {
  const d = D();
  const snap = liveSnapshot();
  if (!snap) return `<section class="card">${emptyState('Simülasyon bağlantısı yok. Köprüyü başlatıp Yeniden Dene deyin.', 'wifiOff')}</section>`;
  const rows = mapLiveFurnaces(snap, d.machines);
  const stats = liveStats(snap);
  return `
    <div class="stat-strip">
      <div><span>İzlenen Fırın</span><strong>${rows.length}</strong></div>
      <div><span>Alarm</span><strong class="text-danger">${stats.alarms}</strong></div>
      <div><span>Ortalama Sıcaklık</span><strong>${stats.avgTemp === null ? '—' : fmtNum(stats.avgTemp, 1) + ' °C'}</strong></div>
      <div><span>Kaynak</span><strong>SIM REST</strong></div>
      <div><span>Yenileme</span><strong>3 sn</strong></div>
    </div>
    <div class="info-banner">${icon('cpu', 18)}<span><strong>Dört sinyal kuralı korunuyor.</strong> Kapı ve döküm sinyalleri simülasyonda yayınlanmadığı için “Bilinmiyor” görünür; alarm ve çalışma durumu fırın durumundan türetilir. Sıcaklık beşinci sinyal değildir, ayrı telemetri olarak gösterilir. Bu ekran <strong>salt okunurdur</strong>.</span></div>
    ${rows.map((m) => {
      const l = m.live || {};
      const status = String(l.status || '').toUpperCase();
      const alarm = l.alarmActive || status === 'ALARM';
      const running = ['CALISIYOR', 'ISINIYOR', 'BEKLETIYOR'].includes(status);
      const values = {
        door: { label: 'Bilinmiyor', kind: 'neutral' },
        casting: { label: 'Bilinmiyor', kind: 'neutral' },
        alarm: alarm ? { label: 'Arıza Var', kind: 'danger' } : { label: 'Arıza Yok', kind: 'ok' },
        running: running ? { label: 'Çalışıyor', kind: 'ok' } : { label: 'Durdu', kind: 'neutral' }
      };
      return `<section class="card">
        <div class="card-head"><div><strong>${esc(m.name)}</strong><span class="muted"> · ${esc(m.simName || '')} · ${esc(m.id)}</span></div>${pill(statusLabel(status), statusTone(status))}</div>
        <div class="grid-2">${Object.keys(SIGNAL_LABELS).map((sig) => `<div class="data-card">
          <div class="cell-sub">${esc(SIGNAL_LABELS[sig])}</div>
          <div class="cell-strong" style="margin:6px 0">${pill(values[sig].label, values[sig].kind)}</div>
          <div class="micro muted">${sig === 'door' || sig === 'casting' ? 'Simülasyonda yayınlanmıyor' : 'Fırın durumundan türetildi'} · SIM</div>
        </div>`).join('')}</div>
        <div class="live-telemetry">
          <span>${icon('activity', 14)} Telemetri (dört sinyalden ayrı)</span>
          <strong>${l.temperatureC === null || l.temperatureC === undefined ? '—' : fmtNum(l.temperatureC, 1)} °C</strong>
          <span>hedef ${l.targetC === null || l.targetC === undefined ? '—' : fmtNum(l.targetC, 0)} °C</span>
          <span>maks ${l.maxC === null || l.maxC === undefined ? '—' : fmtNum(l.maxC, 0)} °C</span>
        </div>
      </section>`;
    }).join('')}`;
}

export const plcView = {
  title: 'PLC Durum',
  subtitle: 'Yalnızca dört temel sinyal: sade, kalabalık olmayan makine izleme',

  render() {
    if (liveEnabled()) return livePlcRender();
    const d = D();
    const machineIds = [...new Set(d.signalStates.map((s) => s.machineId))];
    const faults = d.signalStates.filter((s) => s.signal === 'alarm' && s.value === 'fault').length;
    return `
      <div class="info-banner">${icon('cpu', 18)}<span>HMI panelinde onlarca sinyal var; hepsi okunmaz. İlk fazda yalnızca <strong>kapı, döküm modu/devrilme, alarm ve çalışma durumu</strong> alınır. Alarm yalnızca "sorun var" der; ateşleyici arızası gibi ayrıntılar ilk faza alınmaz. Tag adresleri yalnızca Merkezi Yönetim ekranındadır.</span></div>

      <div class="stat-strip">
        <div><span>İzlenen Makine</span><strong>${machineIds.length}</strong></div>
        <div><span>Sinyal Kaydı</span><strong>${d.signalStates.length}</strong></div>
        <div><span>Arıza</span><strong class="text-danger">${faults}</strong></div>
        <div><span>PLC Bağlantısı</span><strong>${d.plcConnections.filter((c) => c.active).length}</strong></div>
        <div><span>Tag Eşlemesi</span><strong>${d.plcTags.length}</strong></div>
      </div>

      ${machineIds.map((mid) => {
        const machine = d.machines.find((m) => m.id === mid) || {};
        const sigs = d.signalStates.filter((s) => s.machineId === mid);
        return `<section class="card">
          <div class="card-head"><div><strong>${esc(machine.name || mid)}</strong><span class="muted"> · ${esc(plantName(machine.plantId))} · ${esc(machineType(machine.type))}</span></div>
            ${pill(machine.mode === 'PLC' ? 'PLC' : 'Manuel Giriş', machine.mode === 'PLC' ? 'cyan' : 'neutral')}</div>
          <div class="grid-2">${Object.keys(SIGNAL_LABELS).map((sig) => {
            const st = sigs.find((s) => s.signal === sig);
            const val = st?.value || '—';
            const label = (SIGNAL_VALUES[sig] || []).find((v) => v.value === val)?.label || val;
            const danger = (sig === 'alarm' && val === 'fault') || (sig === 'running' && val === 'stopped');
            const kind = danger ? 'danger' : val === 'pouring' || val === 'running' ? 'ok' : 'info';
            return `<div class="data-card">
              <div class="cell-sub">${esc(SIGNAL_LABELS[sig])}</div>
              <div class="cell-strong" style="margin:6px 0">${pill(label, kind)}</div>
              <div class="micro muted">${st ? fmtDateTime(st.at) : 'Sinyal yok'} · ${esc(st?.source || '—')}</div>
              <div class="toolbar" style="margin:10px 0 0"><span class="toolbar-spacer"></span>
                <button class="btn btn-ghost btn-sm" data-sig-edit="${esc(mid)}|${esc(sig)}">${icon('edit', 13)} Değiştir</button></div>
            </div>`;
          }).join('')}</div>
        </section>`;
      }).join('')}

      <section class="card">
        <div class="card-head"><div><strong>Çalışma Modları</strong><span class="muted"> · aynı iş mantığı, farklı veri kaynağı</span></div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Mod</th><th>Veri Kaynağı</th><th>Operatör</th><th>Bu prototipte</th></tr></thead><tbody>
          <tr><td>${pill('MANUAL', 'neutral')}</td><td>Operatör veri girişi, makineden veri alınmaz</td><td>Döküm, kesim, boy, bakım ve süreleri girer</td><td>Demo değerleriyle simüle</td></tr>
          <tr><td>${pill('PLC', 'cyan')}</td><td>OPC UA / Modbus üzerinden dört sinyal</td><td>Yalnızca makineden gelmeyen iş verilerini girer</td><td>Demo değerleriyle simüle, gerçek sürücü yok</td></tr>
        </tbody></table></div>
      </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-sig-edit]').forEach((b) => b.addEventListener('click', () => {
      const [mid, sig] = b.dataset.sigEdit.split('|');
      modal({ title: `${SIGNAL_LABELS[sig]}`, subtitle: machineName(mid),
        body: `<div class="form-grid">${field('Değer', select('value', SIGNAL_VALUES[sig], D().signalStates.find((s) => s.machineId === mid && s.signal === sig)?.value || ''))}
          ${field('Kaynak', select('source', ['PLC', 'MANUAL'], 'PLC'))}</div><p class="micro muted" style="margin-top:10px">Sade kural: dört sinyalden fazlası ilk faza alınmaz.</p>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Kaydet', kind: 'primary', onClick: (el, close) => {
            const f = formData(el);
            store.change((d) => {
              let st = d.signalStates.find((s) => s.machineId === mid && s.signal === sig);
              if (!st) { st = { id: uid('SIG'), machineId: mid, signal: sig }; d.signalStates.push(st); }
              st.value = f.value; st.source = f.source; st.at = nowISO();
              d.events.push({ id: uid('EV'), seq: d.events.length + 1, lotId: '—', plantId: d.settings.activePlantId, machineId: mid, type: `SIGNAL_${sig.toUpperCase()}`, at: nowISO(), actor: 'Siz', source: f.source, grossTon: 0, deltaTon: 0, balanceTon: 0, materialId: null, fate: null, ref: '', payload: { value: f.value }, note: `${SIGNAL_LABELS[sig]} güncellendi`, clientId: uid('CL') });
              if (sig === 'alarm' && f.value === 'fault') addNotification({ type: 'danger', title: 'Makine arızası', body: `${machineName(mid)} arıza lambası yandı.`, source: 'PLC', channel: 'sms', to: d.settings.smsNumbers || '', subject: 'Makine arızası' });
              addActivity(`${machineName(mid)} ${SIGNAL_LABELS[sig]} → ${f.value}`, 'cpu');
            });
            close(); toast('Sinyal güncellendi'); refresh();
          } }
        ] });
    }));
  }
};

/* ==================================================================== */
/* 8. MERKEZİ YÖNETİM (GELİŞTİRİCİ EKRANI)                             */
/* ==================================================================== */

export const vendorView = {
  title: 'Merkezi Yönetim',
  subtitle: 'Geliştirici ekibi için fabrika, PLC IP, tag eşleştirme ve güncelleme yönetimi',

  render() {
    const d = D();
    const tabs = ['Fabrikalar', 'PLC Bağlantıları', 'Tag Eşleştirme', 'Güncellemeler'];
    let content = '';
    if (vendorTab === 'Fabrikalar') {
      content = `<div class="table-wrap"><table class="data"><thead><tr><th>Kod</th><th>Fabrika</th><th>Şehir</th><th>Mod</th><th>Durum</th><th>Özel Kurallar</th><th></th></tr></thead><tbody>
        ${d.plants.map((p) => `<tr><td>${esc(p.code)}</td><td class="cell-strong">${esc(p.name)}</td><td>${esc(p.city || '—')}</td>
          <td>${pill(p.mode === 'PLC' ? 'PLC' : 'Manuel', p.mode === 'PLC' ? 'cyan' : 'neutral')}</td>
          <td>${pill(p.active ? 'Aktif' : 'Pasif', p.active ? 'ok' : 'warn')}</td><td class="cell-sub">${esc(p.note || '—')}</td>
          <td class="row-actions"><button class="btn btn-ghost btn-sm" data-vu-plant="${esc(p.id)}">${icon('edit', 14)}</button></td></tr>`).join('')}
      </tbody></table></div>`;
    } else if (vendorTab === 'PLC Bağlantıları') {
      content = `<div class="table-wrap"><table class="data"><thead><tr><th>Bağlantı</th><th>Fabrika</th><th>IP</th><th>Protokol</th><th>Port</th><th>Tarama</th><th>Durum</th><th></th></tr></thead><tbody>
        ${d.plcConnections.map((c) => `<tr><td class="cell-strong">${esc(c.name)}</td><td>${esc(plantName(c.plantId))}</td>
          <td><code>${esc(c.ip)}</code></td><td>${esc(c.protocol)}</td><td>${fmtNum(c.port)}</td><td>${fmtNum(c.pollSeconds)} sn</td>
          <td>${pill(c.active ? 'Açık' : 'Kapalı', c.active ? 'ok' : 'warn')}</td>
          <td class="row-actions"><button class="btn btn-ghost btn-sm" data-vu-plc="${esc(c.id)}">${icon('edit', 14)}</button></td></tr>`).join('')}
      </tbody></table></div>`;
    } else if (vendorTab === 'Tag Eşleştirme') {
      content = `<div class="table-wrap"><table class="data"><thead><tr><th>Etiket</th><th>Makine</th><th>Sinyal</th><th>PLC Adresi</th><th>Ters Mantık</th><th></th></tr></thead><tbody>
        ${d.plcTags.map((t) => `<tr><td>${esc(t.label)}</td><td>${esc(machineName(t.machineId))}</td><td>${pill(SIGNAL_LABELS[t.signal] || t.signal, 'indigo')}</td>
          <td><code>${esc(t.address)}</code></td><td>${t.invert ? 'Evet' : 'Hayır'}</td>
          <td class="row-actions"><button class="btn btn-ghost btn-sm" data-vu-tag="${esc(t.id)}">${icon('edit', 14)}</button></td></tr>`).join('')}
      </tbody></table></div>`;
    } else {
      content = `<div class="timeline">${d.vendorUpdates.map((u) => `<div class="tl-row"><span class="tl-dot"></span><div><strong>${esc(u.version)} · ${esc(u.kind)}</strong>
        <div class="micro muted">${esc(plantName(u.plantId))} · ${esc(u.appliedBy)} · ${fmtDateTime(u.at)}</div><div>${esc(u.note)}</div></div></div>`).join('')}</div>`;
    }

    return `
      <div class="info-banner">${icon('shield', 18)}<span>Bu ekran <strong>fabrika operatörü için değil, yazılımı geliştiren ekip içindir</strong>. Firma eklenir, PLC'nin IP'si ve veri adresleri yazılır, aletler eşleştirilir; gerisi kendiliğinden çalışır. Yeni ocak alındığında güncelleme uzaktan uygulanır. Adresler operatör ekranında görünmez.</span></div>

      <div class="stat-strip">
        <div><span>Fabrika</span><strong>${d.plants.length}</strong></div>
        <div><span>PLC Bağlantısı</span><strong>${d.plcConnections.length}</strong></div>
        <div><span>Tag Eşlemesi</span><strong>${d.plcTags.length}</strong></div>
        <div><span>Güncelleme</span><strong>${d.vendorUpdates.length}</strong></div>
        <div><span>Sürüm</span><strong>${esc(d.settings.version || '1.0')}</strong></div>
      </div>

      <section class="card">
        <div class="toolbar"><div class="tabs">${tabs.map((t) => `<button class="tab ${vendorTab === t ? 'active' : ''}" data-vu-tab="${esc(t)}">${esc(t)}</button>`).join('')}</div>
          <span class="toolbar-spacer"></span>
          <button class="btn btn-primary" id="vu-new">${icon('plus', 16)} ${vendorTab === 'Fabrikalar' ? 'Fabrika Ekle' : vendorTab === 'PLC Bağlantıları' ? 'Bağlantı Ekle' : vendorTab === 'Tag Eşleştirme' ? 'Tag Ekle' : 'Güncelleme Kaydet'}</button>
        </div>
        ${content}
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Uzaktan Erişim İlkesi</strong></div></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Konu</th><th>Karar</th></tr></thead><tbody>
          <tr><td>Bağlantı</td><td>WireGuard / Tailscale VPN + MFA; doğrudan IP ve açık port yok</td></tr>
          <tr><td>Yetki</td><td>Geliştirici üretim verisinde salt-okunur; konfigürasyon yazma ayrı rolde</td></tr>
          <tr><td>Güncelleme</td><td>İmzalı paket, öncesinde konfigürasyon yedeği, sürüm geçmişi ve geri alma</td></tr>
          <tr><td>Bakım hizmeti</td><td>5–10 yıl sonra yeni fırın ekleme, uzaktan yapılandırma</td></tr>
        </tbody></table></div>
      </section>`;
  },

  mount(root) {
    root.querySelectorAll('[data-vu-tab]').forEach((b) => b.addEventListener('click', () => { vendorTab = b.dataset.vuTab; refresh(); }));
    const open = (editId = null) => {
      const d = D();
      let body = '';
      if (vendorTab === 'Fabrikalar') {
        const p = editId ? d.plants.find((x) => x.id === editId) : null;
        body = `<div class="form-grid">
          ${field('Kod', input('code', p?.code || '', { required: true, placeholder: 'FIRM4' }))}
          ${field('Fabrika Adı', input('name', p?.name || '', { required: true, placeholder: 'Firma 4' }))}
          ${field('Şehir', input('city', p?.city || '', { placeholder: 'İstanbul' }))}
          ${field('Çalışma Modu', select('mode', [{ value: 'MANUAL', label: 'MANUAL · PLC yok' }, { value: 'PLC', label: 'PLC · otomatik veri' }], p?.mode || 'MANUAL'))}
        </div>${field('Özel Kurallar / Not', `<textarea class="input" name="note" rows="2">${esc(p?.note || '')}</textarea>`)}`;
      } else if (vendorTab === 'PLC Bağlantıları') {
        const c = editId ? d.plcConnections.find((x) => x.id === editId) : null;
        body = `<div class="form-grid">
          ${field('Fabrika', select('plantId', d.plants.map((p) => ({ value: p.id, label: p.name })), c?.plantId || currentPlant()))}
          ${field('Bağlantı Adı', input('name', c?.name || '', { required: true, placeholder: 'Fırın hattı PLC' }))}
          ${field('IP Adresi', input('ip', c?.ip || '192.168.1.50', { required: true }))}
          ${field('Protokol', select('protocol', ['OPC UA', 'Modbus TCP', 'S7', 'Profinet'], c?.protocol || 'OPC UA'))}
          ${field('Port', input('port', c?.port || 4840, { type: 'number', min: 1 }))}
          ${field('Tarama Çevrimi (sn)', input('pollSeconds', c?.pollSeconds || 3, { type: 'number', min: 1, max: 60 }))}
        </div>`;
      } else if (vendorTab === 'Tag Eşleştirme') {
        const t = editId ? d.plcTags.find((x) => x.id === editId) : null;
        body = `<div class="form-grid">
          ${field('PLC Bağlantısı', select('plcId', d.plcConnections.map((c) => ({ value: c.id, label: c.name })), t?.plcId || d.plcConnections[0]?.id || ''))}
          ${field('Makine', select('machineId', d.machines.map((m) => ({ value: m.id, label: m.name })), t?.machineId || ''))}
          ${field('Sinyal (yalnızca dört)', select('signal', Object.entries(SIGNAL_LABELS).map(([value, label]) => ({ value, label })), t?.signal || 'door'))}
          ${field('PLC Adresi / Tag', input('address', t?.address || '', { required: true, placeholder: 'ns=2;s=F1.DoorOpen' }))}
          ${field('Ekran Etiketi', input('label', t?.label || '', { required: true, placeholder: 'A Fırını Kapı' }))}
        </div>`;
      } else {
        body = `<div class="form-grid">
          ${field('Fabrika', select('plantId', d.plants.map((p) => ({ value: p.id, label: p.name })), currentPlant()))}
          ${field('Sürüm', input('version', d.settings.version || '1.0'))}
          ${field('Tür', select('kind', ['Makine Eklendi', 'Tag Eşlemesi', 'Modül Güncellemesi', 'Parametre Değişikliği', 'Kurulum'], 'Modül Güncellemesi'))}
        </div>${field('Açıklama', `<textarea class="input" name="note" rows="2" placeholder="Yapılan değişiklik…"></textarea>`)}`;
      }
      modal({ title: `${vendorTab} · ${editId ? 'Düzenle' : 'Yeni Kayıt'}`, subtitle: 'Bu ekranı yalnızca geliştirici ekip kullanır', size: 'wide',
        body,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Kaydet', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            store.change((data) => {
              if (vendorTab === 'Fabrikalar') {
                if (editId) Object.assign(data.plants.find((x) => x.id === editId), { code: f.code, name: f.name, city: f.city, mode: f.mode, note: f.note, active: true });
                else data.plants.push({ id: uid('P'), code: f.code, name: f.name, city: f.city, mode: f.mode, note: f.note, active: true });
              } else if (vendorTab === 'PLC Bağlantıları') {
                if (editId) Object.assign(data.plcConnections.find((x) => x.id === editId), { plantId: f.plantId, name: f.name, ip: f.ip, protocol: f.protocol, port: Number(f.port), pollSeconds: Number(f.pollSeconds), active: true });
                else data.plcConnections.push({ id: uid('PLC'), plantId: f.plantId, name: f.name, ip: f.ip, protocol: f.protocol, port: Number(f.port), pollSeconds: Number(f.pollSeconds), active: true });
              } else if (vendorTab === 'Tag Eşleştirme') {
                if (editId) Object.assign(data.plcTags.find((x) => x.id === editId), { plcId: f.plcId, machineId: f.machineId, signal: f.signal, address: f.address, label: f.label, invert: false });
                else data.plcTags.push({ id: uid('TAG'), plcId: f.plcId, machineId: f.machineId, signal: f.signal, address: f.address, label: f.label, invert: false });
              } else {
                data.vendorUpdates.unshift({ id: uid('VU'), plantId: f.plantId, version: f.version, kind: f.kind, note: f.note, appliedBy: 'Max', at: nowISO() });
              }
              addActivity(`Merkezi yönetim: ${vendorTab} kaydı ${editId ? 'güncellendi' : 'eklendi'}`, 'shield');
            });
            close(); toast('Merkezi yapılandırma kaydedildi'); refresh();
          } }
        ] });
    };
    root.querySelector('#vu-new')?.addEventListener('click', () => open(null));
    root.querySelectorAll('[data-vu-plant],[data-vu-plc],[data-vu-tag]').forEach((b) => b.addEventListener('click', () => {
      open(b.dataset.vuPlant || b.dataset.vuPlc || b.dataset.vuTag);
    }));
  }
};
