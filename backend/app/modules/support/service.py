"""
Support Service.
Handles support ticket lifecycle and messaging.
"""

from typing import Any, Dict, List, Optional
from app.core.constants import SupportStatus
from app.core.exceptions import NotFoundException, ValidationException
from app.core.security import generate_ticket_id
from app.db.repositories.support_repo import SupportRepository


class SupportService:
    def __init__(self, support_repo: SupportRepository):
        self.support_repo = support_repo

    async def create_ticket(
        self,
        category: str,
        subject: str,
        message: str,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        order_id: Optional[str] = None,
        priority: str = "NORMAL"
    ) -> Dict[str, Any]:
        if not user_id and not guest_session_id:
            raise ValidationException("Ticket must be associated with a user or guest session")

        ticket_id = generate_ticket_id()
        initial_msg = {
            "sender_type": "USER" if user_id else "GUEST",
            "sender_id": user_id or guest_session_id or "unknown",
            "message": message,
            "created_at": self.support_repo.utcnow()
        }

        ticket_doc = {
            "ticket_id": ticket_id,
            "user_id": user_id,
            "guest_session_id": guest_session_id,
            "order_id": order_id,
            "category": category,
            "subject": subject,
            "priority": priority,
            "status": SupportStatus.OPEN,
            "messages": [initial_msg],
            "assigned_staff_id": None
        }
        await self.support_repo.insert_one(ticket_doc)
        return ticket_doc

    async def add_message(
        self,
        ticket_id: str,
        sender_type: str,
        sender_id: str,
        message: str
    ) -> Dict[str, Any]:
        ticket = await self.support_repo.get_by_ticket_id(ticket_id)
        if not ticket:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        await self.support_repo.add_message(ticket_id, sender_type, sender_id, message)
        return await self.support_repo.get_by_ticket_id(ticket_id)

    async def list_tickets(
        self,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        status: Optional[SupportStatus] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if user_id:
            query["user_id"] = user_id
        elif guest_session_id:
            query["guest_session_id"] = guest_session_id
        if status:
            query["status"] = status

        return await self.support_repo.find_many(query, sort_by=[("created_at", -1)], limit=limit)
