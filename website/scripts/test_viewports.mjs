import puppeteer from "puppeteer-core";

const VIEWPORTS = [
  { width: 320, height: 568, name: "320x568 (iPhone SE 1st)" },
  { width: 360, height: 800, name: "360x800 (Galaxy S20)" },
  { width: 375, height: 812, name: "375x812 (iPhone X/12 mini)" },
  { width: 390, height: 844, name: "390x844 (iPhone 12/13/14)" },
  { width: 393, height: 873, name: "393x873 (Pixel 7)" },
  { width: 412, height: 915, name: "412x915 (Galaxy S21+)" },
  { width: 430, height: 932, name: "430x932 (iPhone 14 Pro Max)" },
  { width: 768, height: 1024, name: "768x1024 (iPad Mini / Tablet)" },
  { width: 1024, height: 768, name: "1024x768 (Desktop Standard)" },
  { width: 1440, height: 900, name: "1440x900 (Desktop Wide)" },
];

const ROUTES = [
  "/",
  "/cash-out",
  "/recharge",
  "/pricing",
  "/how-it-works",
  "/faq",
  "/support",
  "/about",
  "/terms",
  "/privacy",
  "/app",
  "/app/orders",
  "/app/cashout",
  "/app/recharge",
  "/app/profile",
  "/app/support",
];

async function run() {
  console.log("Launching headless Chrome for viewport overflow testing...");
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: "new",
  });

  const page = await browser.newPage();
  let totalTests = 0;
  let passedTests = 0;
  let failures = [];

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const route of ROUTES) {
      totalTests++;
      const url = `http://127.0.0.1:3000${route}`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
        await new Promise((r) => setTimeout(r, 150));

        const overflowData = await page.evaluate(() => {
          const docScroll = document.documentElement.scrollWidth;
          const bodyScroll = document.body.scrollWidth;
          const winWidth = window.innerWidth;
          const isOverflowing = docScroll > winWidth || bodyScroll > winWidth;

          let overflowingElements = [];
          if (isOverflowing) {
            const allElements = document.querySelectorAll("*");
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              if (rect.right > winWidth + 1) { // 1px tolerance for sub-pixel anti-aliasing
                overflowingElements.push({
                  tag: el.tagName,
                  id: el.id || undefined,
                  className: el.className || undefined,
                  right: rect.right,
                  width: rect.width,
                });
                if (overflowingElements.length >= 5) break;
              }
            }
          }

          return {
            docScroll,
            bodyScroll,
            winWidth,
            isOverflowing,
            overflowingElements,
          };
        });

        if (overflowData.isOverflowing) {
          failures.push({
            viewport: vp.name,
            route,
            ...overflowData,
          });
          console.error(`❌ [FAIL] ${vp.name} on ${route}: doc=${overflowData.docScroll}px, body=${overflowData.bodyScroll}px, win=${overflowData.winWidth}px`);
        } else {
          passedTests++;
        }
      } catch (err) {
        failures.push({
          viewport: vp.name,
          route,
          error: err.message,
        });
        console.error(`⚠️ [ERROR] ${vp.name} on ${route}: ${err.message}`);
      }
    }
  }

  await browser.close();

  console.log("\n=================================");
  console.log(`TOTAL CHECKS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failures.length}`);
  console.log("=================================\n");

  if (failures.length > 0) {
    console.error("FAILURES DETAIL:", JSON.stringify(failures, null, 2));
    process.exit(1);
  } else {
    console.log("ALL VIEWPORTS AND ROUTES PASSED WITH ZERO HORIZONTAL OVERFLOW! 🎉");
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Runner failed:", err);
  process.exit(1);
});
