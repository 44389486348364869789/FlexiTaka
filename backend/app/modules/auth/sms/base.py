"""
SMS Provider Base Class and Result Schema.
Defines the contract for all SMS gateways in FlexiTaka.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class SMSResult:
    success: bool
    provider: str
    message_id: Optional[str] = None
    otp_id: Optional[str] = None
    error_message: Optional[str] = None
    raw_status_code: Optional[int] = None


class SMSProvider(ABC):
    """Abstract SMS Provider interface."""

    name: str = "base"
    handles_external_verification: bool = False

    @abstractmethod
    async def send_otp(self, phone: str, otp: Optional[str] = None) -> SMSResult:
        """
        Send an OTP code to a normalized Bangladeshi phone number.
        When provider generates OTP itself, otp may be None.
        Returns SMSResult indicating success or failure.
        """
        pass

    async def verify_otp(self, phone: str, otp: str, otp_id: Optional[str] = None) -> bool:
        """
        Verify an OTP if provider handles external verification.
        Default delegates validation to the local/Redis layer.
        """
        return True

    async def check_health(self) -> bool:
        """
        Perform a health/connectivity check against the gateway.
        """
        return True
