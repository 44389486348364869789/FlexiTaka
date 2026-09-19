"""
Receiving SIM Management Service.
Controls FlexiTaka receiving phone numbers and daily usage thresholds.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional
from app.core.constants import OperatorCode, SimStatus, bdt_to_poisha, poisha_to_bdt
from app.core.security import generate_sim_id
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.auth.service import normalize_bd_phone


DEFAULT_INITIAL_SIMS = [
    {
        "operator_code": OperatorCode.GP,
        "mobile_number": "01711000001",
        "label": "GP Primary Receiving SIM #1",
        "status": SimStatus.ACTIVE,
        "available_balance": 5000000,
        "daily_limit": 20000000,
        "monthly_limit": 500000000,
        "current_usage": 0,
        "notes": "Main operational SIM for GP transfers"
    },
    {
        "operator_code": OperatorCode.ROBI,
        "mobile_number": "01811000001",
        "label": "Robi Primary Receiving SIM #1",
        "status": SimStatus.ACTIVE,
        "available_balance": 3000000,
        "daily_limit": 20000000,
        "monthly_limit": 500000000,
        "current_usage": 0,
        "notes": "Main operational SIM for Robi transfers"
    },
    {
        "operator_code": OperatorCode.BANGLALINK,
        "mobile_number": "01911000001",
        "label": "Banglalink Primary Receiving SIM #1",
        "status": SimStatus.ACTIVE,
        "available_balance": 2000000,
        "daily_limit": 20000000,
        "monthly_limit": 500000000,
        "current_usage": 0,
        "notes": "Main operational SIM for Banglalink transfers"
    }
]


class ReceivingSimsService:
    def __init__(self, sims_repo: ReceivingSimsRepository):
        self.sims_repo = sims_repo

    async def list_sims(self, operator_code: Optional[OperatorCode] = None) -> List[Dict[str, Any]]:
        sims = await self.sims_repo.get_all(operator_code)
        if not sims and not operator_code:
            # Seed default sims
            for s in DEFAULT_INITIAL_SIMS:
                doc = s.copy()
                doc["receiving_sim_id"] = generate_sim_id()
                await self.sims_repo.insert_one(doc)
            sims = await self.sims_repo.get_all()

        results = []
        for s in sims:
            avail_poisha = s.get("available_balance", 0)
            usage_poisha = s.get("current_usage", 0)
            daily_poisha = s.get("daily_limit", 0)
            results.append({
                "receiving_sim_id": s["receiving_sim_id"],
                "operator_code": s["operator_code"],
                "mobile_number": s["mobile_number"],
                "label": s.get("label", ""),
                "status": s["status"],
                "available_balance_bdt": poisha_to_bdt(avail_poisha),
                "available_balance_poisha": avail_poisha,
                "daily_limit_bdt": poisha_to_bdt(daily_poisha),
                "current_usage_bdt": poisha_to_bdt(usage_poisha),
                "current_usage_poisha": usage_poisha,
                "notes": s.get("notes"),
                "created_at": s.get("created_at")
            })
        return results

    async def create_sim(
        self,
        operator_code: OperatorCode,
        mobile_number: str,
        label: str,
        daily_limit_bdt: Decimal,
        monthly_limit_bdt: Decimal,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        norm_phone = normalize_bd_phone(mobile_number)
        sim_id = generate_sim_id()
        doc = {
            "receiving_sim_id": sim_id,
            "operator_code": operator_code,
            "mobile_number": norm_phone,
            "label": label,
            "status": SimStatus.ACTIVE,
            "available_balance": 0,
            "daily_limit": bdt_to_poisha(daily_limit_bdt),
            "monthly_limit": bdt_to_poisha(monthly_limit_bdt),
            "current_usage": 0,
            "notes": notes
        }
        await self.sims_repo.insert_one(doc)
        return doc
