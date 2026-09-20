"""
Mock SMS Provider for local development and unit tests.
Allows inspecting dispatched messages without hitting real external networks.
"""

from typing import List, Dict, Any, Optional
from app.modules.auth.sms.base import SMSProvider, SMSResult


class MockSMSProvider(SMSProvider):
    name: str = "mock"

    def __init__(self, should_fail: bool = False, failure_reason: Optional[str] = None):
        self.should_fail = should_fail
        self.failure_reason = failure_reason or "Simulated SMS failure"
        self.sent_messages: List[Dict[str, Any]] = []

    async def send_otp(self, phone: str, otp: Optional[str] = None) -> SMSResult:
        if self.should_fail:
            return SMSResult(
                success=False,
                provider=self.name,
                error_message=self.failure_reason,
                raw_status_code=500
            )

        msg_id = f"mock-msg-{len(self.sent_messages) + 1}"
        effective_otp = otp or "123456"
        self.sent_messages.append({
            "phone": phone,
            "otp": effective_otp,
            "message_id": msg_id
        })
        return SMSResult(
            success=True,
            provider=self.name,
            otp_id=msg_id,
            message_id=msg_id,
            raw_status_code=200
        )

    async def verify_otp(self, phone: str, otp: str, otp_id: Optional[str] = None) -> bool:
        return True

    async def check_health(self) -> bool:
        return True

    def clear(self):
        self.sent_messages.clear()
