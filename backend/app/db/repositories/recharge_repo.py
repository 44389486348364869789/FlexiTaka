"""
Recharge Detail Repository for recharge_orders collection.
"""

from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.repositories.base import BaseRepository


class RechargeRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "recharge_orders")

    async def get_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"order_id": order_id})

    async def link_payment(self, order_id: str, payment_id: str) -> bool:
        return await self.update_one({"order_id": order_id}, {"$set": {"payment_id": payment_id}})

    async def complete_recharge(
        self,
        order_id: str,
        processing_reference: str,
        source_sim_id: Optional[str] = None
    ) -> bool:
        return await self.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "processing_reference": processing_reference,
                    "source_receiving_sim_id": source_sim_id,
                    "completed_at": self.utcnow()
                }
            }
        )
