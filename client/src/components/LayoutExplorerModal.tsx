import { ArrowLeft, Check, Layers } from 'lucide-react';
import { type OpenLayoutId, OPEN_LAYOUT_OPTIONS } from './MainMenuLayouts';

interface LayoutExplorerModalProps {
  isOpen: boolean;
  activeLayout: OpenLayoutId;
  onSelectLayout: (layout: OpenLayoutId) => void;
  onClose: () => void;
}

/**
 * Mini-Wireframe-Vorschau für jede verschmolzene Open-Gallery-Variante,
 * damit die räumliche Aufteilung von Titel, Avatar, Suche, Tabs & Buttons sofort erkennbar ist.
 */
function LayoutMiniWireframe({ layoutId, active }: { layoutId: OpenLayoutId; active: boolean }) {
  const accent = active ? 'bg-[#F59E0B]' : 'bg-[#F59E0B]/70';
  const line = 'bg-white/25';
  const soft = 'bg-white/12';

  if (layoutId === 'open-unified-bar') {
    return (
      <div className="flex h-20 w-full flex-col gap-2 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        {/* Eine einzige verschmolzene Top-Leiste */}
        <div className="flex items-center justify-between gap-1.5 border-b border-white/15 pb-1.5">
          <div className="flex items-center gap-1.5">
            <div className={`h-3.5 w-3.5 rounded-full ${accent}`} />
            <div className="h-2.5 w-12 rounded-sm bg-white/75" />
            <div className="h-3 w-3 rounded-sm border border-[#38BDF8]/60 bg-[#38BDF8]/20" />
          </div>
          <div className="h-2.5 w-14 rounded-sm border-b border-white/40 bg-white/10" />
          <div className="flex items-center gap-1">
            <div className="h-3 w-7 rounded-sm border border-[#F59E0B]/60" />
            <div className="h-3 w-3 rounded-sm border border-white/25" />
          </div>
        </div>
        {/* Tabs direkt darunter */}
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-6 rounded-full ${accent}`} />
          <div className={`h-1.5 w-7 rounded-full ${line}`} />
          <div className={`h-1.5 w-6 rounded-full ${line}`} />
        </div>
        {/* Open Gallery Karten */}
        <div className="grid flex-1 grid-cols-3 gap-1.5">
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
        </div>
      </div>
    );
  }

  if (layoutId === 'open-editorial') {
    return (
      <div className="flex h-20 w-full flex-col gap-1.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        {/* Obere Utility-Zeile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className={`h-3 w-3 rounded-full ${accent}`} />
            <div className={`h-1.5 w-8 rounded-full ${line}`} />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-6 rounded-sm border border-[#F59E0B]/60" />
            <div className="h-2.5 w-2.5 rounded-sm border border-white/25" />
          </div>
        </div>
        {/* Editorial Masthead: Titel + Tabs + Suche auf einer Linie */}
        <div className="flex items-end justify-between gap-1.5 border-b border-white/20 pb-1">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-11 rounded-sm bg-white/80" />
            <div className="h-2.5 w-2.5 rounded-sm border border-[#38BDF8]/60" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-5 rounded-full ${accent}`} />
            <div className={`h-1.5 w-5 rounded-full ${line}`} />
          </div>
          <div className="h-2 w-10 border-b border-white/40" />
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1.5">
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
        </div>
      </div>
    );
  }

  if (layoutId === 'open-docked-rail') {
    return (
      <div className="flex h-20 w-full gap-2 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        {/* Verschmolzene Seitenleiste */}
        <div className="flex w-16 shrink-0 flex-col justify-between border-r border-white/15 pr-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <div className={`h-3 w-3 rounded-full ${accent}`} />
              <div className="h-2 w-7 rounded-sm bg-white/75" />
            </div>
            <div className="h-2 w-full border-b border-white/30" />
          </div>
          <div className="flex flex-col gap-1">
            <div className={`h-1.5 w-9 rounded-full ${accent}`} />
            <div className={`h-1.5 w-8 rounded-full ${line}`} />
            <div className={`h-1.5 w-7 rounded-full ${line}`} />
          </div>
          <div className="flex gap-1">
            <div className="h-2 w-6 rounded-sm border border-[#F59E0B]/60" />
            <div className="h-2 w-2 rounded-sm border border-white/25" />
          </div>
        </div>
        {/* Open Gallery */}
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
        </div>
      </div>
    );
  }

  if (layoutId === 'open-floating-pill') {
    return (
      <div className="flex h-20 w-full flex-col gap-1.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`h-3.5 w-3.5 rounded-full ${accent}`} />
            <div className="h-2.5 w-12 rounded-sm bg-white/80" />
            <div className="h-3 w-3 rounded-sm border border-[#38BDF8]/60" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-7 rounded-sm border border-[#F59E0B]/60" />
            <div className="h-3 w-3 rounded-sm border border-white/25" />
          </div>
        </div>
        {/* Schwebende Glass-Pill für Tabs + Suche */}
        <div className="mx-auto flex w-11/12 items-center justify-between rounded-full border border-white/20 bg-white/10 px-2 py-1">
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-5 rounded-full ${accent}`} />
            <div className={`h-1.5 w-5 rounded-full ${line}`} />
            <div className={`h-1.5 w-4 rounded-full ${line}`} />
          </div>
          <div className="h-2 w-9 rounded-full bg-white/15" />
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1.5">
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
        </div>
      </div>
    );
  }

  // open-classic
  return (
    <div className="flex h-20 w-full flex-col gap-1.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
      <div className="flex items-center justify-between">
        <div className={`h-3.5 w-3.5 rounded-full ${accent}`} />
        <div className="flex items-center gap-1 border-b border-[#F59E0B] pb-0.5">
          <div className="h-2.5 w-12 rounded-sm bg-white/80" />
          <div className="h-2.5 w-2.5 rounded-sm border border-[#38BDF8]/60" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-7 rounded-sm border border-[#F59E0B]/60" />
          <div className="h-3 w-3 rounded-sm border border-white/25" />
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-white/15 pb-1">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-5 rounded-full ${accent}`} />
          <div className={`h-1.5 w-6 rounded-full ${line}`} />
          <div className={`h-1.5 w-5 rounded-full ${line}`} />
        </div>
        <div className="h-2 w-10 border-b border-white/40" />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1.5">
        <div className={`rounded-md ${soft}`} />
        <div className={`rounded-md ${soft}`} />
        <div className={`rounded-md ${soft}`} />
      </div>
    </div>
  );
}

