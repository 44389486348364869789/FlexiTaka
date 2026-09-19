"""
Operator Schemas.
"""

from typing import List, Optional
from pydantic import BaseModel
from app.core.constants import OperatorCode


class OperatorResponse(BaseModel):
    operator_code: OperatorCode
    name: str
    display_name: str
    status: str
    logo_key: Optional[str] = None
    supported_services: List[str]


class OperatorListResponse(BaseModel):
    success: bool = True
    operators: List[OperatorResponse]
