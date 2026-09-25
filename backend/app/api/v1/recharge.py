"""
Recharge Router.
Handles discount quote confirmation, recharge order creation, and live transfer progress.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import (
    get_current_user_optional, get_db, get_guest_session_id_optional
)
from app.db.redis import get_cached_idempotency, save_cached_idempotency
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.pricing_repo import PricingRepository
from app.db.repositories.recharge_repo import RechargeRepository
from app.modules.operators.session_manager import OperatorSessionService
from app.modules.orders.schemas import OrderDetailResponse
from app.modules.orders.service import OrdersService
from app.modules.pricing.service import PricingService
from app.modules.recharge.schemas import (
    CreateRechargeOrderRequest, RechargeOrderResponse
)
from app.modules.recharge.service import RechargeService
from app.modules.transfers.engine import TransferEngine

router = APIRouter(prefix="/recharge", tags=["Recharge"])


@router.post("/orders", response_model=RechargeOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_recharge_order(
    payload: CreateRechargeOrderRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if idempotency_key:
        cached = await get_cached_idempotency(idempotency_key)
        if cached:
            return cached[1]

    orders_repo = OrdersRepository(db)
    recharge_repo = RechargeRepository(db)
    pricing_repo = PricingRepository(db)
    pricing_service = PricingService(pricing_repo)

    service = RechargeService(orders_repo, recharge_repo, pricing_service)
    user_id = user["sub"] if user else None

    result = await service.create_recharge_order(
        operator_code=payload.operator_code,
        recharge_mobile_number=payload.recharge_mobile_number,
        recharge_amount_bdt=payload.recharge_amount_bdt,
        user_id=user_id,
        guest_session_id=guest_session_id
    )

    if idempotency_key:
        cacheable = result.copy()
        for k, v in cacheable.items():
            if hasattr(v, "__str__") and not isinstance(v, (int, bool, str, type(None))):
                cacheable[k] = str(v)
        await save_cached_idempotency(idempotency_key, 201, cacheable)

    return result


@router.get("/orders/{order_id}/progress")
async def get_recharge_transfer_progress(
    order_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Returns live outgoing recharge transfer progress, chunk status, and completion details.
    """
    session_service = OperatorSessionService(db)
    transfer_engine = TransferEngine(db, session_service)
    return await transfer_engine.get_transfer_progress(order_id)


@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
async def get_recharge_order(
    order_id: str,
    tracking_token: Optional[str] = None,
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
