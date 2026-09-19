"""
Cash Out Detail Repository for cashout_orders collection.
"""

from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.repositories.base import BaseRepository


class CashOutRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "cashout_orders")

    async def get_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"order_id": order_id})

    async def update_verification(
        self,
        order_id: str,
        verification_status: str,
        verified_by: str,
        rejection_reason: Optional[str] = None
    ) -> bool:
        update_data = {
            "$set": {
                "verification_status": verification_status,
                "verified_by": verified_by,
                "verified_at": self.utcnow(),
                "rejection_reason": rejection_reason
            }
        }
        return await self.update_one({"order_id": order_id}, update_data)

    async def attach_proof(self, order_id: str, proof_id: str, transfer_reference: Optional[str] = None) -> bool:
        set_data: Dict[str, Any] = {"proof_id": proof_id}
        if transfer_reference:
            set_data["transfer_reference"] = transfer_reference
        return await self.update_one({"order_id": order_id}, {"$set": set_data})
