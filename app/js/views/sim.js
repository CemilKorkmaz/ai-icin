// Simülasyon Bağlantısı — kullanıcı simülasyonunu (erp_backend, :8000) ERP Studio'ya bağlar.
// Köprü: server/sim_bridge (docs/14). Tarayıcı yalnızca aynı kökene konuşur; sayfa asla yenilenmez.
import { icon } from '../icons.js';
import { esc, fmtNum, fmtDateTime, pill, progress, emptyState, field, input, select, formData, modal, toast } from '../ui.js';

const API = '/api';
const STATUS_TONE = {
  KAPALI: 'neutral', ISINIYOR: 'info', BEKLETIYOR: 'warn',
  CALISIYOR: 'ok', ALARM: 'danger', TAMAMLANDI: 'ok'
};
const STATUS_COLOR = {
  KAPALI: '#94a3b8', ISINIYOR: '#f59e0b', BEKLETIYOR: '#16a34a',
  CALISIYOR: '#16a34a', ALARM: '#ef4444', TAMAMLANDI: '#0891b2'
};
const ORDER_TONE = { CREATED: 'warn', RUNNING: 'info', COMPLETED: 'ok', CANCELLED: 'neutral' };
const ORDER_LABEL = { CREATED: 'Oluşturuldu', RUNNING: 'Çalışıyor', COMPLETED: 'Tamamlandı', CANCELLED: 'İptal' };

