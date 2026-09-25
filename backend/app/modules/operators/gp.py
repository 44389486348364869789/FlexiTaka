"""
Grameenphone (GP) Operator Adapter.
Reverse-engineered MyGP official iOS REST API adapter.
Based directly on `/root/mygp_manager.py`.
"""

import time
import uuid
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.core.constants import OperatorCode
from app.core.exceptions import ExternalServiceException, ValidationException
from app.core.logging import logger
from app.modules.operators.base import BaseOperatorAdapter
from app.modules.operators.resolver import format_msisdn_with_prefix, normalize_msisdn


class GPAdapter(BaseOperatorAdapter):
    def __init__(self, base_url: str = "https://mygp.grameenphone.com/mygpapi"):
        self.base_url = base_url
        self._operator_code = OperatorCode.GP

    @property
    def operator_code(self) -> str:
        return self._operator_code

    @property
    def default_transfer_limit(self) -> int:
        return 100  # GP Telco rule: 10 to 100 BDT per transfer

    @property
    def default_cooldown_seconds(self) -> int:
        return 0  # No mandatory cooldown between chunks unless throttled

    def _build_headers(self, device_id: str, msisdn_88: str, access_token: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Host": "mygp.grameenphone.com",
            "X-REFERENCE-ID": device_id,
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en",
            "User-Agent": "MyGP/53200 CFNetwork/3896.100.1.2.1 Darwin/27.0.0",
            "Connection": "keep-alive",
            "APP-MSISDN-OLD": msisdn_88,
            "ng": "0"
        }
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        return headers

    async def send_login_otp(self, msisdn: str) -> Dict[str, Any]:
        msisdn_88 = format_msisdn_with_prefix(msisdn, prefix="88")
        device_id = str(uuid.uuid4()).upper()

        if getattr(settings, "APP_ENV", "") == "test":
            return {
                "success": True,
                "reference_id": device_id,
                "expires_in": 300,
                "session_context": {"device_id": device_id, "msisdn_88": msisdn_88},
                "message": "OTP sent successfully to Grameenphone SIM."
            }
        headers = self._build_headers(device_id, msisdn_88)
        headers["APP-MSISDN"] = ""

        url = f"{self.base_url}/v2/otp-login?locale=en&msisdn={msisdn_88}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.get(url, headers=headers)
                data = res.json()
                if data.get("result") == "success" or res.status_code == 200:
                    return {
                        "success": True,
                        "reference_id": device_id,
                        "expires_in": 300,
                        "session_context": {"device_id": device_id, "msisdn_88": msisdn_88},
                        "message": "OTP sent successfully to Grameenphone SIM."
                    }
                err_msg = data.get("message") or "Failed to request GP OTP"
                return {"success": False, "message": err_msg}
            except Exception as e:
                logger.error("GP send_login_otp error: %s", e)
                return {"success": False, "message": f"Network error sending GP OTP: {str(e)}"}

    async def verify_login_otp(self, msisdn: str, otp: str, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        msisdn_88 = format_msisdn_with_prefix(msisdn, prefix="88")
        device_id = (session_context or {}).get("device_id") or str(uuid.uuid4()).upper()

        if getattr(settings, "APP_ENV", "") == "test":
            return {
                "success": True,
                "access_token": f"mock_gp_token_{msisdn_88}",
                "refresh_token": f"mock_gp_refresh_{msisdn_88}",
                "token_type": "Bearer",
                "expires_in": 86400,
                "msisdn": msisdn,
                "balance_bdt": 500.0,
                "message": "GP OTP verified successfully."
            }

        headers = self._build_headers(device_id, msisdn_88)
        headers["Content-Type"] = "application/json"

        url = f"{self.base_url}/v2/otp-login?locale=en"
        payload = {
            "device_id": device_id,
            "otp": str(otp).strip(),
            "device_name": "Apple",
            "device_model": "iPhone 16 Pro Max",
            "msisdn": msisdn_88,
            "app_version": "5.32.0"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if "access_token" in data:
                    access_token = data["access_token"]
                    refresh_token = data.get("refresh_token")
                    expire_at = data.get("expire_at", int(time.time()) + 86400)
                    user_id = str(data.get("id"))

                    # Auto register for balance transfer
                    await self._ensure_bt_registered(user_id, device_id, msisdn_88, access_token)

                    return {
                        "success": True,
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "expire_at": expire_at,
                        "user_id": user_id,
                        "customer_account_id": user_id,
                        "extra_data": {
                            "device_id": device_id,
                            "profile_hash": data.get("profile_hash", "")
                        },
                        "message": "GP authentication successful."
                    }
                err_msg = data.get("message") or "Invalid GP OTP."
                return {"success": False, "message": err_msg}
            except Exception as e:
                logger.error("GP verify_login_otp error: %s", e)
                return {"success": False, "message": f"Error verifying GP OTP: {str(e)}"}

    async def _ensure_bt_registered(self, user_id: str, device_id: str, msisdn_88: str, access_token: str) -> None:
        url = f"{self.base_url}/balance/register?locale=en&id={user_id}"
        headers = self._build_headers(device_id, msisdn_88, access_token)
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                await client.get(url, headers=headers)
            except Exception:
                pass

    async def refresh_session(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        refresh_token = session_data.get("refresh_token")
        user_id = session_data.get("user_id")
        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        msisdn_88 = format_msisdn_with_prefix(msisdn, prefix="88")

        if not refresh_token or not user_id:
            return {"success": False, "message": "Missing refresh_token or user_id for GP."}

        url = f"{self.base_url}/v2/oauth/connectid/refresh-token/ios?locale=en&id={user_id}"
        headers = self._build_headers(device_id, msisdn_88)
        headers["Content-Type"] = "application/json"
        payload = {"refresh_token": refresh_token}

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if "access_token" in data:
                    return {
                        "success": True,
                        "access_token": data["access_token"],
                        "refresh_token": data.get("refresh_token", refresh_token),
                        "expire_at": data.get("expire_at", int(time.time()) + 86400),
                        "message": "GP session refreshed successfully."
                    }
                return {"success": False, "message": data.get("message") or "GP token refresh failed."}
            except Exception as e:
                return {"success": False, "message": f"Network error refreshing GP token: {str(e)}"}

    async def get_balance(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        if getattr(settings, "APP_ENV", "") == "test":
            return {
                "success": True,
                "balance_bdt": 500.0,
                "raw_balance": "500.00",
                "expiry_date": "2026-12-31",
                "message": "GP balance fetched successfully."
            }

        user_id = session_data.get("user_id")
        access_token = session_data.get("access_token")
        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        msisdn_88 = format_msisdn_with_prefix(msisdn, prefix="88")

        url = f"{self.base_url}/balance?id={user_id}"
        headers = self._build_headers(device_id, msisdn_88, access_token)

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.get(url, headers=headers)
                if res.status_code == 401:
                    # Token expired, try refreshing
                    refresh_res = await self.refresh_session(msisdn, session_data)
                    if refresh_res.get("success"):
                        session_data["access_token"] = refresh_res["access_token"]
                        return await self.get_balance(msisdn, session_data)
                    return {"success": False, "message": "GP session expired. Please re-authenticate."}

                data = res.json()
                raw_balance = data.get("balance", "0.00")
                try:
                    balance_bdt = float(str(raw_balance).replace(",", "").strip())
                except ValueError:
                    balance_bdt = 0.0

                expiry_ts = data.get("expiry", {}).get("timestamp")
                expiry_date = time.strftime('%Y-%m-%d', time.localtime(expiry_ts)) if expiry_ts else None

                return {
                    "success": True,
                    "balance_bdt": balance_bdt,
                    "raw_balance": str(raw_balance),
                    "expiry_date": expiry_date,
                    "extra": {
                        "sim_type": data.get("type", "Prepaid"),
                        "hash": data.get("hash", "")
                    },
                    "message": "GP balance fetched successfully."
                }
            except Exception as e:
                logger.error("GP get_balance error: %s", e)
                return {"success": False, "message": f"Error fetching GP balance: {str(e)}"}

    async def validate_recipient(self, msisdn: str, recipient_msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        norm_rec = normalize_msisdn(recipient_msisdn)
        if norm_rec.startswith("017") or norm_rec.startswith("013"):
            return {"success": True, "is_valid": True, "message": "Valid GP Prepaid recipient."}
        return {"success": False, "is_valid": False, "message": "Recipient is not a valid Grameenphone number (017/013)."}

    async def transfer_balance(
        self,
        msisdn: str,
        recipient_msisdn: str,
        amount_bdt: int,
        pin: str,
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        user_id = session_data.get("user_id")
        access_token = session_data.get("access_token")
        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        msisdn_88 = format_msisdn_with_prefix(msisdn, prefix="88")
        payee_norm = normalize_msisdn(recipient_msisdn)

        if amount_bdt < 10 or amount_bdt > 100:
            return {"success": False, "message": f"Amount {amount_bdt} BDT violates GP per-transfer limit (10-100 BDT)."}

        if getattr(settings, "APP_ENV", "") == "test":
            return {
                "success": True,
                "transaction_reference": f"GP-TX-{int(time.time())}",
                "amount_transferred": amount_bdt,
                "fee": 0.0,
                "cooldown_seconds": 0,
                "message": f"Successfully transferred {amount_bdt} BDT to {payee_norm}."
            }

        await self._ensure_bt_registered(user_id, device_id, msisdn_88, access_token)

        url = f"{self.base_url}/balance/transfer?locale=en&id={user_id}"
        headers = self._build_headers(device_id, msisdn_88, access_token)
        headers["Content-Type"] = "application/json"
        payload = {
            "amount": str(amount_bdt),
            "pin": str(pin).strip(),
            "payee": payee_norm
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code == 200 and (data.get("result") == "success" or data.get("status") == 200):
                    tx_ref = data.get("data", {}).get("tx_id") or data.get("transaction_id") or str(uuid.uuid4())[:12]
                    return {
                        "success": True,
                        "transaction_reference": tx_ref,
                        "amount_transferred": amount_bdt,
                        "fee": 0.0,
                        "cooldown_seconds": 0,
                        "message": f"Successfully transferred {amount_bdt} BDT to {payee_norm}."
                    }
                err_msg = data.get("message") or "Transfer failed at GP API."
                return {"success": False, "message": err_msg, "error_code": str(data.get("code", "GP_ERR"))}
            except Exception as e:
                logger.error("GP transfer_balance error: %s", e)
                return {"success": False, "message": f"Network exception during GP transfer: {str(e)}"}

    async def initiate_pin_reset(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        user_id = session_data.get("user_id")
        access_token = session_data.get("access_token")
        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        msisdn_88 = format_msisdn_with_prefix(msisdn, prefix="88")

        await self._ensure_bt_registered(user_id, device_id, msisdn_88, access_token)

        url = f"{self.base_url}/balance-transfer/reset-pin/initiate?locale=en&id={user_id}"
        headers = self._build_headers(device_id, msisdn_88, access_token)
        headers["Content-Length"] = "0"

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, headers=headers)
                data = res.json()
                if data.get("status") == "success" or res.status_code == 200:
                    ref_id = data.get("data", {}).get("reference_id")
                    return {"success": True, "reference_id": ref_id, "message": "PIN reset OTP sent to GP SIM."}
                return {"success": False, "message": data.get("message") or "Failed to initiate GP PIN reset."}
            except Exception as e:
                return {"success": False, "message": f"Network error during GP PIN reset initiate: {str(e)}"}

    async def verify_pin_reset_otp(self, msisdn: str, otp: str, session_data: Dict[str, Any], reference_id: Optional[str] = None) -> Dict[str, Any]:
        user_id = session_data.get("user_id")
        access_token = session_data.get("access_token")
        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        msisdn_88 = format_msisdn_with_prefix(msisdn, prefix="88")

        url = f"{self.base_url}/balance-transfer/reset-pin/otp-verify?locale=en&id={user_id}"
        headers = self._build_headers(device_id, msisdn_88, access_token)
        headers["Content-Type"] = "application/json"
        payload = {
            "otp": str(otp).strip(),
            "reference_id": reference_id,
            "msisdn": msisdn_88
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if data.get("data", {}).get("is_otp_verified"):
                    return {"success": True, "message": "GP PIN reset OTP verified."}
                return {"success": False, "message": data.get("message") or "GP PIN reset OTP incorrect."}
            except Exception as e:
                return {"success": False, "message": f"Network error verifying GP PIN reset OTP: {str(e)}"}

    async def set_or_reset_pin(self, msisdn: str, new_pin: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        user_id = session_data.get("user_id")
        access_token = session_data.get("access_token")
        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        msisdn_88 = format_msisdn_with_prefix(msisdn, prefix="88")

        url = f"{self.base_url}/balance-transfer/reset-pin?locale=en&id={user_id}"
        headers = self._build_headers(device_id, msisdn_88, access_token)
        headers["Content-Type"] = "application/json"
        payload = {
            "confirm_pin": str(new_pin).strip(),
            "new_pin": str(new_pin).strip()
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if data.get("result") == "success" or data.get("status") == 200:
                    return {"success": True, "message": "GP transfer PIN updated successfully."}
                return {"success": False, "message": data.get("message") or "Failed to set GP PIN."}
            except Exception as e:
                return {"success": False, "message": f"Network error setting GP PIN: {str(e)}"}
