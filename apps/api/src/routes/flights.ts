import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  detectDiversions,
  getVilniusDepartures,
  getKaunasArrivals,
  clearCache,
} from '../services/flightDiversionService';

const router = Router();

// Limit to 12 requests/min per IP – OpenSky has its own rate limits
const flightRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  message: { error: 'too_many_requests', retryAfterSeconds: 60 },
});

router.use(flightRateLimit);

function parseWindowHours(query: Request['query']): number {
  const raw = query['hours'];
  const hours = raw ? parseInt(raw as string, 10) : 6;
  if (isNaN(hours) || hours < 1 || hours > 24) {
    throw new RangeError('hours must be an integer between 1 and 24');
  }
  return hours;
}

/**
 * GET /flights/diversions
 *
 * Returns flights that departed from Vilnius (EYVI) and landed at Kaunas (EYKA),
 * indicating a potential diversion.
 *
 * Query params:
 *   hours  – look-back window in hours (1–24, default 6)
 *
 * Example:
 *   GET /flights/diversions?hours=12
 */
router.get('/diversions', async (req: Request, res: Response) => {
  try {
    const hours = parseWindowHours(req.query);
    const result = await detectDiversions(hours);
    return res.json(result);
  } catch (err) {
    if (err instanceof RangeError) {
      return res.status(400).json({ error: 'invalid_parameter', message: err.message });
    }
    console.error('[flights/diversions] upstream error:', err);
    return res.status(502).json({
      error: 'upstream_error',
      message: 'Could not fetch flight data from OpenSky Network. Please retry later.',
    });
  }
});

/**
 * GET /flights/departures/vilnius
 *
 * Raw list of departures from Vilnius (EYVI) in the look-back window.
 *
 * Query params:
 *   hours  – look-back window in hours (1–24, default 6)
 */
router.get('/departures/vilnius', async (req: Request, res: Response) => {
  try {
    const hours = parseWindowHours(req.query);
    const flights = await getVilniusDepartures(hours);
    return res.json({
      airport: 'EYVI',
      windowHours: hours,
      total: flights.length,
      checkedAt: new Date().toISOString(),
      flights,
    });
  } catch (err) {
    if (err instanceof RangeError) {
      return res.status(400).json({ error: 'invalid_parameter', message: (err as Error).message });
    }
    console.error('[flights/departures/vilnius] upstream error:', err);
    return res.status(502).json({
      error: 'upstream_error',
      message: 'Could not fetch flight data from OpenSky Network. Please retry later.',
    });
  }
});

/**
 * GET /flights/arrivals/kaunas
 *
 * Raw list of arrivals at Kaunas (EYKA) in the look-back window.
 *
 * Query params:
 *   hours  – look-back window in hours (1–24, default 6)
 */
router.get('/arrivals/kaunas', async (req: Request, res: Response) => {
  try {
    const hours = parseWindowHours(req.query);
    const flights = await getKaunasArrivals(hours);
    return res.json({
      airport: 'EYKA',
      windowHours: hours,
      total: flights.length,
      checkedAt: new Date().toISOString(),
      flights,
    });
  } catch (err) {
    if (err instanceof RangeError) {
      return res.status(400).json({ error: 'invalid_parameter', message: (err as Error).message });
    }
    console.error('[flights/arrivals/kaunas] upstream error:', err);
    return res.status(502).json({
      error: 'upstream_error',
      message: 'Could not fetch flight data from OpenSky Network. Please retry later.',
    });
  }
});

/**
 * POST /flights/cache/clear
 *
 * Forces a cache invalidation so the next request fetches fresh data from OpenSky.
 * Useful after a known diversion event.
 */
router.post('/cache/clear', (_req: Request, res: Response) => {
  clearCache();
  return res.json({ cleared: true, clearedAt: new Date().toISOString() });
});

/**
 * GET /flights/status
 *
 * Quick health-check endpoint: returns whether there are active diversions
 * without the full flight list.
 *
 * Query params:
 *   hours  – look-back window in hours (1–24, default 6)
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const hours = parseWindowHours(req.query);
    const result = await detectDiversions(hours);
    return res.json({
      diversionsDetected: result.totalDiversions > 0,
      totalDiversions: result.totalDiversions,
      windowHours: hours,
      checkedAt: result.checkedAt,
      originAirport: result.originAirport,
      diversionAirport: result.diversionAirport,
    });
  } catch (err) {
    if (err instanceof RangeError) {
      return res.status(400).json({ error: 'invalid_parameter', message: (err as Error).message });
    }
    console.error('[flights/status] upstream error:', err);
    return res.status(502).json({
      error: 'upstream_error',
      message: 'Could not fetch flight data from OpenSky Network. Please retry later.',
    });
  }
});

export default router;
