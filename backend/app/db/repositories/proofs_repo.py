"""
Proofs Repository for transaction_proofs metadata collection.
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.repositories.base import BaseRepository


class ProofsRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "transaction_proofs")

    async def get_by_proof_id(self, proof_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"proof_id": proof_id})

    async def get_by_order_id(self, order_id: str) -> List[Dict[str, Any]]:
        return await self.find_many({"order_id": order_id}, sort_by=[("created_at", -1)])
