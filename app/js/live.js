// Canlı simülasyon verisi — ana ERP ekranlarını (Panel, Makine Parkı, PLC, Üretim)
// demo verisi yerine köprüden gelen fırın/emir/telemetri ile besler.
//
// Tasarım kuralları:
// * Yalnızca OKUR: `/api/sim/live` çağrılır, hiçbir ERP koleksiyonuna yazılmaz.
// * Simülasyon kapalıysa demo verisine geri dönülmez; "bağlantı yok" gösterilir.
// * WebSocket kullanılmaz; 3 saniyede bir REST ile tazelenir.
// * Node duman testlerinde ağ çağrısı yapılmaz (mod varsayılan olarak kapalı kalır).

import { D } from './store.js';

const API = '/api/sim/live';
const PREF = 'erp_live_mode_v1';
/** Ana ERP ekranlarından hangileri canlı simülasyon verisiyle beslenir. */
export const LIVE_VIEWS = ['dashboard', 'machines', 'plc', 'production'];
const REFRESH_MS = 3000;

let mode = readMode();          // 'auto' | 'on' | 'off'
let snapshot = null;            // son /api/sim/live yanıtı
let error = '';
let loading = false;
let timer = null;
let lastFetchAt = 0;
const listeners = new Set();

function readMode() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PREF) : null;
    return ['on', 'off', 'auto'].includes(raw) ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

function saveMode() {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(PREF, mode); } catch { /* kota */ }
}

function notify() {
  listeners.forEach((fn) => { try { fn(snapshot); } catch { /* dinleyici hatası */ } });
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('erp:live', { detail: { live: liveEnabled(), snapshot } }));
  }
}

