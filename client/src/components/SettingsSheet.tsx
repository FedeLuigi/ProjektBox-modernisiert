import { Download, Volume2, VolumeX, Vibrate } from 'lucide-react';
import { OpenButton, OpenModalFrame } from './OpenSubpageUI';

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
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07] cursor-pointer active:scale-[0.99]"
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
          enabled
            ? 'border-[#F59E0B] bg-[#F59E0B]'
            : 'border-white/20 bg-white/10'
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
 * Einstellungen für Audio, Haptik & App-Installation im Open-Gallery-Stil.
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
      className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden p-4 landscape:p-2 bg-[#0F172A]/80 backdrop-blur-sm select-none animate-fade-in"
    >
      <div className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-md">
        <OpenModalFrame
          title="OPTIONEN &"
          accentWord="EINSTELLUNGEN"
          onClose={onClose}
          contentClassName="gap-3.5 landscape:gap-2.5"
        >
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

          <div className="flex justify-end pt-1">
            <OpenButton size="md" variant="primary" onClick={onClose} fullWidth>
              SPEICHERN
            </OpenButton>
          </div>
        </OpenModalFrame>
      </div>
    </div>
  );
}

export default SettingsSheet;
