import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService, type ConnectionMeta } from '../../services/socket';

function useCountdownSeconds(deadline?: number): number | null {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline - nowMs) / 1000));
}

export function ConnectionStatusBadge() {
  const [meta, setMeta] = useState<ConnectionMeta>(socketService.getConnectionMeta());
  const countdown = useCountdownSeconds(
    meta.status === 'reconnecting' || meta.status === 'disconnected'
      ? meta.reconnectDeadline
      : undefined
  );

  useEffect(() => {
    return socketService.onConnectionMetaChange((nextMeta) => {
      setMeta(nextMeta);
    });
  }, []);

  const handleRetry = () => {
    socketService.manualReconnect();
  };

  if (meta.status === 'reconnecting') {
    return (
      <div
        title={meta.errorMessage || 'Verbindung wird automatisch wiederhergestellt'}
        className="flex items-center gap-1.5 rounded-full border border-[#F59E0B]/45 bg-[#0F172A]/90 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FDE68A] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span className="truncate max-w-[110px] sm:max-w-xs">
          VERBINDE...{countdown !== null ? ` (${countdown}S)` : ''}
        </span>
      </div>
    );
  }

  if (meta.status === 'reconnected') {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[#34D399]/55 bg-[#0F172A]/90 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#6EE7B7] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate max-w-[130px] sm:max-w-none">VERBUNDEN</span>
      </div>
    );
  }

  if (meta.status === 'disconnected') {
    return (
      <button
        type="button"
        onClick={handleRetry}
        title="Verbindung unterbrochen – Klicken zum erneuten Verbinden"
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[#F59E0B]/45 bg-[#0F172A]/90 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FDE68A] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl hover:bg-[#1E293B] transition-colors cursor-pointer"
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate max-w-[110px] sm:max-w-none">
          OFFLINE{countdown !== null ? ` (${countdown}S)` : ''}
        </span>
      </button>
    );
  }

  if (meta.status === 'failed') {
    return (
      <button
        type="button"
        onClick={handleRetry}
        title="Automatische Wiederverbindung fehlgeschlagen – Klicken zum erneuten Versuch"
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[#FDA4AF]/50 bg-[#0F172A]/95 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FECDD3] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl hover:bg-[#E11D48]/30 transition-colors cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-none">FEHLER</span>
      </button>
    );
  }

  if (meta.status === 'expired') {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[#FDA4AF]/50 bg-[#0F172A]/95 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FECDD3] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-none">ABGELAUFEN</span>
      </div>
    );
  }

  return (
    <div
      title={
        typeof meta.latencyMs === 'number'
          ? `Verbunden (${meta.latencyMs} ms)`
          : 'Verbunden mit Multiplayer-Server'
      }
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#34D399]/40 bg-[#0F172A]/80 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#6EE7B7] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.35)] backdrop-blur-xl"
    >
      <Wifi className="h-3.5 w-3.5 shrink-0" />
      <span>VERBUNDEN</span>
    </div>
  );
}

interface HeaderStatusOverlayProps {
  lobby?: Lobby | null;
  currentUserId?: string;
  message?: string | null;
  showWhenConnected?: boolean;
  connectedClassName?: string;
  onExitExpired?: () => void;
}

/**
 * Rechtsbündige, kompakte Status-Anzeige für die Kopfzeile.
 * Zeigt Verbindungsverlust, Wiederverbindung, Countdown, Pausen- & Lobby-Hinweise
 * kurz und bündig auf der rechten Seite an, ohne den mittigen Spieltitel zu überdecken.
 */
export function HeaderStatusOverlay({
  lobby,
  currentUserId,
  message,
  showWhenConnected = false,
  connectedClassName,
  onExitExpired,
}: HeaderStatusOverlayProps) {
  const [meta, setMeta] = useState<ConnectionMeta>(socketService.getConnectionMeta());

  useEffect(() => {
    return socketService.onConnectionMetaChange((nextMeta) => {
      setMeta(nextMeta);
    });
  }, []);

  const disconnectedPlayers =
    lobby?.players.filter(
      (p) => !p.isTvScreen && p.id !== currentUserId && p.connectionState === 'disconnected' && !p.connected
    ) || [];

  const isLobbyPaused = lobby?.status === 'paused';
  const activeDeadline =
    meta.status === 'reconnecting' || meta.status === 'disconnected'
      ? meta.reconnectDeadline
      : disconnectedPlayers[0]?.reconnectDeadline;

  const countdown = useCountdownSeconds(activeDeadline);

  let pillContent: React.ReactNode = null;

  if (meta.status === 'expired') {
    pillContent = (
      <div
        title={meta.errorMessage || 'Sitzung abgelaufen'}
        className="flex items-center gap-1.5 rounded-full border border-[#FDA4AF]/55 bg-[#0F172A]/95 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FECDD3] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl min-w-0 max-w-[200px] sm:max-w-[260px]"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#FDA4AF]" />
        <span className="truncate">ABGELAUFEN</span>
        {onExitExpired && (
          <button
            type="button"
            onClick={onExitExpired}
            className="rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] text-white hover:bg-white/25 cursor-pointer shrink-0"
          >
            MENÜ
          </button>
        )}
      </div>
    );
  } else if (meta.status === 'failed') {
    pillContent = (
      <button
        type="button"
        onClick={() => socketService.manualReconnect()}
        title="Wiederverbindung fehlgeschlagen – klicken zum erneuten Versuch"
        className="flex items-center gap-1.5 rounded-full border border-[#FDA4AF]/55 bg-[#0F172A]/95 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FECDD3] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl hover:bg-[#E11D48]/30 cursor-pointer shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
        <span>NEU VERBINDEN</span>
      </button>
    );
  } else if (meta.status === 'disconnected' || meta.status === 'reconnecting') {
    pillContent = (
      <button
        type="button"
        onClick={() => socketService.manualReconnect()}
        title="Verbindung unterbrochen – klicken zum erneuten Verbinden"
        className="flex items-center gap-1.5 rounded-full border border-[#F59E0B]/60 bg-[#0F172A]/95 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FDE68A] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl hover:bg-[#1E293B] cursor-pointer min-w-0 max-w-[165px] sm:max-w-[220px]"
      >
        {meta.status === 'reconnecting' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">
          {meta.status === 'reconnecting' ? 'VERBINDE...' : 'OFFLINE'}
          {countdown !== null ? ` (${countdown}S)` : ''}
        </span>
      </button>
    );
  } else if (meta.status === 'reconnected') {
    pillContent = (
      <div className="flex items-center gap-1.5 rounded-full border border-[#34D399]/60 bg-[#0F172A]/95 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#6EE7B7] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>VERBUNDEN</span>
      </div>
    );
  } else if (disconnectedPlayers.length > 0 || isLobbyPaused) {
    const p = disconnectedPlayers[0];
    pillContent = (
      <div
        title={
          p
            ? `Warte auf ${p.name}${countdown !== null ? ` (${countdown}s)` : ''}`
            : lobby?.pausedReason || 'Spiel pausiert'
        }
        className="flex items-center gap-1.5 rounded-full border border-[#F59E0B]/60 bg-[#0F172A]/95 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FDE68A] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl animate-pulse min-w-0 max-w-[175px] sm:max-w-[260px]"
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        {p ? (
          <>
            <span className="truncate">WARTE: {p.name}</span>
            {countdown !== null && <span className="shrink-0">({countdown}S)</span>}
          </>
        ) : (
          <span className="truncate">PAUSIERT</span>
        )}
      </div>
    );
  } else if (message) {
    pillContent = (
      <div
        title={message}
        className="flex items-center gap-1.5 rounded-full border border-[#FDA4AF]/55 bg-[#0F172A]/95 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FECDD3] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl animate-fade-in min-w-0 max-w-[180px] sm:max-w-[260px]"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#FDA4AF]" />
        <span className="truncate">{message}</span>
      </div>
    );
  } else if (showWhenConnected) {
    pillContent = connectedClassName ? (
      <div className={connectedClassName}>
        <ConnectionStatusBadge />
      </div>
    ) : (
      <ConnectionStatusBadge />
    );
  }

  if (!pillContent) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="flex items-center justify-end min-w-0 max-w-full overflow-hidden shrink"
    >
      {pillContent}
    </div>
  );
}
