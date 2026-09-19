"""
Payments Repository for payments collection.
"""

from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import PaymentStatus
from app.db.repositories.base import BaseRepository


class PaymentsRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "payments")

    async def get_by_payment_id(self, payment_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"payment_id": payment_id})

    async def get_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"order_id": order_id})

    async def verify_payment(self, payment_id: str, verified_by: str) -> bool:
        return await self.update_one(
            {"payment_id": payment_id},
            {
                "$set": {
                    "status": PaymentStatus.VERIFIED,
                    "verified_by": verified_by,
                    "verified_at": self.utcnow()
                }
            }
        )
