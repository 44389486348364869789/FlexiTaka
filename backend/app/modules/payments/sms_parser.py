"""
Authoritative SMS Parser for bKash and Nagad.
Resilient regex extraction for payment SMS forwarded by iPhone Shortcut.
Extracts provider, TrxID/TxnID, amount (BDT & Poisha), reference code, and sender phone.
"""

import re
from typing import Any, Dict, Optional
from app.core.constants import bdt_to_poisha


class SmsParser:
    @staticmethod
    def parse_sms(raw_text: str) -> Dict[str, Any]:
        """
        Parses raw SMS string from bKash or Nagad.
        Returns a normalized dict:
        {
            "is_valid": bool,
            "provider": "BKASH" | "NAGAD" | "UNKNOWN",
            "transaction_id": Optional[str],
            "amount_bdt": Optional[float],
            "amount_poisha": Optional[int],
            "reference_code": Optional[str],
            "sender_number": Optional[str],
            "raw_sms": str,
            "error": Optional[str]
        }
        """
        text = str(raw_text or "").strip()
        if not text:
            return {"is_valid": False, "provider": "UNKNOWN", "error": "Empty SMS body", "raw_sms": text}

        text_upper = text.upper()

        # Determine Provider
        provider = "UNKNOWN"
        if "BKASH" in text_upper or "TRXID" in text_upper:
            provider = "BKASH"
        elif "NAGAD" in text_upper or "TXNID" in text_upper:
            provider = "NAGAD"

        # 1. Extract Transaction ID (TrxID or TxnID)
        trx_id = None
        # Match bKash TrxID (e.g. TrxID 9K8L7M6N5P or TrxID: 9K8L7M6N5P or TrxID:BL9K8L7M)
        trx_match = re.search(r"TrxID[:\s]+([A-Z0-9]+)", text, re.IGNORECASE)
        if trx_match:
            trx_id = trx_match.group(1).strip().upper()
            provider = "BKASH"
        else:
            # Match Nagad TxnID (e.g. TxnID: 72A8B9C or TxnID 72A8B9C)
            txn_match = re.search(r"TxnID[:\s]+([A-Z0-9]+)", text, re.IGNORECASE)
            if txn_match:
                trx_id = txn_match.group(1).strip().upper()
                provider = "NAGAD"

        # 2. Extract Amount
        # Match patterns like: Tk 950.00, Tk 1,000, Amount: Tk 950, Tk. 500
        amount_bdt = None
        amount_match = re.search(r"(?:Tk\.?|BDT)\s*([\d,]+(?:\.\d{1,2})?)", text, re.IGNORECASE)
        if not amount_match:
            amount_match = re.search(r"Amount[:\s]+(?:Tk\.?|BDT)?\s*([\d,]+(?:\.\d{1,2})?)", text, re.IGNORECASE)

        if amount_match:
            try:
                amt_str = amount_match.group(1).replace(",", "").strip()
                amount_bdt = float(amt_str)
            except ValueError:
                amount_bdt = None

        # 3. Extract Reference Code
        # Match patterns like: Ref: FT-R12345, Ref FT-123, Ref: 017XXXX, Ref 12345
        ref_code = None
        ref_match = re.search(r"Ref(?:erence)?[:\s]+([A-Z0-9\-_]+)", text, re.IGNORECASE)
        if ref_match:
            ref_code = ref_match.group(1).strip()

        # 4. Extract Sender Mobile Number
        sender_phone = None
        sender_match = re.search(r"(?:from|sender)[:\s]+(\+?8801[3-9]\d{8}|01[3-9]\d{8})", text, re.IGNORECASE)
        if sender_match:
            sender_phone = sender_match.group(1).strip()
            if sender_phone.startswith("+88"):
                sender_phone = sender_phone[3:]
            elif sender_phone.startswith("88"):
                sender_phone = sender_phone[2:]

        is_valid = bool(provider != "UNKNOWN" and trx_id and amount_bdt and amount_bdt > 0)

        amount_poisha = bdt_to_poisha(amount_bdt) if amount_bdt is not None else None

        return {
            "is_valid": is_valid,
            "provider": provider,
            "transaction_id": trx_id,
            "amount_bdt": amount_bdt,
            "amount_poisha": amount_poisha,
            "reference_code": ref_code,
            "sender_number": sender_phone,
            "raw_sms": text,
            "error": None if is_valid else "Could not extract mandatory payment fields (provider, trx_id, amount)."
        }
