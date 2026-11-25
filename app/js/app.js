import { D, store, setOnline } from './store.js';
import { icon } from './icons.js';
import { esc, fmtDateTime, pill, modal, toast } from './ui.js';
import { VIEWS, NAV, GROUP_OF } from './views/index.js';
import { visibleNav } from './modularity.js';
import {
  initLive, liveEnabled, liveLabel, liveSnapshot, liveStale, liveError,
  liveLoading, toggleLive, retryLive, LIVE_VIEWS, getLiveMode
} from './live.js';
import { initSimFeed } from './sim_feed.js';

let current = 'dashboard';
let installPrompt = null;

/* ---------------- Kabuk ---------------- */

function shell() {
  const d = D();
  const unread = d.notifications.filter((n) => !n.read).length;
  const nav = visibleNav(NAV, d).map((g) => `<div class="nav-group"><span class="nav-group-title">${esc(g.group)}</span>${g.items.map((i) => `<a class="nav-item" href="#/${i.id}" data-view="${i.id}" data-nav="${i.id}">${icon(i.icon, 18)}<span>${esc(i.label)}</span>${i.id === 'notifications' && unread ? `<em>${unread}</em>` : ''}</a>`).join('')}</div>`).join('');
  return `
    <aside class="sidebar" id="sidebar">
      <div class="brand"><span class="brand-mark">${icon('layers', 22)}</span><div><strong>ERP <i>Studio</i></strong><span>Alüminyum Dökümhane</span></div></div>
      <div class="sidebar-scroll">${nav}</div>
      <div class="sidebar-foot">
        <div class="server-chip"><span class="server-dot ${d.settings.online ? '' : 'off'}"></span><div><strong>${esc(d.settings.serverUrl)}</strong><span>${d.settings.online ? 'LAN + WAN bağlı' : 'Kapalı çevrim · LAN'}</span></div></div>
        <span class="side-version">v1.7 · ERP Test Ortamı</span>
      </div>
    </aside>
    <div class="shell-main">
      <header class="topbar">
        <button class="icon-btn menu-btn" data-menu-toggle aria-label="Menü">${icon('menu', 20)}</button>
        <div class="breadcrumb"><span>ERP</span>${icon('chevron', 13)}<span id="crumb-group">—</span>${icon('chevron', 13)}<strong id="crumb-view">—</strong></div>
        <div class="topbar-right">
          <button class="search-trigger" data-search-open>${icon('search', 16)}<span>Ara…</span><kbd>⌘K</kbd></button>
          <button class="live-chip ${liveEnabled() ? 'on' : ''}" data-live-toggle aria-pressed="${liveEnabled()}" title="Simülasyon canlı verisini aç/kapat">${icon('activity', 15)}<span data-live-label>${esc(liveLabel())}</span></button>
          <button class="conn-chip ${d.settings.online ? 'online' : 'offline'}" data-online-toggle title="Bağlantı durumunu değiştir">${icon(d.settings.online ? 'wifi' : 'wifiOff', 15)}<span>${d.settings.online ? 'Çevrimiçi' : 'Çevrimdışı'}</span></button>
          <button class="icon-btn" data-theme-toggle title="Temayı değiştir">${icon(d.settings.theme === 'dark' ? 'sun' : 'moon', 18)}</button>
          <button class="icon-btn bell" data-notif-open title="Bildirimler">${icon('bell', 18)}${unread ? `<em>${unread}</em>` : ''}</button>
          <button class="icon-btn" id="install-btn" hidden title="Uygulamayı yükle">${icon('download', 18)}</button>
          <div class="user-chip"><span class="avatar">CK</span><div><strong>${esc(d.users[0].name)}</strong><span>${esc(d.users[0].role)}</span></div></div>
        </div>
      </header>
      <main class="content" id="main"></main>
    </div>
    <div class="sidebar-overlay" data-menu-close></div>`;
}

