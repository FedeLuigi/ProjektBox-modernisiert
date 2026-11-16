import { useState } from 'react';
import { QrCode, RefreshCw } from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';
import { OpenButton, OpenModalFrame } from '../OpenSubpageUI';

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

  const cleanCode = code.trim().toUpperCase();
  const isValidCode = cleanCode.length >= 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidCode && !isJoining) {
      onJoin(cleanCode);
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
        onClick={onClose}
        className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden p-4 landscape:p-2 bg-[#0F172A]/80 backdrop-blur-sm select-none animate-fade-in"
      >
        <div className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-lg">
          <OpenModalFrame
            title="TV"
            accentWord="BEITRETEN"
            onClose={onClose}
            contentClassName="gap-4 landscape:gap-2.5"
          >
            <p className="text-center text-xs sm:text-sm text-[#CBD5E1] leading-snug">
              Gib den 5-stelligen Lobby-Code vom TV-Bildschirm ein.
            </p>

            {errorMessage && (
              <div className="font-arcade w-full rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
                {errorMessage}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="w-full flex flex-col landscape:flex-row items-center gap-3 landscape:gap-2"
            >
              <input
                type="text"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="z. B. 9ZPZW"
                aria-label="5-stelliger Lobby-Code"
                className="font-arcade h-12 sm:h-14 landscape:h-10 w-full landscape:flex-1 rounded-xl border border-white/20 bg-white/[0.06] px-4 text-center text-xl sm:text-2xl landscape:text-base font-bold tracking-[0.28em] placeholder:tracking-[0.14em] text-white placeholder:text-white/40 focus:border-[#F59E0B] focus:bg-white/[0.09] focus:outline-none uppercase transition-colors caret-[#FBBF24]"
              />

              <OpenButton
                type="submit"
                fullWidth
                size="lg"
                variant="primary"
                disabled={!isValidCode || isJoining}
                className="landscape:w-auto landscape:min-w-[140px] landscape:h-10 landscape:text-xs"
              >
                {isJoining ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>TRETE BEI...</span>
                  </>
                ) : (
                  <span>BEITRETEN</span>
                )}
              </OpenButton>
            </form>

            <div className="flex landscape:hidden w-full items-center gap-3">
              <div className="h-px flex-1 bg-white/15" />
              <span className="font-arcade text-[11px] tracking-widest text-[#94A3B8] uppercase">
                ODER
              </span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <div className="flex flex-col landscape:grid landscape:grid-cols-2 items-center gap-2.5 landscape:gap-2 w-full">
              <OpenButton
                fullWidth
                size="md"
                variant="outline-amber"
                disabled={isJoining}
                onClick={() => setShowScanner(true)}
                className="landscape:h-9 landscape:text-xs"
              >
                <QrCode className="h-4 w-4" />
                <span>QR-CODE SCANNEN</span>
              </OpenButton>

              <OpenButton
                size="sm"
                variant="secondary"
                onClick={onClose}
                fullWidth
                className="landscape:h-9 landscape:text-xs"
              >
                ABBRECHEN
              </OpenButton>
            </div>
          </OpenModalFrame>
        </div>
      </div>

      <QrScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
        onSwitchToCodeEntry={() => setShowScanner(false)}
      />
    </>
  );
}
