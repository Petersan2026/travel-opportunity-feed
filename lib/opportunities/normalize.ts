export type OpportunityCategory = "Domestic" | "Americas" | "Europe" | "Other";

export type RawOpportunity = {
  destination: string;
  dateRange: string;
  price: number;
  stops: string;
  duration: string;
};

export type NormalizedOpportunity = {
  destination: string;
  dateRange: string;
  price: number;

  stopsText: string;
  durationText: string;

  stopCount: number | null;
  durationMinutes: number | null;

  category: OpportunityCategory | null;

  isValid: boolean;
  rejectionReasons: string[];
};

export type FilterConfig = {
  maxStops: number;
  maxDurationMinutesByCategory: Record<OpportunityCategory, number>;
  minReasonableFareByCategory: Record<OpportunityCategory, number>;
  maxReasonableFareByCategory: Record<OpportunityCategory, number>;
  rejectUnknownCategory: boolean;
  rejectUnknownStopCount: boolean;
  rejectUnknownDuration: boolean;
};

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  maxStops: 1,

  maxDurationMinutesByCategory: {
    Domestic: 8 * 60,
    Americas: 12 * 60,
    Europe: 18 * 60,
    Other: 20 * 60,
  },

  minReasonableFareByCategory: {
    Domestic: 40,
    Americas: 120,
    Europe: 350,
    Other: 400,
  },

  maxReasonableFareByCategory: {
    Domestic: 600,
    Americas: 900,
    Europe: 1400,
    Other: 1800,
  },

  // IMPORTANT: keep false for now so we can SEE international rows
  rejectUnknownCategory: false,
  rejectUnknownStopCount: true,
  rejectUnknownDuration: true,
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseStops(stopsText: string): number | null {
  const value = normalizeWhitespace(stopsText).toLowerCase();

  if (value === "nonstop") return 0;

  const match = value.match(/(\d+)\s*stop/);
  if (match) return Number.parseInt(match[1], 10);

  return null;
}

export function parseDurationMinutes(durationText: string): number | null {
  const value = normalizeWhitespace(durationText).toLowerCase();

  const hoursMatch = value.match(/(\d+)\s*(hr|hrs|hour|hours)/);
  const minutesMatch = value.match(/(\d+)\s*(min|mins|minute|minutes)/);

  const hours = hoursMatch ? Number.parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0;

  if (!hoursMatch && !minutesMatch) return null;

  return hours * 60 + minutes;
}

/**
 * Very light categorization (intentionally incomplete)
 */
export function categorizeDestination(
  destination: string,
): OpportunityCategory | null {
  const d = destination.toLowerCase();

  // Domestic
  if (
    d.includes("los angeles") ||
    d.includes("san francisco") ||
    d.includes("san diego") ||
    d.includes("new york") ||
    d.includes("chicago") ||
    d.includes("denver") ||
    d.includes("phoenix") ||
    d.includes("dallas") ||
    d.includes("houston") ||
    d.includes("miami") ||
    d.includes("seattle") ||
    d.includes("portland")
  ) {
    return "Domestic";
  }

  // Americas
  if (
    d.includes("mexico") ||
    d.includes("toronto") ||
    d.includes("vancouver") ||
    d.includes("cancun") ||
    d.includes("bogota") ||
    d.includes("lima") ||
    d.includes("quebec")
  ) {
    return "Americas";
  }

  // Europe
  if (
    d.includes("paris") ||
    d.includes("london") ||
    d.includes("rome") ||
    d.includes("barcelona") ||
    d.includes("amsterdam") ||
    d.includes("reykjavik")
  ) {
    return "Europe";
  }

  // Rest of world
  if (
    d.includes("tokyo") ||
    d.includes("bangkok") ||
    d.includes("singapore")
  ) {
    return "Other";
  }

  return null;
}

/**
 * Destination quality filter
 */
function isNonCityDestination(destination: string): boolean {
  const d = destination.toLowerCase();

  // obvious non-city / attraction signals
  if (
    d.includes("national park") ||
    d.includes(" park") ||
    d.includes("resort") ||
    d.includes("pier") ||
    d.includes("lake") ||
    d.includes("valley")
  ) {
    return true;
  }

  // known non-airport destinations
  if (
    d === "sedona" ||
    d === "lake tahoe" ||
    d === "napa" ||
    d === "aspen"
  ) {
    return true;
  }

  return false;
}

export function normalizeOpportunity(
  raw: RawOpportunity,
  config: FilterConfig = DEFAULT_FILTER_CONFIG,
): NormalizedOpportunity {
  const stopCount = parseStops(raw.stops);
  const durationMinutes = parseDurationMinutes(raw.duration);
  const category = categorizeDestination(raw.destination);

  const rejectionReasons: string[] = [];

  // remove non-flight destinations
  if (isNonCityDestination(raw.destination)) {
    rejectionReasons.push("non-city-destination");
  }

  if (config.rejectUnknownStopCount && stopCount === null) {
    rejectionReasons.push("unknown-stop-count");
  }

  if (config.rejectUnknownDuration && durationMinutes === null) {
    rejectionReasons.push("unknown-duration");
  }

  if (config.rejectUnknownCategory && category === null) {
    rejectionReasons.push("unknown-category");
  }

  if (stopCount !== null && stopCount > config.maxStops) {
    rejectionReasons.push("too-many-stops");
  }

  if (durationMinutes !== null && category !== null) {
    const maxDuration = config.maxDurationMinutesByCategory[category];
    if (durationMinutes > maxDuration) {
      rejectionReasons.push("too-long");
    }
  }

  if (category !== null) {
    const minFare = config.minReasonableFareByCategory[category];
    const maxFare = config.maxReasonableFareByCategory[category];

    if (raw.price < minFare) {
      rejectionReasons.push("fare-too-low");
    }

    if (raw.price > maxFare) {
      rejectionReasons.push("fare-too-high");
    }
  }

  return {
    destination: normalizeWhitespace(raw.destination),
    dateRange: normalizeWhitespace(raw.dateRange),
    price: raw.price,

    stopsText: normalizeWhitespace(raw.stops),
    durationText: normalizeWhitespace(raw.duration),

    stopCount,
    durationMinutes,
    category,

    isValid: rejectionReasons.length === 0,
    rejectionReasons,
  };
}

export function normalizeOpportunities(
  rawOpportunities: RawOpportunity[],
  config: FilterConfig = DEFAULT_FILTER_CONFIG,
): NormalizedOpportunity[] {
  return rawOpportunities.map((raw) => normalizeOpportunity(raw, config));
}