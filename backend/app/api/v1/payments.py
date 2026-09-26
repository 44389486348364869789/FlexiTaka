"""
Payments Router.
Handles payment record submissions and lookups.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import get_db
from app.core.exceptions import NotFoundException
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.payments_repo import PaymentsRepository
from app.db.repositories.payment_accounts_repo import PaymentAccountsRepository
from app.db.repositories.recharge_repo import RechargeRepository
from app.modules.payments.schemas import CreatePaymentRequest, PaymentResponse
from app.modules.payments.service import PaymentsService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: CreatePaymentRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    payments_repo = PaymentsRepository(db)
    orders_repo = OrdersRepository(db)
    recharge_repo = RechargeRepository(db)
    service = PaymentsService(payments_repo, orders_repo, recharge_repo)

    return await service.create_payment(
        order_id=payload.order_id,
        method=payload.method,
        amount_bdt=payload.amount_bdt,
        payer_reference=payload.payer_reference,
        transaction_reference=payload.transaction_reference,
        proof_id=payload.proof_id
    )


@router.get("/accounts", response_model=List[Dict[str, Any]])

async def get_payment_accounts(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns active FlexiTaka payment receiving accounts (bKash, Nagad, Rocket, Bangla QR)
    authoritatively managed in the database.
    """
    repo = PaymentAccountsRepository(db)
    return await repo.get_active_accounts()


@router.get("/{payment_id}")
async def get_payment(payment_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    payments_repo = PaymentsRepository(db)
    payment = await payments_repo.get_by_payment_id(payment_id)
    if not payment:
        raise NotFoundException(f"Payment {payment_id} not found")
    return payment

