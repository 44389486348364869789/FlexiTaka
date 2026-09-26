"""
Authoritative iPhone Shortcut Payment SMS Gateway Endpoint.
Exact Public POST URL:
https://flexitaka.online/api/gateway/verify-payment-ios-shortcut-method

Directly invoked by Apple iOS Shortcuts upon receiving bKash / Nagad payment SMS.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, Request, status
from pydantic import BaseModel, Field
from app.core.exceptions import ValidationException
from app.core.logging import logger
from app.db.mongodb import get_database
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.operators.session_manager import OperatorSessionService
from app.modules.payments.sms_gateway_service import SmsGatewayService
from app.modules.transfers.engine import TransferEngine

router = APIRouter(tags=["Payment Gateway (iOS Shortcut)"])


class SmsGatewayPayload(BaseModel):
    raw_sms: str = Field(..., description="Full raw SMS message received on the iPhone")
    secret: Optional[str] = Field(None, description="Authentication secret or token configured in the Shortcut")
    source_device: Optional[str] = Field("iphone_shortcut", description="Identifier of the sending device")
    nonce: Optional[str] = Field(None, description="Optional request nonce for replay prevention")
    timestamp: Optional[int] = Field(None, description="Optional timestamp")


def get_gateway_service(db=Depends(get_database)) -> SmsGatewayService:
    session_service = OperatorSessionService(db)
    transfer_engine = TransferEngine(db, session_service)
    sims_repo = ReceivingSimsRepository(db)
    return SmsGatewayService(db, sims_repo, transfer_engine)


@router.post(
    "/verify-payment-ios-shortcut-method",
    status_code=status.HTTP_200_OK,
    summary="iPhone Shortcut Payment SMS Webhook",
    description="Target endpoint for Apple iOS Shortcut automation forwarding bKash & Nagad SMS."
)
async def verify_payment_ios_shortcut(
    request: Request,
    payload: Optional[SmsGatewayPayload] = None,
    x_gateway_secret: Optional[str] = Header(None, alias="X-Gateway-Secret"),
    service: SmsGatewayService = Depends(get_gateway_service)
) -> Dict[str, Any]:
    # Extract body whether sent as JSON, form data, or raw text
    raw_sms = None
    secret = x_gateway_secret
    nonce = None
    source_device = "iphone_shortcut"

    if payload and payload.raw_sms:
        raw_sms = payload.raw_sms
        secret = secret or payload.secret
        nonce = payload.nonce
        source_device = payload.source_device or source_device
    else:
        content_type = (request.headers.get("content-type") or "").lower()
        if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            try:
                form = await request.form()
                raw_sms = form.get("raw_sms") or form.get("sms") or form.get("message")
                secret = secret or form.get("secret")
                nonce = form.get("nonce")
                source_device = form.get("source_device") or source_device
            except Exception:
                pass
        else:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    raw_text = body_bytes.decode("utf-8").strip()
                    if raw_text.startswith("{") and raw_text.endswith("}"):
                        import json
                        try:
                            parsed_json = json.loads(raw_text)
                            raw_sms = parsed_json.get("raw_sms") or parsed_json.get("sms") or parsed_json.get("message")
                            secret = secret or parsed_json.get("secret")
                            nonce = parsed_json.get("nonce")
                            source_device = parsed_json.get("source_device") or source_device
                        except Exception:
                            raw_sms = raw_text
                    else:
                        raw_sms = raw_text
            except Exception:
                pass

    if not raw_sms:
        raise ValidationException("Missing 'raw_sms' payload.", code="EMPTY_PAYLOAD")

    logger.info("Received payment SMS from %s (length: %d)", source_device, len(raw_sms))

    result = await service.process_incoming_sms(
        raw_sms=raw_sms,
        secret=secret,
        source_device=source_device,
        nonce=nonce
    )

    return result

