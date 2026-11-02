#!/usr/bin/env python3
"""Giden kutu (outbox) işçisi — kapalı çevrimde biriken SMS / e-posta / yedek kayıtlarını işler.

Prensip: Üretim hiçbir zaman dış servisi beklemez. Modüller yalnızca `outbox.json`
dosyasına `queued` kaydı yazar. Bu işçi internet varken çalışır, başarısız gönderimleri
yeniden dener (üstel geri çekilme), başarılı kayıtları `sent` yapar.

Ortam değişkenleri (yoksa "demo" modunda çalışır, dosyaya yazar, ağa çıkmaz):
  ERP_SMTP_HOST, ERP_SMTP_PORT, ERP_SMTP_USER, ERP_SMTP_PASS, ERP_SMTP_FROM
  ERP_SMS_API_URL, ERP_SMS_API_KEY

Kullanım:
  python3 server/erp/scripts/outbox_worker.py --dry-run
  python3 server/erp/scripts/outbox_worker.py --max-attempts 5
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import smtplib
import sys
import urllib.error
import urllib.request
from email.message import EmailMessage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data')
LOGS = os.path.join(ROOT, 'logs')
OUTBOX = os.path.join(DATA, 'outbox.json')
SETTINGS = os.path.join(DATA, 'settings.json')


def log(line: str) -> None:
    os.makedirs(LOGS, exist_ok=True)
    stamp = dt.datetime.now().isoformat(timespec='seconds')
    text = f'[{stamp}] {line}'
    print(text)
    with open(os.path.join(LOGS, 'outbox.log'), 'a', encoding='utf-8') as fh:
        fh.write(text + '\n')


def read_json(path: str, default):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError):
        return default


def send_email(item: dict, dry_run: bool) -> None:
    host = os.environ.get('ERP_SMTP_HOST')
    if dry_run or not host:
        log(f'DEMO e-posta: {item["to"]} · {item["subject"]} (SMTP tanımlı değil)')
        return
    msg = EmailMessage()
    msg['From'] = os.environ.get('ERP_SMTP_FROM', 'erp@firma.local')
    msg['To'] = item['to']
    msg['Subject'] = item['subject']
    msg.set_content(item['body'])
    port = int(os.environ.get('ERP_SMTP_PORT', '587'))
    with smtplib.SMTP(host, port, timeout=15) as s:
        s.starttls()
        user, pw = os.environ.get('ERP_SMTP_USER'), os.environ.get('ERP_SMTP_PASS')
        if user and pw:
            s.login(user, pw)
        s.send_message(msg)
    log(f'E-posta gönderildi: {item["to"]}')


def send_sms(item: dict, dry_run: bool) -> None:
    url = os.environ.get('ERP_SMS_API_URL')
    if dry_run or not url:
        log(f'DEMO SMS: {item["to"]} · {item["subject"]} (sağlayıcı tanımlı değil)')
        return
    payload = json.dumps({'to': item['to'], 'text': item['body']}).encode()
    req = urllib.request.Request(url, data=payload, headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {os.environ.get("ERP_SMS_API_KEY", "")}'
    })
    with urllib.request.urlopen(req, timeout=15) as resp:
        if resp.status >= 300:
            raise RuntimeError(f'SMS sağlayıcı HTTP {resp.status}')
    log(f'SMS gönderildi: {item["to"]}')


def main() -> int:
    ap = argparse.ArgumentParser(description='Çevrimdışı biriken bildirimleri gönderir')
    ap.add_argument('--dry-run', action='store_true', help='Ağa çıkmadan yalnızca logla')
    ap.add_argument('--max-attempts', type=int, default=5, help='Başarısız kayıt için deneme üst sınırı')
    args = ap.parse_args()

    settings = read_json(SETTINGS, {})
    if settings.get('online') is False and not args.dry_run:
        log('Çevrimdışı: kuyruk korunuyor, gönderim yapılmadı (üretim etkilenmez)')
        return 0

    items = read_json(OUTBOX, [])
    if not isinstance(items, list):
        log('HATA: outbox.json bir dizi değil')
        return 1

    now = dt.datetime.now().isoformat(timespec='seconds')
    processed = 0
    for item in items:
        if item.get('status') != 'queued':
            continue
        if item.get('attempt', 0) >= args.max_attempts:
            item['status'] = 'failed'
            log(f'Deneme sınırı aşıldı → failed: {item.get("id")}')
            continue
        try:
            channel = item.get('channel')
            if channel == 'email':
                send_email(item, args.dry_run)
            elif channel == 'sms':
                send_sms(item, args.dry_run)
            elif channel == 'cloud_backup':
                log(f'DEMO bulut yedek kuyruğu: {item.get("subject")}')
            else:
                raise RuntimeError(f'Bilinmeyen kanal: {channel}')
            if not args.dry_run:
                item['status'] = 'sent'
                item['attempt'] = item.get('attempt', 0) + 1
                item['last_error'] = ''
                item['sent_at'] = now
                processed += 1
        except (OSError, RuntimeError, urllib.error.URLError, smtplib.SMTPException) as exc:
            item['attempt'] = item.get('attempt', 0) + 1
            item['last_error'] = str(exc)
            # Üstel geri çekilme: 2^deneme dakika
            delay = min(60, 2 ** item['attempt'])
            item['next_retry_at'] = (dt.datetime.now() + dt.timedelta(minutes=delay)).isoformat(timespec='seconds')
            log(f'Gönderim başarısız, yeniden denenecek: {item.get("id")} ({exc})')

    if not args.dry_run:
        with open(OUTBOX, 'w', encoding='utf-8') as fh:
            json.dump(items, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
    log(f'Bitti: {processed} kayıt gönderildi, {sum(1 for i in items if i.get("status") == "queued")} kayıt kuyrukta')
    return 0


if __name__ == '__main__':
    sys.exit(main())
