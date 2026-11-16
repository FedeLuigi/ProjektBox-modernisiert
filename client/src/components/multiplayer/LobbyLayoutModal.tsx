import { ArrowLeft, Check, Layers } from 'lucide-react';

export type LobbyLayoutId =
  | 'lobby-open-stage'
  | 'lobby-split-showcase'
  | 'lobby-editorial-grid'
  | 'lobby-bottom-action'
  | 'lobby-glass-panels'
  | 'lobby-compact-tv';

export interface LobbyLayoutOption {
  id: LobbyLayoutId;
  title: string;
  description: string;
}

export const LOBBY_LAYOUT_OPTIONS: LobbyLayoutOption[] = [
  {
    id: 'lobby-open-stage',
    title: 'Offene Bühne (2-Spalten)',
    description:
      'Komplett rahmenlos mit Haarlinie: Links Code, QR & Modus, rechts Optionen, Spieler & Start.',
  },
  {
    id: 'lobby-split-showcase',
    title: 'Split-Showcase',
    description:
      'Links Spiel-Artwork mit Code & QR, rechts Spielmodus, Einstellungen, Spieler und Start.',
  },
  {
    id: 'lobby-editorial-grid',
    title: 'Editorial 3-Zonen',
    description:
      'Kopfzeile mit Modus & Start-Button oben, darunter drei offene Spalten für QR, Optionen & Spieler.',
  },
  {
    id: 'lobby-bottom-action',
    title: 'Bühne + Bottom-Leiste',
    description:
      'Oben QR-Code & Spielerliste, unten eine durchgängige offene Leiste für Modus & Start.',
  },
  {
    id: 'lobby-glass-panels',
    title: 'Schwebende Glas-Panels',
    description:
      'Zwei ausgewogene dunkle Glas-Karten für Einladung/QR links und Optionen/Spieler rechts.',
  },
  {
    id: 'lobby-compact-tv',
    title: 'Kino / TV-Fokus',
    description:
      'Großer QR-Code und prominenter Lobby-Code im Fokus, Spieler und Start klar strukturiert.',
  },
];

function LobbyWireframe({ layoutId, active }: { layoutId: LobbyLayoutId; active: boolean }) {
  const accent = active ? 'bg-[#F59E0B]' : 'bg-[#F59E0B]/70';
  const line = 'bg-white/25';
  const soft = 'bg-white/12';

  if (layoutId === 'lobby-split-showcase') {
    return (
      <div className="grid h-20 w-full grid-cols-2 gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-col justify-between gap-1.5">
          <div className={`h-7 w-full rounded-md ${soft}`} />
          <div className="flex items-center gap-1.5">
            <div className={`h-5 w-5 rounded-sm bg-white/75`} />
            <div className={`h-2.5 flex-1 rounded-sm ${accent}`} />
          </div>
        </div>
        <div className="flex flex-col justify-between gap-1">
          <div className={`h-2 w-full rounded-sm ${line}`} />
          <div className={`h-3 w-full rounded-sm ${soft}`} />
          <div className={`h-3 w-full rounded-sm ${soft}`} />
          <div className="h-3 w-full rounded-sm bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-editorial-grid') {
    return (
      <div className="flex h-20 w-full flex-col justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex items-center justify-between border-b border-white/15 pb-1">
          <div className={`h-2 w-12 rounded-full ${accent}`} />
          <div className="h-2.5 w-12 rounded-sm bg-[#10B981]/80" />
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1.5 pt-1.5">
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-bottom-action') {
    return (
      <div className="flex h-20 w-full flex-col justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="grid flex-1 grid-cols-2 gap-2 pb-1.5">
          <div className={`rounded-md ${soft}`} />
          <div className={`rounded-md ${soft}`} />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/15 pt-1.5">
          <div className={`h-2 w-14 rounded-full ${accent}`} />
          <div className="h-3 w-16 rounded-md bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-glass-panels') {
    return (
      <div className="grid h-20 w-full grid-cols-2 gap-2 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-col items-center justify-between rounded-lg border border-white/15 bg-white/[0.06] p-1.5">
          <div className={`h-2 w-10 rounded-sm ${accent}`} />
          <div className="h-7 w-7 rounded-sm bg-white/80" />
        </div>
        <div className="flex flex-col justify-between rounded-lg border border-white/15 bg-white/[0.06] p-1.5">
          <div className={`h-2 w-full rounded-sm ${soft}`} />
          <div className={`h-3 w-full rounded-sm ${soft}`} />
          <div className="h-2.5 w-full rounded-sm bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-compact-tv') {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-sm bg-white/80" />
          <div className={`h-3 w-14 rounded-sm ${accent}`} />
        </div>
        <div className="flex w-full gap-1.5">
          <div className={`h-2.5 flex-1 rounded-sm ${soft}`} />
          <div className={`h-2.5 flex-1 rounded-sm ${soft}`} />
        </div>
        <div className="h-3 w-28 rounded-md bg-[#10B981]/80" />
      </div>
    );
  }

  // lobby-open-stage
  return (
    <div className="grid h-20 w-full grid-cols-2 gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
      <div className="flex flex-col items-center justify-between border-r border-white/15 pr-2">
        <div className={`h-2 w-12 rounded-sm ${accent}`} />
        <div className="h-8 w-8 rounded-sm bg-white/80" />
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
            LOBBY <span className="text-[#FBBF24]">LAYOUTS</span>
          </span>
        </div>

        <span className="hidden sm:block font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
          6 DESIGN- & LAYOUTARTEN
        </span>
      </div>

      <div className="no-scrollbar mx-auto w-full max-w-5xl flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
        <p className="mb-5 text-xs sm:text-sm text-[#CBD5E1]">
          Wähle eine Anordnung für die vereinte Lobby-Seite. Zurück-Button und Verbindungsstatus oben bleiben unverändert.
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
