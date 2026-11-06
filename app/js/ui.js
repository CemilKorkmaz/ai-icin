import { icon } from './icons.js';

/* ---------- Metin ve biçimlendirme ---------- */

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtNum(n, d = 0) {
  const v = Number(n || 0);
  return v.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtMoney(n, currency = '₺') {
  return `${fmtNum(n, 2)} ${currency}`;
}

export function fmtQty(n, unit = '') {
  return `${fmtNum(n, Number(n) % 1 === 0 ? 0 : 1)}${unit ? ' ' + unit : ''}`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return `${d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function fmtTime(iso) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function pill(text, kind = 'neutral') {
  return `<span class="pill pill-${kind}">${esc(text)}</span>`;
}

export function dot(color) { return `<span class="dot" style="--dot:${color}"></span>`; }

export function progress(value, max, color = '#4f46e5') {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return `<div class="progress"><div class="progress-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>`;
}

export function emptyState(text, ico = 'box') {
  return `<div class="empty">${icon(ico, 26)}<span>${esc(text)}</span></div>`;
}

/* ---------- Form yardımcıları ---------- */

export function field(label, control, hint = '') {
  return `<label class="field"><span class="field-label">${esc(label)}</span>${control}${hint ? `<span class="field-hint">${esc(hint)}</span>` : ''}</label>`;
}

export function input(name, value = '', opts = {}) {
  const { type = 'text', placeholder = '', required = false, min, max, step, extra = '' } = opts;
  return `<input class="input" name="${esc(name)}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''} ${step !== undefined ? `step="${step}"` : ''} ${extra}>`;
}

export function select(name, options, selected = '', extra = '') {
  const opts = options.map((o) => {
    const value = typeof o === 'string' ? o : o.value;
    const label = typeof o === 'string' ? o : o.label;
    return `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`;
  }).join('');
  return `<select class="input" name="${esc(name)}" ${extra}>${opts}</select>`;
}

export function formData(root) {
  const out = {};
  root.querySelectorAll('[name]').forEach((el) => {
    if (el.disabled) return;
    // Bazı hafif DOM uygulamaları `checked` özelliğini taşımaz; HTML niteliğine düşülür.
    out[el.name] = el.type === 'checkbox'
      ? (typeof el.checked === 'boolean' ? el.checked : el.hasAttribute('checked'))
      : el.value;
  });
  return out;
}

/* ---------- Toast ---------- */

export function toast(message, kind = 'success') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `${icon(kind === 'success' ? 'check' : kind === 'danger' ? 'alert' : 'activity', 17)}<span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 280); }, 3200);
}

/* ---------- Modal ---------- */

export function modal({ title, subtitle = '', body = '', actions = [], size = '' }) {
  const root = document.getElementById('modal-root');
  if (!root) return null;
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head">
        <div><h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
        <button class="icon-btn" data-modal-close aria-label="Kapat">${icon('x', 18)}</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost'}" data-action-index="${i}">${a.icon ? icon(a.icon, 16) : ''}${esc(a.label)}</button>`).join('')}</div>
    </div>`;
  root.appendChild(wrap);
  const close = () => { wrap.classList.add('closing'); setTimeout(() => wrap.remove(), 160); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-modal-close]')) close();
    const btn = e.target.closest('[data-action-index]');
    if (btn) {
      const a = actions[Number(btn.dataset.actionIndex)];
      if (a && a.onClick) a.onClick(wrap.querySelector('.modal'), close);
      else close();
    }
  });
  requestAnimationFrame(() => wrap.classList.add('open'));
  return { el: wrap, close, body: wrap.querySelector('.modal-body') };
}

export function confirmDialog(title, message, onYes, yesLabel = 'Onayla') {
  return modal({
    title, body: `<p class="confirm-text">${esc(message)}</p>`,
    actions: [
      { label: 'Vazgeç', onClick: (_m, close) => close() },
      { label: yesLabel, kind: 'primary', icon: 'check', onClick: (_m, close) => { close(); onYes(); } }
    ]
  });
}

/* ---------- Çizelgeler (harici kütüphane yok, saf SVG) ---------- */

function niceTicks(min, max) {
  const span = max - min || 1;
  const step = Math.pow(10, Math.floor(Math.log10(span / 4)));
  const norm = (span / 4) / step;
  const mult = norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1;
  return step * mult;
}

export function lineChart({ series = [], labels = [], height = 230, width = 760, unit = '', decimals = 1 }) {
  const all = series.flatMap((s) => s.values.filter((v) => v !== null && Number.isFinite(Number(v))).map(Number));
  if (!all.length) return emptyState('Grafik için henüz veri yok', 'chart');
  let min = Math.min(...all), max = Math.max(...all);
  if (min === max) { min -= 1; max += 1; }
  const padRange = (max - min) * 0.14;
  min -= padRange; max += padRange;
  const pad = { l: 52, r: 14, t: 16, b: 34 };
  const W = width, H = height;
  const px = (i) => pad.l + (W - pad.l - pad.r) * (labels.length <= 1 ? 0.5 : i / (labels.length - 1));
  const py = (v) => pad.t + (H - pad.t - pad.b) * (1 - (Number(v) - min) / (max - min));
  const tick = niceTicks(min, max);
  const ticks = [];
  for (let t = Math.ceil(min / tick) * tick; t <= max; t += tick) ticks.push(t);
  const grid = ticks.map((t) => `<line x1="${pad.l}" y1="${py(t).toFixed(1)}" x2="${W - pad.r}" y2="${py(t).toFixed(1)}" class="chart-grid"/><text x="${pad.l - 9}" y="${(py(t) + 4).toFixed(1)}" text-anchor="end" class="chart-label">${fmtNum(t, decimals > 1 ? 1 : 0)}</text>`).join('');
  const xlabels = labels.map((l, i) => {
    const every = Math.ceil(labels.length / 7);
    return (i % every === 0 || i === labels.length - 1) ? `<text x="${px(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="chart-label">${esc(l)}</text>` : '';
  }).join('');
  const paths = series.map((s, si) => {
    let d = '', open = false;
    s.values.forEach((v, i) => {
      if (v === null || v === undefined || !Number.isFinite(Number(v))) { open = false; return; }
      d += `${open ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)} `;
      open = true;
    });
    const area = si === 0 && d ? `<path d="${d}L${px(labels.length - 1).toFixed(1)},${H - pad.b} L${px(0).toFixed(1)},${H - pad.b} Z" fill="${s.color}" opacity="0.09"/>` : '';
    const points = s.values.map((v, i) => (v === null || v === undefined) ? '' : `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="3.2" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${esc(labels[i] || '')}: ${fmtNum(v, decimals)} ${esc(unit)}</title></circle>`).join('');
    return `${area}<path d="${d.trim()}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${points}`;
  }).join('');
  const legend = series.length > 1 ? `<div class="chart-legend">${series.map((s) => `<span>${dot(s.color)}${esc(s.name)}</span>`).join('')}</div>` : `<div class="chart-legend"><span>${dot(series[0].color)}${esc(series[0].name)} <span class="muted">(${esc(unit)})</span></span></div>`;
  return `<div class="chart-wrap">${legend}<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none" role="img" aria-label="Çizgi grafik">${grid}${paths}${xlabels}</svg></div>`;
}

