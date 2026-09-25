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

    if payload:
        raw_sms = payload.raw_sms
        secret = secret or payload.secret
        nonce = payload.nonce
        source_device = payload.source_device or source_device
    else:
        # Check if form data or plain text
        try:
            form = await request.form()
            if form:
                raw_sms = form.get("raw_sms") or form.get("sms") or form.get("message")
                secret = secret or form.get("secret")
                nonce = form.get("nonce")
        except Exception:
            pass

        if not raw_sms:
            try:
                body_bytes = await request.body()
                raw_sms = body_bytes.decode("utf-8").strip()
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
