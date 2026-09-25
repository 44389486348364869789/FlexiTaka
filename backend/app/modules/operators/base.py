"""
Base Operator Adapter Interface for FlexiTaka.
Provides an authoritative abstract contract for all telecom operator integrations (GP, Banglalink, Robi).
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


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
