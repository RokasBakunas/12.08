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
  note: string;
  flights: DivertedFlight[];
}

const REFRESH_INTERVAL_MS = 60_000;

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `prieš ${diff} s`;
  if (diff < 3600) return `prieš ${Math.floor(diff / 60)} min`;
  return `prieš ${Math.floor(diff / 3600)} val`;
}

function FlightCard({ flight }: { flight: DivertedFlight }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold tracking-widest text-white">{flight.callsign}</span>
        {flight.aircraftType && (
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-mono">
            {flight.aircraftType}
          </span>
        )}
      </div>
      <div className="flex gap-4 text-sm text-gray-400">
        {flight.registration && (
          <span>
            <span className="text-gray-500">Reg </span>
            <span className="text-gray-300 font-mono">{flight.registration}</span>
          </span>
        )}
        <span>
          <span className="text-gray-500">ICAO24 </span>
          <span className="text-gray-300 font-mono">{flight.icao24}</span>
        </span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Aptikta: {new Date(flight.detectedAt).toLocaleTimeString('lt-LT')}
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
      const res = await fetch('/flights/diversions', { signal: AbortSignal.timeout(10_000) });
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

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer
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
          {data.flights.map((f) => (
            <FlightCard key={f.icao24} flight={f} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-2">
        <span>{lastFetched ? `Atnaujinta ${timeAgo(lastFetched)}` : ''}</span>
        <div className="flex items-center gap-3">
          <span>Kitas atnaujinimas po {secondsLeft}s</span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-40 underline underline-offset-2"
          >
            Atnaujinti dabar
          </button>
        </div>
      </div>

      {/* Note */}
      {data && (
        <p className="text-xs text-gray-600 leading-relaxed border-t border-gray-800 pt-4">
          {data.note}
        </p>
      )}
    </main>
  );
}
