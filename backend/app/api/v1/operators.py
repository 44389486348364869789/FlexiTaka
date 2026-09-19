"""
Operators Router.
"""

from typing import List
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import get_db
from app.core.exceptions import NotFoundException
from app.modules.operators.schemas import OperatorListResponse, OperatorResponse
from app.modules.operators.service import OperatorService

router = APIRouter(prefix="/operators", tags=["Operators"])


@router.get("", response_model=OperatorListResponse)
async def list_operators(db: AsyncIOMotorDatabase = Depends(get_db)):
    service = OperatorService(db)
    operators = await service.get_all_operators()
    return {"success": True, "operators": operators}


@router.get("/{operator_code}", response_model=OperatorResponse)
async def get_operator(operator_code: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    service = OperatorService(db)
    op = await service.get_operator(operator_code.upper())
    if not op:
        raise NotFoundException(f"Operator {operator_code} not found")
    return op
