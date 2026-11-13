import { useEffect, useState } from 'react';
import { Check, Copy, Dices, Pencil } from 'lucide-react';
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

      <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-y-auto">
        {/* Obere Navigationsleiste mit "HOME" / "EXIT" Crystal-Buttons */}
        <header className="flex shrink-0 items-center justify-between gap-2 pb-2">
          <CrystalButton size="sm" variant="secondary" tilt="left" onClick={onClose}>
            HOME
          </CrystalButton>

          <CrystalButton size="sm" variant="secondary" tilt="right" onClick={onClose}>
            EXIT
          </CrystalButton>
        </header>

        {/* Hauptbereich: 1:1 Umsetzung des "OPTIONS" Kristall-Fensters + Spieler-Profil-Kristallfenster */}
        <main className="my-auto mx-auto flex w-full max-w-4xl flex-1 items-center justify-center pt-4 pb-2">
          <div className="grid w-full items-center gap-6 grid-cols-1 md:grid-cols-2">
            {/* 1. "OPTIONS" Kristall-Panel (Exakt wie rechts unten im Referenzbild mit "OPTIONS" Trapez-Tab, "MUSIC" & "SOUND" Reglern) */}
            <CrystalPanel topTabLabel="OPTIONS" accent="amber" contentClassName="gap-6 py-7 px-6">
              <CrystalSlider
                label="MUSIC"
                value={soundEnabled ? 82 : 18}
                onChange={(val) => onToggleSound(val > 50)}
              />

              <CrystalSlider
                label="SOUND"
                value={vibrationEnabled ? 82 : 18}
                onChange={(val) => onToggleVibration(val > 50)}
              />

              {onInstall && (
                <CrystalButton fullWidth size="sm" variant="secondary" onClick={onInstall}>
                  INSTALL APP
                </CrystalButton>
              )}

              <div className="pt-1 flex justify-center">
                <CrystalButton size="md" variant="primary" onClick={onClose} className="min-w-[130px]">
                  OK
                </CrystalButton>
              </div>
            </CrystalPanel>

            {/* 2. "PLAYER" Kristall-Panel für Avatar & Name */}
            <CrystalPanel topTabLabel="PLAYER" accent="indigo" contentClassName="gap-3.5 py-6 px-6">
              {/* Avatar im quadratischen/trapezförmigen Kristall-Rahmen */}
              <div
                onClick={() => setIsAvatarModalOpen(true)}
                className="group relative cursor-pointer transition-transform hover:scale-105 active:scale-95"
                title="Avatar anpassen"
              >
                <div className="border-[4px] border-[#1E293B] bg-[#F8FAFC] p-2 shadow-[inset_0_2px_0_#FFFFFF,0_5px_0_rgba(15,23,42,0.3)]">
                  <Avatar config={profile.avatar} size={76} />
                </div>
                <div className="absolute -bottom-2 -right-2 border-2 border-[#1E293B] bg-[#4F46E5] p-1.5 text-white shadow-xs">
                  <Pencil className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Namensfeld im abgeschrägten SCORE/REWARD Readout-Stil */}
              <div className="w-full flex flex-col items-center">
                <span className="font-arcade mb-1 text-sm tracking-wider text-[#334155] uppercase">
                  NAME
                </span>
                <div className="flex items-center gap-2 w-full justify-center">
                  <div
                    style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                    className="bg-[#0F172A] p-[2.5px] shadow-[0_3px_0_rgba(15,23,42,0.2)]"
                  >
                    <input
                      type="text"
                      value={nameInput}
                      onChange={handleNameChange}
                      onBlur={handleNameBlur}
                      maxLength={20}
                      placeholder="PLAYER..."
                      style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                      className="font-arcade bg-[#1E293B] px-4 py-1.5 text-center text-base sm:text-lg tracking-wider text-[#F8FAFC] uppercase focus:outline-none w-[175px]"
                    />
                  </div>

                  <CrystalIconButton
                    size="sm"
                    variant="amber"
                    tilt="right"
                    onClick={handleRollNewName}
                    title="Neuen Namen würfeln"
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

              {/* ID kopieren & Avatar-Button */}
              <div className="flex items-center gap-2 mt-1">
                <CrystalButton
                  size="sm"
                  variant="indigo"
                  tilt="left"
                  onClick={() => setIsAvatarModalOpen(true)}
                >
                  AVATAR
                </CrystalButton>
                <CrystalButton
                  size="sm"
                  variant="secondary"
                  tilt="right"
                  onClick={handleCopyId}
                >
                  {copiedId ? <Check className="h-4 w-4 text-[#059669]" /> : <Copy className="h-4 w-4" />}
                  <span>ID</span>
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
