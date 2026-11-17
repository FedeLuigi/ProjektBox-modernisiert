import { ArrowLeft, Download, Volume2, VolumeX, Vibrate } from 'lucide-react';
import { OpenButton } from './OpenSubpageUI';

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
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className="flex w-full items-center justify-between gap-3 border-b border-white/15 py-3.5 text-left transition-colors hover:border-white/30 cursor-pointer active:scale-[0.99]"
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
 * Einstellungen für Audio, Haptik & App-Installation im offenen „Offene Bühne“-Design.
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
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Einstellungen"
      onClick={onClose}
      className="fixed inset-0 z-50 flex w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0F172A]/85 pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(14px+env(safe-area-inset-bottom,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pt-[calc(28px+env(safe-area-inset-top,0px))] sm:pb-[calc(28px+env(safe-area-inset-bottom,0px))] sm:px-8 backdrop-blur-md select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-1 min-h-0 w-full max-w-2xl flex-col justify-between"
      >
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={onClose}
            className="font-arcade inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>ZURÜCK</span>
          </button>
        </div>

        <div className="my-auto flex w-full flex-col items-center gap-6 py-4">
          <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
            <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
              EINSTELLUNGEN
            </span>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            <SettingToggleRow
              label="MUSIK & TON"
              description={soundEnabled ? 'Aktiviert' : 'Stummgeschaltet'}
              enabled={soundEnabled}
              onToggle={onToggleSound}
              icon={soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            />

            <SettingToggleRow
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

          <div className="w-full max-w-xs pt-2">
            <OpenButton size="lg" variant="primary" onClick={onClose} fullWidth>
              SPEICHERN
            </OpenButton>
          </div>
        </div>

        <div aria-hidden="true" className="h-4" />
      </div>
    </div>
  );
}

export default SettingsSheet;
