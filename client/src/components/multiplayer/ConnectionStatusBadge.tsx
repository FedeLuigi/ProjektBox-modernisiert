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
      <div
        style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 95%, 2% 100%)' }}
        className="font-arcade uppercase tracking-wider inline-flex h-9 items-center gap-1.5 bg-[#059669] border-[2.5px] border-[#064E3B] px-3.5 text-xs text-white shadow-[inset_0_1.5px_0_#6EE7B7,0_3px_0_rgba(15,23,42,0.2)] shrink-0"
      >
        <span className="h-2 w-2 rounded-full bg-[#A7F3D0] animate-pulse" />
        <Wifi className="h-3.5 w-3.5" />
        <span>ONLINE</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div
        style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 95%, 2% 100%)' }}
        className="font-arcade uppercase tracking-wider inline-flex h-9 items-center gap-1.5 bg-[#FEF3C7] border-[2.5px] border-[#92400E] px-3.5 text-xs text-[#78350F] shadow-[0_3px_0_rgba(15,23,42,0.2)] shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>CONNECTING...</span>
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
      style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 95%, 2% 100%)' }}
      className="font-arcade uppercase tracking-wider inline-flex h-9 items-center gap-1.5 bg-[#DC2626] border-[2.5px] border-[#7F1D1D] px-3.5 text-xs text-white transition-transform active:scale-95 cursor-pointer shrink-0"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>{isHovered ? 'REPLAY' : 'OFFLINE'}</span>
    </button>
  );
}
