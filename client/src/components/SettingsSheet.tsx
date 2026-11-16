import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useUserProfile } from '../utils/userProfile';
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
  const profile = useUserProfile();
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(profile.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // ignore
    }
  };

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
        className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-xl pt-3 landscape:pt-0"
      >
        <CrystalPanel
          topTabLabel="OPTIONEN"
          title="EINSTELLUNGEN"
          accent="amber"
          contentClassName="gap-3.5 landscape:gap-2.5 py-5 px-5 sm:px-6 landscape:py-3 landscape:px-4"
        >
          {/* In Portrait untereinander, in Landscape 2-spaltig nebeneinander */}
          <div className="flex flex-col landscape:grid landscape:grid-cols-2 gap-3.5 landscape:gap-4 w-full">
            {/* SPALTE 1: Audio / Haptik */}
            <div className="flex flex-col items-center gap-2.5 sm:gap-3 w-full justify-center">
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
            </div>

            {/* SPALTE 2: Installation & Spieler-ID */}
            <div className="flex flex-col items-center gap-2.5 w-full justify-center">
              {onInstall && (
                <CrystalButton
                  size="sm"
                  variant="secondary"
                  onClick={onInstall}
                  className="w-full max-w-[240px] h-8 text-xs"
                >
                  APP INSTALLIEREN
                </CrystalButton>
              )}

              <CrystalButton
                size="sm"
                variant="secondary"
                tilt="right"
                onClick={handleCopyId}
                title="Spieler-ID in die Zwischenablage kopieren"
                className="w-full max-w-[240px] h-8 text-xs"
              >
                {copiedId ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#059669] stroke-[3]" />
                    <span>ID KOPIERT!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>SPIELER-ID KOPIEREN</span>
                  </>
                )}
              </CrystalButton>
            </div>
          </div>

          {/* Schließen / Speichern Button unten */}
          <div className="w-full pt-2 landscape:pt-1 flex justify-center">
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

