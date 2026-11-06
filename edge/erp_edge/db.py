"""Yerel SQL veritabanı (SQLite, WAL).

Gerçek saha bilgisayarında diske yazılan **doğruluk kaynağı** budur. ERP'ye
gönderilemeyen kayıtlar silinmez; `outbox` kuyruğunda bekler. Tüm yazımlar
`client_id` ile idempotenttir, böylece ajan yeniden başlatıldığında veya aynı
okuma iki kez geldiğinde çift satır oluşmaz.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS readings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT NOT NULL UNIQUE,
  at            TEXT NOT NULL,
  plant_id      TEXT,
  machine_id    TEXT NOT NULL,
  machine_name  TEXT,
  tag_id        TEXT NOT NULL,
  kind          TEXT NOT NULL,           -- 'signal' | 'telemetry'
  signal        TEXT NOT NULL,           -- door/casting/alarm/running veya ölçüm adı
  value_num     REAL,
  value_text    TEXT,
  unit          TEXT,
  quality       TEXT NOT NULL,           -- GOOD | SIMULATED | STALE | BAD
  source        TEXT NOT NULL,           -- adaptör kodu veya MANUAL
  adapter       TEXT NOT NULL,
  raw           TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_readings_at ON readings(at DESC);
CREATE INDEX IF NOT EXISTS ix_readings_machine ON readings(machine_id, signal, at DESC);

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT NOT NULL UNIQUE,
  at            TEXT NOT NULL,
  plant_id      TEXT,
  machine_id    TEXT NOT NULL,
  signal        TEXT NOT NULL,
  kind          TEXT NOT NULL,           -- STATE_CHANGE | THRESHOLD | DRIVER_FALLBACK
  previous      TEXT,
  current       TEXT,
  severity      TEXT NOT NULL,           -- info | warn | danger
  note          TEXT,
  erp_posted    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_events_at ON events(at DESC);

CREATE TABLE IF NOT EXISTS outbox (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id       TEXT NOT NULL UNIQUE,
  batch_id        TEXT NOT NULL,
  endpoint        TEXT NOT NULL,
  payload_json    TEXT NOT NULL,
  status          TEXT NOT NULL,         -- queued | sending | sent | failed | dead
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  last_error      TEXT,
  created_at      TEXT NOT NULL,
  sent_at         TEXT
);
CREATE INDEX IF NOT EXISTS ix_outbox_status ON outbox(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  at           TEXT NOT NULL,
  duration_ms  INTEGER NOT NULL,
  tag_count    INTEGER NOT NULL,
  reading_count INTEGER NOT NULL,
  event_count  INTEGER NOT NULL,
  adapter      TEXT NOT NULL,
  dry_run      INTEGER NOT NULL DEFAULT 0,
  errors       TEXT
);

CREATE TABLE IF NOT EXISTS app_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  at      TEXT NOT NULL,
  level   TEXT NOT NULL,
  source  TEXT NOT NULL,
  message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_log_at ON app_log(at DESC);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')


class EdgeDB:
    def __init__(self, path: Path, dry_run: bool = False):
        self.path = Path(path)
        self.dry_run = dry_run
        self._lock = threading.RLock()
        self.conn = None
        if not dry_run:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.conn = sqlite3.connect(str(self.path), check_same_thread=False, timeout=10)
            self.conn.row_factory = sqlite3.Row
            self.conn.execute('PRAGMA journal_mode=WAL')
            self.conn.execute('PRAGMA synchronous=NORMAL')
            self.conn.execute('PRAGMA foreign_keys=ON')
            self.conn.executescript(SCHEMA)
            self.conn.commit()

    def close(self) -> None:
        with self._lock:
            if self.conn:
                self.conn.close()
                self.conn = None

    def log(self, level: str, source: str, message: str) -> None:
        if self.dry_run or not self.conn:
            return
        with self._lock:
            self.conn.execute('INSERT INTO app_log(at, level, source, message) VALUES (?,?,?,?)',
                              (now_iso(), level, source, message[:500]))
            self.conn.commit()

    def insert_reading(self, row: dict) -> bool:
        if self.dry_run or not self.conn:
            return True
        with self._lock:
            cur = self.conn.execute(
                """INSERT OR IGNORE INTO readings
                   (client_id, at, plant_id, machine_id, machine_name, tag_id, kind, signal,
                    value_num, value_text, unit, quality, source, adapter, raw, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (row['client_id'], row['at'], row.get('plant_id'), row['machine_id'],
                 row.get('machine_name'), row['tag_id'], row['kind'], row['signal'],
                 row.get('value_num'), row.get('value_text'), row.get('unit'), row['quality'],
                 row['source'], row['adapter'], json.dumps(row.get('raw'), ensure_ascii=False)
                 if row.get('raw') is not None else None, now_iso()))
            self.conn.commit()
            return cur.rowcount > 0

    def last_value(self, machine_id: str, signal: str) -> str | None:
        if self.dry_run or not self.conn:
            return None
        with self._lock:
            r = self.conn.execute(
                """SELECT COALESCE(value_text, CAST(value_num AS TEXT)) AS v FROM readings
                   WHERE machine_id=? AND signal=? ORDER BY id DESC LIMIT 1""",
                (machine_id, signal)).fetchone()
            return r['v'] if r else None

    def insert_event(self, row: dict) -> bool:
        if self.dry_run or not self.conn:
            return True
        with self._lock:
            cur = self.conn.execute(
                """INSERT OR IGNORE INTO events
                   (client_id, at, plant_id, machine_id, signal, kind, previous, current, severity, note)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (row['client_id'], now_iso(), row.get('plant_id'), row['machine_id'],
                 row['signal'], row['kind'], row.get('previous'), row.get('current'),
                 row['severity'], row.get('note')))
            self.conn.commit()
            return cur.rowcount > 0

    def enqueue(self, batch_id: str, endpoint: str, payload: dict) -> bool:
        if self.dry_run or not self.conn:
            return True
        with self._lock:
            cur = self.conn.execute(
                """INSERT OR IGNORE INTO outbox
                   (client_id, batch_id, endpoint, payload_json, status, attempts,
                    next_attempt_at, created_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (f'EDGE-{batch_id}', batch_id, endpoint,
                 json.dumps(payload, ensure_ascii=False), 'queued', 0, now_iso(), now_iso()))
            self.conn.commit()
            return cur.rowcount > 0

    def pending_outbox(self, limit: int = 50) -> list[dict]:
        if self.dry_run or not self.conn:
            return []
        with self._lock:
            rows = self.conn.execute(
                """SELECT * FROM outbox WHERE status IN ('queued','failed')
                   AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
                   ORDER BY id LIMIT ?""", (now_iso(), limit)).fetchall()
            return [dict(r) for r in rows]

    def mark_outbox(self, row_id: int, status: str, error: str = '', attempts: int = 0) -> None:
        if self.dry_run or not self.conn:
            return
        delay = min(300, 2 ** min(attempts, 8))
        next_at = (datetime.now(timezone.utc).astimezone() + timedelta(seconds=delay)).isoformat(timespec='seconds')
        with self._lock:
            self.conn.execute(
                """UPDATE outbox SET status=?, attempts=?, next_attempt_at=?, last_error=?,
                   sent_at=CASE WHEN ?='sent' THEN ? ELSE sent_at END WHERE id=?""",
                (status, attempts, None if status == 'sent' else next_at, error[:300],
                 status, now_iso(), row_id))
            self.conn.commit()

    def record_run(self, duration_ms: int, tag_count: int, reading_count: int,
                   event_count: int, adapter: str, dry_run: bool, errors: list[str]) -> None:
        if self.dry_run or not self.conn:
            return
        with self._lock:
            self.conn.execute(
                """INSERT INTO runs(at,duration_ms,tag_count,reading_count,event_count,adapter,dry_run,errors)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (now_iso(), duration_ms, tag_count, reading_count, event_count,
                 adapter, 1 if dry_run else 0, json.dumps(errors, ensure_ascii=False)))
            self.conn.commit()

    def counts(self) -> dict:
        if self.dry_run or not self.conn:
            return {'readings': 0, 'events': 0, 'queued': 0, 'sent': 0, 'dead': 0, 'runs': 0}
        with self._lock:
            q = lambda sql: self.conn.execute(sql).fetchone()[0]
            return {
                'readings': q('SELECT COUNT(*) FROM readings'),
                'events': q('SELECT COUNT(*) FROM events'),
                'queued': q("SELECT COUNT(*) FROM outbox WHERE status IN ('queued','failed')"),
                'sent': q("SELECT COUNT(*) FROM outbox WHERE status='sent'"),
                'dead': q("SELECT COUNT(*) FROM outbox WHERE status='dead'"),
                'runs': q('SELECT COUNT(*) FROM runs')
            }

    def rows(self, table: str, limit: int = 40) -> list[dict]:
        allowed = {'readings', 'events', 'outbox', 'runs', 'app_log'}
        if table not in allowed or self.dry_run or not self.conn:
            return []
        with self._lock:
            order = 'at DESC' if table in ('events', 'runs', 'app_log') else 'id DESC'
            if table == 'readings':
                order = 'id DESC'
            if table == 'outbox':
                order = 'id DESC'
            if table == 'app_log':
                order = 'id DESC'
            return [dict(r) for r in self.conn.execute(f'SELECT * FROM {table} ORDER BY {order} LIMIT ?', (limit,))]

    def latest_readings(self) -> list[dict]:
        if self.dry_run or not self.conn:
            return []
        with self._lock:
            return [dict(r) for r in self.conn.execute(
                """SELECT r.* FROM readings r JOIN (
                     SELECT machine_id, tag_id, MAX(id) AS mid FROM readings GROUP BY machine_id, tag_id
                   ) x ON x.mid = r.id ORDER BY r.machine_id, r.tag_id""")]

    def purge(self, retention_days: int) -> int:
        if self.dry_run or not self.conn:
            return 0
        cutoff = (datetime.now(timezone.utc).astimezone() - timedelta(days=max(1, retention_days))).isoformat(timespec='seconds')
        with self._lock:
            cur = self.conn.execute('DELETE FROM readings WHERE at < ?', (cutoff,))
            self.conn.execute('DELETE FROM app_log WHERE at < ?', (cutoff,))
            self.conn.commit()
            return cur.rowcount

    def schema_info(self) -> list[dict]:
        if self.dry_run or not self.conn:
            return []
        with self._lock:
            out = []
            for (name,) in self.conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
                cols = [dict(r) for r in self.conn.execute(f'PRAGMA table_info({name})')]
                count = self.conn.execute(f'SELECT COUNT(*) FROM {name}').fetchone()[0]
                out.append({'table': name, 'columns': [c['name'] for c in cols], 'rows': count})
            return out


def log_lines(db: EdgeDB, limit: int = 80) -> list[dict]:
    return db.rows('app_log', limit)


def utc_stamp() -> str:
    return str(int(time.time() * 1000))
