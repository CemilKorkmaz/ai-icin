#!/usr/bin/env python3
"""ERP Edge Collector giriş noktası.

Kullanım (geliştirme / Linux / macOS):
    python3 edge/main.py                       # arayüz + tarama döngüsü
    python3 edge/main.py --bind 0.0.0.0 --port 8787
    python3 edge/main.py --once               # tek döngü, veritabanına yazar, çıkar
    python3 edge/main.py --dry-run            # tek döngü, hiçbir yere yazmaz
    python3 edge/main.py --no-browser        # tarayıcıyı açma

Windows'ta `build_exe.bat` ile üretilen `ERP-Edge-Collector.exe` aynı
argümanları kabul eder; argüman verilmezse arayüzü açıp arka planda tarar.
"""
from __future__ import annotations

import argparse
import json
import signal
import sys
import threading
import time
import webbrowser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from erp_edge import __version__  # noqa: E402
from erp_edge.collector import Collector  # noqa: E402
from erp_edge.config import load_config  # noqa: E402
from erp_edge.db import EdgeDB  # noqa: E402
from erp_edge.server import EdgeContext, EdgeServer  # noqa: E402
from erp_edge.transport import Transport  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description='ERP Edge Collector — fabrika veri toplama ajanı')
    p.add_argument('--config', help='edge-config.json yolu')
    p.add_argument('--bind', help='Arayüzün dinleyeceği adres (üretimde 127.0.0.1)')
    p.add_argument('--port', type=int, help='Arayüz portu')
    p.add_argument('--once', action='store_true', help='Tek tarama döngüsü çalıştır ve çık')
    p.add_argument('--dry-run', action='store_true', help='Tek döngü; SQL ve ERP kuyruğuna yazma')
    p.add_argument('--no-browser', action='store_true', help='Tarayıcıyı otomatik açma')
    p.add_argument('--flush', action='store_true', help='Kuyruktaki kayıtları bir kez göndermeyi dene ve çık')
    p.add_argument('--version', action='version', version=f'ERP Edge Collector {__version__}')
    return p


def _frozen_logging() -> None:
    """Konsolsuz .exe'de başlangıç hataları logs/agent.log dosyasına yazılır."""
    if not getattr(sys, 'frozen', False):
        return
    try:
        log_dir = Path(sys.executable).resolve().parent / 'logs'
        log_dir.mkdir(parents=True, exist_ok=True)
        fh = open(log_dir / 'agent.log', 'a', encoding='utf-8', buffering=1)
        sys.stdout = fh
        sys.stderr = fh
    except Exception:
        pass


def main(argv: list[str] | None = None) -> int:
    _frozen_logging()
    args = build_parser().parse_args(argv)
    cfg = load_config(args.config)
    if args.bind:
        cfg.data['ui']['host'] = args.bind
    if args.port:
        cfg.data['ui']['port'] = args.port
    if args.no_browser:
        cfg.data['ui']['openBrowser'] = False

    db = EdgeDB(cfg.sql_path, dry_run=args.dry_run)
    collector = Collector(cfg, db)
    transport = Transport(cfg, db)

    print(f'ERP Edge Collector {__version__} · {cfg.data["siteCode"]} · {cfg.data["adapter"]}')
    print(f'  Profil : {cfg.profile_path}')
    print(f'  SQL    : {cfg.sql_path}' + ('  (dry-run: yazılmayacak)' if args.dry_run else ''))
    print(f'  ERP    : {cfg.data["erp"]["url"]}')

    if args.dry_run or args.once:
        summary = collector.run_once(dry_run=args.dry_run)
        print(json.dumps({k: v for k, v in summary.items() if k != 'preview'},
                         ensure_ascii=False, indent=2))
        if args.once and not args.dry_run:
            print('  Kuyruk:', json.dumps(transport.send_pending(), ensure_ascii=False))
        db.close()
        return 0

    if args.flush:
        print(json.dumps(transport.send_pending(), ensure_ascii=False, indent=2))
        db.close()
        return 0

    ctx = EdgeContext(cfg, db, collector, transport, __version__)
    host = cfg.data['ui']['host']
    port = int(cfg.data['ui']['port'])
    server = EdgeServer(ctx, host, port)
    server.start()
    print(f'  Arayüz: {server.url}')

    collector.start()
    transport.start()
    if cfg.data['ui'].get('openBrowser'):
        try:
            threading.Timer(0.8, lambda: webbrowser.open(server.url)).start()
        except Exception:
            pass

    stop = threading.Event()

    def on_sig(_s, _f):
        stop.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, on_sig)
        except (ValueError, AttributeError):
            pass

    try:
        while not stop.is_set():
            stop.wait(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        collector.stop()
        transport.stop()
        server.stop()
        db.log('info', 'MAIN', 'Ajan kapatıldı')
        db.close()
        print('Ajan durduruldu.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
