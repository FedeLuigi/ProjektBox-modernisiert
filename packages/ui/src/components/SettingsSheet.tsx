import { ArrowLeft, Download, RefreshCw, Volume2, VolumeX, Vibrate } from 'lucide-react';
import { OpenButton } from './OpenSubpageUI';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  onToggleVibration: (enabled: boolean) => void;
  onInstall?: () => void;
  onApplyUpdate?: () => void;
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
    <div className="flex w-full items-center justify-between gap-4 border-b border-white/15 py-3.5 lg:py-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex h-10 w-10 lg:h-11 lg:w-11 shrink-0 items-center justify-center rounded-xl border border-[#F59E0B]/50 bg-[#F59E0B]/15 text-[#FDE68A]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-arcade text-sm lg:text-base tracking-wider text-white uppercase">
            {label}
          </div>
          <div className="text-xs lg:text-sm text-[#94A3B8] truncate">{description}</div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={enabled}
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
          enabled ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-white/20 bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
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
  onApplyUpdate,
}: SettingsSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Einstellungen"
      data-tv-scope="modal"
      onClick={onClose}
      className="fixed inset-0 z-50 flex w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0F172A]/85 pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(14px+env(safe-area-inset-bottom,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pt-[calc(28px+env(safe-area-inset-top,0px))] sm:pb-[calc(28px+env(safe-area-inset-bottom,0px))] sm:pl-[max(32px,env(safe-area-inset-left,0px))] sm:pr-[max(32px,env(safe-area-inset-right,0px))] backdrop-blur-md select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-1 min-h-0 w-full max-w-6xl flex-col justify-between"
      >
        <div className="flex items-center justify-start">
          <button
            type="button"
            data-tv-autofocus="true"
            onClick={onClose}
            className="font-arcade inline-flex h-9 lg:h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/[0.06] px-3.5 lg:px-4 text-xs lg:text-sm tracking-wider text-white uppercase hover:bg-white/15 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>ZURÜCK</span>
          </button>
        </div>

        <div className="my-auto mx-auto flex w-full max-w-4xl flex-col items-center gap-5 sm:gap-8 landscape:gap-3 px-2 sm:px-6 py-4">
          <div className="border-b-2 border-[#F59E0B] px-4 pb-1.5">
            <span className="font-arcade text-2xl sm:text-3xl lg:text-4xl landscape:text-xl tracking-wider text-white uppercase">
              EINSTELLUNGEN
            </span>
          </div>

          <div className="grid w-full grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 lg:gap-12">
            <SettingToggleRow
              label="MUSIK & TON"
              description={soundEnabled ? 'Aktiviert' : 'Stummgeschaltet'}
              enabled={soundEnabled}
              onToggle={onToggleSound}
              icon={soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            />

            <SettingToggleRow
              label="SOUNDEFFEKTE & HAPTIK"
              description={vibrationEnabled ? 'Aktiviert' : 'Deaktiviert'}
              enabled={vibrationEnabled}
              onToggle={onToggleVibration}
              icon={<Vibrate className="h-5 w-5" />}
            />
          </div>

          {(onInstall || onApplyUpdate) && (
            <div className="flex w-full max-w-md flex-col gap-2">
              {onInstall && (
                <OpenButton size="md" variant="outline-amber" fullWidth onClick={onInstall}>
                  <Download className="h-4 w-4" />
                  <span>APP INSTALLIEREN</span>
                </OpenButton>
              )}

              {onApplyUpdate && (
                <OpenButton size="md" variant="amber" fullWidth onClick={onApplyUpdate}>
                  <RefreshCw className="h-4 w-4" />
                  <span>UPDATE VERFÜGBAR (NEU LADEN)</span>
                </OpenButton>
              )}
            </div>
          )}

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