function liveBanner() {
  if (current === 'sim') return '';      // teşhis ekranının kendi bağlantı paneli var
  if (!liveEnabled() && getLiveMode() !== 'on') return '';
  const liveView = LIVE_VIEWS.includes(current);
  if (liveLoading() && !liveSnapshot()) {
    return `<div class="live-banner"><span class="live-dot"></span><div><strong>Simülasyon aranıyor…</strong><span>Köprüye bağlanılıyor; ana ekranlar hazır olduğunda canlı veriye geçecek.</span></div></div>`;
  }
  if (!liveSnapshot()) {
    return `<div class="live-banner off"><span class="live-dot"></span><div><strong>Simülasyon bağlantısı yok</strong><span>${esc(liveError() || 'Köprü çalışmıyor. Baslat.bat / Baslat.command ile açın.')}</span></div><button class="btn btn-ghost btn-sm" data-live-retry>${icon('refresh', 14)} Yeniden Dene</button></div>`;
  }
  if (liveStale()) {
    return `<div class="live-banner stale"><span class="live-dot"></span><div><strong>Son bilinen simülasyon verisi</strong><span>${esc(liveError() || 'Simülasyon kapalı')} · ${esc(liveSnapshot().baseUrl || '')}. Sayfa yenilenmez, bağlantı gelince tazelenir.</span></div></div>`;
  }
  return `<div class="live-banner"><span class="live-dot"></span><div><strong>Ana ERP canlı simülasyonla çalışıyor</strong><span>${liveView ? 'Bu ekran fırın, emir, sıcaklık ve alarm verisini köprüden okur.' : 'Bu ekran demo kayıtları gösterir; simülasyon yalnızca fırın/emir/telemetri üretir.'}</span></div><button class="btn btn-ghost btn-sm" data-nav="sim">${icon('link', 14)} Teşhis</button></div>`;
}

function simAlertBanner() {
  const d = D();
  // Simülasyon olayından doğan, okunmamış en güncel kritik/uyarı bildirimi.
  const n = (d.notifications || []).find((x) => !x.read && x.simEventId
    && (x.type === 'danger' || x.type === 'warning'));
  if (!n) return '';
  const danger = n.type === 'danger';
  return `<div class="sim-alert ${danger ? 'danger' : 'warn'}">
    <span class="sim-alert-ico">${icon(danger ? 'alert' : 'activity', 20)}</span>
    <div><strong>${esc(n.title)}</strong><span>${esc(n.body)}</span>
      <small>${esc(n.source)} · ${fmtDateTime(n.at)}${n.simEventId ? ' · SİM' : ''}</small></div>
    <div class="sim-alert-actions">
      <button class="btn btn-ghost btn-sm" data-nav="notifications">${icon('bell', 14)} Bildirimler</button>
      <button class="btn btn-ghost btn-sm" data-nav="plc">${icon('cpu', 14)} PLC ekranı</button>
      <button class="btn btn-ghost btn-sm" data-sim-alert-dismiss="${esc(n.id)}">${icon('check', 14)} Okundu</button>
    </div>
  </div>`;
}

function syncLiveChip() {
  const btn = document.querySelector('[data-live-toggle]');
  if (!btn) return;
  btn.classList.toggle('on', liveEnabled());
  btn.setAttribute('aria-pressed', String(liveEnabled()));
  const label = btn.querySelector('[data-live-label]');
  if (label) label.textContent = liveLabel();
}

function renderView() {
  const main = document.getElementById('main');
  if (!main) return;
  // Kapalı modülün ekranı doğrudan hash ile açılamaz (docs/12 Bölüm 5).
  const allowed = visibleNav(NAV, D()).flatMap((g) => g.items.map((i) => i.id));
  if (!allowed.includes(current)) current = 'dashboard';
  const view = VIEWS[current] || VIEWS.dashboard;
  const scroll = main.scrollTop;
  document.getElementById('crumb-group').textContent = GROUP_OF[current] || 'GENEL';
  document.getElementById('crumb-view').textContent = view.title;
  document.querySelectorAll('.nav-item').forEach((a) => a.classList.toggle('active', a.dataset.view === current));
  const liveView = LIVE_VIEWS.includes(current);
  const source = liveView && liveEnabled()
    ? `<span class="source-tag live">${icon('activity', 12)} CANLI SİMÜLASYON</span>`
    : current === 'sim'
      ? `<span class="source-tag">${icon('link', 12)} KÖPRÜ TEŞHİS</span>`
      : `<span class="source-tag">DEMO VERİ</span>`;
  main.innerHTML = `<div class="page">${liveBanner()}${simAlertBanner()}<div class="page-head"><div><h1>${esc(view.title)}</h1><p>${esc(view.subtitle)}</p></div><div class="page-head-actions">${source}<span class="date-chip">${icon('calendar', 14)} ${new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div></div>${view.render()}</div>`;
  if (view.mount) view.mount(main);
  main.scrollTop = scroll;
  document.title = `${view.title} · ERP Studio`;
}

