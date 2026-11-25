/* ERP Edge Collector — yerel arayüz. Dış bağımlılık yok, tüm istekler göreli URL ile. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (iso) => (iso || '—').replace('T', ' ').slice(5, 19);
let state = { status: {}, latest: [], events: [], logs: [], runs: [], outbox: [], schema: [], config: {}, profile: {}, adapters: [] };
let activeTab = 'overview';

async function api(path, body) {
  const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
  const r = await fetch(path, opt);
  return r.json();
}
function toast(msg, bad = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (bad ? ' bad' : ''); el.textContent = msg;
  $('#toast').appendChild(el); setTimeout(() => el.remove(), 3600);
}
const badge = (text, kind = '') => `<span class="badge ${kind}">${esc(text)}</span>`;
const pill = (text, cls = '') => `<span class="sig ${cls}">${esc(text)}</span>`;

/* ----------------------------- sekmeler ----------------------------- */
$$('#nav .nav').forEach((b) => b.addEventListener('click', () => {
  activeTab = b.dataset.tab;
  $$('#nav .nav').forEach((x) => x.classList.toggle('active', x === b));
  $$('.tab').forEach((x) => x.classList.toggle('active', x.id === 'tab-' + activeTab));
}));

/* ----------------------------- açılır menü ----------------------------- */
function setChip(id, text, kind = '') { const e = $(id); e.textContent = text; e.className = 'chip' + (kind ? ' ' + kind : ''); }

function renderStatus(s) {
  if (!s || !s.site) return;
  $('#version').textContent = s.version || '—';
  $('#sql-file').textContent = (s.site.sqlPath || '').split('/').pop();
  $('#adapter-mode').textContent = s.erp?.adapter || '—';
  $('#site-title').textContent = s.site.name || 'Saha Bilgisayarı';
  $('#site-sub').textContent = `${s.site.code} · ${s.collector?.profile || 'Profil yok'} · ${s.collector?.plantId || '—'}`;
  const c = s.collector || {}, q = (s.sql || {});
  setChip('#chip-collector', c.running ? (c.paused ? 'Toplayıcı · Duraklatıldı' : `Toplayıcı · #${c.cycle}`) : 'Toplayıcı · Durduruldu', c.running ? (c.paused ? 'warn' : 'ok') : 'danger');
  setChip('#chip-plc', c.fallback ? 'PLC · MANUAL yedek' : `PLC · ${s.erp?.adapter || '—'}`, c.fallback ? 'warn' : 'ok');
  setChip('#chip-erp', q.queued > 0 ? `ERP · ${q.queued} kuyrukta` : 'ERP · bağlı', q.queued > 0 ? 'warn' : 'ok');
  setChip('#chip-sql', `SQL · ${q.readings ?? 0} satır`, 'ok');
  $('#btn-toggle').textContent = c.running ? 'Durdur' : 'Başlat';
  $('#k-machines').textContent = c.machineCount ?? 0;
  $('#k-tags').textContent = c.tagCount ?? 0;
  $('#k-readings').textContent = q.readings ?? 0;
  $('#k-queued').textContent = q.queued ?? 0;
  $('#k-cycle').textContent = c.cycle ? '#' + c.cycle : '—';
  $('#k-duration').textContent = c.lastRun?.durationMs != null ? `${c.lastRun.durationMs} ms · ${c.lastRun.readings} okuma` : '—';
  $('#q-queued').textContent = q.queued ?? 0;
  $('#q-sent').textContent = q.sent ?? 0;
  $('#q-dead').textContent = q.dead ?? 0;
  $('#q-events').textContent = q.events ?? 0;
  $('#sql-count').textContent = `${q.readings ?? 0} satır`;
  $('#sql-path').textContent = s.sql?.path || '—';
  $('#last-at').textContent = c.lastRun?.at ? short(c.lastRun.at) : '—';
  const banner = $('#banner');
  const msgs = [];
  if (c.fallback) msgs.push(c.fallback);
  if (c.lastError) msgs.push('Son hata: ' + c.lastError);
  if (q.dead > 0) msgs.push(`${q.dead} batch kalıcı olarak gönderilemedi; kayıtlar silinmedi, kuyrukta incelenmeyi bekliyor.`);
  (s.securityWarnings || []).forEach((w) => msgs.push(w.message));
  banner.innerHTML = msgs.map(esc).join(' · ');
  banner.classList.toggle('show', msgs.length > 0);
}

