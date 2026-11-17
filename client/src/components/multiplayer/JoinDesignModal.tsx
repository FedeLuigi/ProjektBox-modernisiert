import { ArrowLeft, Check, Layers } from 'lucide-react';

export type JoinDesignId =
  | 'join-open-stage'
  | 'join-split-portal'
  | 'join-pin-slots'
  | 'join-hero-qr'
  | 'join-editorial-bar'
  | 'join-floating-pill';

export interface JoinDesignOption {
  id: JoinDesignId;
  title: string;
  description: string;
}

export const JOIN_DESIGN_OPTIONS: JoinDesignOption[] = [
  {
    id: 'join-open-stage',
    title: 'Offene Bühne (Klassik)',
    description:
      'Zentrierte Unterstrich-Eingabe, Beitritts-Button und großes QR-Symbol darunter.',
  },
  {
    id: 'join-split-portal',
    title: 'Dual-Portal (2-Spalten)',
    description:
      'Code-Eingabe links und großes QR-Scanner-Portal rechts gleichberechtigt nebeneinander.',
  },
  {
    id: 'join-pin-slots',
    title: '5-Slot Code-Bühne',
    description:
      'Fünf einzelne Unterstrich-Felder für jeden Code-Buchstaben plus QR-Leiste darunter.',
  },
  {
    id: 'join-hero-qr',
    title: 'QR-Fokus (Kamera zuerst)',
    description:
      'Großes Scanner-Symbol mit Eck-Rahmen im Mittelpunkt, kompakte Code-Zeile darunter.',
  },
  {
    id: 'join-editorial-bar',
    title: 'Editorial Breitbild',
    description:
      'Große linksbündige Überschrift mit durchgängiger horizontaler Eingabe- und QR-Zeile.',
  },
  {
    id: 'join-floating-pill',
    title: 'Schwebende Glas-Leiste',
    description:
      'Eingabe, Beitreten und QR-Icon verschmolzen in einer schlanken schwebenden Glas-Leiste.',
  },
];

function JoinWireframe({ designId, active }: { designId: JoinDesignId; active: boolean }) {
  const accent = active ? 'bg-[#F59E0B]' : 'bg-[#F59E0B]/70';
  const soft = 'bg-white/12';

  if (designId === 'join-split-portal') {
    return (
      <div className="grid h-20 w-full grid-cols-2 items-center gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="flex flex-col justify-between gap-2 border-r border-white/15 pr-2">
          <div className="h-2.5 w-full border-b border-white/40" />
          <div className="h-3.5 w-full rounded-md bg-[#10B981]/80" />
        </div>
        <div className="flex flex-col items-center justify-center gap-1">
          <div className={`h-9 w-9 rounded-xl border border-[#F59E0B]/60 ${soft}`} />
        </div>
      </div>
    );
  }

  if (designId === 'join-pin-slots') {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className={`h-1.5 w-14 rounded-full ${accent}`} />
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((slot) => (
            <div key={slot} className="h-4 w-4 border-b-2 border-white/45" />
          ))}
        </div>
        <div className="flex w-28 items-center gap-1.5">
          <div className="h-3 flex-1 rounded-md bg-[#10B981]/80" />
          <div className={`h-3 w-5 rounded-md ${soft}`} />
        </div>
      </div>
    );
  }

  if (designId === 'join-hero-qr') {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className={`h-9 w-9 rounded-xl border-2 border-[#F59E0B]/70 ${soft}`} />
        <div className="flex w-32 items-center gap-1.5 border-t border-white/15 pt-1.5">
          <div className="h-2.5 flex-1 border-b border-white/40" />
          <div className="h-3 w-10 rounded-md bg-[#10B981]/80" />
        </div>
      </div>
    );
  }

  if (designId === 'join-editorial-bar') {
    return (
      <div className="flex h-20 w-full flex-col justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className="border-b border-white/15 pb-1">
          <div className="h-2.5 w-20 rounded-sm bg-white/80" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 flex-1 border-b border-white/40" />
          <div className="h-3.5 w-12 rounded-md bg-[#10B981]/80" />
          <div className={`h-3.5 w-5 rounded-md ${accent}`} />
        </div>
      </div>
    );
  }

  if (designId === 'join-floating-pill') {
    return (
      <div className="flex h-20 w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
        <div className={`h-1.5 w-14 rounded-full ${accent}`} />
        <div className="flex w-full items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.07] px-2 py-1.5">
          <div className="h-2.5 flex-1 rounded-full bg-white/15" />
          <div className="h-3.5 w-10 rounded-full bg-[#10B981]/80" />
          <div className={`h-3.5 w-3.5 rounded-full ${accent}`} />
        </div>
      </div>
    );
  }

  // join-open-stage
  return (
    <div className="flex h-20 w-full flex-col items-center justify-between rounded-xl border border-white/12 bg-[#0F172A]/65 p-2.5">
      <div className={`h-1.5 w-14 rounded-full ${accent}`} />
      <div className="h-2.5 w-28 border-b border-white/40" />
      <div className="h-3 w-20 rounded-md bg-[#10B981]/80" />
      <div className={`h-3 w-8 rounded-md ${soft}`} />
    </div>
  );
}

interface JoinDesignModalProps {
  isOpen: boolean;
  activeDesign: JoinDesignId;
  onSelectDesign: (design: JoinDesignId) => void;
  onClose: () => void;
}

export function JoinDesignModal({
  isOpen,
  activeDesign,
  onSelectDesign,
  onClose,
}: JoinDesignModalProps) {
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
            LOBBY BEITRETEN <span className="text-[#FBBF24]">DESIGNS</span>
          </span>
        </div>

        <span className="hidden sm:block font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
          6 OFFENE VARIANTEN
        </span>
      </div>

      <div className="no-scrollbar mx-auto w-full max-w-5xl flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
        <p className="mb-5 text-xs sm:text-sm text-[#CBD5E1]">
          Wähle eine kreative Anordnung für „Lobby beitreten“ – alle basieren auf dem offenen Bühnen-Design.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-6">
          {JOIN_DESIGN_OPTIONS.map((option) => {
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
                <JoinWireframe designId={option.id} active={isSelected} />

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
