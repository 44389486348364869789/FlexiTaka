"""
MongoDB Index Registration for All 20 Collections.
Ensures unique constraints, compound indexes, and TTL indexes are established at startup.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel
from app.core.logging import logger


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    logger.info("Verifying and ensuring indexes across all 20 MongoDB collections...")

    # 1. users
    await db.users.create_indexes([
        IndexModel([("user_id", ASCENDING)], unique=True),
        IndexModel([("phone", ASCENDING)], unique=True, sparse=True),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)])
    ])

    # 2. guest_sessions (TTL index for automatic cleanup of expired guest sessions)
    await db.guest_sessions.create_indexes([
        IndexModel([("guest_session_id", ASCENDING)], unique=True),
        IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
        IndexModel([("created_at", DESCENDING)])
    ])

    # 3. orders
    await db.orders.create_indexes([
        IndexModel([("order_id", ASCENDING)], unique=True),
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("guest_session_id", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("operator_code", ASCENDING)]),
        IndexModel([("service_type", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)]),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)])
    ])

    # 4. cashout_orders
    await db.cashout_orders.create_indexes([
        IndexModel([("order_id", ASCENDING)], unique=True),
        IndexModel([("verification_status", ASCENDING)]),
        IndexModel([("receiving_sim_id", ASCENDING)]),
        IndexModel([("payout_method", ASCENDING)])
    ])

    # 5. recharge_orders
    await db.recharge_orders.create_indexes([
        IndexModel([("order_id", ASCENDING)], unique=True),
        IndexModel([("payment_id", ASCENDING)]),
        IndexModel([("operator_code", ASCENDING)])
    ])

    # 6. payments
    await db.payments.create_indexes([
        IndexModel([("payment_id", ASCENDING)], unique=True),
        IndexModel([("order_id", ASCENDING)]),
        IndexModel([("transaction_reference", ASCENDING)]),
        IndexModel([("status", ASCENDING)])
    ])

    # 7. payouts - STRICT UNIQUE INDEX ON ORDER_ID PREVENTS DOUBLE PAYOUT
    await db.payouts.create_indexes([
        IndexModel([("payout_id", ASCENDING)], unique=True),
        IndexModel([("order_id", ASCENDING)], unique=True),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("processed_by", ASCENDING)])
    ])

    # 8. operators
    await db.operators.create_indexes([
        IndexModel([("operator_code", ASCENDING)], unique=True),
        IndexModel([("status", ASCENDING)])
    ])

    # 9. receiving_sims
    await db.receiving_sims.create_indexes([
        IndexModel([("receiving_sim_id", ASCENDING)], unique=True),
        IndexModel([("mobile_number", ASCENDING)]),
        IndexModel([("operator_code", ASCENDING), ("status", ASCENDING)])
    ])

    # 10. balance_inventory
    await db.balance_inventory.create_indexes([
        IndexModel([("inventory_id", ASCENDING)], unique=True),
        IndexModel([("operator_code", ASCENDING)]),
        IndexModel([("receiving_sim_id", ASCENDING)])
    ])

    # 11. pricing_rules
    await db.pricing_rules.create_indexes([
        IndexModel([("rule_id", ASCENDING)], unique=True),
        IndexModel([("service_type", ASCENDING), ("operator_code", ASCENDING), ("status", ASCENDING)])
    ])

    # 12. order_events
    await db.order_events.create_indexes([
        IndexModel([("event_id", ASCENDING)], unique=True),
        IndexModel([("order_id", ASCENDING), ("created_at", ASCENDING)])
    ])

    # 13. transaction_proofs
    await db.transaction_proofs.create_indexes([
        IndexModel([("proof_id", ASCENDING)], unique=True),
        IndexModel([("order_id", ASCENDING)]),
        IndexModel([("uploaded_by_id", ASCENDING)])
    ])

    # 14. support_tickets
    await db.support_tickets.create_indexes([
        IndexModel([("ticket_id", ASCENDING)], unique=True),
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("guest_session_id", ASCENDING)]),
        IndexModel([("order_id", ASCENDING)]),
        IndexModel([("status", ASCENDING)])
    ])

    # 15. notifications
    await db.notifications.create_indexes([
        IndexModel([("notification_id", ASCENDING)], unique=True),
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("guest_session_id", ASCENDING)]),
        IndexModel([("status", ASCENDING)])
    ])

    # 16. kyc_records
    await db.kyc_records.create_indexes([
        IndexModel([("kyc_id", ASCENDING)], unique=True),
        IndexModel([("user_id", ASCENDING)])
    ])

    # 17. fraud_risk_records
    await db.fraud_risk_records.create_indexes([
        IndexModel([("risk_id", ASCENDING)], unique=True),
        IndexModel([("order_id", ASCENDING)]),
        IndexModel([("user_id", ASCENDING)])
    ])

    # 18. admin_users
    await db.admin_users.create_indexes([
        IndexModel([("admin_user_id", ASCENDING)], unique=True),
        IndexModel([("email", ASCENDING)], unique=True),
        IndexModel([("role", ASCENDING)]),
        IndexModel([("status", ASCENDING)])
    ])

    # 19. audit_logs
    await db.audit_logs.create_indexes([
        IndexModel([("audit_id", ASCENDING)], unique=True),
        IndexModel([("resource_id", ASCENDING)]),
        IndexModel([("actor_id", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)])
    ])

    # 20. system_settings
    await db.system_settings.create_indexes([
        IndexModel([("key", ASCENDING)], unique=True)
    ])

    # 21. sms_transactions (iPhone Shortcut Payment Gateway)
    await db.sms_transactions.create_indexes([
        IndexModel([("provider", ASCENDING), ("transaction_id", ASCENDING)], unique=True),
        IndexModel([("transaction_id", ASCENDING)]),
        IndexModel([("matched_order_id", ASCENDING)]),
        IndexModel([("verification_status", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)])
    ])

    # 22. transfer_ledger (Reusable Chunked Balance Transfer Engine)
    await db.transfer_ledger.create_indexes([
        IndexModel([("transfer_id", ASCENDING)], unique=True),
        IndexModel([("order_id", ASCENDING), ("sequence_number", ASCENDING)], unique=True),
        IndexModel([("order_id", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("next_retry_at", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)])
    ])

    # 23. operator_sessions (Secure Server-Side Operator Sessions)
    await db.operator_sessions.create_indexes([
        IndexModel([("session_id", ASCENDING)], unique=True),
        IndexModel([("msisdn", ASCENDING), ("operator_code", ASCENDING)], unique=True),
        IndexModel([("updated_at", DESCENDING)])
    ])

    logger.info("All MongoDB collection indexes successfully confirmed.")
