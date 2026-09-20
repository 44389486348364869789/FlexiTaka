import puppeteer from "puppeteer-core";

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
  console.log("=== STARTING COMPLETE I18N VALIDATION TEST ===");
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: "new",
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 }); // Mobile iPhone 12/13/14

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. FIRST VISIT - CLEAN SESSION (No cookies, no localStorage)
  console.log("\n--- TEST 1: FIRST VISIT DEFAULT BANGLA ---");
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 400));

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  assert(htmlLang === "bn", `Initial <html> lang is "bn" (got: "${htmlLang}")`);

  const heroHeading = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    return h1 ? h1.innerText : "";
  });
  assert(heroHeading.includes("আপনার সিমের ব্যালেন্স") || heroHeading.includes("ব্যালেন্স"), `Hero heading renders in Bengali: "${heroHeading.replace(/\n/g, ' ')}"`);

  // Check language switcher button text
  const switcherText = await page.evaluate(() => {
    const btn = document.querySelector(".footer-lang-btn");
    return btn ? btn.innerText.trim() : "";
  });
  assert(switcherText === "English", `Bottom switcher button displays "English" while in Bengali mode (got: "${switcherText}")`);

  // Check footer copyright in Bengali
  const copyrightText = await page.evaluate(() => {
    const el = document.querySelector(".footer-copyright");
    return el ? el.innerText.trim() : "";
  });
  assert(copyrightText.includes("২০২৬ FlexiTaka. সর্বস্বত্ব সংরক্ষিত।"), `Footer copyright is in Bengali: "${copyrightText}"`);

  // 2. SWITCH TO ENGLISH
  console.log("\n--- TEST 2: SWITCH TO ENGLISH ---");
  await page.evaluate(() => {
    const btn = document.querySelector(".footer-lang-btn");
    btn.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  const htmlLangEn = await page.evaluate(() => document.documentElement.lang);
  assert(htmlLangEn === "en", `<html> lang switched to "en" (got: "${htmlLangEn}")`);

  const switcherTextEn = await page.evaluate(() => {
    const btn = document.querySelector(".footer-lang-btn");
    return btn ? btn.innerText.trim() : "";
  });
  assert(switcherTextEn === "বাংলা", `Bottom switcher button displays "বাংলা" while in English mode (got: "${switcherTextEn}")`);

  const copyrightTextEn = await page.evaluate(() => {
    const el = document.querySelector(".footer-copyright");
    return el ? el.innerText.trim() : "";
  });
  assert(copyrightTextEn.includes("2026 FlexiTaka. All rights reserved."), `Footer copyright is in English: "${copyrightTextEn}"`);

  // 3. PERSISTENCE ON RELOAD
  console.log("\n--- TEST 3: ENGLISH PERSISTENCE ON RELOAD ---");
  await page.reload({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 400));

  const htmlLangEnReload = await page.evaluate(() => document.documentElement.lang);
  assert(htmlLangEnReload === "en", `English persisted after reload: lang="${htmlLangEnReload}"`);

  // 4. SWITCH BACK TO BANGLA
  console.log("\n--- TEST 4: SWITCH BACK TO BANGLA ---");
  await page.evaluate(() => {
    const btn = document.querySelector(".footer-lang-btn");
    btn.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  const htmlLangBnReload = await page.evaluate(() => document.documentElement.lang);
  assert(htmlLangBnReload === "bn", `Switched back to "bn": lang="${htmlLangBnReload}"`);

  // 5. AUDIT ALL ROUTES IN BANGLA MODE
  console.log("\n--- TEST 5: AUDIT ALL 16 ROUTES IN BANGLA MODE ---");
  for (const route of ROUTES) {
    await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 300));

    const pageLang = await page.evaluate(() => document.documentElement.lang);
    const bodyText = await page.evaluate(() => document.body.innerText);

    assert(pageLang === "bn", `Route ${route} retained "bn" lang attribute`);
    assert(bodyText.length > 50, `Route ${route} loaded content successfully`);

    // Ensure protected terms remain recognizable
    if (route === "/support") {
      assert(bodyText.includes("Contact@flexitaka.com") || bodyText.includes("contact@flexitaka.com"), `Support route contains official email Contact@flexitaka.com`);
    }
  }

  console.log(`\n========================================`);
  console.log(`TOTAL I18N TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`========================================\n`);

  await browser.close();

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
