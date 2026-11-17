import { useState } from 'react';
import { ArrowLeft, Check, Play, Sparkles } from 'lucide-react';
import { SplashScreen } from '../SplashScreen';
import {
  saveSplashVariant,
  SPLASH_VARIANTS,
  type SplashVariantId,
} from './splashVariants';

interface SplashDesignModalProps {
  isOpen: boolean;
  activeVariant: SplashVariantId;
  onSelectVariant: (variant: SplashVariantId) => void;
  onClose: () => void;
}

export function SplashDesignModal({
  isOpen,
  activeVariant,
  onSelectVariant,
  onClose,
}: SplashDesignModalProps) {
  const [previewVariant, setPreviewVariant] = useState<SplashVariantId | null>(null);

  if (!isOpen) return null;

  const handleChooseAndPreview = (id: SplashVariantId) => {
    saveSplashVariant(id);
    onSelectVariant(id);
    setPreviewVariant(id);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Startanimationen auswählen"
        inert={Boolean(previewVariant)}
        aria-hidden={Boolean(previewVariant)}
        onClick={(e) => e.stopPropagation()}
        className={`fixed inset-0 z-80 flex flex-col overflow-hidden bg-[#0F172A]/90 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] backdrop-blur-md animate-fade-in select-none ${
          previewVariant ? 'pointer-events-none' : ''
        }`}
      >
        {/* Kopfzeile */}
        <div className="mx-auto flex w-full max-w-[1440px] shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 sm:px-6 lg:px-8 py-3">
          <button
            type="button"
            onClick={onClose}
            className="font-arcade inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.05] px-3.5 py-2 text-xs tracking-wider text-white uppercase transition hover:bg-white/15 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>ZURÜCK</span>
          </button>

          <div className="flex items-center gap-2 border-b-2 border-[#F59E0B] pb-0.5 min-w-0">
            <Sparkles className="h-4 w-4 shrink-0 text-[#FBBF24]" />
            <span className="font-arcade truncate text-sm sm:text-xl tracking-wider text-white uppercase">
              START<span className="text-[#FBBF24]">ANIMATIONEN</span>
            </span>
          </div>

          <span className="hidden sm:block font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
            10 VARIANTEN
          </span>
        </div>

        {/* Karten-Raster mit allen 10 Varianten */}
        <div className="no-scrollbar overscroll-contain mx-auto w-full max-w-6xl flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
          <p className="mb-5 text-xs sm:text-sm text-[#CBD5E1]">
            Wähle eine von 10 Startanimationen für den App-Start. Beim Antippen wird die Variante
            gespeichert und direkt als Vollbild-Vorschau abgespielt.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {SPLASH_VARIANTS.map((item, idx) => {
              const isSelected = activeVariant === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleChooseAndPreview(item.id)}
                  className={`group flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer active:scale-[0.99] ${
                    isSelected
                      ? 'border-[#F59E0B] bg-[#F59E0B]/12 shadow-[0_0_24px_rgba(245,158,11,0.22)]'
                      : 'border-white/15 bg-white/[0.04] hover:border-white/35 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ borderColor: `${item.accentHex}66`, color: item.accentHex }}
                        className="font-arcade rounded-md border bg-white/[0.04] px-2 py-0.5 text-[10px]"
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-arcade text-[10px] tracking-wider text-[#94A3B8] uppercase">
                        {item.techTag}
                      </span>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#F59E0B] px-2 font-arcade text-[10px] text-[#0F172A]">
                        <Check className="h-3 w-3 stroke-[3]" />
                        <span>AKTIV</span>
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-white/75 group-hover:border-[#F59E0B]/60 group-hover:text-[#FDE68A]">
                        <Play className="h-3 w-3 fill-current" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-arcade text-sm sm:text-base tracking-wider text-white uppercase">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#CBD5E1]/90">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Vollbild-Vorschau der gewählten Startanimation */}
      {previewVariant && (
        <SplashScreen
          key={`preview-${previewVariant}`}
          variantOverride={previewVariant}
          onFinish={() => setPreviewVariant(null)}
        />
      )}
    </>
  );
}
