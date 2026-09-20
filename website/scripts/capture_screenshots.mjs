import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: "new",
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: "/root/.gemini/antigravity-ide/brain/d804531e-af57-436d-80f7-1de5ef6c8e5b/mobile_bn_hero.png",
    fullPage: false,
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: "/root/.gemini/antigravity-ide/brain/d804531e-af57-436d-80f7-1de5ef6c8e5b/mobile_bn_footer.png",
    fullPage: false,
  });
  await browser.close();
  console.log("Screenshots saved successfully.");
})();
