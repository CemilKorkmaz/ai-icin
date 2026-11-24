"""Köprünün yerel SQL kaydı: imzalı edge batch'leri, okumalar ve olaylar.

Edge ajanının `/api/edge/ingest` çağrıları burada saklanır. Amaç prototipte
ERP'nin canlı işçisini taklit etmek değil, **imza doğrulamasını ve kuyruğun
boşaldığını kanıtlamaktır**; işletme tablolarına (stok, maliyet, muhasebe)
hiçbir yazım yapılmaz. Aynı `batchId` ikinci kez gelirse yinelenen kayıt
oluşmaz (idempotency).
"""
from __future__ import annotations

import json
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL UNIQUE,
  client_id TEXT,
  site_code TEXT,
  plant_id TEXT,
  adapter TEXT,
  fallback TEXT,
  payload_at TEXT,
  received_at TEXT NOT NULL,
  reading_count INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  signature_ok INTEGER NOT NULL DEFAULT 1,
  remote TEXT,
  raw TEXT
);
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  at TEXT,
  machine_id TEXT,
  machine_name TEXT,
  tag_id TEXT,
  kind TEXT,
  signal TEXT,
  value_num REAL,
  value_text TEXT,
  unit TEXT,
  quality TEXT,
  source TEXT,
  adapter TEXT,
  raw TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  at TEXT,
  machine_id TEXT,
  signal TEXT,
  kind TEXT,
  previous TEXT,
  current TEXT,
  severity TEXT,
  note TEXT
);
CREATE TABLE IF NOT EXISTS pings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT,
  received_at TEXT NOT NULL,
  remote TEXT
);
CREATE INDEX IF NOT EXISTS idx_readings_batch ON readings(batch_id);
CREATE INDEX IF NOT EXISTS idx_readings_machine ON readings(machine_id, signal);
CREATE INDEX IF NOT EXISTS idx_events_batch ON events(batch_id);
"""


def now_iso() -> str:
    return time.strftime('%Y-%m-%dT%H:%M:%S%z')


def _pick(row: dict, *keys):
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return None


def _num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class IngestStore:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._conn() as con:
            con.executescript(SCHEMA)

    @contextmanager
    def _conn(self):
        con = sqlite3.connect(self.path, timeout=5)
        con.row_factory = sqlite3.Row
        con.execute('PRAGMA journal_mode=WAL')
        con.execute('PRAGMA busy_timeout=5000')
        try:
            yield con
            con.commit()
        finally:
            con.close()

    # ------------------------------------------------------------------ yazma
    def insert_batch(self, batch: dict, raw_body: str, remote: str = '') -> dict:
        batch_id = str(batch.get('batchId') or _pick(batch, 'batch_id', 'clientId') or '')
        if not batch_id:
            raise ValueError('batchId zorunlu')
        readings = batch.get('readings') if isinstance(batch.get('readings'), list) else []
        events = batch.get('events') if isinstance(batch.get('events'), list) else []
        with self._conn() as con:
            existing = con.execute('SELECT reading_count, event_count FROM batches WHERE batch_id=?',
                                   (batch_id,)).fetchone()
            if existing:
                return {'duplicate': True, 'batchId': batch_id,
                        'readings': existing['reading_count'], 'events': existing['event_count']}
            con.execute(
                'INSERT INTO batches (batch_id, client_id, site_code, plant_id, adapter, fallback,'
                ' payload_at, received_at, reading_count, event_count, signature_ok, remote, raw)'
                ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                (batch_id, _pick(batch, 'clientId', 'client_id'), batch.get('siteCode'),
                 batch.get('plantId'), batch.get('adapter'), batch.get('fallback'),
                 batch.get('at'), now_iso(), len(readings), len(events), 1, remote,
                 json.dumps(batch, ensure_ascii=False)))
            for row in readings:
                if not isinstance(row, dict):
                    continue
                con.execute(
                    'INSERT INTO readings (batch_id, at, machine_id, machine_name, tag_id, kind,'
                    ' signal, value_num, value_text, unit, quality, source, adapter, raw)'
                    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    (batch_id, row.get('at'), _pick(row, 'machine_id', 'machineId'),
                     _pick(row, 'machine_name', 'machineName'), _pick(row, 'tag_id', 'tagId'),
                     row.get('kind'), row.get('signal'), _num(row.get('value_num')),
                     row.get('value_text') if row.get('value_text') is not None else None,
                     row.get('unit'), row.get('quality'), row.get('source'), row.get('adapter'),
                     json.dumps(row.get('raw'), ensure_ascii=False) if row.get('raw') is not None else None))
            for event in events:
                if not isinstance(event, dict):
                    continue
                con.execute(
                    'INSERT INTO events (batch_id, at, machine_id, signal, kind, previous,'
                    ' current, severity, note) VALUES (?,?,?,?,?,?,?,?,?)',
                    (batch_id, event.get('at'), _pick(event, 'machineId', 'machine_id'),
                     event.get('signal'), event.get('kind'),
                     _text(event.get('previous')), _text(event.get('current')),
                     event.get('severity'), event.get('note')))
        return {'duplicate': False, 'batchId': batch_id,
                'readings': len(readings), 'events': len(events)}

    def record_ping(self, client_id: str, remote: str = '') -> None:
        with self._conn() as con:
            con.execute('INSERT INTO pings (client_id, received_at, remote) VALUES (?,?,?)',
                        (client_id, now_iso(), remote))

    # ------------------------------------------------------------------ okuma
    def counts(self) -> dict:
        with self._conn() as con:
            one = lambda sql: con.execute(sql).fetchone()[0]  # noqa: E731
            return {
                'batches': one('SELECT COUNT(*) FROM batches'),
                'readings': one('SELECT COUNT(*) FROM readings'),
                'events': one('SELECT COUNT(*) FROM events'),
                'pings': one('SELECT COUNT(*) FROM pings'),
                'machines': one('SELECT COUNT(DISTINCT machine_id) FROM readings')
            }

    def summary(self) -> dict:
        counts = self.counts()
        with self._conn() as con:
            last = con.execute(
                'SELECT batch_id, received_at, adapter, reading_count, event_count, site_code'
                ' FROM batches ORDER BY id DESC LIMIT 1').fetchone()
            by_adapter = [dict(r) for r in con.execute(
                'SELECT COALESCE(adapter, "—") AS adapter, COUNT(*) AS batches,'
                ' SUM(reading_count) AS readings FROM batches GROUP BY adapter ORDER BY batches DESC')]
        counts['lastBatch'] = dict(last) if last else None
        counts['byAdapter'] = by_adapter
        counts['lastAt'] = last['received_at'] if last else ''
        return counts

    def batches(self, limit: int = 20) -> list[dict]:
        with self._conn() as con:
            rows = con.execute(
                'SELECT batch_id, client_id, site_code, plant_id, adapter, fallback, payload_at,'
                ' received_at, reading_count, event_count, signature_ok'
                ' FROM batches ORDER BY id DESC LIMIT ?', (max(1, min(200, int(limit))),)).fetchall()
            return [dict(r) for r in rows]

    def latest_readings(self, limit: int = 12) -> list[dict]:
        with self._conn() as con:
            rows = con.execute(
                'SELECT batch_id, at, machine_id, machine_name, tag_id, kind, signal,'
                ' value_num, value_text, unit, quality, source, adapter FROM readings'
                ' ORDER BY id DESC LIMIT ?', (max(1, min(200, int(limit))),)).fetchall()
            return [dict(r) for r in rows]

    def last_events(self, limit: int = 10) -> list[dict]:
        with self._conn() as con:
            rows = con.execute(
                'SELECT batch_id, at, machine_id, signal, kind, previous, current, severity, note'
                ' FROM events ORDER BY id DESC LIMIT ?', (max(1, min(200, int(limit))),)).fetchall()
            return [dict(r) for r in rows]

    def close(self):
        pass


def _text(value):
    return None if value is None else str(value)
