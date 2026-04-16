import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.goto("https://www.google.com/travel/flights", {
    waitUntil: "networkidle",
  });

  console.log("Google Flights loaded successfully");

  await page.waitForTimeout(600000);

  await browser.close();
}

main().catch((error) => {
  console.error("Playwright test failed:", error);
  process.exit(1);
});