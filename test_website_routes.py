import urllib.request
import sys

routes = [
    "/",
    "/how-it-works",
    "/cash-out",
    "/recharge",
    "/pricing",
    "/faq",
    "/support",
    "/about",
    "/terms",
    "/privacy",
    "/app",
    "/app/cashout",
    "/app/recharge",
    "/app/orders",
    "/app/order/ORD-TRACK-DEMO",
    "/app/support",
    "/app/profile"
]

print("=== VERIFYING ALL NEXT.JS ROUTES ON HTTP://127.0.0.1:3000 ===")
all_passed = True
for r in routes:
    url = f"http://127.0.0.1:3000{r}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FlexiTakaVerification/1.0"})
        with urllib.request.urlopen(req, timeout=5) as res:
            status = res.status
            html = res.read().decode("utf-8")
            has_brand = "Flexi" in html
            print(f"Route {r:18} -> Status {status} | Brand: {has_brand} | Bytes: {len(html)}")
            if status != 200:
                all_passed = False
    except Exception as e:
        print(f"Route {r:18} -> FAILED: {e}")
        all_passed = False

if all_passed:
    print(f"\nALL {len(routes)} ROUTES VERIFIED AND HEALTHY!")
    sys.exit(0)
else:
    print("\nSOME ROUTES FAILED!")
    sys.exit(1)
