import { useEffect, useState } from 'react';
import { socketService, type ConnectionStatus } from '../../services/socket';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatusBadge() {
  const [status, setStatus] = useState<ConnectionStatus>(socketService.getStatus());
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    return socketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  const handleReconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    socketService.disconnect();
    socketService.connect();
  };

  if (status === 'connected') {
    return (
      <div className="font-arcade uppercase tracking-wider inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-[#34D399]/40 bg-[#10B981]/15 px-3 text-[11px] sm:text-xs text-[#6EE7B7] shrink-0">
        <span className="h-2 w-2 rounded-full bg-[#34D399] animate-pulse" />
        <Wifi className="h-3.5 w-3.5" />
        <span>ONLINE</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="font-arcade uppercase tracking-wider inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-3 text-[11px] sm:text-xs text-[#FDE68A] shrink-0">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>VERBINDE...</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleReconnect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Tippen zum erneuten Verbinden"
      className="font-arcade uppercase tracking-wider inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-[#FDA4AF]/50 bg-[#E11D48]/20 px-3 text-[11px] sm:text-xs text-[#FECDD3] transition-colors hover:bg-[#E11D48]/35 active:scale-95 cursor-pointer shrink-0"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>{isHovered ? 'NEU VERBINDEN' : 'OFFLINE'}</span>
    </button>
  );
}
