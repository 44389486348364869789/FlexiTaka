# FlexiTaka Core Business Rules & Policies

## 1. Financial & Pricing Formulas

All money math is evaluated server-side using Decimal arithmetic:

### Cash Out (SIM Balance → Cash)
$$\text{Platform Fee Amount} = \left\lfloor \text{Source Amount} \times \frac{\text{Platform Fee Rate}}{100} \right\rceil_{0.01}$$
$$\text{Payout Amount} = \text{Source Amount} - \text{Platform Fee Amount}$$

- **Current Configured Default Rate**: `20%`
- **Examples**:
  - `৳1,000.00` Balance Transfer $\rightarrow$ `৳200.00` Fee $\rightarrow$ `৳800.00` Net Payout
  - `৳500.00` Balance Transfer $\rightarrow$ `৳100.00` Fee $\rightarrow$ `৳400.00` Net Payout
  - `৳100.00` Balance Transfer $\rightarrow$ `৳20.00` Fee $\rightarrow$ `৳80.00` Net Payout

### Discounted Recharge
$$\text{Discount Amount} = \left\lfloor \text{Recharge Face Value} \times \frac{\text{Discount Rate}}{100} \right\rceil_{0.01}$$
$$\text{Customer Pay Amount} = \text{Recharge Face Value} - \text{Discount Amount}$$

- **Current Configured Default Rate**: `5%`
- **Examples**:
  - `৳1,000.00` Recharge $\rightarrow$ `৳50.00` Discount $\rightarrow$ `৳950.00` Customer Payment
  - `৳500.00` Recharge $\rightarrow$ `৳25.00` Discount $\rightarrow$ `৳475.00` Customer Payment
  - `৳100.00` Recharge $\rightarrow$ `৳5.00` Discount $\rightarrow$ `৳95.00` Customer Payment

### Order Pricing Snapshot Rule
When an order is confirmed, the exact pricing breakdown (`pricing_snapshot`) is immutably frozen onto the order document. Future updates to general pricing rules will never alter existing, in-flight, or completed orders.

---

## 2. Zero Operator Credentials Policy

FlexiTaka is strictly non-custodial regarding telecom credentials:
1. **Never Collect Passwords**: FlexiTaka staff or systems never request or accept official operator passwords or MyGP / MyRobi / MyBL credentials.
2. **Never Collect Operator OTPs**: The user executes the balance transfer directly inside their own official operator app or USSD channel.
3. **Only Reference IDs & Proofs Collected**: FlexiTaka only asks for the transfer confirmation reference ID / screenshot.

---

## 3. Smart Receiving SIM Allocation Algorithm

When a Cash Out order is submitted:
1. Filter receiving SIMs by `operator_code` matching the order and status `ACTIVE`.
2. Sort by `current_usage` ascending.
3. Select the first SIM where `current_usage + order_amount <= daily_limit`.
4. If all active SIMs have exceeded the daily limit, select the SIM with the lowest usage or flag operational notice.

---

## 4. Double-Payout & Concurrency Guarantees

1. **Redis Lock**: Prior to processing a payout, acquire `lock:payout:{order_id}`.
2. **Atomic Status Check**: Verify order is currently in `APPROVED` status before advancing to `PAYOUT_PROCESSING`.
3. **Database Unique Constraint**: Unique index on `payouts.order_id` guarantees duplicate payouts cannot be committed.
4. **Conflict Handling**: Concurrent attempts receive HTTP 409 Conflict without modifying financial state.
