import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
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
        className="flex items-center gap-1.5 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-3 py-1 text-[11px] font-bold tracking-wider text-[#FDE68A] uppercase"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span className="truncate max-w-[190px] sm:max-w-none">
          VERBINDUNG WIRD WIEDERHERGESTELLT
          {countdown !== null ? ` (${countdown}S)` : ''}
        </span>
      </div>
    );
  }

  if (meta.status === 'reconnected') {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[#34D399]/50 bg-[#10B981]/20 px-3 py-1 text-[11px] font-bold tracking-wider text-[#6EE7B7] uppercase">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>WIEDERVERBINDUNG ERFOLGREICH</span>
      </div>
    );
  }

  if (meta.status === 'disconnected') {
    return (
      <button
        type="button"
        onClick={handleRetry}
        title="Verbindung unterbrochen – Klicken zum erneuten Verbinden"
        className="flex items-center gap-1.5 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-3 py-1 text-[11px] font-bold tracking-wider text-[#FDE68A] uppercase hover:bg-[#F59E0B]/25 transition-colors cursor-pointer"
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        <span>
          VERBINDUNG UNTERBROCHEN{countdown !== null ? ` (${countdown}S)` : ''}
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
        className="flex items-center gap-1.5 rounded-full border border-[#FDA4AF]/45 bg-[#E11D48]/20 px-3 py-1 text-[11px] font-bold tracking-wider text-[#FECDD3] uppercase hover:bg-[#E11D48]/30 transition-colors cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
        <span>WIEDERVERBINDUNG FEHLGESCHLAGEN</span>
      </button>
    );
  }

  if (meta.status === 'expired') {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[#FDA4AF]/45 bg-[#E11D48]/20 px-3 py-1 text-[11px] font-bold tracking-wider text-[#FECDD3] uppercase">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>SITZUNG ABGELAUFEN</span>
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
      className="flex items-center gap-1.5 rounded-full border border-[#34D399]/35 bg-[#10B981]/15 px-3 py-1 text-[11px] font-bold tracking-wider text-[#6EE7B7] uppercase"
    >
      <Wifi className="h-3.5 w-3.5 shrink-0" />
      <span>VERBUNDEN</span>
    </div>
  );
}

export function ConnectionNoticeBanner({ onExitExpired }: { onExitExpired?: () => void }) {
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

  if (meta.status === 'connected') {
    return null;
  }

  if (meta.status === 'reconnected') {
    return (
      <div className="font-arcade mx-auto my-1.5 flex w-full max-w-2xl items-center justify-center gap-2 rounded-xl border border-[#34D399]/50 bg-[#10B981]/20 px-4 py-2 text-center text-xs text-[#6EE7B7] uppercase">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>WIEDERVERBINDUNG ERFOLGREICH – SPIELZUSTAND SYNCHRONISIERT</span>
      </div>
    );
  }

  if (meta.status === 'expired') {
    return (
      <div className="font-arcade mx-auto my-1.5 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FDA4AF]/45 bg-[#E11D48]/20 px-4 py-2.5 text-xs text-[#FECDD3] uppercase">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            SITZUNG ABGELAUFEN
            {meta.errorMessage ? ` – ${meta.errorMessage}` : ''}
          </span>
        </div>
        {onExitExpired && (
          <button
            type="button"
            onClick={onExitExpired}
            className="rounded-lg border border-white/25 bg-white/10 px-3 py-1 text-[11px] text-white hover:bg-white/20 cursor-pointer"
          >
            ZURÜCK ZUM MENÜ
          </button>
        )}
      </div>
    );
  }

  if (meta.status === 'failed') {
    return (
      <div className="font-arcade mx-auto my-1.5 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FDA4AF]/45 bg-[#E11D48]/20 px-4 py-2.5 text-xs text-[#FECDD3] uppercase">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>WIEDERVERBINDUNG FEHLGESCHLAGEN – BITTE ERNEUT VERSUCHEN</span>
        </div>
        <button
          type="button"
          onClick={() => socketService.manualReconnect()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-1 text-[11px] text-white hover:bg-white/25 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>NEU VERBINDEN</span>
        </button>
      </div>
    );
  }

  return (
    <div className="font-arcade mx-auto my-1.5 flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-4 py-2 text-xs text-[#FDE68A] uppercase">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>
          {meta.status === 'reconnecting'
            ? `VERBINDUNG WIRD WIEDERHERGESTELLT (VERSUCH ${Math.max(1, meta.attempt)})`
            : 'VERBINDUNG UNTERBROCHEN'}
          {countdown !== null ? ` – NOCH ${countdown} S` : ''}
        </span>
      </div>
      <span className="text-[10px] tracking-wider text-[#FDE68A]/80">
        AKTIONEN GESPERRT BIS VERBINDUNG STEHT
      </span>
    </div>
  );
}
