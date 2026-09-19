# FlexiTaka Backend API (`https://flexitaka.online`)

Authoritative backend service for the FlexiTaka platform. Powers the Customer Website (`https://flexitaka.com`), Customer Mobile App, and Staff Operations / Admin Panel.

---

## Technical Stack
- **Language**: Python 3.10+
- **Framework**: FastAPI (Modular Monolith)
- **Database**: MongoDB 6+ via Motor (Async driver)
- **Cache & Locks**: Redis 7+ via redis-py
- **Storage**: Private VPS filesystem with authenticated streaming
- **Testing**: Pytest with pytest-asyncio & HTTPX

---

## Key Guarantees
1. **Zero Binary Floating Point**: All financial calculations are evaluated via Python `Decimal` with standard half-up rounding and persisted in MongoDB as integer **poisha** (`1 BDT = 100 poisha`).
2. **Authoritative Pricing & Rules**: Pricing quotes (e.g. 20% Cash Out fee, 5% Recharge discount) and operator availability are strictly computed on the backend.
3. **Double-Payout Immunity**: Protected by database-level unique index on `payouts.order_id`, Redis distributed locks, and atomic state transitions.
4. **Idempotency**: Money-affecting endpoints support `Idempotency-Key` headers to protect against accidental double-clicks and repeated requests.
5. **Private Proofs**: Uploaded screenshots are validated via magic-byte signatures and served strictly through authenticated endpoints.

---

## Quick Start (Local Development)

### 1. Prerequisites
- Python 3.10+
- MongoDB (`mongodb://localhost:27017`)
- Redis (`redis://localhost:6379`)

### 2. Installation
```bash
cd flexitaka/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### 3. Run Development Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 4. Running the Test Suite
```bash
pytest -v tests
```
