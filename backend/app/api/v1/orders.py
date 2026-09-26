"""
Orders General Router.
List orders for the authenticated user or guest, and fetch order details.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import (
    get_current_user_optional, get_db, get_guest_session_id_optional
)
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.recharge_repo import RechargeRepository
from app.modules.orders.schemas import (
    OrderDetailResponse,
    OrderProgressResponse,
    OrderSummaryResponse,
)
from app.modules.orders.service import OrdersService

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("", response_model=List[OrderSummaryResponse])
async def list_user_or_guest_orders(
    limit: int = Query(default=50, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    orders_repo = OrdersRepository(db)
    cashout_repo = CashOutRepository(db)
    recharge_repo = RechargeRepository(db)
    service = OrdersService(orders_repo, cashout_repo, recharge_repo)

    user_id = user["sub"] if user else None
    return await service.list_orders(user_id=user_id, guest_session_id=guest_session_id, limit=limit, skip=skip)


@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order_by_id(
    order_id: str,
    tracking_token: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    orders_repo = OrdersRepository(db)
    cashout_repo = CashOutRepository(db)
    recharge_repo = RechargeRepository(db)
    service = OrdersService(orders_repo, cashout_repo, recharge_repo)

    user_id = user["sub"] if user else None
    return await service.get_order_details(
        order_id=order_id,
        user_id=user_id,
        guest_session_id=guest_session_id,
        tracking_token=tracking_token
    )


@router.get("/{order_id}/progress", response_model=OrderProgressResponse)
async def get_order_progress(
    order_id: str,
    tracking_token: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    orders_repo = OrdersRepository(db)
    cashout_repo = CashOutRepository(db)
    recharge_repo = RechargeRepository(db)
    service = OrdersService(orders_repo, cashout_repo, recharge_repo)

    user_id = user["sub"] if user else None
    return await service.get_order_progress(
        order_id=order_id,
        user_id=user_id,
        guest_session_id=guest_session_id,
        tracking_token=tracking_token
    )


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    tracking_token: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    orders_repo = OrdersRepository(db)
    cashout_repo = CashOutRepository(db)
    recharge_repo = RechargeRepository(db)
    service = OrdersService(orders_repo, cashout_repo, recharge_repo)

    user_id = user["sub"] if user else None
    return await service.cancel_order(
        order_id=order_id,
        user_id=user_id,
        guest_session_id=guest_session_id,
        tracking_token=tracking_token
    )

