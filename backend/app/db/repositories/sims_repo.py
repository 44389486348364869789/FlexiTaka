"""
Receiving SIM Repository for receiving_sims collection.
"""

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

    async def select_best_sim(self, operator_code: str, required_amount_poisha: int) -> Optional[Dict[str, Any]]:
        """
        Select an active SIM for the given operator that has not exceeded its daily limit.
        """
        cursor = self.collection.find({
            "operator_code": operator_code,
            "status": SimStatus.ACTIVE
        }).sort("current_usage", 1)

        sims = await cursor.to_list(length=20)
        for sim in sims:
            daily_limit = sim.get("daily_limit", 10000000)  # default high limit in poisha
            current_usage = sim.get("current_usage", 0)
            if current_usage + required_amount_poisha <= daily_limit:
                return sim

        # If all exceeded limit, return the one with lowest usage if any
        return sims[0] if sims else None

    async def record_sim_usage(self, receiving_sim_id: str, amount_poisha: int) -> bool:
        res = await self.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {
                "$inc": {
                    "current_usage": amount_poisha,
                    "available_balance": amount_poisha
                },
                "$set": {"updated_at": self.utcnow()}
            }
        )
        return res.modified_count > 0