export function barChart({ labels = [], values = [], color = '#4f46e5', height = 210, unit = '' }) {
  if (!values.length) return emptyState('Grafik için henüz veri yok', 'chart');
  const W = 760, H = height;
  const pad = { l: 44, r: 12, t: 14, b: 32 };
  const max = Math.max(...values, 1) * 1.15;
  const bw = (W - pad.l - pad.r) / values.length;
  const bars = values.map((v, i) => {
    const h = (H - pad.t - pad.b) * (v / max);
    const x = pad.l + i * bw + bw * 0.18;
    const y = H - pad.b - h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="5" fill="${color}" opacity="${0.55 + 0.45 * (v / max)}"><title>${esc(labels[i])}: ${fmtNum(v, 1)} ${esc(unit)}</title></rect><text x="${(x + bw * 0.32).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" class="chart-bar-value">${fmtNum(v, v % 1 === 0 ? 0 : 1)}</text><text x="${(x + bw * 0.32).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="chart-label">${esc(labels[i])}</text>`;
  }).join('');
  const grid = [0.25, 0.5, 0.75, 1].map((f) => {
    const y = pad.t + (H - pad.t - pad.b) * (1 - f);
    return `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${W - pad.r}" y2="${y.toFixed(1)}" class="chart-grid"/><text x="${pad.l - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="chart-label">${fmtNum(max * f, 0)}</text>`;
  }).join('');
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="none" role="img" aria-label="Sütun grafik">${grid}${bars}</svg></div>`;
}

export function sparkline(values, color = '#4f46e5', width = 130, height = 36) {
  const vals = values.filter((v) => Number.isFinite(Number(v))).map(Number);
  if (vals.length < 2) return '';
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * width},${height - 3 - ((v - min) / span) * (height - 8)}`).join(' ');
  return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ---------- Çıktı ---------- */

export function downloadText(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function csvExport(filename, headers, rows) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const text = '\uFEFF' + [headers.map(q).join(';'), ...rows.map((r) => r.map(q).join(';'))].join('\r\n');
  downloadText(filename, text, 'text/csv');
}

export function printPage() { window.print(); }