let snapshot = null;
let bridgeError = '';
let selected = null;
let detail = null;
let detailError = '';
let detailAt = 0;
let timer = null;
let loading = false;

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...options });
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    const err = new Error(data.error || `Sunucu ${res.status} döndü`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function tone(status) { return STATUS_TONE[status] || 'neutral'; }

/** Simülasyon ekranının adresi: yerelde :8000, önizlemede aynı kökün 8000 portu. */
function simulatorUrl() {
  try {
    const host = location.hostname;
    if (/^\d+-/.test(host)) return `${location.protocol}//${host.replace(/^\d+-/, '8000-')}/`;
    return `${location.protocol}//${host}:8000/`;
  } catch { return 'http://localhost:8000/'; }
}
function temp(value) { return value === null || value === undefined ? '—' : fmtNum(value, 1); }
function when(value) { return value ? fmtDateTime(value) : '—'; }

/* ============================ EKRAN ============================ */

export const simView = {
  title: 'Simülasyon Bağlantısı',
  subtitle: 'Fabrika testinden önce gerçek ERP zincirini kullanıcı simülasyonuyla sına',

  render() {
    return `
      <div data-sim-root>
        <div class="info-banner">
          ${icon('link', 17)}
          <span><strong>Burası bağlantı ve teşhis ekranıdır.</strong>
          Aynı canlı veri ana <strong>Panel</strong>, <strong>Makine Parkı</strong>, <strong>PLC Durum</strong> ve
          <strong>Üretim Akışı</strong> ekranlarını besler; veri orada da görünür.
          Fırın sıcaklığı, durum ve alarmlar <code>erp_backend</code> REST uçlarından okunur;
          edge ajanının imzalı batch'leri <code>/api/edge/ingest</code> ile burada kayda geçer.
          Sayfa bağlantı kopunca <strong>yenilenmez</strong>; 2,5 saniyede bir sessizce yeniden dener.</span>
          <a class="btn btn-primary btn-sm" href="${esc(simulatorUrl())}" target="_blank" rel="noopener">${icon('external', 14)} Simülasyon ekranını aç</a>
        </div>

        <section class="card">
          <div class="card-head">
            <div><h3>Bağlantı durumu</h3><p>Köprü, tarayıcı ile simülasyon arasındaki tek kapıdır.</p></div>
            <div class="toolbar" style="margin:0">
              <button class="btn btn-ghost btn-sm" data-sim-url>${icon('sliders', 14)} Adresi Değiştir</button>
              <button class="btn btn-primary btn-sm" data-sim-refresh>${icon('refresh', 14)} Yeniden Bağlan</button>
            </div>
          </div>
          <div id="sim-connection" class="sim-conn muted">Bağlantı kuruluyor…</div>
        </section>

        <div class="stat-strip" id="sim-stats"></div>

        <section class="card">
          <div class="card-head">
            <div><h3>Fırınlar</h3><p>Kart seçildiğinde son 40 sıcaklık okuması çizilir.</p></div>
            <span class="card-tag" id="sim-refresh-tag">canlı</span>
          </div>
          <div class="sim-furnace-grid" id="sim-furnaces">${emptyState('Simülasyon bekleniyor…', 'flame')}</div>
        </section>

        <div class="grid-2">
          <section class="card">
            <div class="card-head">
              <div><h3>Üretim emirleri</h3><p>Emir oluşturma ve başlatma doğrudan simülasyona gider.</p></div>
              <button class="btn btn-primary btn-sm" id="sim-new-order">${icon('plus', 14)} Yeni Emir</button>
            </div>
            <div id="sim-orders">${emptyState('Emirler yükleniyor…', 'clipboard')}</div>
          </section>
          <section class="card">
            <div class="card-head">
              <div><h3>Edge ajanı → ERP</h3><p>İmzalı batch'ler, kuyruk ve son okumalar.</p></div>
              <span class="card-tag" id="sim-edge-tag">/api/edge/ingest</span>
            </div>
            <div id="sim-edge">${emptyState('Edge kaydı yok', 'database')}</div>
          </section>
        </div>

        <section class="card">
          <div class="card-head">
            <div><h3>Fırın → makine eşlemesi</h3><p>Simülasyon adları profil paketindeki makine kimliklerine bağlanır; sabit kod yok.</p></div>
            <span class="card-tag" id="sim-map-tag">profil</span>
          </div>
          <div id="sim-map">${emptyState('Eşleme yükleniyor…', 'link')}</div>
        </section>

        <section class="card">
          <div class="card-head">
            <div><h3>Son simülasyon olayları</h3><p>Senaryoların ürettiği olaylar; aynıları ERP bildirim merkezine düşer.</p></div>
            <button class="btn btn-ghost btn-sm" data-nav="notifications">${icon('bell', 14)} Bildirim Merkezi</button>
          </div>
          <div id="sim-events">${emptyState('Olay yok; simülasyon ekranından bir senaryo çalıştırın.', 'activity')}</div>
        </section>

        <section class="card" id="sim-detail-card">
          <div class="card-head">
            <div><h3>Sıcaklık geçmişi</h3><p>Bir fırın kartı seçin.</p></div>
          </div>
          <div id="sim-detail">${emptyState('Geçmiş için fırın seçin', 'chart')}</div>
        </section>

        <section class="card">
          <div class="card-head"><div><h3>Bağlantı rehberi</h3><p>Simülasyon kapalıysa sırayla çalıştırın.</p></div></div>
          <div class="sim-steps">
            <div><strong>1 · Simülasyon</strong><code>./start.sh 10</code><span>Tarayıcıda :8000 açılır; ERP bu ekran :8080'de kalır.</span></div>
            <div><strong>2 · Köprü</strong><code>python3 server/sim_bridge/run.py</code><span>Simülasyon kapalıysa <code>--demo</code> ile yerleşik kopya.</span></div>
            <div><strong>3 · Edge ajanı</strong><code>cd edge &amp;&amp; python3 main.py</code><span>Adaptör <code>simulation</code>; ERP ucu :8080 ingest.</span></div>
          </div>
          <p class="micro">Güvenlik: köprü simülasyona yalnızca emir oluşturma/başlatma yazar; PLC'ye yazmaz,
          işletme tablolarına (stok, maliyet, muhasebe) dokunmaz. İmza <code>HMAC-SHA256</code> ile doğrulanır.</p>
        </section>
      </div>`;
  },

  mount(root) {
    const host = root.querySelector('[data-sim-root]');
    if (!host) return;
    host.addEventListener('click', (event) => {
      const fridge = event.target.closest('[data-sim-furnace]');
      if (fridge) {
        selected = fridge.dataset.simFurnace;
        detail = null;
        detailError = '';
        paintFurnaces(host);
        loadDetail(host);
        return;
      }
      if (event.target.closest('[data-sim-refresh]')) { load(host, true); return; }
      if (event.target.closest('[data-sim-url]')) { openUrlModal(host); return; }
      if (event.target.closest('#sim-new-order')) { openOrderModal(host); return; }
      const start = event.target.closest('[data-sim-order-start]');
      if (start) { startOrder(host, start.dataset.simOrderStart, start); }
    });
    load(host, true);
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (!document.body.contains(host)) { clearInterval(timer); timer = null; return; }
      if (!document.hidden) load(host, false);
    }, 2500);
  }
};

