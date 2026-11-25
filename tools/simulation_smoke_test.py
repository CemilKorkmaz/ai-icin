#!/usr/bin/env python3
"""Simülasyon çekirdeği duman testi — FastAPI, ağ veya tarayıcı gerektirmez.

Kullanım: python3 tools/simulation_smoke_test.py

Kapsar: emir girdi doğrulama, termal çevrim ve otomatik tamamlanma, sensör/kapı/
brülör senaryoları, sıfırlamada iptal, iş akışı testlerinin kayıt üretmemesi,
olay günlüğü limitleri ve SQLite katmanının sütun beyaz listesi.
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIM_ROOT = ROOT / 'Simulasyon' / 'erp-simulasyon-denemesi-main'
sys.path.insert(0, str(SIM_ROOT))

from erp_backend.database import Database  # noqa: E402
from simulator.furnace import FurnaceParams  # noqa: E402
from simulator.plant import Plant  # noqa: E402


def make_plant() -> Plant:
    plant = Plant()
    plant.add_furnace(FurnaceParams(
        name='Eritme', furnace_type='ERITME', target_temp=750.0, max_temp=850.0,
        heat_rate=2.5, cool_rate=0.03, hold_band=5.0, gas_consumption_full=120.0,
    ))
    plant.add_furnace(FurnaceParams(
        name='Homojen', furnace_type='HOMOJENIZASYON', target_temp=560.0, max_temp=620.0,
        heat_rate=1.2, cool_rate=0.03, hold_band=4.0, gas_consumption_full=80.0,
    ))
    return plant


def step_until(plant: Plant, predicate, *, dt: float = 5.0, max_steps: int = 1000):
    for _ in range(max_steps):
        plant.update(dt)
        if predicate():
            return True
    return False


class PlantTests(unittest.TestCase):
    def test_gecersiz_emir_reddedilir(self):
        plant = make_plant()
        cases = [
            {'product': '', 'furnace': 'Eritme', 'target_temp': 700, 'duration_min': 10},
            {'product': 'Test', 'furnace': 'Yok', 'target_temp': 700, 'duration_min': 10},
            {'product': 'Test', 'furnace': 'Eritme', 'target_temp': 0, 'duration_min': 10},
            {'product': 'Test', 'furnace': 'Eritme', 'target_temp': 1300, 'duration_min': 10},
            {'product': 'Test', 'furnace': 'Eritme', 'target_temp': 700, 'duration_min': 0},
            {'product': 'Test', 'furnace': 'Eritme', 'target_temp': 700, 'duration_min': 2000},
        ]
        for case in cases:
            with self.subTest(case=case), self.assertRaises(ValueError):
                plant.create_order(**case)
        self.assertEqual(plant.get_orders(), [])

    def test_cevrim_tamamlanir(self):
        plant = make_plant()
        order_id = plant.create_order('6061 biyet', 'Eritme', 750, 1)
        self.assertTrue(plant.start_order(order_id, 'Eritme'))
        self.assertTrue(step_until(plant, lambda: plant.get_order(order_id)['state'] == 'COMPLETED'))
        order = plant.get_order(order_id)
        self.assertEqual(order['state'], 'COMPLETED')
        self.assertGreater(order['energy_total_m3'], 0)
        self.assertGreaterEqual(order['cycle_time_s'], 60)
        self.assertIsNone(plant.get_furnace('Eritme').order_id)
        self.assertTrue(any(e['type'] == 'order_completed' for e in plant.events))

    def test_mesgul_firin_ikinci_emri_reddeder(self):
        plant = make_plant()
        first = plant.create_order('A', 'Eritme', 750, 10)
        second = plant.create_order('B', 'Eritme', 750, 10)
        self.assertTrue(plant.start_order(first, 'Eritme'))
        self.assertFalse(plant.start_order(second, 'Eritme'))

    def test_sensor_arizasi_okumayi_dondurur(self):
        plant = make_plant()
        before = plant.get_states()['Eritme']
        result = plant.apply_scenario('Eritme', 'sensor_failure')
        self.assertEqual(result['event']['data']['quality'], 'BAD')
        plant.update(5)
        after = plant.get_states()['Eritme']
        self.assertFalse(after['sensor_ok'])
        self.assertEqual(after['status'], 'ALARM')
        self.assertEqual(after['temperature'], before['temperature'])
        self.assertFalse(after['burner_on'])

    def test_kapi_ve_brulor_alarmi_sifirlanana_kadar_surer(self):
        for scenario in ('door_open', 'burner_failure'):
            with self.subTest(scenario=scenario):
                plant = make_plant()
                plant.apply_scenario('Eritme', scenario)
                for _ in range(5):
                    plant.update(5)
                self.assertEqual(plant.get_states()['Eritme']['status'], 'ALARM')
                plant.apply_scenario('Eritme', 'reset')
                plant.update(1)
                self.assertEqual(plant.get_states()['Eritme']['status'], 'KAPALI')

    def test_asiri_isinma_alarmi_kendiliginden_temizlenir(self):
        plant = make_plant()
        plant.apply_scenario('Eritme', 'overheat')
        self.assertEqual(plant.get_states()['Eritme']['status'], 'ALARM')
        plant.update(120)
        plant.update(120)
        self.assertEqual(plant.get_states()['Eritme']['status'], 'KAPALI')
        self.assertIsNone(plant.get_states()['Eritme']['alarm'])

    def test_sifirlama_calisan_emri_iptal_eder(self):
        plant = make_plant()
        order_id = plant.create_order('A', 'Eritme', 750, 30)
        plant.start_order(order_id, 'Eritme')
        result = plant.apply_scenario('Eritme', 'reset')
        self.assertEqual(result.get('cancelledOrders'), [order_id])
        self.assertEqual(plant.get_order(order_id)['state'], 'CANCELLED')
        self.assertIsNone(plant.get_furnace('Eritme').order_id)

    def test_is_akisi_testi_kayit_uretmez(self):
        plant = make_plant()
        before = plant.get_states()
        result = plant.apply_business_event('stock_critical')
        data = result['event']['data']
        self.assertTrue(data['test'])
        self.assertFalse(data['createsRecord'])
        self.assertEqual(plant.get_orders(), [])
        self.assertEqual(plant.get_states(), before)

    def test_olay_limiti_ve_bilinmeyen_senaryo(self):
        plant = make_plant()
        for _ in range(5):
            plant.apply_business_event('quality_reject')
        latest = plant.latest_event_id()
        self.assertEqual(len(plant.events_since(0, 2)), 2)
        self.assertEqual([e['id'] for e in plant.events_since(latest - 2, 5)], [latest - 1, latest])
        with self.assertRaises(ValueError):
            plant.apply_scenario('Eritme', 'bilinmeyen')


class DatabaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Database(str(Path(self.tmp.name) / 'test.db'))

    def tearDown(self):
        self.db.conn.close()
        self.tmp.cleanup()

    def test_emir_alanlari_beyaz_liste(self):
        self.db.add_order('WO-1', 'A', 'Eritme', 750, 10, 'CREATED', 1.0)
        self.db.update_order('WO-1', state='RUNNING', started_at=2.0)
        self.assertEqual(self.db.get_orders()[0]['state'], 'RUNNING')
        with self.assertRaises(ValueError):
            self.db.update_order('WO-1', **{'state = ?; DROP TABLE production_orders; --': 'x'})

    def test_okuma_limiti_sinirlanir(self):
        for i in range(5):
            self.db.add_reading('Eritme', 100 + i, 700, 'ISINIYOR', True, 10, 1, 1, None)
        self.assertEqual(len(self.db.get_readings('Eritme', 0)), 1)
        self.assertEqual(len(self.db.get_readings('Eritme', 999999)), 5)


if __name__ == '__main__':
    print('Simülasyon çekirdeği — duman testi\n')
    suite = unittest.TestLoader().loadTestsFromTestCase(PlantTests)
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(DatabaseTests))
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    print('\nSonuç:', 'TÜM TESTLER GEÇTİ' if result.wasSuccessful()
          else f'{len(result.failures) + len(result.errors)} HATA')
    sys.exit(0 if result.wasSuccessful() else 1)
