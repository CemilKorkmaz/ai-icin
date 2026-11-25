"""Yerel arayüz sunucusu — exe ile birlikte tek süreçte çalışır.

Üretimde yalnızca 127.0.0.1'e bağlanır; saha bilgisayarının tarayıcısından
http://127.0.0.1:8787 adresiyle açılır. Tarayıcı kodu başka bir servise
localhost üzerinden gitmez, hep aynı kökenden göreli URL kullanır.
"""
from __future__ import annotations

import json
import mimetypes
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .adapters import contract_rows, resolve_adapter
from .collector import Collector, dump_profile
from .config import Config
from .db import EdgeDB
from .transport import Transport

UI_DIR = Path(__file__).resolve().parent / 'ui'
# PyInstaller tek-dosya: HTML/CSS/JS `_MEIPASS/erp_edge/ui` içine çıkarılır.
if not (UI_DIR / 'index.html').exists() and getattr(sys, 'frozen', False):
    _bundle = getattr(sys, '_MEIPASS', None)
    if _bundle:
        UI_DIR = Path(_bundle) / 'erp_edge' / 'ui'

STATIC = {
    '/': ('index.html', 'text/html; charset=utf-8'),
    '/index.html': ('index.html', 'text/html; charset=utf-8'),
    '/app.css': ('app.css', 'text/css; charset=utf-8'),
    '/app.js': ('app.js', 'application/javascript; charset=utf-8')
}


class EdgeContext:
    def __init__(self, cfg: Config, db: EdgeDB, collector: Collector, transport: Transport, version: str):
        self.cfg = cfg
        self.db = db
        self.collector = collector
        self.transport = transport
        self.version = version

    def security_warnings(self) -> list[dict]:
        """Saha kurulumunda kapatılması gereken yapılandırma açıkları."""
        warnings: list[dict] = []
        erp = self.cfg.data.get('erp', {}) if isinstance(self.cfg.data.get('erp'), dict) else {}
        secret = str(erp.get('secret') or '')
        if not secret or secret == 'degistirin-bu-gizli-anahtari' or len(secret) < 16:
            warnings.append({
                'code': 'DEFAULT_EDGE_SECRET',
                'severity': 'high',
                'message': 'HMAC gizli anahtarı varsayılan/kısa. ERP köprüsüyle aynı, en az 16 karakterlik rastgele anahtar kullanın.',
            })
        return warnings

    def status(self) -> dict:
        perf = self.db.counts()
        test = None
        return {
            'version': self.version,
            'site': {'code': self.cfg.data.get('siteCode'), 'name': self.cfg.data.get('siteName'),
                     'sqlPath': str(self.cfg.sql_path)},
            'collector': self.collector.status(),
            'transport': self.transport.status(),
            'sql': {'path': str(self.cfg.sql_path), 'tables': len(self.db.schema_info()), **perf},
            'erp': {'url': self.cfg.data['erp']['url'], 'enabled': self.cfg.data['erp'].get('enabled', True),
                    'adapter': self.cfg.data.get('adapter')},
            'adapters': contract_rows(),
            'test': test,
            'securityWarnings': self.security_warnings(),
        }


