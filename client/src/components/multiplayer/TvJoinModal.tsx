import { useState } from 'react';
import { KeyRound, QrCode, RefreshCw, Tv, X } from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';
import {
  BTN_PRIMARY_BASE,
  BTN_PRIMARY_DISABLED,
  BTN_PRIMARY_ENABLED,
  BTN_SECONDARY_BASE,
  BTN_SECONDARY_NEUTRAL,
  SURFACE_CARD,
} from '../../styles/uiTokens';

interface TvJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void> | void;
  isJoining?: boolean;
  errorMessage?: string | null;
}

export function TvJoinModal({
  isOpen,
  onClose,
  onJoin,
  isJoining = false,
  errorMessage = null,
}: TvJoinModalProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [code, setCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length >= 3 && !isJoining) {
      onJoin(clean);
    }
  };

  const handleScanSuccess = (scannedCode: string) => {
    setShowScanner(false);
    setCode(scannedCode);
    onJoin(scannedCode);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
        className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center px-4 overflow-y-auto overscroll-y-contain bg-[#0B0B0F]/85 backdrop-blur-xl text-white select-none animate-fade-in"
      >
        <div className={`relative w-full max-w-sm ${SURFACE_CARD} flex flex-col items-center text-center`}>
          {/* Schließen Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[#AEAEB2] hover:text-white ring-1 ring-white/10 transition-transform active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon Badge */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300 ring-1 ring-purple-400/30 mb-3 shadow-xs">
            <Tv className="h-7 w-7 text-purple-300" />
          </div>

          <h2 className="text-xl font-black text-white">Mit Code beitreten</h2>

          {/* Fehlermeldung */}
          {errorMessage && (
            <div className="mt-3 w-full rounded-2xl bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 animate-fade-in">
              {errorMessage}
            </div>
          )}

          {/* Direkte Code-Eingabe + Beitritt */}
          <form onSubmit={handleSubmit} className="mt-4 w-full flex flex-col gap-2.5">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              className="w-full text-center text-xl font-mono font-black tracking-[0.25em] px-4 py-3 rounded-2xl bg-black/50 ring-1 ring-white/15 focus:ring-2 focus:ring-purple-500 outline-none uppercase text-white placeholder:text-white/25"
            />

            <button
              type="submit"
              disabled={code.trim().length < 3 || isJoining}
              className={`${BTN_PRIMARY_BASE} ${
                code.trim().length >= 3 && !isJoining
                  ? BTN_PRIMARY_ENABLED
                  : BTN_PRIMARY_DISABLED
              }`}
            >
              {isJoining ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verbinde...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Beitreten</span>
                </>
              )}
            </button>
          </form>

          {/* Alternative: QR-Scanner */}
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            disabled={isJoining}
            className={`mt-2.5 ${BTN_SECONDARY_BASE} ${BTN_SECONDARY_NEUTRAL}`}
          >
            <QrCode className="h-4 w-4" />
            <span>QR-Code scannen</span>
          </button>
        </div>
      </div>

      {/* QR-Kamera-Scanner Modal */}
      <QrScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
        onSwitchToCodeEntry={() => setShowScanner(false)}
      />
    </>
  );
}
