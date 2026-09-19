import urllib.request
import json
import ssl
import sys

# Standard SSL verification
ctx = ssl.create_default_context()

site_base = "https://www.flexitaka.com"
api_base = "https://flexitaka.online/api/v1"

print("==========================================================", flush=True)
print("     FLEXITAKA PRODUCTION LIVE VERIFICATION SUITE         ", flush=True)
print("==========================================================", flush=True)

all_passed = True

# 1. Test Public Website Routes
pages = [
    ("/", "Home Page"),
    ("/cash-out", "Cash Out Landing"),
    ("/recharge", "Recharge Landing"),
    ("/pricing", "Pricing Page"),
    ("/how-it-works", "How It Works"),
    ("/faq", "FAQ"),
    ("/support", "Support Desk"),
    ("/about", "About Us"),
    ("/terms", "Terms of Service"),
    ("/privacy", "Privacy Policy"),
    ("/app", "Web App Dashboard"),
    ("/app/cashout", "Cash Out Wizard"),
    ("/app/recharge", "Recharge Wizard"),
    ("/app/orders", "Orders History"),
    ("/app/order/ORD-TRACK-DEMO", "Order Tracking"),
    ("/app/support", "In-App Support"),
    ("/app/profile", "User Profile")
]

print("\n--- 1. PUBLIC WEBSITE PAGES (https://www.flexitaka.com) ---", flush=True)
for path, name in pages:
    url = site_base + path
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ProductionAudit/1.0"})
        with urllib.request.urlopen(req, timeout=10, context=ctx) as res:
            body = res.read().decode("utf-8")
            status = res.status
            has_logo = "/images/flexitaka-logo.png" in body
            print(f"PASS: [{name:22} ({path:25})] -> Status {status} | Brand: {'OK' if has_logo else 'N/A'}", flush=True)
    except Exception as e:
        print(f"FAIL: [{name:22} ({path:25})] -> Error: {e}", flush=True)
        all_passed = False

# 2. Test Public Backend Health
print("\n--- 2. PUBLIC BACKEND API HEALTH (https://flexitaka.online) ---", flush=True)
try:
    req = urllib.request.Request(f"{api_base}/health", headers={"User-Agent": "ProductionAudit/1.0"})
    with urllib.request.urlopen(req, timeout=10, context=ctx) as res:
        data = json.loads(res.read().decode("utf-8"))
        print(f"PASS: /health -> Status: {res.status} | Data: {data}", flush=True)
        if data.get("status") != "healthy":
            all_passed = False
except Exception as e:
    print(f"FAIL: /health -> Error: {e}", flush=True)
    all_passed = False

# 3. Test Public API CORS Headers
print("\n--- 3. CORS HEADERS VERIFICATION ---", flush=True)
for origin in ["https://flexitaka.com", "https://www.flexitaka.com"]:
    try:
        req = urllib.request.Request(
            f"{api_base}/health",
            headers={"Origin": origin, "User-Agent": "ProductionAudit/1.0"},
            method="GET"
        )
        with urllib.request.urlopen(req, timeout=10, context=ctx) as res:
            cors_origin = res.headers.get("access-control-allow-origin")
            print(f"Origin {origin:28} -> Allowed: {cors_origin}", flush=True)
            if cors_origin != origin and cors_origin != "*":
                print(f"FAIL: CORS header mismatch for {origin}", flush=True)
                all_passed = False
            else:
                print(f"PASS: CORS allowed for {origin}", flush=True)
    except Exception as e:
        print(f"FAIL: CORS check for {origin} -> Error: {e}", flush=True)
        all_passed = False

# 4. Test Guest Session Creation
print("\n--- 4. GUEST SESSION CREATION VIA PUBLIC API ---", flush=True)
guest_session_id = None
try:
    req = urllib.request.Request(
        f"{api_base}/guest/session",
        data=b"{}",
        headers={"Content-Type": "application/json", "User-Agent": "ProductionAudit/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10, context=ctx) as res:
        data = json.loads(res.read().decode("utf-8"))
        guest_session_id = data.get("guest_session_id")
        print(f"PASS: Guest Session Created -> ID: {guest_session_id} | Active: {data.get('active')}", flush=True)
        if not guest_session_id:
            all_passed = False
except Exception as e:
    print(f"FAIL: Guest Session Creation -> Error: {e}", flush=True)
    all_passed = False

# 5. Test Live Pricing Quotes
print("\n--- 5. AUTHORITATIVE PRICING QUOTES ---", flush=True)
try:
    # Cash Out Quote
    req = urllib.request.Request(
        f"{api_base}/pricing/cashout-quote",
        data=json.dumps({"operator_code": "GP", "amount_bdt": "1000"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "ProductionAudit/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10, context=ctx) as res:
        data = json.loads(res.read().decode("utf-8"))
        print(f"PASS: Cash Out Quote (GP ৳1000) -> Payout: ৳{data.get('payout_amount_bdt')} (Fee: ৳{data.get('platform_fee_amount_bdt')})", flush=True)

    # Recharge Quote
    req = urllib.request.Request(
        f"{api_base}/pricing/recharge-quote",
        data=json.dumps({"operator_code": "ROBI", "recharge_amount_bdt": "500"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "ProductionAudit/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10, context=ctx) as res:
        data = json.loads(res.read().decode("utf-8"))
        print(f"PASS: Recharge Quote (ROBI ৳500) -> Pay: ৳{data.get('customer_pay_amount_bdt')} (Saved: ৳{data.get('discount_amount_bdt')})", flush=True)
except Exception as e:
    print(f"FAIL: Pricing Quotes -> Error: {e}", flush=True)
    all_passed = False

# 6. Test Order Listing with Guest Header
print("\n--- 6. ORDER LISTING VIA GUEST HEADER ---", flush=True)
if guest_session_id:
    try:
        req = urllib.request.Request(
            f"{api_base}/orders?limit=10&skip=0",
            headers={"X-Guest-Session-ID": guest_session_id, "User-Agent": "ProductionAudit/1.0"},
            method="GET"
        )
        with urllib.request.urlopen(req, timeout=10, context=ctx) as res:
            data = json.loads(res.read().decode("utf-8"))
            order_count = len(data) if isinstance(data, list) else len(data.get("orders", []))
            print(f"PASS: Orders list retrieved -> Count: {order_count}", flush=True)
    except Exception as e:
        print(f"FAIL: Orders Listing -> Error: {e}", flush=True)
        all_passed = False

print("\n==========================================================", flush=True)
if all_passed:
    print("ALL PRODUCTION CHECKS PASSED PERFECTLY!", flush=True)
    sys.exit(0)
else:
    print("SOME PRODUCTION CHECKS FAILED!", flush=True)
    sys.exit(1)
