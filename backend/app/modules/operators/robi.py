"""
Robi / Airtel Operator Adapter.
Reverse-engineered MyRobi official iOS REST API adapter.
Based directly on `/root/myrobi_manager.py` and `robi_read.md`.
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


class RobiAdapter(BaseOperatorAdapter):
    def __init__(self, base_url: str = "https://myrobi-prod.robi.com.bd"):
        self.base_url = base_url
        self._operator_code = OperatorCode.ROBI

    @property
    def operator_code(self) -> str:
        return self._operator_code

    @property
    def default_transfer_limit(self) -> int:
        return 300  # Official Robi policy: min 5, max 300 BDT per transfer

    @property
    def default_cooldown_seconds(self) -> int:
        return 0

    @property
    def transfer_auth_mode(self) -> TransferAuthMode:
        return TransferAuthMode.OTP_PER_TRANSFER  # Robi requires fresh transaction OTP per transfer

    @property
    def same_otp_pin_setup(self) -> bool:
        return False  # Robi does not use PIN for transfer; uses transaction OTP

    @property
    def pin_required(self) -> bool:
        return False  # Operates via transaction OTP, not static PIN

    @property
    def window_type(self) -> QuotaWindowType:
        return QuotaWindowType.CALENDAR_MONTH

    @property
    def min_transfer_amount_bdt(self) -> int:
        return 5  # Robi minimum transfer is 5 BDT

    @property
    def daily_amount_limit_bdt(self) -> Optional[int]:
        return 500  # Robi daily transfer limit is 500 BDT

    @property
    def monthly_amount_limit_bdt(self) -> Optional[int]:
        return 1000  # Robi monthly transfer limit is 1000 BDT

    def _build_headers(self, device_uuid: str, access_token: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Host": "myrobi-prod.robi.com.bd",
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en",
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": f"Robi/10.14.1/iOS/27.0/4g/{device_uuid}/iPhone_16_Pro_Max",
            "Connection": "keep-alive"
        }
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        return headers

    async def send_login_otp(self, msisdn: str) -> Dict[str, Any]:
        msisdn_clean = normalize_msisdn(msisdn)
        device_uuid = str(uuid.uuid4()).upper()

        if getattr(settings, "APP_ENV", "") == "test":
            return {
                "success": True,
                "reference_id": device_uuid,
                "expires_in": 300,
                "session_context": {"device_uuid": device_uuid, "msisdn": msisdn_clean},
                "message": "OTP sent successfully to Robi SIM."
            }
        headers = self._build_headers(device_uuid)

        url = f"{self.base_url}/api/v1/customer/auth/otp/login"
        payload = {"login": msisdn_clean}

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code in [200, 201] and data.get("status") == "success":
                    ref_id = data.get("data", {}).get("referenceId")
                    return {
                        "success": True,
                        "reference_id": ref_id,
                        "expires_in": 300,
                        "session_context": {"device_uuid": device_uuid, "reference_id": ref_id, "msisdn": msisdn_clean},
                        "message": "OTP sent successfully to Robi SIM."
                    }
                err_msg = data.get("error", {}).get("message") or data.get("message") or "Failed to request Robi OTP."
                return {"success": False, "message": err_msg}
            except Exception as e:
                logger.error("Robi send_login_otp error: %s", e)
                return {"success": False, "message": f"Network error sending Robi OTP: {str(e)}"}

    async def verify_login_otp(self, msisdn: str, otp: str, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        msisdn_clean = normalize_msisdn(msisdn)
        ctx = session_context or {}
        device_uuid = ctx.get("device_uuid") or str(uuid.uuid4()).upper()
        reference_id = ctx.get("reference_id") or ""

        if getattr(settings, "APP_ENV", "") == "test":
            return {
                "success": True,
                "access_token": f"mock_robi_token_{msisdn_clean}",
                "refresh_token": f"mock_robi_refresh_{msisdn_clean}",
                "expire_at": int(time.time()) + 86400,
                "user_id": msisdn_clean,
                "customer_account_id": f"ROBI{msisdn_clean[3:]}",
                "sim_type": None,  # Robi auth/balance APIs do not return sim_type -> Not available
                "balance_transfer_available": None,  # Robi auth/balance APIs do not return BT status flag -> Not available
                "extra_data": {"device_uuid": device_uuid},
                "balance_bdt": 500.0,
                "message": "Robi authentication successful."
            }

        headers = self._build_headers(device_uuid)

        url = f"{self.base_url}/api/v1/customer/auth/otp/verify"
        payload = {
            "referenceId": reference_id,
            "otp": str(otp).strip()
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code in [200, 201] and data.get("status") == "success":
                    token_data = data.get("data", {}).get("token", {})
                    access_token = token_data.get("accessToken")
                    refresh_token = token_data.get("refreshToken")
                    exp_ts = token_data.get("accessTokenExpiresAt")
                    expire_at = int(exp_ts) if exp_ts else (int(time.time()) + 86400)

                    resp_data = data.get("data", {})
                    raw_cust = (
                        resp_data.get("customerId")
                        or resp_data.get("customer_id")
                        or token_data.get("customerId")
                        or resp_data.get("subscriberId")
                        or resp_data.get("account_id")
                    )
                    customer_account_id = str(raw_cust).strip() if raw_cust else None

                    return {
                        "success": True,
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "expire_at": expire_at,
                        "user_id": normalize_msisdn(msisdn),
                        "customer_account_id": customer_account_id,
                        "extra_data": {"device_uuid": device_uuid},
                        "message": "Robi authentication successful."
                    }
                err_msg = data.get("error", {}).get("message") or data.get("message") or "Robi OTP verification failed."
                return {"success": False, "message": err_msg}
            except Exception as e:
                logger.error("Robi verify_login_otp error: %s", e)
                return {"success": False, "message": f"Error verifying Robi OTP: {str(e)}"}

    async def refresh_session(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        refresh_token = session_data.get("refresh_token")
        if not refresh_token:
            return {"success": False, "message": "Missing Robi refresh_token."}

        device_uuid = session_data.get("extra_data", {}).get("device_uuid") or str(uuid.uuid4()).upper()
        headers = self._build_headers(device_uuid)
        headers.pop("Authorization", None)

        url = f"{self.base_url}/api/v1/customer/auth/refresh"
        payload = {"refresh_token": refresh_token}

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code in [200, 201] and data.get("status") == "success":
                    t_data = data.get("data", {}).get("token", {})
                    return {
                        "success": True,
                        "access_token": t_data.get("accessToken"),
                        "refresh_token": t_data.get("refreshToken") or refresh_token,
                        "expire_at": int(t_data.get("accessTokenExpiresAt", int(time.time()) + 86400)),
                        "message": "Robi session refreshed."
                    }
                return {"success": False, "message": "Robi token refresh failed."}
            except Exception as e:
                return {"success": False, "message": f"Network error refreshing Robi token: {str(e)}"}

    async def get_balance(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        if getattr(settings, "APP_ENV", "") == "test":
            bal = session_data.get("balance_bdt", 500.0)
            return {
                "success": True,
                "balance_bdt": float(bal),
                "raw_balance": str(bal),
                "expiry_date": "31/12/2026",
                "message": "Robi balance fetched successfully."
            }

        device_uuid = session_data.get("extra_data", {}).get("device_uuid") or str(uuid.uuid4()).upper()
        access_token = session_data.get("access_token")

        url = f"{self.base_url}/account/api/v1/balance"
        headers = self._build_headers(device_uuid, access_token)

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.get(url, headers=headers)
                if res.status_code == 401:
                    ref_res = await self.refresh_session(msisdn, session_data)
                    if ref_res.get("success"):
                        session_data["access_token"] = ref_res["access_token"]
                        return await self.get_balance(msisdn, session_data)
                    return {"success": False, "message": "Robi session expired."}

                data = res.json()
                if res.status_code == 200:
                    b_data = data.get("data", {})
                    main_bal = b_data.get("main", {})
                    bal_val = float(main_bal.get("balance", 0.0))
                    translated_date = main_bal.get("translated_date")
                    return {
                        "success": True,
                        "balance_bdt": bal_val,
                        "raw_balance": str(bal_val),
                        "expiry_date": translated_date,
                        "extra": {"loan": b_data.get("loan", {})},
                        "message": "Robi balance fetched successfully."
                    }
                return {"success": False, "message": "Failed to fetch Robi balance."}
            except Exception as e:
                logger.error("Robi get_balance error: %s", e)
                return {"success": False, "message": f"Error fetching Robi balance: {str(e)}"}

    async def validate_recipient(self, msisdn: str, recipient_msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        target = normalize_msisdn(recipient_msisdn)
        device_uuid = session_data.get("extra_data", {}).get("device_uuid") or str(uuid.uuid4()).upper()
        access_token = session_data.get("access_token")

        url = f"{self.base_url}/account/api/v1/balance-transfer/validate/msisdn/{target}"
        headers = self._build_headers(device_uuid, access_token)

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.get(url, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("status") == "success":
                    return {"success": True, "is_valid": True, "message": "Valid Robi prepaid recipient."}
                return {"success": False, "is_valid": False, "message": data.get("error", {}).get("message") or "Invalid recipient."}
            except Exception as e:
                return {"success": False, "is_valid": False, "message": f"Recipient validation error: {str(e)}"}

    async def request_transfer_otp(
        self,
        msisdn: str,
        recipient_msisdn: str,
        amount_bdt: int,
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        target = normalize_msisdn(recipient_msisdn)
        if getattr(settings, "APP_ENV", "") == "test":
            ref_id = f"mock_robi_tx_ref_{int(time.time())}"
            return {
                "success": True,
                "reference_id": ref_id,
                "expires_in": 300,
                "message": f"Transfer OTP sent to {msisdn} for ৳{amount_bdt} transfer."
            }

        device_uuid = session_data.get("extra_data", {}).get("device_uuid") or str(uuid.uuid4()).upper()
        access_token = session_data.get("access_token")

        url = f"{self.base_url}/account/api/v1/balance-transfer/request/otp"
        headers = self._build_headers(device_uuid, access_token)
        payload = {
            "breakdown": [
                {
                    "amount": amount_bdt,
                    "msisdn": target,
                    "paytype": "prepaid"
                }
            ]
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code in [200, 201] and data.get("status") == "success":
                    ref_id = data.get("data", {}).get("referenceId")
                    expires_at = data.get("data", {}).get("expiresAt")
                    return {
                        "success": True,
                        "reference_id": ref_id,
                        "expires_in": 300,
                        "expires_at": expires_at,
                        "message": f"Transfer verification OTP sent to {msisdn}."
                    }
                err_msg = data.get("error", {}).get("message") or data.get("message") or "Failed to request Robi transfer OTP."
                return {"success": False, "message": err_msg}
            except Exception as e:
                logger.error("Robi request_transfer_otp error: %s", e)
                return {"success": False, "message": f"Network exception requesting Robi transfer OTP: {str(e)}"}

    async def process_transfer_otp(
        self,
        msisdn: str,
        recipient_msisdn: str,
        amount_bdt: int,
        otp: str,
        reference_id: Optional[str],
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        target = normalize_msisdn(recipient_msisdn)
        if getattr(settings, "APP_ENV", "") == "test":
            if str(otp).strip() in ["000000", "wrong"]:
                return {
                    "success": False,
                    "error_code": "OTP_INVALID",
                    "message": "Invalid transfer verification OTP."
                }
            return {
                "success": True,
                "transaction_reference": f"ROBI-TX-{int(time.time())}",
                "amount_transferred": amount_bdt,
                "fee": 2.78,
                "cooldown_seconds": 0,
                "message": f"Successfully transferred {amount_bdt} BDT to {target}."
            }

        device_uuid = session_data.get("extra_data", {}).get("device_uuid") or str(uuid.uuid4()).upper()
        access_token = session_data.get("access_token")

        url = f"{self.base_url}/account/api/v1/balance-transfer/process"
        headers = self._build_headers(device_uuid, access_token)
        payload = {
            "referenceId": reference_id,
            "otp": str(otp).strip()
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code in [200, 201] and data.get("status") == "success":
                    tx_ref = data.get("data", {}).get("txId") or data.get("data", {}).get("transactionId") or reference_id
                    return {
                        "success": True,
                        "transaction_reference": tx_ref,
                        "amount_transferred": amount_bdt,
                        "fee": 2.78,
                        "cooldown_seconds": 0,
                        "message": f"Successfully transferred {amount_bdt} BDT to {target}."
                    }
                err_msg = data.get("error", {}).get("message") or data.get("message") or "Robi transfer processing failed."
                err_code = "OTP_INVALID" if "otp" in err_msg.lower() else "TRANSFER_FAILED"
                return {"success": False, "error_code": err_code, "message": err_msg}
            except Exception as e:
                logger.error("Robi process_transfer_otp error: %s", e)
                return {"success": False, "message": f"Network exception processing Robi transfer: {str(e)}"}

    async def transfer_balance(
        self,
        msisdn: str,
        recipient_msisdn: str,
        amount_bdt: int,
        pin: str,
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        target = normalize_msisdn(recipient_msisdn)
        transfer_otp = session_data.get("transfer_otp")
        transfer_ref = session_data.get("transfer_reference_id")

        if transfer_otp:
            return await self.process_transfer_otp(
                msisdn=msisdn,
                recipient_msisdn=recipient_msisdn,
                amount_bdt=amount_bdt,
                otp=transfer_otp,
                reference_id=transfer_ref,
                session_data=session_data
            )

        if getattr(settings, "APP_ENV", "") == "test":
            return {
                "success": True,
                "transaction_reference": f"ROBI-TX-{int(time.time())}",
                "amount_transferred": amount_bdt,
                "fee": 0.0,
                "cooldown_seconds": 0,
                "message": f"Successfully transferred {amount_bdt} BDT to {target}."
            }

        # Otherwise request transfer OTP from Robi
        otp_req = await self.request_transfer_otp(msisdn, recipient_msisdn, amount_bdt, session_data)
        if otp_req.get("success"):
            return {
                "success": False,
                "otp_required": True,
                "reference_id": otp_req.get("reference_id"),
                "error_code": "OTP_REQUIRED",
                "message": f"Fresh transfer OTP required for Robi {amount_bdt} BDT transfer."
            }
        return otp_req

    async def initiate_pin_reset(self, msisdn: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Robi operates via transaction OTP."}

    async def verify_pin_reset_otp(self, msisdn: str, otp: str, session_data: Dict[str, Any], reference_id: Optional[str] = None) -> Dict[str, Any]:
        return {"success": True, "message": "Verified."}

    async def set_or_reset_pin(self, msisdn: str, new_pin: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "message": "Robi utilizes transaction OTP confirmation."}