function fullRender() {
  const app = document.getElementById('app');
  app.innerHTML = shell();
  renderView();
}

/* ---------------- Gezinme ---------------- */

function navigate(id, { replace = false } = {}) {
  if (!VIEWS[id]) id = 'dashboard';
  current = id;
  const hash = `#/${id}`;
  if (location.hash !== hash) {
    if (replace) history.replaceState(null, '', hash);
    else location.hash = hash;
  }
  const main = document.getElementById('main');
  if (main) { main.scrollTop = 0; renderView(); }
  document.getElementById('app').classList.remove('sidebar-open');
}

function fromHash() {
  const id = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return VIEWS[id] ? id : 'dashboard';
}

/* ---------------- Genel etkileşimler ---------------- */

function openSearch() {
  const links = visibleNav(NAV, D()).flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));
  const mo = modal({
    title: 'Hızlı Arama', subtitle: 'Ekranlara ve malzeme kartlarına doğrudan gitmek için yazın.',
    body: `<div class="search-box big">${icon('search', 18)}<input class="input" id="qs" placeholder="Örn. stok, reçete, magnezyum…" autocomplete="off"></div><div id="qs-results" class="qs-results"></div>`,
    actions: [{ label: 'Kapat', onClick: (_e, close) => close() }]
  });
  const draw = (q = '') => {
    const term = q.trim().toLocaleLowerCase('tr');
    const found = links.filter((l) => !term || `${l.label} ${l.group}`.toLocaleLowerCase('tr').includes(term));
    const mats = D().materials.filter((m) => term && `${m.code} ${m.name}`.toLocaleLowerCase('tr').includes(term)).slice(0, 4);
    mo.el.querySelector('#qs-results').innerHTML = `
      ${found.map((l) => `<a class="qs-row" data-nav="${l.id}">${icon(l.icon, 16)}<span>${esc(l.label)}</span><small>${esc(l.group)}</small>${icon('chevron', 14)}</a>`).join('')}
      ${mats.map((m) => `<a class="qs-row" data-nav="stock">${icon('box', 16)}<span>${esc(m.name)}</span><small>${esc(m.code)} · ${esc(m.category)}</small>${icon('chevron', 14)}</a>`).join('')}
      ${!found.length && !mats.length ? '<div class="muted pad">Sonuç yok</div>' : ''}`;
  };
  draw();
  mo.el.querySelector('#qs').addEventListener('input', (e) => draw(e.target.value));
  setTimeout(() => mo.el.querySelector('#qs').focus(), 60);
}

function openNotifications() {
  const list = D().notifications.slice(0, 8).map((n) => `<div class="notif-row ${n.read ? 'read' : ''}">
    <span class="notif-ico ${n.type === 'danger' ? 'danger' : n.type === 'warning' ? 'warn' : n.type === 'success' ? 'ok' : 'info'}">${icon(n.type === 'danger' || n.type === 'warning' ? 'alert' : n.type === 'success' ? 'check' : 'activity', 16)}</span>
    <div class="notif-main"><strong>${esc(n.title)}</strong><span>${esc(n.body)}</span><small>${esc(n.source)} · ${fmtDateTime(n.at)}${n.simEventId ? ' · SİM' : ''}</small></div></div>`).join('');
  modal({
    title: 'Bildirimler', subtitle: `${D().notifications.filter((n) => !n.read).length} okunmamış bildirim`, size: 'wide',
    body: `<div class="notif-list">${list}</div>`,
    actions: [
      { label: 'Tümünü Okundu İşaretle', icon: 'check', onClick: (_e, close) => {
        store.change((d) => d.notifications.forEach((n) => { n.read = true; }));
        close(); fullRender(); toast('Bildirimler okundu');
      } },
      { label: 'Bildirim Merkezi', kind: 'primary', icon: 'bell', onClick: (_e, close) => { close(); navigate('notifications'); } }
    ]
  });
}

