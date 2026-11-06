// Saha kurulum sihirbazı ve modül kaydı (v4 / docs/12).
// Bu iki ekran geliştirici ekibinin merkezi yönetim alanıdır; operatör ekranı değildir.

import {
  D, store, uid, nowISO, addActivity, addNotification, activePlantId
} from '../store.js';
import { icon } from '../icons.js';
import {
  esc, fmtNum, fmtDateTime, pill, field, input, select, formData,
  modal, toast, downloadText, emptyState
} from '../ui.js';
import {
  MODULES, MACHINE_TYPES, FOUR_SIGNALS, defaultEnabledMap, defaultSetupDraft,
  buildPlantPackage, validatePackage, applyPlantPackage, setupMachinesFromDraft,
  idFactory, isModuleEnabled, visibleNav, machineRefs
} from '../modularity.js';
import { ADAPTERS, testConnection, readFourSignals } from '../adapters.js';
import { NAV } from './nav.js';

const refresh = () => window.App.refresh();
const TYPE_LABEL = {
  FURNACE: 'Ergitme Ocağı', CAST_TABLE: 'Döküm Tablası', SAW: 'Testere',
  HOMO_FURNACE: 'Homojenizasyon Fırını', CONT_HOMO: 'Sürekli Homojenizasyon', ROTARY: 'Döner Ocak'
};
const STEPS = [
  { n: 1, label: 'Fabrika Kartı', note: 'Kod, ad, şehir, çalışma modu' },
  { n: 2, label: 'Makine Parkı', note: 'Tip başına adet ve kapasite' },
  { n: 3, label: 'Döküm Yolları', note: 'Ocak → tabla, yolluk tonajı' },
  { n: 4, label: 'PLC / Bağlantı', note: 'Adaptör, tag, bağlantı testi' },
  { n: 5, label: 'Modüller ve Doğrulama', note: 'Açılacak ekranlar ve özet' }
];

const draftOf = (d = D()) => d.setupDrafts?.[0] || defaultSetupDraft(d);
const stepOf = (d = D()) => Number(draftOf(d).step) || 1;

function saveDraft(patch, step) {
  store.change((d) => {
    if (!d.setupDrafts?.length) d.setupDrafts.push(defaultSetupDraft(d));
    const dr = d.setupDrafts[0];
    Object.assign(dr.values, patch);
    if (step) dr.step = step;
    dr.updatedAt = nowISO();
  });
}
function setStep(n) {
  store.change((d) => {
    if (!d.setupDrafts?.length) d.setupDrafts.push(defaultSetupDraft(d));
    d.setupDrafts[0].step = Math.max(1, Math.min(STEPS.length, n));
  });
  refresh();
}

