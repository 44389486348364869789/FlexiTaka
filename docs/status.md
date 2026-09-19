# FlexiTaka Master Status & State Machine Specification

## 1. Cash Out State Machine

```
[REQUESTED]
     │
     ▼
[WAITING_FOR_TRANSFER] (FlexiTaka receiving SIM assigned and displayed)
     │
     ▼
[TRANSFER_RECEIVED] (Customer inputs operator transfer reference / TrxID)
     │
     ▼
[UNDER_VERIFICATION] (Submitted for staff verification)
     │
     ├──────────────────────┬──────────────────────┐
     ▼                      ▼                      ▼
 [APPROVED]             [REJECTED]            [CANCELLED]
     │
     ▼
[PAYOUT_PROCESSING] (Distributed lock acquired, payout initiated)
     │
     ▼
[COMPLETED] (MFS/Bank payout sent successfully)
```

### Transition Matrix (Cash Out)
| From State | Allowed Target States | Permitted Actors |
|------------|-----------------------|------------------|
| `REQUESTED` | `WAITING_FOR_TRANSFER`, `CANCELLED` | System, User |
| `WAITING_FOR_TRANSFER` | `TRANSFER_RECEIVED`, `CANCELLED` | User, Guest |
| `TRANSFER_RECEIVED` | `UNDER_VERIFICATION`, `CANCELLED` | System |
| `UNDER_VERIFICATION` | `APPROVED`, `REJECTED`, `CANCELLED` | Staff (Verifier, Admin, Super Admin) |
| `APPROVED` | `PAYOUT_PROCESSING`, `CANCELLED` | Staff (Finance, Super Admin) |
| `PAYOUT_PROCESSING` | `COMPLETED`, `REJECTED` | Staff (Finance, Super Admin) |
| `COMPLETED` | *Terminal State (No transitions permitted)* | None |
| `REJECTED` | *Terminal State* | None |
| `CANCELLED` | *Terminal State* | None |

---

## 2. Recharge State Machine

```
[REQUESTED]
     │
     ▼
[PAYMENT_PENDING] (Awaiting customer payment to FlexiTaka account)
     │
     ├──────────────────────┬──────────────────────┐
     ▼                      ▼                      ▼
[PAYMENT_VERIFIED]    [PAYMENT_FAILED]        [CANCELLED]
     │
     ▼
[RECHARGE_PROCESSING] (Operator airtime top-up dispatched)
     │
     ├──────────────────────┐
     ▼                      ▼
[COMPLETED]             [REJECTED]
```

### Transition Matrix (Recharge)
| From State | Allowed Target States | Permitted Actors |
|------------|-----------------------|------------------|
| `REQUESTED` | `PAYMENT_PENDING`, `CANCELLED` | System, User |
| `PAYMENT_PENDING` | `PAYMENT_VERIFIED`, `PAYMENT_FAILED`, `CANCELLED` | Staff, System |
| `PAYMENT_VERIFIED` | `RECHARGE_PROCESSING`, `CANCELLED` | Staff, Operations |
| `RECHARGE_PROCESSING` | `COMPLETED`, `REJECTED` | Staff, Operations |
| `COMPLETED` | *Terminal State* | None |
| `PAYMENT_FAILED` | *Terminal State* | None |
| `REJECTED` | *Terminal State* | None |
| `CANCELLED` | *Terminal State* | None |

---

## 3. Payout Statuses
- `PENDING`: Payout record created but not yet claimed by finance queue.
- `PROCESSING`: Staff or automated gateway currently executing transfer.
- `SENT`: Payout completed with external provider reference recorded.
- `FAILED`: Payout transaction rejected by payment provider.
- `CANCELLED`: Payout voided.
