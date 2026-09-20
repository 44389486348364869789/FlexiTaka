"""
ZendSMS Gateway Adapter.
Implements the ZendSMS OTP Send and Verify API with strict secret isolation.
"""

from typing import Optional, Dict, Any
import httpx
from app.core.logging import logger
from app.modules.auth.sms.base import SMSProvider, SMSResult


def mask_phone(phone: str) -> str:
    """Mask phone for safe logging, e.g. 017****5678."""
    cleaned = "".join(c for c in phone if c.isdigit())
    if len(cleaned) >= 8:
        return f"{cleaned[:3]}****{cleaned[-4:]}"
    return "***"


class ZendSMSProvider(SMSProvider):
    name: str = "zendsms"
    handles_external_verification: bool = True

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.zendsms.com",
        sender_id: str = "8809612781023",
        brand: str = "FlexiTaka",
        expiry: int = 300,
        timeout_seconds: float = 8.0,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.sender_id = sender_id
        self.brand = brand
        self.expiry = expiry
        self.timeout = timeout_seconds

    def _normalize_recipient(self, phone: str) -> str:
        """Normalize to Bangladesh international format: 8801XXXXXXXXX."""
        cleaned = "".join(c for c in phone if c.isdigit())
        if cleaned.startswith("8801") and len(cleaned) == 13:
            return cleaned
        if cleaned.startswith("01") and len(cleaned) == 11:
            return "88" + cleaned
        if cleaned.startswith("1") and len(cleaned) == 10:
            return "880" + cleaned
        if cleaned.startswith("880") and len(cleaned) >= 13:
            return cleaned
        return "88" + cleaned.lstrip("88")

    async def send_otp(self, phone: str, otp: Optional[str] = None) -> SMSResult:
        if not self.api_key:
            logger.error("ZendSMS delivery aborted: ZENDSMS_API_KEY is not configured")
            return SMSResult(
                success=False,
                provider=self.name,
                error_message="SMS gateway credentials not configured"
            )

        recipient = self._normalize_recipient(phone)
        url = f"{self.base_url}/api/v1/otp/send"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        payload: Dict[str, Any] = {
            "sender_id": self.sender_id,
            "recipient": recipient,
            "expiry": self.expiry,
            "brand": self.brand
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)

                status_code = response.status_code
                try:
                    data = response.json()
                except Exception:
                    data = {}

                # ZendSMS response inspection
                # Typical fields: success, code, message, data: { otp_id, recipient, ... }
                success_flag = data.get("success", None)
                code_flag = data.get("code", None)
                status_flag = str(data.get("status", "")).lower()

                # Determine whether response indicates success:
                is_success = False
                if status_code in (200, 201, 202):
                    if success_flag is True:
                        is_success = True
                    elif success_flag is None:
                        if code_flag in (200, 201, None) and status_flag not in ("error", "failed", "rejected"):
                            is_success = True

                if not is_success:
                    err_msg = data.get("message") or f"ZendSMS error (status {status_code})"
                    logger.error(
                        "ZendSMS rejected OTP dispatch for %s: %s (status: %d)",
                        mask_phone(phone),
                        err_msg,
                        status_code
                    )
                    return SMSResult(
                        success=False,
                        provider=self.name,
                        error_message=err_msg,
                        raw_status_code=status_code
                    )

                # Extract otp_id / reference
                nested_data = data.get("data") if isinstance(data.get("data"), dict) else {}
                otp_id = str(
                    data.get("otp_id")
                    or nested_data.get("otp_id")
                    or data.get("message_id")
                    or nested_data.get("message_id")
                    or data.get("id")
                    or nested_data.get("id")
                    or ""
                ).strip()

                logger.info(
                    "ZendSMS OTP successfully dispatched for %s (otp_id: %s)",
                    mask_phone(phone),
                    otp_id or "N/A"
                )
                return SMSResult(
                    success=True,
                    provider=self.name,
                    otp_id=otp_id or None,
                    message_id=otp_id or None,
                    raw_status_code=status_code
                )

        except httpx.TimeoutException:
            logger.error("ZendSMS request timed out for %s", mask_phone(phone))
            return SMSResult(
                success=False,
                provider=self.name,
                error_message="Gateway request timed out"
            )
        except Exception as e:
            logger.error("ZendSMS connection exception for %s: %s", mask_phone(phone), type(e).__name__)
            return SMSResult(
                success=False,
                provider=self.name,
                error_message=f"Gateway connection error: {type(e).__name__}"
            )

    async def verify_otp(self, phone: str, otp: str, otp_id: Optional[str] = None) -> bool:
        """
        Official ZendSMS OTP Verify API adapter.
        Post payload: { "recipient": recipient, "otp": otp, "otp_id": otp_id }
        """
        if not self.api_key:
            logger.error("ZendSMS verification aborted: ZENDSMS_API_KEY is not configured")
            return False

        recipient = self._normalize_recipient(phone)
        url = f"{self.base_url}/api/v1/otp/verify"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        payload: Dict[str, Any] = {
            "recipient": recipient,
            "otp": str(otp).strip()
        }
        if otp_id and otp_id != "active":
            payload["otp_id"] = str(otp_id).strip()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code in (200, 201):
                    try:
                        data = res.json()
                    except Exception:
                        return False

                    if data.get("success") is True or data.get("valid") is True:
                        logger.info("ZendSMS OTP verification SUCCESS for %s", mask_phone(phone))
                        return True
                    if data.get("code") in (200, 201) and data.get("success") is not False:
                        logger.info("ZendSMS OTP verification SUCCESS for %s", mask_phone(phone))
                        return True
                    if str(data.get("status", "")).lower() in ("success", "valid", "verified"):
                        logger.info("ZendSMS OTP verification SUCCESS for %s", mask_phone(phone))
                        return True

                    logger.warning("ZendSMS OTP verify rejected for %s: %s", mask_phone(phone), data.get("message", "Invalid code"))
                    return False
                else:
                    logger.warning(
                        "ZendSMS OTP verify failed for %s (status: %d)",
                        mask_phone(phone),
                        res.status_code
                    )
                    return False
        except Exception as e:
            logger.error("ZendSMS OTP verify exception for %s: %s", mask_phone(phone), type(e).__name__)
            return False

    async def check_health(self) -> bool:
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(
                    f"{self.base_url}/api/v1/health",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return res.status_code == 200
        except Exception:
            return False
