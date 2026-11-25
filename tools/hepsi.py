#!/usr/bin/env python3
"""Tek tıkla ERP test ortamını açar: ERP, simülasyon ve edge arayüzü.

`hepsi.command` (macOS) ve `Hepsi.bat` (Windows) bu dosyayı çalıştırır.

Davranış:
* 8080'de köprü zaten açıksa onu kullanır; değilse başlatır.
* 8000'de uyumlu bir simülasyon varsa ona bağlanır; yoksa yerleşik demo
  simülasyonu başlatır (8000 doluysa ilk boş porta geçer).
* Edge saha arayüzü açık değilse 8787'de başlatır.
* Hazır olunca ERP'yi yeni pencerede, simülasyon/ERP bağlantı/edge ekranlarını
  yeni sekmelerde açar. Pencere kapatılınca başlattığı süreçleri kapatır.

Yalnızca standart kütüphane kullanır. Test için:
    python3 tools/hepsi.py --no-browser --no-edge --bridge-port 8090
"""
from __future__ import annotations

import argparse
import json
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYTHON = sys.executable


def port_open(port: int, host: str = '127.0.0.1', timeout: float = 0.35) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def get_json(url: str, timeout: float = 1.0):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            if response.status != 200:
                return None
            return json.loads(response.read().decode('utf-8'))
    except (OSError, ValueError, urllib.error.URLError):
        return None


def bridge_ready(port: int) -> bool:
    data = get_json(f'http://127.0.0.1:{port}/api/health')
    return isinstance(data, dict) and data.get('ok') is True


def sim_ready(port: int) -> bool:
    """Uyumlu simülasyon: /api/furnaces sözlük veya liste döndürür."""
    data = get_json(f'http://127.0.0.1:{port}/api/furnaces')
    return isinstance(data, (dict, list))


def edge_ready(port: int) -> bool:
    data = get_json(f'http://127.0.0.1:{port}/api/status')
    return isinstance(data, dict) and 'collector' in data


def free_port(start: int, limit: int = 20) -> int:
    for port in range(start, start + limit):
        if not port_open(port):
            return port
    raise RuntimeError(f'{start}-{start + limit - 1} aralığında boş port bulunamadı')


def wait_for(check, timeout: float, label: str) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if check():
            return True
        time.sleep(0.3)
    print(f'  ! {label} zaman aşımına uğradı ({timeout:.0f} sn).')
    return False


def choose_sim_port() -> int | None:
    """Gerçek simülasyonu kullan; yoksa demo için port seç (None = demo yok)."""
    if sim_ready(8000):
        print('  ✓ 8000 portundaki simülasyon kullanılacak.')
        return None
    if port_open(8000):
        # Simülasyon yeni açılıyor olabilir; hemen demo başlatıp gerçek sunucuyu
        # atlamamak için kısa bir hazır olma denemesi yap.
        for _ in range(10):
            time.sleep(0.3)
            if sim_ready(8000):
                print('  ✓ 8000 portundaki simülasyon kullanılacak.')
                return None
        demo = free_port(8001)
        print(f'  ! 8000 dolu ama uyumlu simülasyon değil; demo {demo} portunda açılacak.')
        return demo
    print('  · 8000 boş; yerleşik demo simülasyon 8000 portunda açılacak.')
    return 8000


def build_urls(bridge_port: int, sim_base: str, edge_port: int | None) -> list[tuple[str, str]]:
    bridge = f'http://127.0.0.1:{bridge_port}'
    sim = (sim_base or 'http://127.0.0.1:8000').rstrip('/')
    urls = [
        ('ERP Studio · Panel', f'{bridge}/app/#/dashboard'),
        ('ERP · Simülasyon Bağlantısı', f'{bridge}/app/#/sim'),
        ('Simülasyon ekranı', f'{sim}/'),
    ]
    if edge_port:
        urls.append(('Edge saha arayüzü', f'http://127.0.0.1:{edge_port}/'))
    return urls


def open_tabs(urls: list[tuple[str, str]]) -> None:
    for index, (label, url) in enumerate(urls):
        print(f'  → {label}: {url}')
        try:
            if index == 0:
                webbrowser.open_new(url)       # ERP yeni pencerede (tarayıcı destekliyorsa)
            else:
                webbrowser.open_new_tab(url)   # diğerleri yeni sekmede
            time.sleep(0.35)
        except Exception as exc:
            print(f'    ! Açılamadı: {exc}')


