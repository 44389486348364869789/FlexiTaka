"""
Background Transfer Worker for FlexiTaka.
Asynchronously processes multi-chunk balance transfers and cooldown resumes.
Recovers pending jobs from persistent state across server reboots.
"""

import asyncio
import time
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.logging import logger
from app.modules.transfers.engine import TransferEngine


class TransferWorker:
    def __init__(self, db: AsyncIOMotorDatabase, transfer_engine: TransferEngine):
        self.db = db
        self.ledger = db.transfer_ledger
        self.engine = transfer_engine
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def start(self) -> None:
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info("FlexiTaka Background Transfer Worker started.")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("FlexiTaka Background Transfer Worker stopped.")

    async def _run_loop(self) -> None:
        while self._running:
            try:
                await self.process_pending_transfers()
                await self.process_waiting_recharge_orders()
            except Exception as e:
                logger.error("Error in transfer worker loop: %s", e)
            await asyncio.sleep(10)  # Check every 10 seconds

    async def process_waiting_recharge_orders(self) -> None:
        """
        Background recovery worker: Retries queued WAITING_FOR_SIM recharge orders
        as soon as receiving SIM capacity or cooldown expires.
        """
        waiting_orders = await self.db.orders.find({
            "status": "WAITING_FOR_SIM"
        }).to_list(length=10)

        for order in waiting_orders:
            order_id = order["order_id"]
            operator_code = order["operator_code"]
            recharge_number = order["mobile_number"]
            recharge_face_value_poisha = order.get("metadata", {}).get("recharge_face_value_poisha") or order.get("amount", 0)
            recharge_amount_bdt = int(recharge_face_value_poisha / 100)

            from app.db.repositories.sims_repo import ReceivingSimsRepository
            sims_repo = ReceivingSimsRepository(self.db)
            sim = await sims_repo.select_best_sim(
                operator_code=operator_code,
                required_amount_poisha=recharge_face_value_poisha,
                for_recharge=True,
                destination_msisdn=recharge_number
            )
            if sim:
                sim_id = sim["receiving_sim_id"]
                reserved = await sims_repo.reserve_sim_balance(sim_id, recharge_face_value_poisha)
                if reserved:
                    now = int(time.time())
                    await self.db.orders.update_one(
                        {"order_id": order_id},
                        {"$set": {
                            "status": "RECHARGE_PROCESSING",
                            "metadata.dispatched_sim_id": sim_id,
                            "metadata.dispatched_sim_number": sim["mobile_number"],
                            "updated_at": now
                        }}
                    )
                    await self.engine.initialize_transfer_plan(
                        order_id=order_id,
                        service_type="RECHARGE",
                        operator_code=operator_code,
                        source_number=sim["mobile_number"],
                        destination_number=recharge_number,
                        total_amount_bdt=recharge_amount_bdt
                    )
                    sim_session = await self.engine.session_service.get_session(sim["mobile_number"], operator_code) or {}
                    sim_pin = await sims_repo.get_sim_transfer_pin(sim_id)
                    await self.engine.execute_next_chunk(
                        order_id=order_id,
                        pin=sim_pin,
                        session_data=sim_session
                    )
                    logger.info("WAITING_FOR_SIM order %s successfully dispatched to SIM %s", order_id, sim_id)

    async def process_pending_transfers(self) -> None:
        now = int(time.time())
        # Find any chunk that is WAITING_FOR_COOLDOWN and ready to execute
        ready_chunks = await self.ledger.find({
            "status": "WAITING_FOR_COOLDOWN",
            "next_retry_at": {"$lte": now, "$gt": 0}
        }).to_list(length=20)

        for chunk in ready_chunks:
            order_id = chunk["order_id"]
            # Fetch order context to obtain PIN and session
            order = await self.db.orders.find_one({"order_id": order_id})
            if not order:
                continue

            operator_code = chunk["operator_code"]
            source_phone = chunk["source_number"]

            # Load operator session
            session = await self.engine.session_service.get_session(source_phone, operator_code)
            if not session:
                logger.warning("No active operator session for background transfer of %s", order_id)
                continue

            pin = order.get("metadata", {}).get("transfer_pin") or "1234"
            logger.info("Resuming cooldown transfer for order %s chunk %s", order_id, chunk["sequence_number"])
            await self.engine.execute_next_chunk(order_id, pin, session)
