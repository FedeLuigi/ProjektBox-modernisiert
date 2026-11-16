import { ArrowLeft, Check, Layers } from 'lucide-react';

export type LobbyLayoutId =
  | 'lobby-open'
  | 'lobby-open-split'
  | 'lobby-open-editorial'
  | 'lobby-open-inline'
  | 'lobby-open-minimal';

export interface LobbyLayoutOption {
  id: LobbyLayoutId;
  title: string;
  description: string;
}

export const LOBBY_LAYOUT_OPTIONS: LobbyLayoutOption[] = [
  {
    id: 'lobby-open',
    title: 'Offene Bühne (Klassik)',
    description:
      'Zentriert und komplett rahmenlos über dem Hintergrund mit Unterstrich-Eingabe und Modus-Tabs.',
  },
  {
    id: 'lobby-open-split',
    title: 'Offene Bühne (Split)',
    description:
      'Links frei schwebendes Spiel-Artwork, rechts das rahmenlose Setup mit Unterstrich-Elementen.',
  },
  {
    id: 'lobby-open-editorial',
    title: 'Offene Bühne (Editorial)',
    description:
      'Großzügige linksbündige Typografie mit feiner Haarlinie und zweispaltiger Steuerung.',
  },
  {
    id: 'lobby-open-inline',
    title: 'Offene Bühne (Inline)',
    description:
      'Alle Eingaben und der Start-Button schweben ohne Rahmen nebeneinander in einer offenen Zeile.',
  },
  {
    id: 'lobby-open-minimal',
    title: 'Offene Bühne (Fokus)',
    description:
      'Maximal reduziert auf das große Raum-Eingabefeld in der Mitte mit viel freiem Raum.',
  },
];

function LobbyWireframe({ layoutId, active }: { layoutId: LobbyLayoutId; active: boolean }) {
  const accent = active ? 'bg-[#F59E0B]' : 'bg-[#F59E0B]/70';
  const line = 'bg-white/25';

  if (layoutId === 'lobby-open-split') {
    return (
      <div className="grid h-20 w-full grid-cols-2 items-center gap-3 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-col gap-1.5">
          <div className="h-10 w-full rounded-lg bg-white/12" />
          <div className="h-2 w-14 rounded-full bg-white/60" />
        </div>
        <div className="flex flex-col justify-between gap-2">
          <div className="h-2.5 w-full border-b border-white/40" />
          <div className="flex gap-2 border-b border-white/15 pb-1">
            <div className={`h-1.5 w-8 rounded-full ${accent}`} />
            <div className={`h-1.5 w-8 rounded-full ${line}`} />
          </div>
          <div className="h-3.5 w-full rounded-lg bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-editorial') {
    return (
      <div className="flex h-20 w-full flex-col justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex items-end justify-between border-b border-white/15 pb-1.5">
          <div className="flex flex-col gap-1">
            <div className="h-2.5 w-20 rounded-sm bg-white/80" />
            <div className={`h-0.5 w-14 rounded-full ${accent}`} />
          </div>
          <div className={`h-1.5 w-10 rounded-full ${line}`} />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="h-2.5 flex-1 border-b border-white/40" />
          <div className="flex gap-1.5 pb-0.5">
            <div className={`h-1.5 w-6 rounded-full ${accent}`} />
            <div className={`h-1.5 w-6 rounded-full ${line}`} />
          </div>
          <div className="h-3.5 w-14 rounded-lg bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-inline') {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-center gap-3 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-col items-center gap-0.5">
          <div className="h-2 w-16 rounded-sm bg-white/80" />
          <div className={`h-0.5 w-12 rounded-full ${accent}`} />
        </div>
        <div className="flex w-full items-center gap-2 border-b border-white/15 pb-2">
          <div className="h-2.5 flex-1 border-b border-white/40" />
          <div className={`h-2 w-7 rounded-full ${accent}`} />
          <div className={`h-2 w-7 rounded-full ${line}`} />
          <div className="h-3.5 w-12 rounded-lg bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-minimal') {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="h-3 w-36 border-b-2 border-[#F59E0B]/75" />
        <div className="flex items-center gap-3">
          <div className={`h-1.5 w-9 rounded-full ${accent}`} />
          <div className={`h-1.5 w-9 rounded-full ${line}`} />
        </div>
        <div className="h-3.5 w-24 rounded-full bg-[#10B981]/80" />
      </div>
    );
  }

  // lobby-open
  return (
    <div className="flex h-20 w-full flex-col items-center justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
      <div className="flex flex-col items-center gap-0.5">
        <div className="h-2.5 w-16 rounded-sm bg-white/80" />
        <div className={`h-0.5 w-14 rounded-full ${accent}`} />
      </div>
      <div className="h-2.5 w-32 border-b border-white/40" />
      <div className="flex w-32 items-center justify-between gap-2">
        <div className={`h-2 w-12 rounded-full ${accent}`} />
        <div className={`h-2 w-12 rounded-full ${line}`} />
      </div>
      <div className="h-3.5 w-28 rounded-lg bg-[#10B981]/80" />
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
            OFFENE <span className="text-[#FBBF24]">LOBBY-DESIGNS</span>
          </span>
        </div>

        <span className="hidden sm:block font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
          RAHMENLOS & OFFEN
        </span>
      </div>

      <div className="no-scrollbar mx-auto w-full max-w-5xl flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
        <p className="mb-5 text-xs sm:text-sm text-[#CBD5E1]">
          Wähle eine offene, rahmenlose Lobby-Variante. Alle Layouts schweben frei über dem Hintergrund ohne schwere Kartenrahmen.
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
