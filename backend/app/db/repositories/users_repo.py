"""
Users, Guest Sessions, and Admin Users Repository.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.db.repositories.base import BaseRepository


class UsersRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "users")
        self.guests_collection = db["guest_sessions"]
        self.admin_collection = db["admin_users"]

    # --- Registered Users ---
    async def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"user_id": user_id})

    async def get_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"phone": phone})

    # --- Guest Sessions ---
    async def create_guest_session(self, guest_data: Dict[str, Any]) -> Dict[str, Any]:
        doc = guest_data.copy()
        now = datetime.now(timezone.utc)
        doc["created_at"] = now.isoformat()
        doc["updated_at"] = now.isoformat()
        doc["expires_at"] = now + timedelta(days=settings.GUEST_SESSION_EXPIRE_DAYS)
        await self.guests_collection.insert_one(doc)
        return doc

    async def get_guest_session(self, guest_session_id: str) -> Optional[Dict[str, Any]]:
        return await self.guests_collection.find_one({"guest_session_id": guest_session_id})

    async def mark_guest_session_linked(self, guest_session_id: str, user_id: str) -> bool:
        now = datetime.now(timezone.utc)
        result = await self.guests_collection.update_one(
            {
                "guest_session_id": guest_session_id,
                "$or": [
                    {"linked_user_id": None},
                    {"linked_user_id": {"$exists": False}},
                    {"linked_user_id": user_id}
                ]
            },
            {
                "$set": {
                    "linked_user_id": user_id,
                    "linked_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }
            }
        )
        return result.matched_count > 0

    # --- Admin Users ---
    async def get_admin_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self.admin_collection.find_one({"email": email.lower().strip()})

    async def get_admin_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        return await self.admin_collection.find_one({"admin_user_id": admin_id})

    async def create_admin_user(self, admin_data: Dict[str, Any]) -> Dict[str, Any]:
        doc = admin_data.copy()
        doc["email"] = doc["email"].lower().strip()
        doc["created_at"] = self.utcnow()
        doc["updated_at"] = self.utcnow()
        await self.admin_collection.insert_one(doc)
        return doc
