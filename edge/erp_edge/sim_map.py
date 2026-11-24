"""Simülasyon fırın adları ile ERP makine kimlikleri arasında eşleme.

Kullanıcı simülasyonu (erp_backend / erp_simulation) fırınları adla yayınlar:
"Aluminyum Eritme Fırını", "Homojenizasyon Fırını", "Yaşlandırma Fırını" gibi.
ERP tarafında makine kimliği profilden gelir (MCH-01, MCH-10 …); sabit kod yoktur.

Bu modül saftır (dosya, ağ veya DOM okumaz) ve iki yerde aynı kuralla çalışır:

* `server/sim_bridge` — arayüzdeki eşleme tablosu ve `/api/sim/live`
* `edge/erp_edge/adapters.py` — saha ajanının `simulation` adaptörü

Sıra: açık eşleme (`furnaceMap`) → ada göre otomatik kural → eşleşmedi.
Eşleşmeyen fırın verisi ERP'ye yazılmaz; arayüzde uyarı olarak görünür.
"""
from __future__ import annotations

import re

TR_MAP = str.maketrans('çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU')

# Ada göre makine tipi tercihi. Sıra önemlidir: "yaşlandırma" kuralı
# "eritme" kuralından sonra gelir, çünkü ikisi de fırın tipidir.
KEYWORD_RULES = (
    (('eritme', 'ergitme', 'melting', 'smelter', 'ocak'), ('FURNACE',)),
    (('homojen', 'homogen'), ('HOMO_FURNACE', 'CONT_HOMO')),
    (('yaslandir', 'aging', 'temper'), ('FURNACE', 'HOMO_FURNACE')),
    (('testere', 'saw', 'kesim'), ('SAW',)),
    (('tabla', 'cast', 'dokum'), ('CAST_TABLE',)),
)


def normalize(value) -> str:
    """Türkçe karakterleri sadeleştirip yalnızca harf/rakam bırakır."""
    text = str(value or '').translate(TR_MAP).lower()
    return re.sub(r'[^a-z0-9]+', '', text)


def preferred_types(name: str) -> tuple[str, ...]:
    key = normalize(name)
    for keywords, types in KEYWORD_RULES:
        if any(word in key for word in keywords):
            return types
    return ()


def furnace_key(furnace) -> str:
    """Simülasyon yanıtı sözlük veya nesne olabilir; adı güvenle çıkarır."""
    if isinstance(furnace, str):
        return furnace
    if isinstance(furnace, dict):
        for field in ('name', 'ad', 'furnace', 'firin', 'fırın'):
            if furnace.get(field):
                return str(furnace[field])
    return ''


def build_map(machines: list[dict], furnaces, explicit: dict | None = None,
              auto: bool = True) -> dict:
    """Fırın → makine eşlemesini üretir.

    `explicit` iki yönde de kabul edilir: {fırın adı: makine kimliği} veya
    {makine kimliği: fırın adı}. Haritada olmayan fırınlar için `auto=True`
    ise ada göre kural uygulanır; hiçbir zaman rastgele makine seçilmez.
    """
    rows = [m for m in (machines or []) if m and m.get('id')]
    by_id = {m['id']: m for m in rows}
    names = [furnace_key(f) for f in (furnaces or [])]
    names = [n for n in names if n]

    pairs: list[dict] = []
    unmatched: list[dict] = []
    notes: list[str] = []
    used: set[str] = set()
    assigned: dict[str, str] = {}

    for key, value in (explicit or {}).items():
        if not key or not value:
            continue
        if value in by_id:
            assigned[str(key)] = value
        elif key in by_id:
            assigned[str(value)] = key
        else:
            notes.append(f'Eşlemede bilinmeyen makine: {value}')

    for name in names:
        machine_id = assigned.get(name)
        source = 'config'
        if not machine_id:
            # Açık eşleme normalize edilmiş adla da bulunabilsin.
            for key, value in assigned.items():
                if normalize(key) == normalize(name):
                    machine_id, source = value, 'config'
                    break
        if machine_id and machine_id in by_id:
            if machine_id in used:
                notes.append(f'{name}: {machine_id} başka fırına atanmış')
                unmatched.append({'furnace': name, 'reason': 'Makine başka fırında kullanılıyor'})
                continue
            machine = by_id[machine_id]
            used.add(machine_id)
            pairs.append(_pair(name, machine, source))
            continue

        if not auto:
            unmatched.append({'furnace': name, 'reason': 'Otomatik eşleme kapalı'})
            continue

        types = preferred_types(name)
        if not types:
            unmatched.append({'furnace': name, 'reason': 'Ada göre makine tipi tanınmadı'})
            continue
        candidate = next((m for t in types for m in rows
                          if m.get('type') == t and m['id'] not in used), None)
        if not candidate:
            unmatched.append({'furnace': name,
                              'reason': f'{"/".join(types)} tipinde boş makine kalmadı'})
            continue
        used.add(candidate['id'])
        pairs.append(_pair(name, candidate, 'auto'))

    unused = [{'machineId': m['id'], 'machineName': m.get('name', m['id']),
               'machineType': m.get('type')} for m in rows if m['id'] not in used]

    return {
        'pairs': pairs, 'unmatched': unmatched, 'unusedMachines': unused,
        'notes': notes, 'autoMap': bool(auto),
        'matched': len(pairs), 'furnaces': len(names)
    }


def _pair(furnace: str, machine: dict, source: str) -> dict:
    return {
        'furnace': furnace, 'machineId': machine['id'],
        'machineName': machine.get('name', machine['id']),
        'machineType': machine.get('type'), 'source': source
    }


def machine_for_furnace(mapping: dict, furnace: str) -> str | None:
    key = normalize(furnace)
    for pair in (mapping or {}).get('pairs', []):
        if normalize(pair.get('furnace')) == key:
            return pair.get('machineId')
    return None
