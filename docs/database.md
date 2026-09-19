# FlexiTaka Database Documentation (MongoDB)

FlexiTaka uses a single shared MongoDB database across Web, Mobile App, and Admin Panel.

---

## Financial Data Representation
- **No Binary Floating Point**: Floating-point representations (`1000.50` as float) are strictly forbidden.
- **Integer Poisha**: All monetary figures in MongoDB collections are stored as integer **poisha** (`1 BDT = 100 poisha`).
  - Example: `৳1,000.00` is persisted as `100000`.
  - Example: `৳50.25` is persisted as `5025`.

---

## The 20 Shared Collections & Schema Definitions

### 1. `users`
Registered user profiles (phone-based authentication).
- `user_id`: String (Unique, e.g. `FT-U-10023`)
- `phone`: String (Unique, normalized Bangladeshi mobile number `01XXXXXXXXX`)
- `role`: String (`USER`)
- `status`: String (`ACTIVE`, `SUSPENDED`)
- `created_at`, `updated_at`: UTC ISO Datetime strings

### 2. `guest_sessions`
Ephemeral guest sessions for users continuing without an account.
- `guest_session_id`: String (Unique, e.g. `FT-G-108249`)
- `ip`: Optional String
- `user_agent`: Optional String
- `expires_at`: UTC Datetime (TTL Index: automatically purged after 30 days)
- `created_at`, `updated_at`: UTC ISO Datetime strings

### 3. `orders`
The primary source of truth for all transactions.
- `order_id`: String (Unique, e.g. `FT-108249`)
- `service_type`: Enum (`CASH_OUT`, `RECHARGE`)
- `user_id`: Optional String
- `guest_session_id`: Optional String
- `operator_code`: Enum (`GP`, `ROBI`, `BANGLALINK`)
- `mobile_number`: String (Customer phone number)
- `amount`: Integer (in poisha)
- `currency`: String (`BDT`)
- `status`: Enum (CashOutStatus or RechargeStatus)
- `pricing_snapshot`: Object (Immutable record of fees/discounts when confirmed)
- `payment_id`: Optional String
- `payout_id`: Optional String
- `metadata`: Object
- `created_at`, `updated_at`, `completed_at`, `cancelled_at`: UTC ISO Datetime strings

### 4. `cashout_orders`
Specific service details for Cash Out transactions.
- `order_id`: String (Unique index, foreign key to `orders`)
- `source_operator`: String
- `source_mobile_number`: String
- `source_amount`: Integer (in poisha)
- `platform_fee_amount`: Integer (in poisha)
- `platform_fee_rate`: Float (e.g. `20.0`)
- `payout_amount`: Integer (in poisha)
- `payout_method`: Enum (`BKASH`, `NAGAD`, `BANK`)
- `payout_account`: String
- `receiving_sim_id`: Optional String
- `transfer_reference`: Optional String
- `proof_id`: Optional String
- `verification_status`: String (`PENDING`, `APPROVED`, `REJECTED`)
- `verified_by`: Optional String
- `verified_at`: Optional String
- `rejection_reason`: Optional String

### 5. `recharge_orders`
Specific service details for Recharge transactions.
- `order_id`: String (Unique index, foreign key to `orders`)
- `operator_code`: String
- `recharge_mobile_number`: String
- `recharge_amount`: Integer (in poisha)
- `discount_rate`: Float (e.g. `5.0`)
- `discount_amount`: Integer (in poisha)
- `customer_pay_amount`: Integer (in poisha)
- `payment_id`: Optional String
- `source_receiving_sim_id`: Optional String
- `processing_reference`: Optional String
- `completed_at`: Optional String

### 6. `payments`
Customer-to-FlexiTaka payments for recharge.
- `payment_id`: String (Unique, e.g. `PAY-108249`)
- `order_id`: String
- `method`: Enum (`BKASH`, `NAGAD`, `BANK`)
- `amount`: Integer (in poisha)
- `payer_reference`: String
- `transaction_reference`: String
- `status`: Enum (`PENDING`, `VERIFIED`, `FAILED`, `CANCELLED`)
- `verified_by`, `verified_at`: Optional strings

### 7. `payouts`
FlexiTaka-to-Customer payouts for cash out.
- `payout_id`: String (Unique, e.g. `OUT-108249`)
- `order_id`: String (**Unique index: guarantees zero double-payouts**)
- `method`: Enum (`BKASH`, `NAGAD`, `BANK`)
- `amount`: Integer (in poisha)
- `recipient_account`: String
- `status`: Enum (`PENDING`, `PROCESSING`, `SENT`, `FAILED`, `CANCELLED`)
- `provider_reference`: Optional String
- `processed_by`, `processed_at`: Optional strings

