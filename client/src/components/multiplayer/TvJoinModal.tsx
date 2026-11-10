import { useState } from 'react';
import { KeyRound, QrCode, RefreshCw, Tv, X } from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';

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
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-xl text-white select-none animate-fade-in"
      >
        <div className="relative w-full max-w-sm rounded-[32px] bg-[#161622]/95 p-6 ring-1 ring-white/15 shadow-2xl border border-white/10 flex flex-col items-center text-center">
          {/* Schließen Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[#AEAEB2] hover:text-white ring-1 ring-white/10 transition-transform active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon Badge */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 to-pink-500/20 text-purple-300 ring-1 ring-purple-500/35 mb-3 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
            <Tv className="h-7 w-7 text-purple-300" />
          </div>

          <h2 className="text-xl font-black text-white">Fernseher beitreten</h2>
          <p className="mt-1 text-xs text-[#8E8E93] max-w-xs leading-relaxed">
            Scanne den QR-Code auf deinem TV oder gib den Beitrittscode ein, um direkt in die Spiellobby zu gelangen.
          </p>

          {/* Fehlermeldung */}
          {errorMessage && (
            <div className="mt-3 w-full rounded-2xl bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 animate-fade-in">
              {errorMessage}
            </div>
          )}

          {/* Großer Scanner-Button */}
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            disabled={isJoining}
            className="mt-5 w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-95 hover:brightness-110 cursor-pointer"
          >
            <QrCode className="h-4 w-4" />
            <span>Jetzt TV QR-Code scannen</span>
          </button>

          {/* Trennlinie */}
          <div className="my-4 flex items-center gap-3 w-full">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93]">oder Code</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Manuelle Code-Eingabe */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Z. B. 7K9P2"
              className="w-full text-center text-xl font-mono font-black tracking-[0.25em] px-4 py-3 rounded-2xl bg-black/50 ring-1 ring-white/15 focus:ring-2 focus:ring-purple-500 outline-none uppercase text-white placeholder:text-white/20"
            />

            <button
              type="submit"
              disabled={code.trim().length < 3 || isJoining}
              className={`w-full py-3 rounded-full text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                code.trim().length >= 3 && !isJoining
                  ? 'bg-white/15 hover:bg-white/20 text-white ring-1 ring-white/20 shadow-md'
                  : 'bg-white/[0.06] text-white/30 ring-1 ring-white/10 cursor-not-allowed'
              }`}
            >
              {isJoining ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Verbinde mit Lobby...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Mit Code beitreten</span>
                </>
              )}
            </button>
          </form>
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