/** Sihirbazın son adımı: bütün kurulum tek bir store.change içinde oluşur. */
function createPlant(v) {
  const d0 = D();
  const counts = v.counts || {};
  if (!v.code || !v.name) { toast('Fabrika kodu ve adı zorunludur', 'danger'); return; }
  if (!Number(counts.FURNACE)) { toast('En az bir ergitme ocağı gerekli', 'danger'); return; }
  if (d0.plants.some((p) => p.code === v.code)) { toast('Bu fabrika kodu zaten kullanılıyor', 'danger'); return; }

  let summary;
  store.change((d) => {
    const fresh = idFactory(d);
    const pid = fresh('P');
    const mode = v.mode === 'PLC' ? 'PLC' : 'MANUAL';
    d.plants.push({ id: pid, code: v.code, name: v.name, city: v.city || '—', mode,
      active: true, note: v.note || 'Saha kurulum sihirbazı ile oluşturuldu' });

    const machines = [];
    MACHINE_TYPES.forEach((type) => {
      const n = Math.max(0, Number(counts[type]) || 0);
      const caps = (v.defaultCapacity || {});
      for (let i = 1; i <= n; i += 1) {
        machines.push({
          id: fresh('MCH'), plantId: pid, type,
          name: `${TYPE_LABEL[type]} ${i}`, capacityTon: Number(caps[type]) || 0,
          mode, plcId: null, active: true, status: 'Aktif',
          decommissionedAt: null, decommissionReason: '',
          installedAt: nowISO().slice(0, 10)
        });
      }
    });
    d.machines.push(...machines);

    const furnaces = machines.filter((m) => m.type === 'FURNACE');
    const tables = machines.filter((m) => m.type === 'CAST_TABLE');
    const paths = [];
    furnaces.forEach((f, i) => tables.forEach((t, j) => {
      paths.push({ id: fresh('CP'), plantId: pid, fromMachineId: f.id, tableId: t.id,
        label: `${f.name} → ${t.name}`, holdTon: Number(v.holdTon) || 1,
        note: `Sihirbaz: ${f.name}, ${t.name} · ${i + 1}/${j + 1}` });
    }));
    d.castingPaths.push(...paths);

    let plc = null;
    const tags = [];
    if (mode === 'PLC') {
      const c = v.connection || {};
      plc = { id: fresh('PLC'), plantId: pid, name: c.name || 'Fırın hattı PLC',
        ip: c.ip || '192.168.1.50', protocol: c.protocol || 'OPC UA',
        port: Number(c.port) || 4840, pollSeconds: Number(c.pollSeconds) || 3,
        adapter: c.adapter || 'simulated', active: true };
      d.plcConnections.push(plc);
      FOUR_SIGNALS.forEach((signal, i) => {
        const m = machines[i % machines.length];
        tags.push({ id: fresh('TAG'), plcId: plc.id, machineId: m.id, signal,
          address: `${c.ip || '192.168.1.50'}:${signal}`, invert: false,
          label: `${m.name} · ${signal}` });
      });
      d.plcTags.push(...tags);
      machines.forEach((m) => { m.plcId = plc.id; });
      d.signalStates.push(...FOUR_SIGNALS.map((signal) => ({
        id: fresh('SIG'), machineId: tags.find((t) => t.signal === signal)?.machineId || null,
        plantId: pid, signal, value: signal === 'alarm' ? 'ok' : '—', at: nowISO(), source: 'MANUAL'
      })));
    }

    const enabled = { ...defaultEnabledMap(d.moduleRegistry) };
    Object.keys(enabled).forEach((k) => { if (v.modules && typeof v.modules[k] !== 'undefined') enabled[k] = !!v.modules[k]; });
    enabled.PLC = mode === 'PLC';
    enabled.CORE = true; enabled.VENDOR = true;
    d.plantModules.push({ id: fresh('PM'), plantId: pid, enabled, note: 'Saha kurulum sihirbazı' });
    d.settings.activePlantId = pid;
    d.vendorUpdates.unshift({ id: fresh('VU'), plantId: pid, version: d.settings.version || '1.2',
      kind: 'Kurulum', note: `${v.name}: ${machines.length} makine, ${paths.length} döküm yolu, ${tags.length} PLC tag`,
      appliedBy: 'Max', at: nowISO() });
    if (d.setupDrafts?.length) { d.setupDrafts[0] = defaultSetupDraft(d); d.setupDrafts[0].step = 1; }
    addActivity(`${v.name} kuruldu: ${furnaces.length} fırın, ${machines.length} makine`, 'cpu');
    addNotification({ type: 'success', title: 'Fabrika profili oluşturuldu',
      body: `${v.code} · ${machines.length} makine · ${paths.length} yol · ${mode}`, source: 'Kurulum' });
    summary = { pid, machines: machines.length, furnaces: furnaces.length, paths: paths.length, tags: tags.length, mode };
  });
  toast(`${summary.machines} makine, ${summary.paths} döküm yolu kuruldu`, 'success');
  // Aktif fabrika değiştiği için sol menü de yeni modül haritasıyla yeniden çizilir.
  window.App.renderShell();
  window.App.navigate('machines');
}

