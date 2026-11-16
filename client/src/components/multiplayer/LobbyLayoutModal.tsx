import { ArrowLeft, Check, Layers } from 'lucide-react';

export type LobbyLayoutId =
  | 'lobby-open-stage'
  | 'lobby-open-hero-top'
  | 'lobby-open-reversed'
  | 'lobby-open-columns'
  | 'lobby-open-docked';

export interface LobbyLayoutOption {
  id: LobbyLayoutId;
  title: string;
  description: string;
}

export const LOBBY_LAYOUT_OPTIONS: LobbyLayoutOption[] = [
  {
    id: 'lobby-open-stage',
    title: 'Offene Bühne (Klassik)',
    description:
      'Links großer Titel, Modus, Code & großer QR-Code; rechts Optionen, Spieler & Start mit feiner Haarlinie.',
  },
  {
    id: 'lobby-open-hero-top',
    title: 'Offene Bühne (Titel oben)',
    description:
      'Großformatiger Titel & Modus-Tabs oben über die volle Breite, darunter extragroßer QR-Code & Setup.',
  },
  {
    id: 'lobby-open-reversed',
    title: 'Offene Bühne (Gespiegelt)',
    description:
      'Links Titel, Optionen, Spieler & Start; rechts der große QR-Code & Einladungslink.',
  },
  {
    id: 'lobby-open-columns',
    title: 'Offene Bühne (3-Spalten)',
    description:
      'Drei offene Spalten nebeneinander: Titel & Start links, großer QR-Code mittig, Optionen & Spieler rechts.',
  },
  {
    id: 'lobby-open-docked',
    title: 'Offene Bühne (Bottom-Leiste)',
    description:
      'Großer Titel & QR-Code oben im Fokus, Moduswechsel und Start-Button als offene Leiste unten.',
  },
];

function LobbyWireframe({ layoutId, active }: { layoutId: LobbyLayoutId; active: boolean }) {
  const accent = active ? 'bg-[#F59E0B]' : 'bg-[#F59E0B]/70';
  const soft = 'bg-white/12';

  if (layoutId === 'lobby-open-hero-top') {
    return (
      <div className="flex h-20 w-full flex-col justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex items-center justify-between border-b border-white/15 pb-1">
          <div className={`h-2.5 w-16 rounded-sm bg-white/80`} />
          <div className={`h-1.5 w-10 rounded-full ${accent}`} />
        </div>
        <div className="grid flex-1 grid-cols-2 items-center gap-2 pt-1.5">
          <div className="flex items-center justify-center">
            <div className="h-9 w-9 rounded-sm bg-white/85" />
          </div>
          <div className="flex flex-col justify-between gap-1">
            <div className={`h-2.5 w-full rounded-sm ${soft}`} />
            <div className={`h-3 w-full rounded-sm ${soft}`} />
            <div className="h-2.5 w-full rounded-sm bg-[#10B981]/80" />
          </div>
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-reversed') {
    return (
      <div className="grid h-20 w-full grid-cols-2 gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-col justify-between gap-1 border-r border-white/15 pr-2">
          <div className="h-2.5 w-14 rounded-sm bg-white/80" />
          <div className={`h-4 w-full rounded-sm ${soft}`} />
          <div className="h-3 w-full rounded-sm bg-[#10B981]/80" />
        </div>
        <div className="flex flex-col items-center justify-between">
          <div className={`h-2 w-12 rounded-full ${accent}`} />
          <div className="h-9 w-9 rounded-sm bg-white/85" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-columns') {
    return (
      <div className="grid h-20 w-full grid-cols-3 gap-2 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-col justify-between border-r border-white/15 pr-1.5">
          <div className="h-2.5 w-full rounded-sm bg-white/80" />
          <div className={`h-1.5 w-8 rounded-full ${accent}`} />
          <div className="h-3 w-full rounded-sm bg-[#10B981]/80" />
        </div>
        <div className="flex flex-col items-center justify-center border-r border-white/15 pr-1.5">
          <div className="h-9 w-9 rounded-sm bg-white/85" />
        </div>
        <div className="flex flex-col justify-between gap-1">
          <div className={`h-3 w-full rounded-sm ${soft}`} />
          <div className={`h-7 w-full rounded-sm ${soft}`} />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-docked') {
    return (
      <div className="flex h-20 w-full flex-col justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="grid flex-1 grid-cols-2 items-center gap-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-sm bg-white/85" />
            <div className="h-2.5 w-10 rounded-sm bg-white/80" />
          </div>
          <div className={`h-8 rounded-sm ${soft}`} />
        </div>
        <div className="flex items-center justify-between border-t border-white/15 pt-1">
          <div className={`h-1.5 w-12 rounded-full ${accent}`} />
          <div className="h-2.5 w-14 rounded-sm bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  // lobby-open-stage
  return (
    <div className="grid h-20 w-full grid-cols-2 gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
      <div className="flex flex-col items-center justify-between border-r border-white/15 pr-2">
        <div className="h-2.5 w-14 rounded-sm bg-white/80" />
        <div className="h-9 w-9 rounded-sm bg-white/85" />
      </div>
      <div className="flex flex-col justify-between gap-1">
        <div className={`h-2.5 w-full rounded-sm ${soft}`} />
        <div className={`h-4 w-full rounded-sm ${soft}`} />
        <div className="h-3 w-full rounded-sm bg-[#10B981]/80" />
      </div>
    </div>
  );
}

interface LobbyLayoutModalProps {
  isOpen: boolean;
  activeLayout: LobbyLayoutId;
  onSelectLayout: (layout: LobbyLayoutId) => void;
  onClose: () => void;
}

export function LobbyLayoutModal({
  isOpen,
  activeLayout,
  onSelectLayout,
  onClose,
}: LobbyLayoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex flex-col overflow-hidden bg-[#0F172A]/80 backdrop-blur-md animate-fade-in">
      <div className="mx-auto flex w-full max-w-[1440px] shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 sm:px-6 lg:px-8 py-3">
        <button
          type="button"
          onClick={onClose}
          className="font-arcade inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.05] px-3.5 py-2 text-xs tracking-wider text-white uppercase transition hover:bg-white/15 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>ZURÜCK</span>
        </button>

        <div className="flex items-center gap-2 border-b-2 border-[#F59E0B] pb-0.5 select-none">
          <Layers className="h-4 w-4 text-[#FBBF24]" />
          <span className="font-arcade text-base sm:text-xl tracking-wider text-white uppercase">
            OFFENE BÜHNE <span className="text-[#FBBF24]">LAYOUTS</span>
          </span>
        </div>

        <span className="hidden sm:block font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
          5 OFFENE VARIANTEN
        </span>
      </div>

      <div className="no-scrollbar mx-auto w-full max-w-5xl flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
        <p className="mb-5 text-xs sm:text-sm text-[#CBD5E1]">
          Alle 5 Layouts basieren auf dem offenen, rahmenlosen „Offene Bühne“-Design mit großem Titel und großem QR-Code.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-6">
          {LOBBY_LAYOUT_OPTIONS.map((option) => {
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
                <LobbyWireframe layoutId={option.id} active={isSelected} />

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