### 8. `operators`
Telecom operator master records.
- `operator_code`: String (Unique: `GP`, `ROBI`, `BANGLALINK`)
- `name`: String
- `display_name`: String
- `status`: String (`ACTIVE`, `INACTIVE`)
- `logo_key`: String
- `supported_services`: Array of strings (`["CASH_OUT", "RECHARGE"]`)

### 9. `receiving_sims`
FlexiTaka balance receiving SIMs.
- `receiving_sim_id`: String (Unique, e.g. `SIM-108249`)
- `operator_code`: String
- `mobile_number`: String
- `label`: String
- `status`: Enum (`ACTIVE`, `INACTIVE`, `BLOCKED`, `MAINTENANCE`)
- `available_balance`: Integer (poisha)
- `daily_limit`: Integer (poisha)
- `current_usage`: Integer (poisha)

### 10. `balance_inventory` & `balance_movements`
Operator balance ledger and immutable movement history.
- `inventory_id`: String (Unique, e.g. `INV-GP`)
- `operator_code`: String
- `balance_amount`: Integer (poisha)
- `available_amount`: Integer (poisha)
- `movements`:
  - `movement_id`: String (Unique)
  - `operator_code`: String
  - `amount`: Integer (poisha, positive = transfer received, negative = recharge consumed)
  - `movement_type`: Enum (`TRANSFER_RECEIVED`, `RECHARGE_CONSUMED`, `MANUAL_ADJUSTMENT`, `CORRECTION`)
  - `before_balance`, `after_balance`: Integer (poisha)
  - `reason`: String
  - `actor_type`, `actor_id`: String

### 11. `pricing_rules`
Authoritative fee and discount rates.
- `rule_id`: String (Unique, e.g. `RULE-108249`)
- `service_type`: Enum (`CASH_OUT`, `RECHARGE`)
- `operator_code`: String (`ALL`, `GP`, `ROBI`, `BANGLALINK`)
- `rate_type`: String (`PERCENTAGE`, `DISCOUNT_PERCENTAGE`)
- `rate_value`: Float (e.g. `20.0` or `5.0`)
- `min_amount`, `max_amount`: Float (in BDT)
- `status`: String (`ACTIVE`, `INACTIVE`)
- `version`: Integer

### 12. `order_events`
Immutable state transition ledger.
- `event_id`: String (Unique)
- `order_id`: String
- `previous_status`: Optional String
- `new_status`: String
- `actor_type`: Enum (`SYSTEM`, `USER`, `GUEST`, `STAFF`)
- `actor_id`: String
- `note`: Optional String
- `created_at`: UTC ISO Datetime

### 13. `transaction_proofs`
Proof file metadata.
- `proof_id`: String (Unique, e.g. `PRF-108249`)
- `order_id`: String
- `file_key`: String (Path to private storage on VPS)
- `file_name`: String
- `mime_type`: String (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`)
- `size_bytes`: Integer
- `uploaded_by_type`: String
- `uploaded_by_id`: String
- `status`: String (`SUBMITTED`, `VERIFIED`, `REJECTED`)

### 14. `support_tickets`
Customer and guest support conversations.
- `ticket_id`: String (Unique, e.g. `TCK-108249`)
- `user_id`, `guest_session_id`, `order_id`: Optional Strings
- `category`: String
- `subject`: String
- `priority`: String
- `status`: Enum (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_USER`, `RESOLVED`, `CLOSED`)
- `messages`: Array of `{sender_type, sender_id, message, created_at}`

### 15. `notifications`
Transactional alerts.
- `notification_id`: String (Unique)
- `user_id`, `guest_session_id`, `order_id`: Optional Strings
- `channel`: String (`IN_APP`, `PUSH`)
- `title`, `message`, `type`: Strings
- `status`: String (`UNREAD`, `READ`)

### 16. `kyc_records`
Identity verification records (extensible for Phase 2).

### 17. `fraud_risk_records`
Velocity and anomaly detection records.

### 18. `admin_users`
Staff accounts and credentials.
- `admin_user_id`: String (Unique)
- `email`: String (Unique)
- `password_hash`: String (bcrypt)
- `role`: Enum (`SUPER_ADMIN`, `ADMIN`, `SUPPORT`, `FINANCE`, `VERIFIER`, `OPERATIONS`)
- `status`: String (`ACTIVE`, `INACTIVE`)

### 19. `audit_logs`
Append-only operational audit log for all staff mutations.
- `audit_id`: String (Unique)
- `actor_type`: String (`STAFF`, `SYSTEM`)
- `actor_id`: String
- `action`: String (e.g. `VERIFY_CASHOUT_APPROVED`, `MARK_ORDER_PAID`, `UPDATE_PRICING_RULE`)
- `resource_type`, `resource_id`: Strings
- `before`, `after`: Objects (diff)
- `reason`, `ip_address`, `user_agent`: Strings

### 20. `system_settings`
Configurable platform operational parameters.
- `key`: String (Unique)
- `value`: Any
- `updated_by`, `updated_at`: Strings