/**
 * Vollbild-Overlay im gleichen Open-Gallery-Stil (erreichbar über den „+“-Button):
 * Ermöglicht den direkten Live-Wechsel zwischen verschmolzenen Open-Gallery-Layouts.
 */
export function LayoutExplorerModal({
  isOpen,
  activeLayout,
  onSelectLayout,
  onClose,
}: LayoutExplorerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0F172A]/75 backdrop-blur-md animate-fade-in">
      {/* Kopfzeile mit Zurück-Button im gleichen offenen Stil */}
      <div className="mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between gap-3 px-4 sm:px-6 pt-4 pb-3 border-b border-white/15">
        <button
          type="button"
          onClick={onClose}
          className="font-arcade inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-xs tracking-wider text-white uppercase transition hover:bg-white/15 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>ZURÜCK</span>
        </button>

        <div className="flex items-center gap-2 border-b-2 border-[#F59E0B] pb-0.5 select-none">
          <Layers className="h-4 w-4 text-[#FBBF24]" />
          <span className="font-arcade text-base sm:text-xl tracking-wider text-white uppercase">
            OPEN GALLERY <span className="text-[#FBBF24]">LAYOUTS</span>
          </span>
        </div>

        <div className="hidden sm:block text-right">
          <span className="font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
            DESIGN BLEIBT • AUFBAU VERSCHMILZT
          </span>
        </div>
      </div>

      {/* Auswahlbereich der Layout-Varianten */}
      <div className="no-scrollbar mx-auto w-full max-w-5xl flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
        <p className="mb-5 text-xs sm:text-sm text-[#CBD5E1]">
          Wähle eine Layout-Komposition für das Hauptmenü. Das offene Open-Gallery-Design bleibt erhalten – Titel, Avatar, Suche, Tabs und Buttons verschmelzen unterschiedlich stark miteinander.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-6">
          {OPEN_LAYOUT_OPTIONS.map((option) => {
            const isSelected = option.id === activeLayout;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelectLayout(option.id);
                  onClose();
                }}
                className={`group flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? 'border-[#F59E0B] bg-[#F59E0B]/10 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                    : 'border-white/15 bg-white/[0.04] hover:border-white/35 hover:bg-white/[0.08]'
                }`}
              >
                <LayoutMiniWireframe layoutId={option.id} active={isSelected} />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-arcade text-sm sm:text-base tracking-wider text-white uppercase">
                        {option.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                      {option.description}
                    </p>
                  </div>

                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                      isSelected
                        ? 'border-[#F59E0B] bg-[#F59E0B] text-[#0F172A]'
                        : 'border-white/20 text-transparent group-hover:border-white/40'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
