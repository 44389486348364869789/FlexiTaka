"""
Private Proof File Streaming Router.
Streams transaction proof files only to authorized owners or privileged staff.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import (
    get_current_token_payload, get_current_user_optional,
    get_db, get_guest_session_id_optional
)
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.proofs_repo import ProofsRepository
from app.modules.proofs.service import ProofsService

router = APIRouter(prefix="/proofs", tags=["Proofs"])


@router.get("/{proof_id}")
async def download_private_proof(
    proof_id: str,
    tracking_token: Optional[str] = Query(None),
    payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    proofs_repo = ProofsRepository(db)
    orders_repo = OrdersRepository(db)
    service = ProofsService(proofs_repo, orders_repo)

    is_staff = payload.get("type") == "admin" if payload else False
    user_id = payload.get("sub") if payload and payload.get("type") == "user" else None

    file_path, mime_type, file_name = await service.get_proof_for_download(
        proof_id=proof_id,
        user_id=user_id,
        guest_session_id=guest_session_id,
        tracking_token=tracking_token,
        is_staff=is_staff
    )

    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=file_name
    )
