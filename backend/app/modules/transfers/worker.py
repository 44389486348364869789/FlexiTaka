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
            except Exception as e:
                logger.error("Error in transfer worker loop: %s", e)
            await asyncio.sleep(10)  # Check every 10 seconds

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
