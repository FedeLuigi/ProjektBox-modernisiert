import { useState } from 'react';
import { ArrowLeft, QrCode, RefreshCw } from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';
import { OpenButton } from '../OpenSubpageUI';

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
        aria-label="Lobby beitreten"
        onClick={onClose}
        className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden bg-[#0F172A]/85 p-4 sm:p-8 backdrop-blur-md select-none animate-fade-in"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 min-h-0 w-full max-w-xl flex-col justify-between"
        >
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={onClose}
              className="font-arcade inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>ZURÜCK</span>
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="my-auto flex w-full flex-col items-center gap-6 py-4 text-center"
          >
            <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
              <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                LOBBY <span className="text-[#FBBF24]">BEITRETEN</span>
              </span>
            </div>

            {errorMessage && (
              <div className="font-arcade w-full max-w-sm rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
                {errorMessage}
              </div>
            )}

            <div className="flex w-full max-w-sm flex-col items-center gap-2">
              <label
                htmlFor="lobby-join-code-input"
                className="font-arcade text-xs tracking-widest text-[#94A3B8] uppercase"
              >
                LOBBY-CODE
              </label>
              <input
                id="lobby-join-code-input"
                type="text"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CODE EINGEBEN"
                aria-label="5-stelliger Lobby-Code"
                className="font-arcade h-14 w-full border-b-2 border-white/30 bg-transparent px-2 text-center text-3xl sm:text-4xl font-bold tracking-[0.3em] text-white placeholder:text-sm sm:placeholder:text-base placeholder:tracking-[0.22em] placeholder:text-white/25 focus:border-[#F59E0B] focus:outline-none uppercase transition-colors caret-[#FBBF24]"
              />
            </div>

            <div className="w-full max-w-xs">
              <OpenButton
                type="submit"
                fullWidth
                size="lg"
                variant="primary"
                disabled={!isValidCode || isJoining}
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
            </div>

            <div className="flex w-full max-w-xs items-center gap-3">
              <div className="h-px flex-1 bg-white/15" />
              <span className="font-arcade text-[11px] tracking-widest text-[#94A3B8] uppercase">
                ODER
              </span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            {/* Großes, gut sichtbares QR-Code-Scan-Symbol */}
            <button
              type="button"
              disabled={isJoining}
              onClick={() => setShowScanner(true)}
              aria-label="QR-Code scannen"
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-[#F59E0B]/45 bg-[#F59E0B]/[0.08] px-8 py-4 text-[#FDE68A] transition-all hover:border-[#F59E0B] hover:bg-[#F59E0B]/15 hover:scale-[1.03] active:scale-95 disabled:opacity-45 cursor-pointer"
            >
              <QrCode className="h-12 w-12 sm:h-14 sm:w-14 stroke-[1.75] text-[#FBBF24] transition-transform group-hover:scale-105" />
              <span className="font-arcade text-xs tracking-wider uppercase">
                QR-CODE SCANNEN
              </span>
            </button>
          </form>

          <div aria-hidden="true" className="h-4" />
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