function toggleOnline() {
  const next = !D().settings.online;
  store.change(() => setOnline(next));
  fullRender();
  toast(next ? 'İnternet açıldı, kuyruktaki kayıtlar gönderildi' : 'Kapalı çevrim: üretim devam ediyor, dış bildirimler kuyrukta', next ? 'success' : 'info');
}

function toggleTheme() {
  store.change((d) => { d.settings.theme = d.settings.theme === 'dark' ? 'light' : 'dark'; });
  document.documentElement.dataset.theme = D().settings.theme;
  fullRender();
}

/* ---------------- Olaylar ---------------- */

document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    e.preventDefault();
    const m = document.querySelector('.modal-backdrop');
    if (m) m.remove();
    navigate(nav.dataset.nav);
    return;
  }
  if (e.target.closest('[data-live-toggle]')) {
    const wasOn = liveEnabled();
    toggleLive().then((on) => {
      fullRender();
      syncLiveChip();
      toast(on ? 'Ana ekranlar simülasyon verisiyle besleniyor' : 'Demo veriye dönüldü', on ? 'success' : 'info');
    }).catch(() => {
      fullRender();
      toast(wasOn ? 'Simülasyon verisi kapatıldı' : 'Köprüye ulaşılamadı', 'danger');
    });
    return;
  }
  if (e.target.closest('[data-live-retry]')) { retryLive(); return; }
  const dismiss = e.target.closest('[data-sim-alert-dismiss]');
  if (dismiss) {
    const id = dismiss.dataset.simAlertDismiss;
    store.change((d) => { const n = d.notifications.find((x) => x.id === id); if (n) n.read = true; });
    fullRender();
    toast('Simülasyon uyarısı okundu olarak işaretlendi', 'info');
    return;
  }
  if (e.target.closest('[data-online-toggle]')) { toggleOnline(); return; }
  if (e.target.closest('[data-theme-toggle]')) { toggleTheme(); return; }
  if (e.target.closest('[data-notif-open]')) { openNotifications(); return; }
  if (e.target.closest('[data-search-open]')) { openSearch(); return; }
  if (e.target.closest('[data-menu-toggle]')) { document.getElementById('app').classList.toggle('sidebar-open'); return; }
  if (e.target.closest('[data-menu-close]')) { document.getElementById('app').classList.remove('sidebar-open'); return; }
  if (e.target.closest('#install-btn') && installPrompt) {
    installPrompt.prompt();
    installPrompt.userChoice.then(() => { installPrompt = null; document.getElementById('install-btn').hidden = true; });
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') document.getElementById('app').classList.remove('sidebar-open');
});

window.addEventListener('erp:live', () => {
  syncLiveChip();
  if (!liveEnabled()) return;
  if (!LIVE_VIEWS.includes(current)) return;
  if (document.querySelector('.modal-backdrop, .drag-ghost')) return;
  renderView();
});

window.addEventListener('hashchange', () => {
  const id = fromHash();
  if (id !== current) { current = id; renderView(); document.getElementById('app').classList.remove('sidebar-open'); }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.hidden = false;
});

/* ---------------- Başlatma ---------------- */

window.App = {
  navigate,
  refresh: renderView,
  renderShell: fullRender,
  toast,
  store,
  get view() { return current; }
};

document.documentElement.dataset.theme = D().settings.theme || 'light';
current = fromHash();
fullRender();
initLive();
initSimFeed();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => { /* önbellek opsiyonel */ });
}
