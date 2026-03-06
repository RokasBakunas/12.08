/**
 * Flight Diversion Detection – shared service used by Next.js API Route Handlers.
 * Mirrors apps/api/src/services/flightDiversionService.ts logic.
 */

const ADSB_BASE = 'https://api.adsb.lol/v2';
const KUN_LAT = 54.8839;
const KUN_LON = 23.8828;
const KUN_RADIUS_NM = 25;

const REGULAR_KAUNAS_CARRIERS = new Set(['RYR', 'WZZ', 'RYS', 'BZZ']);

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

interface RawFlight {
  hex: string;
  flight: string | null;
  r: string | null;
  t: string | null;
}

interface AdsbResponse {
  ac: RawFlight[];
}

// In-memory cache – 2 min TTL
const cache = new Map<string, { data: DivertedFlightSummary; expiresAt: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function detectDiversions(): Promise<DivertedFlightSummary> {
  const cached = cache.get('live');
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const url = `${ADSB_BASE}/lat/${KUN_LAT}/lon/${KUN_LON}/dist/${KUN_RADIUS_NM}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'VNO-KUN-DiversionDetector/1.0' },
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`ADS-B API ${res.status}`);

  const data = (await res.json()) as AdsbResponse;
  const aircraft: RawFlight[] = Array.isArray(data.ac) ? data.ac : [];

  const flights: DivertedFlight[] = [];
  for (const ac of aircraft) {
    const callsign = ac.flight?.trim() || null;
    if (!callsign) continue;
    const prefix = callsign.slice(0, 3).toUpperCase();
    if (REGULAR_KAUNAS_CARRIERS.has(prefix)) continue;
    flights.push({
      callsign,
      icao24: ac.hex,
      registration: ac.r ?? null,
      aircraftType: ac.t ?? null,
      diversionAirport: 'EYKA',
      detectedAt: new Date().toISOString(),
    });
  }

  const result: DivertedFlightSummary = {
    totalDiversions: flights.length,
    checkedAt: new Date().toISOString(),
    diversionAirport: 'EYKA',
    note: 'Aircraft currently at Kaunas (EYKA) operated by non-scheduled carriers – likely diverted from Vilnius (EYVI). Live ADS-B data.',
    flights,
  };

  cache.set('live', { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
