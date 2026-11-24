// Simülasyon → ERP bildirim köprüsü.
//
// Simülasyon senaryoları (sensör arızası, aşırı sıcaklık, brülör arızası,
// kapı açık, döküm) sunucuda olay üretir. Bu modül `/api/sim/events`
// ucunu 3 saniyede bir yoklar ve her yeni olayı ERP bildirim merkezine
// **salt okunur** biçimde taşır.
//
// * İşletme tablularına (stok, cari, muhasebe, üretim kaydı) yazmaz.
// * Olay kimliği ile tekilleştirir; sayfa yenilense de aynı olay iki kez düşmez.
// * Simülasyon kapalıysa sessizce bekler; ERP'nin demo modunu bozmaz.
import { D, store, addNotification } from './store.js';
import { toast } from './ui.js';

const EVENTS_API = '/api/sim/events';
const SEEN_KEY = 'erp_sim_last_event_v1';
const POLL_MS = 3000;

let lastId = readLastId();
let started = false;
let timer = null;
let busy = false;

function readLastId() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SEEN_KEY) : null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch { return 0; }
}

function saveLastId(id) {
  lastId = Math.max(lastId, Number(id) || 0);
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(SEEN_KEY, String(lastId)); } catch { /* kota */ }
}

function notificationType(ev) {
  const sev = String(ev.severity || '').toLowerCase();
  if (sev === 'critical' || sev === 'danger' || sev === 'error') return 'danger';
  if (sev === 'warning' || sev === 'warn') return 'warning';
  if (sev === 'success' || sev === 'ok') return 'success';
  return 'info';
}

function sourceLabel(ev) {
  const where = ev.furnace || ev.module || 'SIM';
  return `Simülasyon · ${where}`;
}

function alreadyNotified(eventId) {
  if (!eventId) return false;
  return (D().notifications || []).some((n) => Number(n.simEventId) === Number(eventId));
}

function ingest(ev) {
  const id = Number(ev.id) || 0;
  if (!id || alreadyNotified(id)) return false;
  const type = notificationType(ev);
  const title = `${ev.title || 'Simülasyon olayı'}${ev.furnace ? ` · ${ev.furnace}` : ''}`;
  const body = [ev.message, ev.data?.test ? 'TEST — yalnızca bildirim üretir, işletme kaydı oluşturmaz.' : '']
    .filter(Boolean).join(' ');
  store.change((d) => {
    addNotification({ type, title, body, source: sourceLabel(ev), simEventId: id });
    d.activity = (d.activity || []).slice(0, 40);
  }, { silent: true });
  return true;
}

function updateBadges() {
  const unread = D().notifications.filter((n) => !n.read).length;
  document.querySelectorAll('[data-notif-open]').forEach((btn) => {
    let badge = btn.querySelector('em');
    if (unread) {
      if (!badge) { badge = document.createElement('em'); btn.appendChild(badge); }
      badge.textContent = String(unread);
    } else if (badge) badge.remove();
  });
  document.querySelectorAll('.nav-item[data-view="notifications"]').forEach((a) => {
    let badge = a.querySelector('em');
    if (unread) {
      if (!badge) { badge = document.createElement('em'); a.appendChild(badge); }
      badge.textContent = String(unread);
    } else if (badge) badge.remove();
  });
}

function announce(events) {
  if (typeof document === 'undefined') return;   // Node duman testi
  const critical = events.filter((e) => ['critical', 'danger', 'error'].includes(String(e.severity).toLowerCase()));
  const picked = critical.length ? critical[critical.length - 1] : events[events.length - 1];
  if (!picked) return;
  const title = `${picked.title || 'Simülasyon olayı'}${picked.furnace ? ` · ${picked.furnace}` : ''}`;
  toast(title, critical.length ? 'danger' : 'info');
}

function refreshVisible() {
  if (typeof document === 'undefined') return;
  // Modal veya sürükleme açıkken ekranı yeniden çizmeyiz; kullanıcı işini kaybetmesin.
  if (document.querySelector('.modal-backdrop, .drag-ghost')) { updateBadges(); return; }
  if (window.App && typeof window.App.refresh === 'function') {
    window.App.refresh();           // sayfa kabuğu değil, yalnızca görünüm + uyarı bandı
    updateBadges();
  }
}

async function poll() {
  if (busy || typeof fetch === 'undefined') return;
  busy = true;
  try {
    const res = await fetch(`${EVENTS_API}?after=${encodeURIComponent(lastId)}&limit=100`, { cache: 'no-store' });
    if (!res.ok) return;             // köprü yok / eski sürüm: sessizce bekle
    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const latest = Number(data.latestId) || 0;

    // Simülasyon yeniden başladıysa kimlik 1'e döner; tıkanmayı aç ve
    // bir sonraki turda sıfırdan oku (bu turda eski `after` ile boş geldik).
    if (latest && latest < lastId) { lastId = 0; saveLastId(0); return; }

    // İlk açılışta tüm geçmişi değil, son 5 olayı bildirim olarak göster.
    const stored = (() => {
      try { return typeof localStorage !== 'undefined' ? Number(localStorage.getItem(SEEN_KEY) || 0) : 0; }
      catch { return 0; }
    })();
    const firstRun = lastId === 0 && stored === 0;
    const picked = firstRun ? events.slice(-5) : events;
    const fresh = [];
    for (const ev of picked) {
      if (ingest(ev)) fresh.push(ev);
      if (Number(ev.id) > lastId) saveLastId(ev.id);
    }
    if (fresh.length) { announce(fresh); refreshVisible(); }
  } catch { /* köprü kapalı; bir sonraki turda yeniden dene */ }
  finally { busy = false; }
}

/** Uygulama açılışında bir kez çağrılır. */
export function initSimFeed() {
  if (started || typeof setInterval === 'undefined') return;
  started = true;
  poll();
  timer = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    poll();
  }, POLL_MS);
}

/** Test/teşhis: son görülen olay kimliği. */
export function simFeedLastId() { return lastId; }

/** Test: ağ olmadan tek olayı bildirime dönüştürür. */
export function ingestSimEventForTest(ev) { return ingest(ev); }
