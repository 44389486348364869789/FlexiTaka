"""
Unified API v1 Router.
"""

from fastapi import APIRouter
from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.cashout import router as cashout_router
from app.api.v1.gateway import router as gateway_router
from app.api.v1.guests import router as guests_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.operators import router as operators_router
from app.api.v1.orders import router as orders_router
from app.api.v1.payments import router as payments_router
from app.api.v1.payouts import router as payouts_router
from app.api.v1.pricing import router as pricing_router
from app.api.v1.proofs import router as proofs_router
from app.api.v1.recharge import router as recharge_router
from app.api.v1.support import router as support_router
from app.api.v1.user import router as user_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(user_router)
api_v1_router.include_router(guests_router)
api_v1_router.include_router(operators_router)
api_v1_router.include_router(pricing_router)
api_v1_router.include_router(cashout_router)
api_v1_router.include_router(recharge_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(payouts_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(proofs_router)
api_v1_router.include_router(support_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(gateway_router, prefix="/gateway")