def _install_signal_handlers() -> None:
    """Terminal kapatılınca (SIGHUP/SIGTERM) alt süreçleri temizle."""
    def stop(_signum, _frame):
        raise KeyboardInterrupt

    for name in ('SIGTERM', 'SIGHUP'):
        sig = getattr(signal, name, None)
        if sig is not None:
            try:
                signal.signal(sig, stop)
            except (OSError, ValueError):
                pass


def main(argv=None) -> int:
    _install_signal_handlers()
    parser = argparse.ArgumentParser(description='ERP + simülasyon + edge tek tık başlatıcı')
    parser.add_argument('--bridge-port', type=int, default=8080)
    parser.add_argument('--edge-port', type=int, default=8787)
    parser.add_argument('--speed', type=float, default=10.0, help='Demo simülasyon hızı (varsayılan 10x)')
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--no-edge', action='store_true')
    args = parser.parse_args(argv)

    print('\n  ============================================================')
    print('   ERP Studio — Tek Tık Test Ortamı')
    print('  ============================================================')

    bridge_proc = None
    edge_proc = None
    demo_port = None
    try:
        if bridge_ready(args.bridge_port):
            print(f'  ✓ {args.bridge_port} portundaki köprü zaten açık; yeniden başlatılmayacak.')
            info = get_json(f'http://127.0.0.1:{args.bridge_port}/api/bridge/info') or {}
            config = info.get('config') if isinstance(info.get('config'), dict) else {}
            sim_base = str(config.get('simBaseUrl') or 'http://127.0.0.1:8000')
        else:
            if port_open(args.bridge_port):
                print(f'  [HATA] {args.bridge_port} portu başka bir program tarafından kullanılıyor.')
                print('         O pencereyi kapatın veya --bridge-port 8081 deneyin.')
                return 2
            demo_port = choose_sim_port()
            command = [PYTHON, str(ROOT / 'server' / 'sim_bridge' / 'run.py'),
                       '--host', '127.0.0.1', '--port', str(args.bridge_port)]
            if demo_port is not None:
                command += ['--demo', '--demo-port', str(demo_port), '--demo-speed', str(args.speed)]
            print('  · Köprü başlatılıyor...')
            bridge_proc = subprocess.Popen(command, cwd=ROOT)
            if not wait_for(lambda: bridge_ready(args.bridge_port), 35, 'Köprü'):
                return 3
            sim_base = f'http://127.0.0.1:{demo_port}' if demo_port else 'http://127.0.0.1:8000'

        edge_port = None
        if not args.no_edge:
            if edge_ready(args.edge_port):
                print(f'  ✓ Edge saha arayüzü {args.edge_port} portunda açık.')
                edge_port = args.edge_port
            else:
                if port_open(args.edge_port):
                    print(f'  ! {args.edge_port} dolu; edge arayüzü açılmayacak.')
                else:
                    print(f'  · Edge saha arayüzü {args.edge_port} portunda başlatılıyor...')
                    edge_proc = subprocess.Popen(
                        [PYTHON, str(ROOT / 'edge' / 'main.py'), '--bind', '127.0.0.1',
                         '--port', str(args.edge_port), '--no-browser'], cwd=ROOT)
                    if wait_for(lambda: edge_ready(args.edge_port), 15, 'Edge arayüzü'):
                        edge_port = args.edge_port

        urls = build_urls(args.bridge_port, sim_base, edge_port)
        print('\n  Açılan ekranlar:')
        if args.no_browser:
            for label, url in urls:
                print(f'  → {label}: {url}')
        else:
            open_tabs(urls)

        print('\n  ============================================================')
        print('   Test ortamı hazır. Bu pencere açık kaldıkça çalışır.')
        print('   Kapatmak için Ctrl+C veya pencereyi kapatın.')
        print('  ============================================================\n')

        if bridge_proc is None:
            # Mevcut köprü kullanılıyorsa yeni süreç yok; edge varsa onu beklet.
            if edge_proc is not None:
                edge_proc.wait()
            return 0
        try:
            return bridge_proc.wait()
        except KeyboardInterrupt:
            print('\n  Kapatılıyor...')
            return 0
    except KeyboardInterrupt:
        print('\n  Kapatılıyor...')
        return 0
    finally:
        for proc in (edge_proc, bridge_proc):
            if proc is not None and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()


if __name__ == '__main__':
    sys.exit(main())
