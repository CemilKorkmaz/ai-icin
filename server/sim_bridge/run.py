"""Köprüyü başlatır: `python3 server/sim_bridge/run.py`.

Örnekler:
  python3 server/sim_bridge/run.py                     # sim :8000, ERP :8080
  python3 server/sim_bridge/run.py --demo              # simülasyon kapalıysa demo kopya
  python3 server/sim_bridge/run.py --sim-url http://192.168.1.20:8000
  python3 server/sim_bridge/run.py --check             # yalnızca bağlantıyı sınar
"""
from __future__ import annotations

import argparse
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.sim_bridge.app import DEFAULT_CONFIG, VERSION, BridgeState, make_server  # noqa: E402
from server.sim_bridge.demo_sim import DemoSim  # noqa: E402


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description='ERP Studio ↔ simülasyon köprüsü')
    parser.add_argument('--host', default='0.0.0.0', help='ERP arayüz adresi (varsayılan 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8080, help='ERP arayüz portu (varsayılan 8080)')
    parser.add_argument('--sim-url', default=None,
                        help='Simülasyon adresi (varsayılan http://127.0.0.1:8000)')
    parser.add_argument('--config', default=str(DEFAULT_CONFIG), help='Köprü yapılandırması')
    parser.add_argument('--db', default=None, help='Ingest SQLite dosyası')
    parser.add_argument('--demo', action='store_true',
                        help='Yerleşik demo simülasyon kopyasını da başlat (önizleme/test)')
    parser.add_argument('--demo-port', type=int, default=8000, help='Demo simülasyon portu')
    parser.add_argument('--demo-speed', type=float, default=10.0,
                        help='Demo simülasyon hız çarpanı (varsayılan 10x)')
    parser.add_argument('--check', action='store_true', help='Yalnızca simülasyon bağlantısını sına')
    parser.add_argument('--open', action='store_true', help='Tarayıcıyı aç')
    args = parser.parse_args(argv)

    demo = None
    sim_url = args.sim_url
    if args.demo:
        demo = DemoSim(host='127.0.0.1', port=args.demo_port, speed=args.demo_speed).start()
        sim_url = sim_url or demo.url
        print(f'[demo] Simülasyon kopyası: {demo.url} ({args.demo_speed:g}x)')

    state = BridgeState(config_path=Path(args.config),
                        db_path=Path(args.db) if args.db else None,
                        sim_url=sim_url, demo=bool(demo))

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

    httpd = make_server(state, args.host, args.port)
    print(f'ERP Studio + simülasyon köprüsü v{VERSION}')
    print(f'  Arayüz : http://localhost:{args.port}/app/')
    print(f'  Sim    : {state.config["simBaseUrl"]}')
    print(f'  Ingest : http://localhost:{args.port}/api/edge/ingest (HMAC)')
    print(f'  Veri   : {state.store.path}')
    health = state.client.health()
    if health['ok']:
        print(f'  ✓ Simülasyon açık · {health["furnaceCount"]} fırın · {health["latencyMs"]} ms')
        mapping = state.mapping(state.client.furnaces())
        print(f'  ✓ Eşleme: {mapping["matched"]}/{mapping["furnaces"]} fırın')
    else:
        print(f'  ! Simülasyon kapalı: {health["error"]}')
        print('    Simülasyonu başlatın (./start.sh 10) veya --demo ile demo kopyayı kullanın.')
    print('  Durdurmak için Ctrl+C')
    if args.open:
        webbrowser.open(f'http://localhost:{args.port}/app/')
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
