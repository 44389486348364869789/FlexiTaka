"""
Authoritative Operator Resolution and Phone Utilities.
Determines telecom operator from Bangladeshi MSISDN prefix using the central operator-prefix registry.
Enforces strict 11-digit mobile number validation and prevents operator-number tampering server-side.
"""

import re
import time
from typing import Dict, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import OperatorCode
from app.core.exceptions import ValidationException
from app.core.logging import logger

# Authoritative fallback mappings verified against telecom specifications
FALLBACK_PREFIX_MAP: Dict[str, str] = {
    "017": OperatorCode.GP.value,
    "013": OperatorCode.GP.value,
    "019": OperatorCode.BANGLALINK.value,
    "014": OperatorCode.BANGLALINK.value,
    "018": OperatorCode.ROBI.value,
    "016": OperatorCode.ROBI.value,
}

# In-memory registry cache with TTL for ultra-fast validation
_PREFIX_CACHE: Dict[str, str] = {}
_LAST_CACHE_UPDATE: float = 0.0
_CACHE_TTL_SECONDS: float = 300.0  # 5 minutes


async def refresh_prefix_cache(db: Optional[AsyncIOMotorDatabase] = None) -> Dict[str, str]:
    """Refreshes the in-memory operator prefix cache from MongoDB."""
    global _PREFIX_CACHE, _LAST_CACHE_UPDATE
    if db is None:
        if not _PREFIX_CACHE:
            _PREFIX_CACHE = dict(FALLBACK_PREFIX_MAP)
        return _PREFIX_CACHE

    try:
        from app.db.repositories.operator_prefix_repo import OperatorPrefixRepository
        repo = OperatorPrefixRepository(db)
        fresh_map = await repo.get_active_prefix_map()
        if fresh_map:
            _PREFIX_CACHE = fresh_map
            _LAST_CACHE_UPDATE = time.time()
            return _PREFIX_CACHE
    except Exception as e:
        logger.warning("Could not refresh operator prefix cache from DB: %s. Using in-memory fallback.", e)

    if not _PREFIX_CACHE:
        _PREFIX_CACHE = dict(FALLBACK_PREFIX_MAP)
    return _PREFIX_CACHE


def get_cached_prefix_map() -> Dict[str, str]:
    """Synchronous read of currently active operator prefixes."""
    if not _PREFIX_CACHE:
        return dict(FALLBACK_PREFIX_MAP)
    return _PREFIX_CACHE


def update_memory_cache(mapping: Dict[str, str]) -> None:
    """Updates the in-memory operator prefix cache synchronously."""
    global _PREFIX_CACHE, _LAST_CACHE_UPDATE
    _PREFIX_CACHE = dict(mapping)
    _LAST_CACHE_UPDATE = time.time()



def normalize_msisdn(phone: str) -> str:
    """
    Normalizes any valid Bangladeshi mobile number format strictly into 11 digits starting with '01'.
    Rejects numbers < 11 digits, > 11 digits, letters, or invalid characters.
    Examples:
        '+8801725352007' -> '01725352007'
        '8801725352007'  -> '01725352007'
        '01725352007'    -> '01725352007'
    """
    raw_str = str(phone or "").strip()
    if not raw_str:
        raise ValidationException(
            "Enter a valid 11-digit mobile number. / সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।",
            code="INVALID_MOBILE_NUMBER"
        )

    clean = re.sub(r"[\s\-\+\(\)]", "", raw_str)

    # Strip country code prefixes safely
    if clean.startswith("880"):
        clean = clean[2:]
    elif clean.startswith("88"):
        clean = clean[2:]

    # Strictly require exactly 11 numeric digits starting with '01'
    if len(clean) != 11 or not re.match(r"^01\d{9}$", clean):
        raise ValidationException(
            f"Enter a valid 11-digit mobile number (provided '{phone}'). / সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।",
            code="INVALID_MOBILE_NUMBER",
            details={"input": phone, "normalized": clean, "length": len(clean)}
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


def resolve_operator_from_msisdn(phone: str, custom_prefix_map: Optional[Dict[str, str]] = None) -> str:
    """
    Resolves operator code authoritatively based on Bangladeshi 3-digit prefix.
    GP: 017, 013
    Banglalink: 019, 014
    Robi/Airtel: 018, 016
    """
    clean = normalize_msisdn(phone)
    prefix = clean[:3]

    mapping = custom_prefix_map if custom_prefix_map is not None else get_cached_prefix_map()
    op = mapping.get(prefix)

    if op:
        return op.upper()

    raise ValidationException(
        f"Unsupported operator prefix '{prefix}'. Only verified mobile operators are supported. / অননুমোদিত অপারেটর প্রিফিক্স '{prefix}'।",
        code="UNSUPPORTED_OPERATOR_PREFIX",
        details={"prefix": prefix, "phone": clean}
    )


def validate_operator_match(selected_operator: Any, phone: str, custom_prefix_map: Optional[Dict[str, str]] = None) -> str:
    """
    Strict server-side validation ensuring user-selected operator matches the phone number prefix.
    Stops unauthorized or mismatched operations before any financial transaction is processed.
    """
    detected_op = resolve_operator_from_msisdn(phone, custom_prefix_map=custom_prefix_map)
    if hasattr(selected_operator, "value"):
        sel_op = str(selected_operator.value).upper().strip()
    else:
        sel_op = str(selected_operator or "").upper().strip()
        if "." in sel_op:
            sel_op = sel_op.split(".")[-1]

    if sel_op != detected_op:
        raise ValidationException(
            "The selected operator does not match this mobile number. / নির্বাচিত অপারেটর এই মোবাইল নম্বরের সাথে মিলছে না।",
            code="OPERATOR_NUMBER_MISMATCH",
            details={
                "selected_operator": sel_op,
                "detected_operator": detected_op,
                "phone": normalize_msisdn(phone)
            }
        )
    return detected_op


resolve_operator = resolve_operator_from_msisdn
