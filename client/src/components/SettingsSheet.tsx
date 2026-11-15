import { useEffect, useState } from 'react';
import { Check, Copy, Dices } from 'lucide-react';
import { generateUniquePlayerName } from '../utils/nameGenerator';
import {
  saveUserProfile,
  useUserProfile,
  validatePlayerName,
} from '../utils/userProfile';
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
  const [nameInput, setNameInput] = useState(profile.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNameInput(profile.name);
      setNameError(null);
    }
  }, [isOpen, profile.name]);

  if (!isOpen) return null;

  const handleRollNewName = () => {
    const newName = generateUniquePlayerName();
    setNameInput(newName);
    setNameError(null);
    saveUserProfile({ name: newName });

    if (vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setNameInput(raw);

    const validation = validatePlayerName(raw);
    if (!validation.valid) {
      setNameError(validation.error || 'Ungültiger Name');
    } else {
      setNameError(null);
      saveUserProfile({ name: validation.cleaned });
    }
  };

  const handleNameBlur = () => {
    const validation = validatePlayerName(nameInput);
    if (!validation.valid) {
      setNameInput(profile.name);
      setNameError(null);
    } else {
      setNameInput(validation.cleaned);
      saveUserProfile({ name: validation.cleaned });
    }
  };

  const handleSaveAndClose = () => {
    const validation = validatePlayerName(nameInput);
    if (validation.valid) {
      saveUserProfile({ name: validation.cleaned });
    }
    onClose();
  };

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
      aria-labelledby="settings-dialog-title"
      onClick={handleSaveAndClose}
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
            {/* SPALTE 1: Name & Spieler-ID */}
            <div className="flex flex-col items-center gap-2.5 w-full">
              <div className="w-full flex flex-col items-center">
                <label
                  htmlFor="player-profile-name-input"
                  className="font-arcade mb-1 text-xs sm:text-sm tracking-wider text-[#334155] uppercase"
                >
                  SPIELERNAME
                </label>
                <div className="flex items-stretch gap-1.5 w-full max-w-[290px] justify-center">
                  <div
                    style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                    className="flex-1 min-w-0 bg-[#0F172A] p-[2.5px] shadow-[0_3px_0_rgba(15,23,42,0.2)]"
                  >
                    <input
                      id="player-profile-name-input"
                      type="text"
                      value={nameInput}
                      onChange={handleNameChange}
                      onBlur={handleNameBlur}
                      maxLength={20}
                      placeholder="Spielername eingeben..."
                      style={{
                        clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)',
                        paddingInline: '14px',
                        color: '#FFFFFF',
                        caretColor: '#FFFFFF',
                      }}
                      className="font-arcade h-9 sm:h-10 landscape:h-8 w-full bg-[#1E293B] border border-[#475569] focus:border-[#F59E0B] px-3 text-center text-sm font-bold tracking-wider text-white placeholder:text-white/55 uppercase focus:outline-none caret-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRollNewName}
                    title="Zufälligen Spielernamen generieren"
                    aria-label="Zufälligen Spielernamen generieren"
                    style={{ clipPath: 'polygon(4% 0%, 100% 6%, 96% 100%, 0% 94%)' }}
                    className="flex h-full w-9 sm:w-10 items-center justify-center bg-[#78350F] p-[2.5px] shadow-[0_3px_0_rgba(15,23,42,0.25)] active:scale-95 cursor-pointer shrink-0"
                  >
                    <div
                      style={{ clipPath: 'polygon(4% 0%, 100% 6%, 96% 100%, 0% 94%)' }}
                      className="flex h-full w-full items-center justify-center border-t-2 border-l-2 border-[#FEF3C7] bg-gradient-to-b from-[#FBBF24] to-[#F59E0B] text-[#0F172A]"
                    >
                      <Dices className="h-4 w-4 stroke-[2.4]" />
                    </div>
                  </button>
                </div>

                {nameError && (
                  <span className="font-arcade mt-1 text-xs text-[#E11D48] uppercase">
                    {nameError}
                  </span>
                )}
              </div>

              {/* ID kopieren */}
              <div className="w-full flex justify-center pt-0.5">
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

            {/* SPALTE 2: Audio / Haptik & Installation */}
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

              {onInstall && (
                <CrystalButton fullWidth size="sm" variant="secondary" onClick={onInstall} className="h-8 text-xs">
                  APP INSTALLIEREN
                </CrystalButton>
              )}
            </div>
          </div>

          {/* Schließen / Speichern Button unten */}
          <div className="w-full pt-2 landscape:pt-1 flex justify-center">
            <CrystalButton
              size="md"
              variant="primary"
              onClick={handleSaveAndClose}
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
