#!/usr/bin/env python3
"""PLC sinyal denetçisi / demo simülatörü (docs/08 referans uygulaması).

GERÇEK HABERLEŞME YAPMAZ. Fabrika PLC'lerine bağlanmak ayrı bir modüldür ve
yol haritasının son aşamasındadır (docs/10). Bu script yalnızca merkezi
yönetimde tanımlı bağlantıları, tag eşleştirmelerini ve son sinyal durumlarını
okuyup raporlar; "dört sinyal kuralı"nın ihlal edilip edilmediğini kontrol eder.

Kullanım:
  python3 server/erp/scripts/plc_poller.py --dry-run
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data')
LOGS = os.path.join(ROOT, 'logs')
SIGNALS = ('door', 'casting', 'alarm', 'running')


def now_iso() -> str:
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=3))).isoformat(timespec='seconds')


def load(name: str):
    path = os.path.join(DATA, name + '.json')
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def line(msg: str, to_log: bool = True) -> None:
    text = f'{now_iso()} {msg}'
    print(text)
    if to_log:
        os.makedirs(LOGS, exist_ok=True)
        with open(os.path.join(LOGS, 'plc_poller.log'), 'a', encoding='utf-8') as fh:
            fh.write(text + '\n')


def main() -> int:
    ap = argparse.ArgumentParser(description='PLC sinyal denetçisi (demo, ağ bağlantısı yok)')
    ap.add_argument('--dry-run', action='store_true', help='Yalnızca rapor üretir (varsayılan davranış)')
    args = ap.parse_args()

    connections = load('plc-connections')
    tags = load('plc-tags')
    states = load('signal-states')
    machines = {m['id']: m for m in load('machines')}
    plants = {p['id']: p for p in load('plants')}

    line('PLC denetimi başladı · gerçek sürücü YOK, yalnızca konfigürasyon okunuyor', not args.dry_run)
    active = [c for c in connections if c.get('active')]
    line(f'Aktif bağlantı: {len(active)} / {len(connections)}')
    for c in active:
        plant = plants.get(c.get('plantId'), {})
        line(f"  {c['name']} · {plant.get('name', '?')} · {c['ip']}:{c['port']} · {c['protocol']} · {c.get('pollSeconds', 3)} sn")

    extra = sorted({t['signal'] for t in tags} - set(SIGNALS))
    if extra:
        line(f'UYARI  dört sinyal kuralı ihlali: {extra}. docs/08 gereği ilk faza alınmamalı.')
    else:
        line(f'OK     {len(tags)} tag yalnızca dört sinyale bağlı: {", ".join(SIGNALS)}')

    faults = [s for s in states if s.get('signal') == 'alarm' and s.get('value') == 'fault']
    line(f'Sinyal kaydı: {len(states)} · arıza: {len(faults)}')
    for s in faults:
        m = machines.get(s.get('machineId'), {})
        line(f"  ARIZA {m.get('name', s.get('machineId'))} · {s.get('at')} · kaynak {s.get('source')}")

    manual = [s for s in states if s.get('source') == 'MANUAL']
    line(f'MANUAL moddan gelen sinyal: {len(manual)} (operatör girişi, PLC yok)')
    line('BİTTİ · Sonraki aşama: OPC UA / Modbus sürücüsü VPN üzerinden eklenir')
    return 0


if __name__ == '__main__':
    sys.exit(main())
