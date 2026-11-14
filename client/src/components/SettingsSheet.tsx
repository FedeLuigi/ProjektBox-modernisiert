import { useEffect, useState } from 'react';
import { Check, Copy, Dices } from 'lucide-react';
import { Avatar, type AvatarConfig } from './Avatar';
import { AvatarCustomizerModal } from './AvatarCustomizerModal';
import { generateUniquePlayerName } from '../utils/nameGenerator';
import {
  saveUserProfile,
  useUserProfile,
  validatePlayerName,
} from '../utils/userProfile';
import { IslandBackground } from './IslandBackground';
import {
  CrystalButton,
  CrystalIconButton,
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
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

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

  const handleSaveAvatar = (newConfig: AvatarConfig) => {
    saveUserProfile({ avatar: newConfig });
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
      aria-labelledby="settings-screen-title"
      className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-[#1B2B40] text-[#1E293B] select-none animate-fade-in"
    >
      {/* Globaler Slate-Ocean-Kristall-Hintergrund */}
      <IslandBackground />

      <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-start md:justify-between overflow-y-auto">
        {/* 1. Obere Navigationsleiste mit einem einzigen klaren "ZURÜCK"-Button links */}
        <header className="tablet-header flex shrink-0 items-center justify-start gap-2 pb-1.5 sm:pb-2">
          <CrystalButton size="sm" variant="secondary" tilt="left" onClick={handleSaveAndClose}>
            ZURÜCK
          </CrystalButton>
        </header>

        {/* 2. Hauptbereich: Auf Mobile startet "SPIELER" direkt oben ohne großen Leerraum, darunter "OPTIONEN" */}
        <main className="tablet-screen-main mx-auto flex w-full max-w-4xl flex-1 md:my-auto items-start md:items-center justify-center pt-1.5 sm:pt-3 pb-3">
          <div className="tablet-portrait-stack grid w-full items-stretch gap-3.5 sm:gap-6 grid-cols-1 md:grid-cols-2">
            {/* ERSTE KARTE: "SPIELER" Kristall-Panel für Avatar & Name */}
            <CrystalPanel
              topTabLabel="SPIELER"
              accent="indigo"
              className="h-full"
              contentClassName="justify-between gap-2.5 sm:gap-3.5 py-4 sm:py-6 px-4 sm:px-6"
            >
              {/* Runder Avatar direkt auf dem Kartenhintergrund (klickbar, ohne weißen Kasten & ohne doppeltes Stift-Icon) */}
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="group relative rounded-full cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none drop-shadow-[0_5px_0_rgba(15,23,42,0.3)]"
                title="Avatar anpassen"
                aria-label="Avatar anpassen"
              >
                <Avatar config={profile.avatar} size={74} />
              </button>

              {/* Namensfeld im abgeschrägten Readout-Stil mit aktuellem Spielernamen */}
              <div className="w-full flex flex-col items-center">
                <label
                  htmlFor="player-profile-name-input"
                  className="font-arcade mb-1 text-xs sm:text-sm tracking-wider text-[#334155] uppercase"
                >
                  NAME
                </label>
                <div className="flex items-center gap-2 w-full max-w-[290px] justify-center">
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
                        paddingInline: '16px',
                        color: '#FFFFFF',
                        caretColor: '#FFFFFF',
                      }}
                      className="font-arcade w-full bg-[#1E293B] border border-[#475569] focus:border-[#818CF8] px-4 py-2 text-center text-sm sm:text-base font-bold tracking-wider text-white placeholder:text-white/55 uppercase focus:outline-none caret-white"
                    />
                  </div>

                  <CrystalIconButton
                    size="sm"
                    variant="amber"
                    tilt="right"
                    onClick={handleRollNewName}
                    title="Zufälligen Spielernamen generieren"
                    aria-label="Zufälligen Spielernamen generieren"
                  >
                    <Dices className="h-5 w-5" />
                  </CrystalIconButton>
                </div>

                {nameError && (
                  <span className="font-arcade mt-1 text-xs text-[#E11D48] uppercase">
                    {nameError}
                  </span>
                )}
              </div>

              {/* Avatar ändern & ID kopieren mit "KOPIERT!"-Feedback */}
              <div className="flex items-center justify-center gap-2.5 w-full pt-0.5">
                <CrystalButton
                  size="sm"
                  variant="indigo"
                  tilt="left"
                  onClick={() => setIsAvatarModalOpen(true)}
                >
                  AVATAR ÄNDERN
                </CrystalButton>
                <CrystalButton
                  size="sm"
                  variant="secondary"
                  tilt="right"
                  onClick={handleCopyId}
                  title="Spieler-ID in die Zwischenablage kopieren"
                >
                  {copiedId ? (
                    <>
                      <Check className="h-4 w-4 text-[#059669] stroke-[3]" />
                      <span>KOPIERT!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>ID</span>
                    </>
                  )}
                </CrystalButton>
              </div>
            </CrystalPanel>

            {/* ZWEITE KARTE: "OPTIONEN" Kristall-Panel mit "MUSIK", "SOUNDEFFEKTE" & "SPEICHERN" ganz unten */}
            <CrystalPanel
              topTabLabel="OPTIONEN"
              accent="amber"
              className="h-full"
              contentClassName="justify-between gap-3.5 sm:gap-5 py-4 sm:py-6 px-4 sm:px-6"
            >
              <div className="flex w-full flex-col items-center gap-3 sm:gap-4 my-auto">
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
                  <CrystalButton fullWidth size="sm" variant="secondary" onClick={onInstall}>
                    APP INSTALLIEREN
                  </CrystalButton>
                )}
              </div>

              <div className="w-full pt-1 flex justify-center">
                <CrystalButton
                  size="md"
                  variant="primary"
                  onClick={handleSaveAndClose}
                  className="min-w-[165px]"
                >
                  SPEICHERN
                </CrystalButton>
              </div>
            </CrystalPanel>
          </div>
        </main>
      </div>

      <AvatarCustomizerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        config={profile.avatar}
        onSave={handleSaveAvatar}
      />
    </div>
  );
}

export default SettingsSheet;
