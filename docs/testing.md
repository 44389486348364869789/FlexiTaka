# FlexiTaka Testing Guide & Verification Results

## 1. Test Suite Architecture

The test suite is located in `flexitaka/backend/tests/` and uses `pytest` with `pytest-asyncio` and `httpx`.

| Test Module | Coverage Scope |
|-------------|----------------|
| `test_pricing.py` | Unit tests for Decimal conversions, poisha conversions, 20% Cash Out fee, 5% Recharge discount, and boundary limits. |
| `test_auth_and_guest.py` | Integration tests for guest session creation, expiration handling, OTP verification, and admin password authentication. |
| `test_cashout_lifecycle.py` | Full state machine verification: quote $\rightarrow$ order creation $\rightarrow$ transfer confirmation $\rightarrow$ verification approval $\rightarrow$ payout execution $\rightarrow$ completion. |
| `test_recharge_lifecycle.py` | Full recharge lifecycle: quote $\rightarrow$ order creation $\rightarrow$ payment recording $\rightarrow$ payment verification $\rightarrow$ recharge completion $\rightarrow$ inventory deduction. |
| `test_concurrency_payout.py` | Race-condition test firing 5 simultaneous payout requests; verifies exactly 1 succeeds and 4 receive 409 Conflict. |
| `test_idempotency.py` | Rapid double-click order creation replay with `Idempotency-Key` returning identical order without database duplication. |
| `test_proof_security.py` | Magic byte sniffing rejecting spoofed extensions, size limits, and anti-IDOR permission enforcement. |
| `test_rbac_permissions.py` | Role-based boundary enforcement (e.g. Finance cannot alter pricing, Support cannot execute payouts) and append-only audit logging. |
| `test_inventory_ledger.py` | Balance inventory ledger movements, addition/deduction formulas, and audit history. |

---

## 2. Running Tests

```bash
cd flexitaka/backend
pytest -v tests
```

### Verified Test Results
```
tests/test_auth_and_guest.py::test_guest_session_creation_and_lookup PASSED
tests/test_auth_and_guest.py::test_expired_guest_session_handling PASSED
tests/test_auth_and_guest.py::test_otp_auth_flow PASSED
tests/test_auth_and_guest.py::test_admin_login PASSED
tests/test_cashout_lifecycle.py::test_cashout_complete_lifecycle PASSED
tests/test_cashout_lifecycle.py::test_unauthorized_premature_payout_rejected PASSED
tests/test_concurrency_payout.py::test_simultaneous_double_payout_protection PASSED
tests/test_idempotency.py::test_order_creation_idempotency PASSED
tests/test_idempotency.py::test_recharge_order_creation_idempotency PASSED
tests/test_inventory_ledger.py::test_inventory_adjustment_and_movement_history PASSED
tests/test_pricing.py::test_currency_conversion_utilities PASSED
tests/test_pricing.py::test_cashout_pricing_examples PASSED
tests/test_pricing.py::test_recharge_pricing_examples PASSED
tests/test_pricing.py::test_pricing_out_of_range_rejected PASSED
tests/test_proof_security.py::test_valid_image_upload_and_download PASSED
tests/test_proof_security.py::test_fake_extension_magic_bytes_rejected PASSED
tests/test_proof_security.py::test_idor_unauthorized_user_cannot_access_other_proof PASSED
tests/test_rbac_permissions.py::test_support_cannot_execute_payout PASSED
tests/test_rbac_permissions.py::test_finance_cannot_change_pricing PASSED
tests/test_rbac_permissions.py::test_super_admin_pricing_update_creates_audit_log PASSED
tests/test_recharge_lifecycle.py::test_recharge_complete_lifecycle PASSED

============= 21 passed in 2.21s =============
```
