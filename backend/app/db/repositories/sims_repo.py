"""
Upgraded Receiving SIM Repository & Inventory Management.
Provides atomic reservations, capacity checks, cooldown tracking, and double-spend protection.
"""

import time
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import OperatorCode, SimStatus
from app.db.repositories.base import BaseRepository


class ReceivingSimsRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "receiving_sims")

    async def get_by_sim_id(self, receiving_sim_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"receiving_sim_id": receiving_sim_id})

    async def get_all(self, operator_code: Optional[OperatorCode] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if operator_code:
            query["operator_code"] = operator_code
        return await self.find_many(query, sort_by=[("created_at", -1)], limit=100)

    async def select_best_sim(
        self,
        operator_code: str,
        required_amount_poisha: int,
        for_recharge: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Selects best active SIM for the given operator.
        For Cash Out: Must have capacity to receive funds under daily limit.
        For Recharge: Must have available balance >= required_amount_poisha.
        """
        now = int(time.time())
        query: Dict[str, Any] = {
            "operator_code": operator_code.upper(),
            "status": SimStatus.ACTIVE,
            "cooldown_until": {"$lte": now}
        }

        if for_recharge:
            query["available_balance"] = {"$gte": required_amount_poisha}

        cursor = self.collection.find(query).sort("current_daily_usage", 1)
        sims = await cursor.to_list(length=20)

        for sim in sims:
            daily_limit = sim.get("daily_limit", 50000000)  # 50,000 BDT in poisha
            current_usage = sim.get("current_daily_usage", 0)
            if current_usage + required_amount_poisha <= daily_limit:
                return sim

        return sims[0] if sims else None

    async def reserve_sim_balance(self, receiving_sim_id: str, amount_poisha: int) -> bool:
        """
        Atomically reserves balance on SIM for an outgoing recharge transfer.
        Prevents double-spending of SIM balance by concurrent orders.
        """
        now = self.utcnow()
        res = await self.collection.update_one(
            {
                "receiving_sim_id": receiving_sim_id,
                "available_balance": {"$gte": amount_poisha}
            },
            {
                "$inc": {
                    "available_balance": -amount_poisha,
                    "reserved_balance": amount_poisha
                },
                "$set": {"updated_at": now}
            }
        )
        return res.modified_count > 0

    async def release_sim_reservation(self, receiving_sim_id: str, amount_poisha: int) -> bool:
        """Releases a reserved balance back to available on cancellation/failure."""
        now = self.utcnow()
        res = await self.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {
                "$inc": {
                    "available_balance": amount_poisha,
                    "reserved_balance": -amount_poisha
                },
                "$set": {"updated_at": now}
            }
        )
        return res.modified_count > 0

    async def confirm_recharge_deduction(self, receiving_sim_id: str, amount_poisha: int) -> bool:
        """Confirms successful deduction of reserved balance on recharge completion."""
        now = self.utcnow()
        res = await self.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {
                "$inc": {
                    "reserved_balance": -amount_poisha,
                    "known_balance": -amount_poisha,
                    "current_daily_usage": amount_poisha
                },
                "$set": {"updated_at": now, "last_successful_transfer": int(time.time())}
            }
        )
        return res.modified_count > 0

    async def record_cashout_receipt(self, receiving_sim_id: str, amount_poisha: int) -> bool:
        """Increments SIM balance when Cash Out transfer is confirmed from customer."""
        now = self.utcnow()
        res = await self.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {
                "$inc": {
                    "available_balance": amount_poisha,
                    "known_balance": amount_poisha,
                    "current_daily_usage": amount_poisha
                },
                "$set": {"updated_at": now, "last_successful_transfer": int(time.time())}
            }
        )
        return res.modified_count > 0
