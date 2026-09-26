"""
Customer User Account & Linked SIMs API Router.
Provides profile management, multi-SIM linkage under one account, and operator verification.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import get_current_user, get_db
from app.modules.user.schemas import (
    AddLinkedSimRequest,
    LinkedSimResponse,
    UpdateProfileRequest,
    UserProfileResponse,
    VerifyLinkedSimRequest,
)
from app.modules.user.service import UserService

router = APIRouter(prefix="/user", tags=["Customer Account"])


@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = UserService(db)
    return await service.get_profile(user["sub"])


@router.put("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    payload: UpdateProfileRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = UserService(db)
    return await service.update_profile(user["sub"], payload)


@router.get("/sims", response_model=List[LinkedSimResponse])
async def list_linked_sims(
    refresh: bool = False,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = UserService(db)
    return await service.list_linked_sims(user["sub"], force_refresh=refresh)


@router.post("/sims", response_model=LinkedSimResponse)
async def add_linked_sim(
    payload: AddLinkedSimRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = UserService(db)
    return await service.add_linked_sim(user["sub"], payload)


@router.post("/sims/{sim_id}/request-otp")
async def request_linked_sim_otp(
    sim_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = UserService(db)
    return await service.request_sim_verification_otp(user["sub"], sim_id)


@router.post("/sims/{sim_id}/verify-otp", response_model=LinkedSimResponse)
async def verify_linked_sim_otp(
    sim_id: str,
    payload: VerifyLinkedSimRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = UserService(db)
    return await service.verify_sim_otp(user["sub"], sim_id, payload)


@router.delete("/sims/{sim_id}")
async def remove_linked_sim(
    sim_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = UserService(db)
    success = await service.remove_linked_sim(user["sub"], sim_id)
    return {"success": success, "message": "Linked SIM removed successfully"}
