import { Check, Columns2, LayoutGrid, List, Sparkles } from 'lucide-react';
import { type CrystalAccent } from '../data/games';
import { CrystalButton, CrystalPanel } from './CrystalUI';
import { IslandBackground } from './IslandBackground';

export type MenuLayoutVariant = 'carousel' | 'grid' | 'sidebar' | 'compact';

export interface LayoutVariantMeta {
  id: MenuLayoutVariant;
  title: string;
  tag: string;
  description: string;
  accent: CrystalAccent;
  icon: typeof Sparkles;
}

export const MENU_LAYOUT_VARIANTS: LayoutVariantMeta[] = [
  {
    id: 'carousel',
    title: 'CLASSIC KARUSSELL',
    tag: 'STANDARD',
    description: 'Fokus auf die mittlere Spielkarte mit seitlicher Vorschau und Pfeil-Navigation.',
    accent: 'indigo',
    icon: Sparkles,
  },
  {
    id: 'grid',
    title: 'ARCADE GRID',
    tag: 'ÜBERSICHT',
    description: 'Alle Spiele gleichzeitig im klaren Mehrspalten-Raster für schnellen Überblick.',
    accent: 'amber',
    icon: LayoutGrid,
  },
  {
    id: 'sidebar',
    title: 'COMMAND CENTER',
    tag: 'SPLIT-VIEW',
    description: 'Filter & Spiel-Liste links in der Seitenleiste, große Hero-Bühne rechts.',
    accent: 'emerald',
    icon: Columns2,
  },
  {
    id: 'compact',
    title: 'QUICK-LAUNCH LISTE',
    tag: 'KOMPAKT',
    description: 'Platzsparende Crystal-Zeilen mit direktem Play- & TV-Start auf einen Blick.',
    accent: 'rose',
    icon: List,
  },
];

interface LayoutExplorerModalProps {
  activeLayout: MenuLayoutVariant;
  onSelectLayout: (variant: MenuLayoutVariant) => void;
  onClose: () => void;
}

/**
 * Design-Explorations-Ansicht zum Live-Testen und Vergleichen verschiedener
 * Hauptmenü-Layouts im einheitlichen Crystal-UI-Design.
 */
export function LayoutExplorerModal({
  activeLayout,
  onSelectLayout,
  onClose,
}: LayoutExplorerModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hauptmenü Design-Varianten"
      className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-[#1B2B40] text-[#1E293B] select-none animate-fade-in"
    >
      <IslandBackground />

      <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-y-auto overflow-x-hidden">
        <header className="tablet-header flex shrink-0 items-center justify-between gap-2 pb-2">
          <CrystalButton size="sm" variant="secondary" tilt="left" onClick={onClose}>
            ZURÜCK
          </CrystalButton>

          <div
            style={{ clipPath: 'polygon(2% 0%, 100% 4%, 98% 100%, 0% 96%)' }}
            className="bg-[#0F172A] px-3 py-1 border-2 border-[#38BDF8]/60 shadow-md"
          >
            <span className="font-arcade text-[11px] sm:text-xs tracking-wider text-[#E0F2FE] uppercase">
              LAYOUT-EXPLORER
            </span>
          </div>
        </header>

        <main className="mx-auto my-auto flex w-full max-w-4xl flex-col items-center justify-center py-2 sm:py-4">
          <CrystalPanel
            topTabLabel="DESIGN-EXPLORATION"
            title="HAUPTMENÜ-VARIANTEN"
            accent="indigo"
            className="w-full"
            contentClassName="gap-3 sm:gap-4 py-4 px-3.5 sm:py-6 sm:px-6"
          >
            <p className="text-center text-xs sm:text-sm font-semibold text-[#475569] max-w-xl">
              Wähle eine Layout-Variante, um unterschiedliche Darstellungen für das Hauptmenü direkt live zu testen und zu vergleichen.
            </p>

            <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {MENU_LAYOUT_VARIANTS.map((variant) => {
                const isSelected = activeLayout === variant.id;
                const Icon = variant.icon;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onSelectLayout(variant.id)}
                    style={{ clipPath: 'polygon(1% 2%, 99% 0%, 99% 98%, 1% 100%)' }}
                    className={`group relative flex flex-col justify-between gap-2.5 border-[3px] p-3.5 sm:p-4 text-left transition-all cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? 'bg-[#4F46E5] border-[#312E81] text-white shadow-[inset_0_2px_0_#A5B4FC,0_5px_0_rgba(15,23,42,0.3)]'
                        : 'bg-[#F8FAFC] hover:bg-[#FFFFFF] border-[#334155] text-[#1E293B] shadow-[inset_0_2px_0_#FFFFFF,0_4px_0_rgba(15,23,42,0.18)] hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 ${
                            isSelected
                              ? 'bg-[#312E81] border-[#A5B4FC] text-[#FDE68A]'
                              : 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5]'
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5 stroke-[2.3]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-arcade text-sm sm:text-base tracking-wide uppercase truncate">
                            {variant.title}
                          </span>
                          <span
                            className={`font-arcade text-[10px] tracking-wider uppercase ${
                              isSelected ? 'text-[#C7D2FE]' : 'text-[#64748B]'
                            }`}
                          >
                            {variant.tag}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="inline-flex items-center gap-1 bg-[#10B981] border-2 border-[#064E3B] px-2 py-0.5 font-arcade text-[10px] text-white uppercase shrink-0">
                          <Check className="h-3 w-3 stroke-[3]" />
                          AKTIV
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs leading-relaxed font-medium ${
                        isSelected ? 'text-[#E0E7FF]' : 'text-[#475569]'
                      }`}
                    >
                      {variant.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </CrystalPanel>
        </main>
      </div>
    </div>
  );
}
