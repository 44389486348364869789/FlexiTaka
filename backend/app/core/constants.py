"""
Master Enums and Constants for FlexiTaka.
Adheres strictly to FlexiTaka Backend Development Master Specification.
"""

from enum import Enum
from decimal import Decimal, ROUND_HALF_UP


class ServiceType(str, Enum):
    CASH_OUT = "CASH_OUT"
    RECHARGE = "RECHARGE"


class CashOutStatus(str, Enum):
    REQUESTED = "REQUESTED"
    WAITING_FOR_TRANSFER = "WAITING_FOR_TRANSFER"
    TRANSFER_RECEIVED = "TRANSFER_RECEIVED"
    UNDER_VERIFICATION = "UNDER_VERIFICATION"
    APPROVED = "APPROVED"
    PAYOUT_PROCESSING = "PAYOUT_PROCESSING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class RechargeStatus(str, Enum):
    REQUESTED = "REQUESTED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAYMENT_VERIFIED = "PAYMENT_VERIFIED"
    RECHARGE_PROCESSING = "RECHARGE_PROCESSING"
    COMPLETED = "COMPLETED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class PayoutStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SENT = "SENT"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class SupportStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_USER = "WAITING_FOR_USER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class AdminRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    SUPPORT = "SUPPORT"
    FINANCE = "FINANCE"
    VERIFIER = "VERIFIER"
    OPERATIONS = "OPERATIONS"


class OperatorCode(str, Enum):
    GP = "GP"
    ROBI = "ROBI"
    BANGLALINK = "BANGLALINK"


class PayoutMethod(str, Enum):
    BKASH = "BKASH"
    NAGAD = "NAGAD"
    BANK = "BANK"


class SimStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"
    MAINTENANCE = "MAINTENANCE"


class InventoryMovementType(str, Enum):
    TRANSFER_RECEIVED = "TRANSFER_RECEIVED"
    RECHARGE_CONSUMED = "RECHARGE_CONSUMED"
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"
    REVERSAL = "REVERSAL"
    CORRECTION = "CORRECTION"


class ActorType(str, Enum):
    SYSTEM = "SYSTEM"
    USER = "USER"
    GUEST = "GUEST"
    STAFF = "STAFF"


class ErrorCode(str, Enum):
    AUTH_REQUIRED = "AUTH_REQUIRED"
    INVALID_OTP = "INVALID_OTP"
    INVALID_MOBILE_NUMBER = "INVALID_MOBILE_NUMBER"
    INVALID_OPERATOR = "INVALID_OPERATOR"
    INVALID_AMOUNT = "INVALID_AMOUNT"
    AMOUNT_OUT_OF_RANGE = "AMOUNT_OUT_OF_RANGE"
    OTP_REQUIRED = "OTP_REQUIRED"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    ORDER_NOT_FOUND = "ORDER_NOT_FOUND"
    INVALID_ORDER_STATUS = "INVALID_ORDER_STATUS"
    PROOF_REQUIRED = "PROOF_REQUIRED"
    PROOF_INVALID = "PROOF_INVALID"
    PAYMENT_REQUIRED = "PAYMENT_REQUIRED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    PAYOUT_FAILED = "PAYOUT_FAILED"
    PAYOUT_ALREADY_EXISTS = "PAYOUT_ALREADY_EXISTS"
    DUPLICATE_REQUEST = "DUPLICATE_REQUEST"
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    RATE_LIMITED = "RATE_LIMITED"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    FILE_TYPE_NOT_ALLOWED = "FILE_TYPE_NOT_ALLOWED"
    RECEIVING_SIM_UNAVAILABLE = "RECEIVING_SIM_UNAVAILABLE"
    INVALID_PAYOUT_METHOD = "INVALID_PAYOUT_METHOD"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"


# Allowed state transitions for Cash Out
CASHOUT_ALLOWED_TRANSITIONS = {
    CashOutStatus.REQUESTED: {CashOutStatus.WAITING_FOR_TRANSFER, CashOutStatus.CANCELLED},
    CashOutStatus.WAITING_FOR_TRANSFER: {CashOutStatus.TRANSFER_RECEIVED, CashOutStatus.CANCELLED},
    CashOutStatus.TRANSFER_RECEIVED: {CashOutStatus.UNDER_VERIFICATION, CashOutStatus.CANCELLED},
    CashOutStatus.UNDER_VERIFICATION: {CashOutStatus.APPROVED, CashOutStatus.REJECTED, CashOutStatus.CANCELLED},
    CashOutStatus.APPROVED: {CashOutStatus.PAYOUT_PROCESSING, CashOutStatus.CANCELLED},
    CashOutStatus.PAYOUT_PROCESSING: {CashOutStatus.COMPLETED, CashOutStatus.REJECTED},
    CashOutStatus.COMPLETED: set(),  # Terminal
    CashOutStatus.REJECTED: set(),   # Terminal
    CashOutStatus.CANCELLED: set(),  # Terminal
}

# Allowed state transitions for Recharge
RECHARGE_ALLOWED_TRANSITIONS = {
    RechargeStatus.REQUESTED: {RechargeStatus.PAYMENT_PENDING, RechargeStatus.CANCELLED},
    RechargeStatus.PAYMENT_PENDING: {RechargeStatus.PAYMENT_VERIFIED, RechargeStatus.PAYMENT_FAILED, RechargeStatus.CANCELLED},
    RechargeStatus.PAYMENT_VERIFIED: {RechargeStatus.RECHARGE_PROCESSING, RechargeStatus.CANCELLED},
    RechargeStatus.RECHARGE_PROCESSING: {RechargeStatus.COMPLETED, RechargeStatus.REJECTED},
    RechargeStatus.COMPLETED: set(),       # Terminal
    RechargeStatus.PAYMENT_FAILED: set(),  # Terminal
    RechargeStatus.REJECTED: set(),        # Terminal
    RechargeStatus.CANCELLED: set(),       # Terminal
}


def bdt_to_poisha(amount_bdt: Decimal | str | int) -> int:
    """Convert BDT (e.g. 100.50) to integer poisha (10050) using Decimal with standard rounding."""
    dec = Decimal(str(amount_bdt))
    return int((dec * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def poisha_to_bdt(poisha: int) -> Decimal:
    """Convert integer poisha (10050) to Decimal BDT (100.50)."""
    return (Decimal(poisha) / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
