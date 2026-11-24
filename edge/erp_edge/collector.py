"""Tarama döngüsü: oku → SQL'e yaz → durum/eşik olayı üret → ERP kuyruğuna al.

İlkeler (docs/04, docs/08, docs/09, docs/12, docs/13):
  * PLC verisi hiçbir zaman doğrudan stok, maliyet veya muhasebe kaydı yazmaz.
  * ERP'ye giden yalnızca `signalStates`, telemetri ve eşik olayı taslağıdır.
  * Dört sinyal kuralı korunur; sıcaklık gibi ölçümler ayrı `telemetry` alanındadır.
  * Silme yok: kuyruk ve okumalar korunur, `client_id` ile çift yazım engellenir.
"""
from __future__ import annotations

import hashlib
import json
import threading
import time
import uuid
from datetime import datetime, timezone

from . import FOUR_SIGNALS, SCHEMA_VERSION
from .adapters import DriverNotInstalled, resolve_adapter
from .config import Config, load_profile
from .db import EdgeDB, now_iso

SIGNAL_KINDS = set(FOUR_SIGNALS)


def build_site(profile: dict, cfg: Config) -> dict:
    """Fabrika profilinden makine ve tag listesini üretir; sabit makine kimliği yoktur."""
    machines = []
    for m in profile.get('machines', []):
        if m.get('decommissionedAt') or m.get('active') is False:
            continue  # docs/12: devre dışı makineden veri alınmaz, geçmiş korunur
        machines.append({
            'id': m['id'], 'name': m.get('name', m['id']),
            'type': m.get('type'), 'plant_id': m.get('plantId') or cfg.data.get('plantId') or profile.get('plant', {}).get('id')
        })
    plant_id = cfg.data.get('plantId') or profile.get('plant', {}).get('id') or ''
    tags_by_machine: dict[str, list[dict]] = {}
    for t in profile.get('plcTags', []):
        if t.get('machineId') and t.get('signal') in SIGNAL_KINDS:
            tags_by_machine.setdefault(t['machineId'], []).append({
                'id': t.get('id', ''), 'signal': t['signal'], 'address': t.get('address'),
                'label': t.get('label', t['signal'])
            })
    # Profilde tag eksikse her makine için dört sinyal taslağı tamamlanır (docs/08 §5.2).
    # Dört sinyal kuralı: hiçbir makinede eksik sinyal bırakılmaz.
    for m in machines:
        existing = tags_by_machine.get(m['id'], [])
        present = {t['signal'] for t in existing}
        for sig in FOUR_SIGNALS:
            if sig not in present:
                existing.append({
                    'id': f"AUTO-{m['id']}-{sig}", 'signal': sig,
                    'address': f"ns=2;s={m['id']}.{sig}", 'label': f"{m['name']} · {sig}",
                    'auto': True
                })
        tags_by_machine[m['id']] = existing
    telemetry_by_type: dict[str, list[dict]] = {}
    for tpl in cfg.data.get('telemetryProfiles', []):
        telemetry_by_type.setdefault(tpl['type'], []).append(tpl)
    return {'plant_id': plant_id, 'machines': machines, 'tags_by_machine': tags_by_machine,
            'telemetry_by_type': telemetry_by_type,
            'profile_name': profile.get('plant', {}).get('name', 'Profil yok')}


def threshold_band(value: float | None, tpl: dict) -> str:
    if value is None:
        return 'unknown'
    if tpl.get('criticalAt') is not None and value >= float(tpl['criticalAt']):
        return 'critical'
    if tpl.get('warnAt') is not None and value >= float(tpl['warnAt']):
        return 'warn'
    if tpl.get('nominalMin') is not None and value < float(tpl['nominalMin']):
        return 'low'
    return 'normal'


