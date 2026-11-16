import { ArrowLeft, Check, Layers } from 'lucide-react';

export type LobbyLayoutId =
  | 'lobby-open-cinema'
  | 'lobby-open-stage'
  | 'lobby-open-asymmetric'
  | 'lobby-open-backdrop'
  | 'lobby-open-cockpit'
  | 'lobby-open-editorial'
  | 'lobby-open-bottom-dock'
  | 'lobby-open-minimal';

export interface LobbyLayoutOption {
  id: LobbyLayoutId;
  title: string;
  description: string;
}

export const LOBBY_LAYOUT_OPTIONS: LobbyLayoutOption[] = [
  {
    id: 'lobby-open-cinema',
    title: 'Kino-Panorama',
    description:
      'Nutzt die volle Breite: Links großes schwebendes Spiel-Artwork, rechts offenes Setup.',
  },
  {
    id: 'lobby-open-stage',
    title: 'Vollbreite Bühne',
    description:
      'Streckt Kopfzeile, breite Unterstrich-Eingabe und Start-Aktion über die gesamte Bildschirmhöhe.',
  },
  {
    id: 'lobby-open-asymmetric',
    title: 'Asymmetrisches Studio',
    description:
      'Schlanke offene Info-Spalte links mit Haarlinie, rechts großzügige Setup-Fläche.',
  },
  {
    id: 'lobby-open-backdrop',
    title: 'Atmosphärisches Vollbild',
    description:
      'Das Spiel-Artwork verschmilzt weich mit dem gesamten Hintergrund, Steuerung schwebt frei darüber.',
  },
  {
    id: 'lobby-open-cockpit',
    title: '3-Zonen-Cockpit',
    description:
      'Drei offene Spalten nebeneinander über den ganzen Bildschirm: Spielinfo, Raumname & Start.',
  },
  {
    id: 'lobby-open-bottom-dock',
    title: 'Bühne + Bottom-Leiste',
    description:
      'Oben viel Raum für Spiel & Artwork, unten eine durchgängige offene Steuerleiste.',
  },
  {
    id: 'lobby-open-editorial',
    title: 'Editorial Vollbild',
    description:
      'Großformatige Magazin-Typografie über die volle Breite mit offener Eingabezeile.',
  },
  {
    id: 'lobby-open-minimal',
    title: 'Zen-Fokus',
    description:
      'Extra breites, zentriertes Eingabefeld mit maximalem Freiraum über den ganzen Screen.',
  },
];

