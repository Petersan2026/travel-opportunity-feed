import { chromium } from "playwright";

type RawExploreOpportunity = {
  destination: string;
  dateRange: string;
  price: number;
  stops: string;
  duration: string;
};

function normalizeLine(line: string): string {
  return line.replace(/\u2009|\u202f|\u00a0/g, " ").trim();
}

function isDateRangeLine(line: string): boolean {
  return /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(line);
}

function isPriceLine(line: string): boolean {
  return /^\$\d[\d,]*$/.test(line);
}

function isStopsLine(line: string): boolean {
  return /^(Nonstop|\d+\sstop|\d+\sstops)$/i.test(line);
}

function isDurationLine(line: string): boolean {
  return /^\d+\shr(?:\s\d+\smin)?$/i.test(line);
}

function extractOpportunities(lines: string[]): RawExploreOpportunity[] {
  const results: RawExploreOpportunity[] = [];
  const seen = new Set<string>();

  for (let i = 0; i <= lines.length - 5; i += 1) {
    const destination = lines[i];
    const dateRange = lines[i + 1];
    const priceLine = lines[i + 2];
    const stops = lines[i + 3];
    const duration = lines[i + 4];

    if (
      isDateRangeLine(dateRange) &&
      isPriceLine(priceLine) &&
      isStopsLine(stops) &&
      isDurationLine(duration)
    ) {
      const key = `${destination}|${dateRange}|${priceLine}|${stops}|${duration}`;

      if (!seen.has(key)) {
        seen.add(key);

        results.push({
          destination,
          dateRange,
          price: Number(priceLine.replace(/\$|,/g, "")),
          stops,
          duration,
        });
      }
    }
  }

  return results;
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.goto("https://www.google.com/travel/explore", {
    waitUntil: "networkidle",
  });

  console.log("Google Flights Explore loaded");

  await page.waitForTimeout(5000);

  const bodyText = await page.locator("body").innerText();

  const lines = bodyText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  const opportunities = extractOpportunities(lines);

  console.log(JSON.stringify(opportunities, null, 2));

  await page.waitForTimeout(10000);
  await browser.close();
}

main().catch((error) => {
  console.error("Explore extraction test failed:", error);
  process.exit(1);
});