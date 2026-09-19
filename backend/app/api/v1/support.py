"""
Support Router.
Customer and guest ticket creation and conversation messaging.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import (
    get_current_user_optional, get_db, get_guest_session_id_optional
)
from app.core.exceptions import NotFoundException
from app.db.repositories.support_repo import SupportRepository
from app.modules.support.schemas import (
    AddMessageRequest, CreateTicketRequest, TicketResponse
)
from app.modules.support.service import SupportService

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: CreateTicketRequest,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    repo = SupportRepository(db)
    service = SupportService(repo)

    user_id = user["sub"] if user else None
    return await service.create_ticket(
        category=payload.category,
        subject=payload.subject,
        message=payload.message,
        user_id=user_id,
        guest_session_id=guest_session_id,
        order_id=payload.order_id,
        priority=payload.priority
    )


@router.get("/tickets", response_model=List[TicketResponse])
async def list_tickets(
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    repo = SupportRepository(db)
    service = SupportService(repo)

    user_id = user["sub"] if user else None
    return await service.list_tickets(user_id=user_id, guest_session_id=guest_session_id)


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    repo = SupportRepository(db)
    ticket = await repo.get_by_ticket_id(ticket_id)
    if not ticket:
        raise NotFoundException(f"Ticket {ticket_id} not found")
    return ticket


@router.post("/tickets/{ticket_id}/messages", response_model=TicketResponse)
async def add_message(
    ticket_id: str,
    payload: AddMessageRequest,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    repo = SupportRepository(db)
    service = SupportService(repo)

    sender_type = "USER" if user else "GUEST"
    sender_id = user["sub"] if user else (guest_session_id or "customer")

    return await service.add_message(
        ticket_id=ticket_id,
        sender_type=sender_type,
        sender_id=sender_id,
        message=payload.message
    )
