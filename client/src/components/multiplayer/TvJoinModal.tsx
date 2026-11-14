import { useState } from 'react';
import { QrCode, RefreshCw } from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';
import { CrystalButton, CrystalPanel } from '../CrystalUI';

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
        className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center overflow-y-auto p-4 bg-[#0F172A]/80 backdrop-blur-xs select-none animate-fade-in"
      >
        <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-sm pt-3">
          <CrystalPanel
            topTabLabel="TV BEITRETEN"
            title="CODE EINGEBEN"
            accent="amber"
            contentClassName="gap-3.5 py-6 px-5 sm:px-6"
          >
            <p className="-mt-2 text-center text-xs sm:text-sm font-semibold text-[#475569] leading-snug">
              Gib den 5-stelligen Lobby-Code vom TV-Bildschirm ein.
            </p>

            {errorMessage && (
              <div className="font-arcade w-full border-2 border-[#7F1D1D] bg-[#EF4444] px-3 py-2 text-center text-xs text-white uppercase">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-3">
              {/* Abgeschrägtes Code-Eingabefeld in voller Button-Breite */}
              <div
                style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                className="w-full bg-[#0F172A] p-[3px] shadow-[0_4px_0_rgba(15,23,42,0.28)]"
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
                  style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                  className="font-arcade h-12 sm:h-14 w-full border-2 border-[#475569] focus:border-[#F59E0B] bg-[#1E293B] px-4 text-center text-xl sm:text-2xl tracking-[0.28em] placeholder:tracking-[0.14em] text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none uppercase transition-colors"
                />
              </div>

              <CrystalButton
                type="submit"
                fullWidth
                size="lg"
                variant="primary"
                tilt="left"
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
              </CrystalButton>
            </form>

            {/* Dezente horizontale Trennlinie mit "ODER"-Label */}
            <div className="flex w-full items-center gap-3 py-0.5">
              <div className="h-[2px] flex-1 bg-[#CBD5E1]" />
              <span className="font-arcade text-xs tracking-widest text-[#64748B] uppercase">
                ODER
              </span>
              <div className="h-[2px] flex-1 bg-[#CBD5E1]" />
            </div>

            <CrystalButton
              fullWidth
              size="md"
              variant="amber"
              tilt="right"
              disabled={isJoining}
              onClick={() => setShowScanner(true)}
            >
              <QrCode className="h-4 w-4" />
              <span>QR-CODE SCANNEN</span>
            </CrystalButton>

            <div className="w-full pt-2 flex justify-center">
              <CrystalButton
                size="sm"
                variant="secondary"
                tilt="left"
                onClick={onClose}
                className="min-w-[140px]"
              >
                ABBRECHEN
              </CrystalButton>
            </div>
          </CrystalPanel>
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
