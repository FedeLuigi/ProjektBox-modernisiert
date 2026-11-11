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
      <div className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/20 backdrop-blur-md shrink-0">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <Wifi className="h-3.5 w-3.5" />
        <span>Online</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 text-xs font-bold text-amber-400 ring-1 ring-amber-500/20 backdrop-blur-md shrink-0">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Verbinde...</span>
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
      className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full bg-rose-500/15 px-3.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 backdrop-blur-md transition-all active:scale-95 cursor-pointer hover:bg-rose-500/25 shrink-0"
    >
      <WifiOff className="h-3.5 w-3.5 text-rose-400" />
      <span>{isHovered ? 'Erneut verbinden' : 'Keine Verbindung'}</span>
    </button>
  );
}
