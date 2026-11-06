"""Yapılandırma: tek JSON dosyası, arayüzden de düzenlenir.

Sabit fabrika / makine kimliği yoktur. Makine listesi ve dört sinyalin tag
adresleri docs/12'deki fabrika profil paketinden okunur; sıcaklık gibi ölçümler
makine *tipine* bağlı şablonlardan üretilir.
"""
from __future__ import annotations

import copy
import json
import os
import sys
from pathlib import Path

DEFAULT_CONFIG = {
    "siteCode": "FIRM1",
    "siteName": "Anadolu Alüminyum · Saha Bilgisayarı",
    "plantId": "",
    "profilePath": "config/ornek-fabrika-profili.json",
    "sqlPath": "data/edge.db",
    "pollSeconds": 3,
    "retentionDays": 90,
    "adapter": "simulated",
    "connection": {
        "name": "Fırın hattı PLC",
        "ip": "192.168.1.50",
        "protocol": "OPC UA",
        "port": 4840,
        "mode": "PLC"
    },
    "erp": {
        "url": "http://127.0.0.1:8080/api/edge/ingest",
        "token": "",
        "secret": "degistirin-bu-gizli-anahtari",
        "timeoutSeconds": 5,
        "batchSize": 50,
        "maxRetries": 6,
        "enabled": True
    },
    "ui": {
        "host": "127.0.0.1",
        "port": 8787,
        "openBrowser": True
    },
    # ERP tarafındaki dört sinyal kuralı korunur; ölçümler ayrı `telemetry`
    # kategorisidir ve makine tipine bağlı şablonlarla üretilir.
    "telemetryProfiles": [
        {
            "type": "FURNACE", "signal": "temperatureC", "label": "Ocak İçi Sıcaklık",
            "unit": "°C", "addressPattern": "ns=2;s={machineId}.Temp",
            "nominalMin": 680, "nominalMax": 780, "warnAt": 790, "criticalAt": 820,
            "simBase": 735, "simSpan": 58, "note": "Ergitme ocağı; eşik sahada doğrulanacak"
        },
        {
            "type": "HOMO_FURNACE", "signal": "chamberTempC", "label": "Homojen Fırın Sıcaklığı",
            "unit": "°C", "addressPattern": "ns=2;s={machineId}.ChamberTemp",
            "nominalMin": 550, "nominalMax": 590, "warnAt": 595, "criticalAt": 605,
            "simBase": 575, "simSpan": 8, "note": "575 °C / 8 saat reçetesiyle uyumlu (docs/07)"
        },
        {
            "type": "SAW", "signal": "oilTempC", "label": "Kesme Yağı Sıcaklığı",
            "unit": "°C", "addressPattern": "ns=2;s={machineId}.OilTemp",
            "nominalMin": 20, "nominalMax": 55, "warnAt": 60, "criticalAt": 70,
            "simBase": 42, "simSpan": 6, "note": "Yağ ömrü sayacıyla ilişkili telemetri"
        }
    ]
}


def deep_merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out


class Config:
    def __init__(self, data: dict, base_dir: Path, path: Path):
        self.data = data
        self.base_dir = base_dir
        self.path = path

    def path_of(self, key: str) -> Path:
        raw = self.data.get(key, '')
        p = Path(raw)
        return p if p.is_absolute() else (self.base_dir / p)

    @property
    def sql_path(self) -> Path:
        return self.path_of('sqlPath')

    @property
    def profile_path(self) -> Path:
        return self.path_of('profilePath')

    def public(self) -> dict:
        """Arayüze gönderilen yapılandırma (gizli anahtar maskelenir)."""
        out = copy.deepcopy(self.data)
        if out.get('erp', {}).get('secret'):
            out['erp']['secret'] = '••••••••'
        if out.get('erp', {}).get('token'):
            out['erp']['token'] = '••••••••'
        return out

    def save(self, incoming: dict) -> dict:
        """Kısmi güncelleme; maskeli gizli alanlar korunur."""
        merged = deep_merge(self.data, incoming)
        for field in ('secret', 'token'):
            value = (incoming.get('erp') or {}).get(field)
            if not value or set(str(value)) == {'•'}:
                merged['erp'][field] = self.data['erp'].get(field, '')
        for key in ('pollSeconds', 'retentionDays'):
            merged[key] = max(1, int(merged.get(key) or 1))
        merged['erp']['timeoutSeconds'] = max(1, int(merged['erp'].get('timeoutSeconds') or 5))
        merged['erp']['batchSize'] = max(1, int(merged['erp'].get('batchSize') or 50))
        self.data = merged
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        return self.public()


def app_base_dir() -> Path:
    """Kaynak çalıştırmada `edge/`, frozen .exe'de exe'nin yanı.

    PyInstaller tek-dosya modunda `__file__` geçici `_MEIPASS` klasörünü
    gösterir. SQL ve düzenlenebilir config orada kalırsa exe her kapanışta
    verisini kaybeder; bu yüzden frozen modda `sys.executable` esas alınır.
    """
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def load_config(path: str | os.PathLike | None = None) -> Config:
    base = app_base_dir()
    cfg_path = Path(path).resolve() if path else (base / 'config' / 'edge-config.json')
    raw = {}
    if cfg_path.exists():
        try:
            raw = json.loads(cfg_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as exc:
            raise ValueError(f'edge-config.json geçersiz JSON: {exc}') from exc
    return Config(deep_merge(DEFAULT_CONFIG, raw), base, cfg_path)


def load_profile(cfg: Config) -> dict:
    """docs/12 fabrika profil paketini okur; yoksa boş park döner."""
    p = cfg.profile_path
    if not p.exists():
        return {'plant': None, 'machines': [], 'plcTags': [], 'machineTypes': []}
    try:
        data = json.loads(p.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return {'plant': None, 'machines': [], 'plcTags': [], 'machineTypes': []}
    payload = data.get('payload', data)
    return {
        'plant': payload.get('plant') or {},
        'machines': payload.get('machines') or [],
        'plcTags': payload.get('plcTags') or [],
        'machineTypes': payload.get('machineTypes') or []
    }
