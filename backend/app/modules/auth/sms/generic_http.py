"""
Generic Configurable HTTP SMS Gateway Adapter.
Supports external HTTP SMS gateways via configurable endpoints, auth headers, and path mappings.
"""

from typing import Optional, Dict, Any
import httpx
from app.core.logging import logger
from app.modules.auth.sms.base import SMSProvider, SMSResult


def mask_phone(phone: str) -> str:
    """Mask phone for safe logging, e.g. 017****5678."""
    if len(phone) >= 8:
        return f"{phone[:3]}****{phone[-4:]}"
    return "***"


class GenericHttpSMSProvider(SMSProvider):
    name: str = "generic_http"

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        auth_header: str = "Authorization",
        auth_scheme: str = "Bearer",
        send_path: str = "/api/v1/sms/send",
        verify_path: Optional[str] = None,
        sender_id: Optional[str] = "FlexiTaka",
        timeout_seconds: float = 8.0,
    ):
        self.base_url = (base_url or "").rstrip("/")
        self.api_key = api_key
        self.auth_header = auth_header
        self.auth_scheme = auth_scheme
        self.send_path = "/" + send_path.lstrip("/") if send_path else "/api/v1/sms/send"
        self.verify_path = ("/" + verify_path.lstrip("/")) if verify_path else None
        self.sender_id = sender_id
        self.timeout = timeout_seconds

    def _build_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if self.api_key:
            auth_val = f"{self.auth_scheme} {self.api_key}".strip() if self.auth_scheme else self.api_key
            headers[self.auth_header] = auth_val
        return headers

    async def send_otp(self, phone: str, otp: Optional[str] = None) -> SMSResult:
        if not self.base_url:
            logger.error("Generic SMS delivery aborted: SMS_API_BASE_URL is not configured")
            return SMSResult(
                success=False,
                provider=self.name,
                error_message="SMS API base URL not configured"
            )

        effective_otp = otp or "123456"
        url = f"{self.base_url}{self.send_path}"
        headers = self._build_headers()
        payload = {
            "phone": phone,
            "to": phone,
            "otp": effective_otp,
            "sender_id": self.sender_id,
            "message": f"Your FlexiTaka verification code is {effective_otp}. Valid for 5 minutes."
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                status_code = response.status_code

                if status_code in (200, 201, 202):
                    try:
                        data = response.json()
                    except Exception:
                        data = {}

                    # Inspect success indicators if response is JSON
                    status_flag = str(data.get("status", "")).lower()
                    success_flag = data.get("success", None)

                    if success_flag is False or status_flag in ("error", "failed", "rejected"):
                        err_msg = data.get("message", "Generic SMS provider rejected request")
                        logger.error(
                            "Generic SMS rejected OTP dispatch for %s: %s",
                            mask_phone(phone),
                            err_msg
                        )
                        return SMSResult(
                            success=False,
                            provider=self.name,
                            error_message=err_msg,
                            raw_status_code=status_code
                        )

                    msg_id = str(data.get("message_id") or data.get("id") or data.get("data", {}).get("id") or "")
                    logger.info("Generic SMS OTP dispatched for %s (msg_id: %s)", mask_phone(phone), msg_id or "N/A")
                    return SMSResult(
                        success=True,
                        provider=self.name,
                        message_id=msg_id or None,
                        raw_status_code=status_code
                    )
                else:
                    logger.error(
                        "Generic SMS HTTP delivery error for %s: status %d",
                        mask_phone(phone),
                        status_code
                    )
                    return SMSResult(
                        success=False,
                        provider=self.name,
                        error_message=f"Gateway responded with status {status_code}",
                        raw_status_code=status_code
                    )

        except httpx.TimeoutException:
            logger.error("Generic SMS gateway timed out for %s", mask_phone(phone))
            return SMSResult(
                success=False,
                provider=self.name,
                error_message="Gateway request timed out"
            )
        except Exception as e:
            logger.error("Generic SMS connection exception for %s: %s", mask_phone(phone), type(e).__name__)
            return SMSResult(
                success=False,
                provider=self.name,
                error_message=f"Gateway connection error: {type(e).__name__}"
            )

    async def verify_otp(self, phone: str, otp: str, otp_id: Optional[str] = None) -> bool:
        if not self.base_url or not self.verify_path:
            # If no external verify endpoint is configured, rely on Redis verification
            return True

        url = f"{self.base_url}{self.verify_path}"
        headers = self._build_headers()
        payload = {"phone": phone, "otp": otp}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("valid", True) or str(data.get("status", "")).lower() == "success"
                return False
        except Exception:
            return False

    async def check_health(self) -> bool:
        if not self.base_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(f"{self.base_url}/health", headers=self._build_headers())
                return res.status_code == 200
        except Exception:
            return False
