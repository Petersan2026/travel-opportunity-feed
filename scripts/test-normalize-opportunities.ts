import {
  DEFAULT_FILTER_CONFIG,
  type NormalizedOpportunity,
  normalizeOpportunities,
} from "../lib/opportunities/normalize";

import { extractGoogleExploreOpportunities } from "./test-google-explore-extract";

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "unknown";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
}

function printSummary(opportunities: NormalizedOpportunity[]): void {
  const validCount = opportunities.filter(o => o.isValid).length;

  console.log("");
  console.log("----- SUMMARY -----");
  console.log(`Raw: ${opportunities.length}`);
  console.log(`Valid: ${validCount}`);
  console.log(`Rejected: ${opportunities.length - validCount}`);
}

function printValid(opportunities: NormalizedOpportunity[]): void {
  const valid = opportunities.filter(o => o.isValid);

  console.log("");
  console.log("----- VALID -----");

  valid.forEach((o, i) => {
    console.log(
      `${i + 1}. ${o.destination} | $${o.price} | ${o.stopCount ?? "?"} stops | ${formatDuration(o.durationMinutes)}`
    );
  });
}

async function main(): Promise<void> {
  console.log("STEP 1: starting test");

  const raw = await extractGoogleExploreOpportunities();

  console.log("STEP 2: extractor finished");
  console.log("Raw count:", raw.length);

  const normalized = normalizeOpportunities(raw);

  console.log("STEP 3: normalization complete");

  printSummary(normalized);
  printValid(normalized);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});