"""
Cash Out Router.
Handles quote confirmation, order creation, automated chunk transfer execution,
live transfer progress tracking, and fallback confirmation.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, File, Header, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import (
    get_current_user_optional, get_db, get_guest_session_id_optional
)
from app.db.redis import get_cached_idempotency, save_cached_idempotency
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.pricing_repo import PricingRepository
from app.db.repositories.proofs_repo import ProofsRepository
from app.db.repositories.recharge_repo import RechargeRepository
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.cashout.schemas import (
    CashOutOrderResponse, ConfirmTransferRequest, CreateCashOutOrderRequest,
    ExecuteTransferStepRequest
)
from app.modules.cashout.service import CashOutService
from app.modules.orders.schemas import OrderDetailResponse
from app.modules.orders.service import OrdersService
from app.modules.pricing.service import PricingService
from app.modules.proofs.schemas import ProofUploadResponse
from app.modules.proofs.service import ProofsService

router = APIRouter(prefix="/cashout", tags=["Cash Out"])


@router.post("/orders", response_model=CashOutOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_cashout_order(
    payload: CreateCashOutOrderRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Check Idempotency
    if idempotency_key:
        cached = await get_cached_idempotency(idempotency_key)
        if cached:
            return cached[1]

    pricing_repo = PricingRepository(db)
    pricing_service = PricingService(pricing_repo)
    orders_repo = OrdersRepository(db)
    cashout_repo = CashOutRepository(db)
    sims_repo = ReceivingSimsRepository(db)

    service = CashOutService(orders_repo, cashout_repo, sims_repo, pricing_service, db=db)
    user_id = user["sub"] if user else None

    result = await service.create_cashout_order(
        operator_code=payload.operator_code,
        source_mobile_number=payload.source_mobile_number,
        amount_bdt=str(payload.amount_bdt),
        payout_method=payload.payout_method,
        payout_account=payload.payout_account,
        pin=payload.pin,
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
async def get_transfer_progress(
    order_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Returns real-time balance transfer chunk progress, remaining cooldown seconds, and ledger history.
    """
    pricing_repo = PricingRepository(db)
    pricing_service = PricingService(pricing_repo)
    orders_repo = OrdersRepository(db)
    cashout_repo = CashOutRepository(db)
    sims_repo = ReceivingSimsRepository(db)

    service = CashOutService(orders_repo, cashout_repo, sims_repo, pricing_service, db=db)
    return await service.get_transfer_progress(order_id)


@router.post("/orders/{order_id}/transfer-step")
async def execute_transfer_step(
    order_id: str,
    payload: Optional[ExecuteTransferStepRequest] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Executes next chunk in the transfer plan for this order.
    """
    pricing_repo = PricingRepository(db)
    pricing_service = PricingService(pricing_repo)
    orders_repo = OrdersRepository(db)
    cashout_repo = CashOutRepository(db)
    sims_repo = ReceivingSimsRepository(db)

    service = CashOutService(orders_repo, cashout_repo, sims_repo, pricing_service, db=db)
    pin = payload.pin if payload else None
    return await service.execute_transfer_step(order_id, pin=pin)


@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
async def get_cashout_order(
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


@router.post("/orders/{order_id}/proof", response_model=ProofUploadResponse)
async def upload_transfer_proof(
    order_id: str,
    file: UploadFile = File(...),
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    proofs_repo = ProofsRepository(db)
    orders_repo = OrdersRepository(db)
    cashout_repo = CashOutRepository(db)
    proof_service = ProofsService(proofs_repo, orders_repo)

    uploader_type = "USER" if user else "GUEST"
    uploader_id = user["sub"] if user else (guest_session_id or "unknown")

    uploaded = await proof_service.upload_proof(
        order_id=order_id,
        file=file,
        uploaded_by_type=uploader_type,
        uploaded_by_id=uploader_id
    )

    await cashout_repo.attach_proof(order_id, uploaded["proof_id"])
    return uploaded


@router.post("/orders/{order_id}/confirm-transfer")
async def confirm_transfer(
    order_id: str,
    payload: ConfirmTransferRequest,
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    guest_session_id: Optional[str] = Depends(get_guest_session_id_optional),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    orders_repo = OrdersRepository(db)
    cashout_repo = CashOutRepository(db)
    sims_repo = ReceivingSimsRepository(db)
    pricing_repo = PricingRepository(db)
    pricing_service = PricingService(pricing_repo)

    service = CashOutService(orders_repo, cashout_repo, sims_repo, pricing_service, db=db)
    actor_id = user["sub"] if user else (guest_session_id or "customer")

    updated = await service.confirm_transfer_and_proof(
        order_id=order_id,
        transfer_reference=payload.transfer_reference,
        actor_id=actor_id
    )
    return {
        "success": True,
        "message": "Transfer confirmed and submitted for verification",
        "order_id": order_id,
        "status": updated["status"]
    }
