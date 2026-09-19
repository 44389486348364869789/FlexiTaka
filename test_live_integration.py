import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api/v1"

def do_request(method, path, body=None, headers=None):
    url = f"{BASE_URL}{path}"
    headers = headers or {}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, {"error": content}

def run_checks():
    print("=== RUNNING LIVE FASTAPI + MONGODB ATLAS + REDIS CLOUD INTEGRATION CHECKS ===")
    
    # 1. Root Health
    print("1. Checking Root Health...")
    req = urllib.request.Request("http://127.0.0.1:8000/health")
    with urllib.request.urlopen(req, timeout=5) as r:
        h = json.loads(r.read())
        assert h["status"] == "healthy", f"Health failed: {h}"
        print("   -> Root Health: OK")

    # 2. Guest Session
    print("2. Testing Guest Session...")
    code, g_data = do_request("POST", "/guest/session")
    assert code == 200 and "guest_session_id" in g_data, f"Guest creation failed: {code} {g_data}"
    guest_id = g_data["guest_session_id"]
    print(f"   -> Created Guest Session: {guest_id}")
    
    code, g_chk = do_request("GET", "/guest/session", headers={"X-Guest-Session-ID": guest_id})
    assert code == 200 and g_chk.get("active") is True, f"Guest lookup failed: {code} {g_chk}"
    print("   -> Guest Session Active: OK")

    # 3. Operators
    print("3. Testing Operators Listing...")
    code, ops = do_request("GET", "/operators")
    assert code == 200 and ops.get("success") is True, f"Operators failed: {code} {ops}"
    op_codes = [o["operator_code"] for o in ops.get("operators", [])]
    assert "GP" in op_codes and "ROBI" in op_codes and "BANGLALINK" in op_codes
    print(f"   -> Available Operators: {op_codes} - OK")

    # 4. Dynamic Cash Out Quote (Server Authoritative)
    print("4. Testing Cash Out Quote (/pricing/cashout-quote)...")
    code, co_quote = do_request("POST", "/pricing/cashout-quote", {
        "operator_code": "GP",
        "amount_bdt": "1000.00"
    })
    assert code == 200, f"Cashout quote failed: {code} {co_quote}"
    assert co_quote["source_amount_bdt"] == "1000.00"
    assert co_quote["platform_fee_amount_bdt"] == "200.00"
    assert co_quote["payout_amount_bdt"] == "800.00"
    print(f"   -> Cash Out Quote: ৳{co_quote['source_amount_bdt']} -> Fee: ৳{co_quote['platform_fee_amount_bdt']} -> Payout: ৳{co_quote['payout_amount_bdt']} - OK")

    # 5. Dynamic Recharge Quote (Server Authoritative)
    print("5. Testing Recharge Quote (/pricing/recharge-quote)...")
    code, rec_quote = do_request("POST", "/pricing/recharge-quote", {
        "operator_code": "ROBI",
        "recharge_amount_bdt": "1000.00"
    })
    assert code == 200, f"Recharge quote failed: {code} {rec_quote}"
    assert rec_quote["discount_amount_bdt"] == "50.00"
    assert rec_quote["customer_pay_amount_bdt"] == "950.00"
    print(f"   -> Recharge Quote: ৳{rec_quote['recharge_amount_bdt']} -> Discount: ৳{rec_quote['discount_amount_bdt']} -> Pay: ৳{rec_quote['customer_pay_amount_bdt']} - OK")

    # 6. Cash Out Order Creation + Receiving SIM Assignment
    import time
    idemp_co = f"live-co-{time.time()}"
    print("6. Testing Cash Out Order Creation...")
    code, co_order = do_request("POST", "/cashout/orders", {
        "operator_code": "GP",
        "source_mobile_number": "01712345678",
        "amount_bdt": "500.00",
        "payout_method": "BKASH",
        "payout_account": "01811223344"
    }, headers={
        "X-Guest-Session-ID": guest_id,
        "Idempotency-Key": idemp_co
    })
    assert code == 201, f"Cashout order failed: {code} {co_order}"
    order_id = co_order["order_id"]
    tracking_token = co_order["tracking_token"]
    assert co_order["status"] == "WAITING_FOR_TRANSFER"
    assert "receiving_mobile_number" in co_order
    print(f"   -> Order Created: {order_id} | Receiving SIM: {co_order['receiving_mobile_number']} - OK")

    # 7. Idempotency Check
    print("7. Testing Idempotency on Duplicate Cash Out Order...")
    code, dup_order = do_request("POST", "/cashout/orders", {
        "operator_code": "GP",
        "source_mobile_number": "01712345678",
        "amount_bdt": "500.00",
        "payout_method": "BKASH",
        "payout_account": "01811223344"
    }, headers={
        "X-Guest-Session-ID": guest_id,
        "Idempotency-Key": idemp_co
    })
    assert code == 201 and dup_order["order_id"] == order_id, f"Idempotency failed: {code} {dup_order}"
    print("   -> Idempotency Cached Duplicate Response Verified: OK")

    # 8. Cash Out Transfer Confirmation
    print("8. Testing Cash Out Transfer Confirmation...")
    code, conf_res = do_request("POST", f"/cashout/orders/{order_id}/confirm-transfer", {
        "transfer_reference": "TRX-LIVE-TEST-999"
    }, headers={"X-Guest-Session-ID": guest_id})
    assert code == 200 and conf_res["status"] == "UNDER_VERIFICATION", f"Confirm failed: {code} {conf_res}"
    print("   -> Order Status Updated to UNDER_VERIFICATION: OK")

    # 9. Order Tracking with Cryptographic Token (IDOR Protected)
    print("9. Testing Order Tracking Endpoint...")
    code, trk_res = do_request("GET", f"/orders/{order_id}?tracking_token={tracking_token}")
    assert code == 200 and trk_res["order_id"] == order_id, f"Tracking failed: {code} {trk_res}"
    assert len(trk_res.get("events", [])) >= 2, f"Events missing: {trk_res}"
    print(f"   -> Order Tracking Verified ({len(trk_res['events'])} lifecycle events): OK")

    # 10. Recharge Order Creation
    idemp_rec = f"live-rec-{time.time()}"
    print("10. Testing Recharge Order Creation...")
    code, rec_order = do_request("POST", "/recharge/orders", {
        "operator_code": "ROBI",
        "recharge_mobile_number": "01812345678",
        "recharge_amount_bdt": "200.00"
    }, headers={
        "X-Guest-Session-ID": guest_id,
        "Idempotency-Key": idemp_rec
    })
    assert code == 201 and rec_order["status"] == "PAYMENT_PENDING", f"Recharge failed: {code} {rec_order}"
    rec_order_id = rec_order["order_id"]
    print(f"   -> Recharge Order Created: {rec_order_id} - OK")

    # 11. Payments Endpoint
    print("11. Testing Payments Submission...")
    code, pay_res = do_request("POST", "/payments", {
        "order_id": rec_order_id,
        "method": "BKASH",
        "amount_bdt": "190.00",
        "payer_reference": "01812345678",
        "transaction_reference": "BKASH-LIVE-999"
    })
    assert code == 201 and pay_res["status"] == "PENDING", f"Payment failed: {code} {pay_res}"
    print(f"   -> Payment Submitted: {pay_res['payment_id']} - OK")

    # 12. RBAC Access Control
    print("12. Testing RBAC Security...")
    code, rbac_res = do_request("GET", "/admin/summary")
    assert code in (401, 403), f"RBAC failed, unexpected code: {code} {rbac_res}"
    print("   -> Unauthorized Admin Access Successfully Blocked (HTTP 401/403): OK")

    print("\nALL LIVE INTEGRATION CHECKS PASSED SUCCESSFULLY!")
    return True

if __name__ == "__main__":
    if run_checks():
        sys.exit(0)
    else:
        sys.exit(1)
