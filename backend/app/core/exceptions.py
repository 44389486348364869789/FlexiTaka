"""
Custom Application Exceptions and Error Formatting.
Strictly maps business errors to machine-readable ErrorCodes.
"""

from typing import Any, Optional
from fastapi import HTTPException, status
from app.core.constants import ErrorCode


class FlexiTakaException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: ErrorCode,
        message: str,
        details: Optional[Any] = None
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details


class UnauthorizedException(FlexiTakaException):
    def __init__(self, message: str = "Authentication required", code: ErrorCode = ErrorCode.AUTH_REQUIRED):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, code=code, message=message)


class ForbiddenException(FlexiTakaException):
    def __init__(self, message: str = "Permission denied", code: ErrorCode = ErrorCode.PERMISSION_DENIED):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, code=code, message=message)


class NotFoundException(FlexiTakaException):
    def __init__(self, message: str = "Resource not found", code: ErrorCode = ErrorCode.ORDER_NOT_FOUND):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, code=code, message=message)


class ValidationException(FlexiTakaException):
    def __init__(self, message: str, code: ErrorCode = ErrorCode.VALIDATION_ERROR, details: Any = None):
        super().__init__(status_code=422, code=code, message=message, details=details)


class ConflictException(FlexiTakaException):
    def __init__(self, message: str, code: ErrorCode = ErrorCode.IDEMPOTENCY_CONFLICT):
        super().__init__(status_code=status.HTTP_409_CONFLICT, code=code, message=message)


class RateLimitException(FlexiTakaException):
    def __init__(self, message: str = "Too many requests. Please slow down.", code: ErrorCode = ErrorCode.RATE_LIMITED):
        super().__init__(status_code=status.HTTP_429_TOO_MANY_REQUESTS, code=code, message=message)
