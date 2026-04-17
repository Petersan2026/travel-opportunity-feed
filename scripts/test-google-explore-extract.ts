import { chromium } from "playwright";

export type RawExploreOpportunity = {
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

export function extractOpportunities(lines: string[]): RawExploreOpportunity[] {
  const results: RawExploreOpportunity[] = [];
  const seen = new Set<string>();

  for (let i = 0; i <= lines.length - 5; i++) {
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

async function scrapeViewport(page: any): Promise<RawExploreOpportunity[]> {
  const bodyText = await page.locator("body").innerText();

  const lines = bodyText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  console.log(`Lines: ${lines.length}`);

  const opportunities = extractOpportunities(lines);
  console.log(`Extracted: ${opportunities.length}`);

  return opportunities;
}

/**
 * FIXED EUROPE POSITIONING
 * Strategy:
 * 1. Drag FAR past Europe (overshoot)
 * 2. Zoom out to widen coverage
 * 3. Let Google stabilize
 */
async function panToEurope(page: any): Promise<void> {
  console.log("Panning aggressively past Europe...");

  await page.mouse.move(800, 400);

  // BIG sweeps left (force crossing Atlantic completely)
  for (let i = 0; i < 4; i++) {
    await page.mouse.down();
    await page.mouse.move(50, 400, { steps: 30 }); // much further left
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }

  // Now slight correction back right (centers Europe better)
  for (let i = 0; i < 1; i++) {
    await page.mouse.down();
    await page.mouse.move(400, 400, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }

  console.log("Zooming out for continental coverage...");

  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, -1500);
    await page.waitForTimeout(1000);
  }

  console.log("Allowing map to stabilize...");
  await page.waitForTimeout(5000);
}

export async function extractGoogleExploreOpportunities(): Promise<
  RawExploreOpportunity[]
> {
  console.log("Launching browser...");

  const browser = await chromium.launch({
    headless: false,
  });

  try {
    const page = await browser.newPage();

    console.log("Loading Explore...");
    await page.goto("https://www.google.com/travel/explore", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(6000);

    // PASS 1
    console.log("=== PASS 1: US ===");
    const us = await scrapeViewport(page);

    // PASS 2
    console.log("=== PASS 2: EUROPE ===");
    await panToEurope(page);
    const eu = await scrapeViewport(page);

    // merge + dedupe
    const map = new Map<string, RawExploreOpportunity>();

    for (const op of [...us, ...eu]) {
      const key = `${op.destination}-${op.dateRange}-${op.price}`;
      map.set(key, op);
    }

    const final = Array.from(map.values());

    console.log(`Final count: ${final.length}`);

    return final;
  } finally {
    await browser.close();
  }
}