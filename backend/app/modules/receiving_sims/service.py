"""
Receiving SIM Management Service.
Controls FlexiTaka receiving phone numbers, shared pool inventory, and usage thresholds.
"""

from decimal import Decimal
import time
from typing import Any, Dict, List, Optional
from app.core.constants import OperatorCode, SimStatus, bdt_to_poisha, poisha_to_bdt
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.security import generate_sim_id
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.auth.service import normalize_bd_phone
from app.modules.operators.resolver import resolve_operator_from_msisdn


DEFAULT_INITIAL_SIMS = [
    {
        "operator_code": OperatorCode.GP,
        "mobile_number": "01711000001",
        "label": "GP Primary Receiving SIM #1",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 5000000,
        "reserved_balance": 0,
        "available_balance": 5000000,
        "daily_limit": 20000000,
        "monthly_limit": 500000000,
        "daily_sent_amount": 0,
        "daily_sent_count": 0,
        "monthly_sent_amount": 0,
        "monthly_sent_count": 0,
        "total_received_amount": 5000000,
        "received_transfer_count": 1,
        "total_sent_amount": 0,
        "sent_transfer_count": 0,
        "current_usage": 0,
        "notes": "Main operational SIM for GP transfers"
    },
    {
        "operator_code": OperatorCode.ROBI,
        "mobile_number": "01811000001",
        "label": "Robi Primary Receiving SIM #1",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 3000000,
        "reserved_balance": 0,
        "available_balance": 3000000,
        "daily_limit": 20000000,
        "monthly_limit": 500000000,
        "daily_sent_amount": 0,
        "daily_sent_count": 0,
        "monthly_sent_amount": 0,
        "monthly_sent_count": 0,
        "total_received_amount": 3000000,
        "received_transfer_count": 1,
        "total_sent_amount": 0,
        "sent_transfer_count": 0,
        "current_usage": 0,
        "notes": "Main operational SIM for Robi transfers"
    },
    {
        "operator_code": OperatorCode.BANGLALINK,
        "mobile_number": "01911000001",
        "label": "Banglalink Primary Receiving SIM #1",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 2000000,
        "reserved_balance": 0,
        "available_balance": 2000000,
        "daily_limit": 20000000,
        "monthly_limit": 500000000,
        "daily_sent_amount": 0,
        "daily_sent_count": 0,
        "monthly_sent_amount": 0,
        "monthly_sent_count": 0,
        "total_received_amount": 2000000,
        "received_transfer_count": 1,
        "total_sent_amount": 0,
        "sent_transfer_count": 0,
        "current_usage": 0,
        "notes": "Main operational SIM for Banglalink transfers"
    }
]


