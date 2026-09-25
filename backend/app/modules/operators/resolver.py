"""
Operator Resolution and Phone Utilities.
Authoritatively determines telecom operator from Bangladeshi MSISDN prefix.
Prevents frontend tampering by verifying operator strictly server-side.
"""

import re
from typing import Optional
from app.core.constants import OperatorCode
from app.core.exceptions import ValidationException


def normalize_msisdn(phone: str) -> str:
    """
    Normalizes any Bangladeshi mobile number format into 11-digit format starting with '01'.
    Examples:
        '+8801725352007' -> '01725352007'
        '8801725352007'  -> '01725352007'
        '01725352007'    -> '01725352007'
    """
    clean = re.sub(r"[\s\-\+\(\)]", "", str(phone or "").strip())
    if clean.startswith("880"):
        clean = clean[2:]
    elif clean.startswith("+880"):
        clean = clean[3:]
    elif clean.startswith("88"):
        clean = clean[2:]

    if not re.match(r"^01[3-9]\d{8}$", clean):
        raise ValidationException(
            f"Invalid Bangladeshi mobile number: '{phone}'. Must be an 11-digit number starting with 01.",
            code="INVALID_MOBILE_NUMBER"
        )
    return clean


def format_msisdn_with_prefix(phone: str, prefix: str = "88") -> str:
    """Formats 01XXXXXXXXX as 8801XXXXXXXXX or +8801XXXXXXXXX."""
    normalized = normalize_msisdn(phone)
    if prefix == "+88":
        return f"+88{normalized}"
    elif prefix == "88":
        return f"88{normalized}"
    return normalized


def resolve_operator_from_msisdn(phone: str) -> OperatorCode:
    """
    Resolves operator code authoritatively based on Bangladeshi 3-digit prefix.
    GP: 017, 013
    Banglalink: 019, 014
    Robi/Airtel: 018, 016
    """
    clean = normalize_msisdn(phone)
    prefix = clean[:3]

    if prefix in ("017", "013"):
        return OperatorCode.GP
    elif prefix in ("019", "014"):
        return OperatorCode.BANGLALINK
    elif prefix in ("018", "016"):
        return OperatorCode.ROBI
    else:
        raise ValidationException(
            f"Unsupported operator prefix '{prefix}'. Only GP, Banglalink, and Robi are currently supported.",
            code="UNSUPPORTED_OPERATOR"
        )