class Collector:
    def __init__(self, cfg: Config, db: EdgeDB):
        self.cfg = cfg
        self.db = db
        self.site = build_site(load_profile(cfg), cfg)
        self.running = False
        self.paused = False
        self.thread: threading.Thread | None = None
        self.cycle = 0
        self.last_run: dict = {}
        self.last_error: str = ''
        self.fallback: str | None = None
        self.lock = threading.RLock()

    def reload(self) -> None:
        self.cfg = type(self.cfg)(self.cfg.data, self.cfg.base_dir, self.cfg.path)
        self.site = build_site(load_profile(self.cfg), self.cfg)

    def tag_count(self) -> int:
        total = 0
        for m in self.site['machines']:
            total += len(self.site['tags_by_machine'].get(m['id'], []))
            total += len(self.site['telemetry_by_type'].get(m['type'], []))
        return total

    def run_once(self, dry_run: bool = False) -> dict:
        started = time.time()
        self.cycle += 1
        errors: list[str] = []
        cfg_data = self.cfg.data
        adapter, fallback = resolve_adapter(cfg_data)
        self.fallback = fallback
        if fallback:
            self.db.log('warn', 'ADAPTER', fallback)
        # Adaptör her döngüde yeniden kurulur; sayaç collector'dan taşınır ki
        # sinyal değerleri döngüyle birlikte değişsin (STATE_CHANGE üretilebilsin).
        # `simulation` adaptörü profil makine listesine ihtiyaç duyar; site her
        # bağlantıda bağlanır (sabit makine kimliği yok).
        adapter.cycle = self.cycle
        adapter.configure(cfg_data)
        adapter.bind_site(self.site)
        try:
            adapter.connect()
        except DriverNotInstalled as exc:
            errors.append(str(exc))
            adapter, fallback = resolve_adapter({**cfg_data, 'adapter': 'simulated'})
            self.fallback = (fallback or '') + ' | ' + str(exc)
            self.db.log('warn', 'ADAPTER', self.fallback)
            adapter.cycle = self.cycle
            adapter.configure(cfg_data)
            adapter.bind_site(self.site)
            adapter.connect()
        except Exception as exc:
            # Simülasyon kapalıysa üretim durmaz: simulated / MANUAL yedeği.
            detail = f'{type(exc).__name__}: {exc}'
            errors.append(detail)
            adapter, _ = resolve_adapter({**cfg_data, 'adapter': 'simulated'})
            self.fallback = f'{detail} → simulated / MANUAL yedeği'
            self.db.log('warn', 'ADAPTER', self.fallback)
            adapter.cycle = self.cycle
            adapter.configure(cfg_data)
            adapter.bind_site(self.site)
            adapter.connect()

        at = now_iso()
        stamp = int(time.time() // max(1, int(cfg_data.get('pollSeconds') or 3)))
        readings: list[dict] = []
        events: list[dict] = []

        for m in self.site['machines']:
            mid, mtype = m['id'], m['type']
            tags = self.site['tags_by_machine'].get(mid, [])
            templates = self.site['telemetry_by_type'].get(mtype, [])

            # 1) Dört sinyal
            for row in adapter.readFourSignals(mid, tags):
                previous = None if dry_run else self.db.last_value(mid, row['signal'])
                item = {
                    'client_id': f"{mid}:{row['tag_id']}:{stamp}", 'at': at,
                    'plant_id': self.site['plant_id'], 'machine_id': mid, 'machine_name': m['name'],
                    'tag_id': row['tag_id'], 'kind': 'signal', 'signal': row['signal'],
                    'value_num': row.get('value_num'), 'value_text': row.get('value_text'),
                    'unit': row.get('unit'), 'quality': row['quality'], 'source': row['source'],
                    'adapter': adapter.code, 'raw': row.get('raw')
                }
                readings.append(item)
                if not dry_run:
                    self.db.insert_reading(item)
                if previous is not None and previous != item['value_text']:
                    severity = 'danger' if row['signal'] == 'alarm' and item['value_text'] == 'fault' else 'info'
                    events.append(self._event(mid, row['signal'], 'STATE_CHANGE', previous,
                                              item['value_text'], severity,
                                              'Dört sinyalden biri değişti; ERP signalStates taslağı'))

            # 2) Telemetri (sıcaklık vb.)
            for row in adapter.readTelemetry(mid, templates):
                tpl = next((t for t in templates if t['signal'] == row['signal']), {})
                previous = None if dry_run else self.db.last_value(mid, row['signal'])
                item = {
                    'client_id': f"{mid}:{row['tag_id']}:{stamp}", 'at': at,
                    'plant_id': self.site['plant_id'], 'machine_id': mid, 'machine_name': m['name'],
                    'tag_id': row['tag_id'], 'kind': 'telemetry', 'signal': row['signal'],
                    'value_num': row.get('value_num'), 'value_text': row.get('value_text'),
                    'unit': row.get('unit'), 'quality': row['quality'], 'source': row['source'],
                    'adapter': adapter.code,
                    'raw': {'address': row.get('address'), 'thresholds': row.get('thresholds')}
                }
                readings.append(item)
                if not dry_run:
                    self.db.insert_reading(item)
                prev_band = threshold_band(_to_float(previous), tpl)
                band = threshold_band(row.get('value_num'), tpl)
                # Banda giriş olduğu gibi bandan çıkış da kaydedilir; geçmiş
                # raporlarda "kritik ne zaman normale döndü" sorusu yanıtlanır.
                if previous is not None and prev_band != band:
                    severity = 'danger' if 'critical' in (prev_band, band) else ('warn' if 'warn' in (prev_band, band) else 'info')
                    events.append(self._event(mid, row['signal'], 'THRESHOLD', prev_band, band,
                                              severity,
                                              f"{row.get('label', row['signal'])} eşik geçişi: {row.get('value_num')} {row.get('unit')}"))

        for ev in events:
            if not dry_run:
                self.db.insert_event(ev)

        # 3) ERP'ye gönderilecek batch (hiçbir işletme tablosuna doğrudan yazılmaz)
        batch_id = f"B-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        payload = {
            'kind': 'edge-batch', 'schemaVersion': SCHEMA_VERSION,
            'siteCode': cfg_data.get('siteCode'), 'plantId': self.site['plant_id'],
            'batchId': batch_id, 'clientId': f'EDGE-{batch_id}', 'at': at,
            'adapter': adapter.code, 'fallback': self.fallback,
            'profile': self.site['profile_name'],
            'readings': [{k: v for k, v in r.items() if k != 'client_id'} for r in readings],
            'events': [{'at': e['at'], 'machineId': e['machine_id'], 'signal': e['signal'],
                        'kind': e['kind'], 'previous': e['previous'], 'current': e['current'],
                        'severity': e['severity'], 'note': e['note']} for e in events],
            'counts': {'machines': len(self.site['machines']), 'readings': len(readings), 'events': len(events)}
        }
        if not dry_run and cfg_data.get('erp', {}).get('enabled', True):
            self.db.enqueue(batch_id, cfg_data['erp']['url'], payload)

        duration_ms = int((time.time() - started) * 1000)
        if not dry_run:
            self.db.record_run(duration_ms, self.tag_count(), len(readings), len(events),
                               adapter.code, False, errors)
            self.db.log('info', 'COLLECTOR',
                        f'Döngü #{self.cycle}: {len(readings)} okuma, {len(events)} olay, {duration_ms} ms')
        try:
            adapter.disconnect()
        except Exception:
            pass

        summary = {
            'cycle': self.cycle, 'at': at, 'durationMs': duration_ms,
            'adapter': adapter.code, 'fallback': self.fallback,
            'machines': len(self.site['machines']), 'tags': self.tag_count(),
            'readings': len(readings), 'events': len(events),
            'batchId': batch_id, 'errors': errors, 'dryRun': dry_run,
            'preview': readings[:6]
        }
        with self.lock:
            self.last_run = summary
            self.last_error = errors[0] if errors else ''
        return summary

    def _event(self, mid: str, signal: str, kind: str, previous, current, severity: str, note: str) -> dict:
        stamp = int(time.time() // max(1, int(self.cfg.data.get('pollSeconds') or 3)))
        return {
            'client_id': f'EV-{mid}:{signal}:{kind}:{stamp}:{previous}:{current}',
            'at': now_iso(), 'plant_id': self.site['plant_id'], 'machine_id': mid,
            'signal': signal, 'kind': kind,
            'previous': str(previous) if previous is not None else None,
            'current': str(current) if current is not None else None,
            'severity': severity, 'note': note
        }

    def start(self) -> None:
        if self.running:
            return
        self.running = True
        self.paused = False
        self.thread = threading.Thread(target=self._loop, name='edge-collector', daemon=True)
        self.thread.start()
        self.db.log('info', 'COLLECTOR', 'Tarama döngüsü başlatıldı')

    def stop(self) -> None:
        self.running = False
        self.db.log('info', 'COLLECTOR', 'Tarama döngüsü durduruldu')

    def _loop(self) -> None:
        while self.running:
            if not self.paused:
                try:
                    self.run_once()
                except Exception as exc:  # döngü tek bir hatayla ölmez
                    with self.lock:
                        self.last_error = str(exc)
                    self.db.log('error', 'COLLECTOR', f'Döngü hatası: {exc}')
            interval = max(1, int(self.cfg.data.get('pollSeconds') or 3))
            for _ in range(interval * 4):
                if not self.running:
                    break
                time.sleep(0.25)

    def status(self) -> dict:
        with self.lock:
            return {
                'running': self.running, 'paused': self.paused,
                'cycle': self.cycle, 'lastRun': self.last_run,
                'lastError': self.last_error, 'fallback': self.fallback,
                'tagCount': self.tag_count(), 'machineCount': len(self.site['machines']),
                'plantId': self.site['plant_id'], 'profile': self.site['profile_name']
            }


def _to_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def dump_profile(cfg: Config) -> dict:
    """Arayüzdeki 'Profil' sekmesi için özet."""
    profile = load_profile(cfg)
    site = build_site(profile, cfg)
    return {
        'plant': profile.get('plant'), 'profilePath': str(cfg.profile_path),
        'machineTypes': profile.get('machineTypes'),
        'machines': site['machines'],
        'tagCount': sum(len(v) for v in site['tags_by_machine'].values()),
        'telemetryProfiles': cfg.data.get('telemetryProfiles'),
        'valid': bool(site['machines'])
    }
