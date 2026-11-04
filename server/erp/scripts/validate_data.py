#!/usr/bin/env python3
"""JSON arşivinin referans bütünlüğünü doğrular.

Kontroller:
  - manifest.json ve beklenen koleksiyon dosyalarının varlığı,
  - her kaydın `id` alanı ve benzersizliği,
  - malzeme / tedarikçi / ocak / reçete / emir / döküm kodu referansları,
  - mal kabul ve kırıcı hesaplarının (kabul+red=gelen, brüt-fire=net) tutarlılığı,
  - lots.stage değerlerinin manifestteki aşama listesinde olması,
  - stok bakiyesi ile hareket toplamı farkı (bilgilendirici uyarı — demo snapshot),
  - ticari/finansal katman: borç = alacak, KDV tutarları, cari/fatura referansları,
    maliyet kalemleri toplamı, sayım farkı ve dönem kapanışı (docs/11).

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
    'notifications', 'outbox', 'users', 'activity',
    # Saha görüşmesiyle eklenen koleksiyonlar (docs/05 Bölüm 1, schemaVersion 2)
    'plants', 'machine-types', 'machines', 'casting-paths', 'plc-connections', 'plc-tags',
    'signal-states', 'homogenization-recipes', 'homogenization-batches', 'cooling-batches',
    'oil-rules', 'blade-rules', 'maintenance-events', 'by-product-fates', 'events',
    'inbox-queue', 'vendor-updates',
    # Genel ERP karşılaştırmasıyla eklenen ticari / finansal katman (docs/11, schemaVersion 3)
    'accounts', 'customers', 'quotations', 'sales-orders', 'purchase-requests',
    'purchase-quotes', 'invoices', 'journal-entries', 'payments', 'warehouses',
    'stock-counts', 'reservations', 'cost-records', 'employees', 'shifts',
    'budgets', 'period-closures', 'integration-rules'
]

SIGNALS = {'door', 'casting', 'alarm', 'running'}
FATES = {'remelt', 'recycle', 'sale', 'waste', 'product'}
QUEUE_STATES = {'pending', 'processing', 'archived', 'dead', 'duplicate'}

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

    # ---------- Saha görüşmesi koleksiyonları (schemaVersion 2) ----------
    plants = ids(data['plants'])
    types = {t.get('code') for t in data['machine-types']}
    machines = ids(data['machines'])
    paths = ids(data['casting-paths'])
    plcs = ids(data['plc-connections'])
    recipes_h = ids(data['homogenization-recipes'])
    batches = ids(data['homogenization-batches'])

    for pl in data['plants']:
        if pl.get('mode') not in ('MANUAL', 'PLC'):
            errors.append(f'plants/{pl.get("id")}: geçersiz çalışma modu → {pl.get("mode")}')
    for m in data['machines']:
        ref('machines', m, 'plantId', plants, 'fabrika')
        ref('machines', m, 'plcId', plcs, 'PLC bağlantısı')
        if m.get('type') not in types:
            errors.append(f'machines/{m.get("id")}: makine tipi yok → {m.get("type")}')
        if m.get('mode') not in ('MANUAL', 'PLC'):
            errors.append(f'machines/{m.get("id")}: geçersiz mod → {m.get("mode")}')
        if float(m.get('capacityTon') or 0) < 0:
            errors.append(f'machines/{m.get("id")}: negatif kapasite')
    for cp in data['casting-paths']:
        ref('casting-paths', cp, 'plantId', plants, 'fabrika')
        ref('casting-paths', cp, 'fromMachineId', machines, 'kaynak ocak')
        ref('casting-paths', cp, 'tableId', machines, 'döküm tablası')
        if float(cp.get('holdTon') or 0) < 0:
            errors.append(f'casting-paths/{cp.get("id")}: negatif tutma miktarı')
    for c in data['plc-connections']:
        ref('plc-connections', c, 'plantId', plants, 'fabrika')
        if not c.get('ip'):
            errors.append(f'plc-connections/{c.get("id")}: IP adresi eksik')
        if int(c.get('port') or 0) <= 0:
            errors.append(f'plc-connections/{c.get("id")}: geçersiz port')
    tag_signals = set()
    for t in data['plc-tags']:
        ref('plc-tags', t, 'plcId', plcs, 'PLC bağlantısı')
        ref('plc-tags', t, 'machineId', machines, 'makine')
        tag_signals.add(t.get('signal'))
        if t.get('signal') not in SIGNALS:
            errors.append(f'plc-tags/{t.get("id")}: dört sinyal kuralı dışında → {t.get("signal")}')
        if not t.get('address'):
            errors.append(f'plc-tags/{t.get("id")}: PLC adresi boş')
    if tag_signals - SIGNALS:
        warnings.append('Dört sinyal kuralı dışında tag var: ' + ', '.join(sorted(tag_signals - SIGNALS)))
    for st in data['signal-states']:
        ref('signal-states', st, 'machineId', machines, 'makine')
        if st.get('signal') not in SIGNALS:
            errors.append(f'signal-states/{st.get("id")}: geçersiz sinyal → {st.get("signal")}')
    for hr in data['homogenization-recipes']:
        if int(hr.get('plannedMinutes') or 0) <= 0:
            errors.append(f'homogenization-recipes/{hr.get("id")}: planlanan süre sıfır')
    for b in data['homogenization-batches']:
        ref('homogenization-batches', b, 'machineId', machines, 'homojenizasyon fırını')
        ref('homogenization-batches', b, 'recipeId', recipes_h, 'homojenizasyon reçetesi')
        for l in b.get('lots', []):
            if l.get('lotId') not in lots:
                errors.append(f'homogenization-batches/{b.get("id")}: döküm kodu yok → {l.get("lotId")}')
        total = sum(int(x.get('count') or 0) for x in b.get('lots', []))
        if total != int(b.get('totalCount') or 0):
            errors.append(f'homogenization-batches/{b.get("id")}: adet toplamı {total} ≠ totalCount {b.get("totalCount")}')
        if b.get('endedAt') and b.get('actualMinutes') is not None:
            over = int(b['actualMinutes']) - int(b.get('plannedMinutes') or 0)
            if over > 0 and b.get('status') != 'Süre Aşımı':
                errors.append(f'homogenization-batches/{b.get("id")}: süre aşımı durumu işaretlenmemiş')
    for cb in data['cooling-batches']:
        ref('cooling-batches', cb, 'batchId', batches, 'homojenizasyon partisi')
    for oil in data['oil-rules']:
        ref('oil-rules', oil, 'machineId', machines, 'makine')
        if int(oil.get('cutsPerTank') or 0) <= 0:
            errors.append(f'oil-rules/{oil.get("id")}: kesim/dolum sıfır')
        if int(oil.get('warnAt') or 0) > int(oil.get('cutsPerTank') or 0):
            errors.append(f'oil-rules/{oil.get("id")}: uyarı eşiği tank kapasitesinden büyük')
    for bl in data['blade-rules']:
        ref('blade-rules', bl, 'machineId', machines, 'makine')
        if int(bl.get('maxCuts') or 0) <= 0:
            errors.append(f'blade-rules/{bl.get("id")}: bıçak ömrü sıfır')
        if int(bl.get('warnAt') or 0) > int(bl.get('maxCuts') or 0):
            errors.append(f'blade-rules/{bl.get("id")}: uyarı eşiği ömürden büyük')
    for me in data['maintenance-events']:
        ref('maintenance-events', me, 'machineId', machines, 'makine')
    for bf in data['by-product-fates']:
        ref('by-product-fates', bf, 'materialId', mats, 'malzeme')
        if bf.get('fate') not in FATES:
            errors.append(f'by-product-fates/{bf.get("id")}: geçersiz akıbet → {bf.get("fate")}')

    # Olay günlüğü: lot bazında bakiye sürekliliği (docs/09)
    by_lot = defaultdict(list)
    for ev in data['events']:
        lid = ev.get('lotId')
        if lid != '—' and lid not in lots:
            errors.append(f'events/{ev.get("id")}: döküm kodu yok → {lid}')
        if ev.get('fate') and ev['fate'] not in FATES:
            errors.append(f'events/{ev.get("id")}: geçersiz akıbet → {ev.get("fate")}')
        by_lot[lid].append(ev)
    for lid, rows in by_lot.items():
        rows.sort(key=lambda e: int(e.get('seq') or 0))
        prev = 0.0
        for ev in rows:
            expected = round(prev + float(ev.get('deltaTon') or 0), 4)
            actual = round(float(ev.get('balanceTon') or 0), 4)
            if abs(expected - actual) > 0.001:
                errors.append(f'events/{ev.get("id")} ({lid}): bakiye {actual} ≠ beklenen {expected}')
            prev = actual
    for q in data['inbox-queue']:
        if q.get('status') not in QUEUE_STATES:
            errors.append(f'inbox-queue/{q.get("id")}: geçersiz kuyruk durumu → {q.get("status")}')
        if not q.get('clientId'):
            errors.append(f'inbox-queue/{q.get("id")}: clientId eksik (idempotency)')
    for vu in data['vendor-updates']:
        ref('vendor-updates', vu, 'plantId', plants, 'fabrika')


    # ---------- Genel ERP karşılaştırması: ticari / finansal katman (docs/11) ----------
    accounts = ids(data['accounts'])
    customers = ids(data['customers'])
    sales_orders = ids(data['sales-orders'])
    requests = ids(data['purchase-requests'])
    invoices = ids(data['invoices'])
    journals = ids(data['journal-entries'])
    warehouses = ids(data['warehouses'])
    shifts = ids(data['shifts'])
    users = ids(data['users'])
    cost_ids = ids(data['cost-records'])

    acct_codes = [a.get('code') for a in data['accounts'] if isinstance(a, dict)]
    if len(acct_codes) != len(set(acct_codes)):
        errors.append('accounts: yinelenen hesap kodu var')

    for c in data['customers']:
        if float(c.get('creditLimit') or 0) < 0 or float(c.get('balance') or 0) < 0:
            errors.append(f'customers/{c.get("id")}: negatif limit veya bakiye')
        if float(c.get('balance') or 0) > float(c.get('creditLimit') or 0):
            errors.append(f'customers/{c.get("id")}: cari bakiye kredi limitini aşıyor')

    for q in data['quotations']:
        ref('quotations', q, 'customerId', customers, 'müşteri')
        ref('quotations', q, 'salesOrderId', sales_orders, 'satış siparişi')
        if q.get('status') not in ('Bekliyor', 'Onaylandı', 'Kaybedildi'):
            errors.append(f'quotations/{q.get("id")}: geçersiz teklif durumu → {q.get("status")}')

    for o in data['sales-orders']:
        ref('sales-orders', o, 'customerId', customers, 'müşteri')
        ref('sales-orders', o, 'quotationId', {x.get('id') for x in data['quotations']}, 'teklif')
        if float(o.get('shippedTon') or 0) > float(o.get('ton') or 0) + 0.001:
            errors.append(f'sales-orders/{o.get("id")}: sevk edilen ton sipariş tonunu aşıyor')
        if float(o.get('unitPrice') or 0) <= 0:
            errors.append(f'sales-orders/{o.get("id")}: birim fiyat eksik')

    for r in data['purchase-requests']:
        ref('purchase-requests', r, 'materialId', mats, 'malzeme')
        ref('purchase-requests', r, 'orderId', orders, 'satın alma emri')
        if float(r.get('quantity') or 0) <= 0:
            errors.append(f'purchase-requests/{r.get("id")}: miktar sıfır/negatif')
    for q in data['purchase-quotes']:
        ref('purchase-quotes', q, 'requestId', requests, 'talep')
        ref('purchase-quotes', q, 'supplierId', sups, 'tedarikçi')
        if q.get('status') not in ('Bekliyor', 'Seçildi', 'Reddedildi'):
            errors.append(f'purchase-quotes/{q.get("id")}: geçersiz teklif durumu → {q.get("status")}')
    for req in data['purchase-requests']:
        selected = [q for q in data['purchase-quotes'] if q.get('requestId') == req.get('id') and q.get('status') == 'Seçildi']
        if len(selected) > 1:
            errors.append(f'purchase-requests/{req.get("id")}: birden fazla teklif seçilmiş')

    invoice_status = {'Bekliyor', 'Kısmi', 'Ödendi', 'İptal'}
    for inv in data['invoices']:
        if inv.get('direction') not in ('Satış', 'Alış'):
            errors.append(f'invoices/{inv.get("id")}: geçersiz yön → {inv.get("direction")}')
        party = customers if inv.get('partyType') == 'customer' else sups
        ref('invoices', inv, 'partyId', party, 'cari taraf')
        net = float(inv.get('net') or 0)
        vat = float(inv.get('vat') or 0)
        gross = float(inv.get('gross') or 0)
        expected_vat = round(net * float(inv.get('vatRate') or 0) / 100, 2)
        if abs(vat - expected_vat) > 0.01:
            errors.append(f'invoices/{inv.get("id")}: KDV {vat} ≠ beklenen {expected_vat}')
        if abs(net + vat - gross) > 0.01:
            errors.append(f'invoices/{inv.get("id")}: net + KDV ≠ brüt')
        if inv.get('status') not in invoice_status:
            errors.append(f'invoices/{inv.get("id")}: geçersiz fatura durumu → {inv.get("status")}')

    seen_clients = set()
    for je in data['journal-entries']:
        lines = je.get('lines') or []
        debit = round(sum(float(l.get('debit') or 0) for l in lines), 2)
        credit = round(sum(float(l.get('credit') or 0) for l in lines), 2)
        if abs(debit - credit) > 0.01 or debit <= 0:
            errors.append(f'journal-entries/{je.get("id")}: borç {debit} ≠ alacak {credit}')
        if abs(debit - float(je.get('totalDebit') or 0)) > 0.01 or abs(credit - float(je.get('totalCredit') or 0)) > 0.01:
            errors.append(f'journal-entries/{je.get("id")}: kayıtlı toplamlar satırlarla uyuşmuyor')
        if je.get('balanced') is not True:
            errors.append(f'journal-entries/{je.get("id")}: balanced alanı true olmalı')
        cid = je.get('clientId')
        if not cid:
            errors.append(f'journal-entries/{je.get("id")}: clientId eksik (idempotency)')
        elif cid in seen_clients:
            errors.append(f'journal-entries/{je.get("id")}: yinelenen clientId → {cid}')
        else:
            seen_clients.add(cid)
        for l in lines:
            if l.get('accountId') not in accounts:
                errors.append(f'journal-entries/{je.get("id")}: hesap yok → {l.get("accountId")}')

    for pay in data['payments']:
        party = customers if pay.get('partyType') == 'customer' else sups
        ref('payments', pay, 'partyId', party, 'cari taraf')
        ref('payments', pay, 'journalId', journals, 'muhasebe fişi')
        ref('payments', pay, 'invoiceId', invoices, 'fatura')
        if float(pay.get('amount') or 0) <= 0:
            errors.append(f'payments/{pay.get("id")}: tutar sıfır/negatif')

    for w in data['warehouses']:
        ref('warehouses', w, 'plantId', plants, 'fabrika')
        if float(w.get('capacityTon') or 0) < 0:
            errors.append(f'warehouses/{w.get("id")}: negatif kapasite')
    for rsv in data['reservations']:
        ref('reservations', rsv, 'salesOrderId', sales_orders, 'satış siparişi')
        ref('reservations', rsv, 'warehouseId', warehouses, 'depo')
        if rsv.get('lotId') not in lots | {'—'}:
            errors.append(f'reservations/{rsv.get("id")}: döküm kodu yok → {rsv.get("lotId")}')
    for sc in data['stock-counts']:
        ref('stock-counts', sc, 'warehouseId', warehouses, 'depo')
        ref('stock-counts', sc, 'materialId', mats, 'malzeme')
        ref('stock-counts', sc, 'journalId', journals, 'muhasebe fişi')
        diff = float(sc.get('countedKg') or 0) - float(sc.get('expectedKg') or 0)
        if abs(diff - float(sc.get('differenceKg') or 0)) > 0.001:
            errors.append(f'stock-counts/{sc.get("id")}: sayılan − beklenen ≠ fark')

    for cr in data['cost-records']:
        ref('cost-records', cr, 'lotId', lots, 'döküm kodu')
        parts = sum(float(cr.get(k) or 0) for k in ('materialCost', 'energyCost', 'consumableCost', 'laborCost', 'scrapCost'))
        if abs(parts - float(cr.get('totalCost') or 0)) > 0.01:
            errors.append(f'cost-records/{cr.get("id")}: maliyet kalemleri toplamı ≠ totalCost')
        net_ton = float(cr.get('netTon') or 0)
        if net_ton <= 0:
            errors.append(f'cost-records/{cr.get("id")}: net ton sıfır/negatif')
        elif abs(parts / net_ton - float(cr.get('unitCostPerTon') or 0)) > 0.01:
            errors.append(f'cost-records/{cr.get("id")}: birim maliyet (₺/ton) tutarsız')

    for emp in data['employees']:
        ref('employees', emp, 'userId', users, 'kullanıcı')
        ref('employees', emp, 'shiftId', shifts, 'vardiya')
    for sh in data['shifts']:
        ref('shifts', sh, 'supervisorId', users, 'vardiya sorumlusu')
        for uid in sh.get('operatorIds') or []:
            if uid not in users:
                errors.append(f'shifts/{sh.get("id")}: operatör kullanıcısı yok → {uid}')
        # Gece vardiyası 22:00–06:00 gibi günü aşabilir; bu meşrudur.
        crosses_midnight = sh.get('start', '') >= '18:00' and sh.get('end', '') <= '08:00'
        if sh.get('start') >= sh.get('end') and not crosses_midnight:
            errors.append(f'shifts/{sh.get("id")}: başlangıç bitişten sonra (gece vardiyası değil)')

    for b in data['budgets']:
        if float(b.get('planned') or 0) <= 0 or float(b.get('actual') or 0) < 0:
            errors.append(f'budgets/{b.get("id")}: planlanan/gerçekleşen tutar geçersiz')
    periods = [pc.get('period') for pc in data['period-closures']]
    if len(periods) != len(set(periods)):
        errors.append('period-closures: yinelenen dönem')
    for pc in data['period-closures']:
        if pc.get('status') not in ('Açık', 'Kontrol Edildi', 'Kapatıldı'):
            errors.append(f'period-closures/{pc.get("id")}: geçersiz durum → {pc.get("status")}')
        if pc.get('status') == 'Kapatıldı' and pc.get('trialBalanceOk') is not True:
            errors.append(f'period-closures/{pc.get("id")}: mizan doğrulanmadan dönem kapatılmış')
    for rule in data['integration-rules']:
        if not rule.get('produces'):
            errors.append(f'integration-rules/{rule.get("id")}: üretilen kayıt listesi boş')
        if not isinstance(rule.get('autoPost'), bool) or not isinstance(rule.get('requiresApproval'), bool):
            errors.append(f'integration-rules/{rule.get("id")}: otomatik/onay alanı boolean değil')

    for key in ('vatRate', 'currentPeriod', 'costingMethod', 'defaultWarehouseId', 'approvalLimitPurchase'):
        if isinstance(settings, dict) and key not in settings:
            errors.append(f'settings: {key} alanı eksik (schemaVersion 3)')

    print(f'  ✓ {len(data["accounts"])} hesap · {len(data["journal-entries"])} muhasebe fişi · '
          f'{len(data["invoices"])} fatura · {len(data["cost-records"])} maliyet kaydı · '
          f'{len(data["integration-rules"])} entegrasyon kuralı')
    print(f'  ✓ Mizan: borç = alacak · {len(seen_clients)} benzersiz clientId · '
          f'{len(data["warehouses"])} depo · {len(data["shifts"])} vardiya')

    print(f'  ✓ {len(data["machines"])} makine · {len(data["casting-paths"])} döküm yolu · '
          f'{len(data["events"])} olay · {len(data["inbox-queue"])} kuyruk kaydı · '
          f'{len(data["plc-tags"])} PLC tag')

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
