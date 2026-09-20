"""
SMS Provider Abstraction Package for FlexiTaka.
Provides pluggable adapters for ZendSMS, Generic HTTP, and mock implementations.
"""

from app.modules.auth.sms.base import SMSProvider, SMSResult
from app.modules.auth.sms.factory import get_sms_provider
from app.modules.auth.sms.zendsms import ZendSMSProvider
from app.modules.auth.sms.generic_http import GenericHttpSMSProvider
from app.modules.auth.sms.mock import MockSMSProvider

__all__ = [
    "SMSProvider",
    "SMSResult",
    "get_sms_provider",
    "ZendSMSProvider",
    "GenericHttpSMSProvider",
    "MockSMSProvider",
]
