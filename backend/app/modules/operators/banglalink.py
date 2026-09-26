"""
Banglalink Operator Adapter.
Reverse-engineered MyBL official iOS REST API adapter.
Based directly on `/root/mybl_manager.py` and `banglalink_readm.md`.
"""

import time
import uuid
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.core.constants import OperatorCode, QuotaWindowType, TransferAuthMode
from app.core.logging import logger
from app.modules.operators.base import BaseOperatorAdapter
from app.modules.operators.resolver import normalize_msisdn


class BanglalinkAdapter(BaseOperatorAdapter):
    def __init__(self, base_url: str = "https://myblapi.banglalink.net"):
        self.base_url = base_url
        self._operator_code = OperatorCode.BANGLALINK
        self.client_id = "f094eab0-0eb3-11ea-b864-2b54450275d9"
        self.client_secret = "FAJ4fXVVNiQkWQisbleVJPOT8nlyCiWYOd1Qo5cr"

    @property
    def operator_code(self) -> str:
        return self._operator_code

    @property
    def default_transfer_limit(self) -> int:
        return 100  # Banglalink transfer limit: min 10, max 100 BDT per chunk

    @property
    def default_cooldown_seconds(self) -> int:
        return 1800  # 30-minute cooldown rule for Banglalink transfers

    @property
    def transfer_auth_mode(self) -> TransferAuthMode:
        return TransferAuthMode.SESSION_PLUS_PIN

    @property
    def same_otp_pin_setup(self) -> bool:
        return True  # Banglalink allows setting/resetting PIN in same Bearer session without extra OTP

    @property
    def pin_required(self) -> bool:
        return True

    @property
    def window_type(self) -> QuotaWindowType:
        return QuotaWindowType.CALENDAR_MONTH

    def _build_headers(self, device_id: str, msisdn_01: str, access_token: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Host": "myblapi.banglalink.net",
            "X-Entitlements": "BG:1658,FT:FP,BG:1578,BG:1695,PREPAID",
            "User-Agent": "MyBL/12.10.0 (com.Banglalink.My-Banglalink; build:26081601; iOS 27.0.0) Alamofire/5.10.2",
            "X-Device-Info": "Apple,iPhone 16 Pro Max,27.0",
            "version-code": "1210000",
            "lms-tier": "SILVER",
            "X-Device-ID": device_id,
            "connection-type": "prepaid",
            "api-client-pass": "1E6F751EBCD16B4B719E76A34FBA9",
            "platform": "ios",
            "app-version": "12.10.0",
            "Accept-Language": "en",
            "Accept": "*/*",
            "msisdn": msisdn_01
        }
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        return headers

    async def send_login_otp(self, msisdn: str) -> Dict[str, Any]:
        msisdn_01 = normalize_msisdn(msisdn)
        device_id = str(uuid.uuid4()).upper()

        if getattr(settings, "APP_ENV", "") == "test":
            return {
                "success": True,
                "reference_id": f"bl_token_{msisdn_01}",
                "expires_in": 300,
                "session_context": {"device_id": device_id, "otp_token": f"bl_token_{msisdn_01}", "msisdn": msisdn_01},
                "message": "OTP sent successfully to Banglalink SIM."
            }

        headers = self._build_headers(device_id, msisdn_01)
        headers["Content-Type"] = "application/json"

        url = f"{self.base_url}/api/v1/send-otp"
        payload = {"phone": msisdn_01}

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("status") == "success":
                    otp_token = data.get("data", {}).get("otp_token")
                    return {
                        "success": True,
                        "reference_id": otp_token,
                        "expires_in": 300,
                        "session_context": {"device_id": device_id, "otp_token": otp_token, "msisdn": msisdn_01},
                        "message": "OTP sent successfully to Banglalink SIM."
                    }
                err_msg = data.get("message") or "Failed to send Banglalink OTP."
                return {"success": False, "message": err_msg}
            except Exception as e:
                logger.error("BL send_login_otp error: %s", e)
                return {"success": False, "message": f"Network error sending BL OTP: {str(e)}"}

    async def verify_login_otp(self, msisdn: str, otp: str, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        msisdn_01 = normalize_msisdn(msisdn)
        ctx = session_context or {}
        device_id = ctx.get("device_id") or str(uuid.uuid4()).upper()
        otp_token = ctx.get("otp_token") or ""

        if getattr(settings, "APP_ENV", "") == "test":
            return {
                "success": True,
                "access_token": f"mock_bl_token_{msisdn_01}",
                "refresh_token": f"mock_bl_refresh_{msisdn_01}",
                "expire_at": int(time.time()) + 86400,
                "user_id": msisdn_01,
                "customer_account_id": f"BL{msisdn_01[3:]}",
                "sim_type": "Prepaid",
                "balance_transfer_available": True,
                "extra_data": {
                    "device_id": device_id,
                    "enable_balance_transfer": True
                },
                "balance_bdt": 500.0,
                "message": "Banglalink authentication successful."
            }

        url = f"{self.base_url}/api/v2/verify-otp"
        headers = self._build_headers(device_id, msisdn_01)
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8"

        form_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "otp_grant",
            "otp": str(otp).strip(),
            "otp_token": otp_token,
            "provider": "users",
            "request_type": "forgot_password",
            "username": msisdn_01
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, data=form_data, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("status") == "success":
                    token_obj = data.get("data", {}).get("token", {})
                    cust_obj = data.get("data", {}).get("customer", {})

                    access_token = token_obj.get("access_token")
                    refresh_token = token_obj.get("refresh_token")
                    exp_ts = token_obj.get("expires_in")
                    expire_at = int(exp_ts) if exp_ts else (int(time.time()) + 86400)

                    raw_cust_acc = cust_obj.get("customer_account_id") or cust_obj.get("customer_id")
                    customer_account_id = str(raw_cust_acc).strip() if raw_cust_acc else None
                    raw_uid = cust_obj.get("id")
                    user_id = str(raw_uid).strip() if raw_uid else None

                    enable_bt = cust_obj.get("enable_balance_transfer")
                    if enable_bt is None and "enable_balance_transfer" in data.get("data", {}):
                        enable_bt = data["data"].get("enable_balance_transfer")

                    bl_sim_type = (
                        cust_obj.get("connection_type")
                        or cust_obj.get("type")
                        or cust_obj.get("subscriber_type")
                        or cust_obj.get("category")
                    )

                    return {
                        "success": True,
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "expire_at": expire_at,
                        "user_id": user_id,
                        "customer_account_id": customer_account_id,
                        "sim_type": bl_sim_type,
                        "balance_transfer_available": enable_bt,
                        "extra_data": {
                            "device_id": device_id,
                            "enable_balance_transfer": enable_bt
                        },
                        "message": "Banglalink authentication successful."
                    }
                err_msg = data.get("message") or "Banglalink OTP verification failed."
                return {"success": False, "message": err_msg}
            except Exception as e:
                logger.error("BL verify_login_otp error: %s", e)
                return {"success": False, "message": f"Error verifying BL OTP: {str(e)}"}

    async def refresh_session(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        refresh_token = session_data.get("refresh_token")
        if not refresh_token:
            return {"success": False, "message": "Missing Banglalink refresh_token."}

        url = f"{self.base_url}/api/v1/refresh"
        headers = {"Content-Type": "application/json"}
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("status") == "SUCCESS":
                    token_data = data.get("data", {})
                    return {
                        "success": True,
                        "access_token": token_data.get("access_token"),
                        "refresh_token": token_data.get("refresh_token") or refresh_token,
                        "expire_at": int(token_data.get("expires_in", int(time.time()) + 86400)),
                        "message": "Banglalink token refreshed."
                    }
                return {"success": False, "message": data.get("message") or "BL token refresh failed."}
            except Exception as e:
                return {"success": False, "message": f"Network error refreshing BL token: {str(e)}"}

    async def get_balance(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        msisdn_01 = normalize_msisdn(msisdn)
        if getattr(settings, "APP_ENV", "") == "test":
            bal = session_data.get("balance_bdt", 500.0)
            return {
                "success": True,
                "balance_bdt": float(bal),
                "raw_balance": str(bal),
                "expiry_date": "31/12/2026",
                "message": "Banglalink balance fetched successfully."
            }

        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        access_token = session_data.get("access_token")

        url = f"{self.base_url}/api/v1/balance/summary"
        headers = self._build_headers(device_id, msisdn_01, access_token)

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.get(url, headers=headers)
                if res.status_code == 401:
                    ref_res = await self.refresh_session(msisdn, session_data)
                    if ref_res.get("success"):
                        session_data["access_token"] = ref_res["access_token"]
                        return await self.get_balance(msisdn, session_data)
                    return {"success": False, "message": "Banglalink session expired."}

                data = res.json()
                if res.status_code == 200 and (str(data.get("status", "")).upper() == "SUCCESS" or "data" in data):
                    bal_data = data.get("data", {})
                    main_bal = bal_data.get("balance", {}) if isinstance(bal_data.get("balance"), dict) else bal_data
                    raw_amount = (
                        main_bal.get("amount")
                        or main_bal.get("total_balance")
                        or bal_data.get("amount")
                        or bal_data.get("total_balance")
                        or 0.0
                    )
                    try:
                        amount = float(raw_amount)
                    except (ValueError, TypeError):
                        amount = 0.0
                    expiry = main_bal.get("expires_in") or bal_data.get("expires_in")
                    return {
                        "success": True,
                        "balance_bdt": amount,
                        "raw_balance": str(amount),
                        "expiry_date": str(expiry) if expiry else None,
                        "extra": {"loan": main_bal.get("loan", {}) if isinstance(main_bal, dict) else {}},
                        "message": "Banglalink balance fetched successfully."
                    }
                return {"success": False, "message": data.get("message") or "Failed to fetch BL balance."}
            except Exception as e:
                logger.error("BL get_balance error: %s", e)
                return {"success": False, "message": f"Error fetching BL balance: {str(e)}"}

    async def validate_recipient(self, msisdn: str, recipient_msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        target = normalize_msisdn(recipient_msisdn)
        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        access_token = session_data.get("access_token")

        url = f"{self.base_url}/api/v1/validate-number"
        headers = self._build_headers(device_id, normalize_msisdn(msisdn), access_token)
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8"

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, data={"phone": target}, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("status") == "SUCCESS":
                    return {"success": True, "is_valid": True, "message": "Valid Banglalink recipient."}
                return {"success": False, "is_valid": False, "message": data.get("message") or "Invalid recipient."}
            except Exception as e:
                return {"success": False, "is_valid": False, "message": f"Recipient validation error: {str(e)}"}

    async def transfer_balance(
        self,
        msisdn: str,
        recipient_msisdn: str,
        amount_bdt: int,
        pin: str,
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        sender = normalize_msisdn(msisdn)
        target = normalize_msisdn(recipient_msisdn)

        if getattr(settings, "APP_ENV", "") == "test":
            expected_pin = sender[-4:]
            if str(pin).strip() != expected_pin:
                return {
                    "success": False,
                    "error_code": "ERR_PIN_2220",
                    "message": "Invalid Pin. Check and try again"
                }
            return {
                "success": True,
                "transaction_reference": f"BL-TX-{int(time.time())}",
                "amount_transferred": amount_bdt,
                "fee": 0.0,
                "cooldown_seconds": 0,
                "message": f"Transferred {amount_bdt} BDT to {target}."
            }

        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        access_token = session_data.get("access_token")

        if amount_bdt < 1 or amount_bdt > 100:
            return {"success": False, "message": f"Amount {amount_bdt} BDT violates Banglalink limit (1-100 BDT)."}

        url = f"{self.base_url}/api/v1/balance-transfer"
        headers = self._build_headers(device_id, sender, access_token)
        headers["Content-Type"] = "application/json"
        payload = {
            "amount": str(amount_bdt),
            "pin": str(pin).strip(),
            "transfer_to": target
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()

                if res.status_code == 200 and data.get("status") == "SUCCESS":
                    tx_ref = str(uuid.uuid4())[:12]
                    return {
                        "success": True,
                        "transaction_reference": tx_ref,
                        "amount_transferred": amount_bdt,
                        "fee": 0.0,
                        "cooldown_seconds": 1800,
                        "message": data.get("message") or f"Transferred {amount_bdt} BDT to {target}."
                    }

                # Cooldown check: Error 1310 is the Banglalink 30-minute cooldown
                err_code = str(data.get("error_code") or data.get("error", {}).get("code") or "")
                err_msg = data.get("error", {}).get("message") or data.get("message") or res.text

                # Specific Banglalink PIN Error detection (ERR_PIN_2220: Invalid Pin. Check and try again)
                if "2220" in err_code or "pin" in err_msg.lower() and "invalid" in err_msg.lower():
                    err_code = "ERR_PIN_2220"

                is_cooldown = ("1310" in err_code) or ("cooldown" in err_msg.lower()) or ("wait" in err_msg.lower())
                return {
                    "success": False,
                    "cooldown_seconds": 1800 if is_cooldown else 0,
                    "error_code": "OPERATOR_COOLDOWN" if is_cooldown else err_code,
                    "message": err_msg
                }
            except Exception as e:
                logger.error("BL transfer_balance error: %s", e)
                return {"success": False, "message": f"Network exception during BL transfer: {str(e)}"}

    async def initiate_pin_reset(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Banglalink allows direct PIN set/reset without separate reset initiate."}

    async def verify_pin_reset_otp(self, msisdn: str, otp: str, session_data: Dict[str, Any], reference_id: Optional[str] = None) -> Dict[str, Any]:
        return {"success": True, "message": "Verified."}

    async def set_or_reset_pin(self, msisdn: str, new_pin: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        if getattr(settings, "APP_ENV", "") == "test":
            session_data.setdefault("extra_data", {})["enable_balance_transfer"] = True
            return {"success": True, "message": "Banglalink PIN set/reset successfully."}

        sender = normalize_msisdn(msisdn)
        device_id = session_data.get("extra_data", {}).get("device_id") or str(uuid.uuid4()).upper()
        access_token = session_data.get("access_token")
        is_registered = session_data.get("extra_data", {}).get("enable_balance_transfer", False)

        endpoint = "/api/v1/balance-transfer/reset-pin" if is_registered else "/api/v1/balance-transfer/set-pin"
        url = f"{self.base_url}{endpoint}"
        headers = self._build_headers(device_id, sender, access_token)
        headers["Content-Type"] = "application/json"

        payload = (
            {"new_pin": str(new_pin), "new_pin_confirmation": str(new_pin)}
            if is_registered
            else {"pin": str(new_pin), "pin_confirmation": str(new_pin)}
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("status") == "SUCCESS":
                    session_data.setdefault("extra_data", {})["enable_balance_transfer"] = True
                    return {"success": True, "message": "Banglalink PIN set/reset successfully."}

                # Try the alternative endpoint if the first attempt failed due to registration status
                alt_endpoint = "/api/v1/balance-transfer/set-pin" if is_registered else "/api/v1/balance-transfer/reset-pin"
                alt_url = f"{self.base_url}{alt_endpoint}"
                alt_payload = (
                    {"pin": str(new_pin), "pin_confirmation": str(new_pin)}
                    if is_registered
                    else {"new_pin": str(new_pin), "new_pin_confirmation": str(new_pin)}
                )
                res_alt = await client.post(alt_url, json=alt_payload, headers=headers)
                data_alt = res_alt.json()
                if res_alt.status_code == 200 and data_alt.get("status") == "SUCCESS":
                    session_data.setdefault("extra_data", {})["enable_balance_transfer"] = True
                    return {"success": True, "message": "Banglalink PIN set/reset successfully."}

                err_msg = data.get("error", {}).get("message") or data.get("message") or res.text
                return {"success": False, "message": err_msg}
            except Exception as e:
                return {"success": False, "message": f"Error setting BL PIN: {str(e)}"}
