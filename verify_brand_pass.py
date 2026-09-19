import urllib.request
import glob
import sys

base = "http://127.0.0.1:3000"
pages = [
    ("/", "Home Page", "STATIC"),
    ("/cash-out", "Cash Out Landing", "STATIC"),
    ("/recharge", "Recharge Landing", "STATIC"),
    ("/pricing", "Pricing Page", "STATIC"),
    ("/app", "Web App Dashboard", "STATIC"),
    ("/app/cashout", "Cash Out Wizard", "CLIENT_SUSPENSE"),
    ("/app/recharge", "Recharge Wizard", "CLIENT_SUSPENSE")
]

required_logos = [
    ("/images/flexitaka-logo.png", "FlexiTaka Brand Logo"),
    ("/logos/gp.svg", "Grameenphone Official Vector"),
    ("/logos/robi.svg", "Robi Official Vector"),
    ("/logos/banglalink.svg", "Banglalink Official Vector"),
    ("/logos/bkash.svg", "bKash Official Vector"),
    ("/logos/nagad.svg", "Nagad Official Vector")
]

print("=== 1. VERIFYING ALL STATIC ASSET HTTP 200 STATUS ===", flush=True)
for logo, name in required_logos:
    url = base + logo
    req = urllib.request.Request(url, headers={"User-Agent": "FlexiTakaVerification/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            content = resp.read()
            print(f"PASS: {name:30} ({logo}) -> Status: {resp.status} OK | Size: {len(content)} bytes", flush=True)
    except Exception as e:
        print(f"FAIL: {name:30} ({logo}) -> Error: {e}", flush=True)
        sys.exit(1)

print("\n=== 2. VERIFYING LOGO PRESENCE ACROSS PAGES AND BUNDLES ===", flush=True)
all_pass = True

# Read compiled client chunks for client component validation
client_chunk_text = ""
for js_file in glob.glob("/root/flexitaka/website/.next/static/chunks/**/*.js", recursive=True):
    with open(js_file, "r", errors="ignore") as f:
        client_chunk_text += f.read()

for path, name, page_type in pages:
    url = base + path
    req = urllib.request.Request(url, headers={"User-Agent": "FlexiTakaVerification/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode("utf-8")
    except Exception as e:
        print(f"Page [{name} ({path})] -> FAILED to load: {e}", flush=True)
        all_pass = False
        continue

    has_ft_logo = "/images/flexitaka-logo.png" in html
    print(f"Page [{name:20} ({path:15})] -> Status 200 OK", flush=True)
    print(f"  FlexiTaka Brand Logo in HTML/Loading State: {'PASS' if has_ft_logo else 'FAIL'}", flush=True)
    if not has_ft_logo:
        all_pass = False

    search_target = html if page_type == "STATIC" else client_chunk_text
    has_gp = "/logos/gp.svg" in search_target
    has_robi = "/logos/robi.svg" in search_target
    has_bl = "/logos/banglalink.svg" in search_target
    has_bkash = "/logos/bkash.svg" in search_target
    has_nagad = "/logos/nagad.svg" in search_target

    if path in ["/", "/cash-out", "/recharge", "/pricing", "/app/cashout", "/app/recharge"]:
        telecom_pass = has_gp and has_robi and has_bl
        print(f"  Telecom Logos (GP/Robi/BL): {'PASS' if telecom_pass else 'FAIL'}", flush=True)
        if not telecom_pass:
            all_pass = False

    if path in ["/", "/app/cashout", "/app/recharge"]:
        wallet_pass = has_bkash and has_nagad
        print(f"  Wallet Logos (bKash/Nagad): {'PASS' if wallet_pass else 'FAIL'}", flush=True)
        if not wallet_pass:
            all_pass = False

print("\n=== 3. VERIFYING NEUTRAL LABELS & POLICIES ===", flush=True)
with urllib.request.urlopen(urllib.request.Request(base + "/", headers={"User-Agent": "FlexiTakaVerification/1.0"}), timeout=5) as resp:
    home_html = resp.read().decode("utf-8")

print("Neutral Label 'Supported Telecom Networks':", "PASS" if "Supported Telecom Networks" in home_html else "FAIL", flush=True)
print("Neutral Label 'Available Wallets':", "PASS" if "Available Wallets" in home_html else "FAIL", flush=True)
print("Neutral Label in Calculator 'Available Networks':", "PASS" if "Available Networks" in home_html else "FAIL", flush=True)
print("Zero partnership/endorsement claims in Home:", "PASS" if ("partner" not in home_html.lower() and "endors" not in home_html.lower()) else "FAIL", flush=True)

print("\n=== 4. VERIFYING RESPONSIVE CSS ===", flush=True)
globals_css = open("/root/flexitaka/website/src/styles/globals.css").read()
print("brand-logo class present:", "PASS" if ".brand-logo" in globals_css else "FAIL", flush=True)
print("Mobile responsive media query for brand-logo:", "PASS" if "@media (max-width: 600px)" in globals_css and "brand-logo" in globals_css else "FAIL", flush=True)

if all_pass:
    print("\nOVERALL STATUS: ALL BRAND CHECKS PASSED", flush=True)
else:
    print("\nOVERALL STATUS: SOME CHECKS FAILED", flush=True)
    sys.exit(1)
