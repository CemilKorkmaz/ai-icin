import { D, stockState, material, matName } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmtNum, fmtDateTime, fmtDate, pill, dot, progress, barChart, sparkline, emptyState } from '../ui.js';
import { CATEGORY_ORDER, STAGES } from '../seed.js';
import { liveEnabled, liveSnapshot, liveStats, mapLiveFurnaces, statusLabel, statusTone } from '../live.js';

const DAYS = ['27 Eki', '28 Eki', '29 Eki', '30 Eki', '31 Eki', '01 Kas', '02 Kas'];
const PRODUCTION = [52.4, 61.8, 58.2, 47.9, 64.1, 68.4, 36.2];

function kpi({ label, value, unit, hint, kind, ico, spark, trend }) {
  return `<div class="kpi kpi-${kind}">
    <div class="kpi-top"><span class="kpi-icon">${icon(ico, 19)}</span><span class="kpi-trend ${trend?.startsWith('-') ? 'down' : 'up'}">${esc(trend || '')}</span></div>
    <div class="kpi-value">${value}<small>${unit || ''}</small></div>
    <div class="kpi-label">${esc(label)}</div>
    <div class="kpi-foot">${spark || ''}<span>${esc(hint)}</span></div>
  </div>`;
}

function liveFurnaceCard(f) {
  const l = f.live || {};
  const alarm = l.alarmActive || String(l.status || '').toUpperCase() === 'ALARM';
  const temp = l.temperatureC === null || l.temperatureC === undefined ? '—' : fmtNum(l.temperatureC, 1);
  const target = l.targetC === null || l.targetC === undefined ? '—' : fmtNum(l.targetC, 0);
  return `<article class="sim-furnace ${alarm ? 'alarm' : ''}">
    <div class="sim-furnace-top"><strong>${esc(f.name)}</strong>${pill(statusLabel(l.status), statusTone(l.status))}</div>
    <div class="sim-temp">${temp}<small>°C</small><span class="sim-pct">hedef ${target} °C</span></div>
    <div class="sim-meta"><span>${esc(f.simName || '')}</span><span>${esc(f.mapped ? f.id : 'eşleşmedi')}</span></div>
    ${alarm ? `<div class="sim-alarm">${icon('alert', 13)} ${esc(l.alarm || 'Güvenlik sınırı aşıldı')}</div>` : ''}
  </article>`;
}

