"""Sanal fabrika: birden fazla fırını, üretim emirlerini ve ERP test olaylarını yönetir."""
from __future__ import annotations

import time
from datetime import datetime
from typing import Optional

from simulator.furnace import Furnace, FurnaceParams, FurnaceStatus
from simulator.scenarios import BUSINESS_BY_ID, BUSINESS_EVENT_DEFS, SCENARIO_BY_ID, SCENARIO_DEFS


class Plant:
    """Tüm sanal ekipmanları, üretim emrini ve senaryo olaylarını barındırır.

    `events` ERP köprüsünün okuduğu olay günlüğüdür. Kimlikler artan tam sayıdır;
    ERP `after=<son görülen id>` ile yalnızca yeni olayları alır. Günlük 300
    kayıtla sınırlıdır, böylece uzun test oturumunda bellek büyümez.
    """

    MAX_EVENTS = 300

    def __init__(self) -> None:
        self.furnaces: dict[str, Furnace] = {}
        self.orders: dict[str, dict] = {}
        self.events: list[dict] = []
        self._order_counter = 0
        self._event_seq = 0

    # ------------------------------------------------------------------ ekipman

    def add_furnace(self, params: FurnaceParams) -> None:
        self.furnaces[params.name] = Furnace(params)

    def get_states(self) -> dict[str, dict]:
        return {name: f.to_dict() for name, f in self.furnaces.items()}

    def get_furnace(self, name: str) -> Optional[Furnace]:
        return self.furnaces.get(name)

    def free_furnaces(self) -> list[str]:
        """Emri atanmamış, arızasız ve alarmda olmayan fırınlar."""
        return [
            name for name, f in self.furnaces.items()
            if f.order_id is None and f.state.status != FurnaceStatus.ALARM
            and f.state.sensor_ok and not f.state.door_open and not f.state.burner_fault
        ]

    # --------------------------------------------------------------- emirler

    def create_order(self, product: str, furnace: str, target_temp: float,
                     duration_min: float) -> str:
        # Girdi doğrulaması API katmanından bağımsız olarak burada da yapılır;
        # böylece Plant'i doğrudan kullanan testler/araçlar geçersiz emir üretemez.
        product = (product or "").strip()
        if not product or len(product) > 120:
            raise ValueError("Ürün adı 1-120 karakter olmalı")
        if furnace not in self.furnaces:
            raise ValueError(f"Fırın bulunamadı: {furnace}")
        try:
            target_temp = float(target_temp)
            duration_min = float(duration_min)
        except (TypeError, ValueError) as exc:
            raise ValueError("Hedef sıcaklık ve süre sayısal olmalı") from exc
        if not (0.0 < target_temp <= 1200.0):
            raise ValueError("Hedef sıcaklık 0-1200 °C aralığında olmalı")
        if not (0.0 < duration_min <= 1440.0):
            raise ValueError("Süre 0-1440 dakika aralığında olmalı")
        today = time.strftime("%Y%m%d")
        self._order_counter += 1
        order_id = f"WO-{today}-{self._order_counter:04d}"
        now = time.time()
        self.orders[order_id] = {
            "id": order_id,
            "product": product,
            "furnace": furnace,
            "target_temp": target_temp,
            "duration_min": duration_min,
            "state": "CREATED",   # CREATED / RUNNING / COMPLETED / CANCELLED
            "created_at": now,
            "started_at": None,
            "finished_at": None,
        }
        self._log(
            "order_created", furnace=furnace, severity="info", module="production",
            title="Üretim emri oluşturuldu",
            message=f"{order_id} · {product} · hedef {target_temp:.0f} °C · {duration_min:g} dk",
            code="ORDER_CREATED", data={"orderId": order_id, "product": product},
        )
        return order_id

    def start_order(self, order_id: str, furnace: str) -> bool:
        order = self.orders.get(order_id)
        furnace_obj = self.furnaces.get(furnace)
        if not order or not furnace_obj:
            return False
        if order["state"] != "CREATED":
            return False
        if furnace_obj.order_id is not None:
            return False  # fırın zaten meşgul
        state = furnace_obj.state
        if not state.sensor_ok or state.door_open or state.burner_fault or state.status == FurnaceStatus.ALARM:
            return False  # arızalı fırında çevrim başlatılmaz
        now = time.time()
        order["state"] = "RUNNING"
        order["started_at"] = now
        order["furnace"] = furnace
        furnace_obj.start_order(
            order_id=order_id,
            product=order["product"],
            target_temp=order["target_temp"],
            duration_min=order["duration_min"],
            now=now,
        )
        self._log(
            "order_started", furnace=furnace, severity="info", module="production",
            title="Üretim emri başlatıldı",
            message=f"{order_id} · {order['product']} · {furnace} ısınmaya başladı.",
            code="ORDER_STARTED", data={"orderId": order_id},
        )
        return True

    def get_orders(self) -> list[dict]:
        return sorted(self.orders.values(), key=lambda o: o["created_at"],
                      reverse=True)

    def get_order(self, order_id: str) -> Optional[dict]:
        return self.orders.get(order_id)

    # ------------------------------------------------------------------ olaylar

    def _log(self, event_type: str, *, furnace: str | None = None,
             severity: str = "info", module: str = "plc", title: str = "",
             message: str = "", code: str = "", data: dict | None = None) -> dict:
        self._event_seq += 1
        event = {
            "id": self._event_seq,
            "at": datetime.now().astimezone().isoformat(timespec="seconds"),
            "type": event_type,
            "severity": severity,
            "module": module,
            "title": title or event_type,
            "message": message,
            "code": code or event_type.upper(),
            "furnace": furnace,
            "data": data or {},
        }
        self.events.append(event)
        if len(self.events) > self.MAX_EVENTS:
            del self.events[:-self.MAX_EVENTS]
        return event

    def latest_event_id(self) -> int:
        return self._event_seq

    def events_since(self, after: int = 0, limit: int = 100) -> list[dict]:
        after = max(0, int(after or 0))
        limit = max(1, min(200, int(limit or 100)))
        return [e for e in self.events if int(e.get("id", 0)) > after][:limit]

    # ------------------------------------------------------------------ senaryolar

    def apply_scenario(self, furnace_name: str, scenario: str) -> dict:
        """Fırın arıza senaryosunu uygular ve ERP'ye gidecek olayı döndürür."""
        if scenario not in SCENARIO_BY_ID:
            raise ValueError(f"Bilinmeyen senaryo: {scenario}")
        furnace = self.furnaces.get(furnace_name)
        if furnace is None:
            raise ValueError(f"Fırın bulunamadı: {furnace_name}")
        definition = SCENARIO_BY_ID[scenario]
        s = furnace.state
        p = furnace.params
        cancelled_orders: list[str] = []

        if scenario == "sensor_failure":
            s.sensor_ok = False
            s.status = FurnaceStatus.ALARM
            s.burner_on = False
            s.fault_code = "SENSOR_FAULT"
            s.alarm = f"{p.name}: Sıcaklık sensörü yanıt vermiyor; okuma geçersiz (BAD)."
            message = "Sıcaklık sensörü arızalı; son geçerli sıcaklık korunuyor. Bakım ekibi kontrol etmeli."
        elif scenario == "overheat":
            s.temperature = max(s.temperature, p.max_temp + 20.0)
            s.status = FurnaceStatus.ALARM
            s.burner_on = False
            s.fault_code = "OVERHEAT"
            s.alarm = f"{p.name}: Aşırı sıcaklık! {s.temperature:.1f} °C > {p.max_temp:.0f} °C"
            message = f"Sıcaklık güvenlik sınırının üstünde: {s.temperature:.1f} °C. Brülör kapatıldı."
        elif scenario == "burner_failure":
            s.burner_fault = True
            s.status = FurnaceStatus.ALARM
            s.burner_on = False
            s.fault_code = "BURNER_FAULT"
            s.alarm = f"{p.name}: Brülör arızası; ısıtma yapılamıyor."
            message = "Brülör devre dışı. Sıcaklık hedefe ulaşamaz; bakım bildirimi açılmalı."
        elif scenario == "door_open":
            s.door_open = True
            s.status = FurnaceStatus.ALARM
            s.burner_on = False
            s.fault_code = "DOOR_OPEN"
            s.alarm = f"{p.name}: Kapı açık; güvenlik kilidi brülörü kapattı."
            message = "Kapı sinyali açık. Güvenlik gereği brülör kapalı; kapı kapatılmalı."
        elif scenario == "casting":
            s.casting = True
            s.door_open = False
            if s.sensor_ok and not s.burner_fault and s.status != FurnaceStatus.ALARM:
                s.status = FurnaceStatus.HOLDING
                s.soak_started_at = furnace.sim_time
                furnace._soak_started_sim = furnace.sim_time
                s.alarm = None
                s.fault_code = None
            message = "Döküm/devrilme sinyali etkin. Üretim akışı bu fırını döküm modunda görür."
        elif scenario == "reset":
            s.sensor_ok = True
            s.burner_fault = False
            s.door_open = False
            s.casting = False
            s.status = FurnaceStatus.OFF
            s.burner_on = False
            s.alarm = None
            s.fault_code = None
            s.temperature = p.ambient_temp
            s.target_temperature = p.target_temp
            s.cycle_time = 0.0
            s.soak_started_at = None
            if furnace.order_id:
                cancelled_orders.append(furnace.order_id)
                order = self.orders.get(furnace.order_id)
                if order and order.get("state") == "RUNNING":
                    order["state"] = "CANCELLED"
                    order["note"] = "Test senaryosu sıfırlandı"
                    order["finished_at"] = time.time()
                furnace.order_id = None
                furnace.order_product = None
                furnace.order_duration_s = 0.0
                furnace.soak_started_at = None
                furnace._soak_started_sim = None
            message = "Sensör, kapı, brülör ve alarm durumu temizlendi; fırın normale döndü."
        else:  # pragma: no cover - yukarıdaki kimliklerle kapsanır
            raise ValueError(f"Uygulanamayan senaryo: {scenario}")

        event = self._log(
            f"scenario_{scenario}", furnace=p.name, severity=definition["severity"],
            module=definition["module"], title=definition["title"],
            message=f"{p.name}: {message}", code=definition["id"].upper(),
            data={"scenario": scenario, "quality": "BAD" if not s.sensor_ok else "SIMULATED",
                  "state": furnace.to_dict()},
        )
        result = {"furnace": furnace.to_dict(), "event": event}
        if cancelled_orders:
            result["cancelledOrders"] = cancelled_orders
        return result

    def apply_business_event(self, scenario: str) -> dict:
        """ERP bildirim zinciri testi; işletme tablosu değiştirmez."""
        if scenario not in BUSINESS_BY_ID:
            raise ValueError(f"Bilinmeyen iş akışı testi: {scenario}")
        definition = BUSINESS_BY_ID[scenario]
        event = self._log(
            "business_test", severity=definition["severity"], module=definition["module"],
            title=definition["title"], message=definition["message"],
            code=definition["id"].upper(),
            data={"scenario": scenario, "test": True, "createsRecord": False},
        )
        return {"event": event}

    def scenario_catalog(self) -> dict:
        return {
            "scenarios": SCENARIO_DEFS,
            "business": BUSINESS_EVENT_DEFS,
            "furnaces": list(self.furnaces.keys()),
        }

    # ------------------------------------------------------------------ simülasyon

    def update(self, dt: float) -> list[dict]:
        """Tüm fırınları bir adım ilerletir; emir durumlarını senkronize eder."""
        events: list[dict] = []
        for furnace in self.furnaces.values():
            for event in furnace.update(dt):
                if event["type"] == "order_completed":
                    summary = event["summary"]
                    order = self.orders.get(summary["order_id"])
                    if order:
                        order["state"] = "COMPLETED"
                        order["finished_at"] = time.time()
                        order["energy_total_m3"] = summary["energy_total_m3"]
                        order["cycle_time_s"] = summary["cycle_time_s"]
                        self._log(
                            "order_completed", furnace=furnace.params.name,
                            severity="success", module="production",
                            title="Üretim emri tamamlandı",
                            message=f"{summary['order_id']} · {summary['product']} tamamlandı; çevrim {summary['cycle_time_s']:.0f} sn.",
                            code="ORDER_COMPLETED", data={"orderId": summary["order_id"]},
                        )
                elif event["type"] == "alarm":
                    self._log(
                        "alarm", furnace=furnace.params.name, severity="critical",
                        module="plc", title="Aşırı sıcaklık alarmı",
                        message=event.get("message") or "Güvenlik sınırı aşıldı.",
                        code="OVERHEAT", data={"temperature": event.get("temperature")},
                    )
                elif event["type"] == "alarm_cleared":
                    self._log(
                        "alarm_cleared", furnace=furnace.params.name, severity="success",
                        module="plc", title="Alarm temizlendi",
                        message=f"{furnace.params.name}: sıcaklık güvenli seviyeye indi.",
                        code="ALARM_CLEARED",
                    )
                elif event["type"] == "target_reached":
                    self._log(
                        "target_reached", furnace=furnace.params.name, severity="info",
                        module="production", title="Hedef sıcaklığa ulaşıldı",
                        message=f"{furnace.params.name}: {event.get('temperature', 0):.1f} °C; bekletme başladı.",
                        code="TARGET_REACHED",
                    )
                events.append(event)
        return events
