"""
Notification Dispatcher Service.
Manages transactional in-app notifications for order updates.
"""

from typing import Any, Dict, List, Optional
from app.core.security import generate_notification_id
from app.db.repositories.notifications_repo import NotificationsRepository


class NotificationService:
    def __init__(self, notif_repo: NotificationsRepository):
        self.notif_repo = notif_repo

    async def send_notification(
        self,
        title: str,
        message: str,
        type_: str,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        order_id: Optional[str] = None,
        channel: str = "IN_APP"
    ) -> Dict[str, Any]:
        notif_doc = {
            "notification_id": generate_notification_id(),
            "user_id": user_id,
            "guest_session_id": guest_session_id,
            "order_id": order_id,
            "channel": channel,
            "title": title,
            "message": message,
            "type": type_,
            "status": "UNREAD",
            "sent_at": self.notif_repo.utcnow()
        }
        await self.notif_repo.insert_one(notif_doc)
        return notif_doc

    async def get_user_notifications(
        self,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return await self.notif_repo.get_for_recipient(user_id=user_id, guest_session_id=guest_session_id)

    async def mark_read(self, notification_id: str) -> bool:
        return await self.notif_repo.mark_as_read(notification_id)
