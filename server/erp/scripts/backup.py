#!/usr/bin/env python3
"""ERP yedekleme işçisi — 3-2-1 politikası.

Ne yapar:
  1) data/ altındaki tüm JSON arşivini tutarlı bir anlık görüntüye kopyalar,
  2) varsa db/ klasörünü (SQLite / dump) de ekler,
  3) backups/YYYY-MM-DD_HHMM/ altına yazar,
  4) ayarlardaki harici disk yoluna ikinci kopyayı atar (erişilemiyorsa atlar, loglar),
  5) SHA-256 sağlama toplamları üretir,
  6) saklama süresinden eski yedekleri temizler,
  7) sonucu logs/backup.log dosyasına yazar.

Bağımlılık yok (yalnızca standart kütüphane). Windows Görev Zamanlayıcı veya
Linux cron ile saatlik/günlük çalıştırılır:

    python3 server/erp/scripts/backup.py --retention-days 30

Gerçek kurulumda canlı veritabanı PostgreSQL/SQLite için `pg_dump` / `.backup`
komutu 2. adıma eklenmelidir; bu script dosya tabanlı arşiv için çalışır.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import shutil
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data')
DB = os.path.join(ROOT, 'db')
BACKUPS = os.path.join(ROOT, 'backups')
LOGS = os.path.join(ROOT, 'logs')


def log(line: str) -> None:
    os.makedirs(LOGS, exist_ok=True)
    stamp = dt.datetime.now().isoformat(timespec='seconds')
    text = f'[{stamp}] {line}'
    print(text)
    with open(os.path.join(LOGS, 'backup.log'), 'a', encoding='utf-8') as fh:
        fh.write(text + '\n')


def external_target() -> str | None:
    cfg = os.path.join(DATA, 'settings.json')
    try:
        with open(cfg, encoding='utf-8') as fh:
            path = json.load(fh).get('backupPath', '')
    except (OSError, json.JSONDecodeError):
        return None
    if not path:
        return None
    # Windows yolu (D:\...) Linux üzerinde geçerli değilse atlanır.
    if ':' in path and os.name != 'nt':
        return None
    parent = os.path.dirname(path.rstrip('\\/')) or '.'
    if not os.path.isdir(parent):
        return None
    return path


def checksums(folder: str) -> str:
    lines = []
    for base, _dirs, names in os.walk(folder):
        for name in sorted(names):
            if name == 'checksums.sha256':
                continue
            full = os.path.join(base, name)
            rel = os.path.relpath(full, folder)
            h = hashlib.sha256()
            with open(full, 'rb') as fh:
                for block in iter(lambda: fh.read(65536), b''):
                    h.update(block)
            lines.append(f'{h.hexdigest()}  {rel}')
    target = os.path.join(folder, 'checksums.sha256')
    with open(target, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    return str(len(lines))


def prune(retention_days: int) -> int:
    if not os.path.isdir(BACKUPS):
        return 0
    limit = dt.datetime.now() - dt.timedelta(days=retention_days)
    removed = 0
    for name in os.listdir(BACKUPS):
        p = os.path.join(BACKUPS, name)
        if not os.path.isdir(p):
            continue
        try:
            when = dt.datetime.strptime(name, '%Y-%m-%d_%H%M')
        except ValueError:
            continue
        if when < limit:
            shutil.rmtree(p, ignore_errors=True)
            removed += 1
    return removed


def main() -> int:
    ap = argparse.ArgumentParser(description='ERP JSON arşivini harici diske yedekler')
    ap.add_argument('--retention-days', type=int, default=30, help='Eski yedeklerin saklama süresi')
    ap.add_argument('--no-external', action='store_true', help='İkinci (harici disk) kopyayı atla')
    args = ap.parse_args()

    if not os.path.isdir(DATA):
        log('HATA: data/ klasörü bulunamadı')
        return 1

    stamp = dt.datetime.now().strftime('%Y-%m-%d_%H%M')
    dest = os.path.join(BACKUPS, stamp)
    os.makedirs(dest, exist_ok=True)

    shutil.copytree(DATA, os.path.join(dest, 'data'), dirs_exist_ok=True)
    if os.path.isdir(DB):
        shutil.copytree(DB, os.path.join(dest, 'db'), dirs_exist_ok=True)
    # Saha görüşmesi sonrası: olay günlüğü ve işlenmiş kuyruk da yedek kapsamında (docs/09 Bölüm 7)
    for name in ('archive', 'inbox/processed', 'inbox/dead-letter'):
        src = os.path.join(ROOT, name)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(dest, name), dirs_exist_ok=True)
    processed_clients = os.path.join(ROOT, 'archive', 'processed-clients.json')
    if os.path.isfile(processed_clients):
        os.makedirs(os.path.join(dest, 'archive'), exist_ok=True)
        shutil.copy2(processed_clients, os.path.join(dest, 'archive', 'processed-clients.json'))
    log(f'Anlık görüntü alındı: {dest} (data + archive + işlenmiş kuyruk)')

    n = checksums(dest)
    log(f'Şifreli olmayan sağlama toplamı üretildi: {n} dosya')

    if not args.no_external:
        target = external_target()
        if target:
            ext = os.path.join(target, f'ERP_Yedek_{stamp}')
            try:
                shutil.copytree(dest, ext, dirs_exist_ok=True)
                log(f'Harici disk kopyası yazıldı: {ext}')
            except OSError as exc:
                log(f'UYARI: harici diske yazılamadı ({exc}) — yerel yedek korundu')
        else:
            log('UYARI: harici disk yolu ayarlı değil / erişilemiyor; 3-2-1 için tanımlayın')

    removed = prune(args.retention_days)
    log(f'Temizlik: {removed} eski yedek silindi (saklama {args.retention_days} gün)')
    log('Yedekleme tamamlandı. Ayda bir RESTORE TESTİ yapılmalıdır.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