/* ==================================================================== */
/* 1. KURULUM SİHİRBAZI                                                 */
/* ==================================================================== */

export const setupView = {
  title: 'Saha Kurulum Sihirbazı',
  subtitle: 'Fabrikaya git, parkı say, yolları bağla, modülleri seç — aynı yazılım, farklı fabrika',

  render() {
    const d = D();
    const dr = draftOf(d);
    const v = dr.values || defaultSetupDraft(d).values;
    const step = stepOf(d);
    const planned = setupMachinesFromDraft(dr);
    const furnaces = planned.filter((m) => m.type === 'FURNACE').length;
    const tables = planned.filter((m) => m.type === 'CAST_TABLE').length;
    const pathCount = furnaces * tables;
    const test = v.lastTest;

    return `
      <div class="info-banner">${icon('cpu', 18)}<span><strong>Amaç:</strong> gerçek bir fabrikaya gidildiğinde yazılımı koda dokunmadan bağlamak. Kurulumun tamamı veridir: fabrika kartı, makine tipleri, makineler, döküm yolları, PLC eşlemesi ve açık modüller. Beş fırınlı fabrika ile tek fırınlı fabrika aynı ekranlardan kurulur.</span></div>

      <section class="card">
        <div class="card-head"><div><strong>Kurulum Adımları</strong><p class="muted">Her adım kaydedilir; yarım kalan kurulum kaldığı yerden devam eder</p></div>
          <span class="card-tag">${step} / ${STEPS.length}</span></div>
        <div class="wizard-steps">${STEPS.map((s) => `
          <button class="wizard-step ${s.n === step ? 'current' : ''} ${s.n < step ? 'done' : ''}" data-step="${s.n}">
            <span class="wizard-num">${s.n < step ? '✓' : s.n}</span>
            <span><strong>${esc(s.label)}</strong><small>${esc(s.note)}</small></span>
          </button>`).join('')}</div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>${esc(STEPS[step - 1].label)}</strong><p class="muted">${esc(STEPS[step - 1].note)}</p></div>
          <span class="card-tag">Adım ${step}</span></div>
        ${step === 1 ? `
          <div class="form-grid" id="wizard-form">
            ${field('Fabrika Kodu *', input('code', v.code || '', { required: true, placeholder: 'Örn. FIRM4' }))}
            ${field('Fabrika Adı *', input('name', v.name || '', { required: true, placeholder: 'Örn. Ege Alüminyum A.Ş.' }))}
            ${field('Şehir', input('city', v.city || '', { placeholder: 'Örn. İzmir' }))}
            ${field('Çalışma Modu', select('mode', [{ value: 'MANUAL', label: 'MANUAL · operatör veri girer' }, { value: 'PLC', label: 'PLC · otomatik okunur' }], v.mode || 'MANUAL'))}
            ${field('Saha Notu', input('note', v.note || '', { placeholder: 'Örn. 1 fırın var, PLC yok' }))}
          </div>` : ''}
        ${step === 2 ? `
          <p class="micro muted">Sahada sayılan makineleri girin. Sabit kapasite varsayılandır, kurulumdan sonra Makine Parkı ekranından düzenlenir. <strong>Fırın sayısını 1 veya 2 yapmak kod değişikliği gerektirmez.</strong></p>
          <div class="table-wrap"><table class="data" id="wizard-form"><thead><tr><th>Makine Tipi</th><th>Adet</th><th>Varsayılan Kapasite (ton / hat)</th><th>Oluşacak Makine</th></tr></thead>
            <tbody>${MACHINE_TYPES.map((t) => `<tr>
              <td class="cell-strong">${esc(TYPE_LABEL[t])}<div class="cell-sub">${esc(t)}</div></td>
              <td>${input(`count_${t}`, (v.counts || {})[t] ?? 0, { type: 'number', min: 0, step: 1 })}</td>
              <td>${input(`cap_${t}`, (v.defaultCapacity || {})[t] ?? 0, { type: 'number', min: 0, step: 1 })}</td>
              <td class="cell-sub">${(v.counts || {})[t] || 0} adet</td>
            </tr>`).join('')}</tbody></table></div>` : ''}
        ${step === 3 ? `
          <div class="form-grid" id="wizard-form">
            ${field('Yollukta Tutulan Metal (ton)', input('holdTon', v.holdTon ?? 1, { type: 'number', min: 0, step: 0.1 }))}
          </div>
          <div class="stat-strip">
            <div><span>Fırın</span><strong>${furnaces}</strong></div>
            <div><span>Tabla</span><strong>${tables}</strong></div>
            <div><span>Oluşacak Yol</span><strong class="text-ok">${pathCount}</strong></div>
            <div><span>Toplam Makine</span><strong>${planned.length}</strong></div>
          </div>
          <p class="micro muted">${pathCount ? `Her fırın için ${tables} tabla yolu oluşturulur; yolluk tonajı partinin başında düşülür (docs/09).` : 'En az bir fırın ve bir tabla gerekli.'}</p>` : ''}
        ${step === 4 ? `
          <div class="info-banner">${icon('alert', 17)}<span>Gerçek PLC sürücüsü sonraki aşamada takılır. Bu adımda <strong>adaptör sözleşmesi</strong> ve dört sinyal doğrulanır; sürücü yoksa sistem otomatik olarak MANUAL moda düşer ve üretim durmaz. Mod MANUAL ise bu adım atlanabilir.</span></div>
          <div class="form-grid" id="wizard-form">
            ${field('Adaptör', select('adapter', ADAPTERS.map((a) => ({ value: a.code, label: `${a.label}${a.implemented ? ' · hazır' : ' · sözleşme'}` })), v.connection?.adapter || 'simulated'))}
            ${field('Bağlantı Adı', input('conn_name', v.connection?.name || 'Fırın hattı PLC'))}
            ${field('IP Adresi', input('conn_ip', v.connection?.ip || '192.168.1.50'))}
            ${field('Protokol', select('conn_protocol', ['OPC UA', 'Modbus TCP', 'Yerel'], v.connection?.protocol || 'OPC UA'))}
            ${field('Port', input('conn_port', v.connection?.port ?? 4840, { type: 'number', min: 1 }))}
            ${field('Polling (sn)', input('conn_poll', v.connection?.pollSeconds ?? 3, { type: 'number', min: 1 }))}
          </div>
          <div class="toolbar" style="margin-top:12px">
            <button class="btn btn-primary" id="wizard-test">${icon('wifi', 16)} Bağlantıyı Test Et</button>
            <button class="btn btn-ghost" id="wizard-read">${icon('activity', 16)} Dört Sinyali Oku</button>
          </div>
          ${test ? `<div class="card-divider"></div><div class="micro"><strong>Son test:</strong> ${esc(test.message || '')} · ${esc(test.adapterLabel || '')} · ${test.tagCount ?? 0} tag · ${esc(test.mode || '')}</div>` : ''}` : ''}
        ${step === 5 ? `
          <p class="micro muted">Bu fabrikada açılacak modüller. Kapalı modülün menüsü, kuralları ve ekranları görünmez; veri silinmez, yeniden açılabilir.</p>
          <div class="form-grid" id="wizard-form">
            ${MODULES.map((m) => `<label class="check-row"><input type="checkbox" name="mod_${esc(m.code)}" ${v.modules?.[m.code] !== false ? 'checked' : ''}>
              <span><strong>${esc(m.label)}</strong><small>${esc(m.note)} · ${m.views.length} ekran</small></span></label>`).join('')}
          </div>
          <div class="card-divider"></div>
          <div class="stat-strip">
            <div><span>Fabrika</span><strong>${esc(v.code || '—')}</strong></div>
            <div><span>Fırın</span><strong>${furnaces}</strong></div>
            <div><span>Makine</span><strong>${planned.length}</strong></div>
            <div><span>Döküm Yolu</span><strong>${pathCount}</strong></div>
            <div><span>Mod</span><strong>${esc(v.mode || 'MANUAL')}</strong></div>
          </div>
          <div class="info-banner" style="margin-top:12px">${icon('check', 17)}<span>Doğrulama: fabrika kodu benzersiz, en az bir fırın var, makine tipleri kayıtlı, yollar geçerli, modül kaydı tam. <strong>Profili Oluştur</strong> ile tek işlemde uygulanır.</span></div>` : ''}
        <div class="toolbar" style="margin-top:16px">
          ${step > 1 ? `<button class="btn btn-ghost" id="wizard-prev">${icon('arrow', 15)} Geri</button>` : ''}
          <span class="toolbar-spacer"></span>
          ${step < STEPS.length ? `<button class="btn btn-primary" id="wizard-next">${icon('check', 16)} Kaydet ve Devam Et</button>`
            : `<button class="btn btn-primary" id="wizard-finish">${icon('play', 16)} Profili Oluştur</button>`}
        </div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Fabrika Profil Paketleri</strong><p class="muted">İndir, başka sahada içe al veya fırın sayısını değiştirerek kopyala</p></div></div>
        <div class="form-grid">
          ${field('Kaynak Fabrika', select('pkg-plant', d.plants.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })), activePlantId(d), 'id="pkg-plant"'))}
          ${field('Kopya Fırın Sayısı', input('pkg-furnaces', '', { type: 'number', min: 1, step: 1, placeholder: 'Boş = aynı sayı' }))}
        </div>
        <div class="toolbar" style="margin-top:12px">
          <button class="btn btn-ghost" id="pkg-download">${icon('download', 15)} Paketi İndir</button>
          <button class="btn btn-ghost" id="pkg-clone">${icon('plus', 15)} Kopyala ve Uygula</button>
          <button class="btn btn-ghost" id="pkg-import">${icon('upload', 15)} JSON İçe Al</button>
          <span class="toolbar-spacer"></span>
          <span class="micro muted">${d.profilePackages.length} kayıtlı örnek paket</span>
        </div>
        <div class="table-wrap" style="margin-top:14px"><table class="data">
          <thead><tr><th>Paket</th><th>Fabrika</th><th>Makine</th><th>Fırın</th><th>Tarih</th></tr></thead>
          <tbody>${d.profilePackages.map((p) => `<tr><td class="cell-strong">${esc(p.code)}</td><td>${esc(p.name)}</td>
            <td>${p.machineCount}</td><td>${p.furnaceCount}</td><td class="cell-sub">${esc(p.createdAt?.slice(0, 10) || '')}</td></tr>`).join('')}</tbody></table></div>
      </section>`;
  },

  mount(root) {
    const d = D();
    const dr = draftOf(d);
    const step = stepOf(d);

    root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => setStep(Number(b.dataset.step))));

    const collect = () => {
      const f = formData(root.querySelector('#wizard-form'));
      if (step === 1) return { code: f.code, name: f.name, city: f.city, mode: f.mode, note: f.note };
      if (step === 2) {
        const counts = {}, defaultCapacity = {};
        MACHINE_TYPES.forEach((t) => { counts[t] = Number(f[`count_${t}`]) || 0; defaultCapacity[t] = Number(f[`cap_${t}`]) || 0; });
        return { counts, defaultCapacity };
      }
      if (step === 3) return { holdTon: Number(f.holdTon) || 1 };
      if (step === 4) return { connection: {
        adapter: f.adapter, name: f.conn_name, ip: f.conn_ip, protocol: f.conn_protocol,
        port: Number(f.conn_port) || 4840, pollSeconds: Number(f.conn_poll) || 3
      } };
      if (step === 5) {
        const modules = {};
        MODULES.forEach((m) => { modules[m.code] = !!f[`mod_${m.code}`]; });
        return { modules };
      }
      return {};
    };

    root.querySelector('#wizard-next')?.addEventListener('click', () => {
      saveDraft(collect(), step + 1);
      refresh(); toast(`Adım ${step} kaydedildi`, 'info');
    });
    root.querySelector('#wizard-prev')?.addEventListener('click', () => { saveDraft(collect()); setStep(step - 1); });
    root.querySelector('#wizard-finish')?.addEventListener('click', () => {
      const patch = collect();
      saveDraft(patch);
      createPlant({ ...draftOf().values, ...patch });
    });

    root.querySelector('#wizard-test')?.addEventListener('click', () => {
      const f = formData(root.querySelector('#wizard-form'));
      const c = { mode: dr.values.mode, ip: f.conn_ip, port: f.conn_port, protocol: f.conn_protocol };
      const tags = FOUR_SIGNALS.map((signal) => ({ signal, machineId: null, address: `${f.conn_ip}:${signal}` }));
      const res = testConnection({ connection: c, tags, adapterCode: f.adapter });
      saveDraft({ lastTest: res, connection: { adapter: f.adapter, name: f.conn_name, ip: f.conn_ip,
        protocol: f.conn_protocol, port: Number(f.conn_port) || 4840, pollSeconds: Number(f.conn_poll) || 3 } });
      toast(res.ok ? 'Bağlantı doğrulandı, dört sinyal hazır' : res.message, res.ok ? 'success' : 'info');
      refresh();
    });
    root.querySelector('#wizard-read')?.addEventListener('click', () => {
      const rows = readFourSignals({ connection: { protocol: dr.values.connection?.protocol }, tags: FOUR_SIGNALS.map((signal) => ({ signal })) });
      modal({ title: 'Dört Sinyal Okuması', subtitle: 'Adaptör sözleşmesi · connect / test / readFourSignals / disconnect', size: 'wide',
        body: `<div class="table-wrap"><table class="data"><thead><tr><th>Sinyal</th><th>Değer</th><th>Adres</th><th>Kaynak</th></tr></thead>
          <tbody>${rows.map((r) => `<tr><td class="cell-strong">${esc(r.signal)}</td><td>${esc(r.value)}</td><td class="cell-sub">${esc(r.address)}</td><td>${esc(r.source)}</td></tr>`).join('')}</tbody></table></div>`,
        actions: [{ label: 'Kapat', onClick: (_e, close) => close() }] });
    });

    const sourceId = () => root.querySelector('#pkg-plant')?.value || activePlantId(D());
    root.querySelector('#pkg-download')?.addEventListener('click', () => {
      const pkg = buildPlantPackage(D(), sourceId());
      if (!pkg) return;
      downloadText(`${pkg.code}-fabrika-profili.json`, JSON.stringify(pkg, null, 2));
      toast('Profil paketi indirildi');
    });
    root.querySelector('#pkg-clone')?.addEventListener('click', () => {
      const pkg = buildPlantPackage(D(), sourceId());
      const limit = root.querySelector('[name="pkg-furnaces"]')?.value || '';
      modal({ title: 'Profili Kopyala ve Uygula', subtitle: `${pkg.name} · ${limit ? `${limit} fırın` : 'aynı fırın sayısı'}`,
        body: `<div class="form-grid">
          ${field('Yeni Fabrika Kodu', input('clone_code', `${pkg.plant.code}-YENİ`, { required: true }))}
          ${field('Yeni Fabrika Adı', input('clone_name', `${pkg.plant.name} · kopya`, { required: true }))}
          ${field('Fırın Sayısı', input('clone_furnaces', limit || pkg.machines.filter((m) => m.type === 'FURNACE').length, { type: 'number', min: 1 }))}
        </div><p class="micro muted" style="margin-top:10px">Örnek: 5 fırınlı profili 1 fırın olarak uygula. Kullanılmayan fırınlara bağlı yollar otomatik atlanır; hiçbir mevcut kayıt değiştirilmez.</p>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Uygula', kind: 'primary', icon: 'check', onClick: (el, close) => {
            const f = formData(el);
            store.change((data) => {
              try {
                const out = applyPlantPackage(data, pkg, { code: f.clone_code, name: f.clone_name, furnaceCount: f.clone_furnaces });
                addActivity(`${f.clone_name} profili uygulandı: ${out.machineCount} makine`, 'cpu');
                addNotification({ type: 'success', title: 'Fabrika profili kopyalandı', body: `${f.clone_code} · ${out.furnaceCount} fırın · ${out.pathCount} yol`, source: 'Kurulum' });
              } catch (err) { toast(err.message, 'danger'); }
            });
            close(); window.App.renderShell(); toast('Fabrika profili uygulandı');
          } }
        ] });
    });
    root.querySelector('#pkg-import')?.addEventListener('click', () => {
      modal({ title: 'Profil Paketini İçe Al', subtitle: 'JSON paketini yapıştırın; doğrulandıktan sonra yeni fabrika olarak uygulanır', size: 'wide',
        body: `${field('Paket JSON', `<textarea class="input" name="pkg_json" rows="12" placeholder='{"kind":"erp-plant-profile", ...}'></textarea>`)}
          <p class="micro muted">Eşik: kind, schemaVersion 4, fabrika kartı, makine tipleri, makineler ve geçerli döküm yolları.</p>`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Doğrula ve Uygula', kind: 'primary', icon: 'upload', onClick: (el, close) => {
            const f = formData(el);
            let pkg = null;
            try { pkg = JSON.parse(f.pkg_json); } catch { toast('Geçerli JSON değil', 'danger'); return; }
            const check = validatePackage(pkg);
            if (!check.ok) { toast(check.errors[0], 'danger'); return; }
            store.change((data) => {
              try {
                const out = applyPlantPackage(data, pkg, { code: `${pkg.plant.code}-ICE`, name: `${pkg.name} · içe alındı` });
                addActivity(`${out.machineCount} makinelik profil içe alındı`, 'upload');
              } catch (err) { toast(err.message, 'danger'); }
            });
            close(); window.App.renderShell(); toast('Paket doğrulandı ve uygulandı');
          } }
        ] });
    });
  }
};

/* ==================================================================== */
/* 2. MODÜL KAYDI                                                       */
/* ==================================================================== */

export const modulesView = {
  title: 'Modül Kaydı',
  subtitle: 'Hangi fabrikada hangi ekranların açık olduğunu veri olarak yönet',

  render() {
    const d = D();
    const registry = d.moduleRegistry?.length ? d.moduleRegistry : MODULES;
    const pid = activePlantId(d);
    const plant = d.plants.find((p) => p.id === pid);
    const rec = d.plantModules.find((x) => x.plantId === pid);
    const visible = visibleNav(NAV, d);
    const visibleCount = visible.reduce((n, g) => n + g.items.length, 0);
    const hidden = NAV.flatMap((g) => g.items).length - visibleCount;
    return `
      <div class="info-banner">${icon('grid', 18)}<span><strong>Modül kaydı bir veri tablosudur.</strong> Menü, entegrasyon kuralları ve ekranlar bu kayda bakar. Bir modülü kapatmak veriyi silmez; yalnızca o fabrikada görünürlüğü kapatır. Yeni bir modül eklemek kayda bir satır eklemektir, menüyı elle düzenlemek değildir.</span></div>

      <section class="card">
        <div class="toolbar">
          ${field('Fabrika', select('mod-plant', d.plants.map((p) => ({ value: p.id, label: `${p.code} · ${p.name} · ${p.mode}` })), pid, 'id="mod-plant"'))}
          <span class="toolbar-spacer"></span>
          <span class="card-tag">${esc(plant?.code || '—')}</span>
        </div>
        <div class="stat-strip">
          <div><span>Modül</span><strong>${registry.length}</strong></div>
          <div><span>Açık Ekran</span><strong class="text-ok">${visibleCount}</strong></div>
          <div><span>Gizli Ekran</span><strong class="text-warn">${hidden}</strong></div>
          <div><span>Çalışma Modu</span><strong>${esc(plant?.mode || '—')}</strong></div>
          <div><span>Son Güncelleme</span><strong class="cell-sub">${esc(rec?.note || '—')}</strong></div>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Kayıtlı Modüller</strong><p class="muted">Gereksinim koşulu olan modüller yalnızca koşul sağlanırsa menüde görünür</p></div>
          <button class="btn btn-primary" id="mod-save">${icon('save', 16)} Değişiklikleri Kaydet</button></div>
        <div class="table-wrap"><table class="data" id="mod-form">
          <thead><tr><th>Modül</th><th>Grup</th><th>Ekran</th><th>Gereksinim</th><th>Durum</th><th>Açıklama</th></tr></thead>
          <tbody>${registry.map((m) => `<tr>
            <td class="cell-strong">${esc(m.label)}<div class="cell-sub">${esc(m.code)}</div></td>
            <td>${esc(m.group)}</td>
            <td>${m.views.length}</td>
            <td>${m.requiresMachineType ? pill(m.requiresMachineType, 'cyan') : m.requiresMode ? pill(m.requiresMode, 'cyan') : pill('Yok', 'neutral')}</td>
            <td><label class="check-row compact"><input type="checkbox" name="mod_${esc(m.code)}" ${isModuleEnabled(d, m.code, registry, pid) ? 'checked' : ''} ${m.code === 'CORE' || m.code === 'VENDOR' ? 'disabled' : ''}><span>${isModuleEnabled(d, m.code, MODULES, pid) ? 'Açık' : 'Kapalı'}</span></label></td>
            <td class="cell-sub">${esc(m.note)}</td>
          </tr>`).join('')}</tbody></table></div>
      </section>

      <section class="card">
        <div class="card-head"><div><strong>Aktif Menü Önizlemesi</strong><p class="muted">Kaydedildiğinde sol menü bu listeye göre çizilir</p></div></div>
        <div class="grid-3">${visible.map((g) => `<div class="data-card"><div class="cell-strong">${esc(g.group)}</div>
          <div class="cell-sub">${g.items.map((i) => esc(i.label)).join(' · ')}</div></div>`).join('')}</div>
      </section>`;
  },

  mount(root) {
    let pid = activePlantId(D());
    root.querySelector('#mod-plant')?.addEventListener('change', (e) => {
      pid = e.target.value;
      store.change((d) => { d.settings.activePlantId = pid; });
      window.App.renderShell();
    });
    root.querySelector('#mod-save')?.addEventListener('click', () => {
      const f = formData(root.querySelector('#mod-form'));
      const enabled = {};
      const registry = D().moduleRegistry?.length ? D().moduleRegistry : MODULES;
      registry.forEach((m) => { enabled[m.code] = m.code === 'CORE' || m.code === 'VENDOR' ? true : !!f[`mod_${m.code}`]; });
      store.change((d) => {
        let rec = d.plantModules.find((x) => x.plantId === pid);
        if (!rec) { rec = { id: uid('PM'), plantId: pid, enabled, note: 'Modül kaydı ekranından güncellendi' }; d.plantModules.push(rec); }
        else { rec.enabled = enabled; rec.note = 'Modül kaydı ekranından güncellendi'; }
        d.vendorUpdates.unshift({ id: uid('VU'), plantId: pid, version: d.settings.version || '1.2',
          kind: 'Modül Değişikliği', note: `${Object.values(enabled).filter(Boolean).length} modül açık`, appliedBy: 'Max', at: nowISO() });
        addActivity(`${d.plants.find((p) => p.id === pid)?.code || pid} modül kaydı güncellendi`, 'grid');
      });
      window.App.renderShell(); toast('Modül kaydı kaydedildi, menü güncellendi');
    });
  }
};
