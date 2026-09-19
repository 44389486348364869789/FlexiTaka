"""
Operator Master Data Service.
Provides authoritative list of telecom operators and seed initialization.
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import OperatorCode, ServiceType
from app.db.repositories.base import BaseRepository


INITIAL_OPERATORS = [
    {
        "operator_code": OperatorCode.GP,
        "name": "Grameenphone",
        "display_name": "Grameenphone (GP)",
        "status": "ACTIVE",
        "logo_key": "operators/gp.png",
        "supported_services": [ServiceType.CASH_OUT, ServiceType.RECHARGE]
    },
    {
        "operator_code": OperatorCode.ROBI,
        "name": "Robi Axiata",
        "display_name": "Robi",
        "status": "ACTIVE",
        "logo_key": "operators/robi.png",
        "supported_services": [ServiceType.CASH_OUT, ServiceType.RECHARGE]
    },
    {
        "operator_code": OperatorCode.BANGLALINK,
        "name": "Banglalink",
        "display_name": "Banglalink",
        "status": "ACTIVE",
        "logo_key": "operators/banglalink.png",
        "supported_services": [ServiceType.CASH_OUT, ServiceType.RECHARGE]
    }
]


class OperatorService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.repo = BaseRepository(db, "operators")

    async def get_all_operators(self) -> List[Dict[str, Any]]:
        operators = await self.repo.find_many({"status": "ACTIVE"}, sort_by=[("operator_code", 1)])
        if not operators:
            # Seed initial operators
            for op in INITIAL_OPERATORS:
                await self.repo.insert_one(op)
            operators = await self.repo.find_many({"status": "ACTIVE"}, sort_by=[("operator_code", 1)])
        return operators

    async def get_operator(self, operator_code: str) -> Optional[Dict[str, Any]]:
        op = await self.repo.find_one({"operator_code": operator_code})
        if not op:
            await self.get_all_operators()  # Trigger seed if empty
            op = await self.repo.find_one({"operator_code": operator_code})
        return op