class ReceivingSimsService:
    def __init__(self, sims_repo: ReceivingSimsRepository):
        self.sims_repo = sims_repo

    def _format_sim_response(self, s: Dict[str, Any]) -> Dict[str, Any]:
        curr_poisha = s.get("current_balance", s.get("available_balance", 0))
        res_poisha = s.get("reserved_balance", 0)
        avail_poisha = s.get("available_balance", curr_poisha - res_poisha)
        daily_limit_poisha = s.get("daily_limit", 20000000)
        daily_sent_poisha = s.get("daily_sent_amount", s.get("current_daily_usage", s.get("current_usage", 0)))
        monthly_sent_poisha = s.get("monthly_sent_amount", 0)
        tot_recv_poisha = s.get("total_received_amount", 0)
        tot_sent_poisha = s.get("total_sent_amount", daily_sent_poisha)

        now = int(time.time())
        cooldown_until = s.get("cooldown_until", 0)
        is_cooldown = cooldown_until > now

        return {
            "receiving_sim_id": s["receiving_sim_id"],
            "operator_code": s["operator_code"],
            "mobile_number": s["mobile_number"],
            "label": s.get("label", ""),
            "status": s.get("status", SimStatus.ACTIVE),
            "health_status": s.get("health_status", "HEALTHY"),
            "current_balance_bdt": poisha_to_bdt(curr_poisha),
            "current_balance_poisha": curr_poisha,
            "reserved_balance_bdt": poisha_to_bdt(res_poisha),
            "reserved_balance_poisha": res_poisha,
            "available_balance_bdt": poisha_to_bdt(avail_poisha),
            "available_balance_poisha": avail_poisha,
            "daily_limit_bdt": poisha_to_bdt(daily_limit_poisha),
            "current_usage_bdt": poisha_to_bdt(daily_sent_poisha),
            "current_usage_poisha": daily_sent_poisha,
            "daily_sent_amount_bdt": poisha_to_bdt(daily_sent_poisha),
            "daily_sent_count": s.get("daily_sent_count", 0),
            "monthly_sent_amount_bdt": poisha_to_bdt(monthly_sent_poisha),
            "monthly_sent_count": s.get("monthly_sent_count", 0),
            "total_received_amount_bdt": poisha_to_bdt(tot_recv_poisha),
            "received_transfer_count": s.get("received_transfer_count", 0),
            "total_sent_amount_bdt": poisha_to_bdt(tot_sent_poisha),
            "sent_transfer_count": s.get("sent_transfer_count", 0),
            "cooldown_until": cooldown_until,
            "is_in_cooldown": is_cooldown,
            "failure_count": s.get("failure_count", 0),
            "notes": s.get("notes"),
            "created_at": str(s.get("created_at", ""))
        }

    async def list_sims(self, operator_code: Optional[OperatorCode] = None) -> List[Dict[str, Any]]:
        sims = await self.sims_repo.get_all(operator_code)
        if not sims and not operator_code:
            # Seed default sims
            for s in DEFAULT_INITIAL_SIMS:
                doc = s.copy()
                doc["receiving_sim_id"] = generate_sim_id()
                doc["created_at"] = self.sims_repo.utcnow()
                doc["updated_at"] = self.sims_repo.utcnow()
                await self.sims_repo.insert_one(doc)
            sims = await self.sims_repo.get_all()

        return [self._format_sim_response(s) for s in sims]

    async def get_sim(self, receiving_sim_id: str) -> Dict[str, Any]:
        sim = await self.sims_repo.get_by_sim_id(receiving_sim_id)
        if not sim:
            raise NotFoundException(f"Receiving SIM {receiving_sim_id} not found")
        return self._format_sim_response(sim)

    async def create_sim(
        self,
        operator_code: OperatorCode,
        mobile_number: str,
        label: str,
        daily_limit_bdt: Decimal,
        monthly_limit_bdt: Decimal,
        initial_balance_bdt: Optional[Decimal] = Decimal("0.00"),
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        norm_phone = normalize_bd_phone(mobile_number)

        # 1. Authoritative 11-digit validation
        if not norm_phone.startswith("01") or len(norm_phone) != 11 or not norm_phone.isdigit():
            raise ValidationException("Mobile number must be a valid 11-digit Bangladesh phone number (01XXXXXXXXX)")

        # 2. Strict prefix & operator match
        detected_op = resolve_operator_from_msisdn(norm_phone)
        if detected_op.upper() != str(operator_code.value if hasattr(operator_code, "value") else operator_code).upper():
            raise ValidationException(
                f"Phone number {norm_phone} belongs to {detected_op}, which does not match operator {operator_code}"
            )

        # 3. Duplicate check: Number cannot already be registered
        existing = await self.sims_repo.find_one({"mobile_number": norm_phone})
        if existing:
            raise ConflictException(f"Receiving SIM with phone number {norm_phone} is already registered")

        init_poisha = bdt_to_poisha(initial_balance_bdt or Decimal("0.00"))
        sim_id = generate_sim_id()
        now = self.sims_repo.utcnow()

        doc = {
            "receiving_sim_id": sim_id,
            "operator_code": operator_code.value if hasattr(operator_code, "value") else str(operator_code),
            "mobile_number": norm_phone,
            "label": label,
            "status": SimStatus.ACTIVE,
            "health_status": "HEALTHY",
            "current_balance": init_poisha,
            "reserved_balance": 0,
            "available_balance": init_poisha,
            "daily_limit": bdt_to_poisha(daily_limit_bdt),
            "monthly_limit": bdt_to_poisha(monthly_limit_bdt),
            "daily_sent_amount": 0,
            "daily_sent_count": 0,
            "monthly_sent_amount": 0,
            "monthly_sent_count": 0,
            "total_received_amount": init_poisha,
            "received_transfer_count": 1 if init_poisha > 0 else 0,
            "total_sent_amount": 0,
            "sent_transfer_count": 0,
            "cooldown_until": 0,
            "failure_count": 0,
            "current_usage": 0,
            "notes": notes,
            "created_at": now,
            "updated_at": now
        }
        await self.sims_repo.insert_one(doc)
        return self._format_sim_response(doc)

    async def update_sim(self, receiving_sim_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        sim = await self.sims_repo.get_by_sim_id(receiving_sim_id)
        if not sim:
            raise NotFoundException(f"Receiving SIM {receiving_sim_id} not found")

        set_data = {}
        for key in ["label", "notes", "health_status", "status"]:
            if key in updates and updates[key] is not None:
                val = updates[key]
                set_data[key] = val.value if hasattr(val, "value") else val

        if "daily_limit_bdt" in updates and updates["daily_limit_bdt"] is not None:
            set_data["daily_limit"] = bdt_to_poisha(updates["daily_limit_bdt"])
        if "monthly_limit_bdt" in updates and updates["monthly_limit_bdt"] is not None:
            set_data["monthly_limit"] = bdt_to_poisha(updates["monthly_limit_bdt"])

        set_data["updated_at"] = self.sims_repo.utcnow()
        await self.sims_repo.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {"$set": set_data}
        )
        return await self.get_sim(receiving_sim_id)

    async def set_status(self, receiving_sim_id: str, new_status: SimStatus, reason: Optional[str] = None) -> Dict[str, Any]:
        sim = await self.sims_repo.get_by_sim_id(receiving_sim_id)
        if not sim:
            raise NotFoundException(f"Receiving SIM {receiving_sim_id} not found")

        status_val = new_status.value if hasattr(new_status, "value") else str(new_status)
        update_data = {
            "status": status_val,
            "updated_at": self.sims_repo.utcnow()
        }
        if status_val == SimStatus.BLOCKED.value:
            update_data["health_status"] = "BLOCKED"
            if reason:
                update_data["audit_note"] = reason
        elif status_val == SimStatus.ACTIVE.value:
            update_data["health_status"] = "HEALTHY"

        await self.sims_repo.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {"$set": update_data}
        )
        return await self.get_sim(receiving_sim_id)

    async def get_transfer_history(self, receiving_sim_id: str, direction: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        sim = await self.sims_repo.get_by_sim_id(receiving_sim_id)
        if not sim:
            raise NotFoundException(f"Receiving SIM {receiving_sim_id} not found")
        return await self.sims_repo.get_transfer_history(receiving_sim_id, direction, limit)

    async def reconcile(self, receiving_sim_id: str, operator_balance_bdt: float) -> Dict[str, Any]:
        return await self.sims_repo.reconcile_balance(receiving_sim_id, operator_balance_bdt)
