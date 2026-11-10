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
      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/20 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <Wifi className="h-3 w-3" />
        <span>Online</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400 ring-1 ring-amber-500/20 backdrop-blur-md">
        <RefreshCw className="h-3 w-3 animate-spin" />
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
      className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-bold text-rose-300 ring-1 ring-rose-500/30 backdrop-blur-md transition-all active:scale-95 cursor-pointer hover:bg-rose-500/25"
    >
      <WifiOff className="h-3 w-3 text-rose-400" />
      <span>{isHovered ? 'Erneut verbinden' : 'Keine Verbindung'}</span>
    </button>
  );
}
