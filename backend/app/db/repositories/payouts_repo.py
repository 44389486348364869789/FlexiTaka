"""
Payouts Repository with Strong Double-Payout Immunity.
Enforces unique constraints, atomic insert, and state updates.
"""

from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError
from app.core.constants import PayoutStatus
from app.core.exceptions import ConflictException
from app.db.repositories.base import BaseRepository


class PayoutsRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "payouts")

    async def get_by_payout_id(self, payout_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"payout_id": payout_id})

    async def get_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"order_id": order_id})

    async def create_payout_atomic(self, payout_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a payout record atomically.
        Catches DuplicateKeyError to guarantee that no two payouts can exist for the same order_id.
        """
        try:
            return await self.insert_one(payout_data)
        except DuplicateKeyError:
            raise ConflictException(
                f"A payout record already exists or is being processed for order {payout_data.get('order_id')}"
            )

    async def mark_payout_sent(
        self,
        payout_id: str,
        provider_reference: str,
        processed_by: str
    ) -> Optional[Dict[str, Any]]:
        """
        Atomically move payout from PENDING or PROCESSING to SENT.
        """
        return await self.collection.find_one_and_update(
            {
                "payout_id": payout_id,
                "status": {"$in": [PayoutStatus.PENDING, PayoutStatus.PROCESSING]}
            },
            {
                "$set": {
                    "status": PayoutStatus.SENT,
                    "provider_reference": provider_reference,
                    "processed_by": processed_by,
                    "processed_at": self.utcnow(),
                    "updated_at": self.utcnow()
                }
            },
            return_document=True
        )
