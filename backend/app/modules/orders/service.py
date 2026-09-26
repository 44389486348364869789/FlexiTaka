"""
Orders Service.
Orchestrates primary order queries, IDOR security enforcement, and event timeline retrieval.
"""

import time
from typing import Any, Dict, List, Optional
from app.core.constants import ErrorCode, poisha_to_bdt
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException, ValidationException
from app.core.security import generate_tracking_token, verify_tracking_token
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.recharge_repo import RechargeRepository
from app.modules.orders.schemas import coerce_to_iso_str


class OrdersService:
    def __init__(
        self,
        orders_repo: OrdersRepository,
        cashout_repo: CashOutRepository,
        recharge_repo: RechargeRepository
    ):
        self.orders_repo = orders_repo
        self.cashout_repo = cashout_repo
        self.recharge_repo = recharge_repo

    async def get_order_details(
        self,
        order_id: str,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        tracking_token: Optional[str] = None,
        is_staff: bool = False
    ) -> Dict[str, Any]:
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found", code=ErrorCode.ORDER_NOT_FOUND)

        # IDOR / Security Verification
        if not is_staff:
            is_owner = False
            if not order.get("user_id") and not order.get("guest_session_id"):
                is_owner = True
            elif user_id and order.get("user_id") == user_id:
                is_owner = True
            elif guest_session_id and order.get("guest_session_id") == guest_session_id:
                is_owner = True
            elif tracking_token and order.get("guest_session_id"):
                if verify_tracking_token(order_id, order["guest_session_id"], tracking_token):
                    is_owner = True

            if not is_owner:
                raise ForbiddenException("You do not have permission to view this order")

        # Hydrate service details
        cashout_details = None
        recharge_details = None
        if order.get("service_type") == "CASH_OUT":
            cashout_details = await self.cashout_repo.get_by_order_id(order_id)
            if cashout_details:
                cashout_details = {
                    **cashout_details,
                    "_id": str(cashout_details.get("_id")) if cashout_details.get("_id") else None,
                    "source_amount_bdt": str(poisha_to_bdt(cashout_details.get("source_amount", 0))),
                    "platform_fee_amount_bdt": str(poisha_to_bdt(cashout_details.get("platform_fee_amount", 0))),
                    "payout_amount_bdt": str(poisha_to_bdt(cashout_details.get("payout_amount", 0))),
                }
        elif order.get("service_type") == "RECHARGE":
            recharge_details = await self.recharge_repo.get_by_order_id(order_id)
            if recharge_details:
                recharge_details = {
                    **recharge_details,
                    "_id": str(recharge_details.get("_id")) if recharge_details.get("_id") else None,
                    "recharge_amount_bdt": str(poisha_to_bdt(recharge_details.get("recharge_amount", 0))),
                    "discount_amount_bdt": str(poisha_to_bdt(recharge_details.get("discount_amount", 0))),
                    "customer_pay_amount_bdt": str(poisha_to_bdt(recharge_details.get("customer_pay_amount", 0))),
                }

        events = await self.orders_repo.get_order_events(order_id)
        formatted_events = []
        for e in events:
            e_dict = dict(e)
            e_dict["created_at"] = coerce_to_iso_str(e_dict.get("created_at")) or ""
            formatted_events.append(e_dict)

        # Generate tracking token for guest convenience
        guest_token = None
        if order.get("guest_session_id"):
            guest_token = generate_tracking_token(order_id, order["guest_session_id"])

        amount_poisha = order.get("amount", 0)
        return {
            "order_id": order["order_id"],
            "service_type": order["service_type"],
            "user_id": order.get("user_id"),
            "guest_session_id": order.get("guest_session_id"),
            "linked_from_guest_session_id": order.get("linked_from_guest_session_id"),
            "operator_code": order["operator_code"],
            "mobile_number": order["mobile_number"],
            "amount_bdt": poisha_to_bdt(amount_poisha),
            "amount_poisha": amount_poisha,
            "currency": order.get("currency", "BDT"),
            "status": order["status"],
            "pricing_snapshot": order.get("pricing_snapshot", {}),
            "payment_id": order.get("payment_id"),
            "payout_id": order.get("payout_id"),
            "cashout_details": cashout_details,
            "recharge_details": recharge_details,
            "tracking_token": guest_token,
            "events": formatted_events,
            "created_at": coerce_to_iso_str(order.get("created_at")),
            "updated_at": coerce_to_iso_str(order.get("updated_at")),
            "completed_at": coerce_to_iso_str(order.get("completed_at")),
            "cancelled_at": coerce_to_iso_str(order.get("cancelled_at"))
        }

    async def list_orders(
        self,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if user_id:
            query["user_id"] = user_id
        elif guest_session_id:
            query["guest_session_id"] = guest_session_id
        else:
            return []

        orders = await self.orders_repo.find_many(query, sort_by=[("created_at", -1)], limit=limit, skip=skip)
        results = []
        for o in orders:
            amt_poisha = o.get("amount", 0)
            results.append({
                "order_id": o["order_id"],
                "service_type": o["service_type"],
                "operator_code": o["operator_code"],
                "mobile_number": o["mobile_number"],
                "amount_bdt": poisha_to_bdt(amt_poisha),
                "amount_poisha": amt_poisha,
                "currency": o.get("currency", "BDT"),
                "status": o["status"],
                "linked_from_guest_session_id": o.get("linked_from_guest_session_id"),
                "created_at": coerce_to_iso_str(o.get("created_at")),
                "updated_at": coerce_to_iso_str(o.get("updated_at"))
            })
        return results

    async def cancel_order(
        self,
        order_id: str,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        tracking_token: Optional[str] = None,
        reason: Optional[str] = "Order cancelled by customer"
    ) -> Dict[str, Any]:
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        # Ownership validation
        order_user_id = order.get("user_id")
        order_guest_id = order.get("guest_session_id")

        if user_id:
            if order_user_id and order_user_id != user_id:
                raise ForbiddenException("Access denied: You do not own this order")
        elif tracking_token:
            if not verify_tracking_token(order_id, order_guest_id or "", tracking_token):
                raise ForbiddenException("Invalid tracking token")
        elif guest_session_id:
            if order_guest_id != guest_session_id:
                raise ForbiddenException("Access denied: Guest session mismatch")
        else:
            raise ForbiddenException("Authentication required to cancel order")

        status = order.get("status")
        cancellable_statuses = {"WAITING_FOR_TRANSFER", "PAYMENT_PENDING", "REQUESTED"}
        if status not in cancellable_statuses:
            raise ConflictException(f"Order in status '{status}' cannot be cancelled")

        updated = await self.orders_repo.update_order_status(
            order_id=order_id,
            service_type=order["service_type"],
            expected_current_status=status,
            new_status="CANCELLED",
            actor_type="USER",
            actor_id=user_id or guest_session_id or "user",
            note=reason or "Order cancelled by customer"
        )
        return updated

    async def get_order_progress(
        self,
        order_id: str,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        tracking_token: Optional[str] = None,
        is_staff: bool = False
    ) -> Dict[str, Any]:
        """
        Authoritative Order Progress & Live Stepper Mapping.
        Supports both Cash Out and Recharge workflows.
        No second state machine is created; maps existing backend states directly.
        """
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found", code=ErrorCode.ORDER_NOT_FOUND)

        # IDOR / Security Verification
        if not is_staff:
            is_owner = False
            if not order.get("user_id") and not order.get("guest_session_id"):
                is_owner = True
            elif user_id and order.get("user_id") == user_id:
                is_owner = True
            elif guest_session_id and order.get("guest_session_id") == guest_session_id:
                is_owner = True
            elif tracking_token and order.get("guest_session_id"):
                if verify_tracking_token(order_id, order["guest_session_id"], tracking_token):
                    is_owner = True

            if not is_owner:
                raise ForbiddenException("You do not have permission to view this order progress")

        service_type = order.get("service_type")
        raw_status = str(order.get("status", "REQUESTED")).upper()
        amount_poisha = order.get("amount", 0)

        # Retrieve transfer ledger chunk status if chunks exist
        transfer_chunks = await self.orders_repo.db.transfer_ledger.find(
            {"order_id": order_id}
        ).sort("sequence_number", 1).to_list(length=50)

        transfer_progress = None
        amt_done = 0
        rem_amt = 0
        if transfer_chunks:
            total_chunks = len(transfer_chunks)
            completed_chunks = sum(1 for c in transfer_chunks if c.get("status") == "SUCCESS")
            amt_done = sum(c.get("chunk_amount_bdt", 0) for c in transfer_chunks if c.get("status") == "SUCCESS")
            rem_amt = sum(c.get("chunk_amount_bdt", 0) for c in transfer_chunks if c.get("status") != "SUCCESS")
            cooldown_chunk = next((c for c in transfer_chunks if c.get("status") == "WAITING_FOR_COOLDOWN"), None)
            now_epoch = int(time.time())
            cooldown_sec = max(0, cooldown_chunk["next_retry_at"] - now_epoch) if cooldown_chunk else 0

            next_unfinished = next((c for c in transfer_chunks if c.get("status") != "SUCCESS"), None)
            next_chunk_seq = next_unfinished["sequence_number"] if next_unfinished else None
            otp_req = order.get("otp_required_for_next_chunk", False) or (next_unfinished.get("status") == "WAITING_FOR_OTP" if next_unfinished else False)

            action_req = order.get("action_required") or ("OTP_REQUIRED" if otp_req else ("COOLDOWN" if cooldown_sec > 0 else "NONE"))
            next_act = order.get("next_action") or (f"Next {next_unfinished['chunk_amount_bdt']} BDT transfer needs verification." if otp_req and next_unfinished else "")

            dynamic_full_order_url = f"https://www.flexitaka.com/app/order/{order_id}"

            transfer_progress = {
                "chunks_total": total_chunks,
                "chunks_completed": completed_chunks,
                "amount_transferred_bdt": amt_done,
                "completed_amount_bdt": amt_done,
                "remaining_amount_bdt": rem_amt,
                "requested_amount_bdt": amt_done + rem_amt,
                "is_cooling_down": cooldown_sec > 0,
                "cooldown_seconds": cooldown_sec,
                "cooldown_seconds_remaining": cooldown_sec,
                "is_cooldown_active": cooldown_sec > 0,
                "next_chunk_number": next_chunk_seq,
                "action_required": action_req,
                "next_action": next_act,
                "otp_required_for_next_chunk": otp_req,
                "view_full_order_url": dynamic_full_order_url,
                "chunks": [
                    {
                        "sequence_number": c["sequence_number"],
                        "amount_bdt": c["chunk_amount_bdt"],
                        "status": c["status"],
                        "operator_reference": c.get("operator_reference"),
                        "error_message": c.get("error_message")
                    }
                    for c in transfer_chunks
                ]
            }

        # Terminal and failure state detection
        is_terminal = raw_status in {"COMPLETED", "REJECTED", "CANCELLED", "TRANSFER_FAILED", "PAYMENT_FAILED", "INSUFFICIENT_BALANCE"}
        is_failed = raw_status in {"REJECTED", "CANCELLED", "TRANSFER_FAILED", "PAYMENT_FAILED", "INSUFFICIENT_BALANCE"}

        is_waiting = False
        waiting_msg_en = None
        waiting_msg_bn = None
        current_step_index = 1
        steps = []

        if service_type == "CASH_OUT":
            # 6 Official Steps for Cash Out
            # 1. Order Created -> 2. Operator Verification -> 3. Transfer Processing -> 4. Transfer Received -> 5. Verification/Payout -> 6. Completed
            if raw_status == "REQUESTED":
                current_step_index = 1
            elif raw_status == "WAITING_FOR_TRANSFER":
                current_step_index = 2
                is_waiting = True
                waiting_msg_en = "Authenticating operator session & balance transfer PIN"
                waiting_msg_bn = "অপারেটর সেশন ও ব্যালেন্স ট্রান্সফার পিন যাচাইকরণ চলছে"
            elif raw_status in {"TRANSFER_IN_PROGRESS", "WAITING_FOR_COOLDOWN", "PARTIALLY_COMPLETED"}:
                current_step_index = 3
                if raw_status == "WAITING_FOR_COOLDOWN":
                    is_waiting = True
                    rem_sec = transfer_progress.get("cooldown_seconds", 0) if transfer_progress else 0
                    waiting_msg_en = f"Operator cooldown active ({rem_sec}s remaining). Next chunk resumes automatically."
                    waiting_msg_bn = f"অপারেটর কুলডাউন চলছে ({rem_sec} সেকেন্ড বাকি)। পরবর্তী চাঙ্ক স্বয়ংক্রিয়ভাবে শুরু হবে।"
                elif raw_status == "PARTIALLY_COMPLETED":
                    is_waiting = True
                    waiting_msg_en = f"৳{amt_done} successfully transferred. ৳{rem_amt} remaining."
                    waiting_msg_bn = f"৳{amt_done} সফলভাবে স্থানান্তরিত হয়েছে। ৳{rem_amt} বাকি রয়েছে।"
            elif raw_status == "TRANSFER_RECEIVED":
                current_step_index = 4
            elif raw_status in {"UNDER_VERIFICATION", "APPROVED", "PAYOUT_PROCESSING"}:
                current_step_index = 5
                is_waiting = raw_status == "UNDER_VERIFICATION"
                waiting_msg_en = "Verifying transfer receipts before payout dispatch"
                waiting_msg_bn = "পেমেন্ট পাঠানোর পূর্বে প্রাপ্ত ব্যালেন্স যাচাই করা হচ্ছে"
            elif raw_status == "COMPLETED":
                current_step_index = 6
            elif raw_status in {"TRANSFER_FAILED", "INSUFFICIENT_BALANCE"}:
                current_step_index = 3
                is_failed = True
                err_text = order.get("metadata", {}).get("error_message") or "Transfer could not be completed"
                waiting_msg_en = f"Transfer failed: {err_text}"
                waiting_msg_bn = f"ব্যালেন্স ট্রান্সফার ব্যর্থ হয়েছে: {err_text}"
            elif raw_status in {"REJECTED", "CANCELLED"}:
                current_step_index = 1
                is_failed = True
                waiting_msg_en = f"Order was {raw_status.lower()}"
                waiting_msg_bn = f"অর্ডারটি {raw_status} হয়েছে"

            def _step_status_co(idx: int) -> str:
                if raw_status == "COMPLETED":
                    return "COMPLETED"
                if idx < current_step_index:
                    return "COMPLETED"
                if idx == current_step_index:
                    return "FAILED" if is_failed else "CURRENT"
                return "WAITING"

            steps = [
                {
                    "id": "order_created",
                    "step_index": 1,
                    "title_en": "Order Created",
                    "title_bn": "অর্ডার তৈরি হয়েছে",
                    "description_en": "Cash out request placed successfully",
                    "description_bn": "ক্যাশ আউট রিকোয়েস্ট সফলভাবে তৈরি হয়েছে",
                    "status": _step_status_co(1)
                },
                {
                    "id": "operator_verification",
                    "step_index": 2,
                    "title_en": "Operator Verification",
                    "title_bn": "অপারেটর যাচাইকরণ",
                    "description_en": "Validating operator session & transfer PIN",
                    "description_bn": "অপারেটর সেশন ও ট্রান্সফার পিন যাচাইকরণ",
                    "status": _step_status_co(2)
                },
                {
                    "id": "transfer_processing",
                    "step_index": 3,
                    "title_en": "Transfer Processing",
                    "title_bn": "ব্যালেন্স ট্রান্সফার প্রক্রিয়াধীন",
                    "description_en": "Transferring balance in secure chunks",
                    "description_bn": "নিরাপদ চাঙ্কে ব্যালেন্স ট্রান্সফার করা হচ্ছে",
                    "status": _step_status_co(3)
                },
                {
                    "id": "transfer_received",
                    "step_index": 4,
                    "title_en": "Transfer Received",
                    "title_bn": "ট্রান্সফার সফলভাবে প্রাপ্ত",
                    "description_en": "SIM balance transfer fully received by FlexiTaka",
                    "description_bn": "ফ্লেক্সিটাকায় ব্যালেন্স ট্রান্সফার সফলভাবে জমা হয়েছে",
                    "status": _step_status_co(4)
                },
                {
                    "id": "verification_payout",
                    "step_index": 5,
                    "title_en": "Verification / Payout",
                    "title_bn": "যাচাই ও পেমেন্ট প্রদান",
                    "description_en": "Verifying ledger and dispatching payout to MFS",
                    "description_bn": "ট্রান্সফার যাচাই করে ক্যাশ আউট পেমেন্ট পাঠানো হচ্ছে",
                    "status": _step_status_co(5)
                },
                {
                    "id": "completed",
                    "step_index": 6,
                    "title_en": "Completed",
                    "title_bn": "সফলভাবে সম্পন্ন",
                    "description_en": "Payout successfully credited to your account",
                    "description_bn": "টাকা সফলভাবে আপনার অ্যাকাউন্টে পৌঁছে গেছে",
                    "status": _step_status_co(6)
                }
            ]

        else:
            # 6 Official Steps for Recharge
            # 1. Order Created -> 2. Payment Pending -> 3. Payment Verified -> 4. SIM Selection -> 5. Recharge Processing -> 6. Completed
            if raw_status == "REQUESTED":
                current_step_index = 1
            elif raw_status == "PAYMENT_PENDING":
                current_step_index = 2
                is_waiting = True
                waiting_msg_en = "Please complete payment to the account number shown"
                waiting_msg_bn = "প্রদত্ত পেমেন্ট নম্বরে টাকা পাঠিয়ে ট্রানজ্যাকশন আইডি প্রদান করুন"
            elif raw_status == "PAYMENT_VERIFIED":
                current_step_index = 3
            elif raw_status in {"SIM_SELECTION", "WAITING_FOR_SIM"}:
                current_step_index = 4
                is_waiting = True
                waiting_msg_en = "Allocating active operator SIM from FlexiTaka pool"
                waiting_msg_bn = "ফ্লেক্সিটাকা পুল থেকে সক্রিয় সিম বরাদ্দ করা হচ্ছে"
            elif raw_status == "RECHARGE_PROCESSING":
                current_step_index = 5
            elif raw_status == "COMPLETED":
                current_step_index = 6
            elif raw_status == "PAYMENT_FAILED":
                current_step_index = 2
                is_failed = True
                waiting_msg_en = "Payment verification failed"
                waiting_msg_bn = "পেমেন্ট যাচাইকরণ ব্যর্থ হয়েছে"
            elif raw_status in {"REJECTED", "CANCELLED"}:
                current_step_index = 1
                is_failed = True
                waiting_msg_en = f"Order was {raw_status.lower()}"
                waiting_msg_bn = f"অর্ডারটি {raw_status} হয়েছে"

            def _step_status_rec(idx: int) -> str:
                if raw_status == "COMPLETED":
                    return "COMPLETED"
                if idx < current_step_index:
                    return "COMPLETED"
                if idx == current_step_index:
                    return "FAILED" if is_failed else "CURRENT"
                return "WAITING"

            steps = [
                {
                    "id": "order_created",
                    "step_index": 1,
                    "title_en": "Order Created",
                    "title_bn": "অর্ডার তৈরি হয়েছে",
                    "description_en": "Recharge order placed successfully",
                    "description_bn": "রিচার্জ অর্ডার সফলভাবে তৈরি হয়েছে",
                    "status": _step_status_rec(1)
                },
                {
                    "id": "payment_pending",
                    "step_index": 2,
                    "title_en": "Payment Pending",
                    "title_bn": "পেমেন্ট অপেক্ষমাণ",
                    "description_en": "Waiting for payment submission & SMS verification",
                    "description_bn": "পেমেন্ট ও এসএমএস ভেরিফিকেশনের অপেক্ষায়",
                    "status": _step_status_rec(2)
                },
                {
                    "id": "payment_verified",
                    "step_index": 3,
                    "title_en": "Payment Verified",
                    "title_bn": "পেমেন্ট যাচাইকৃত",
                    "description_en": "Payment confirmed and verified via gateway",
                    "description_bn": "পেমেন্ট সফলভাবে যাচাই ও নিশ্চিত করা হয়েছে",
                    "status": _step_status_rec(3)
                },
                {
                    "id": "sim_selection",
                    "step_index": 4,
                    "title_en": "SIM Selection",
                    "title_bn": "সক্রিয় সিম নির্বাচন",
                    "description_en": "Allocating active operator SIM from FlexiTaka pool",
                    "description_bn": "ফ্লেক্সিটাকা পুল থেকে সক্রিয় সিম বরাদ্দ করা হচ্ছে",
                    "status": _step_status_rec(4)
                },
                {
                    "id": "recharge_processing",
                    "step_index": 5,
                    "title_en": "Recharge Processing",
                    "title_bn": "রিচার্জ প্রক্রিয়াধীন",
                    "description_en": "Dispatching balance transfer to customer number",
                    "description_bn": "গ্রাহকের নম্বরে ব্যালেন্স পাঠানো হচ্ছে",
                    "status": _step_status_rec(5)
                },
                {
                    "id": "completed",
                    "step_index": 6,
                    "title_en": "Completed",
                    "title_bn": "সফলভাবে সম্পন্ন",
                    "description_en": "Recharge successfully delivered to recipient",
                    "description_bn": "মোবাইল রিচার্জ সফলভাবে সম্পন্ন হয়েছে",
                    "status": _step_status_rec(6)
                }
            ]

        # Status human labels
        status_en_map = {
            "REQUESTED": "Order Requested",
            "WAITING_FOR_TRANSFER": "Waiting for Operator Transfer",
            "TRANSFER_IN_PROGRESS": "Transfer in Progress",
            "WAITING_FOR_COOLDOWN": "Cooling Down",
            "PARTIALLY_COMPLETED": "Partially Completed",
            "TRANSFER_RECEIVED": "Transfer Received",
            "UNDER_VERIFICATION": "Under Verification",
            "APPROVED": "Approved for Payout",
            "PAYOUT_PROCESSING": "Payout Processing",
            "PAYMENT_PENDING": "Payment Pending",
            "PAYMENT_VERIFIED": "Payment Verified",
            "SIM_SELECTION": "Selecting SIM",
            "WAITING_FOR_SIM": "Waiting for SIM",
            "RECHARGE_PROCESSING": "Recharge Processing",
            "COMPLETED": "Completed Successfully",
            "TRANSFER_FAILED": "Transfer Failed",
            "INSUFFICIENT_BALANCE": "Insufficient SIM Balance",
            "PAYMENT_FAILED": "Payment Failed",
            "REJECTED": "Rejected",
            "CANCELLED": "Cancelled"
        }
        status_bn_map = {
            "REQUESTED": "অর্ডার গৃহীত",
            "WAITING_FOR_TRANSFER": "ট্রান্সফারের অপেক্ষায়",
            "TRANSFER_IN_PROGRESS": "ট্রান্সফার চলছে",
            "WAITING_FOR_COOLDOWN": "কুলডাউন অপেক্ষমাণ",
            "PARTIALLY_COMPLETED": "আংশিক সম্পন্ন",
            "TRANSFER_RECEIVED": "ট্রান্সফার প্রাপ্ত",
            "UNDER_VERIFICATION": "যাচাইকরণ চলছে",
            "APPROVED": "পেমেন্ট অনুমোদিত",
            "PAYOUT_PROCESSING": "পেমেন্ট পাঠানো হচ্ছে",
            "PAYMENT_PENDING": "পেমেন্ট অপেক্ষমাণ",
            "PAYMENT_VERIFIED": "পেমেন্ট যাচাইকৃত",
            "SIM_SELECTION": "সিম বরাদ্দ চলছে",
            "WAITING_FOR_SIM": "সিমের অপেক্ষায়",
            "RECHARGE_PROCESSING": "রিচার্জ পাঠানো হচ্ছে",
            "COMPLETED": "সফলভাবে সম্পন্ন",
            "TRANSFER_FAILED": "ট্রান্সফার ব্যর্থ",
            "INSUFFICIENT_BALANCE": "সিমে পর্যাপ্ত ব্যালান্স নেই",
            "PAYMENT_FAILED": "পেমেন্ট ব্যর্থ",
            "REJECTED": "বাতিল",
            "CANCELLED": "বাতিলকৃত"
        }

        # Hydrate service details if needed
        cashout_details = None
        recharge_details = None
        if service_type == "CASH_OUT":
            cashout_details = await self.cashout_repo.get_by_order_id(order_id)
            if cashout_details:
                cashout_details = {
                    "payout_method": cashout_details.get("payout_method"),
                    "payout_account": cashout_details.get("payout_account"),
                    "source_amount_bdt": str(poisha_to_bdt(cashout_details.get("source_amount", 0))),
                    "payout_amount_bdt": str(poisha_to_bdt(cashout_details.get("payout_amount", 0)))
                }
        elif service_type == "RECHARGE":
            recharge_details = await self.recharge_repo.get_by_order_id(order_id)
            if recharge_details:
                recharge_details = {
                    "recharge_mobile_number": recharge_details.get("recharge_mobile_number"),
                    "recharge_amount_bdt": str(poisha_to_bdt(recharge_details.get("recharge_amount", 0))),
                    "customer_pay_amount_bdt": str(poisha_to_bdt(recharge_details.get("customer_pay_amount", 0)))
                }

        guest_token = None
        if order.get("guest_session_id"):
            guest_token = generate_tracking_token(order_id, order["guest_session_id"])

        return {
            "order_id": order["order_id"],
            "service_type": service_type,
            "operator_code": order["operator_code"],
            "mobile_number": order["mobile_number"],
            "amount_bdt": poisha_to_bdt(amount_poisha),
            "amount_poisha": amount_poisha,
            "currency": order.get("currency", "BDT"),
            "status": raw_status,
            "status_display_en": status_en_map.get(raw_status, raw_status),
            "status_display_bn": status_bn_map.get(raw_status, raw_status),
            "is_terminal": is_terminal,
            "is_failed": is_failed,
            "is_waiting": is_waiting,
            "waiting_message_en": waiting_msg_en,
            "waiting_message_bn": waiting_msg_bn,
            "current_step_index": current_step_index,
            "total_steps": len(steps),
            "steps": steps,
            "transfer_progress": transfer_progress,
            "completed_amount_bdt": amt_done if transfer_progress else None,
            "remaining_amount_bdt": rem_amt if transfer_progress else None,
            "action_required": transfer_progress.get("action_required") if transfer_progress else None,
            "next_action": transfer_progress.get("next_action") if transfer_progress else None,
            "otp_required_for_next_chunk": transfer_progress.get("otp_required_for_next_chunk", False) if transfer_progress else False,
            "view_full_order_url": f"https://www.flexitaka.com/app/order/{order_id}",
            "tracking_token": guest_token or tracking_token,
            "cashout_details": cashout_details,
            "recharge_details": recharge_details,
            "last_updated": coerce_to_iso_str(order.get("updated_at")) or coerce_to_iso_str(order.get("created_at")),
            "created_at": coerce_to_iso_str(order.get("created_at"))
        }

