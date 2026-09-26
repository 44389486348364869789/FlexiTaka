"""
Repository for Customer Linked SIMs.
Supports multiple verified SIMs under one FlexiTaka customer account.
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.repositories.base import BaseRepository


class LinkedSimsRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "user_linked_sims")

    async def list_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        return await self.find_many(
            {"user_id": user_id},
            sort_by=[("created_at", -1)]
        )

    async def get_by_sim_id(self, sim_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"sim_id": sim_id})

    async def get_by_user_and_sim_id(self, user_id: str, sim_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"user_id": user_id, "sim_id": sim_id})

    async def find_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"phone": phone})

    async def find_by_user_and_phone(self, user_id: str, phone: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"user_id": user_id, "phone": phone})

    async def add_sim(self, sim_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self.insert_one(sim_data)

    async def update_sim(self, sim_id: str, update_fields: Dict[str, Any]) -> bool:
        return await self.update_one(
            {"sim_id": sim_id},
            {"$set": update_fields}
        )

    async def delete_sim(self, user_id: str, sim_id: str) -> bool:
        res = await self.collection.delete_one({"user_id": user_id, "sim_id": sim_id})
        return res.deleted_count > 0

    async def count_by_user(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id})

    async def save_sim_pin(self, sim_id: str, plain_pin: str, pin_source: str = "DERIVED_MSISDN") -> bool:
        """Stores transfer PIN encrypted at rest. Plaintext PIN is never stored."""
        from app.core.security import encrypt_pin
        enc = encrypt_pin(plain_pin)
        now = self.utcnow()
        return await self.update_one(
            {"sim_id": sim_id},
            {"$set": {
                "encrypted_transfer_pin": enc,
                "transfer_pin_configured": True,
                "pin_status": "CONFIGURED",
                "pin_source": pin_source,
                "pin_last_changed_at": now,
                "updated_at": now
            }, "$inc": {"pin_version": 1}}
        )

    async def get_sim_transfer_pin(self, sim_id: str) -> Optional[str]:
        """Decrypts and returns transfer PIN internally. NEVER expose via API."""
        sim = await self.get_by_sim_id(sim_id)
        if not sim:
            return None
        from app.core.security import decrypt_pin
        enc = sim.get("encrypted_transfer_pin")
        if enc:
            return decrypt_pin(enc)
        return None

    async def mark_sim_pin_invalid(self, sim_id: str) -> bool:
        """Marks transfer PIN as invalid on operator rejection so it is re-established."""
        now = self.utcnow()
        return await self.update_one(
            {"sim_id": sim_id},
            {"$set": {
                "pin_status": "INVALID",
                "transfer_pin_configured": False,
                "updated_at": now
            }}
        )

