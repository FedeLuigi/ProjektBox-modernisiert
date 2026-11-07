import React, { useState } from 'react';
import { Server, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const ApiDemo: React.FC = () => {
  const [data, setData] = useState<unknown | null>(null);
  const [endpoint, setEndpoint] = useState<string>('/api/health');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEndpoint = async (url: string) => {
    setLoading(true);
    setError(null);
    setEndpoint(url);
    try {
      // In der vite.config.ts leitet der Proxy /api Anfragen direkt an Port 5000 weiter
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP Fehler ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Fehler beim Abrufen der API');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Express REST-API Test</h2>
              <p className="text-xs text-slate-500">Parallele HTTP-Endpunkte neben WebSockets</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => fetchEndpoint('/api/health')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors flex items-center gap-1.5 ${
              endpoint === '/api/health'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            GET /api/health
          </button>
          <button
            onClick={() => fetchEndpoint('/api/info')}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors flex items-center gap-1.5 ${
              endpoint === '/api/info'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            GET /api/info
          </button>
        </div>

        {/* JSON Display */}
        <div className="relative bg-slate-900 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto min-h-[140px] max-h-[180px]">
          {loading && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center text-slate-300 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Sende HTTP-Request...</span>
            </div>
          )}

          {error && (
            <div className="text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Fehler beim Verbinden:</p>
                <p className="text-slate-400 text-[11px]">{error}</p>
                <p className="text-slate-500 text-[10px] mt-1">Läuft das Backend auf Port 5000?</p>
              </div>
            </div>
          )}

          {!loading && !error && data !== null && (
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 mb-2 border-b border-slate-800 pb-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>200 OK • Response von {endpoint}</span>
              </div>
              <pre className="text-slate-200 text-[11px] leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}

          {!loading && !error && data === null && (
            <div className="text-slate-500 h-full flex items-center justify-center py-6 text-center">
              Klicke oben auf einen Endpunkt, um einen Test-Request abzufeuern.
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Ideal für Authentifizierung, Datenbankabfragen oder Webhook-Integrationen in deiner App.
      </p>
    </div>
  );
};
