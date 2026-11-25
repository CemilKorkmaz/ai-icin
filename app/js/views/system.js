import { D, store, setOnline, flushOutbox, addActivity, addNotification, uid, nowISO } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmtDateTime, fmtDate, pill, field, input, select, formData, modal, toast, downloadText, confirmDialog } from '../ui.js';

let notifTab = 'Bildirimler';
let settingsTab = 'Genel';

/* ============================ BİLDİRİMLER & KUYRUK ============================ */

export const notificationsView = {
  title: 'Bildirimler & Giden Kutu',
  subtitle: 'Sistem içi uyarılar, SMS / e-posta kuyruğu ve çevrimdışı çalışma',

  render() {
    const d = D();
    const queued = d.outbox.filter((o) => o.status === 'queued').length;
    const unread = d.notifications.filter((n) => !n.read).length;
    const tabs = ['Bildirimler', 'Giden Kutu', 'Zamanlanmış Raporlar'].map((t) => `<button class="tab ${notifTab === t ? 'active' : ''}" data-notif-tab="${t}">${t}${t === 'Bildirimler' && unread ? ` <span>${unread}</span>` : ''}${t === 'Giden Kutu' && queued ? ` <span>${queued}</span>` : ''}</button>`).join('');

    let content = '';
    if (notifTab === 'Bildirimler') {
      const typeCls = { info: 'info', warning: 'warn', danger: 'danger', success: 'ok' };
      content = `<div class="notif-list">${d.notifications.map((n) => `<div class="notif-row ${n.read ? 'read' : ''}" data-notif="${esc(n.id)}">
        <span class="notif-ico ${typeCls[n.type] || 'info'}">${icon(n.type === 'danger' ? 'alert' : n.type === 'success' ? 'check' : n.type === 'warning' ? 'alert' : 'activity', 17)}</span>
        <div class="notif-main"><strong>${esc(n.title)}</strong><span>${esc(n.body)}</span><small>${esc(n.source)} · ${fmtDateTime(n.at)}${n.simEventId ? ' · SİM' : ''}</small></div>
        ${n.read ? '' : '<span class="unread-dot"></span>'}
      </div>`).join('')}</div>`;
    } else if (notifTab === 'Giden Kutu') {
      content = `<div class="table-wrap"><table class="data">
        <thead><tr><th>Oluşturma</th><th>Kanal</th><th>Alıcı</th><th>Konu</th><th>Kaynak</th><th>Durum</th></tr></thead>
        <tbody>${d.outbox.map((o) => `<tr>
          <td>${fmtDateTime(o.createdAt)}</td>
          <td>${pill(o.channel === 'sms' ? 'SMS' : o.channel === 'email' ? 'E-posta' : 'Bulut Yedek', o.channel === 'sms' ? 'cyan' : o.channel === 'email' ? 'indigo' : 'violet')}</td>
          <td>${esc(o.to)}</td><td><div class="cell-strong">${esc(o.subject)}</div><div class="cell-sub">${esc(o.body)}</div></td>
          <td>${esc(o.source)}</td><td>${pill(o.status === 'sent' ? 'Gönderildi' : o.status === 'failed' ? 'Başarısız' : 'Kuyrukta', o.status === 'sent' ? 'ok' : o.status === 'failed' ? 'danger' : 'warn')}</td>
        </tr>`).join('')}</tbody></table></div>`;
    } else {
      content = `<div class="schedule-grid">
        ${[['dailyReport', 'Günlük Durum Raporu', 'Her gün 08:00 · üretim, fire, kritik stok'], ['weeklyReport', 'Haftalık Özet', 'Pazartesi 08:30 · ocak verimliliği, sarfiyat'], ['monthlyReport', 'Aylık Yönetim Raporu', 'Ayın 1\'i · giren-çıkan, maliyet özeti']].map(([key, title, desc]) => `<label class="schedule-card"><span class="schedule-ico">${icon('calendar', 20)}</span><div><strong>${esc(title)}</strong><span>${esc(desc)}</span></div><input type="checkbox" name="${key}" ${d.settings[key] ? 'checked' : ''}><span class="switch"></span></label>`).join('')}
      </div><div class="info-banner">${icon('wifiOff', 17)}<span>İnternet yokken bu raporlar üretilir ve <strong>giden kutuya</strong> yazılır; bağlantı geldiğinde otomatik gönderilir. Üretim hiçbir zaman dış servisi beklemez.</span></div>`;
    }

    return `
      <div class="stat-strip">
        <div><span>Bildirim</span><strong>${d.notifications.length}</strong></div>
        <div><span>Okunmamış</span><strong class="text-warn">${unread}</strong></div>
        <div><span>Kuyrukta</span><strong class="text-warn">${queued}</strong></div>
        <div><span>Gönderilen</span><strong class="text-ok">${d.outbox.filter((o) => o.status === 'sent').length}</strong></div>
        <div><span>WAN Durumu</span><strong>${d.settings.online ? 'Çevrimiçi' : 'Çevrimdışı'}</strong></div>
      </div>

      <section class="card connection-strip">
        <div class="conn-big"><span class="conn-ico ${d.settings.online ? 'ok' : 'warn'}">${icon(d.settings.online ? 'wifi' : 'wifiOff', 22)}</span><div><strong>${d.settings.online ? 'İnternet bağlantısı açık' : 'Kapalı çevrim modu'}</strong><span>${d.settings.online ? 'SMS, e-posta ve bulut yedeği gönderilebilir' : 'Üretim LAN üzerinde devam ediyor; dış bildirimler kuyrukta'}</span></div></div>
        <div class="conn-actions"><button class="btn ${d.settings.online ? 'btn-ghost' : 'btn-primary'}" data-online-toggle>${icon(d.settings.online ? 'wifiOff' : 'wifi', 16)} ${d.settings.online ? 'Çevrimdışı Yap' : 'İnterneti Aç & Gönder'}</button><button class="btn btn-ghost" id="ob-flush" ${d.settings.online ? '' : 'disabled'}>${icon('refresh', 16)} Kuyruğu Gönder</button></div>
      </section>

      <section class="card">
        <div class="toolbar"><div class="tabs">${tabs}</div><span class="toolbar-spacer"></span>
          ${notifTab === 'Bildirimler' ? `<button class="btn btn-ghost btn-sm" id="nt-readall">${icon('check', 14)} Tümünü Okundu İşaretle</button>` : ''}
          <button class="btn btn-primary" id="nt-compose">${icon('plus', 16)} Yeni Bildirim / Talep</button>
        </div>
        ${content}
        ${notifTab === 'Zamanlanmış Raporlar' ? `<div class="toolbar"><span class="toolbar-spacer"></span><button class="btn btn-primary" id="sch-save">${icon('save', 15)} Zamanlama Ayarlarını Kaydet</button></div>` : ''}
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    root.querySelectorAll('[data-notif-tab]').forEach((b) => b.addEventListener('click', () => { notifTab = b.dataset.notifTab; refresh(); }));
    root.querySelectorAll('[data-notif]').forEach((row) => row.addEventListener('click', () => {
      store.change((d) => { const n = d.notifications.find((x) => x.id === row.dataset.notif); if (n) n.read = !n.read; }, { silent: true });
      refresh();
    }));
    root.querySelector('#nt-readall')?.addEventListener('click', () => {
      store.change((d) => d.notifications.forEach((n) => { n.read = true; })); toast('Tüm bildirimler okundu'); refresh();
    });
    root.querySelector('#ob-flush')?.addEventListener('click', () => {
      const n = flushOutbox(); store.save(); toast(n ? `${n} kuyruk kaydı gönderildi` : 'Kuyrukta bekleyen kayıt yok', n ? 'success' : 'info'); refresh();
    });
    root.querySelector('#sch-save')?.addEventListener('click', () => {
      const f = formData(root);
      store.change((d) => { d.settings.dailyReport = !!f.dailyReport; d.settings.weeklyReport = !!f.weeklyReport; d.settings.monthlyReport = !!f.monthlyReport; addActivity('Zamanlanmış rapor ayarları güncellendi', 'calendar'); });
      toast('Rapor zamanlaması kaydedildi'); refresh();
    });
    root.querySelector('#nt-compose').addEventListener('click', () => {
      modal({
        title: 'Yeni Bildirim / Talep', subtitle: 'SMS, e-posta veya yapımcıya talep maili — çevrimdışıysa kuyruğa alınır.', size: 'wide',
        body: `<div class="form-grid">
          ${field('Kanal', select('channel', [{ value: 'email', label: 'E-posta' }, { value: 'sms', label: 'SMS' }, { value: 'internal', label: 'Yalnızca sistem içi' }], 'email'))}
          ${field('Alıcı', input('to', D().settings.developerMail, { placeholder: 'E-posta veya telefon' }))}
          ${field('Konu', input('subject', '', { required: true, placeholder: 'Örn. Talep: yeni rapor alanı' }))}
          ${field('Kaynak', select('source', ['Kullanıcı Talebi', 'Bakım', 'Üretim', 'Stok', 'Sistem'], 'Kullanıcı Talebi'))}
        </div>${field('Mesaj', `<textarea class="input" name="body" rows="4" placeholder="Mesaj içeriği…"></textarea>`)}`,
        actions: [
          { label: 'Vazgeç', onClick: (_e, close) => close() },
          { label: 'Gönder', kind: 'primary', icon: 'mail', onClick: (el, close) => {
            const f = formData(el);
            if (!f.subject || !f.body) { toast('Konu ve mesaj zorunludur', 'danger'); return; }
            store.change((d) => {
              addNotification({ type: 'info', title: f.subject, body: f.body, source: f.source, channel: f.channel === 'internal' ? null : f.channel, to: f.to, subject: f.subject });
              addActivity(`${f.channel === 'sms' ? 'SMS' : 'E-posta'} ${d.settings.online ? 'gönderildi' : 'kuyruğa alındı'}: ${f.subject}`, 'mail');
            });
            close(); toast(D().settings.online ? 'Bildirim gönderildi' : 'Kapalı çevrim: bildirim kuyruğa alındı', D().settings.online ? 'success' : 'info'); refresh();
          } }
        ]
      });
    });
  }
};

/* ============================ AYARLAR ============================ */

export const settingsView = {
  title: 'Ayarlar',
  subtitle: 'Sunucu, kullanıcılar, eşikler, tema, yedekleme ve veri yönetimi',

  render() {
    const d = D();
    const tabs = ['Genel', 'Kullanıcılar & Roller', 'Veri Yönetimi', 'Mimari'].map((t) => `<button class="tab ${settingsTab === t ? 'active' : ''}" data-settings-tab="${t}">${t}</button>`).join('');
    let content = '';
    if (settingsTab === 'Genel') {
      content = `<div class="form-grid settings-form">
        ${field('Firma Adı', input('company', d.settings.company))}
        ${field('Sunucu Adresi', input('serverUrl', d.settings.serverUrl))}
        ${field('Sunucu IP', input('serverIp', d.settings.serverIp))}
        ${field('Harici Disk Yedek Yolu', input('backupPath', d.settings.backupPath))}
        ${field('Para Birimi', input('currency', d.settings.currency))}
        ${field('Fire Oranı Uyarı Eşiği (%)', input('wasteThreshold', d.settings.wasteThreshold, { type: 'number', min: 1, step: 0.5 }))}
        ${field('Alüminyum Yoğunluğu (kg/m³)', input('density', d.settings.density, { type: 'number', min: 1 }))}
        ${field('Testere Bıçağı (mm)', input('bladeThicknessMm', d.settings.bladeThicknessMm, { type: 'number', min: 1 }))}
        ${field('SMS Alıcı Numaraları', input('smsNumbers', d.settings.smsNumbers))}
        ${field('Rapor Maili', input('reportMail', d.settings.reportMail))}
        ${field('Geliştirici / Talep Maili', input('developerMail', d.settings.developerMail))}
        ${field('Tema', select('theme', [{ value: 'light', label: 'Açık Tema' }, { value: 'dark', label: 'Koyu Tema' }], d.settings.theme))}
      </div><div class="toolbar"><span class="toolbar-spacer"></span><button class="btn btn-primary" id="set-save">${icon('save', 16)} Ayarları Kaydet</button></div>`;
    } else if (settingsTab === 'Kullanıcılar & Roller') {
      content = `<div class="table-wrap"><table class="data">
        <thead><tr><th>Kullanıcı</th><th>Kullanıcı Adı</th><th>Rol</th><th>Bölüm</th><th>Erişim</th><th>Durum</th></tr></thead>
        <tbody>${d.users.map((u) => `<tr><td><div class="cell-strong">${esc(u.name)}</div><div class="cell-sub">${esc(u.id)}</div></td><td>${esc(u.username)}</td><td>${pill(u.role, u.role.includes('Admin') ? 'indigo' : u.role.includes('Görüntüleyici') ? 'violet' : 'neutral')}</td><td>${esc(u.department)}</td><td class="muted">${u.role.includes('Görüntüleyici') ? 'VPN · salt-okunur' : 'Yerel ağ'}</td><td>${pill(u.active ? 'Aktif' : 'Pasif', u.active ? 'ok' : 'neutral')}</td></tr>`).join('')}</tbody>
      </table></div><div class="info-banner">${icon('shield', 17)}<span><strong>Görev ayrılığı:</strong> Sevkiyatı onaylayan yönetici ile fatura onayı veren muhasebe kullanıcısı aynı kişi olamaz. Geliştirici hesabı VPN üzerinden salt-okunur erişir.</span></div>`;
    } else if (settingsTab === 'Veri Yönetimi') {
      content = `<div class="data-cards">
        <div class="data-card"><span class="data-ico">${icon('database', 22)}</span><h3>JSON Arşivi</h3><p>Tüm kayıtlar <code>server/erp/data/</code> altında JSON olarak tutulur. Uygulama bu dosyaları okuyup görselleştirir.</p><button class="btn btn-ghost" id="data-export">${icon('download', 15)} Tüm Veriyi İndir</button></div>
        <div class="data-card"><span class="data-ico">${icon('upload', 22)}</span><h3>JSON İçe Aktar</h3><p>Sunucu arşivinden veya yedekten aldığınız JSON dosyasını yükleyin; ekranlar anında güncellenir.</p><button class="btn btn-ghost" id="data-import">${icon('upload', 15)} Dosya Seç</button><input type="file" id="data-file" accept=".json,application/json" hidden></div>
        <div class="data-card"><span class="data-ico">${icon('shield', 22)}</span><h3>Yedekleme Durumu</h3><p>Son yedek: <strong>${fmtDateTime(d.settings.lastBackup)}</strong><br>3-2-1 politikası: canlı DB + günlük snapshot + harici disk.</p><button class="btn btn-ghost" id="data-backup">${icon('refresh', 15)} Şimdi Yedekle</button></div>
        <div class="data-card danger"><span class="data-ico">${icon('trash', 22)}</span><h3>Demo Verisini Sıfırla</h3><p>Tarayıcıdaki tüm değişiklikler silinir ve başlangıç demo verisine dönülür.</p><button class="btn btn-danger" id="data-reset">${icon('refresh', 15)} Sıfırla</button></div>
      </div><div class="info-banner">${icon('wifiOff', 17)}<span>Bu prototip veriyi tarayıcı <code>localStorage</code> alanında tutar. Gerçek kurulumda aynı şema sunucu veritabanına ve IndexedDB senkronizasyon kuyruğuna bağlanır.</span></div>`;
    } else {
      content = `<div class="arch-cards">
        <div class="arch-card"><span class="arch-num">01</span><h3>İstemci</h3><p>Tarayıcıda çalışan PWA. PC, tablet ve dokunmatik panellerde aynı kod; kısayol ikonu ve service worker önbelleği.</p>${pill('HTML / CSS / JS', 'indigo')}</div>
        <div class="arch-card"><span class="arch-num">02</span><h3>Sunucu</h3><p>Firma içi <code>ERP/</code> klasörü, reverse proxy, API, rol bazlı yetki ve denetim logu. İnternet gerekmez.</p>${pill('On-premise', 'cyan')}</div>
        <div class="arch-card"><span class="arch-num">03</span><h3>Veri</h3><p>Canlı kayıtlar SQLite/PostgreSQL; JSON arşiv ve aktarım formatı; dosyalar <code>ERP/files/</code> altında.</p>${pill('DB + JSON', 'violet')}</div>
        <div class="arch-card"><span class="arch-num">04</span><h3>Dış Servisler</h3><p>SMS, SMTP, PLC/OPC UA ve bulut yedeği yalnızca giden kutu işçisi üzerinden; bağlantı yoksa kuyrukta bekler.</p>${pill('Outbox', 'warn')}</div>
        <div class="arch-card"><span class="arch-num">05</span><h3>Yedekleme</h3><p>Günlük snapshot, harici disk kopyası, checksum, saklama temizliği ve aylık restore testi.</p>${pill('3-2-1', 'ok')}</div>
        <div class="arch-card"><span class="arch-num">06</span><h3>Uzak Erişim</h3><p>Doğrudan IP/port açılmaz. WireGuard / Tailscale VPN + MFA + salt-okunur geliştirici hesabı.</p>${pill('VPN + MFA', 'info')}</div>
      </div><div class="info-banner">${icon('file', 17)}<span>Ayrıntılı gerekçe, karşılaştırma tabloları ve yol haritası <a href="../docs/04-teknik-mimari-kararlar.md" target="_blank" rel="noopener">docs/04-teknik-mimari-kararlar.md</a> dosyasındadır.</span></div>`;
    }

    return `
      <section class="card">
        <div class="toolbar"><div class="tabs">${tabs}</div><span class="toolbar-spacer"></span><span class="muted small">${icon('database', 14)} ${esc(d.settings.serverUrl)} · ${esc(d.settings.serverIp)}</span></div>
        ${content}
      </section>`;
  },

  mount(root) {
    const refresh = () => window.App.refresh();
    root.querySelectorAll('[data-settings-tab]').forEach((b) => b.addEventListener('click', () => { settingsTab = b.dataset.settingsTab; refresh(); }));
    root.querySelector('#set-save')?.addEventListener('click', () => {
      const f = formData(root);
      store.change((d) => {
        Object.assign(d.settings, {
          company: f.company, serverUrl: f.serverUrl, serverIp: f.serverIp, backupPath: f.backupPath, currency: f.currency,
          wasteThreshold: Number(f.wasteThreshold), density: Number(f.density), bladeThicknessMm: Number(f.bladeThicknessMm),
          smsNumbers: f.smsNumbers, reportMail: f.reportMail, developerMail: f.developerMail, theme: f.theme
        });
        addActivity('Sistem ayarları güncellendi', 'settings');
      });
      document.documentElement.dataset.theme = f.theme;
      toast('Ayarlar kaydedildi'); refresh();
    });
    root.querySelector('#data-export')?.addEventListener('click', () => {
      downloadText(`erp-yedek-${new Date().toISOString().slice(0, 10)}.json`, store.exportJSON());
      toast('Tüm veri JSON olarak indirildi');
    });
    root.querySelector('#data-import')?.addEventListener('click', () => root.querySelector('#data-file').click());
    root.querySelector('#data-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { store.importJSON(String(reader.result)); document.documentElement.dataset.theme = D().settings.theme || 'light'; toast('JSON verisi içe aktarıldı'); refresh(); }
        catch (err) { toast('Dosya okunamadı: ' + err.message, 'danger'); }
      };
      reader.readAsText(file);
    });
    root.querySelector('#data-backup')?.addEventListener('click', () => {
      store.change((d) => { d.settings.lastBackup = nowISO(); addActivity('Manuel yedekleme tamamlandı (harici disk + checksum)', 'database'); });
      downloadText(`erp-yedek-${new Date().toISOString().slice(0, 10)}.json`, store.exportJSON());
      toast('Yedek alındı ve dosya indirildi'); refresh();
    });
    root.querySelector('#data-reset')?.addEventListener('click', () => {
      confirmDialog('Demo Verisini Sıfırla', 'Tarayıcıda yaptığınız tüm değişiklikler silinecek. Devam edilsin mi?', () => {
        store.reset(); document.documentElement.dataset.theme = 'light'; toast('Demo verisine dönüldü'); refresh();
      }, 'Sıfırla');
    });
  }
};
