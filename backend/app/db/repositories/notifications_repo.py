"""
Notifications Repository for notifications collection.
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.repositories.base import BaseRepository


class NotificationsRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "notifications")

    async def get_by_notification_id(self, notification_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"notification_id": notification_id})

    async def get_for_recipient(
        self,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if user_id:
            query["user_id"] = user_id
        elif guest_session_id:
            query["guest_session_id"] = guest_session_id
        else:
            return []

        cursor = self.collection.find(query).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def mark_as_read(self, notification_id: str) -> bool:
        return await self.update_one(
            {"notification_id": notification_id},
            {"$set": {"status": "READ", "read_at": self.utcnow()}}
        )