/* ============================ VERİ ============================ */

async function load(host, loud) {
  if (loading) return;
  loading = true;
  try {
    snapshot = await fetchJson(`${API}/sim/live`);
    bridgeError = '';
    if (loud) toast(snapshot.ok ? 'Simülasyon bağlantısı yenilendi' : 'Köprü açık, simülasyon kapalı', snapshot.ok ? 'success' : 'info');
  } catch (err) {
    bridgeError = err.message || 'Köprüye ulaşılamadı';
    if (loud) toast(bridgeError, 'danger');
  } finally {
    loading = false;
    paint(host);
  }
}

function paint(host) {
  paintConnection(host);
  paintStats(host);
  paintFurnaces(host);
  paintOrders(host);
  paintEdge(host);
  paintMapping(host);
  paintEvents(host);
  if (selected) loadDetail(host);
}

/* ============================ BAĞLANTI ============================ */

function paintConnection(host) {
  const el = host.querySelector('#sim-connection');
  if (!el) return;
  if (bridgeError) {
    el.className = 'sim-conn';
    el.innerHTML = `<span class="sim-dot danger"></span><div><strong>Köprü çalışmıyor</strong>
      <span>${esc(bridgeError)}</span>
      <small>Köprüyü başlatın: <code>python3 server/sim_bridge/run.py</code> — statik modda yalnızca diğer ekranlar çalışır.</small></div>`;
    return;
  }
  const live = snapshot || {};
  const health = live.health || {};
  const ok = !!live.ok;
  const stale = !!live.stale;
  const mode = live.mode === 'DEMO' ? 'Demo kopya' : 'Kullanıcı simülasyonu';
  const detailText = ok
    ? `${health.furnaceCount || (live.furnaces || []).length} fırın · ${health.latencyMs ?? '—'} ms · ${when(live.checkedAt)}`
    : `${esc(live.error || health.error || 'Simülasyon kapalı')}`;
  el.className = 'sim-conn';
  el.innerHTML = `
    <span class="sim-dot ${ok ? 'ok' : stale ? 'warn' : 'danger'}"></span>
    <div><strong>${ok ? 'Bağlı' : stale ? 'Bağlantı koptu · son veri gösteriliyor' : 'Bağlantı yok'}</strong>
      <span>${esc(live.label || 'Simülasyon')} · <code>${esc(live.baseUrl || '—')}</code></span>
      <small>${ok ? detailText : detailText + (stale && live.lastOkAt ? ` · son başarılı ${when(live.lastOkAt)}` : '')}</small></div>
    <div class="sim-conn-side">${pill(mode, live.mode === 'DEMO' ? 'violet' : 'cyan')}${pill(ok ? 'Canlı' : 'Kapalı', ok ? 'ok' : 'warn')}</div>`;
}

function paintStats(host) {
  const el = host.querySelector('#sim-stats');
  if (!el) return;
  const live = snapshot || {};
  const furnaces = live.furnaces || [];
  const orders = live.orders || [];
  const edge = live.edge || {};
  el.innerHTML = [
    ['Fırın', furnaces.length || '—'],
    ['Sıcak fırın', furnaces.filter((f) => ['ISINIYOR', 'BEKLETIYOR', 'CALISIYOR'].includes(f.status)).length],
    ['Çalışan emir', orders.filter((o) => o.state === 'RUNNING').length],
    ['Alarm', (live.alarms || []).length],
    ['Edge batch', edge.batches ?? 0],
    ['Edge okuma', edge.readings ?? 0]
  ].map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
}

/* ============================ FIRINLAR ============================ */

