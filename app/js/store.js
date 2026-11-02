import { SEED } from './seed.js';

const KEY = 'erp_demo_state_v1';
const clone = (o) => JSON.parse(JSON.stringify(o));

class Store {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = typeof localStorage !== 'undefined' && localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.materials) && parsed.settings) return parsed;
      }
    } catch (e) { /* bozuk veri → demo verisine düş */ }
    return clone(SEED);
  }

  save() {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* kot aşımı */ }
  }

  change(fn, { silent = false } = {}) {
    fn(this.data);
    this.save();
    if (!silent && typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('erp:change'));
    }
  }

  reset() {
    this.data = clone(SEED);
    this.save();
  }

  exportJSON() { return JSON.stringify(this.data, null, 2); }

  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.materials) || !parsed.settings) throw new Error('Geçersiz ERP veri dosyası');
    this.data = parsed;
    this.save();
  }
}

export const store = new Store();
export const D = () => store.data;

/* ---------- Yardımcılar ---------- */

export function uid(prefix) {
  const d = D();
  return `${prefix}-${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 90) + 10)}`;
}

export function material(id) { return D().materials.find((m) => m.id === id) || null; }
export function matName(id) { const m = material(id); return m ? m.name : '—'; }
export function supplier(id) { return D().suppliers.find((s) => s.id === id) || null; }
export function supplierName(id) { const s = supplier(id); return s ? s.name : '—'; }
export function order(id) { return D().purchaseOrders.find((o) => o.id === id) || null; }
export function furnace(id) { return D().furnaces.find((f) => f.id === id) || null; }
export function recipe(id) { return D().recipes.find((r) => r.id === id) || null; }
export function lot(id) { return D().lots.find((l) => l.id === id) || null; }

export function orderTotal(o) {
  return (o.items || []).reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
}

export function stockState(m) {
  if (!m) return { key: 'ok', label: 'Normal', cls: 'ok', color: '#16a34a' };
  const min = Number(m.criticalMin || 0), max = Number(m.criticalMax || 0), s = Number(m.stock || 0);
  if (min > 0 && s < min) return { key: 'critical', label: 'Kritik', cls: 'danger', color: '#ef4444' };
  if (min > 0 && s < min * 1.2) return { key: 'warn', label: 'Uyarı', cls: 'warn', color: '#f59e0b' };
  if (max > 0 && s > max) return { key: 'over', label: 'Aşırı Stok', cls: 'info', color: '#3b82f6' };
  return { key: 'ok', label: 'Normal', cls: 'ok', color: '#16a34a' };
}

export function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+03:00`;
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ---------- İşlem kayıtları ---------- */

export function addActivity(text, icon = 'activity') {
  D().activity.unshift({ id: uid('AC'), at: nowISO(), text, icon, user: 'Siz' });
  D().activity = D().activity.slice(0, 40);
}

export function addNotification({ type = 'info', title, body, source = 'Sistem', channel = null, to = '', subject = '' }) {
  const d = D();
  d.notifications.unshift({ id: uid('NT'), at: nowISO(), type, title, body, source, read: false });
  if (channel) {
    d.outbox.unshift({
      id: uid('OB'), createdAt: nowISO(), channel, to,
      subject: subject || title, body, source,
      status: d.settings.online ? 'sent' : 'queued',
      attempt: d.settings.online ? 1 : 0, nextRetryAt: null, lastError: ''
    });
  }
}

export function moveStock({ materialId, quantity, type = 'Çıkış', source = 'Manuel', ref = '', notes = '' }) {
  const d = D();
  const m = d.materials.find((x) => x.id === materialId);
  const qty = Number(quantity) || 0;
  if (m) m.stock = Math.max(0, Number(m.stock || 0) + qty);
  d.movements.unshift({
    id: uid('MV'), at: nowISO(), type, materialId, quantity: qty,
    source, ref, remaining: m ? m.stock : qty, userId: 'Siz', notes
  });
  return m;
}

export function setOnline(value) {
  const d = D();
  d.settings.online = !!value;
  if (d.settings.online) {
    let n = 0;
    d.outbox.forEach((o) => { if (o.status === 'queued') { o.status = 'sent'; o.attempt += 1; n += 1; } });
    if (n) addActivity(`${n} kuyruk kaydı gönderildi (SMS / e-posta / yedek)`, 'wifi');
  } else {
    addActivity('Çevrimdışı moda geçildi: dış bildirimler kuyruğa alınacak', 'wifi-off');
  }
}

export function flushOutbox() {
  const d = D();
  if (!d.settings.online) return 0;
  let n = 0;
  d.outbox.forEach((o) => { if (o.status === 'queued') { o.status = 'sent'; o.attempt += 1; n += 1; } });
  if (n) addActivity(`${n} kuyruk kaydı yeniden gönderildi`, 'mail');
  return n;
}

/* ---------- Üretim hesapları ---------- */

export function billetTonnage(count, lengthM, diameterMm, density = 2700) {
  const r = Number(diameterMm) / 2000; // mm → m, yarıçap
  const volume = Math.PI * r * r * Number(lengthM) * Number(count);
  return volume * Number(density) / 1000; // ton
}

export function productionStageCount(stage) {
  return D().lots.filter((l) => l.stage === stage).length;
}

export function consumptionTotal() {
  return D().movements
    .filter((m) => m.type === 'Çıkış' || m.type === 'Fire')
    .reduce((s, m) => s + Math.abs(Number(m.quantity || 0)), 0);
}
