"""
Notifications Router.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import (
    get_current_user_optional, get_db, get_guest_session_id_optional
)
from app.db.repositories.notifications_repo import NotificationsRepository
from app.modules.notifications.schemas import NotificationResponse
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    repo = NotificationsRepository(db)
    service = NotificationService(repo)

    user_id = user["sub"] if user else None
    return await service.get_user_notifications(user_id=user_id, guest_session_id=guest_session_id)


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    repo = NotificationsRepository(db)
    service = NotificationService(repo)
    success = await service.mark_read(notification_id)
    return {"success": success, "notification_id": notification_id}