function LobbyWireframe({ layoutId, active }: { layoutId: LobbyLayoutId; active: boolean }) {
  const accent = active ? 'bg-[#F59E0B]' : 'bg-[#F59E0B]/70';
  const line = 'bg-white/25';
  const soft = 'bg-white/12';

  if (layoutId === 'lobby-open-cinema') {
    return (
      <div className="grid h-20 w-full grid-cols-[1.2fr_1fr] items-center gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className={`h-full rounded-lg ${soft}`} />
        <div className="flex flex-col justify-between gap-2 py-1">
          <div className="h-2.5 w-full border-b border-white/40" />
          <div className="flex gap-1.5">
            <div className={`h-1.5 w-7 rounded-full ${accent}`} />
            <div className={`h-1.5 w-7 rounded-full ${line}`} />
          </div>
          <div className="h-3.5 w-full rounded-md bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-stage') {
    return (
      <div className="flex h-20 w-full flex-col justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex items-center justify-between border-b border-white/15 pb-1">
          <div className="h-2 w-16 rounded-sm bg-white/80" />
          <div className={`h-1.5 w-10 rounded-full ${line}`} />
        </div>
        <div className="h-2.5 w-full border-b-2 border-[#F59E0B]/70" />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className={`h-1.5 w-8 rounded-full ${accent}`} />
            <div className={`h-1.5 w-8 rounded-full ${line}`} />
          </div>
          <div className="h-3 w-16 rounded-md bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-asymmetric') {
    return (
      <div className="grid h-20 w-full grid-cols-[0.75fr_1.4fr] gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-col justify-between border-r border-white/15 pr-2">
          <div className="h-2.5 w-full rounded-sm bg-white/75" />
          <div className={`h-1.5 w-10 rounded-full ${accent}`} />
          <div className={`h-6 w-full rounded-md ${soft}`} />
        </div>
        <div className="flex flex-col justify-center gap-2">
          <div className="h-2.5 w-full border-b border-white/40" />
          <div className="flex items-center justify-between">
            <div className={`h-1.5 w-12 rounded-full ${accent}`} />
            <div className="h-3.5 w-14 rounded-md bg-[#10B981]/80" />
          </div>
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-backdrop') {
    return (
      <div className="relative flex h-20 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/12 bg-gradient-to-br from-[#6366F1]/25 via-[#0F172A]/80 to-[#F59E0B]/20 p-2.5">
        <div className="h-2.5 w-20 rounded-sm bg-white/80" />
        <div className="h-2.5 w-36 border-b border-white/50" />
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-8 rounded-full ${accent}`} />
          <div className="h-3.5 w-16 rounded-md bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-cockpit') {
    return (
      <div className="grid h-20 w-full grid-cols-3 items-center gap-2 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex h-full flex-col justify-center gap-1 border-r border-white/15 pr-1.5">
          <div className={`h-7 w-full rounded-md ${soft}`} />
          <div className="h-1.5 w-10 rounded-full bg-white/60" />
        </div>
        <div className="flex h-full flex-col justify-center gap-1 border-r border-white/15 pr-1.5">
          <div className="h-2.5 w-full border-b border-white/40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className={`h-1.5 w-full rounded-full ${accent}`} />
          <div className="h-3.5 w-full rounded-md bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-bottom-dock') {
    return (
      <div className="flex h-20 w-full flex-col justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-1 items-center gap-2 pb-1.5">
          <div className={`h-full w-16 rounded-md ${soft}`} />
          <div className="flex flex-col gap-1">
            <div className="h-2.5 w-20 rounded-sm bg-white/80" />
            <div className={`h-1.5 w-14 rounded-full ${line}`} />
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-white/15 pt-1.5">
          <div className="h-2 flex-1 border-b border-white/40" />
          <div className={`h-2 w-8 rounded-full ${accent}`} />
          <div className="h-3 w-12 rounded-md bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (layoutId === 'lobby-open-editorial') {
    return (
      <div className="flex h-20 w-full flex-col justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex items-end justify-between border-b border-white/15 pb-1.5">
          <div className="flex flex-col gap-1">
            <div className="h-2.5 w-24 rounded-sm bg-white/80" />
            <div className={`h-0.5 w-16 rounded-full ${accent}`} />
          </div>
          <div className={`h-1.5 w-12 rounded-full ${line}`} />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="h-2.5 flex-1 border-b border-white/40" />
          <div className={`h-1.5 w-10 rounded-full ${accent}`} />
          <div className="h-3.5 w-16 rounded-md bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  // lobby-open-minimal
  return (
    <div className="flex h-20 w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
      <div className="h-3 w-40 border-b-2 border-[#F59E0B]/75" />
      <div className="flex items-center gap-3">
        <div className={`h-1.5 w-9 rounded-full ${accent}`} />
        <div className={`h-1.5 w-9 rounded-full ${line}`} />
      </div>
      <div className="h-3.5 w-28 rounded-full bg-[#10B981]/80" />
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
            OFFENE <span className="text-[#FBBF24]">VOLLBILD-DESIGNS</span>
          </span>
        </div>

        <span className="hidden sm:block font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
          8 OFFENE VARIANTEN
        </span>
      </div>

      <div className="no-scrollbar mx-auto w-full max-w-[1440px] flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5">
        <p className="mb-5 text-xs sm:text-sm text-[#CBD5E1]">
          Alle 8 Lobby-Designs sind komplett offen, rahmenlos und nutzen die gesamte Bildschirmfläche.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pb-6">
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
                    <h3 className="font-arcade text-sm tracking-wider text-white uppercase">
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
