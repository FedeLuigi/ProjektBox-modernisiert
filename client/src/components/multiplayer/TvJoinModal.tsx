import { useState } from 'react';
import { ArrowLeft, Plus, QrCode, RefreshCw } from 'lucide-react';
import { InlineQrScanner } from './InlineQrScanner';
import {
  JOIN_DESIGN_OPTIONS,
  JoinDesignModal,
  type JoinDesignId,
} from './JoinDesignModal';
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
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [code, setCode] = useState('');
  const [design, setDesign] = useState<JoinDesignId>(() => {
    try {
      const saved = localStorage.getItem('projektbox.joinDesign') as JoinDesignId | null;
      if (saved && JOIN_DESIGN_OPTIONS.some((o) => o.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'join-open-stage';
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
    setEntryMode('code');
    setCode(scannedCode);
    onJoin(scannedCode);
  };

  const handleClose = () => {
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

  const handleSelectDesign = (next: JoinDesignId) => {
    setDesign(next);
    try {
      localStorage.setItem('projektbox.joinDesign', next);
    } catch {
      // ignore
    }
  };

  const errorBanner = errorMessage ? (
    <div className="font-arcade w-full max-w-md rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
      {errorMessage}
    </div>
  ) : null;

  const underlineInput = (compact = false) => (
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
      className={`font-arcade w-full border-b-2 border-white/30 bg-transparent px-2 text-white placeholder:text-white/25 focus:border-[#F59E0B] focus:outline-none uppercase transition-colors caret-[#FBBF24] ${
        compact
          ? 'h-11 text-xl sm:text-2xl tracking-[0.25em] placeholder:text-xs sm:placeholder:text-sm placeholder:tracking-[0.18em] text-left'
          : 'h-14 text-3xl sm:text-4xl tracking-[0.3em] placeholder:text-sm sm:placeholder:text-base placeholder:tracking-[0.22em] text-center'
      }`}
    />
  );

  const joinButton = (fullWidth = true) => (
    <OpenButton
      type="submit"
      fullWidth={fullWidth}
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
  );

  const qrTileButton = (large = false) => (
    <button
      type="button"
      disabled={isJoining}
      onClick={() => setEntryMode('qr')}
      aria-label="QR-Code scannen"
      className={`group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-[#F59E0B]/45 bg-[#F59E0B]/[0.08] text-[#FDE68A] transition-all hover:border-[#F59E0B] hover:bg-[#F59E0B]/15 hover:scale-[1.03] active:scale-95 disabled:opacity-45 cursor-pointer ${
        large ? 'px-10 py-7' : 'px-8 py-4'
      }`}
    >
      <QrCode
        className={`${
          large ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-12 w-12 sm:h-14 sm:w-14'
        } stroke-[1.75] text-[#FBBF24] transition-transform group-hover:scale-105`}
      />
      <span className="font-arcade text-xs tracking-wider uppercase">
        QR-CODE SCANNEN
      </span>
    </button>
  );

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={entryMode === 'qr' ? 'QR-Code scannen' : 'Lobby beitreten'}
        inert={showDesignModal}
        aria-hidden={showDesignModal}
        onClick={handleClose}
        className={`fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0F172A]/85 p-4 sm:p-8 backdrop-blur-md select-none animate-fade-in ${
          showDesignModal ? 'pointer-events-none' : ''
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 min-h-0 w-full max-w-4xl flex-col justify-between"
        >
          {/* Kopfzeile mit ZURÜCK links & „+“-Designwechsler rechts */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBackClick}
              className="font-arcade inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>ZURÜCK</span>
            </button>

            {entryMode === 'code' ? (
              <button
                type="button"
                onClick={() => setShowDesignModal(true)}
                title="Designarten für Lobby beitreten öffnen"
                aria-label="Designarten für Lobby beitreten öffnen"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/[0.06] text-[#FDE68A] hover:border-[#F59E0B] hover:bg-[#F59E0B]/20 hover:text-white transition-all cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : (
              <div aria-hidden="true" className="w-8" />
            )}
          </div>

          {entryMode === 'qr' ? (
            <div className="my-auto mx-auto flex w-full max-w-xl flex-col items-center gap-5 py-4 text-center">
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                  QR-CODE <span className="text-[#FBBF24]">SCANNEN</span>
                </span>
              </div>

              <InlineQrScanner
                onScanSuccess={handleScanSuccess}
                onSwitchToCodeEntry={() => setEntryMode('code')}
              />
            </div>
          ) : (
            <>

          {/* 1. OFFENE BÜHNE (KLASSIK) */}
          {design === 'join-open-stage' && (
            <form
              onSubmit={handleSubmit}
              className="my-auto mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-4 text-center"
            >
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                  LOBBY <span className="text-[#FBBF24]">BEITRETEN</span>
                </span>
              </div>

              {errorBanner}

              <div className="flex w-full max-w-sm flex-col items-center gap-2">
                <label
                  htmlFor="lobby-join-code-input"
                  className="font-arcade text-xs tracking-widest text-[#94A3B8] uppercase"
                >
                  LOBBY-CODE
                </label>
                {underlineInput(false)}
              </div>

              <div className="w-full max-w-xs">{joinButton(true)}</div>

              <div className="flex w-full max-w-xs items-center gap-3">
                <div className="h-px flex-1 bg-white/15" />
                <span className="font-arcade text-[11px] tracking-widest text-[#94A3B8] uppercase">
                  ODER
                </span>
                <div className="h-px flex-1 bg-white/15" />
              </div>

              {qrTileButton(false)}
            </form>
          )}

          {/* 2. DUAL-PORTAL (2-SPALTEN NEBENEINANDER) */}
          {design === 'join-split-portal' && (
            <form
              onSubmit={handleSubmit}
              className="my-auto flex w-full flex-col items-center gap-7 py-4"
            >
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1 text-center">
                <span className="font-arcade text-2xl sm:text-4xl tracking-wider text-white uppercase">
                  LOBBY <span className="text-[#FBBF24]">BEITRETEN</span>
                </span>
              </div>

              {errorBanner}

              <div className="grid w-full grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12">
                <div className="flex flex-col items-center md:items-start gap-5 border-b md:border-b-0 md:border-r border-white/15 pb-7 md:pb-0 md:pr-10">
                  <span className="font-arcade text-xs tracking-widest text-[#94A3B8] uppercase">
                    MIT CODE BEITRETEN
                  </span>
                  {underlineInput(true)}
                  <div className="w-full max-w-xs">{joinButton(true)}</div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <span className="font-arcade text-xs tracking-widest text-[#94A3B8] uppercase">
                    MIT KAMERA SCANNEN
                  </span>
                  {qrTileButton(true)}
                </div>
              </div>
            </form>
          )}

          {/* 3. 5-SLOT CODE-BÜHNE (PIN-FELDER) */}
          {design === 'join-pin-slots' && (
            <form
              onSubmit={handleSubmit}
              className="my-auto mx-auto flex w-full max-w-lg flex-col items-center gap-6 py-4 text-center"
            >
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                  LOBBY <span className="text-[#FBBF24]">BEITRETEN</span>
                </span>
              </div>

              {errorBanner}

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
                {joinButton(true)}
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

          {/* 4. QR-FOKUS (KAMERA ZUERST) */}
          {design === 'join-hero-qr' && (
            <form
              onSubmit={handleSubmit}
              className="my-auto mx-auto flex w-full max-w-md flex-col items-center gap-6 py-4 text-center"
            >
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                  LOBBY <span className="text-[#FBBF24]">BEITRETEN</span>
                </span>
              </div>

              {errorBanner}

              <button
                type="button"
                disabled={isJoining}
                onClick={() => setEntryMode('qr')}
                aria-label="QR-Code scannen"
                className="group relative flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-[#F59E0B]/60 bg-[#F59E0B]/[0.07] px-12 py-8 text-[#FDE68A] transition-all hover:border-[#F59E0B] hover:bg-[#F59E0B]/15 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <QrCode className="h-20 w-20 stroke-[1.5] text-[#FBBF24] transition-transform group-hover:scale-105" />
                <span className="font-arcade text-sm tracking-wider uppercase">
                  KAMERA ÖFFNEN
                </span>
              </button>

              <div className="flex w-full items-center gap-3 border-t border-white/15 pt-5">
                <div className="flex-1 min-w-0">{underlineInput(true)}</div>
                <div className="shrink-0">{joinButton(false)}</div>
              </div>
            </form>
          )}

          {/* 5. EDITORIAL BREITBILD (HORIZONTAL) */}
          {design === 'join-editorial-bar' && (
            <form
              onSubmit={handleSubmit}
              className="my-auto flex w-full flex-col gap-7 py-4"
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/15 pb-3">
                <h2 className="font-arcade text-3xl sm:text-5xl tracking-wider text-white uppercase">
                  LOBBY <span className="text-[#FBBF24]">BEITRETEN</span>
                </h2>
                <span className="font-arcade text-xs tracking-widest text-[#94A3B8] uppercase">
                  CODE EINTIPPEN ODER QR SCANNEN
                </span>
              </div>

              {errorBanner}

              <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-end gap-4">
                <div className="flex-1 min-w-0">{underlineInput(true)}</div>
                <div className="sm:w-48 shrink-0">{joinButton(true)}</div>
                <button
                  type="button"
                  disabled={isJoining}
                  onClick={() => setEntryMode('qr')}
                  title="QR-Code scannen"
                  aria-label="QR-Code scannen"
                  className="flex h-12 sm:w-14 items-center justify-center gap-2 rounded-xl border border-[#F59E0B]/55 bg-[#F59E0B]/12 text-[#FDE68A] hover:bg-[#F59E0B]/22 transition-colors cursor-pointer active:scale-95"
                >
                  <QrCode className="h-6 w-6" />
                  <span className="font-arcade text-xs sm:hidden">QR SCANNEN</span>
                </button>
              </div>
            </form>
          )}

          {/* 6. SCHWEBENDE GLAS-LEISTE */}
          {design === 'join-floating-pill' && (
            <form
              onSubmit={handleSubmit}
              className="my-auto mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-4 text-center"
            >
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                  LOBBY <span className="text-[#FBBF24]">BEITRETEN</span>
                </span>
              </div>

              {errorBanner}

              <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.05] p-3 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
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
                  className="font-arcade h-12 flex-1 min-w-0 bg-transparent px-3 text-center sm:text-left text-2xl tracking-[0.25em] text-white placeholder:text-sm placeholder:tracking-[0.2em] placeholder:text-white/30 focus:outline-none uppercase caret-[#FBBF24]"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex-1 sm:flex-none">{joinButton(false)}</div>
                  <button
                    type="button"
                    disabled={isJoining}
                    onClick={() => setEntryMode('qr')}
                    title="QR-Code scannen"
                    aria-label="QR-Code scannen"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#F59E0B]/55 bg-[#F59E0B]/15 text-[#FBBF24] hover:bg-[#F59E0B]/25 transition-colors cursor-pointer active:scale-95"
                  >
                    <QrCode className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </form>
          )}
            </>
          )}

          <div aria-hidden="true" className="h-4" />
        </div>
      </div>

      <JoinDesignModal
        isOpen={showDesignModal}
        activeDesign={design}
        onSelectDesign={handleSelectDesign}
        onClose={() => setShowDesignModal(false)}
      />
    </>
  );
}
