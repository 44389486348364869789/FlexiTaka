# FlexiTaka Backend Architecture Documentation

## 1. High-Level System Architecture

FlexiTaka employs a strict domain and infrastructure separation model:
- **Customer Facing Domain (`https://flexitaka.com`)**: Hosts public marketing pages and customer Next.js web application.
- **Backend API Origin (`https://flexitaka.online`)**: Hosts FastAPI backend, MongoDB, Redis, and private file storage.

```
       Customer Browser / Mobile App
                     │
         https://flexitaka.com (Website)
                     │
           HTTPS API Requests (/api/v1)
                     ▼
       https://flexitaka.online/api/v1 (FastAPI)
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
    MongoDB        Redis     Private VPS File Storage
  (20 Collections) (Locks/Cache) (/data/flexitaka/uploads)
```

---

## 2. Core Architectural Principles

### A. Authoritative Server Calculations
Neither the Web client nor the Mobile app performs business-critical money calculations. Platform fees (default 20%), recharge discounts (default 5%), and net payout amounts are calculated solely by `PricingService` using Python `Decimal` and stored as integer **poisha** (`1 BDT = 100 poisha`).

### B. Double-Payout & Concurrency Protection
To prevent financial leaks:
1. **Redis Distributed Mutex**: `distributed_lock(f"payout:{order_id}")` prevents race conditions between simultaneous requests.
2. **Atomic Transition Checks**: Orders can only be marked as paid if their status is atomically verified as `APPROVED`.
3. **Database-Level Unique Index**: A unique index on `payouts.order_id` in MongoDB guarantees that even if concurrent requests pass application checks, MongoDB will reject any second insert with a duplicate key conflict.

### C. Private Proofs & Anti-IDOR Protection
Uploaded transaction screenshots are saved to private VPS storage (`/data/flexitaka/uploads/{year}/{month}/...`). Uploads are verified using magic bytes (detecting true JPEG, PNG, WEBP, and PDF headers). Proof files are never publicly exposed through Nginx static paths; they are streamed through `/api/v1/proofs/{proof_id}` only after validating ownership (via user JWT, guest tracking token, or staff role).

### D. Role-Based Access Control (RBAC)
Staff privileges are partitioned:
- **`SUPPORT`**: View orders, manage tickets. Cannot modify pricing or process payouts.
- **`VERIFIER`**: Verify received balance transfers. Cannot process payouts.
- **`FINANCE`**: Execute payouts, verify customer payments. Cannot alter system pricing rules.
- **`OPERATIONS`**: Manage receiving SIMs, reconcile inventory.
- **`ADMIN` / `SUPER_ADMIN`**: Broad system control. Every mutation creates an immutable entry in `audit_logs`.
