# FlexiTaka Monorepo

FlexiTaka is an authoritative fintech platform enabling telecom SIM balance cash-outs and discounted airtime recharges across Bangladesh (Grameenphone, Robi, Banglalink).

---

## Domain & Server Architecture

FlexiTaka strictly operates on two distinct domains:
- **`https://flexitaka.com`**: Public Customer Website & Web Application
- **`https://flexitaka.online`**: Authoritative Backend API (`/api/v1`) & Infrastructure

```
flexitaka/
├── backend/             # Authoritative FastAPI Backend (https://flexitaka.online)
├── website/             # Customer Next.js Web App (https://flexitaka.com) [Step 2]
├── app/                 # Flutter Mobile App (Step 3)
├── docs/                # Shared Architecture, API Contracts & Specifications
└── infra/               # Deployment & Reverse Proxy configurations
```

---

## Completed: Phase 1 (Backend First)

The backend has been fully implemented under `flexitaka/backend/`:
- **FastAPI Modular Monolith** with async Motor (MongoDB) and Redis.
- **Authoritative Money Representation**: Evaluated strictly via Decimal and persisted as integer poisha (`1 BDT = 100 poisha`).
- **State Machines**: Authoritative lifecycle enforcement for Cash Out and Recharge flows.
- **Double-Payout Immunity**: Concurrency-safe payout processing backed by Redis distributed locks, atomic state transitions, and unique database indexes.
- **Private Proof Storage**: Uploads verified by magic byte headers and streamed only to authorized users/staff.
- **RBAC & Audit Logging**: Multi-tier staff permissions (`SUPER_ADMIN`, `ADMIN`, `FINANCE`, `VERIFIER`, `OPERATIONS`, `SUPPORT`) with append-only audit tracking.
- **Automated Verification**: 21/21 tests passing across unit, integration, concurrency, idempotency, and security suites.

---

## Documentation Links
- [Client API Contract](file:///root/flexitaka/docs/API_CONTRACT_FOR_CLIENTS.md)
- [Backend Architecture](file:///root/flexitaka/docs/backend-architecture.md)
- [MongoDB Database Schema](file:///root/flexitaka/docs/database.md)
- [State Machine & Status Specifications](file:///root/flexitaka/docs/status.md)
- [Core Business Rules](file:///root/flexitaka/docs/business-rules.md)
- [Production Deployment Guide](file:///root/flexitaka/docs/deployment.md)
- [Testing & Verification Report](file:///root/flexitaka/docs/testing.md)
