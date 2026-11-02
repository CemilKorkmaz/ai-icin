#!/usr/bin/env python3
"""JSON arşivinin referans bütünlüğünü doğrular.

Kontroller:
  - manifest.json ve beklenen koleksiyon dosyalarının varlığı,
  - her kaydın `id` alanı ve benzersizliği,
  - malzeme / tedarikçi / ocak / reçete / emir / döküm kodu referansları,
  - mal kabul ve kırıcı hesaplarının (kabul+red=gelen, brüt-fire=net) tutarlılığı,
  - lots.stage değerlerinin manifestteki aşama listesinde olması,
  - stok bakiyesi ile hareket toplamı farkı (bilgilendirici uyarı — demo snapshot).

Kullanım: python3 server/erp/scripts/validate_data.py
"""
from __future__ import annotations

import json
import os
import sys
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data')

COLLECTIONS = [
    'units', 'categories', 'materials', 'suppliers', 'purchase-orders', 'price-history',
    'receipts', 'crusher', 'movements', 'furnaces', 'recipes', 'lots', 'shipments',
    'notifications', 'outbox', 'users', 'activity'
]

errors: list[str] = []
warnings: list[str] = []


def load(name: str):
    path = os.path.join(DATA, name + '.json')
    if not os.path.exists(path):
        errors.append(f'{name}.json bulunamadı')
        return []
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except json.JSONDecodeError as exc:
        errors.append(f'{name}.json geçersiz JSON: {exc}')
        return []


def ids(rows) -> set:
    return {r.get('id') for r in rows if isinstance(r, dict) and r.get('id')}


def check_unique(name: str, rows) -> None:
    seen = set()
    for r in rows:
        if not isinstance(r, dict):
            continue  # units.json gibi basit değer dizileri
        rid = r.get('id')
        if not rid:
            errors.append(f'{name}: id olmayan kayıt var')
            continue
        if rid in seen:
            errors.append(f'{name}: yinelenen id → {rid}')
        seen.add(rid)


def main() -> int:
    manifest = load('manifest')
    if not isinstance(manifest, dict):
        errors.append('manifest.json bir nesne olmalı')
        manifest = {}
    stages = set(manifest.get('stages', []))

    data = {name: load(name) for name in COLLECTIONS}
    settings = load('settings')
    if not isinstance(settings, dict):
        errors.append('settings.json bir nesne olmalı')

    for name, rows in data.items():
        if not isinstance(rows, list):
            errors.append(f'{name}.json bir dizi olmalı')
            continue
        check_unique(name, rows)

    mats = ids(data['materials'])
    sups = ids(data['suppliers'])
    fur = ids(data['furnaces'])
    rec = ids(data['recipes'])
    lots = ids(data['lots'])
    orders = ids(data['purchase-orders'])
    receipts = ids(data['receipts'])

    def ref(name, row, field, valid, label):
        val = row.get(field)
        if val and val not in valid:
            errors.append(f'{name}/{row.get("id")}: {label} referansı bulunamadı → {val}')

    for o in data['purchase-orders']:
        ref('purchase-orders', o, 'supplierId', sups, 'tedarikçi')
        for i in o.get('items', []):
            if i.get('materialId') not in mats:
                errors.append(f'purchase-orders/{o.get("id")}: malzeme yok → {i.get("materialId")}')
    for p in data['price-history']:
        ref('price-history', p, 'materialId', mats, 'malzeme')
        ref('price-history', p, 'supplierId', sups, 'tedarikçi')
    for r in data['receipts']:
        ref('receipts', r, 'orderId', orders, 'emir')
        ref('receipts', r, 'supplierId', sups, 'tedarikçi')
        for i in r.get('items', []):
            if i.get('materialId') not in mats:
                errors.append(f'receipts/{r.get("id")}: malzeme yok → {i.get("materialId")}')
            if abs(i.get('acceptedQty', 0) + i.get('rejectedQty', 0) - i.get('receivedQty', 0)) > 0.001:
                errors.append(f'receipts/{r.get("id")}: kabul + red ≠ gelen')
    for c in data['crusher']:
        ref('crusher', c, 'materialId', mats, 'malzeme')
        ref('crusher', c, 'sourceReceiptId', receipts, 'mal kabul')
        if abs(c.get('gross', 0) - c.get('waste', 0) - c.get('net', 0)) > 0.001:
            errors.append(f'crusher/{c.get("id")}: brüt − fire ≠ net')
    for m in data['movements']:
        ref('movements', m, 'materialId', mats, 'malzeme')
    for r in data['recipes']:
        if r.get('furnaceId') and r['furnaceId'] not in fur:
            errors.append(f'recipes/{r.get("id")}: ocak yok → {r.get("furnaceId")}')
        for i in r.get('items', []):
            if i.get('materialId') not in mats:
                errors.append(f'recipes/{r.get("id")}: malzeme yok → {i.get("materialId")}')
        for s in r.get('steps', []):
            if s.get('materialId') and s['materialId'] not in mats:
                errors.append(f'recipes/{r.get("id")}/step: malzeme yok → {s.get("materialId")}')
    for l in data['lots']:
        ref('lots', l, 'furnaceId', fur, 'ocak')
        ref('lots', l, 'recipeId', rec, 'reçete')
        if stages and l.get('stage') not in stages:
            errors.append(f'lots/{l.get("id")}: geçersiz aşama → {l.get("stage")}')
    for s in data['shipments']:
        for lid in s.get('lotIds', []):
            if lid not in lots:
                errors.append(f'shipments/{s.get("id")}: döküm kodu yok → {lid}')
        if s.get('materialId') and s['materialId'] not in mats:
            errors.append(f'shipments/{s.get("id")}: malzeme yok → {s.get("materialId")}')

    # Bilgilendirici: hareket toplamı ile anlık stok fotoğrafı farkı
    totals = defaultdict(float)
    for m in data['movements']:
        totals[m.get('materialId')] += float(m.get('quantity') or 0)
    mismatched = 0
    for mat in data['materials']:
        delta = abs(totals.get(mat['id'], 0) - float(mat.get('stock') or 0))
        if delta > 1:
            mismatched += 1
    if mismatched:
        warnings.append(
            f'{mismatched} malzemede hareket toplamı ile stok fotoğrafı farklı: demo verisi yalnızca son '
            'hareketleri içerir; gerçek kurulumda bakiye tüm hareketlerden türetilir.'
        )

    print(f'Koleksiyon: {len(COLLECTIONS)} · manifest schema_version: {manifest.get("schema_version")}')
    for w in warnings[:8]:
        print('  UYARI:', w)
    if len(warnings) > 8:
        print(f'  … {len(warnings) - 8} uyarı daha')
    for e in errors:
        print('  HATA:', e)
    print(f'\nSonuç: {len(errors)} hata, {len(warnings)} uyarı')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
