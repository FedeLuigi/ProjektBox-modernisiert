import { AlertTriangle } from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';

export function ConnectionStatusBadge() {
  return null;
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
 * Zeigt im Header ausschließlich explizite Fehler-/Hinweismeldungen an.
 * Verbindungsstatus-Badges und -Stadien werden auf allen Seiten ausgeblendet.
 */
export function HeaderStatusOverlay({ message }: HeaderStatusOverlayProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="flex items-center justify-end min-w-0 max-w-full overflow-hidden shrink"
    >
      <div
        title={message}
        className="flex items-center gap-1.5 rounded-full border border-[#FDA4AF]/55 bg-[#0F172A]/95 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider text-[#FECDD3] uppercase shadow-[0_6px_22px_rgba(0,0,0,0.45)] backdrop-blur-xl animate-fade-in min-w-0 max-w-[180px] sm:max-w-[260px]"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#FDA4AF]" />
        <span className="truncate">{message}</span>
      </div>
    </div>
  );
}