function liveDashboard() {
  const d = D();
  const snap = liveSnapshot();
  if (!snap) {
    return `<section class="card">${emptyState('Simülasyon bağlantısı yok. Köprüyü başlatın ve Yeniden Dene deyin.', 'wifiOff')}</section>`;
  }
  const stats = liveStats(snap);
  const furnaces = mapLiveFurnaces(snap, d.machines);
  const orders = Array.isArray(snap.orders) ? snap.orders : [];
  const avg = stats.avgTemp === null ? '—' : fmtNum(stats.avgTemp, 1);
  const eyebrow = snap.stale ? 'SON SİMÜLASYON VERİSİ' : (snap.ok === false ? 'SİMÜLASYON KAPALI' : 'CANLI SİMÜLASYON');
  const orderRows = orders.slice(0, 8).map((o) => `<tr>
    <td class="cell-strong">${esc(o.id || '—')}</td>
    <td>${esc(o.product || '—')}</td>
    <td>${esc(o.furnace || '—')}</td>
    <td>${o.targetC === null || o.targetC === undefined ? '—' : fmtNum(o.targetC, 0)} °C</td>
    <td>${o.durationMin === null || o.durationMin === undefined ? '—' : fmtNum(o.durationMin, 0)} dk</td>
    <td>${pill(statusLabel(o.state), statusTone(o.state))}</td>
    <td>${o.remainingMin === null || o.remainingMin === undefined ? '—' : fmtNum(o.remainingMin, 1) + ' dk'}</td>
  </tr>`).join('');
  return `
    <div class="hero live-hero">
      <div class="hero-text">
        <span class="hero-eyebrow">${icon('activity', 14)} ${eyebrow} · ${esc(snap.baseUrl || '')}</span>
        <h2>${snap.stale ? 'Fırın hattı · son veri' : (snap.ok === false ? 'Fırın hattı kapalı' : 'Fırın hattı canlı')}</h2>
        <p>${esc(d.settings.company)} · ${stats.furnaceCount} fırın · eşleme ${stats.mappedCount}/${stats.furnaceCount}${snap.stale ? ' · son bilinen veri' : ''}</p>
        <div class="hero-actions">
          <button class="btn btn-light" data-nav="production">${icon('layers', 16)} Canlı Emirler</button>
          <button class="btn btn-ghost-light" data-nav="sim">${icon('link', 16)} Bağlantı & Teşhis</button>
        </div>
      </div>
      <div class="hero-stat">
        <div class="hero-ring"><span>${avg}</span><small>ortalama °C</small></div>
        <span class="hero-chip">${icon(snap.stale ? 'alert' : 'check', 13)} ${snap.stale ? 'Bağlantı yok · son veri' : 'Köprü bağlı'}</span>
      </div>
    </div>

    <div class="kpi-grid">
      ${kpi({ label: 'Simüle fırın', value: stats.furnaceCount, unit: 'adet', hint: `${stats.mappedCount} profil makinesine eşleşti`, kind: 'indigo', ico: 'flame', trend: snap.mode === 'DEMO' ? '● SİM DEMO' : '● GERÇEK', spark: '' })}
      ${kpi({ label: 'Ortalama sıcaklık', value: avg, unit: '°C', hint: `En yüksek ${stats.maxTemp === null ? '—' : fmtNum(stats.maxTemp, 1)} °C`, kind: 'cyan', ico: 'activity', trend: stats.alarms ? '● Alarm var' : '✓ Normal', spark: '' })}
      ${kpi({ label: 'Aktif alarm', value: stats.alarms, unit: 'fırın', hint: stats.alarms ? 'Alarmlı fırın kartı kırmızı' : 'Alarm yok', kind: 'amber', ico: 'alert', trend: stats.alarms ? '● Aksiyon' : '✓ Sakin', spark: '' })}
      ${kpi({ label: 'Çalışan emir', value: stats.running, unit: 'emir', hint: `${stats.orders} emir · ${stats.completed} tamamlandı`, kind: 'violet', ico: 'clipboard', trend: '◷ canlı', spark: '' })}
    </div>

    <section class="card">
      <div class="card-head"><div><h3>Fırınlar</h3><p>Simülasyonun yayınladığı anlık sıcaklık, hedef ve alarm durumu.</p></div><span class="card-tag">${icon('activity', 14)} ${esc(snap.checkedAt ? fmtDateTime(snap.checkedAt) : 'canlı')}</span></div>
      <div class="sim-furnace-grid">${furnaces.length ? furnaces.map(liveFurnaceCard).join('') : emptyState('Fırın verisi yok', 'flame')}</div>
    </section>

    <div class="grid-2">
      <section class="card">
        <div class="card-head"><div><h3>Simülasyon üretim emirleri</h3><p>Emirler simülasyondan salt okunur gelir; ERP döküm kodu üretmez.</p></div><button class="btn btn-ghost btn-sm" data-nav="sim">${icon('sliders', 14)} Yönet</button></div>
        ${orders.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Emir</th><th>Ürün</th><th>Fırın</th><th>Hedef</th><th>Süre</th><th>Durum</th><th>Kalan</th></tr></thead><tbody>${orderRows}</tbody></table></div>` : emptyState('Henüz simülasyon emri yok', 'clipboard')}
      </section>
      <section class="card">
        <div class="card-head"><div><h3>Veri kaynağı</h3><p>Hangi ekran neyden besleniyor?</p></div><span class="card-tag">${esc(snap.mode || '—')}</span></div>
        <div class="conn-row"><span class="conn-ico ok">${icon('flame', 18)}</span><div><strong>Fırınlar ve emirler</strong><span>Canlı simülasyon · ${esc(snap.baseUrl || '')}</span></div>${pill('CANLI', 'ok')}</div>
        <div class="conn-row"><span class="conn-ico info">${icon('database', 18)}</span><div><strong>Edge kayıt defteri</strong><span>${stats.batches} batch · ${stats.readings} okuma</span></div>${pill(String(stats.batches), 'info')}</div>
        <div class="conn-row"><span class="conn-ico soft">${icon('box', 18)}</span><div><strong>Stok, cari, muhasebe</strong><span>Simülasyon bu verileri üretmez; demo kayıtlar açıkça işaretlidir.</span></div>${pill('DEMO', 'neutral')}</div>
        <p class="micro">Ana ekranlarda gördüğünüz fırın, sıcaklık, alarm ve emirler doğrudan köprüden gelir; bu ekran hiçbir ERP tablosuna yazmaz.</p>
      </section>
    </div>`;
}

export const dashboard = {
  title: 'Genel Bakış',
  subtitle: 'Fabrikanın anlık durumu, üretim akışı ve kritik uyarılar',

  render() {
    if (liveEnabled()) return liveDashboard();
    const d = D();
    const critical = d.materials.filter((m) => stockState(m).key === 'critical');
    const warnings = d.materials.filter((m) => stockState(m).key === 'warn');
    const pending = d.shipments.filter((s) => !s.archived);
    const queued = d.outbox.filter((o) => o.status === 'queued').length;
    const activeLots = d.lots.filter((l) => l.stage !== 'Mamul Stok' && l.stage !== 'Sevkiyat');
    const unread = d.notifications.filter((n) => !n.read).length;
    const todayTon = d.lots.filter((l) => (l.startedAt || '').startsWith('2026-11-02')).reduce((s, l) => s + Number(l.weightTon || 0), 0);

    const stageRows = STAGES.slice(0, 7).map((st) => {
      const n = d.lots.filter((l) => l.stage === st).length;
      const pct = Math.min(100, n * 22);
      return `<div class="stage-row" data-nav="production"><span class="stage-name">${dot('#4f46e5')}${esc(st)}</span>${progress(n, 5, '#4f46e5')}<span class="stage-count">${n}</span></div>`;
    }).join('');

    const criticalRows = critical.concat(warnings).slice(0, 5).map((m) => {
      const st = stockState(m);
      return `<div class="list-row" data-nav="stock"><span class="list-ico">${icon(st.cls === 'danger' ? 'alert' : 'box', 16)}</span><div class="list-main"><strong>${esc(m.name)}</strong><span>${esc(m.category)} · ${fmtNum(m.criticalMin)} ${esc(m.unit)} kritik sınır</span></div><span class="list-value" style="color:${st.color}">${fmtNum(m.stock)} ${esc(m.unit)}</span>${pill(st.label, st.cls)}</div>`;
    }).join('');

    const activityRows = d.activity.slice(0, 6).map((a) => `<div class="list-row"><span class="list-ico soft">${icon(a.icon, 15)}</span><div class="list-main"><strong>${esc(a.text)}</strong><span>${esc(a.user || 'Sistem')} · ${fmtDateTime(a.at)}</span></div></div>`).join('');

    const catRows = CATEGORY_ORDER.map((c) => {
      const items = d.materials.filter((m) => m.category === c && m.stock > 0);
      const total = items.reduce((s, m) => s + Number(m.stock || 0), 0);
      return `<div class="cat-row"><span>${esc(c)}</span><strong>${fmtNum(total)} <small>kg/adet</small></strong></div>`;
    }).join('');

    return `
      <div class="hero">
        <div class="hero-text">
          <span class="hero-eyebrow">${icon('activity', 14)} CANLI ÜRETİM PANELİ</span>
          <h2>İyi çalışmalar, ${esc(d.users[0].name.split(' ')[0])} 👋</h2>
          <p>${esc(d.settings.company)} · ${fmtDate(new Date().toISOString())} · Sunucu: <strong>${esc(d.settings.serverUrl)}</strong></p>
          <div class="hero-actions">
            <button class="btn btn-light" data-nav="production">${icon('flame', 16)} Üretim Akışı</button>
            <button class="btn btn-ghost-light" data-nav="reports">${icon('chart', 16)} Raporları Aç</button>
          </div>
        </div>
        <div class="hero-stat">
          <div class="hero-ring"><span>${fmtNum(PRODUCTION.reduce((a, b) => a + b, 0), 1)}</span><small>ton / 7 gün</small></div>
          <span class="hero-chip">${icon('check', 13)} Kapalı çevrim aktif</span>
        </div>
      </div>

      <div class="kpi-grid">
        ${kpi({ label: 'Bugün dökülen', value: fmtNum(todayTon, 1), unit: 'ton', hint: `${activeLots.length} aktif döküm kodu`, kind: 'indigo', ico: 'flame', trend: '▲ %8,4', spark: sparkline(PRODUCTION) })}
        ${kpi({ label: 'Aktif üretim partisi', value: activeLots.length, unit: 'adet', hint: `${STAGES.length} aşamalı hat`, kind: 'cyan', ico: 'layers', trend: '▲ 2 yeni', spark: sparkline([3, 4, 4, 5, 5, 6, activeLots.length], '#06b6d4') })}
        ${kpi({ label: 'Kritik stok', value: critical.length, unit: 'kalem', hint: `${warnings.length} kalem uyarı bandında`, kind: 'amber', ico: 'alert', trend: critical.length ? '● Aksiyon gerekli' : '✓ Normal', spark: sparkline([1, 2, 1, 2, 3, 2, critical.length], '#f59e0b') })}
        ${kpi({ label: 'Onay bekleyen', value: pending.length, unit: 'sevkiyat', hint: `${queued} bildirim kuyrukta`, kind: 'violet', ico: 'clipboard', trend: '◷ 2 kademeli', spark: sparkline([2, 3, 2, 4, 3, 3, pending.length], '#8b5cf6') })}
      </div>

      <div class="grid-2">
        <section class="card">
          <div class="card-head"><div><h3>Son 7 Gün Üretim</h3><p>Döküm tonajı, alaşım bağımsız</p></div><span class="card-tag">${icon('trend', 14)} Ton</span></div>
          ${barChart({ labels: DAYS, values: PRODUCTION, color: '#4f46e5', unit: 'ton' })}
        </section>
        <section class="card">
          <div class="card-head"><div><h3>Stok Sağlığı</h3><p>Kritik seviyeye yaklaşan malzemeler</p></div><button class="btn btn-ghost btn-sm" data-nav="stock">Tümü ${icon('chevron', 14)}</button></div>
          <div class="stock-health">
            ${criticalRows || '<div class="muted pad">Kritik malzeme yok</div>'}
          </div>
          <div class="card-divider"></div>
          <div class="cat-summary">${catRows}</div>
        </section>
      </div>

      <div class="grid-3">
        <section class="card">
          <div class="card-head"><div><h3>Üretim Hattı</h3><p>Aşama bazında döküm kodu sayısı</p></div></div>
          <div class="stage-list">${stageRows}</div>
        </section>
        <section class="card">
          <div class="card-head"><div><h3>Son Hareketler</h3><p>Denetim akışı</p></div><span class="card-tag">${icon('activity', 14)} Canlı</span></div>
          <div class="list-scroll">${activityRows}</div>
        </section>
        <section class="card connection-card">
          <div class="card-head"><div><h3>Bağlantı & Kuyruk</h3><p>Kapalı çevrim durumu</p></div></div>
          <div class="conn-row"><span class="conn-ico ok">${icon('wifi', 18)}</span><div><strong>Yerel ağ (LAN)</strong><span>${esc(d.settings.serverIp)} · üretim aktif</span></div>${pill('Bağlı', 'ok')}</div>
          <div class="conn-row"><span class="conn-ico ${d.settings.online ? 'ok' : 'warn'}">${icon(d.settings.online ? 'wifi' : 'wifiOff', 18)}</span><div><strong>İnternet (WAN)</strong><span>${d.settings.online ? 'Dış servisler erişilebilir' : 'Dış servisler kuyrukta'}</span></div>${pill(d.settings.online ? 'Çevrimiçi' : 'Çevrimdışı', d.settings.online ? 'ok' : 'warn')}</div>
          <div class="conn-row"><span class="conn-ico info">${icon('mail', 18)}</span><div><strong>Giden kutu</strong><span>${queued} kayıt gönderim bekliyor</span></div>${pill(String(queued), 'info')}</div>
          <button class="btn btn-primary btn-full" data-online-toggle>${icon(d.settings.online ? 'wifiOff' : 'wifi', 16)} ${d.settings.online ? 'Çevrimdışı Moda Geç (Test)' : 'İnterneti Aç & Kuyruğu Gönder'}</button>
          <p class="micro">Kapalı çevrimde üretim durmaz; SMS, e-posta ve raporlar kuyrukta bekler.</p>
          <div class="card-divider"></div>
          <div class="conn-row"><span class="conn-ico soft">${icon('bell', 18)}</span><div><strong>Okunmamış bildirim</strong><span>${unread} yeni bildirim</span></div><button class="btn btn-ghost btn-sm" data-notif-open>Aç</button></div>
        </section>
      </div>`;
  }
};
