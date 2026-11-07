import React from 'react';
import { Radio, Users, Activity, ExternalLink } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  userCount: number;
  latency: number | null;
  socketId: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  userCount,
  latency,
  socketId,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Titel */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 text-white p-2.5 rounded-xl shadow-md">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              ProjektBox <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">Modernisiert</span>
            </h1>
            <p className="text-xs text-slate-500">React • Vite • Tailwind • Lucide • Node • Express • Socket.io • TypeScript</p>
          </div>
        </div>

        {/* Status-Badges & Tools */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Multi-Tab Test Button */}
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
            title="Öffne ein zweites Tab, um die Echtzeit-Synchronisation live zu testen"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Neues Tab öffnen
          </button>

          {/* Aktive Benutzer */}
          <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>{userCount} {userCount === 1 ? 'Client' : 'Clients'}</span>
          </div>

          {/* Verbindungsstatus */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              ></span>
            </span>
            <span className="font-semibold">{isConnected ? 'Verbunden' : 'Getrennt'}</span>
            {isConnected && latency !== null && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-600/80">
                <Activity className="w-3 h-3" />
                {latency}ms
              </span>
            )}
            {isConnected && socketId && (
              <span className="hidden lg:inline text-[10px] text-slate-400">
                #{socketId.slice(0, 5)}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
