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
        onClick={onClose}
        className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center overflow-y-auto p-4 bg-[#103858]/70 backdrop-blur-xs select-none animate-fade-in"
      >
        <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-sm pt-3">
          <CrystalPanel topTabLabel="TV JOIN" title="ENTER CODE" contentClassName="gap-4 py-6">
            {errorMessage && (
              <div className="font-arcade w-full border-2 border-[#7F1D1D] bg-[#EF4444] px-3 py-2 text-center text-xs text-white uppercase">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-3">
              {/* Abgeschrägtes Code-Eingabefeld im SCORE/REWARD Readout-Stil */}
              <div
                style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                className="w-full max-w-[230px] bg-[#17689A] p-[3px]"
              >
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                  className="font-arcade w-full bg-[#39A9DD] py-2.5 text-center text-2xl tracking-[0.25em] text-white placeholder:text-white/50 focus:outline-none uppercase"
                />
              </div>

              <CrystalButton
                type="submit"
                fullWidth
                size="md"
                tilt="left"
                disabled={code.trim().length < 3 || isJoining}
              >
                {isJoining ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>JOINING...</span>
                  </>
                ) : (
                  <span>PLAY</span>
                )}
              </CrystalButton>
            </form>

            <CrystalButton
              fullWidth
              size="sm"
              variant="secondary"
              tilt="right"
              disabled={isJoining}
              onClick={() => setShowScanner(true)}
            >
              <QrCode className="h-4 w-4" />
              <span>SCAN QR</span>
            </CrystalButton>

            <CrystalButton
              size="sm"
              variant="secondary"
              tilt="left"
              onClick={onClose}
              className="min-w-[120px]"
            >
              EXIT
            </CrystalButton>
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