export function onLive(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLiveMode() { return mode; }
export function liveSnapshot() { return snapshot; }
export function liveError() { return error; }
export function liveLoading() { return loading; }
export function liveLastFetchAt() { return lastFetchAt; }

/** Simülasyon verisi ana ekranlarda kullanılmalı mı? */
export function liveEnabled() {
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  return !!snapshot;             // auto: köprü yanıt verdiyse canlıya geç
}

/** Bağlantı var mı, son veri bayat mı? */
export function liveConnected() { return !!snapshot && snapshot.ok === true && !snapshot.stale; }
export function liveStale() { return !!snapshot && snapshot.stale === true; }

export function liveLabel() {
  if (mode === 'off') return 'Demo veri';
  if (!snapshot) return loading ? 'Simülasyon aranıyor…' : (mode === 'on' ? 'Bağlantı yok' : 'Demo veri');
  if (snapshot.stale) return 'Son simülasyon verisi';
  if (snapshot.ok) return 'Canlı simülasyon';
  return 'Simülasyon kapalı';
}

async function fetchLive() {
  if (loading) return null;        // yavaş köprüde istekler üst üste binmesin
  loading = true;
  notify();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 4500) : null;
  try {
    const res = await fetch(API, { cache: 'no-store', signal: controller ? controller.signal : undefined });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Köprü ${res.status} döndü`);
    snapshot = data;
    error = data.ok ? '' : (data.error || 'Simülasyon kapalı');
    lastFetchAt = Date.now();
    return data;
  } catch (err) {
    error = err?.name === 'AbortError' ? 'Köprü yanıt vermedi' : (err?.message || 'Köprüye ulaşılamadı');
    // Son görüntüyü silmeyiz; bayat olarak işaretleriz. Böylece ekran boşalmaz,
    // kullanıcı “son bilinen veri” etiketini görür ve bağlantı gelince tazelenir.
    if (snapshot) snapshot = { ...snapshot, stale: true };
    return null;
  } finally {
    loading = false;
    if (timeout) clearTimeout(timeout);
    notify();
  }
}

function startTimer() {
  if (timer || typeof setInterval === 'undefined') return;
  timer = setInterval(() => {
    if (mode === 'off') return;
    if (typeof document !== 'undefined' && document.hidden) return;
    fetchLive();
  }, REFRESH_MS);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Uygulama açılışında bir kez çağrılır. */
export async function initLive() {
  if (mode === 'off') return null;
  const data = await fetchLive();
  // auto modda köprü sonradan açılabilir; bu yüzden ilk deneme başarısız olsa da yoklama sürer.
  startTimer();
  return data;
}

/** Kullanıcı üst çubuktan açıp kapatabilir. */
export async function toggleLive() {
  mode = liveEnabled() ? 'off' : 'on';
  saveMode();
  if (mode === 'off') {
    stopTimer();
    notify();
    return false;
  }
  await fetchLive();
  startTimer();
  return true;
}

export async function retryLive() {
  const data = await fetchLive();
  if (mode !== 'off') startTimer();
  return data;
}

/** Test/geliştirme: ağ olmadan verilen anlık görüntüyü uygular. */
export function applyLiveSnapshot(snap, nextMode = 'on') {
  snapshot = snap;
  mode = nextMode;
  error = snap?.ok === false ? (snap.error || 'Simülasyon kapalı') : '';
  notify();
}

/* ------------------------------ saf dönüşümler ------------------------------ */

export function normalizeStatus(value) {
  const text = String(value || '').trim().toUpperCase();
  return text || 'BILINMIYOR';
}

const STATUS_LABEL = {
  KAPALI: 'Kapalı', ISINIYOR: 'Isınıyor', BEKLETIYOR: 'Bekliyor',
  CALISIYOR: 'Çalışıyor', ALARM: 'Alarm', TAMAMLANDI: 'Tamamlandı',
  BILINMIYOR: 'Bilinmiyor', CREATED: 'Oluşturuldu', RUNNING: 'Çalışıyor',
  COMPLETED: 'Tamamlandı', CANCELLED: 'İptal'
};

export function statusLabel(value) { return STATUS_LABEL[normalizeStatus(value)] || String(value || '—'); }

export function statusTone(value) {
  const s = normalizeStatus(value);
  if (s === 'ALARM') return 'danger';
  if (s === 'ISINIYOR') return 'warn';
  if (s === 'CALISIYOR' || s === 'RUNNING' || s === 'COMPLETED' || s === 'TAMAMLANDI') return 'ok';
  if (s === 'BEKLETIYOR' || s === 'CREATED') return 'info';
  return 'neutral';
}

/**
 * Simülasyon fırınlarını profil makineleriyle birleştirir.
 * Eşleşmeyen fırın da gösterilir; `mapped:false` ile işaretlenir.
 */
export function mapLiveFurnaces(snap = snapshot, machines = D()?.machines || []) {
  const live = snap && Array.isArray(snap.furnaces) ? snap.furnaces : [];
  const pairs = (snap && snap.mapping && Array.isArray(snap.mapping.pairs)) ? snap.mapping.pairs : [];
  return live.map((f, index) => {
    const pair = pairs.find((p) => p.furnace === f.name);
    const base = pair ? machines.find((m) => m.id === pair.machineId) : null;
    return {
      id: pair?.machineId || `SIM-${index + 1}`,
      name: base?.name || pair?.machineName || f.name,
      type: base?.type || pair?.machineType || 'FURNACE',
      mode: 'PLC',
      plantId: base?.plantId || null,
      capacityTon: base?.capacityTon ?? null,
      simName: f.name,
      mapped: !!pair,
      live: f
    };
  });
}

export function liveStats(snap = snapshot) {
  const furnaces = Array.isArray(snap?.furnaces) ? snap.furnaces : [];
  const orders = Array.isArray(snap?.orders) ? snap.orders : [];
  const temps = furnaces.map((f) => Number(f.temperatureC)).filter((n) => Number.isFinite(n));
  const alarms = furnaces.filter((f) => f.alarmActive || normalizeStatus(f.status) === 'ALARM');
  const running = orders.filter((o) => normalizeStatus(o.state) === 'RUNNING');
  const completed = orders.filter((o) => normalizeStatus(o.state) === 'COMPLETED');
  return {
    furnaceCount: furnaces.length,
    mappedCount: snap?.mapping?.matched ?? 0,
    avgTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
    maxTemp: temps.length ? Math.max(...temps) : null,
    alarms: alarms.length,
    orders: orders.length,
    running: running.length,
    completed: completed.length,
    batches: snap?.edge?.batches ?? 0,
    readings: snap?.edge?.readings ?? 0,
    baseUrl: snap?.baseUrl || '',
    mode: snap?.mode || '',
    checkedAt: snap?.checkedAt || snap?.lastOkAt || '',
    stale: !!snap?.stale
  };
}

/** Üretim ekranındaki sütunlar; simülasyon emirleri salt okunurdur. */
export function orderColumns(orders = []) {
  const cols = [
    { key: 'CREATED', label: 'Oluşturuldu', ico: 'clipboard' },
    { key: 'RUNNING', label: 'Çalışıyor', ico: 'flame' },
    { key: 'COMPLETED', label: 'Tamamlandı', ico: 'check' },
    { key: 'CANCELLED', label: 'İptal', ico: 'x' }
  ];
  return cols.map((c) => ({
    ...c,
    orders: orders.filter((o) => normalizeStatus(o.state) === c.key)
  }));
}
