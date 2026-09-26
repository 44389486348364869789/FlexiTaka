"""
Authoritative Cash Out Business Flow Service.
Automated SIM Balance -> Liquid Payout Workflow.
Integrates Reusable Transfer Engine for automated chunked balance transfers from customer SIM.
"""

from decimal import Decimal
import time
from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.constants import (
    ActorType, CashOutStatus, ErrorCode, ServiceType,
    bdt_to_poisha, poisha_to_bdt
)
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.logging import logger
from app.core.security import derive_default_pin, generate_order_id, generate_tracking_token
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.operators.resolver import normalize_msisdn, resolve_operator_from_msisdn
from app.modules.operators.session_manager import OperatorSessionService
from app.modules.pricing.service import PricingService
from app.modules.transfers.engine import TransferEngine


class CashOutService:
    def __init__(
        self,
        orders_repo: OrdersRepository,
        cashout_repo: CashOutRepository,
        sims_repo: ReceivingSimsRepository,
        pricing_service: PricingService,
        db: Optional[AsyncIOMotorDatabase] = None
    ):
        self.orders_repo = orders_repo
        self.cashout_repo = cashout_repo
        self.sims_repo = sims_repo
        self.pricing_service = pricing_service
        self.db = db if db is not None else orders_repo.db
        self.session_service = OperatorSessionService(self.db)
        self.transfer_engine = TransferEngine(self.db, self.session_service)

    async def create_cashout_order(
        self,
        operator_code: str,
        source_mobile_number: str,
        amount_bdt: str,
        payout_method: str,
        payout_account: str,
        pin: Optional[str] = None,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if not user_id and not guest_session_id:
            raise ValidationException("Either user_id or guest_session_id is required", code=ErrorCode.AUTH_REQUIRED)

        from app.modules.operators.resolver import validate_operator_match
        validate_operator_match(operator_code, source_mobile_number)

        source_phone = normalize_msisdn(source_mobile_number)
        num_amount = int(float(amount_bdt))

        # Authoritative Quota Precheck before financial reservation or chunk creation
        session_data = await self.session_service.get_session(source_phone, operator_code)
        precheck = await self.transfer_engine.calculate_quota_and_executable(
            source_number=source_phone,
            operator_code=operator_code,
            requested_amount_bdt=num_amount,
            session_data=session_data
        )
        if not precheck.get("can_execute_full"):
            max_exec = precheck.get("max_executable_now_bdt", 0)
            reason = "সীমাবদ্ধতার"
            if precheck.get("is_cooldown_active"):
                reason = f"অপারেটর কুলডাউন চালু আছে ({precheck['active_cooldown_remaining_seconds']} সেকেন্ড বাকি)"
            elif precheck.get("remaining_transfer_count") == 0:
                reason = "ট্রান্সফার গণনার সীমা অতিক্রম করেছে (Remaining transfer count: 0)"
            elif precheck.get("remaining_daily_amount_bdt") is not None and precheck.get("remaining_daily_amount_bdt") < num_amount:
                reason = f"দৈনিক কোটা অতিক্রম করেছে (Daily limit remaining: ৳{precheck['remaining_daily_amount_bdt']})"
            elif precheck.get("remaining_monthly_amount_bdt") is not None and precheck.get("remaining_monthly_amount_bdt") < num_amount:
                reason = f"মাসিক কোটা অতিক্রম করেছে (Monthly limit remaining: ৳{precheck['remaining_monthly_amount_bdt']})"
            elif precheck.get("live_balance_bdt") is not None and precheck.get("live_balance_bdt") < num_amount:
                reason = f"পর্যাপ্ত ব্যালান্স নেই (Live balance: ৳{precheck['live_balance_bdt']})"

            err_code = ErrorCode.INSUFFICIENT_BALANCE if (precheck.get("live_balance_bdt") is not None and precheck.get("live_balance_bdt") < num_amount) else "QUOTA_LIMIT_EXCEEDED"
            raise ValidationException(
                f"অনুরোধকৃত ৳{num_amount} এর পরিবর্তে বর্তমানে সর্বোচ্চ ৳{max_exec} ক্যাশ আউট সম্ভব। কারণ: {reason} "
                f"(Maximum executable now is ৳{max_exec} due to operator quota/count/balance limit. Requested: ৳{num_amount})",
                code=err_code,
                details=precheck
            )

        # 1. Authoritative Pricing Quote
        quote = await self.pricing_service.calculate_cashout_quote(operator_code, amount_bdt)

        # 2. Server-side Receiving SIM Selection (Strict same-operator match)
        receiving_sim = await self.sims_repo.select_best_sim(operator_code, quote["source_amount_poisha"])
        if not receiving_sim:
            await self.sims_repo.ensure_default_sims()
            receiving_sim = await self.sims_repo.select_best_sim(operator_code, quote["source_amount_poisha"])

        if not receiving_sim:
            raise ValidationException(
                f"No active receiving SIM available for operator {operator_code}. Cannot dispatch Cash Out transfer.",
                code="NO_RECEIVING_SIM_AVAILABLE"
            )

        receiving_number = normalize_msisdn(receiving_sim["mobile_number"])
        receiving_sim_id = receiving_sim["receiving_sim_id"]
        sim_label = receiving_sim.get("label", f"{operator_code} Central Receiver")

        # Authoritative Prefix Validation: receiving SIM must match source operator
        dest_op = resolve_operator_from_msisdn(receiving_number)
        dest_op_str = dest_op.value if hasattr(dest_op, "value") else str(dest_op)
        src_op_str = operator_code.value if hasattr(operator_code, "value") else str(operator_code)

        if dest_op_str.upper() != src_op_str.upper():
            logger.critical(
                "OPERATOR MISMATCH DETECTED: Source %s (%s) does not match destination receiving SIM %s (%s)",
                source_phone, src_op_str, receiving_number, dest_op_str
            )
            raise ValidationException(
                f"Receiving SIM operator mismatch: Source operator is {src_op_str} but receiving SIM is {dest_op_str}. Operation aborted.",
                code="OPERATOR_MISMATCH"
            )

        order_id = generate_order_id()
        # Resolve PIN securely: session/linked SIM encrypted PIN or derived default PIN
        stored_pin = await self.session_service.get_session_pin(source_phone, operator_code)
        if pin:
            effective_pin = str(pin).strip()
            await self.session_service.save_session_pin(source_phone, operator_code, effective_pin)
        elif stored_pin:
            effective_pin = stored_pin
        else:
            effective_pin = derive_default_pin(source_phone)

        pricing_snapshot = {
            "source_amount_bdt": str(quote["source_amount_bdt"]),
            "source_amount_poisha": quote["source_amount_poisha"],
            "platform_fee_rate": str(quote["platform_fee_rate"]),
            "platform_fee_amount_bdt": str(quote["platform_fee_amount_bdt"]),
            "platform_fee_amount_poisha": quote["platform_fee_amount_poisha"],
            "payout_amount_bdt": str(quote["payout_amount_bdt"]),
            "payout_amount_poisha": quote["payout_amount_poisha"],
            "pricing_rule_version": quote["pricing_rule_version"]
        }

        # 3. Create Primary Order Record (Never store plaintext PIN in MongoDB)
        order_doc = {
            "order_id": order_id,
            "service_type": ServiceType.CASH_OUT,
            "user_id": user_id,
            "guest_session_id": guest_session_id,
            "operator_code": operator_code.upper(),
            "mobile_number": source_phone,
            "amount": quote["source_amount_poisha"],
            "currency": "BDT",
            "status": CashOutStatus.WAITING_FOR_TRANSFER.value,
            "pricing_snapshot": pricing_snapshot,
            "metadata": {
                "receiving_mobile_number": receiving_number,
                "receiving_sim_id": receiving_sim_id,
                "transfer_pin_configured": True,
                "payout_method": payout_method,
                "payout_account": payout_account
            }
        }
        saved_order = await self.orders_repo.create_order(order_doc)

        # 4. Create Cash Out Details
        cashout_doc = {
            "order_id": order_id,
            "source_operator": operator_code.upper(),
            "source_mobile_number": source_phone,
            "source_amount": quote["source_amount_poisha"],
            "platform_fee_amount": quote["platform_fee_amount_poisha"],
            "platform_fee_rate": float(quote["platform_fee_rate"]),
            "payout_amount": quote["payout_amount_poisha"],
            "payout_method": payout_method,
            "payout_account": payout_account,
            "receiving_sim_id": receiving_sim_id,
            "verification_status": "AUTOMATED_TRANSFER"
        }
        await self.cashout_repo.insert_one(cashout_doc)

        # 5. Initialize Automated Chunked Transfer Plan
        await self.transfer_engine.initialize_transfer_plan(
            order_id=order_id,
            service_type=ServiceType.CASH_OUT,
            operator_code=operator_code,
            source_number=source_phone,
            destination_number=receiving_number,
            total_amount_bdt=num_amount
        )

        # 6. Execute First / Eligible Chunks if active session exists
        session_data = await self.session_service.get_session(source_phone, operator_code)
        transfer_result = {}
        if session_data:
            # Advance order status to TRANSFER_IN_PROGRESS
            await self.orders_repo.update_one(
                {"order_id": order_id},
                {"$set": {"status": "TRANSFER_IN_PROGRESS"}}
            )
            transfer_result = await self.transfer_engine.execute_all_eligible_chunks(
                order_id=order_id,
                pin=effective_pin,
                session_data=session_data
            )

        tracking_token = generate_tracking_token(order_id, guest_session_id) if guest_session_id else None

        logger.info(
            "Cash out order created: %s | Amount: %s | Receiving SIM: %s | Transfer Status: %s",
            order_id, quote["source_amount_bdt"], receiving_number, transfer_result
        )

        return {
            "order_id": order_id,
            "status": "TRANSFER_IN_PROGRESS" if session_data else CashOutStatus.WAITING_FOR_TRANSFER.value,
            "operator_code": operator_code,
            "source_mobile_number": source_phone,
            "source_amount_bdt": quote["source_amount_bdt"],
            "source_amount_poisha": quote["source_amount_poisha"],
            "platform_fee_rate": quote["platform_fee_rate"],
            "platform_fee_amount_bdt": quote["platform_fee_amount_bdt"],
            "platform_fee_amount_poisha": quote["platform_fee_amount_poisha"],
            "payout_amount_bdt": quote["payout_amount_bdt"],
            "payout_amount_poisha": quote["payout_amount_poisha"],
            "payout_method": payout_method,
            "payout_account": payout_account,
            "receiving_mobile_number": receiving_number,
            "receiving_sim_label": sim_label,
            "tracking_token": tracking_token,
            "transfer_progress": transfer_result,
            "created_at": saved_order["created_at"]
        }

    async def get_transfer_progress(self, order_id: str) -> Dict[str, Any]:
        return await self.transfer_engine.get_transfer_progress(order_id)

    async def execute_transfer_step(self, order_id: str, pin: Optional[str] = None) -> Dict[str, Any]:
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        source_phone = order["mobile_number"]
        operator_code = order["operator_code"]
        stored_pin = await self.session_service.get_session_pin(source_phone, operator_code)
        effective_pin = pin or stored_pin or derive_default_pin(source_phone)

        session_data = await self.session_service.get_session(source_phone, operator_code)
        if not session_data:
            raise ValidationException(f"No operator session for {source_phone}. Please authenticate.", code="OPERATOR_AUTH_REQUIRED")

        return await self.transfer_engine.execute_next_chunk(order_id, effective_pin, session_data)

    async def confirm_transfer_and_proof(
        self,
        order_id: str,
        transfer_reference: str,
        proof_id: Optional[str] = None,
        actor_id: str = "customer"
    ) -> Dict[str, Any]:
        """Manual confirmation fallback."""
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        if proof_id:
            await self.cashout_repo.attach_proof(order_id, proof_id, transfer_reference)
        else:
            await self.cashout_repo.update_one({"order_id": order_id}, {"$set": {"transfer_reference": transfer_reference}})

        updated = await self.orders_repo.transition_status(
            order_id=order_id,
            expected_current_status=order["status"],
            new_status=CashOutStatus.UNDER_VERIFICATION,
            actor_type=ActorType.USER,
            actor_id=actor_id,
            note=f"Transfer reference provided: {transfer_reference}"
        )
        return updated

    async def precheck_cashout(
        self,
        operator_code: str,
        source_mobile_number: str,
        amount_bdt: Decimal
    ) -> Dict[str, Any]:
        """Authoritative Quota Precheck endpoint service."""
        from app.modules.operators.resolver import validate_operator_match
        validate_operator_match(operator_code, source_mobile_number)
        source_phone = normalize_msisdn(source_mobile_number)
        num_amount = int(amount_bdt)

        session_data = await self.session_service.get_session(source_phone, operator_code)
        return await self.transfer_engine.calculate_quota_and_executable(
            source_number=source_phone,
            operator_code=operator_code,
            requested_amount_bdt=num_amount,
            session_data=session_data
        )

    def _verify_order_ownership(
        self,
        order: Dict[str, Any],
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        tracking_token: Optional[str] = None
    ) -> None:
        """Verifies order ownership for authenticated users and guest sessions."""
        from app.core.exceptions import ForbiddenException
        from app.core.security import verify_tracking_token

        is_owner = False
        if not order.get("user_id") and not order.get("guest_session_id"):
            is_owner = True
        elif user_id and order.get("user_id") == user_id:
            is_owner = True
        elif guest_session_id and order.get("guest_session_id") == guest_session_id:
            is_owner = True
        elif tracking_token and order.get("guest_session_id"):
            if verify_tracking_token(order["order_id"], order["guest_session_id"], tracking_token):
                is_owner = True

        if not is_owner:
            raise ForbiddenException("You do not have permission to access or modify this order.")

    async def verify_next_chunk_otp(
        self,
        order_id: str,
        otp: str,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        tracking_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Consumes one-time password for the next transfer chunk (OTP_PER_TRANSFER).
        Never logs or stores plaintext OTP.
        """
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found", code=ErrorCode.ORDER_NOT_FOUND)
        self._verify_order_ownership(order, user_id, guest_session_id, tracking_token)

        source_phone = order["mobile_number"]
        operator_code = order["operator_code"]
        stored_pin = await self.session_service.get_session_pin(source_phone, operator_code)
        session_data = await self.session_service.get_session(source_phone, operator_code)

        return await self.transfer_engine.execute_all_eligible_chunks(
            order_id=order_id,
            pin=stored_pin,
            session_data=session_data,
            otp=otp.strip()
        )

    async def continue_remaining(
        self,
        order_id: str,
        pin: Optional[str] = None,
        otp: Optional[str] = None,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        tracking_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Continues partial Cash Out order ONLY from unfinished chunks.
        Re-checks live balance, session, quota, count, cooldown, and PIN.
        Never reruns already successful chunks.
        """
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found", code=ErrorCode.ORDER_NOT_FOUND)
        self._verify_order_ownership(order, user_id, guest_session_id, tracking_token)

        source_phone = order["mobile_number"]
        operator_code = order["operator_code"]
        stored_pin = await self.session_service.get_session_pin(source_phone, operator_code)
        effective_pin = pin or stored_pin
        session_data = await self.session_service.get_session(source_phone, operator_code)

        return await self.transfer_engine.continue_remaining_chunks(
            order_id=order_id,
            pin=effective_pin,
            otp=otp,
            session_data=session_data
        )

    async def cancel_remaining(
        self,
        order_id: str,
        actor_id: str = "customer",
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        tracking_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Finalizes confirmed received amount, cancels uncompleted chunks,
        and recalculates payout authoritatively based ONLY on confirmed received amount.
        """
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found", code=ErrorCode.ORDER_NOT_FOUND)
        self._verify_order_ownership(order, user_id, guest_session_id, tracking_token)

        return await self.transfer_engine.cancel_remaining_chunks(
            order_id=order_id,
            pricing_service=self.pricing_service,
            actor_id=actor_id
        )
