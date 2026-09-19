"""
Append-Only Audit Log Repository for audit_logs collection.
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.security import generate_audit_id
from app.db.repositories.base import BaseRepository


class AuditRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "audit_logs")

    async def log_action(
        self,
        actor_type: str,
        actor_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        before: Optional[Any] = None,
        after: Optional[Any] = None,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        doc = {
            "audit_id": generate_audit_id(),
            "actor_type": actor_type,
            "actor_id": actor_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "before": before,
            "after": after,
            "reason": reason,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": self.utcnow()
        }
        await self.collection.insert_one(doc)
        return doc

    async def get_logs_for_resource(self, resource_id: str) -> List[Dict[str, Any]]:
        cursor = self.collection.find({"resource_id": resource_id}).sort("created_at", -1)
        return await cursor.to_list(length=100)
