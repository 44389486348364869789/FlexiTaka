"""
SMS Provider Factory.
Instantiates the appropriate SMS provider based on environment configuration.
"""

from typing import Optional
from app.core.config import settings
from app.core.logging import logger
from app.modules.auth.sms.base import SMSProvider
from app.modules.auth.sms.generic_http import GenericHttpSMSProvider
from app.modules.auth.sms.mock import MockSMSProvider
from app.modules.auth.sms.zendsms import ZendSMSProvider


def get_sms_provider(provider_name: Optional[str] = None) -> SMSProvider:
    """
    Factory function to get the configured SMS provider.
    Priority: explicit argument -> settings.SMS_PROVIDER -> 'mock' fallback.
    """
    if provider_name is None and getattr(settings, "APP_ENV", "") == "test":
        return MockSMSProvider()

    name = (provider_name or settings.SMS_PROVIDER or "mock").lower().strip()

    if name == "zendsms":
        return ZendSMSProvider(
            api_key=settings.ZENDSMS_API_KEY,
            base_url=settings.ZENDSMS_BASE_URL,
            sender_id=settings.ZENDSMS_SENDER_ID,
            brand=settings.ZENDSMS_BRAND,
            expiry=settings.ZENDSMS_EXPIRY_SECONDS,
        )
    elif name == "generic_http":
        return GenericHttpSMSProvider(
            base_url=settings.SMS_API_BASE_URL,
            api_key=settings.SMS_API_KEY,
            auth_header=settings.SMS_AUTH_HEADER,
            auth_scheme=settings.SMS_AUTH_SCHEME,
            send_path=settings.SMS_SEND_PATH,
            verify_path=settings.SMS_VERIFY_PATH,
            sender_id=settings.SMS_SENDER_ID
        )
    elif name == "mock":
        return MockSMSProvider()
    else:
        logger.warning("Unrecognized SMS_PROVIDER '%s', falling back to mock provider", name)
        return MockSMSProvider()
