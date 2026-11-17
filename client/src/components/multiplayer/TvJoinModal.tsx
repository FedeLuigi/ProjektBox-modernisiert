import { useState } from 'react';
import { ArrowLeft, QrCode, RefreshCw, Tv, X } from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';
import { OpenButton, OpenModalFrame } from '../OpenSubpageUI';
import {
  PlusDesignButton,
  SUBPAGE_DESIGN_OPTIONS,
  SubpageDesignModal,
  type SubpageDesignId,
} from '../SubpageDesignModal';

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
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [code, setCode] = useState('');
  const [design, setDesign] = useState<SubpageDesignId>(() => {
    try {
      const saved = localStorage.getItem('projektbox.tvJoinDesign') as SubpageDesignId | null;
      if (saved && SUBPAGE_DESIGN_OPTIONS.some((o) => o.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'glass-card';
  });

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

  const handleSelectDesign = (next: SubpageDesignId) => {
    setDesign(next);
    try {
      localStorage.setItem('projektbox.tvJoinDesign', next);
    } catch {
      // ignore
    }
  };

  const codeInput = (frameless = false) => (
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
      className={
        frameless
          ? 'font-arcade h-14 w-full border-b-2 border-white/30 bg-transparent px-2 text-center text-2xl sm:text-3xl font-bold tracking-[0.3em] placeholder:tracking-[0.14em] text-white placeholder:text-white/35 focus:border-[#F59E0B] focus:outline-none uppercase transition-colors caret-[#FBBF24]'
          : 'font-arcade h-12 sm:h-14 landscape:h-10 w-full rounded-xl border border-white/20 bg-white/[0.06] px-4 text-center text-xl sm:text-2xl landscape:text-base font-bold tracking-[0.28em] placeholder:tracking-[0.14em] text-white placeholder:text-white/40 focus:border-[#F59E0B] focus:bg-white/[0.09] focus:outline-none uppercase transition-colors caret-[#FBBF24]'
      }
    />
  );

  const errorBanner = errorMessage ? (
    <div className="font-arcade w-full rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
      {errorMessage}
    </div>
  ) : null;

  const submitButton = (
    <OpenButton
      type="submit"
      fullWidth
      size="lg"
      variant="primary"
      disabled={!isValidCode || isJoining}
      className="landscape:h-10 landscape:text-xs"
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
  );

  const qrButton = (
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
  );

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        className={`fixed inset-0 min-h-dvh z-50 flex w-full flex-col overflow-y-auto overflow-x-hidden bg-[#0F172A]/85 backdrop-blur-md select-none animate-fade-in ${
          design === 'floating-sheet'
            ? 'items-center justify-end p-2 sm:p-6'
            : design === 'open-stage'
              ? 'items-center justify-between p-4 sm:p-8'
              : 'items-center justify-center p-4 landscape:p-2'
        }`}
      >
        {/* 1. OFFENE BÜHNE */}
        {design === 'open-stage' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-1 min-h-0 w-full max-w-xl flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="font-arcade inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 cursor-pointer active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>ZURÜCK</span>
              </button>

              <PlusDesignButton onClick={() => setShowDesignModal(true)} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="my-auto flex w-full flex-col items-center gap-6 py-4 text-center"
            >
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                  TV <span className="text-[#FBBF24]">BEITRETEN</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#CBD5E1]">
                Gib den 5-stelligen Lobby-Code vom TV-Bildschirm ein.
              </p>

              {errorBanner}
              {codeInput(true)}

              <div className="flex w-full max-w-sm flex-col gap-2.5">
                {submitButton}
                {qrButton}
              </div>
            </form>

            <div aria-hidden="true" className="h-4" />
          </div>
        )}

        {/* 2. SPLIT-STUDIO */}
        {design === 'split-studio' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="tablet-modal-box my-auto grid w-full max-w-2xl grid-cols-1 sm:grid-cols-[0.85fr_1.15fr] overflow-hidden rounded-2xl border border-white/15 bg-[#0F172A]/90 text-white backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
          >
            <div className="flex flex-col justify-between gap-4 border-b sm:border-b-0 sm:border-r border-white/15 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F59E0B]/50 bg-[#F59E0B]/15 text-[#FDE68A]">
                  <Tv className="h-5 w-5" />
                </div>
                <PlusDesignButton onClick={() => setShowDesignModal(true)} />
              </div>

              <div>
                <div className="border-b-2 border-[#F59E0B] inline-block pb-0.5">
                  <h2 className="font-arcade text-lg tracking-wider text-white uppercase">
                    TV <span className="text-[#FBBF24]">BEITRETEN</span>
                  </h2>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]">
                  Verbinde dein Smartphone per Lobby-Code oder QR-Code direkt mit dem TV-Raum.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col justify-between gap-3.5 p-5 sm:p-6">
              <div className="flex justify-end -mt-1 -mr-1">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Schließen"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/12 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {errorBanner}
              {codeInput(false)}
              {submitButton}
              {qrButton}
            </form>
          </div>
        )}

        {/* 3. BOTTOM-SHEET */}
        {design === 'floating-sheet' && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0F172A]/95 p-5 sm:p-6 text-white backdrop-blur-xl shadow-[0_-16px_50px_rgba(0,0,0,0.6)]"
          >
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/25" />
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-arcade text-base sm:text-lg tracking-wider text-white uppercase">
                  TV <span className="text-[#FBBF24]">BEITRETEN</span>
                </span>
                <PlusDesignButton onClick={() => setShowDesignModal(true)} />
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Schließen"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/12 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {errorBanner}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1">{codeInput(false)}</div>
                <div className="sm:w-44">{submitButton}</div>
              </div>
              {qrButton}
            </form>
          </div>
        )}

        {/* 4. MINIMAL-FOKUS */}
        {design === 'minimal-focus' && (
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="my-auto flex w-full max-w-md flex-col items-center gap-5 px-2 text-center"
          >
            <div className="flex w-full items-center justify-between">
              <PlusDesignButton onClick={() => setShowDesignModal(true)} />
              <span className="font-arcade text-sm tracking-widest text-[#FBBF24] uppercase">
                TV CODE
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Schließen"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/12 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorBanner}
            {codeInput(true)}

            <div className="flex w-full flex-col gap-2.5">
              {submitButton}
              {qrButton}
            </div>
          </form>
        )}

        {/* 5. KLASSIK-GLAS */}
        {design === 'glass-card' && (
          <div className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-lg">
            <OpenModalFrame
              title="TV"
              accentWord="BEITRETEN"
              headerAction={<PlusDesignButton onClick={() => setShowDesignModal(true)} />}
              onClose={onClose}
              contentClassName="gap-4 landscape:gap-2.5"
            >
              <p className="text-center text-xs sm:text-sm text-[#CBD5E1] leading-snug">
                Gib den 5-stelligen Lobby-Code vom TV-Bildschirm ein.
              </p>

              {errorBanner}

              <form
                onSubmit={handleSubmit}
                className="w-full flex flex-col landscape:flex-row items-center gap-3 landscape:gap-2"
              >
                <div className="w-full landscape:flex-1">{codeInput(false)}</div>
                <div className="w-full landscape:w-auto landscape:min-w-[140px]">{submitButton}</div>
              </form>

              <div className="flex landscape:hidden w-full items-center gap-3">
                <div className="h-px flex-1 bg-white/15" />
                <span className="font-arcade text-[11px] tracking-widest text-[#94A3B8] uppercase">
                  ODER
                </span>
                <div className="h-px flex-1 bg-white/15" />
              </div>

              <div className="flex flex-col landscape:grid landscape:grid-cols-2 items-center gap-2.5 landscape:gap-2 w-full">
                {qrButton}

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
        )}
      </div>

      <QrScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
        onSwitchToCodeEntry={() => setShowScanner(false)}
      />

      <SubpageDesignModal
        isOpen={showDesignModal}
        contextTitle="TV BEITRETEN"
        activeDesign={design}
        onSelectDesign={handleSelectDesign}
        onClose={() => setShowDesignModal(false)}
      />
    </>
  );
}
