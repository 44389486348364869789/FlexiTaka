"""
System Settings Repository for system_settings collection.
"""

from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.repositories.base import BaseRepository


class SettingsRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "system_settings")

    async def get_setting(self, key: str, default: Any = None) -> Any:
        doc = await self.find_one({"key": key})
        return doc.get("value", default) if doc else default

    async def set_setting(self, key: str, value: Any, updated_by: str, description: Optional[str] = None) -> bool:
        update_data = {
            "$set": {
                "key": key,
                "value": value,
                "updated_by": updated_by,
                "updated_at": self.utcnow()
            }
        }
        if description:
            update_data["$set"]["description"] = description
        return await self.update_one({"key": key}, update_data, upsert=True)

    async def get_all_settings(self) -> Dict[str, Any]:
        docs = await self.find_many({}, limit=100)
        return {doc["key"]: doc.get("value") for doc in docs}
