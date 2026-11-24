"""Simülasyon köprüsü — ERP Studio'yu kullanıcı simülasyonuna bağlar.

Tek süreçte üç iş yapar:

1. **Statik ERP Studio** — `http://localhost:8080/app/` (eski `http.server`'ın yerini alır).
2. **Simülasyon proxy'si** — `/api/sim/*` uçlarıyla `http://127.0.0.1:8000`
   üzerindeki kullanıcı simülasyonunu okur; tarayıcı asla doğrudan simülasyona
   gitmez, CORS ve farklı port sorunu oluşmaz.
3. **İmzalı edge alıcısı** — `POST /api/edge/ingest`. v1.3 ajanının 501 alan
   kuyruğu artık `sent` olur; batch'ler yerel SQLite'a yazılır.

İşletme tablolarına (stok, maliyet, muhasebe) yazım yoktur; sim verisi yalnızca
arayüzde ve edge kayıt defterinde görünür. Ayrıntı: docs/14.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import mimetypes
import shutil
import sys
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VERSION = '1.4.1'

# İki yerleşim desteklenir:
#  1. Depo içinden çalıştırma: statik dosyalar ve yapılandırma depo kökünde.
#  2. PyInstaller ile üretilmiş tek dosya exe: `app/` içeriği exe'nin içinde
#     (_MEIPASS), yapılandırma ve SQL ise exe'nin yanında (yazılabilir).
FROZEN = bool(getattr(sys, 'frozen', False))
ASSET_ROOT = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parents[2])).resolve()
BASE_DIR = Path(sys.executable).resolve().parent if FROZEN else ASSET_ROOT
DEFAULT_CONFIG = (BASE_DIR / 'config.json') if FROZEN else ASSET_ROOT / 'server' / 'sim_bridge' / 'config.json'
DEFAULT_DB = (BASE_DIR / 'data' / 'ingest.db') if FROZEN else ASSET_ROOT / 'server' / 'sim_bridge' / 'data' / 'ingest.db'

# Eşleme çekirdeği edge ajanıyla aynıdır (tek kaynak).
sys.path.insert(0, str(ASSET_ROOT / 'edge'))
from erp_edge.sim_map import build_map  # noqa: E402

from .sim_client import SimClient, SimResponseError, SimUnavailable  # noqa: E402
from .store import IngestStore, now_iso  # noqa: E402

MASK = '••••••••'


def deep_merge(base: dict, override: dict) -> dict:
    out = dict(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out


class BridgeState:
    def __init__(self, asset_root: Path | None = None, base_dir: Path | None = None,
                 config_path: Path | None = None, db_path: Path | None = None,
                 sim_url: str | None = None, demo: bool = False):
        self.asset_root = Path(asset_root or ASSET_ROOT).resolve()
        self.base_dir = Path(base_dir or BASE_DIR).resolve()
        # Exe yerleşimi: statik dosyalar içeride, ayar/veri dışarıda.
        self.runtime_layout = self.asset_root != self.base_dir
        self.config_path = Path(config_path) if config_path else (
            self.base_dir / 'config.json' if self.runtime_layout else DEFAULT_CONFIG)
        self.demo = demo
        self.started_at = time.time()
        self.lock = threading.RLock()
        self.last_live: dict | None = None
        self.last_ok_at = ''
        profile_rel = 'config/ornek-fabrika-profili.json' if self.runtime_layout             else 'edge/config/ornek-fabrika-profili.json'
        defaults = {
            'version': VERSION,
            'simBaseUrl': 'http://127.0.0.1:8000',
            'simLabel': 'Kullanıcı simülasyonu (erp_backend)',
            'timeoutSeconds': 3,
            'liveRefreshMs': 2500,
            'profilePath': profile_rel,
            'ingestDb': 'data/ingest.db' if self.runtime_layout
                        else 'server/sim_bridge/data/ingest.db',
            'autoMap': True,
            'furnaceMap': {},
            'edge': {'secret': 'degistirin-bu-gizli-anahtari', 'token': '',
                     'maxBodyBytes': 5 * 1024 * 1024},
        }
        file_cfg = {}
        if self.config_path.exists():
            try:
                file_cfg = json.loads(self.config_path.read_text(encoding='utf-8'))
            except (ValueError, OSError):
                file_cfg = {}
        self.config = deep_merge(defaults, file_cfg)
        if sim_url:
            self.config['simBaseUrl'] = sim_url.rstrip('/')
        self.client = SimClient(self.config['simBaseUrl'],
                                self.config.get('timeoutSeconds', 3))
        db = Path(db_path) if db_path else self.path_of(self.config.get('ingestDb', ''))
        self.store = IngestStore(db)
        self._profile_cache: tuple[float, dict] | None = None
        self.ensure_runtime_files()

    # ------------------------------------------------------------------ yollar
    def path_of(self, value: str) -> Path:
        path = Path(value or '')
        return path if path.is_absolute() else self.base_dir / path

    def ensure_runtime_files(self):
        """Exe ilk açıldığında yanına config ve profil kopyalar.

        Tek dosya exe'nin içi salt okunurdur; `config.json`, profil ve SQL
        exe'nin bulunduğu klasörde tutulur. Depo yerleşiminde hiçbir şey
        kopyalanmaz, mevcut dosyalar kullanılır.
        """
        if not self.runtime_layout:
            return
        if not self.config_path.exists():
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            self.config_path.write_text(
                json.dumps(self.config, ensure_ascii=False, indent=2) + '\n',
                encoding='utf-8')
        raw = self.config.get('profilePath', 'config/ornek-fabrika-profili.json')
        target = self.path_of(raw)
        if target.exists():
            return
        for source in (self.asset_root / 'config/ornek-fabrika-profili.json',
                       self.asset_root / 'edge/config/ornek-fabrika-profili.json'):
            if source.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
                return

    def profile_path(self) -> Path:
        raw = self.config.get('profilePath', '')
        primary = self.path_of(raw)
        if primary.exists() or Path(raw).is_absolute():
            return primary
        fallback = self.asset_root / raw
        return fallback if fallback.exists() else primary

    # ------------------------------------------------------------------ profil
    def profile(self) -> dict:
        path = self.profile_path()
        try:
            mtime = path.stat().st_mtime
        except OSError:
            return {'machines': [], 'plant': {}, 'path': str(path), 'error': 'Profil bulunamadı'}
        if self._profile_cache and self._profile_cache[0] == mtime:
            return self._profile_cache[1]
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except (ValueError, OSError) as exc:
            return {'machines': [], 'plant': {}, 'path': str(path), 'error': str(exc)}
        machines = [m for m in data.get('machines', [])
                    if m.get('active') is not False and not m.get('decommissionedAt')]
        profile = {'machines': machines, 'plant': data.get('plant', {}), 'path': str(path)}
        self._profile_cache = (mtime, profile)
        return profile

    def mapping(self, furnaces: list[dict]) -> dict:
        profile = self.profile()
        result = build_map(profile['machines'], furnaces,
                           self.config.get('furnaceMap') or {},
                           bool(self.config.get('autoMap', True)))
        result['plant'] = profile.get('plant', {})
        result['profilePath'] = str(profile.get('path', ''))
        return result

    # ------------------------------------------------------------------ ayar
    def set_sim_url(self, url: str) -> dict:
        url = (url or '').strip().rstrip('/')
        if not (url.startswith('http://') or url.startswith('https://')):
            raise ValueError('Adres http:// veya https:// ile başlamalı')
        self.config['simBaseUrl'] = url
        self.client = SimClient(url, self.config.get('timeoutSeconds', 3))
        try:
            self.config_path.write_text(json.dumps(self.config, ensure_ascii=False, indent=2),
                                        encoding='utf-8')
        except OSError:
            pass
        return self.public_config()

    def public_config(self) -> dict:
        cfg = json.loads(json.dumps(self.config))
        if cfg.get('edge', {}).get('secret'):
            cfg['edge']['secret'] = MASK
        if cfg.get('edge', {}).get('token'):
            cfg['edge']['token'] = MASK
        return cfg

    # ------------------------------------------------------------------ canlı
    def edge_summary(self) -> dict:
        edge = self.store.summary()
        edge['latestReadings'] = self.store.latest_readings(6)
        edge['lastEvents'] = self.store.last_events(4)
        return edge

    def live(self) -> dict:
        live = self.client.live()
        edge = self.edge_summary()
        base = {
            'baseUrl': self.config['simBaseUrl'],
            'label': self.config.get('simLabel', ''),
            'mode': 'DEMO' if self.demo else 'REAL',
            'edge': edge,
            'serverTime': now_iso()
        }
        if live.get('ok'):
            mapping = self.mapping(live.get('furnaces', []))
            with self.lock:
                self.last_live = {**live, 'mapping': mapping}
                self.last_ok_at = live.get('checkedAt', '')
            return {**base, **live, 'mapping': mapping, 'stale': False,
                    'lastOkAt': self.last_ok_at}
        with self.lock:
            last = self.last_live
        if last:
            return {**base, **last, 'ok': False, 'stale': True,
                    'error': live.get('error', 'Simülasyon kapalı'),
                    'health': live.get('health', {}), 'lastOkAt': self.last_ok_at,
                    'edge': edge}
        return {**base, 'ok': False, 'stale': True, 'furnaces': [], 'orders': [],
                'alarms': [], 'health': live.get('health', {}),
                'mapping': self.mapping([]), 'error': live.get('error', 'Simülasyon kapalı'),
                'lastOkAt': '', 'checkedAt': now_iso()}


class BridgeHandler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = f'ERP-Studio-Bridge/{VERSION}'

    def log_message(self, fmt, *args):
        pass

    # ------------------------------------------------------------- yardımcı
    @property
    def state(self) -> BridgeState:
        return self.server.state  # type: ignore[attr-defined]

    def _json(self, payload, status: int = 200):
        raw = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('X-Bridge-Version', VERSION)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(raw)

    def _error(self, message: str, status: int = 400, **extra):
        self._json({'ok': False, 'error': message, **extra}, status)

    def _body(self) -> bytes:
        try:
            length = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            length = 0
        limit = int(self.state.config.get('edge', {}).get('maxBodyBytes') or 5 * 1024 * 1024)
        if length > limit:
            raise OverflowError(f'Gövde çok büyük (en fazla {limit} bayt)')
        return self.rfile.read(length) if length else b''

    def _file(self, target: Path):
        if not target.exists() or not target.is_file():
            self._plain(404, 'Dosya bulunamadı')
            return
        try:
            raw = target.read_bytes()
        except OSError:
            self._plain(500, 'Dosya okunamadı')
            return
        ctype = mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
        if ctype.startswith('text/') or ctype in ('application/javascript', 'application/json',
                                                  'application/manifest+json', 'image/svg+xml'):
            ctype += '; charset=utf-8'
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Service-Worker-Allowed', '/app/')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(raw)

    def _plain(self, status: int, text: str):
        raw = text.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(raw)

    def _static(self, path: str):
        path = urllib.parse.unquote(path)
        if path in ('', '/'):
            path = '/index.html'
        rel = path.lstrip('/')
        # Yalnızca arayüz yayınlanır. Depo kökünü tamamen sunmak
        # edge-config.json ve köprü gizli anahtarını dışarı sızdırırdı.
        if not (rel == 'index.html' or rel.startswith('app/')):
            self._plain(404, 'Yalnızca /app/ ve /index.html yayınlanır')
            return
        parts = [part for part in path.split('/') if part]
        if any(part in ('.', '..') or part.startswith('.') for part in parts):
            self._plain(403, 'Gizli veya kök dışı yol')
            return
        target = (self.state.asset_root / rel).resolve()
        root = self.state.asset_root
        if target != root and root not in target.parents:
            self._plain(403, 'Kök dışı yol')
            return
        if target.is_dir():
            target = target / 'index.html'
        self._file(target)

    # ------------------------------------------------------------- GET
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        if not path.startswith('/api/'):
            self._static(path)
            return
        state = self.state
        try:
            if path == '/api/health':
                self._json({'ok': True, 'version': VERSION, 'uptimeSec': int(time.time() - state.started_at)})
            elif path == '/api/bridge/info':
                self._json({
                    'ok': True, 'version': VERSION, 'root': str(state.asset_root),
                    'baseDir': str(state.base_dir), 'runtimeLayout': state.runtime_layout,
                    'demo': state.demo, 'uptimeSec': int(time.time() - state.started_at),
                    'config': state.public_config(),
                    'profile': {k: v for k, v in state.profile().items() if k != 'machines'},
                    'machineCount': len(state.profile().get('machines', []))
                })
            elif path == '/api/sim/health':
                self._json({**state.client.health(), 'mode': 'DEMO' if state.demo else 'REAL'})
            elif path == '/api/sim/live':
                self._json(state.live())
            elif path == '/api/sim/furnaces':
                self._json({'ok': True, 'furnaces': state.client.furnaces(),
                            'baseUrl': state.config['simBaseUrl']})
            elif path == '/api/sim/orders':
                self._json({'ok': True, 'orders': state.client.orders()})
            elif path == '/api/sim/map':
                mapping = state.mapping(state.client.furnaces())
                self._json({'ok': True, **mapping, 'baseUrl': state.config['simBaseUrl']})
            elif path == '/api/sim/readings':
                name = (query.get('name') or [''])[0]
                if not name:
                    self._error('name parametresi zorunlu', 400)
                    return
                try:
                    limit = int((query.get('limit') or ['40'])[0])
                except ValueError:
                    limit = 40
                self._json({'ok': True, 'furnace': name,
                            'readings': state.client.readings(name, limit)})
            elif path == '/api/edge/health':
                self._json({'ok': True, 'secretConfigured': bool(state.config['edge'].get('secret')),
                            'tokenRequired': bool(state.config['edge'].get('token')),
                            **state.store.counts()})
            elif path == '/api/edge/summary':
                self._json({'ok': True, **state.edge_summary()})
            elif path == '/api/edge/batches':
                self._json({'ok': True, 'batches': state.store.batches(_limit(query, 20))})
            elif path == '/api/edge/latest':
                self._json({'ok': True, 'readings': state.store.latest_readings(_limit(query, 12)),
                            'events': state.store.last_events(_limit(query, 6))})
            else:
                self._error('Bilinmeyen uç', 404)
        except (SimUnavailable, SimResponseError) as exc:
            self._error(str(exc), 503 if isinstance(exc, SimUnavailable) else 502)
        except Exception as exc:  # arayüz tek hatayla çökmez
            self._error(f'Köprü hatası: {type(exc).__name__}: {exc}', 500)

    # ------------------------------------------------------------- POST
    def do_POST(self):
        path = urllib.parse.urlsplit(self.path).path
        state = self.state
        try:
            raw = self._body()
        except OverflowError as exc:
            self._error(str(exc), 413)
            return
        if path == '/api/edge/ingest':
            self._ingest(raw)
            return
        try:
            body = json.loads(raw.decode('utf-8')) if raw else {}
        except (ValueError, UnicodeDecodeError):
            self._error('Geçersiz JSON', 400)
            return
        if not isinstance(body, dict):
            self._error('JSON nesnesi beklenir', 400)
            return
        try:
            if path == '/api/sim/orders':
                product = str(body.get('product') or '').strip()
                furnace = str(body.get('furnace') or '').strip()
                if not product or not furnace:
                    self._error('Ürün ve fırın zorunlu', 400)
                    return
                try:
                    target = float(body.get('target_temp'))
                    duration = float(body.get('duration_min'))
                except (TypeError, ValueError):
                    self._error('Hedef sıcaklık ve süre sayı olmalı', 400)
                    return
                order = state.client.create_order(product, furnace, target, duration)
                self._json({'ok': True, 'order': order, 'message': f"{order['id']} oluşturuldu"},
                           201)
            elif path == '/api/sim/orders/start':
                order_id = str(body.get('id') or '').strip()
                if not order_id:
                    self._error('Emir kimliği zorunlu', 400)
                    return
                order = state.client.start_order(order_id, body.get('furnace') or None)
                self._json({'ok': True, 'order': order,
                            'message': f"{order['id']} başlatıldı"}, 200)
            elif path == '/api/bridge/config':
                url = body.get('simBaseUrl')
                if not url:
                    self._error('simBaseUrl zorunlu', 400)
                    return
                try:
                    cfg = state.set_sim_url(str(url))
                except ValueError as exc:
                    self._error(str(exc), 400)
                    return
                self._json({'ok': True, 'config': cfg,
                            'message': 'Simülasyon adresi güncellendi'})
            else:
                self._error('Bilinmeyen uç', 404)
        except SimUnavailable as exc:
            self._error(str(exc), 503, baseUrl=state.config['simBaseUrl'])
        except SimResponseError as exc:
            self._error(str(exc), 400 if exc.status < 500 else 502,
                        simStatus=exc.status)
        except Exception as exc:
            self._error(f'Köprü hatası: {type(exc).__name__}: {exc}', 500)

    # ------------------------------------------------------------- ingest
    def _ingest(self, raw: bytes):
        state = self.state
        edge = state.config.get('edge', {})
        secret = str(edge.get('secret') or '')
        if not secret:
            self._error('Köprüde HMAC anahtarı tanımlı değil', 500)
            return
        signature = self.headers.get('X-Edge-Signature', '')
        expected = hmac.new(secret.encode('utf-8'), raw, hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(signature, expected):
            self._error('İmza doğrulanamadı; batch kuyrukta kalır', 401)
            return
        token = edge.get('token')
        if token and self.headers.get('Authorization') != f'Bearer {token}':
            self._error('Geçersiz ERP token', 401)
            return
        try:
            payload = json.loads(raw.decode('utf-8')) if raw else {}
        except (ValueError, UnicodeDecodeError):
            self._error('Geçersiz JSON', 400)
            return
        if not isinstance(payload, dict):
            self._error('JSON nesnesi beklenir', 400)
            return
        kind = payload.get('kind')
        client_id = self.headers.get('X-Edge-Client-Id') or payload.get('clientId') or ''
        remote = f'{self.client_address[0]}:{self.client_address[1]}'
        if kind == 'edge-ping':
            state.store.record_ping(client_id, remote)
            self._json({'ok': True, 'ping': True, 'message': 'ERP köprüsü imzayı doğruladı',
                        'version': VERSION, 'counts': state.store.counts()})
            return
        if kind != 'edge-batch':
            self._error("kind 'edge-batch' olmalı", 400)
            return
        try:
            result = state.store.insert_batch(payload, raw.decode('utf-8'), remote)
        except ValueError as exc:
            self._error(str(exc), 400)
            return
        self._json({
            'ok': True, 'accepted': True, 'duplicate': result['duplicate'],
            'batchId': result['batchId'], 'readings': result['readings'],
            'events': result['events'], 'receivedAt': now_iso(),
            'message': 'Yinelenen batch; kayıt korundu' if result['duplicate']
                       else 'Batch kabul edildi; ERP signalStates taslağı hazır'
        }, 200)


def _limit(query: dict, default: int) -> int:
    try:
        return max(1, min(200, int((query.get('limit') or [default])[0])))
    except (ValueError, TypeError):
        return default


def make_server(state: BridgeState, host: str = '0.0.0.0', port: int = 8080) -> ThreadingHTTPServer:
    httpd = ThreadingHTTPServer((host, port), BridgeHandler)
    httpd.daemon_threads = True
    httpd.state = state  # type: ignore[attr-defined]
    return httpd