function paintFurnaces(host) {
  const el = host.querySelector('#sim-furnaces');
  if (!el) return;
  const furnaces = (snapshot && snapshot.furnaces) || [];
  if (!furnaces.length) {
    el.innerHTML = emptyState(bridgeError ? 'Köprü bağlanınca fırınlar listelenir' : 'Simülasyon kapalı; fırın verisi yok', 'flame');
    return;
  }
  el.innerHTML = furnaces.map((f) => {
    const active = selected === f.name;
    const pct = f.maxC ? Math.min(100, Math.max(0, (Number(f.temperatureC || 0) / f.maxC) * 100)) : 0;
    return `<article class="sim-furnace ${active ? 'active' : ''} ${f.status === 'ALARM' ? 'alarm' : ''}" data-sim-furnace="${esc(f.name)}" role="button" tabindex="0" aria-pressed="${active}">
      <div class="sim-furnace-top"><strong>${esc(f.name)}</strong>${pill(f.statusLabel, tone(f.status))}</div>
      <div class="sim-temp">${temp(f.temperatureC)}<small>°C</small><span class="sim-pct">%${fmtNum(pct, 0)}</span></div>
      <div class="sim-meta"><span>Hedef ${temp(f.targetC)} °C</span><span>Maks ${temp(f.maxC)} °C</span></div>
      ${progress(Number(f.temperatureC || 0), Number(f.maxC || 1), STATUS_COLOR[f.status] || '#4f46e5')}
      <div class="sim-meta"><span>Brülör ${f.burner === true ? 'açık' : f.burner === false ? 'kapalı' : '—'}</span><span>Gaz ${f.gasM3 ?? '—'} m³</span></div>
      ${f.alarm ? `<div class="sim-alarm">${icon('alert', 13)} ${esc(f.alarm)}</div>` : ''}
    </article>`;
  }).join('');
}

/* ============================ EMİRLER ============================ */

