import {
  CrystalButton,
  CrystalPanel,
  CrystalSlider,
} from './CrystalUI';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  onToggleVibration: (enabled: boolean) => void;
  onInstall?: () => void;
}

/**
 * Einstellungen für Audio, Haptik & App-Installation.
 * Spielername und Avatar werden zentral im Profil (Klick auf den Avatar) verwaltet.
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
      className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden p-4 landscape:p-2 bg-[#0F172A]/80 backdrop-blur-xs select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-md pt-3 landscape:pt-0"
      >
        <CrystalPanel
          topTabLabel="OPTIONEN"
          title="EINSTELLUNGEN"
          accent="amber"
          contentClassName="gap-3.5 landscape:gap-2.5 py-5 px-5 sm:px-6 landscape:py-3.5 landscape:px-5"
        >
          {/* Gleichmäßig zentrierte Audio-/Haptik-Optionen & optionale Installation */}
          <div className="flex flex-col items-center gap-3 landscape:gap-2.5 w-full">
            <CrystalSlider
              label="MUSIK"
              value={soundEnabled ? 82 : 18}
              onChange={(val) => onToggleSound(val > 50)}
            />

            <CrystalSlider
              label="SOUNDEFFEKTE"
              value={vibrationEnabled ? 82 : 18}
              onChange={(val) => onToggleVibration(val > 50)}
            />

            {onInstall && (
              <CrystalButton
                size="sm"
                variant="secondary"
                onClick={onInstall}
                className="w-full max-w-[240px] h-8 text-xs mt-0.5"
              >
                APP INSTALLIEREN
              </CrystalButton>
            )}
          </div>

          {/* Schließen / Speichern Button unten */}
          <div className="w-full pt-1.5 landscape:pt-1 flex justify-center">
            <CrystalButton
              size="md"
              variant="primary"
              onClick={onClose}
              className="min-w-[150px] landscape:h-8 landscape:text-xs"
            >
              SPEICHERN
            </CrystalButton>
          </div>
        </CrystalPanel>
      </div>
    </div>
  );
}

export default SettingsSheet;

