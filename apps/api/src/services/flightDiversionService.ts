/**
 * Flight Diversion Detection Service
 *
 * Detects flights diverted to Kaunas (KUN / ICAO: EYKA) that were likely
 * destined for Vilnius (VNO / ICAO: EYVI).
 *
 * Strategy: Fetch all arrivals at Kaunas and flag those operated by airlines
 * that do NOT regularly serve Kaunas. Kaunas has very few scheduled carriers
 * (Ryanair, Wizz Air), so any other airline landing there is almost certainly
 * a diversion from Vilnius or another Lithuanian destination.
 *
 * Data source: OpenSky Network public REST API (no API key required).
 * Docs: https://openskynetwork.github.io/opensky-api/rest.html
 */

const OPENSKY_BASE = 'https://opensky-network.org/api';
const KUN_ICAO = 'EYKA'; // Kaunas International Airport

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

export interface RawFlight {
  icao24: string;
  firstSeen: number;
  estDepartureAirport: string | null;
  lastSeen: number;
  estArrivalAirport: string | null;
  callsign: string | null;
  estDepartureAirportHorizDistance: number | null;
  estDepartureAirportVertDistance: number | null;
  estArrivalAirportHorizDistance: number | null;
  estArrivalAirportVertDistance: number | null;
  departureAirportCandidatesCount: number;
  arrivalAirportCandidatesCount: number;
}

export interface DivertedFlight {
  callsign: string | null;
  icao24: string;
  /** Airport the flight actually departed from */
  departureAirport: string | null;
  /** Unix timestamp when the aircraft landed at Kaunas */
  arrivedAt: number;
  arrivedAtIso: string;
  diversionAirport: 'EYKA';
  detectedAt: string;
}

export interface DivertedFlightSummary {
  totalDiversions: number;
  windowHours: number;
  checkedAt: string;
  diversionAirport: 'EYKA';
  note: string;
  flights: DivertedFlight[];
}

interface CacheEntry {
  data: DivertedFlightSummary;
  expiresAt: number;
}

// In-memory cache – 5 minute TTL to respect OpenSky rate limits
const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

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

/**
 * Builds Basic Auth header if OPENSKY_USERNAME / OPENSKY_PASSWORD env vars are set.
 * OpenSky blocks anonymous requests from cloud provider IPs (Vercel/AWS/GCP).
 * Register a free account at https://opensky-network.org/login?view=registration
 * and add credentials to your Vercel environment variables.
 */
function buildHeaders(): Record<string, string> {
  const user = process.env.OPENSKY_USERNAME;
  const pass = process.env.OPENSKY_PASSWORD;
  const headers: Record<string, string> = { 'User-Agent': 'VNO-KUN-DiversionDetector/1.0' };
  if (user && pass) {
    headers['Authorization'] = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  }
  return headers;
}

async function fetchFlights(endpoint: string): Promise<RawFlight[]> {
  const res = await fetch(endpoint, {
    headers: buildHeaders(),
    signal: AbortSignal.timeout(8_000),
  });

  if (res.status === 404) {
    // OpenSky returns 404 when no flights found in the time window
    return [];
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenSky API error: ${res.status} ${res.statusText} – ${body}`);
  }

  const data = (await res.json()) as RawFlight[];
  return Array.isArray(data) ? data : [];
}

/**
 * OpenSky /flights/arrival allows at most 2 hours per request.
 * This helper splits larger windows into 2-hour chunks and merges results.
 */
async function fetchArrivals(airport: string, begin: number, end: number): Promise<RawFlight[]> {
  const CHUNK_SECS = 2 * 3600; // 2 hours
  const results: RawFlight[] = [];

  let chunkStart = begin;
  while (chunkStart < end) {
    const chunkEnd = Math.min(chunkStart + CHUNK_SECS, end);
    const url = `${OPENSKY_BASE}/flights/arrival?airport=${airport}&begin=${chunkStart}&end=${chunkEnd}`;
    const chunk = await fetchFlights(url);
    results.push(...chunk);
    chunkStart = chunkEnd;
  }

  // Deduplicate by icao24 + lastSeen
  const seen = new Set<string>();
  return results.filter(f => {
    const key = `${f.icao24}:${f.lastSeen}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Detects flights likely diverted to Kaunas (EYKA).
 *
 * A flight is flagged as a diversion if it arrived at Kaunas AND its callsign
 * does NOT belong to a carrier that operates scheduled Kaunas routes.
 * Domestic Lithuanian departures are also excluded.
 *
 * @param windowHours - How many hours back to search (1–24, default 6)
 */
export async function detectDiversions(windowHours = 6): Promise<DivertedFlightSummary> {
  const hours = Math.min(Math.max(1, windowHours), 24);
  const cacheKey = `diversions_${hours}`;

  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const now = Math.floor(Date.now() / 1000);
  const begin = now - hours * 3600;

  const arrivals = await fetchArrivals(KUN_ICAO, begin, now);

  // Lithuanian airport ICAO codes – flights from these are not diversions
  const lithuanianAirports = new Set(['EYVI', 'EYKA', 'EYPA', 'EYSA']);

  const diverted: DivertedFlight[] = [];

  for (const flight of arrivals) {
    const callsign = flight.callsign?.trim() || null;

    // Skip flights with no callsign (private/unidentified aircraft)
    if (!callsign) continue;

    // Skip regular Kaunas scheduled carriers
    const prefix = callsign.slice(0, 3).toUpperCase();
    if (REGULAR_KAUNAS_CARRIERS.has(prefix)) continue;

    // Skip flights that departed from Lithuanian airports (not diversions)
    if (flight.estDepartureAirport && lithuanianAirports.has(flight.estDepartureAirport)) continue;

    // Skip flights with no known departure airport
    if (!flight.estDepartureAirport) continue;

    diverted.push({
      callsign,
      icao24: flight.icao24,
      departureAirport: flight.estDepartureAirport,
      arrivedAt: flight.lastSeen,
      arrivedAtIso: new Date(flight.lastSeen * 1000).toISOString(),
      diversionAirport: 'EYKA',
      detectedAt: new Date().toISOString(),
    });
  }

  const result: DivertedFlightSummary = {
    totalDiversions: diverted.length,
    windowHours: hours,
    checkedAt: new Date().toISOString(),
    diversionAirport: 'EYKA',
    note: 'Flights that landed at Kaunas operated by carriers without scheduled Kaunas routes – likely diverted from Vilnius (EYVI).',
    flights: diverted,
  };

  toCache(cacheKey, result);
  return result;
}

/**
 * Returns all arrivals at Kaunas within the last `windowHours` hours (raw data).
 */
export async function getKaunasArrivals(windowHours = 6): Promise<RawFlight[]> {
  const hours = Math.min(Math.max(1, windowHours), 24);
  const now = Math.floor(Date.now() / 1000);
  const begin = now - hours * 3600;
  return fetchArrivals(KUN_ICAO, begin, now);
}

/** Clears the in-memory cache (useful for forced refresh). */
export function clearCache(): void {
  cache.clear();
}
