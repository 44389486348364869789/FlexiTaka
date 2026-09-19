"""
Support Tickets Repository for support_tickets collection.
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import SupportStatus
from app.db.repositories.base import BaseRepository


class SupportRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "support_tickets")

    async def get_by_ticket_id(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"ticket_id": ticket_id})

    async def add_message(
        self,
        ticket_id: str,
        sender_type: str,
        sender_id: str,
        message: str
    ) -> bool:
        msg_obj = {
            "sender_type": sender_type,
            "sender_id": sender_id,
            "message": message,
            "created_at": self.utcnow()
        }
        res = await self.collection.update_one(
            {"ticket_id": ticket_id},
            {
                "$push": {"messages": msg_obj},
                "$set": {
                    "updated_at": self.utcnow(),
                    "status": SupportStatus.WAITING_FOR_USER if sender_type == "STAFF" else SupportStatus.IN_PROGRESS
                }
            }
        )
        return res.modified_count > 0

    async def update_status(self, ticket_id: str, new_status: SupportStatus) -> bool:
        set_data: Dict[str, Any] = {"status": new_status, "updated_at": self.utcnow()}
        if new_status in {SupportStatus.RESOLVED, SupportStatus.CLOSED}:
            set_data["resolved_at"] = self.utcnow()
        res = await self.collection.update_one({"ticket_id": ticket_id}, {"$set": set_data})
        return res.modified_count > 0
