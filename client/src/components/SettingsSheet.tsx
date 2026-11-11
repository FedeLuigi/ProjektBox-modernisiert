import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Dices,
  Palette,
  Pencil,
  Smartphone,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Avatar, type AvatarConfig } from './Avatar';
import { AvatarCustomizerModal } from './AvatarCustomizerModal';
import { generateUniquePlayerName } from '../utils/nameGenerator';
import {
  getUserProfile,
  saveUserProfile,
  validatePlayerName,
  type UserProfile,
} from '../utils/userProfile';
import { BackgroundCometCanvas } from './BackgroundCometCanvas';
import {
  BTN_SECONDARY_BASE,
  BTN_SECONDARY_NEUTRAL,
  HEADER_BACK_BTN,
  HEADER_BADGE_PILL,
  HEADER_ROW,
  STAGE_SINGLE_COL,
  SURFACE_CARD,
  SWITCH_TRACK_OFF,
  SWITCH_TRACK_ON,
} from '../styles/uiTokens';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  onToggleVibration: (enabled: boolean) => void;
  onInstall?: () => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon,
}: ToggleRowProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="flex items-center justify-between p-3.5 rounded-2xl bg-[#18181C]/80 hover:bg-[#202026]/90 transition-all cursor-pointer ring-1 ring-white/[0.08] select-none active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
            checked
              ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25'
              : 'bg-white/5 text-[#8E8E93]'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white leading-tight">
            {label}
          </div>
          <div className="text-[11px] font-medium text-[#98989D] truncate">
            {description}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-3 shrink-0">
        <span
          className={`text-xs font-bold transition-colors ${
            checked ? 'text-purple-400' : 'text-[#8E8E93]'
          }`}
        >
          {checked ? 'An' : 'Aus'}
        </span>
        <div
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
            checked ? SWITCH_TRACK_ON : SWITCH_TRACK_OFF
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </div>
      </div>
    </div>
  );
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
  const [profile, setProfile] = useState<UserProfile>(getUserProfile);
  const [nameInput, setNameInput] = useState(profile.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getUserProfile();
      setProfile(current);
      setNameInput(current.name);
      setNameError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Neuen Namen würfeln
  const handleRollNewName = () => {
    const newName = generateUniquePlayerName();
    setNameInput(newName);
    setNameError(null);
    const updated = saveUserProfile({ name: newName });
    setProfile(updated);

    if (vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  };

  // Name eingeben und validieren
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setNameInput(raw);

    const validation = validatePlayerName(raw);
    if (!validation.valid) {
      setNameError(validation.error || 'Ungültiger Name');
    } else {
      setNameError(null);
      const updated = saveUserProfile({ name: validation.cleaned });
      setProfile(updated);
    }
  };

  const handleNameBlur = () => {
    const validation = validatePlayerName(nameInput);
    if (!validation.valid) {
      // Wenn ungültig, alten gültigen Namen zurücksetzen
      setNameInput(profile.name);
      setNameError(null);
    } else {
      setNameInput(validation.cleaned);
      const updated = saveUserProfile({ name: validation.cleaned });
      setProfile(updated);
    }
  };

  const handleSaveAvatar = (newConfig: AvatarConfig) => {
    const updated = saveUserProfile({ avatar: newConfig });
    setProfile(updated);
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(profile.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-screen-title"
      className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#0B0B0F]/95 backdrop-blur-2xl text-white select-none animate-fade-in"
    >
      {/* ─── VOLLBILD-KOMETEN-ANIMATION HINTER DER GESAMTEN EINSTELLUNGSSEITE ─── */}
      <BackgroundCometCanvas opacity={0.6} />

      {/* ─── Sanftes Ambient-Hintergrundlicht (Lila/Blau) ─── */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full blur-3xl opacity-60 bg-purple-600/25" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-50 bg-indigo-600/20" />

      {/* ─── Vollbild-Container mit einheitlichem Shell-Abstand ─── */}
      <div className="app-shell relative z-10 flex h-full w-full flex-col justify-between overflow-hidden">
        {/* 1. OBERE LEISTE: Gewohnter Zurück-Button & Status-Badge */}
        <header className={HEADER_ROW}>
          <button
            type="button"
            onClick={onClose}
            className={HEADER_BACK_BTN}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </button>

          <span
            className={`${HEADER_BADGE_PILL} uppercase bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25`}
          >
            Einstellungen
          </span>
        </header>

        {/* 2. MITTE: Großzügige, moderne Einstellungen */}
        <main className={`${STAGE_SINGLE_COL} overflow-y-auto scrollbar-none`}>
          <div className="my-auto w-full space-y-5">
            {/* ─── A) SPIELER-PROFIL KARTE (AVATAR & NAME) ─── */}
            <div className={`flex flex-col items-center justify-center text-center ${SURFACE_CARD}`}>
              {/* Runder Avatar mit leuchtender Kontur */}
              <div
                onClick={() => setIsAvatarModalOpen(true)}
                className="relative mb-3 inline-flex items-center justify-center rounded-full group cursor-pointer active:scale-95 transition-transform"
                title="Tippen zum Anpassen"
              >
                {/* Rein kreisrunder Radial-Glow ohne filter:blur-Rechteckartefakte */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-5 rounded-full opacity-85 group-hover:opacity-100 transition-opacity"
                  style={{
                    background:
                      'radial-gradient(circle closest-side, rgba(124, 58, 237, 0.62) 60%, rgba(236, 72, 153, 0.36) 74%, rgba(245, 158, 11, 0.12) 87%, rgba(236, 72, 153, 0) 99%)',
                  }}
                />
                <div className="relative inline-flex items-center justify-center p-[3px] rounded-full bg-gradient-to-tr from-[#7C3AED] via-[#EC4899] to-[#F59E0B]">
                  <div className="inline-flex items-center justify-center p-1 rounded-full bg-[#18181C]">
                    <Avatar config={profile.avatar} size={78} />
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 z-10 p-1.5 rounded-full bg-[#7C3AED] text-white shadow-md ring-2 ring-[#18181C]">
                  <Pencil className="h-3 w-3" />
                </div>
              </div>

              {/* Avatar anpassen Button */}
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-3 py-1 text-xs font-bold ring-1 ring-purple-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Palette className="h-3 w-3" />
                <span>Avatar anpassen</span>
              </button>

              {/* Spielername mit Validierung & Würfeln */}
              <div className="flex items-center justify-center gap-1.5 max-w-full">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    maxLength={20}
                    placeholder="Spielername..."
                    className="text-center text-base sm:text-lg font-black tracking-tight text-[#1C1C1E] dark:text-white bg-transparent border-b border-transparent hover:border-purple-500/40 focus:border-purple-500 focus:outline-none px-2 py-0.5 rounded transition-all max-w-[210px]"
                    title="Name antippen zum Anpassen (2-20 Zeichen)"
                  />
                  <Pencil className="h-3 w-3 text-purple-400 opacity-60 pointer-events-none -ml-2" />
                </div>

                {/* Würfel-Button */}
                <button
                  type="button"
                  onClick={handleRollNewName}
                  title="Neuen einzigartigen Namen würfeln"
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-purple-500/20 text-[#8E8E93] hover:text-[#7C3AED] dark:hover:text-purple-300 transition-colors active:scale-90 cursor-pointer shrink-0"
                >
                  <Dices className="h-4 w-4" />
                </button>
              </div>

              {/* Validierungs-Fehlermeldung */}
              {nameError && (
                <div className="mt-1 text-[11px] font-bold text-rose-400 animate-pulse">
                  {nameError}
                </div>
              )}

              {/* Eindeutige ID Badge */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Eindeutige Spieler-ID kopieren"
                  className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] px-2.5 py-0.5 text-[10px] font-mono text-[#8E8E93] hover:text-white transition-colors cursor-pointer ring-1 ring-white/10"
                >
                  <span>ID: {profile.id}</span>
                  {copiedId ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </button>

                <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-pink-500/15 px-2.5 py-0.5 text-[10px] font-bold text-purple-400 ring-1 ring-purple-500/30">
                  <Trophy className="h-3 w-3 text-amber-400" />
                  <span>Arcade Champion</span>
                </div>
              </div>
            </div>

            {/* ─── B) DIE EIN/AUS-SCHALTER (TÖNE & VIBRATION) ─── */}
            <div className="space-y-2.5">
              <ToggleRow
                label="Töne"
                description="Soundeffekte im Spiel"
                checked={soundEnabled}
                onChange={onToggleSound}
                icon={
                  soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )
                }
              />

              <ToggleRow
                label="Vibration"
                description="Haptisches Feedback bei Berührung"
                checked={vibrationEnabled}
                onChange={onToggleVibration}
                icon={<Smartphone className="h-4 w-4" />}
              />
            </div>

            {/* Optional: PWA Installieren Button (Stufe 2 Neutral Secondary) */}
            {onInstall && (
              <button
                type="button"
                onClick={onInstall}
                className={`${BTN_SECONDARY_BASE} ${BTN_SECONDARY_NEUTRAL}`}
              >
                <Sparkles className="h-4 w-4 text-purple-300" />
                <span>App auf Startbildschirm installieren</span>
              </button>
            )}
          </div>
        </main>

        </div>

      {/* ─── MODAL ZUM ANPASSEN DES AVATARS (HÜTE, FARBEN, FIGUR ETC.) ─── */}
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
