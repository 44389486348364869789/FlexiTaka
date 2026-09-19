"""
Payouts Router.
Customer and operational status lookup for payouts.
"""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import get_db
from app.core.constants import poisha_to_bdt
from app.core.exceptions import NotFoundException
from app.db.repositories.payouts_repo import PayoutsRepository
from app.modules.payouts.schemas import PayoutResponse

router = APIRouter(prefix="/payouts", tags=["Payouts"])


@router.get("/{payout_id}", response_model=PayoutResponse)
async def get_payout(payout_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    payouts_repo = PayoutsRepository(db)
    payout = await payouts_repo.get_by_payout_id(payout_id)
    if not payout:
        raise NotFoundException(f"Payout {payout_id} not found")

    amt_poisha = payout["amount"]
    return {
        "payout_id": payout["payout_id"],
        "order_id": payout["order_id"],
        "method": payout["method"],
        "amount_bdt": poisha_to_bdt(amt_poisha),
        "amount_poisha": amt_poisha,
        "recipient_account": payout["recipient_account"],
        "status": payout["status"],
        "provider_reference": payout.get("provider_reference"),
        "processed_by": payout.get("processed_by"),
        "created_at": payout["created_at"],
        "processed_at": payout.get("processed_at")
    }
