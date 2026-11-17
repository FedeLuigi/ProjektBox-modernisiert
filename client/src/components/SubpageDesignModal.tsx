import { ArrowLeft, Check, Layers, Plus } from 'lucide-react';

export type SubpageDesignId =
  | 'glass-card'
  | 'open-stage'
  | 'split-studio'
  | 'floating-sheet'
  | 'minimal-focus';

export interface SubpageDesignOption {
  id: SubpageDesignId;
  title: string;
  description: string;
}

export const SUBPAGE_DESIGN_OPTIONS: SubpageDesignOption[] = [
  {
    id: 'open-stage',
    title: 'Offene Bühne',
    description:
      'Komplett rahmenlos über dem dunklen Hintergrund mit Unterstrich-Elementen und viel Freiraum.',
  },
  {
    id: 'glass-card',
    title: 'Klassik-Glas',
    description:
      'Zentrierte dunkle Glas-Karte mit klarem Kopfbereich und abgerundeten Bedienelementen.',
  },
  {
    id: 'split-studio',
    title: 'Split-Studio',
    description:
      'Zweispaltiges Layout mit Info-Bereich links und den interaktiven Steuerungen rechts.',
  },
  {
    id: 'floating-sheet',
    title: 'Bottom-Sheet',
    description:
      'Moderne, unten angedockte breite Glasleiste – ideal für schnelle Einhand-Bedienung.',
  },
  {
    id: 'minimal-focus',
    title: 'Minimal-Fokus',
    description:
      'Stark reduziertes, großzügig zentriertes Fokus-Layout ohne visuelle Ablenkung.',
  },
];

export function PlusDesignButton({
  onClick,
  label = 'Designarten öffnen',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/[0.06] text-[#FDE68A] hover:border-[#F59E0B] hover:bg-[#F59E0B]/20 hover:text-white transition-all cursor-pointer active:scale-95"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}

function DesignWireframe({ designId, active }: { designId: SubpageDesignId; active: boolean }) {
  const accent = active ? 'bg-[#F59E0B]' : 'bg-[#F59E0B]/70';
  const soft = 'bg-white/12';

  if (designId === 'open-stage') {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className={`h-1.5 w-16 rounded-full ${accent}`} />
        <div className="h-2.5 w-32 border-b-2 border-white/35" />
        <div className="h-3.5 w-28 rounded-lg bg-[#10B981]/80" />
      </div>
    );
  }

  if (designId === 'split-studio') {
    return (
      <div className="grid h-20 w-full grid-cols-[0.8fr_1.2fr] gap-2 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-col justify-between border-r border-white/15 pr-2">
          <div className={`h-6 w-6 rounded-lg ${accent}`} />
          <div className="h-2 w-10 rounded-full bg-white/60" />
        </div>
        <div className="flex flex-col justify-between gap-1.5">
          <div className={`h-3.5 w-full rounded-md ${soft}`} />
          <div className="h-3.5 w-full rounded-md bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (designId === 'floating-sheet') {
    return (
      <div className="flex h-20 w-full flex-col justify-end rounded-xl border border-white/12 bg-[#0F172A]/65 p-2">
        <div className="flex h-12 w-full flex-col justify-between rounded-xl border border-white/20 bg-white/[0.08] p-2">
          <div className="mx-auto h-1 w-8 rounded-full bg-white/40" />
          <div className="flex items-center gap-2">
            <div className={`h-3 flex-1 rounded-md ${soft}`} />
            <div className="h-3 w-12 rounded-md bg-[#10B981]/80" />
          </div>
        </div>
      </div>
    );
  }

  if (designId === 'minimal-focus') {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-center gap-2 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="h-3 w-28 border-b-2 border-[#F59E0B]/80" />
        <div className="h-3.5 w-20 rounded-full bg-[#10B981]/80" />
      </div>
    );
  }

  // glass-card
  return (
    <div className="flex h-20 w-full items-center justify-center rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
      <div className="flex h-full w-28 flex-col justify-between rounded-lg border border-white/20 bg-white/[0.07] p-2">
        <div className={`h-2 w-12 rounded-sm ${accent}`} />
        <div className={`h-3 w-full rounded-sm ${soft}`} />
        <div className="h-2.5 w-full rounded-sm bg-[#10B981]/80" />
      </div>
    </div>
  );
}

interface SubpageDesignModalProps {
  isOpen: boolean;
  contextTitle: string;
  activeDesign: SubpageDesignId;
  onSelectDesign: (design: SubpageDesignId) => void;
  onClose: () => void;
}

export function SubpageDesignModal({
  isOpen,
  contextTitle,
  activeDesign,
  onSelectDesign,
  onClose,
}: SubpageDesignModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-80 flex flex-col overflow-hidden bg-[#0F172A]/85 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="mx-auto flex w-full max-w-[1440px] shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 sm:px-6 lg:px-8 py-3">
        <button
          type="button"
          onClick={onClose}
          className="font-arcade inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.05] px-3.5 py-2 text-xs tracking-wider text-white uppercase transition hover:bg-white/15 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>ZURÜCK</span>
        </button>

        <div className="flex items-center gap-2 border-b-2 border-[#F59E0B] pb-0.5">
          <Layers className="h-4 w-4 text-[#FBBF24]" />
          <span className="font-arcade text-sm sm:text-xl tracking-wider text-white uppercase">
            {contextTitle} <span className="text-[#FBBF24]">DESIGNS</span>
          </span>
        </div>

        <span className="hidden sm:block font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
          5 DESIGNARTEN
        </span>
      </div>

      <div className="no-scrollbar mx-auto w-full max-w-5xl flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
        <p className="mb-5 text-xs sm:text-sm text-[#CBD5E1]">
          Wähle eine Designart für <span className="text-white font-semibold">{contextTitle}</span>. Deine Auswahl wird direkt live übernommen.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-6">
          {SUBPAGE_DESIGN_OPTIONS.map((option) => {
            const isSelected = option.id === activeDesign;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelectDesign(option.id);
                  onClose();
                }}
                className={`group flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? 'border-[#F59E0B] bg-[#F59E0B]/10 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                    : 'border-white/15 bg-white/[0.04] hover:border-white/35 hover:bg-white/[0.08]'
                }`}
              >
                <DesignWireframe designId={option.id} active={isSelected} />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-arcade text-sm sm:text-base tracking-wider text-white uppercase">
                      {option.title}
                    </h3>
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