def make_handler(ctx: EdgeContext):
    class Handler(BaseHTTPRequestHandler):
        server_version = 'ERPEdge/1.3'
        protocol_version = 'HTTP/1.1'

        def log_message(self, fmt, *args):  # konsolu kirletme; app_log'a yazılır
            pass

        def _common_headers(self):
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()')

        def _json(self, obj, status=200):
            body = json.dumps(obj, ensure_ascii=False, default=str).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self._common_headers()
            self.end_headers()
            self.wfile.write(body)

        def _file(self, name: str, ctype: str):
            path = UI_DIR / name
            if not path.exists():
                self._json({'error': f'{name} bulunamadı'}, 404)
                return
            body = path.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-cache')
            self._common_headers()
            self.end_headers()
            self.wfile.write(body)

        def _body(self) -> dict:
            try:
                length = int(self.headers.get('Content-Length') or 0)
            except (TypeError, ValueError):
                return {}
            if length <= 0:
                return {}
            if length > 1024 * 1024:
                return {}
            try:
                data = json.loads(self.rfile.read(length).decode('utf-8'))
            except (ValueError, UnicodeDecodeError):
                return {}
            return data if isinstance(data, dict) else {}

        def do_GET(self):
            path = self.path.split('?')[0]
            if path in STATIC:
                self._file(*STATIC[path])
                return
            limit = 40
            if '?' in self.path and 'limit=' in self.path:
                try:
                    limit = max(1, min(500, int(self.path.split('limit=')[1].split('&')[0])))
                except ValueError:
                    pass
            routes = {
                '/api/status': lambda: ctx.status(),
                '/api/config': lambda: ctx.cfg.public(),
                '/api/profile': lambda: dump_profile(ctx.cfg),
                '/api/readings': lambda: ctx.db.rows('readings', limit),
                '/api/events': lambda: ctx.db.rows('events', limit),
                '/api/outbox': lambda: ctx.db.rows('outbox', limit),
                '/api/runs': lambda: ctx.db.rows('runs', limit),
                '/api/logs': lambda: ctx.db.rows('app_log', limit),
                '/api/latest': lambda: ctx.db.latest_readings(),
                '/api/schema': lambda: ctx.db.schema_info(),
                '/api/adapters': lambda: contract_rows()
            }
            if path in routes:
                try:
                    self._json(routes[path]())
                except Exception as exc:
                    self._json({'error': str(exc)}, 500)
                return
            self._json({'error': 'Bilinmeyen uç'}, 404)

        def do_POST(self):
            path = self.path.split('?')[0]
            body = self._body()
            try:
                if path == '/api/config':
                    result = ctx.cfg.save(body.get('config') or body)
                    ctx.collector.reload()
                    ctx.db.log('info', 'CONFIG', 'Yapılandırma arayüzden güncellendi')
                    self._json({'ok': True, 'config': result})
                elif path == '/api/poll':
                    summary = ctx.collector.run_once(dry_run=bool(body.get('dryRun')))
                    self._json({'ok': True, 'summary': summary})
                elif path == '/api/test':
                    adapter, fallback = resolve_adapter(ctx.cfg.data)
                    tags = [{'signal': s} for s in ('door', 'casting', 'alarm', 'running')]
                    self._json({'ok': True, 'adapter': adapter.test(tags), 'erp': ctx.transport.test(),
                                'fallback': fallback, 'sql': ctx.db.schema_info()})
                elif path == '/api/collector':
                    action = body.get('action')
                    if action == 'start':
                        ctx.collector.start(); ctx.transport.start()
                    elif action == 'stop':
                        ctx.collector.stop(); ctx.transport.stop()
                    elif action == 'pause':
                        ctx.collector.paused = True
                    elif action == 'resume':
                        ctx.collector.paused = False
                    else:
                        self._json({'error': 'Geçersiz işlem'}, 400); return
                    self._json({'ok': True, 'action': action, 'status': ctx.collector.status()})
                elif path == '/api/flush':
                    self._json({'ok': True, 'result': ctx.transport.send_pending()})
                elif path == '/api/purge':
                    removed = ctx.db.purge(int(ctx.cfg.data.get('retentionDays') or 90))
                    self._json({'ok': True, 'removed': removed})
                else:
                    self._json({'error': 'Bilinmeyen uç'}, 404)
            except Exception as exc:
                self._json({'ok': False, 'error': str(exc)}, 500)

    return Handler


class EdgeServer:
    def __init__(self, ctx: EdgeContext, host: str, port: int):
        self.ctx = ctx
        self.host = host
        self.port = port
        self.httpd = ThreadingHTTPServer((host, port), make_handler(ctx))
        self.httpd.daemon_threads = True
        self.thread = threading.Thread(target=self.httpd.serve_forever, name='edge-ui', daemon=True)

    def start(self) -> None:
        self.thread.start()
        self.ctx.db.log('info', 'UI', f'Yerel arayüz http://{self.host}:{self.port}')

    def stop(self) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()

    @property
    def url(self) -> str:
        return f'http://{self.host}:{self.port}/'
