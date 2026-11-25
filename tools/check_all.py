#!/usr/bin/env python3
"""Tek komutla kalite kapısı: veri, simülasyon, köprü, edge ve arayüz testleri.

Kullanım:
    python3 tools/check_all.py

Sıfır dış bağımlılık; Python 3.10+ ve Node.js 18+ bekler. Her adım gerçek
çıkış kodunu korur; ilk hata tüm kapıyı başarısız yapar (CI ile aynı).
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CHECKS = [
    ('Veri doğrulama', [sys.executable, 'server/erp/scripts/validate_data.py']),
    ('Simülasyon çekirdeği', [sys.executable, 'tools/simulation_smoke_test.py']),
    ('Simülasyon köprüsü', [sys.executable, 'tools/sim_bridge_smoke_test.py']),
    ('Edge ajanı', [sys.executable, 'tools/edge_smoke_test.py']),
    ('Tek tık başlatıcı', [sys.executable, 'tools/hepsi_smoke_test.py']),
    ('ERP arayüzü (Node)', ['node', 'tools/smoke_test.mjs']),
]


def main() -> int:
    if not shutil.which('node'):
        print('HATA: Node.js bulunamadı; arayüz testleri için Node.js 18+ gerekir.')
        return 2
    print('Kalite kapısı —', ROOT)
    failures: list[tuple[str, int, float]] = []
    for index, (name, command) in enumerate(CHECKS, 1):
        print(f'\n[{index}/{len(CHECKS)}] {name}')
        print('$', ' '.join(command))
        started = time.time()
        completed = subprocess.run(command, cwd=ROOT)
        elapsed = time.time() - started
        if completed.returncode:
            failures.append((name, completed.returncode, elapsed))
            print(f'✗ {name} başarısız (çıkış {completed.returncode}, {elapsed:.1f} sn)')
        else:
            print(f'✓ {name} ({elapsed:.1f} sn)')
    print('\n' + '—' * 60)
    if failures:
        print(f'{len(failures)}/{len(CHECKS)} adım başarısız:')
        for name, code, elapsed in failures:
            print(f'  ✗ {name} · çıkış {code} · {elapsed:.1f} sn')
        return 1
    print(f'TÜM KALİTE KAPISI GEÇTİ ({len(CHECKS)} adım)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
