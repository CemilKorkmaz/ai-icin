"""Köprüyü başlatır: `python3 server/sim_bridge/run.py` veya çift tık `Baslat.bat`.

Örnekler:
  python3 server/sim_bridge/run.py                     # sim :8000, ERP :8080
  python3 server/sim_bridge/run.py --open              # tarayıcıyı canlı Panel'de açar
  python3 server/sim_bridge/run.py --demo              # simülasyon kapalıysa demo kopya
  python3 server/sim_bridge/run.py --sim-url http://192.168.1.20:8000
  python3 server/sim_bridge/run.py --check             # yalnızca bağlantıyı sınar
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import webbrowser
from pathlib import Path

FROZEN = bool(getattr(sys, 'frozen', False))
ROOT = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parents[2])).resolve()
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.sim_bridge.app import BASE_DIR, VERSION, BridgeState, make_server  # noqa: E402
from server.sim_bridge.demo_sim import DemoSim  # noqa: E402


def _alert(message: str) -> None:
    """macOS .app penceresiz çalışır; ölümcül hatayı ileti olarak gösterir."""
    if not (FROZEN and sys.platform == 'darwin'):
        return
    text = ' '.join(str(message).split())[:900].replace('\\', '/').replace('"', "'")
    try:
        subprocess.run(
            ['osascript', '-e', f'display alert "ERP Sim Bridge" message "{text}" as critical'],
            check=False, timeout=30)
    except (OSError, subprocess.SubprocessError):
        pass


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description='ERP Studio ↔ simülasyon köprüsü')
    parser.add_argument('--host', default='127.0.0.1' if FROZEN else '0.0.0.0',
                        help='ERP arayüz adresi (exe: 127.0.0.1, kaynak: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8080, help='ERP arayüz portu (varsayılan 8080)')
    parser.add_argument('--sim-url', default=None,
                        help='Simülasyon adresi (varsayılan http://127.0.0.1:8000)')
    parser.add_argument('--config', default=None,
                        help='Köprü yapılandırması (varsayılan: depo veya exe yanı)')
    parser.add_argument('--db', default=None, help='Ingest SQLite dosyası')
    parser.add_argument('--demo', action='store_true',
                        help='Yerleşik demo simülasyon kopyasını da başlat (önizleme/test)')
    parser.add_argument('--demo-port', type=int, default=8000, help='Demo simülasyon portu')
    parser.add_argument('--demo-speed', type=float, default=10.0,
                        help='Demo simülasyon hız çarpanı (varsayılan 10x)')
    parser.add_argument('--check', action='store_true', help='Yalnızca simülasyon bağlantısını sına')
    parser.add_argument('--open', action='store_true',
                        help='Tarayıcıyı doğrudan simülasyon ekranında aç')
    args = parser.parse_args(argv)

    demo = None
    sim_url = args.sim_url
    if args.demo:
        try:
            demo = DemoSim(host='127.0.0.1', port=args.demo_port,
                           speed=args.demo_speed).start()
        except OSError as exc:
            message = (f'Demo simülasyon {args.demo_port} portunu açamadı: {exc} '
                       'Bu portta kendi simülasyonunuz açık olabilir; --demo-port 8001 deneyin.')
            print(message)
            _alert(message)
            return 2
        sim_url = sim_url or demo.url
        print(f'[demo] Simülasyon kopyası: {demo.url} ({args.demo_speed:g}x)')

    try:
        state = BridgeState(asset_root=ROOT, base_dir=BASE_DIR,
                            config_path=Path(args.config) if args.config else None,
                            db_path=Path(args.db) if args.db else None,
                            sim_url=sim_url, demo=bool(demo))
    except OSError as exc:
        message = (f'Köprü çalışma dosyalarını oluşturamadı: {exc}. '
                   'Uygulamayı yazılabilir bir klasöre kopyalayın (Masaüstü gibi).')
        print(message)
        _alert(message)
        return 3

    if args.check:
        health = state.client.health()
        print(f"Simülasyon: {health['baseUrl']}")
        if health['ok']:
            print(f"  ✓ Bağlantı açık · {health['furnaceCount']} fırın · {health['latencyMs']} ms")
            mapping = state.mapping(state.client.furnaces())
            for pair in mapping['pairs']:
                print(f"  ✓ {pair['furnace']} → {pair['machineId']} ({pair['source']})")
            for row in mapping['unmatched']:
                print(f"  ! {row['furnace']}: {row['reason']}")
            return 0
        print(f"  ✗ {health['error']}")
        return 1

    try:
        httpd = make_server(state, args.host, args.port)
    except OSError as exc:
        message = (f'{args.port} portu açılamadı: {exc}. '
                   'Muhtemelen eski köprü penceresi hâlâ açık; onu kapatıp yeniden deneyin.')
        print(message)
        print(f'  Alternatif: python3 server/sim_bridge/run.py --port {args.port + 1}')
        _alert(message)
        return 2
    url = f'http://localhost:{args.port}/app/#/dashboard'
    print(f'ERP Studio + simülasyon köprüsü v{VERSION}')
    print(f'  ERP Studio : {url}')
    print(f'  Simülasyon : {state.config["simBaseUrl"]}  (sizin çalıştırdığınız)')
    print(f'  Ingest     : http://localhost:{args.port}/api/edge/ingest (HMAC)')
    print(f'  Veri       : {state.store.path}')
    if state.runtime_layout:
        print(f'  Ayar       : {state.config_path}')
    print('  Bu pencere açık kaldıkça köprü çalışır. Kapatmak için Ctrl+C veya pencereyi kapatın.')
    health = state.client.health()
    if health['ok']:
        print(f'  ✓ Simülasyon açık · {health["furnaceCount"]} fırın · {health["latencyMs"]} ms')
        mapping = state.mapping(state.client.furnaces())
        print(f'  ✓ Eşleme: {mapping["matched"]}/{mapping["furnaces"]} fırın')
    else:
        print(f'  ! Simülasyon henüz kapalı: {health["error"]}')
        print('    Kendi simülasyonunuzu başlatın (./start.sh 10) ve tarayıcıda Yeniden Bağlan deyin.')
        print('    Yalnızca önizleme için: --demo ile yerleşik kopya.')
    # Exe'ye çift tıklandığında tarayıcı kendiliğinden açılır.
    if args.open or FROZEN:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nKapatılıyor…')
    finally:
        httpd.server_close()
        if demo:
            demo.stop()
    return 0


if __name__ == '__main__':
    sys.exit(main())
