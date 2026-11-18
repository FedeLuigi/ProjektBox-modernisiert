import { useState } from 'react';
import { ArrowLeft, QrCode, RefreshCw } from 'lucide-react';
import { InlineQrScanner } from './InlineQrScanner';
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
  const [entryMode, setEntryMode] = useState<'code' | 'qr'>('code');
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
    setEntryMode('code');
    setCode(scannedCode);
    onJoin(scannedCode);
  };

  const handleClose = () => {
    setCode('');
    setEntryMode('code');
    onClose();
  };

  const handleBackClick = () => {
    if (entryMode === 'qr') {
      setEntryMode('code');
      return;
    }
    handleClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={entryMode === 'qr' ? 'QR-Code scannen' : 'Lobby beitreten'}
      onClick={handleClose}
      className="fixed inset-0 z-50 flex w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0F172A]/85 pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(14px+env(safe-area-inset-bottom,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pt-[calc(28px+env(safe-area-inset-top,0px))] sm:pb-[calc(28px+env(safe-area-inset-bottom,0px))] sm:pl-[max(32px,env(safe-area-inset-left,0px))] sm:pr-[max(32px,env(safe-area-inset-right,0px))] backdrop-blur-md select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-1 min-h-0 w-full max-w-4xl flex-col justify-between"
      >
        {/* Kopfzeile mit ZURÜCK links */}
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={handleBackClick}
            className="font-arcade inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>ZURÜCK</span>
          </button>
        </div>

        {entryMode === 'qr' ? (
          <div className="join-landscape-form my-auto mx-auto flex w-full max-w-xl flex-col items-center gap-3 sm:gap-5 landscape:gap-2 py-2 sm:py-4 landscape:py-1 text-center">
            <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
              <span className="font-arcade text-xl sm:text-3xl landscape:text-lg tracking-wider text-white uppercase">
                QR-CODE <span className="text-[#FBBF24]">SCANNEN</span>
              </span>
            </div>

            <InlineQrScanner
              onScanSuccess={handleScanSuccess}
              onSwitchToCodeEntry={() => setEntryMode('code')}
            />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="join-landscape-form my-auto mx-auto flex w-full max-w-lg flex-col items-center gap-6 py-4 text-center"
          >
            <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
              <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                LOBBY <span className="text-[#FBBF24]">BEITRETEN</span>
              </span>
            </div>

            {errorMessage && (
              <div className="font-arcade w-full max-w-md rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
                {errorMessage}
              </div>
            )}

            {/* 5-Slot Code-Bühne */}
            <div className="relative w-full max-w-sm py-2">
              <div className="grid grid-cols-5 gap-2.5 sm:gap-3 pointer-events-none">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const char = cleanCode[idx] || '';
                  const isActive = cleanCode.length === idx;
                  return (
                    <div
                      key={idx}
                      className={`flex h-16 items-center justify-center border-b-2 font-arcade text-3xl sm:text-4xl transition-colors ${
                        char
                          ? 'border-[#F59E0B] text-[#FDE68A]'
                          : isActive
                            ? 'border-[#38BDF8] text-white/30'
                            : 'border-white/25 text-white/15'
                      }`}
                    >
                      {char || '•'}
                    </div>
                  );
                })}
              </div>
              <input
                id="lobby-join-code-input"
                type="text"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                aria-label="5-stelliger Lobby-Code"
                className="absolute inset-0 h-full w-full opacity-0 cursor-text"
              />
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3">
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

              <OpenButton
                fullWidth
                size="md"
                variant="outline-amber"
                disabled={isJoining}
                onClick={() => setEntryMode('qr')}
              >
                <QrCode className="h-5 w-5" />
                <span>QR-CODE SCANNEN</span>
              </OpenButton>
            </div>
          </form>
        )}

        <div aria-hidden="true" className="h-4" />
      </div>
    </div>
  );
}
