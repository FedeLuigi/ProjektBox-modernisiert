import { useState } from 'react';
import { ArrowLeft, Download, SlidersHorizontal, Volume2, VolumeX, Vibrate, X } from 'lucide-react';
import { OpenButton, OpenModalFrame } from './OpenSubpageUI';
import {
  PlusDesignButton,
  SUBPAGE_DESIGN_OPTIONS,
  SubpageDesignModal,
  type SubpageDesignId,
} from './SubpageDesignModal';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  onToggleVibration: (enabled: boolean) => void;
  onInstall?: () => void;
}

function SettingToggleRow({
  label,
  description,
  enabled,
  onToggle,
  icon,
  frameless = false,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  icon: React.ReactNode;
  frameless?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className={`flex w-full items-center justify-between gap-3 text-left transition-colors cursor-pointer active:scale-[0.99] ${
        frameless
          ? 'border-b border-white/15 py-3.5 hover:border-white/30'
          : 'rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 hover:border-white/25 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            enabled
              ? 'border-[#F59E0B]/60 bg-[#F59E0B]/15 text-[#FDE68A]'
              : 'border-white/15 bg-white/5 text-[#94A3B8]'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-arcade text-xs sm:text-sm tracking-wider text-white uppercase">
            {label}
          </div>
          <div className="text-xs text-[#94A3B8] truncate">{description}</div>
        </div>
      </div>

      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
          enabled ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-white/20 bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}

/**
 * Einstellungen für Audio, Haptik & App-Installation mit 5 wählbaren Designarten über „+“.
 */
export function SettingsSheet({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  vibrationEnabled,
  onToggleVibration,
  onInstall,
}: SettingsSheetProps) {
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [design, setDesign] = useState<SubpageDesignId>(() => {
    try {
      const saved = localStorage.getItem('projektbox.settingsDesign') as SubpageDesignId | null;
      if (saved && SUBPAGE_DESIGN_OPTIONS.some((o) => o.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'glass-card';
  });

  if (!isOpen) return null;

  const handleSelectDesign = (next: SubpageDesignId) => {
    setDesign(next);
    try {
      localStorage.setItem('projektbox.settingsDesign', next);
    } catch {
      // ignore
    }
  };

  const togglesList = (frameless = false) => (
    <div className="flex flex-col gap-2.5 w-full">
      <SettingToggleRow
        frameless={frameless}
        label="MUSIK & TON"
        description={soundEnabled ? 'Aktiviert' : 'Stummgeschaltet'}
        enabled={soundEnabled}
        onToggle={onToggleSound}
        icon={soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      />

      <SettingToggleRow
        frameless={frameless}
        label="SOUNDEFFEKTE & HAPTIK"
        description={vibrationEnabled ? 'Aktiviert' : 'Deaktiviert'}
        enabled={vibrationEnabled}
        onToggle={onToggleVibration}
        icon={<Vibrate className="h-4 w-4" />}
      />

      {onInstall && (
        <OpenButton
          size="sm"
          variant="outline-amber"
          fullWidth
          onClick={onInstall}
          className="mt-1"
        >
          <Download className="h-3.5 w-3.5" />
          <span>APP INSTALLIEREN</span>
        </OpenButton>
      )}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Einstellungen"
      onClick={onClose}
      className={`fixed inset-0 min-h-dvh z-50 flex w-full flex-col overflow-y-auto overflow-x-hidden bg-[#0F172A]/85 backdrop-blur-md select-none animate-fade-in ${
        design === 'floating-sheet'
          ? 'items-center justify-end p-2 sm:p-6'
          : design === 'open-stage'
            ? 'items-center justify-between p-4 sm:p-8'
            : 'items-center justify-center p-4 landscape:p-2'
      }`}
    >
      {/* 1. OFFENE BÜHNE */}
      {design === 'open-stage' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 min-h-0 w-full max-w-2xl flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="font-arcade inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>ZURÜCK</span>
            </button>

            <PlusDesignButton onClick={() => setShowDesignModal(true)} />
          </div>

          <div className="my-auto flex w-full flex-col items-center gap-6 py-4">
            <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
              <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                OPTIONEN & <span className="text-[#FBBF24]">EINSTELLUNGEN</span>
              </span>
            </div>

            {togglesList(true)}

            <div className="w-full max-w-xs pt-2">
              <OpenButton size="lg" variant="primary" onClick={onClose} fullWidth>
                SPEICHERN
              </OpenButton>
            </div>
          </div>

          <div aria-hidden="true" className="h-4" />
        </div>
      )}

      {/* 2. SPLIT-STUDIO */}
      {design === 'split-studio' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="tablet-modal-box my-auto grid w-full max-w-2xl grid-cols-1 sm:grid-cols-[0.85fr_1.15fr] overflow-hidden rounded-2xl border border-white/15 bg-[#0F172A]/90 text-white backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
        >
          <div className="flex flex-col justify-between gap-4 border-b sm:border-b-0 sm:border-r border-white/15 bg-white/[0.03] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F59E0B]/50 bg-[#F59E0B]/15 text-[#FDE68A]">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <PlusDesignButton onClick={() => setShowDesignModal(true)} />
            </div>

            <div>
              <div className="border-b-2 border-[#F59E0B] inline-block pb-0.5">
                <h2 className="font-arcade text-lg tracking-wider text-white uppercase">
                  EINSTELLUNGEN
                </h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]">
                Passe Ton, Soundeffekte und Haptik direkt für dein Gerät an.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
            <div className="flex justify-end -mt-1 -mr-1">
              <button
                type="button"
                onClick={onClose}
                aria-label="Schließen"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/12 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {togglesList(false)}
            <OpenButton size="md" variant="primary" onClick={onClose} fullWidth>
              SPEICHERN
            </OpenButton>
          </div>
        </div>
      )}

      {/* 3. BOTTOM-SHEET */}
      {design === 'floating-sheet' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0F172A]/95 p-5 sm:p-6 text-white backdrop-blur-xl shadow-[0_-16px_50px_rgba(0,0,0,0.6)]"
        >
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/25" />
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/15 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-arcade text-base sm:text-lg tracking-wider text-white uppercase">
                EINSTELLUNGEN
              </span>
              <PlusDesignButton onClick={() => setShowDesignModal(true)} />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/12 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {togglesList(false)}
            <OpenButton size="md" variant="primary" onClick={onClose} fullWidth>
              FERTIG
            </OpenButton>
          </div>
        </div>
      )}

      {/* 4. MINIMAL-FOKUS */}
      {design === 'minimal-focus' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="my-auto flex w-full max-w-md flex-col items-center gap-5 px-2 text-center"
        >
          <div className="flex w-full items-center justify-between">
            <PlusDesignButton onClick={() => setShowDesignModal(true)} />
            <span className="font-arcade text-sm tracking-widest text-[#FBBF24] uppercase">
              OPTIONEN
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/12 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {togglesList(true)}

          <OpenButton size="lg" variant="primary" onClick={onClose} fullWidth className="rounded-full">
            SPEICHERN
          </OpenButton>
        </div>
      )}

      {/* 5. KLASSIK-GLAS */}
      {design === 'glass-card' && (
        <div className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-md">
          <OpenModalFrame
            title="OPTIONEN &"
            accentWord="EINSTELLUNGEN"
            headerAction={<PlusDesignButton onClick={() => setShowDesignModal(true)} />}
            onClose={onClose}
            contentClassName="gap-3.5 landscape:gap-2.5"
          >
            {togglesList(false)}

            <div className="flex justify-end pt-1">
              <OpenButton size="md" variant="primary" onClick={onClose} fullWidth>
                SPEICHERN
              </OpenButton>
            </div>
          </OpenModalFrame>
        </div>
      )}

      <SubpageDesignModal
        isOpen={showDesignModal}
        contextTitle="EINSTELLUNGEN"
        activeDesign={design}
        onSelectDesign={handleSelectDesign}
        onClose={() => setShowDesignModal(false)}
      />
    </div>
  );
}

export default SettingsSheet;
