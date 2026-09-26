"""
Base Operator Adapter Interface for FlexiTaka.
Provides an authoritative abstract contract for all telecom operator integrations (GP, Banglalink, Robi).
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


from app.core.constants import QuotaWindowType, TransferAuthMode


class BaseOperatorAdapter(ABC):
    @property
    @abstractmethod
    def operator_code(self) -> str:
        """Returns the operator code string, e.g. GP, BANGLALINK, ROBI."""
        pass

    @property
    @abstractmethod
    def default_transfer_limit(self) -> int:
        """Max BDT allowed per single transfer transaction (e.g. 100 BDT)."""
        pass

    @property
    @abstractmethod
    def default_cooldown_seconds(self) -> int:
        """Cooldown period between transfers if required (e.g. 1800s for Banglalink, 0 for others)."""
        pass

    @property
    def transfer_auth_mode(self) -> TransferAuthMode:
        """
        Operator transfer authentication mode:
        - SESSION_PLUS_PIN: 1 login OTP authenticates SIM/session; multiple transfers reuse session/PIN.
        - OTP_PER_TRANSFER: Each individual balance transfer requires a fresh one-time OTP.
        - OTP_FOR_PIN_SETUP_ONLY: OTP is for PIN setup/reset, then valid PIN/session is reused.
        """
        return TransferAuthMode.SESSION_PLUS_PIN

    @property
    def same_otp_pin_setup(self) -> bool:
        """Whether the operator allows PIN setup/reset within the same authenticated session without an extra OTP."""
        return False

    @property
    def pin_required(self) -> bool:
        """Whether transfers require a 4-digit PIN (True for GP/BL, False for Robi which uses per-transfer OTP)."""
        return True

    @property
    def window_type(self) -> QuotaWindowType:
        """Quota tracking window type: CALENDAR_MONTH, ROLLING_30_DAYS, or DAILY."""
        return QuotaWindowType.CALENDAR_MONTH

    @property
    def min_transfer_amount_bdt(self) -> int:
        """Minimum transfer amount in BDT."""
        return 10

    @property
    def daily_amount_limit_bdt(self) -> Optional[int]:
        """Max BDT transfer limit per day, if enforced."""
        return None

    @property
    def monthly_amount_limit_bdt(self) -> Optional[int]:
        """Max BDT transfer limit per monthly window, if enforced."""
        return None

    @property
    def monthly_transfer_count_limit(self) -> Optional[int]:
        """Max transfer count per monthly window, if enforced."""
        return None

    async def request_transfer_otp(
        self,
        msisdn: str,
        recipient_msisdn: str,
        amount_bdt: int,
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Requests a per-transfer OTP for OTP_PER_TRANSFER operators (e.g. Robi).
        Returns: { 'success': bool, 'reference_id': Optional[str], 'message': str }
        """
        return {"success": True, "message": "Per-transfer OTP not required for this operator."}

    async def process_transfer_otp(
        self,
        msisdn: str,
        recipient_msisdn: str,
        amount_bdt: int,
        otp: str,
        reference_id: Optional[str],
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes balance transfer using a transaction OTP for OTP_PER_TRANSFER operators.
        """
        return {"success": False, "message": "process_transfer_otp not supported by this operator adapter."}

    @abstractmethod
    async def send_login_otp(self, msisdn: str) -> Dict[str, Any]:
        """
        Requests login/authentication OTP from the operator.
        Returns: { "success": bool, "reference_id": Optional[str], "expires_in": Optional[int], "message": str }
        """
        pass

    @abstractmethod
    async def verify_login_otp(self, msisdn: str, otp: str, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Verifies login OTP with operator API.
        Returns: {
            "success": bool,
            "access_token": str,
            "refresh_token": Optional[str],
            "expire_at": int,
            "user_id": Optional[str],
            "customer_account_id": Optional[str],
            "extra_data": dict,
            "message": str
        }
        """
        pass

    @abstractmethod
    async def refresh_session(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Refreshes expired access token using refresh_token.
        Returns: {
            "success": bool,
            "access_token": str,
            "refresh_token": Optional[str],
            "expire_at": int,
            "message": str
        }
        """
        pass

    @abstractmethod
    async def get_balance(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fetches current SIM balance and validity from operator.
        Returns: {
            "success": bool,
            "balance_bdt": float,
            "raw_balance": str,
            "expiry_date": Optional[str],
            "extra": dict,
            "message": str
        }
        """
        pass

    @abstractmethod
    async def validate_recipient(self, msisdn: str, recipient_msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates target recipient number before balance transfer.
        Returns: { "success": bool, "is_valid": bool, "message": str }
        """
        pass

    @abstractmethod
    async def transfer_balance(
        self,
        msisdn: str,
        recipient_msisdn: str,
        amount_bdt: int,
        pin: str,
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes a balance transfer of amount_bdt (must be <= default_transfer_limit).
        Returns: {
            "success": bool,
            "transaction_reference": Optional[str],
            "amount_transferred": int,
            "fee": float,
            "cooldown_seconds": int,
            "message": str,
            "error_code": Optional[str]
        }
        """
        pass

    @abstractmethod
    async def initiate_pin_reset(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiates forgot PIN / PIN reset flow (OTP #2).
        Returns: { "success": bool, "reference_id": Optional[str], "message": str }
        """
        pass

    @abstractmethod
    async def verify_pin_reset_otp(self, msisdn: str, otp: str, session_data: Dict[str, Any], reference_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Verifies PIN reset OTP (OTP #2).
        Returns: { "success": bool, "message": str }
        """
        pass

    @abstractmethod
    async def set_or_reset_pin(self, msisdn: str, new_pin: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sets or updates the balance transfer PIN.
        Returns: { "success": bool, "message": str }
        """
        pass
