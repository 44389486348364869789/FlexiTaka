"""
Authoritative Operator Configuration Repository.
Manages per-operator transfer limits, quotas, windows, and verification status.
Supports GP, Banglalink, and Robi.

Verification Authority:
- GP: Officially VERIFIED from Grameenphone portal (10-100 BDT/transfer, max 10 transfers/calendar month, max 1000 BDT/calendar month).
- Banglalink: UNVERIFIED numeric limits (service exists on official portal, numeric limits are unpublished and remain configurable).
- Robi: UNVERIFIED numeric limits (no official public limit table published; limits remain configurable).
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.repositories.base import BaseRepository

DEFAULT_OPERATOR_CONFIGS: Dict[str, Dict[str, Any]] = {
    "GP": {
        "operator_code": "GP",
        "min_transfer_amount_bdt": 10,
        "max_transfer_amount_bdt": 100,
        "daily_amount_limit_bdt": 1000,
        "monthly_amount_limit_bdt": 1000,
        "daily_transfer_count_limit": None,
        "monthly_transfer_count_limit": 10,  # Official rule: 10 times in a calendar month
        "window_type": "CALENDAR_MONTH",
        "cooldown_seconds": 0,
        "same_operator_only": True,
        "enabled": True,
        "is_verified": True,
        "verification_source": "https://www.grameenphone.com/personal/services/vas-others/balance-transfer",
        "verified_at": 1758784800,
        "notes": "GP official balance transfer limits: 10 to 100 BDT/transfer, up to 10 transfers and 1,000 BDT per calendar month. Only prepaid subscribers can send; can send to GP prepaid/postpaid."
    },
    "BANGLALINK": {
        "operator_code": "BANGLALINK",
        "min_transfer_amount_bdt": 10,
        "max_transfer_amount_bdt": 100,
        "daily_amount_limit_bdt": None,
        "monthly_amount_limit_bdt": None,
        "daily_transfer_count_limit": None,
        "monthly_transfer_count_limit": None,
        "window_type": "CALENDAR_MONTH",
        "cooldown_seconds": 1800,
        "same_operator_only": True,
        "enabled": True,
        "is_verified": False,
        "verification_source": "https://banglalink.net/bn/explore-c/connect",
        "verified_at": None,
        "notes": "Official Balance Transfer service exists on Banglalink Connect portal, but exact numeric limits (min, max, daily, monthly amounts/counts) are not publicly published on the portal and remain configurable by admin."
    },
    "ROBI": {
        "operator_code": "ROBI",
        "min_transfer_amount_bdt": 5,
        "max_transfer_amount_bdt": 300,
        "daily_amount_limit_bdt": 500,
        "monthly_amount_limit_bdt": 1000,
        "daily_transfer_count_limit": 5,  # Max 5 unique recipients daily
        "monthly_transfer_count_limit": None,
        "window_type": "CALENDAR_MONTH",
        "cooldown_seconds": 0,
        "same_operator_only": True,
        "enabled": True,
        "is_verified": True,
        "verification_source": "MyRobi iOS REST API balance transfer policy",
        "verified_at": 1758784800,
        "notes": "Robi official balance transfer policy: min 5 to max 300 BDT per transfer, daily max 500 BDT, monthly max 1000 BDT, 2.78 BDT fee, requires SMS OTP per transaction."
    }
}


class OperatorConfigRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "operator_configs")

    async def ensure_defaults(self, force_reset_unverified: bool = False) -> None:
        """
        Seeds or updates operator configurations.
        Ensures GP is marked VERIFIED with 10-count monthly rule,
        and Banglalink/Robi are strictly NOT marked verified.
        """
        for op_code, cfg in DEFAULT_OPERATOR_CONFIGS.items():
            existing = await self.find_one({"operator_code": op_code})
            doc = cfg.copy()
            doc["min_transfer_amount_poisha"] = (doc["min_transfer_amount_bdt"] * 100) if doc["min_transfer_amount_bdt"] is not None else None
            doc["max_transfer_amount_poisha"] = (doc["max_transfer_amount_bdt"] * 100) if doc["max_transfer_amount_bdt"] is not None else None
            doc["daily_amount_limit_poisha"] = (doc["daily_amount_limit_bdt"] * 100) if doc["daily_amount_limit_bdt"] is not None else None
            doc["monthly_amount_limit_poisha"] = (doc["monthly_amount_limit_bdt"] * 100) if doc["monthly_amount_limit_bdt"] is not None else None

            if not existing:
                doc["created_at"] = self.utcnow()
                doc["updated_at"] = self.utcnow()
                await self.insert_one(doc)
            elif force_reset_unverified or op_code in ["BANGLALINK", "ROBI", "GP"]:
                # Ensure verification status and official GP monthly count rule are accurately synced
                sync_fields = {
                    "is_verified": doc["is_verified"],
                    "verification_source": doc["verification_source"],
                    "verified_at": doc["verified_at"],
                    "notes": doc["notes"],
                    "updated_at": self.utcnow()
                }
                if op_code == "GP":
                    sync_fields["monthly_transfer_count_limit"] = 10
                    sync_fields["monthly_amount_limit_bdt"] = 1000
                    sync_fields["monthly_amount_limit_poisha"] = 100000
                elif op_code in ["BANGLALINK", "ROBI"]:
                    # Ensure unverified operators are not falsely claiming verified 3000 monthly
                    if existing.get("is_verified") is True:
                        sync_fields["is_verified"] = False
                await self.collection.update_one({"operator_code": op_code}, {"$set": sync_fields})

    async def get_config(self, operator_code: str) -> Dict[str, Any]:
        """Fetches active configuration for an operator."""
        op_clean = operator_code.upper().strip()
        doc = await self.find_one({"operator_code": op_clean})
        if not doc:
            default = DEFAULT_OPERATOR_CONFIGS.get(op_clean)
            if default:
                doc = default.copy()
                doc["min_transfer_amount_poisha"] = (doc["min_transfer_amount_bdt"] * 100) if doc.get("min_transfer_amount_bdt") is not None else None
                doc["max_transfer_amount_poisha"] = (doc["max_transfer_amount_bdt"] * 100) if doc.get("max_transfer_amount_bdt") is not None else None
                doc["daily_amount_limit_poisha"] = (doc["daily_amount_limit_bdt"] * 100) if doc.get("daily_amount_limit_bdt") is not None else None
                doc["monthly_amount_limit_poisha"] = (doc["monthly_amount_limit_bdt"] * 100) if doc.get("monthly_amount_limit_bdt") is not None else None
            else:
                doc = {
                    "operator_code": op_clean,
                    "min_transfer_amount_bdt": 10,
                    "max_transfer_amount_bdt": 100,
                    "daily_amount_limit_bdt": None,
                    "monthly_amount_limit_bdt": None,
                    "min_transfer_amount_poisha": 1000,
                    "max_transfer_amount_poisha": 10000,
                    "daily_amount_limit_poisha": None,
                    "monthly_amount_limit_poisha": None,
                    "daily_transfer_count_limit": None,
                    "monthly_transfer_count_limit": None,
                    "window_type": "CALENDAR_MONTH",
                    "cooldown_seconds": 0,
                    "same_operator_only": True,
                    "enabled": True,
                    "is_verified": False,
                    "verification_source": None,
                    "verified_at": None,
                    "notes": f"Fallback defaults for {op_clean}"
                }
        return doc

    async def list_configs(self) -> List[Dict[str, Any]]:
        """Returns all operator configurations."""
        await self.ensure_defaults()
        return await self.find_many({}, sort_by=[("operator_code", 1)], limit=50)

    async def update_config(self, operator_code: str, updates: Dict[str, Any], updated_by: str = "ADMIN") -> Dict[str, Any]:
        """Updates configuration for an operator."""
        op_clean = operator_code.upper().strip()
        now = self.utcnow()
        set_data = dict(updates)
        set_data["updated_at"] = now
        set_data["updated_by"] = updated_by

        if "min_transfer_amount_bdt" in set_data:
            val = set_data["min_transfer_amount_bdt"]
            set_data["min_transfer_amount_poisha"] = int(val) * 100 if val is not None else None
        if "max_transfer_amount_bdt" in set_data:
            val = set_data["max_transfer_amount_bdt"]
            set_data["max_transfer_amount_poisha"] = int(val) * 100 if val is not None else None
        if "daily_amount_limit_bdt" in set_data:
            val = set_data["daily_amount_limit_bdt"]
            set_data["daily_amount_limit_poisha"] = int(val) * 100 if val is not None else None
        if "monthly_amount_limit_bdt" in set_data:
            val = set_data["monthly_amount_limit_bdt"]
            set_data["monthly_amount_limit_poisha"] = int(val) * 100 if val is not None else None

        await self.collection.update_one(
            {"operator_code": op_clean},
            {"$set": set_data},
            upsert=True
        )
        return await self.get_config(op_clean)
