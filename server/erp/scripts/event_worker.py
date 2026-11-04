#!/usr/bin/env python3
"""Olay tabanlı JSON arşivleme işçisi (docs/09 referans uygulaması).

Abinin tarif ettiği akış: HTML arayüzünde tuşa basılınca `ERP/inbox/` altına bir
JSON kaydı düşer; merkezi yazılım 1–3 saniyede kuyruğu tarar, hesapları yapar,
sonuçları kalıcı arşive yazar.

Teknik düzeltme: işlenen kayıt SİLİNMEZ. Önce append-only olay günlüğüne yazılır,
fsync ile diske sabitlenir, SHA-256 sağlama toplamı üretilir; ancak bundan sonra
kuyruk kaydı `archived` durumuna alınıp `processed/` klasörüne taşınır. Hata olursa
`dead-letter/` altına taşınır. Aynı clientId ikinci kez gelirse olay çift yazılmaz.

Harici kütüphane yoktur (yalnızca standart kütüphane).

Kullanım:
  python3 server/erp/scripts/event_worker.py --dry-run
  python3 server/erp/scripts/event_worker.py --once
  python3 server/erp/scripts/event_worker.py --loop --interval 3
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import os
import shutil
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INBOX = os.path.join(ROOT, 'inbox')
PROCESSING = os.path.join(INBOX, 'processing')
PROCESSED = os.path.join(INBOX, 'processed')
DEAD = os.path.join(INBOX, 'dead-letter')
EXAMPLES = os.path.join(INBOX, 'examples')
ARCHIVE = os.path.join(ROOT, 'archive')
LOGS = os.path.join(ROOT, 'logs')

REQUIRED = ('clientId', 'type', 'lotId', 'payload', 'schemaVersion')
SIGNALS = ('door', 'casting', 'alarm', 'running')


def now_iso() -> str:
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=3))).isoformat(timespec='seconds')


def log(msg: str) -> None:
    os.makedirs(LOGS, exist_ok=True)
    line = f'{now_iso()} {msg}'
    print(line)
    with open(os.path.join(LOGS, 'event_worker.log'), 'a', encoding='utf-8') as fh:
        fh.write(line + '\n')


def ensure_dirs() -> None:
    for path in (INBOX, PROCESSING, PROCESSED, DEAD, EXAMPLES, ARCHIVE, LOGS):
        os.makedirs(path, exist_ok=True)


def load_clients() -> set:
    path = os.path.join(ARCHIVE, 'processed-clients.json')
    if not os.path.exists(path):
        return set()
    try:
        with open(path, encoding='utf-8') as fh:
            return set(json.load(fh))
    except (json.JSONDecodeError, TypeError):
        return set()


def save_clients(clients: set) -> None:
    path = os.path.join(ARCHIVE, 'processed-clients.json')
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        json.dump(sorted(clients), fh, ensure_ascii=False, indent=2)
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(tmp, path)


def cylinder_mass_kg(diameter_mm: float, length_mm: float, density: float = 2700.0, count: float = 1.0) -> float:
    """app/js/calc.js içindeki formülün aynısı: π·(D/2000)²·(L/1000)·ρ·adet."""
    d, l, rho, n = float(diameter_mm), float(length_mm), float(density), float(count)
    if min(d, l, rho, n) <= 0:
        return 0.0
    return math.pi * (d / 2000.0) ** 2 * (l / 1000.0) * rho * n


def derived_events(record: dict, base: dict) -> list:
    """Hesap gerektiren kayıtlar için birden fazla olay satırı üretir (docs/07)."""
    kind = record.get('type')
    payload = record.get('payload') or {}
    events = []

    if kind == 'CUT_BATCH':
        d = float(payload.get('diameterMm', 178))
        cast_len = float(payload.get('castLengthMm', 6300))
        product_len = float(payload.get('productLengthMm', 6000))
        blade = float(payload.get('bladeMm', 3))
        head = float(payload.get('headMm', 300))
        density = float(payload.get('density', 2700))
        count = max(1, int(payload.get('count', 1)))
        heads_per = max(1, int(payload.get('headPerBillet', 2)))
        cuts_per = max(1, int(payload.get('cutsPerBillet', 2)))
        scrap = float(payload.get('scrapBilletKg', 0))
        effective_head = max(0.0, cast_len - product_len - blade)
        head_kg = cylinder_mass_kg(d, effective_head, density, count * heads_per)
        sawdust_kg = cylinder_mass_kg(d, blade, density, count * cuts_per)
        net_kg = max(0.0, cylinder_mass_kg(d, cast_len, density, count) - head_kg - sawdust_kg - scrap)
        for type_, mat, fate, delta, data in (
            ('HEAD_CUT', 'B03', 'remelt', -head_kg / 1000.0,
             {'headMm': effective_head, 'headPerBillet': heads_per, 'headKg': round(head_kg, 2)}),
            ('SAWDUST', 'B02', 'sale', -sawdust_kg / 1000.0,
             {'bladeMm': blade, 'cuts': count * cuts_per, 'sawdustKg': round(sawdust_kg, 3)}),
            ('NET_BILLET', 'M01', 'product', 0.0,
             {'count': count, 'productLengthMm': product_len, 'netTon': round(net_kg / 1000.0, 3)}),
        ):
            events.append({**base, 'type': type_, 'materialId': mat, 'fate': fate,
                           'deltaTon': round(delta, 4), 'payload': data,
                           'note': 'Kesim hesap motorundan türetildi'})
    elif kind == 'HOMOGEN_START':
        planned = float(payload.get('plannedMinutes', 480))
        events.append({**base, 'type': 'HOMOGEN_START', 'fate': 'product',
                       'payload': {'plannedMinutes': planned, 'batchId': payload.get('batchId')},
                       'note': 'Homojenizasyon start'})
    elif kind in ('SIGNAL_DOOR', 'SIGNAL_CASTING', 'SIGNAL_ALARM', 'SIGNAL_RUNNING'):
        events.append({**base, 'type': kind, 'source': 'PLC', 'payload': payload,
                       'note': 'Dört sinyal kuralı'})
    else:
        events.append({**base, 'type': kind, 'payload': payload, 'note': record.get('note', '')})
    return events


def append_events(lot_id: str, at: str, events: list, dry_run: bool) -> tuple:
    today = dt.datetime.fromisoformat(at)
    folder = os.path.join(ARCHIVE, str(today.year), f'{today.month:02d}', lot_id)
    events_path = os.path.join(folder, 'events.jsonl')
    checksum_path = os.path.join(ARCHIVE, str(today.year), f'{today.month:02d}', 'checksums.sha256')
    if dry_run:
        return events_path, 0, 'dry-run'

    os.makedirs(folder, exist_ok=True)
    if os.path.exists(events_path):
        with open(events_path, encoding='utf-8') as fh:
            existing = [json.loads(line) for line in fh if line.strip()]
    else:
        existing = []
    seq0 = max((int(e.get('seq', 0)) for e in existing), default=0)
    balance = float(existing[-1].get('balanceTon', 0)) if existing else 0.0
    lines = []
    for i, ev in enumerate(events, start=1):
        balance = round(balance + float(ev.get('deltaTon', 0)), 4)
        ev.update({'seq': seq0 + i, 'balanceTon': balance,
                   'grossTon': round(balance - float(ev.get('deltaTon', 0)), 4)})
        lines.append(json.dumps(ev, ensure_ascii=False, sort_keys=True))

    with open(events_path, 'a', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
        fh.flush()
        os.fsync(fh.fileno())

    digest = hashlib.sha256('\n'.join(lines).encode('utf-8')).hexdigest()
    with open(checksum_path, 'a', encoding='utf-8') as fh:
        fh.write(f'{digest}  {lot_id}/events.jsonl  {len(lines)} satır  {at}\n')

    with open(os.path.join(folder, 'snapshot.json'), 'w', encoding='utf-8') as fh:
        all_events = existing + [json.loads(line) for line in lines]
        json.dump({'lotId': lot_id, 'updatedAt': at, 'eventCount': len(all_events),
                   'balanceTon': balance, 'lastEvent': all_events[-1] if all_events else None},
                  fh, ensure_ascii=False, indent=2)
    return events_path, len(lines), digest


def handle(path: str, clients: set, dry_run: bool, max_retry: int = 3) -> str:
    name = os.path.basename(path)
    try:
        with open(path, encoding='utf-8') as fh:
            record = json.load(fh)
    except (json.JSONDecodeError, OSError) as exc:
        if not dry_run:
            shutil.move(path, os.path.join(DEAD, name))
        log(f'HATA  {name}: geçersiz JSON ({exc})')
        return 'dead'

    missing = [k for k in REQUIRED if k not in record]
    if missing:
        if not dry_run:
            with open(path, 'w', encoding='utf-8') as fh:
                json.dump({**record, 'status': 'dead', 'retryCount': int(record.get('retryCount', 0)) + 1,
                           'lastError': 'Eksik alanlar: ' + ', '.join(missing)}, fh, ensure_ascii=False, indent=2)
            shutil.move(path, os.path.join(DEAD, name))
        log(f'HATA  {name}: eksik alanlar {missing}')
        return 'dead'

    client_id = record['clientId']
    if client_id in clients:
        if not dry_run:
            shutil.move(path, os.path.join(PROCESSED, name))
        log(f'TEKRAR {name}: {client_id} zaten arşivlendi, çift yazım engellendi')
        return 'duplicate'

    at = now_iso()
    base = {
        'id': f'EV-{int(time.time() * 1000)}', 'lotId': record['lotId'],
        'plantId': record.get('plantId', 'P1'), 'machineId': record.get('machineId'),
        'at': at, 'actor': record.get('actor', 'worker'), 'source': record.get('source', 'WORKER'),
        'deltaTon': 0, 'balanceTon': 0, 'materialId': None, 'fate': None,
        'ref': record.get('ref', ''), 'clientId': client_id,
    }
    events = derived_events(record, base)
    events_path, count, digest = append_events(record['lotId'], at, events, dry_run)

    if dry_run:
        log(f'DRY   {name}: {len(events)} olay → {os.path.relpath(events_path, ROOT)} (yazılmadı)')
        return 'dry'

    # Arşive yazma başarılı; ancak bundan sonra kuyruk kaydı arşivlenir.
    clients.add(client_id)
    save_clients(clients)
    out = {**record, 'status': 'archived', 'processedAt': at, 'eventCount': count, 'checksum': digest}
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    shutil.move(path, os.path.join(PROCESSED, name))
    log(f'OK    {name}: {count} olay arşivlendi → {os.path.relpath(events_path, ROOT)} · sha256 {digest[:12]}…')
    return 'archived'


def run_once(dry_run: bool, max_retry: int) -> tuple:
    files = sorted(f for f in os.listdir(INBOX) if f.endswith('.json')) if os.path.isdir(INBOX) else []
    candidates = [os.path.join(INBOX, f) for f in files]
    if not candidates and dry_run:
        candidates = sorted(os.path.join(EXAMPLES, f) for f in os.listdir(EXAMPLES) if f.endswith('.json')) if os.path.isdir(EXAMPLES) else []
    clients = load_clients()
    results = {'archived': 0, 'duplicate': 0, 'dead': 0, 'dry': 0}
    for path in candidates:
        # Atomik sahiplenme: aynı anda iki worker çalışırsa yalnızca biri işler.
        if not dry_run:
            try:
                target = os.path.join(PROCESSING, os.path.basename(path))
                os.replace(path, target)
                path = target
            except OSError as exc:
                log(f'ATLA  {os.path.basename(path)}: {exc}')
                continue
        results[handle(path, clients, dry_run, max_retry)] += 1
    return results, len(candidates)


def main() -> int:
    ap = argparse.ArgumentParser(description='Olay tabanlı JSON arşivleme işçisi')
    ap.add_argument('--dry-run', action='store_true', help='Dosya taşımaz, yalnızca raporlar')
    ap.add_argument('--once', action='store_true', help='Tek tur çalışır (varsayılan)')
    ap.add_argument('--loop', action='store_true', help='Sürekli tarama çevrimi')
    ap.add_argument('--interval', type=float, default=3.0, help='Tarama aralığı, saniye (1–3 önerilir)')
    ap.add_argument('--max-retry', type=int, default=3, help='Dead-letter yeniden deneme üst sınırı')
    args = ap.parse_args()

    ensure_dirs()
    log(f'BAŞLA dry_run={args.dry_run} interval={args.interval}s max_retry={args.max_retry}')
    if args.loop:
        try:
            while True:
                results, total = run_once(args.dry_run, args.max_retry)
                if total:
                    log(f'TUR   {total} kayıt → {results}')
                time.sleep(max(0.2, args.interval))
        except KeyboardInterrupt:
            log('DURDU (Ctrl+C)')
            return 0
    results, total = run_once(args.dry_run, args.max_retry)
    log(f'BİTTİ {total} kayıt → {results}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
