/**
 * Flight Diversion Detection Service
 *
 * Monitors Vilnius Airport (VNO / ICAO: EYVI) and automatically detects
 * when flights are diverted to Kaunas Airport (KUN / ICAO: EYKA).
 *
 * Data source: OpenSky Network public REST API (no API key required for basic access).
 * Docs: https://openskynetwork.github.io/opensky-api/rest.html
 */

const OPENSKY_BASE = 'https://opensky-network.org/api';
const VNO_ICAO = 'EYVI'; // Vilnius International Airport
const KUN_ICAO = 'EYKA'; // Kaunas International Airport

// Known scheduled VNO→KUN domestic route callsign prefixes (not treated as diversions)
const SCHEDULED_VNO_KUN_PREFIXES: string[] = [];

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
  /** Unix timestamp when the aircraft left Vilnius */
  departedAt: number;
  departedAtIso: string;
  /** Unix timestamp when the aircraft landed at Kaunas */
  arrivedAt: number;
  arrivedAtIso: string;
  originAirport: string;
  diversionAirport: string;
  flightDurationSeconds: number;
  detectedAt: string;
}

export interface DivertedFlightSummary {
  totalDiversions: number;
  windowHours: number;
  checkedAt: string;
  originAirport: string;
  diversionAirport: string;
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

async function fetchFlights(endpoint: string): Promise<RawFlight[]> {
  const res = await fetch(endpoint, {
    headers: { 'User-Agent': 'VNO-KUN-DiversionDetector/1.0' },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 404) {
    // OpenSky returns 404 when no flights found in the time window
    return [];
  }

  if (!res.ok) {
    throw new Error(`OpenSky API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as RawFlight[];
  return Array.isArray(data) ? data : [];
}

/**
 * Detects flights that departed from Vilnius (EYVI) and arrived at Kaunas (EYKA)
 * within the last `windowHours` hours. These are flagged as potential diversions.
 *
 * @param windowHours - How many hours back to search (default 6, max 24 per OpenSky limits)
 */
export async function detectDiversions(windowHours = 6): Promise<DivertedFlightSummary> {
  const hours = Math.min(Math.max(1, windowHours), 24);
  const cacheKey = `diversions_${hours}`;

  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const now = Math.floor(Date.now() / 1000);
  const begin = now - hours * 3600;

  // 1. Fetch all departures from Vilnius in the time window
  const departuresUrl = `${OPENSKY_BASE}/flights/departure?airport=${VNO_ICAO}&begin=${begin}&end=${now}`;
  const departures = await fetchFlights(departuresUrl);

  // 2. Fetch all arrivals at Kaunas in the same window
  const arrivalsUrl = `${OPENSKY_BASE}/flights/arrival?airport=${KUN_ICAO}&begin=${begin}&end=${now}`;
  const arrivals = await fetchFlights(arrivalsUrl);

  // 3. Build lookup by icao24 (aircraft transponder address) for Kaunas arrivals
  const kaunasArrivals = new Map<string, RawFlight>();
  for (const flight of arrivals) {
    kaunasArrivals.set(flight.icao24, flight);
  }

  // 4. Cross-reference: any aircraft that departed VNO and arrived KUN is a diversion
  const diverted: DivertedFlight[] = [];
  for (const dep of departures) {
    const arr = kaunasArrivals.get(dep.icao24);
    if (!arr) continue;

    // Skip if callsign belongs to a known scheduled VNO→KUN route
    const callsign = dep.callsign?.trim() || arr.callsign?.trim() || null;
    if (callsign && SCHEDULED_VNO_KUN_PREFIXES.some((p) => callsign.startsWith(p))) {
      continue;
    }

    diverted.push({
      callsign,
      icao24: dep.icao24,
      departedAt: dep.firstSeen,
      departedAtIso: new Date(dep.firstSeen * 1000).toISOString(),
      arrivedAt: arr.lastSeen,
      arrivedAtIso: new Date(arr.lastSeen * 1000).toISOString(),
      originAirport: VNO_ICAO,
      diversionAirport: KUN_ICAO,
      flightDurationSeconds: arr.lastSeen - dep.firstSeen,
      detectedAt: new Date().toISOString(),
    });
  }

  const result: DivertedFlightSummary = {
    totalDiversions: diverted.length,
    windowHours: hours,
    checkedAt: new Date().toISOString(),
    originAirport: VNO_ICAO,
    diversionAirport: KUN_ICAO,
    flights: diverted,
  };

  toCache(cacheKey, result);
  return result;
}

/**
 * Returns live departures from Vilnius within the last `windowHours` hours.
 */
export async function getVilniusDepartures(windowHours = 6): Promise<RawFlight[]> {
  const hours = Math.min(Math.max(1, windowHours), 24);
  const now = Math.floor(Date.now() / 1000);
  const begin = now - hours * 3600;
  const url = `${OPENSKY_BASE}/flights/departure?airport=${VNO_ICAO}&begin=${begin}&end=${now}`;
  return fetchFlights(url);
}

/**
 * Returns live arrivals at Kaunas within the last `windowHours` hours.
 */
export async function getKaunasArrivals(windowHours = 6): Promise<RawFlight[]> {
  const hours = Math.min(Math.max(1, windowHours), 24);
  const now = Math.floor(Date.now() / 1000);
  const begin = now - hours * 3600;
  const url = `${OPENSKY_BASE}/flights/arrival?airport=${KUN_ICAO}&begin=${begin}&end=${now}`;
  return fetchFlights(url);
}

/** Clears the in-memory cache (useful for forced refresh). */
export function clearCache(): void {
  cache.clear();
}
