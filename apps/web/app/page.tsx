'use client';

import { useEffect, useState, useCallback } from 'react';

interface DivertedFlight {
  callsign: string;
  icao24: string;
  registration: string | null;
  aircraftType: string | null;
  diversionAirport: string;
  detectedAt: string;
}

interface DiversionData {
  totalDiversions: number;
  checkedAt: string;
  diversionAirport: string;
  flights: DivertedFlight[];
}

const REFRESH_INTERVAL_MS = 60_000;

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `prieš ${diff} s`;
  if (diff < 3600) return `prieš ${Math.floor(diff / 60)} min`;
  return `prieš ${Math.floor(diff / 3600)} val`;
}

function ExternalLink({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-xs px-2 py-0.5 rounded font-medium border transition-colors hover:brightness-125 ${color}`}
    >
      {label} ↗
    </a>
  );
}

function FlightCard({ flight }: { flight: DivertedFlight }) {
  const cs = flight.callsign.trim();
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
      {/* Top row: callsign + type */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-widest text-white">{cs}</span>
          {flight.registration && (
            <span className="text-sm text-gray-400 font-mono">({flight.registration})</span>
          )}
        </div>
        {flight.aircraftType && (
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-mono">
            {flight.aircraftType}
          </span>
        )}
      </div>

      {/* Details row */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-gray-500 text-xs">ICAO24</span>
          <div className="text-gray-300 font-mono">{flight.icao24.toUpperCase()}</div>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Aptikta</span>
          <div className="text-gray-300">{new Date(flight.detectedAt).toLocaleTimeString('lt-LT')}</div>
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-700">
        <ExternalLink
          href={`https://www.flightradar24.com/${cs}`}
          label="FlightRadar24"
          color="text-orange-400 border-orange-800 bg-orange-950/40"
        />
        <ExternalLink
          href={`https://www.flightaware.com/live/flight/${cs}`}
          label="FlightAware"
          color="text-blue-400 border-blue-800 bg-blue-950/40"
        />
        <ExternalLink
          href={`https://globe.adsbexchange.com/?icao=${flight.icao24}`}
          label="ADS-B Exchange"
          color="text-green-400 border-green-800 bg-green-950/40"
        />
      </div>
    </div>
  );
}

function AirportLinks() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
        Kauno oro uostas (EYKA / KUN) – live stebėjimas
      </div>
      <div className="flex flex-wrap gap-2">
        <ExternalLink
          href="https://www.flightradar24.com/airport/kun"
          label="FlightRadar24"
          color="text-orange-400 border-orange-800 bg-orange-950/40"
        />
        <ExternalLink
          href="https://www.flightaware.com/live/airport/EYKA"
          label="FlightAware"
          color="text-blue-400 border-blue-800 bg-blue-950/40"
        />
        <ExternalLink
          href={`https://globe.adsbexchange.com/?lat=54.8839&lon=23.8828&zoom=11`}
          label="ADS-B Exchange"
          color="text-green-400 border-green-800 bg-green-950/40"
        />
        <ExternalLink
          href="https://www.radarbox.com/airport/EYKA"
          label="RadarBox"
          color="text-purple-400 border-purple-800 bg-purple-950/40"
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<DiversionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_MS / 1000);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/flights/diversions', { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DiversionData = await res.json();
      setData(json);
      setLastFetched(new Date().toISOString());
      setSecondsLeft(REFRESH_INTERVAL_MS / 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepavyko gauti duomenų');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastFetched]);

  const hasDiversions = (data?.totalDiversions ?? 0) > 0;

  return (
    <main className="max-w-lg mx-auto px-4 py-10 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          VNO <span className="text-gray-500">→</span> KUN
        </h1>
        <p className="text-gray-400 text-sm mt-1">Skrydžių nukreipimų stebėjimas · live</p>
      </div>

      {/* Status badge */}
      {!loading && !error && data && (
        <div
          className={`rounded-2xl p-5 flex items-center gap-4 ${
            hasDiversions
              ? 'bg-red-950 border border-red-700'
              : 'bg-green-950 border border-green-800'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full flex-shrink-0 ${
              hasDiversions ? 'bg-red-500 animate-pulse' : 'bg-green-500'
            }`}
          />
          <div>
            <div className={`font-bold text-lg ${hasDiversions ? 'text-red-300' : 'text-green-300'}`}>
              {hasDiversions
                ? `Aptikta nukreipimų: ${data.totalDiversions}`
                : 'Nukreipimų nerasta'}
            </div>
            <div className={`text-sm mt-0.5 ${hasDiversions ? 'text-red-400' : 'text-green-500'}`}>
              {hasDiversions
                ? 'Kaune šiuo metu yra orlaivių ne iš reguliarių maršrutų'
                : 'Kaune tik reguliarūs vežėjai arba nėra orlaivių'}
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl bg-gray-800 border border-gray-700 p-5 flex items-center gap-3 text-gray-400">
          <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
          Kraunama...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-2xl bg-gray-900 border border-red-800 p-5 text-red-400 text-sm">
          Klaida: {error}
        </div>
      )}

      {/* Flight cards */}
      {hasDiversions && data && (
        <div className="flex flex-col gap-3">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider px-1">
            Orlaiviai Kaune ({data.totalDiversions})
          </div>
          {data.flights.map((f) => (
            <FlightCard key={f.icao24} flight={f} />
          ))}
        </div>
      )}

      {/* Airport links */}
      <AirportLinks />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-2">
        <span>{lastFetched ? `Atnaujinta ${timeAgo(lastFetched)}` : ''}</span>
        <div className="flex items-center gap-3">
          <span>po {secondsLeft}s</span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-40 underline underline-offset-2"
          >
            Atnaujinti
          </button>
        </div>
      </div>
    </main>
  );
}