function paintOrders(host) {
  const el = host.querySelector('#sim-orders');
  if (!el) return;
  const orders = ((snapshot && snapshot.orders) || []).slice().reverse();
  if (!orders.length) {
    el.innerHTML = emptyState('Henüz emir yok. “Yeni Emir” ile başlayın.', 'clipboard');
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table class="data">
    <thead><tr><th>Emir</th><th>Ürün / Fırın</th><th>Hedef</th><th>Durum</th><th></th></tr></thead>
    <tbody>${orders.map((o) => `<tr>
      <td><div class="cell-strong">${esc(o.id || '—')}</div><div class="cell-sub">${esc(when(o.createdAt))}</div></td>
      <td><div class="cell-strong">${esc(o.product)}</div><div class="cell-sub">${esc(o.furnace)}</div></td>
      <td>${temp(o.targetC)} °C<div class="cell-sub">${temp(o.durationMin)} dk</div></td>
      <td>${pill(ORDER_LABEL[o.state] || o.state, ORDER_TONE[o.state] || 'neutral')}${o.remainingMin != null && o.state === 'RUNNING' ? `<div class="cell-sub">kalan ${temp(o.remainingMin)} dk</div>` : ''}</td>
      <td>${o.state === 'CREATED' ? `<button class="btn btn-primary btn-sm" data-sim-order-start="${esc(o.id)}" data-furnace="${esc(o.furnace)}">${icon('play', 12)} Başlat</button>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>
    <p class="micro">Süre, hedef sıcaklığa ulaştıktan sonra işler. Emir başlatmak fırını meşgul eder; alarm durumunda brülör kapanır.</p>`;
}

/* ============================ OLAYLAR ============================ */

function paintEvents(host) {
  const el = host.querySelector('#sim-events');
  if (!el) return;
  const events = Array.isArray(snapshot?.events) ? snapshot.events.slice().reverse().slice(0, 30) : [];
  if (!events.length) {
    el.innerHTML = emptyState('Olay yok; simülasyon ekranından bir senaryo çalıştırın.', 'activity');
    return;
  }
  const toneOf = (sev) => ({ critical: 'danger', warning: 'warn', info: 'info', success: 'ok' }[sev] || 'neutral');
  el.innerHTML = `<div class="table-wrap"><table class="data">
    <thead><tr><th>Zaman</th><th>Önem</th><th>Olay</th><th>Fırın / Modül</th><th>Mesaj</th></tr></thead>
    <tbody>${events.map((ev) => `<tr>
      <td class="cell-sub">${when(ev.at)}</td>
      <td>${pill(String(ev.severity || 'info').toUpperCase(), toneOf(ev.severity))}</td>
      <td><div class="cell-strong">${esc(ev.title || ev.type || '—')}</div><div class="cell-sub">${esc(ev.code || '')}</div></td>
      <td>${esc(ev.furnace || ev.module || '—')}</td>
      <td class="cell-sub">${esc(ev.message || '')}${ev.data?.test ? ' · <strong>TEST</strong>' : ''}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

/* ============================ EDGE ============================ */

function paintEdge(host) {
  const el = host.querySelector('#sim-edge');
  if (!el) return;
  const edge = (snapshot && snapshot.edge) || {};
  const batches = edge.batches || [];
  const latest = edge.latestReadings || [];
  const tag = host.querySelector('#sim-edge-tag');
  if (tag) tag.textContent = `${edge.batches || 0} batch · ${edge.readings || 0} okuma`;
  if (!edge.batches && !latest.length && !edge.lastBatch) {
    el.innerHTML = `${emptyState('Edge batch yok', 'database')}
      <p class="micro">Edge ajanı <code>8787</code>'de çalışıyorsa “Toplu Gönder”e basın; batch imzalanıp buraya düşer ve kuyruk <strong>sent</strong> olur.</p>`;
    return;
  }
  el.innerHTML = `
    <div class="sim-metrics">
      <div><span>Batch</span><strong>${edge.batches ?? 0}</strong></div>
      <div><span>Okuma</span><strong>${edge.readings ?? 0}</strong></div>
      <div><span>Olay</span><strong>${edge.events ?? 0}</strong></div>
      <div><span>Makine</span><strong>${edge.machines ?? 0}</strong></div>
    </div>
    ${edge.lastBatch ? `<div class="sim-last">Son batch <code>${esc(edge.lastBatch.batch_id)}</code>
      <span>${esc(edge.lastBatch.adapter || '—')} · ${esc(when(edge.lastBatch.received_at))}</span></div>` : ''}
    ${latest.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Makine</th><th>Sinyal</th><th>Değer</th><th>Kalite</th></tr></thead>
      <tbody>${latest.slice(0, 6).map((r) => `<tr><td>${esc(r.machine_id)}<div class="cell-sub">${esc(r.machine_name || '')}</div></td>
        <td>${esc(r.signal)}<div class="cell-sub">${esc(r.kind)}</div></td>
        <td>${r.value_num != null ? temp(r.value_num) : esc(r.value_text ?? '—')}${r.unit ? ' ' + esc(r.unit) : ''}</td>
        <td>${pill(r.quality || '—', r.quality === 'GOOD' ? 'ok' : 'info')}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
}

/* ============================ EŞLEME ============================ */

function paintMapping(host) {
  const el = host.querySelector('#sim-map');
  if (!el) return;
  const mapping = (snapshot && snapshot.mapping) || null;
  if (!mapping) {
    el.innerHTML = emptyState('Eşleme için profil ve fırın listesi gerekir', 'link');
    return;
  }
  const pairs = mapping.pairs || [];
  const tag = host.querySelector('#sim-map-tag');
  if (tag) tag.textContent = `${mapping.matched || 0}/${mapping.furnaces || 0} eşleşti`;
  el.innerHTML = `
    ${pairs.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Simülasyon fırını</th><th>ERP makinesi</th><th>Tip</th><th>Kaynak</th></tr></thead>
      <tbody>${pairs.map((p) => `<tr><td>${esc(p.furnace)}</td><td><div class="cell-strong">${esc(p.machineId)}</div><div class="cell-sub">${esc(p.machineName)}</div></td>
        <td>${esc(p.machineType || '—')}</td><td>${pill(p.source === 'config' ? 'Açık eşleme' : 'Otomatik kural', p.source === 'config' ? 'indigo' : 'cyan')}</td></tr>`).join('')}</tbody></table></div>` : emptyState('Eşleşen fırın yok', 'link')}
    ${(mapping.unmatched || []).length ? `<div class="info-banner" style="margin-top:14px">${icon('alert', 16)}
      <span><strong>Eşleşmeyen fırınlar:</strong> ${(mapping.unmatched || []).map((u) => `${esc(u.furnace)} (${esc(u.reason)})`).join(' · ')}.
      Veri uydurulmaz; <code>furnaceMap</code> ile elle bağlanabilir.</span></div>` : ''}
    ${(mapping.unusedMachines || []).length ? `<p class="micro">Simülasyonda karşılığı olmayan ${(mapping.unusedMachines || []).length} profil makinesi var; bu makineler için okuma üretilmez.</p>` : ''}`;
}

/* ============================ GEÇMİŞ ============================ */

async function loadDetail(host) {
  const el = host.querySelector('#sim-detail');
  if (!el) return;
  if (!selected) { el.innerHTML = emptyState('Geçmiş için fırın seçin', 'chart'); return; }
  if (!detail || detail.furnace !== selected) {
    el.innerHTML = emptyState(`${selected} okunuyor…`, 'chart');
  } else if (Date.now() - detailAt < 9000) {
    return;  // grafik her turda yeniden çizilmez
  }
  try {
    const data = await fetchJson(`${API}/sim/readings?name=${encodeURIComponent(selected)}&limit=40`);
    detail = { furnace: selected, rows: data.readings || [] };
    detailError = '';
    detailAt = Date.now();
  } catch (err) {
    detailError = err.message;
    detail = { furnace: selected, rows: [] };
  }
  const rows = detail.rows || [];
  if (detailError) {
    el.innerHTML = emptyState(detailError, 'alert');
    return;
  }
  if (!rows.length) {
    el.innerHTML = emptyState(`${selected} için henüz okuma yok; emir başlatın.`, 'chart');
    return;
  }
  const labels = rows.map((r) => when(r.at));
  const values = rows.map((r) => (r.temperatureC === null ? null : Number(r.temperatureC)));
  el.innerHTML = `<div class="sim-detail-head"><strong>${esc(selected)}</strong>
    <span>${rows.length} okuma · son ${temp(values[values.length - 1])} °C</span></div>
    ${line(rows, labels, values)}`;
}

function line(rows, labels, values) {
  // ui.js lineChart'i içe aktarmak yerine hafif SVG: ekran kendi verisiyle çalışır.
  const width = 760, height = 220, pad = { l: 46, r: 14, t: 14, b: 28 };
  const clean = values.filter((v) => Number.isFinite(v));
  if (!clean.length) return emptyState('Sayısal okuma yok', 'chart');
  let min = Math.min(...clean), max = Math.max(...clean);
  if (min === max) { min -= 5; max += 5; }
  const span = max - min || 1;
  const px = (i) => pad.l + (width - pad.l - pad.r) * (values.length <= 1 ? 0.5 : i / (values.length - 1));
  const py = (v) => pad.t + (height - pad.t - pad.b) * (1 - (v - min) / span);
  let d = '', open = false;
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) { open = false; return; }
    d += `${open ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)} `;
    open = true;
  });
  const points = values.map((v, i) => Number.isFinite(v)
    ? `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="2.6" fill="#fff" stroke="#4f46e5" stroke-width="1.6"><title>${esc(labels[i])}: ${temp(v)} °C</title></circle>` : '').join('');
  const grid = [0, 0.5, 1].map((f) => {
    const v = min + span * f;
    return `<line x1="${pad.l}" y1="${py(v).toFixed(1)}" x2="${width - pad.r}" y2="${py(v).toFixed(1)}" class="chart-grid"/>
      <text x="${pad.l - 8}" y="${(py(v) + 4).toFixed(1)}" text-anchor="end" class="chart-label">${fmtNum(v, 0)}</text>`;
  }).join('');
  const xlabels = labels.map((l, i) => (i % Math.max(1, Math.ceil(labels.length / 6)) === 0)
    ? `<text x="${px(i).toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-label">${esc(String(l).split(' ')[1] || l)}</text>` : '').join('');
  const target = rows[rows.length - 1];
  return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" class="chart" preserveAspectRatio="none" role="img" aria-label="Sıcaklık geçmişi">
      ${grid}<path d="${d.trim()}" fill="none" stroke="#4f46e5" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>${points}${xlabels}
    </svg></div>
    <p class="micro">Son hedef: ${temp(target.targetC)} °C · durum: ${esc(target.status)} · ${esc(when(target.at))}</p>`;
}

/* ============================ EYLEMLER ============================ */

async function startOrder(host, id, button) {
  if (!id) return;
  button.disabled = true;
  const old = button.innerHTML;
  button.textContent = 'Başlatılıyor…';
  try {
    const res = await fetchJson(`${API}/sim/orders/start`, {
      method: 'POST', body: JSON.stringify({ id })
    });
    toast(res.message || `${id} başlatıldı`, 'success');
    selected = (res.order && res.order.furnace) || selected;
    await load(host, false);
  } catch (err) {
    button.disabled = false;
    button.innerHTML = old;
    toast(err.message || 'Emir başlatılamadı', 'danger');
  }
}

function openOrderModal(host) {
  const furnaces = (snapshot && snapshot.furnaces) || [];
  if (!furnaces.length) { toast('Önce simülasyona bağlanın', 'danger'); return; }
  const mo = modal({
    title: 'Yeni Üretim Emri',
    subtitle: 'Emir simülasyonda oluşturulur; ERP işletme tablolarına yazılmaz.',
    body: `<div class="form-grid">
        ${field('Ürün', input('product', 'Alüminyum Profili', { required: true, placeholder: 'Örn. Alüminyum Profili' }))}
        ${field('Fırın', select('furnace', furnaces.map((f) => f.name), selected || furnaces[0].name))}
        ${field('Hedef sıcaklık (°C)', input('target_temp', '60', { type: 'number', min: 1, max: 1200, step: 1 }), 'Güvenlik sınırını aşan hedef alarm üretir')}
        ${field('Süre (dk)', input('duration_min', '0.2', { type: 'number', min: 0.1, max: 1440, step: 0.1 }), 'Süre hedefe ulaştıktan sonra başlar')}
      </div><div id="sim-order-error" class="muted"></div>`,
    actions: [
      { label: 'Vazgeç', onClick: (_m, close) => close() },
      { label: 'Oluştur', kind: 'primary', icon: 'plus', onClick: async (el, close) => {
        const form = formData(el);
        const err = el.querySelector('#sim-order-error');
        const btn = el.querySelector('[data-action-index="1"]');
        btn.disabled = true;
        try {
          const res = await fetchJson(`${API}/sim/orders`, {
            method: 'POST',
            body: JSON.stringify({
              product: form.product, furnace: form.furnace,
              target_temp: Number(form.target_temp), duration_min: Number(form.duration_min)
            })
          });
          close();
          toast(res.message || 'Emir oluşturuldu', 'success');
          selected = form.furnace;
          await load(host, false);
        } catch (error) {
          btn.disabled = false;
          if (err) err.innerHTML = `<span class="text-danger">${esc(error.message)}</span>`;
          toast(error.message, 'danger');
        }
      } }
    ]
  });
  return mo;
}

function openUrlModal(host) {
  const current = (snapshot && snapshot.baseUrl) || 'http://127.0.0.1:8000';
  modal({
    title: 'Simülasyon Adresi',
    subtitle: 'Köprü bu adrese sunucu tarafından bağlanır; tarayıcı doğrudan gitmez.',
    body: `${field('Adres', input('simBaseUrl', current, { placeholder: 'http://127.0.0.1:8000' }), 'Aynı ağdaki başka bilgisayar için IP yazın')}
      <p class="micro">Kaydetmek <code>server/sim_bridge/config.json</code> dosyasını günceller. Değişiklik anında uygulanır.</p>`,
    actions: [
      { label: 'Vazgeç', onClick: (_m, close) => close() },
      { label: 'Kaydet & Dene', kind: 'primary', icon: 'link', onClick: async (el, close) => {
        const form = formData(el);
        const btn = el.querySelector('[data-action-index="1"]');
        btn.disabled = true;
        try {
          const res = await fetchJson(`${API}/bridge/config`, {
            method: 'POST', body: JSON.stringify({ simBaseUrl: form.simBaseUrl })
          });
          close();
          toast(res.message || 'Adres güncellendi', 'success');
          snapshot = null;
          selected = null;
          await load(host, true);
        } catch (error) {
          btn.disabled = false;
          toast(error.message, 'danger');
        }
      } }
    ]
  });
}
