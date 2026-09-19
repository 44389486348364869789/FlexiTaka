"""
Pricing Engine Router.
Calculates fee quotes and discount quotes dynamically on the server.
"""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import get_db
from app.db.repositories.pricing_repo import PricingRepository
from app.modules.pricing.schemas import (
    CashOutQuoteRequest, CashOutQuoteResponse,
    RechargeQuoteRequest, RechargeQuoteResponse
)
from app.modules.pricing.service import PricingService

router = APIRouter(prefix="/pricing", tags=["Pricing"])


@router.post("/cashout-quote", response_model=CashOutQuoteResponse)
async def get_cashout_quote(
    payload: CashOutQuoteRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    repo = PricingRepository(db)
    service = PricingService(repo)
    return await service.calculate_cashout_quote(payload.operator_code, payload.amount_bdt)


@router.post("/recharge-quote", response_model=RechargeQuoteResponse)
async def get_recharge_quote(
    payload: RechargeQuoteRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    repo = PricingRepository(db)
    service = PricingService(repo)
    return await service.calculate_recharge_quote(payload.operator_code, payload.recharge_amount_bdt)