function renderMachines(latest) {
  const by = {};
  latest.forEach((r) => { (by[r.machine_id] ||= { name: r.machine_name || r.machine_id, rows: [] }).rows.push(r); });
  const keys = Object.keys(by);
  if (!keys.length) { $('#machines').innerHTML = '<p class="muted" style="padding:14px">Henüz okuma yok. “Şimdi Oku” düğmesine basın veya tarama döngüsünü başlatın.</p>'; return; }
  $('#machines').innerHTML = keys.map((id) => {
    const g = by[id];
    const sigs = g.rows.filter((r) => r.kind === 'signal');
    const tel = g.rows.filter((r) => r.kind === 'telemetry');
    const sigHtml = sigs.map((r) => {
      const v = r.value_text ?? r.value_num;
      const cls = r.signal === 'alarm' && v === 'fault' ? 'bad' : (v === 'true' || v === 'pouring' || v === 'open' ? 'on' : '');
      return pill(`${r.signal}: ${v}`, cls);
    }).join('');
    const telHtml = tel.map((r) => {
      const t = (r.raw && (typeof r.raw === 'string' ? JSON.parse(r.raw) : r.raw)?.thresholds) || {};
      const v = Number(r.value_num);
      const cls = t.criticalAt && v >= t.criticalAt ? 'danger' : (t.warnAt && v >= t.warnAt ? 'warn' : '');
      return `<div class="tel"><span>${esc(r.signal)} · ${esc(r.unit || '')}</span><strong class="${cls}">${esc(r.value_num)}</strong></div>`;
    }).join('') || '<div class="tel"><span>Bu tip için telemetri şablonu yok</span><strong>—</strong></div>';
    return `<div class="machine"><h3>${esc(g.name)}</h3><div class="sub">${esc(id)} · ${g.rows.length} tag · ${esc(sigs[0]?.source || '')}</div>
      <div class="sigs">${sigHtml || '<span class="muted">Sinyal yok</span>'}</div>${telHtml}</div>`;
  }).join('');
}

