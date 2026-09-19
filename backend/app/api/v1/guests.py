"""
Guest Session Router.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Request
from app.api.dependencies import get_guest_session_id_optional, get_users_repo
from app.db.repositories.users_repo import UsersRepository
from app.modules.guests.schemas import CreateGuestSessionRequest, GuestSessionResponse
from app.modules.guests.service import GuestService

router = APIRouter(prefix="/guest", tags=["Guest Sessions"])


@router.post("/session", response_model=GuestSessionResponse)
async def create_guest_session(
    request: Request,
    payload: Optional[CreateGuestSessionRequest] = None,
    users_repo: UsersRepository = Depends(get_users_repo)
):
    service = GuestService(users_repo)
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent") or (payload.user_agent if payload else None)
    return await service.create_session(ip=client_ip, user_agent=user_agent)


@router.get("/session")
async def get_guest_session(
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    users_repo: UsersRepository = Depends(get_users_repo)
):
    if not guest_session_id:
        return {"active": False, "guest_session_id": None}
    service = GuestService(users_repo)
    session = await service.validate_session(guest_session_id)
    return {"active": True, "guest_session_id": session["guest_session_id"]}
