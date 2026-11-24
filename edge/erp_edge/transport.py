"""ERP gönderimi: imzalı batch, offline kuyruk, üstel geri çekilme.

Ajan ERP'nin işletme tablolarına asla doğrudan yazmaz. Tek uç nokta
`/api/edge/ingest`'tir; ERP tarafındaki worker doğrular, `signalStates`,
telemetri ve gerekirse bakım bildirimi üretir (docs/12 Bölüm 8).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import threading
import time
import urllib.error
import urllib.request

from .config import Config
from .db import EdgeDB, now_iso


def sign(payload_json: str, secret: str) -> str:
    return hmac.new(secret.encode('utf-8'), payload_json.encode('utf-8'), hashlib.sha256).hexdigest()


class Transport:
    def __init__(self, cfg: Config, db: EdgeDB):
        self.cfg = cfg
        self.db = db
        self.running = False
        self.thread: threading.Thread | None = None
        self.last_result: dict = {}
        self.lock = threading.RLock()

    def test(self) -> dict:
        erp = self.cfg.data['erp']
        probe = {'kind': 'edge-ping', 'siteCode': self.cfg.data.get('siteCode'), 'at': now_iso()}
        body = json.dumps(probe, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(erp['url'], data=body, method='POST', headers={
            'Content-Type': 'application/json; charset=utf-8',
            'X-Edge-Client-Id': f"PING-{int(time.time())}",
            'X-Edge-Signature': sign(json.dumps(probe, ensure_ascii=False), erp.get('secret', '')),
            **({'Authorization': f"Bearer {erp['token']}"} if erp.get('token') else {})
        })
        try:
            with urllib.request.urlopen(req, timeout=int(erp.get('timeoutSeconds') or 5)) as resp:
                return {'ok': True, 'httpStatus': resp.status, 'mode': 'ONLINE',
                        'message': f'ERP uç noktası yanıt verdi ({resp.status})'}
        except urllib.error.HTTPError as exc:
            return {'ok': False, 'httpStatus': exc.code, 'mode': 'ONLINE',
                    'message': f'ERP uç noktası {exc.code} döndürdü; kuyruk korunur'}
        except Exception as exc:
            return {'ok': False, 'httpStatus': 0, 'mode': 'OFFLINE',
                    'message': f'ERP erişilemiyor: {exc.__class__.__name__}. Üretim sürer, kayıtlar SQL ve kuyrukta kalır'}

    def send_pending(self, limit: int | None = None) -> dict:
        if self.cfg.data.get('erp', {}).get('enabled') is False:
            return {'processed': 0, 'sent': 0, 'failed': 0, 'disabled': True}
        rows = self.db.pending_outbox(limit or int(self.cfg.data['erp'].get('batchSize') or 50))
        erp = self.cfg.data['erp']
        sent = failed = 0
        for row in rows:
            self.db.mark_outbox(row['id'], 'sending', '', row['attempts'])
            body = row['payload_json'].encode('utf-8')
            req = urllib.request.Request(row['endpoint'] or erp['url'], data=body, method='POST', headers={
                'Content-Type': 'application/json; charset=utf-8',
                'X-Edge-Client-Id': row['client_id'],
                'X-Edge-Batch-Id': row['batch_id'],
                'X-Edge-Signature': sign(row['payload_json'], erp.get('secret', '')),
                **({'Authorization': f"Bearer {erp['token']}"} if erp.get('token') else {})
            })
            try:
                with urllib.request.urlopen(req, timeout=int(erp.get('timeoutSeconds') or 5)) as resp:
                    if 200 <= resp.status < 300:
                        self.db.mark_outbox(row['id'], 'sent', '', row['attempts'] + 1)
                        sent += 1
                    else:
                        raise RuntimeError(f'HTTP {resp.status}')
            except Exception as exc:
                attempts = row['attempts'] + 1
                max_retries = int(erp.get('maxRetries') or 6)
                status = 'dead' if attempts >= max_retries else 'failed'
                self.db.mark_outbox(row['id'], status, str(exc)[:300], attempts)
                failed += 1
                self.db.log('warn' if status != 'dead' else 'error', 'TRANSPORT',
                            f"{row['batch_id']} gönderilemedi ({attempts}/{max_retries}): {exc.__class__.__name__}")
        result = {'processed': len(rows), 'sent': sent, 'failed': failed, 'disabled': False, 'at': now_iso()}
        with self.lock:
            self.last_result = result
        return result

    def start(self) -> None:
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._loop, name='edge-transport', daemon=True)
        self.thread.start()
        self.db.log('info', 'TRANSPORT', 'ERP kuyruk işçisi başlatıldı')

    def stop(self) -> None:
        self.running = False

    def _loop(self) -> None:
        while self.running:
            try:
                self.send_pending()
            except Exception as exc:
                self.db.log('error', 'TRANSPORT', f'Kuyruk hatası: {exc}')
            for _ in range(20):
                if not self.running:
                    break
                time.sleep(0.5)

    def status(self) -> dict:
        with self.lock:
            result = dict(self.last_result)
        result['running'] = self.running
        result['queue'] = self.db.counts()
        return result