function renderEvents(rows) {
  $('#events').innerHTML = rows.length ? rows.slice(0, 12).map((e) => `<div class="row"><time>${short(e.at)}</time><div>
    <strong>${esc(e.machine_id)}</strong> ${badge(e.severity, e.severity === 'danger' ? 'danger' : e.severity === 'warn' ? 'warn' : 'ok')}
    <p>${esc(e.signal)} · ${esc(e.kind)} · ${esc(e.previous ?? '—')} → ${esc(e.current ?? '—')} · ${esc(e.note || '')}</p></div></div>`).join('')
    : '<p class="muted" style="padding:10px">Henüz durum değişimi veya eşik olayı yok.</p>';
}
function renderLogs(rows) {
  $('#logs').innerHTML = rows.length ? rows.slice(0, 14).map((l) => `<div class="row"><time>${short(l.at)}</time><div>${badge(l.level, l.level === 'error' ? 'danger' : l.level === 'warn' ? 'warn' : 'ok')} ${esc(l.source)} <p>${esc(l.message)}</p></div></div>`).join('') : '<p class="muted">Günlük boş.</p>';
}
function renderLatest(rows) {
  const q = ($('#sensor-filter').value || '').toLocaleLowerCase('tr');
  const filtered = rows.filter((r) => !q || `${r.machine_id} ${r.machine_name} ${r.signal} ${r.tag_id}`.toLocaleLowerCase('tr').includes(q));
  $('#latest-rows').innerHTML = filtered.map((r) => `<tr><td>${short(r.at)}</td><td class="cell"><strong>${esc(r.machine_name || r.machine_id)}</strong><div class="muted" style="font-size:10px">${esc(r.machine_id)}</div></td>
    <td><code>${esc(r.tag_id)}</code></td><td>${badge(r.kind, r.kind === 'telemetry' ? 'warn' : '')}</td><td>${esc(r.signal)}</td>
    <td><strong>${esc(r.value_text ?? r.value_num ?? '—')}</strong> ${esc(r.unit || '')}</td><td>${esc(r.unit || '—')}</td>
    <td>${badge(r.quality, r.quality === 'GOOD' ? 'ok' : r.quality === 'SIMULATED' ? 'warn' : 'danger')}</td><td>${esc(r.source)}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">Eşleşen okuma yok.</td></tr>';
}
function renderRuns(rows) {
  $('#runs-rows').innerHTML = rows.map((r) => `<tr><td>${short(r.at)}</td><td>${r.duration_ms} ms</td><td>${r.tag_count}</td><td>${r.reading_count}</td><td>${r.event_count}</td><td>${esc(r.adapter)}</td><td>${esc(r.errors && r.errors !== '[]' ? r.errors : '—')}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Henüz döngü yok.</td></tr>';
}
function renderOutbox(rows) {
  $('#queue-rows').innerHTML = rows.map((r) => `<tr><td><code>${esc(r.batch_id)}</code></td><td>${badge(r.status, r.status === 'sent' ? 'ok' : r.status === 'dead' ? 'danger' : r.status === 'queued' ? 'warn' : '')}</td>
    <td>${r.attempts}</td><td class="muted">${esc(r.endpoint)}</td><td>${short(r.created_at)}</td><td>${esc(r.last_error || '—')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Kuyruk boş.</td></tr>';
}
function renderSql(rows) {
  $('#sql-rows').innerHTML = rows.slice(0, 25).map((r) => `<tr><td>${r.id}</td><td><code>${esc(r.client_id)}</code></td><td>${esc(r.machine_id)}</td><td>${esc(r.signal)}</td><td>${esc(r.value_text ?? r.value_num ?? '—')}</td><td>${badge(r.quality, r.quality === 'SIMULATED' ? 'warn' : 'ok')}</td><td>${short(r.at)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">readings tablosu boş.</td></tr>';
}
function renderSchema(rows) {
  $('#schema').innerHTML = rows.map((t) => `<div class="t"><strong>${esc(t.table)}</strong><span>${t.rows} satır · ${t.columns.length} alan</span><p>${esc(t.columns.join(' · '))}</p></div>`).join('');
}
function renderProfile(p) {
  $('#profile-valid').textContent = p.valid ? 'Profil geçerli' : 'Profil bulunamadı';
  $('#profile').innerHTML = [
    ['Fabrika', p.plant?.name || '—'], ['Kod', p.plant?.code || '—'], ['Çalışma Modu', p.plant?.mode || '—'],
    ['Profil Dosyası', p.profilePath], ['Aktif Makine', (p.machines || []).length], ['PLC Tag', p.tagCount ?? 0],
    ['Makine Tipi', (p.machineTypes || []).length], ['Telemetri Şablonu', (p.telemetryProfiles || []).length]
  ].map(([k, v]) => `<div class="p"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
  $('#adapter-rows').innerHTML = state.adapters.map((a) => `<tr><td><code>${esc(a.code)}</code></td><td>${esc(a.label)}</td><td>${esc(a.protocol)}</td>
    <td>${badge(a.implemented ? 'Hazır' : 'Sözleşme', a.implemented ? 'ok' : 'warn')}</td><td class="muted">${esc(a.capabilities.join(' · '))}</td></tr>`).join('');
  $('#telemetry-rows').innerHTML = (p.telemetryProfiles || []).map((t) => `<tr><td><code>${esc(t.type)}</code></td><td>${esc(t.label)}</td><td>${esc(t.unit)}</td>
    <td>${esc(t.nominalMin)}–${esc(t.nominalMax)}</td><td>${esc(t.warnAt)}</td><td>${esc(t.criticalAt)}</td><td><code>${esc(t.addressPattern)}</code></td></tr>`).join('');
}

/* ----------------------------- ayarlar formu ----------------------------- */
const FIELDS = [
  ['siteCode', 'Fabrika Kodu', 'text', 'docs/12 profil koduyla aynı olmalı'],
  ['siteName', 'Saha Adı', 'text', 'Arayüz başlığı'],
  ['plantId', 'Fabrika Kimliği', 'text', 'Boş bırakılırsa profilden okunur'],
  ['profilePath', 'Profil Paketi Yolu', 'text', 'erp-plant-profile JSON'],
  ['sqlPath', 'SQLite Dosyası', 'text', 'WAL modunda yerel veritabanı'],
  ['pollSeconds', 'Tarama Aralığı (sn)', 'number', 'Varsayılan 3 saniye'],
  ['retentionDays', 'Saklama Süresi (gün)', 'number', 'Eski readings satırları temizlenir; kuyruk silinmez'],
  ['adapter', 'Adaptör', 'select:simulation,simulated,opcua,modbus,auto', 'simulation = ERP simülasyonu (test) · gerçek sürücü yoksa MANUAL yedeği'],
  ['simulation.baseUrl', 'Simülasyon Adresi', 'text', 'Örn. http://127.0.0.1:8000 · ./start.sh 10'],
  ['connection.name', 'Bağlantı Adı', 'text', ''],
  ['connection.ip', 'PLC IP', 'text', 'Örn. 192.168.1.50'],
  ['connection.protocol', 'Protokol', 'select:OPC UA,Modbus TCP,Yerel', ''],
  ['connection.port', 'Port', 'number', 'OPC UA 4840 / Modbus 502'],
  ['connection.mode', 'Çalışma Modu', 'select:PLC,MANUAL', ''],
  ['erp.url', 'ERP Uç Noktası', 'text', '/api/edge/ingest'],
  ['erp.token', 'ERP Token', 'text', 'Maskeli görünür; boş bırakılırsa korunur'],
  ['erp.secret', 'HMAC Gizli Anahtarı', 'text', 'ERP ile aynı olmalı'],
  ['erp.timeoutSeconds', 'Zaman Aşımı (sn)', 'number', ''],
  ['erp.batchSize', 'Batch Büyüklüğü', 'number', ''],
  ['erp.maxRetries', 'Azami Deneme', 'number', 'Aşılınca dead, kayıt silinmez'],
  ['erp.enabled', 'ERP Gönderimi', 'select:true,false', 'Kapatılırsa yalnızca SQL yazılır'],
  ['ui.host', 'Arayüz Adresi', 'text', 'Üretimde 127.0.0.1'],
  ['ui.port', 'Arayüz Portu', 'number', '']
];
const getPath = (o, p) => p.split('.').reduce((x, k) => (x || {})[k], o);

function renderConfig(c) {
  $('#config-form').innerHTML = FIELDS.map(([path, label, type, hint]) => {
    const v = getPath(c, path) ?? '';
    let control;
    if (type.startsWith('select:')) {
      control = `<select class="input" data-path="${path}">${type.slice(7).split(',').map((o) => `<option value="${esc(o)}" ${String(v) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    } else {
      control = `<input class="input" data-path="${path}" type="${type === 'number' ? 'number' : 'text'}" value="${esc(v)}">`;
    }
    return `<label>${esc(label)}${control}<small>${esc(hint)}</small></label>`;
  }).join('') + `<div class="full muted" style="font-size:10.5px">Not: Arayüz adresi/portu değişikliği ajan yeniden başlatıldığında geçerli olur. Gizli alanlar maskeli gelir; dokunulmazsa korunur.</div>`;
}
async function saveConfig() {
  const config = {};
  $$('#config-form [data-path]').forEach((el) => {
    const parts = el.dataset.path.split('.'); let cur = config;
    parts.slice(0, -1).forEach((p) => (cur[p] ||= {}));
    let val = el.value;
    if (el.type === 'number') val = Number(val);
    if (val === 'true') val = true; if (val === 'false') val = false;
    cur[parts.at(-1)] = val;
  });
  const r = await api('/api/config', { config });
  if (r.ok) { state.config = r.config; renderConfig(r.config); toast('Yapılandırma kaydedildi, profil yeniden okundu'); refresh(); }
  else toast(r.error || 'Kaydedilemedi', true);
}

/* ----------------------------- eylemler ----------------------------- */
$('#btn-poll').addEventListener('click', async () => { const r = await api('/api/poll', {}); toast(r.ok ? `Döngü #${r.summary.cycle}: ${r.summary.readings} okuma · ${r.summary.events} olay` : r.error, !r.ok); refresh(); });
$('#btn-toggle').addEventListener('click', async () => { const action = state.status.collector?.running ? 'stop' : 'start'; await api('/api/collector', { action }); toast(action === 'start' ? 'Tarama başlatıldı' : 'Tarama durduruldu'); refresh(); });
$('#btn-flush').addEventListener('click', async () => { const r = await api('/api/flush', {}); toast(`${r.result.processed} batch işlendi · ${r.result.sent} gönderildi · ${r.result.failed} başarısız`); refresh(); });
$('#btn-purge').addEventListener('click', async () => { const r = await api('/api/purge', {}); toast(`${r.removed} eski okuma temizlendi`); refresh(); });
$('#btn-save').addEventListener('click', saveConfig);
$('#sensor-filter').addEventListener('input', () => renderLatest(state.latest));
$('#btn-test').addEventListener('click', async () => {
  $('#test-result').innerHTML = 'Test çalışıyor…';
  const r = await api('/api/test', {});
  if (!r.ok) { $('#test-result').textContent = r.error; return; }
  const a = r.adapter, e = r.erp;
  $('#test-result').innerHTML = `<div>${badge(a.implemented ? 'Adaptör hazır' : 'MANUAL yedek', a.implemented ? 'ok' : 'warn')} <strong>${esc(a.adapterLabel)}</strong> · ${esc(a.host)}:${a.port} · ${a.tagCount} tag · ${esc(a.message)}</div>
    <div>${badge(e.ok ? 'ERP erişilebilir' : 'ERP çevrimdışı', e.ok ? 'ok' : 'warn')} ${esc(e.message)}</div>
    <div>SQL: <code>${r.sql.length} tablo</code> · ${esc(r.fallback || 'Yedek gerekmedi')}</div>
    <div class="muted" style="margin-top:6px">Çevrimdışı olması bir hata değildir: okumalar SQLite'a yazılır, batch kuyrukta bekler.</div>`;
  toast('Bağlantı testi tamamlandı');
});

/* ----------------------------- yenileme ----------------------------- */
async function refresh() {
  try {
    const [status, latest, events, logs, runs, outbox, readings, schema, config, profile, adapters] = await Promise.all([
      api('/api/status'), api('/api/latest'), api('/api/events?limit=12'), api('/api/logs?limit=14'),
      api('/api/runs?limit=20'), api('/api/outbox?limit=30'), api('/api/readings?limit=25'),
      api('/api/schema'), api('/api/config'), api('/api/profile'), api('/api/adapters')
    ]);
    state = { status, latest: latest || [], events: events || [], logs: logs || [], runs: runs || [], outbox: outbox || [], schema: schema || [], config, profile, adapters: adapters || [] };
    renderStatus(status); renderMachines(state.latest); renderEvents(state.events); renderLogs(state.logs);
    renderLatest(state.latest); renderRuns(state.runs); renderOutbox(state.outbox);
    renderSql(readings || []); renderSchema(state.schema); renderProfile(profile);
    if (!$('#config-form').children.length) renderConfig(config);
  } catch (err) { toast('Sunucuya erişilemedi: ' + err.message, true); }
}
refresh();
setInterval(() => {
  Promise.all([api('/api/status'), api('/api/latest'), api('/api/events?limit=12'), api('/api/logs?limit=14'), api('/api/runs?limit=20'), api('/api/outbox?limit=30'), api('/api/readings?limit=25'), api('/api/schema')])
    .then(([status, latest, events, logs, runs, outbox, readings, schema]) => {
      Object.assign(state, { status, latest: latest || [], events: events || [], logs: logs || [], runs: runs || [], outbox: outbox || [], schema: schema || [] });
      renderStatus(status); renderMachines(state.latest); renderEvents(state.events); renderLogs(state.logs);
      renderLatest(state.latest); renderRuns(state.runs); renderOutbox(state.outbox); renderSql(readings || []); renderSchema(state.schema);
    }).catch(() => {});
}, 2000);
