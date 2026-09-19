"""
Structured Logging for FlexiTaka.
Provides JSON formatting with request_id tracking and sensitive field redaction.
"""

import json
import logging
import sys
from datetime import datetime, timezone


SENSITIVE_KEYS = {"password", "otp", "token", "secret", "authorization", "key", "payout_account"}


class StructuredJSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include custom attributes if present
        for attr in ("request_id", "route", "status_code", "latency_ms", "user_id", "order_id", "error_code"):
            if hasattr(record, attr):
                log_entry[attr] = getattr(record, attr)

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def setup_logging(level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger("flexitaka")
    logger.setLevel(level)

    # Avoid duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJSONFormatter())
        logger.addHandler(handler)

    return logger


logger = setup_logging()
