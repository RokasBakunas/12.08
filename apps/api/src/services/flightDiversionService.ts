/**
 * Flight Diversion Detection Service
 *
 * Detects flights currently at Kaunas (KUN / ICAO: EYKA) that were likely
 * diverted from Vilnius (VNO / ICAO: EYVI).
 *
 * Strategy: Fetch live aircraft at/near Kaunas and flag those operated by
 * airlines that do NOT regularly serve Kaunas. Kaunas has very few scheduled
 * carriers (Ryanair, Wizz Air), so any other airline on the ground there is
 * almost certainly a diversion.
 *
 * Data source: ADS-B Exchange via api.adsb.lol (free, no API key required,
 * works from cloud provider IPs).
 */

const ADSB_BASE = 'https://api.adsb.lol/v2';
const KUN_ICAO = 'EYKA'; // Kaunas International Airport
// Kaunas airport coordinates – used for radius search (25 nm)
const KUN_LAT = 54.8839;
const KUN_LON = 23.8828;
const KUN_RADIUS_NM = 25;

/**
 * ICAO airline prefixes (first 3 chars of callsign) that operate SCHEDULED
 * routes to Kaunas. Flights from these carriers are NOT flagged as diversions.
 *
 * Ryanair       → RYR
 * Wizz Air      → WZZ
 * Ryanair Sun   → RYS
 * Buzz (Ryanair)→ BZZ
 */
const REGULAR_KAUNAS_CARRIERS = new Set(['RYR', 'WZZ', 'RYS', 'BZZ']);

/** Raw aircraft record from api.adsb.lol */
export interface RawFlight {
  hex: string;        // ICAO24
  flight: string | null;
  r: string | null;   // registration
  t: string | null;   // aircraft type
  lat: number | null;
  lon: number | null;
  alt_baro: number | 'ground' | null;
  gs: number | null;  // ground speed (knots)
  seen: number;       // seconds since last ADS-B message
}

export interface DivertedFlight {
  callsign: string;
  icao24: string;
  registration: string | null;
  aircraftType: string | null;
  diversionAirport: 'EYKA';
  detectedAt: string;
}

export interface DivertedFlightSummary {
  totalDiversions: number;
  checkedAt: string;
  diversionAirport: 'EYKA';
  note: string;
  flights: DivertedFlight[];
}

interface AdsbResponse {
  ac: RawFlight[];
  now: number;
  total: number;
}

interface CacheEntry {
  data: DivertedFlightSummary;
  expiresAt: number;
}

// In-memory cache – 2 minute TTL (live data, refresh more often)
const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

function fromCache(key: string): DivertedFlightSummary | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function toCache(key: string, data: DivertedFlightSummary): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchAirportAircraft(_airport: string): Promise<RawFlight[]> {
  const url = `${ADSB_BASE}/lat/${KUN_LAT}/lon/${KUN_LON}/dist/${KUN_RADIUS_NM}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'VNO-KUN-DiversionDetector/1.0' },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ADS-B API error: ${res.status} ${res.statusText} – ${body}`);
  }

  const data = (await res.json()) as AdsbResponse;
  return Array.isArray(data.ac) ? data.ac : [];
}

/**
 * Detects flights likely diverted to Kaunas (EYKA).
 *
 * A flight is flagged as a diversion if it is currently at Kaunas AND its
 * callsign does NOT belong to a carrier that operates scheduled Kaunas routes.
 *
 * The `windowHours` parameter is kept for API compatibility but is not used
 * with live data (ADS-B shows current state only).
 */
export async function detectDiversions(_windowHours = 6): Promise<DivertedFlightSummary> {
  const cacheKey = 'diversions_live';

  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const aircraft = await fetchAirportAircraft(KUN_ICAO);

  const diverted: DivertedFlight[] = [];

  for (const ac of aircraft) {
    const callsign = ac.flight?.trim() || null;

    // Skip aircraft with no callsign (private/unidentified)
    if (!callsign) continue;

    // Skip regular Kaunas scheduled carriers
    const prefix = callsign.slice(0, 3).toUpperCase();
    if (REGULAR_KAUNAS_CARRIERS.has(prefix)) continue;

    diverted.push({
      callsign,
      icao24: ac.hex,
      registration: ac.r ?? null,
      aircraftType: ac.t ?? null,
      diversionAirport: 'EYKA',
      detectedAt: new Date().toISOString(),
    });
  }

  const result: DivertedFlightSummary = {
    totalDiversions: diverted.length,
    checkedAt: new Date().toISOString(),
    diversionAirport: 'EYKA',
    note: 'Aircraft currently at Kaunas operated by carriers without scheduled Kaunas routes – likely diverted from Vilnius (EYVI). Live ADS-B data.',
    flights: diverted,
  };

  toCache(cacheKey, result);
  return result;
}

/**
 * Returns all aircraft currently at/near Kaunas (raw ADS-B data).
 */
export async function getKaunasArrivals(_windowHours = 6): Promise<RawFlight[]> {
  return fetchAirportAircraft(KUN_ICAO);
}

/** Clears the in-memory cache (useful for forced refresh). */
export function clearCache(): void {
  cache.clear();
}
