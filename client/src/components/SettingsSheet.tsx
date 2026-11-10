import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Dices,
  Film,
  Palette,
  Pencil,
  Settings,
  Smartphone,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Avatar, type AvatarConfig, DEFAULT_AVATAR } from './Avatar';
import { AvatarCustomizerModal } from './AvatarCustomizerModal';
import { generateUniquePlayerName } from '../utils/nameGenerator';
import { BackgroundCometCanvas } from './BackgroundCometCanvas';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  onToggleVibration: (enabled: boolean) => void;
  onInstall?: () => void;
  onReplaySplash?: () => void;
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
      className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-all cursor-pointer ring-1 ring-black/[0.04] dark:ring-white/[0.06] select-none active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
            checked
              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/25'
              : 'bg-black/5 dark:bg-white/5 text-[#8E8E93]'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#1C1C1E] dark:text-white leading-tight">
            {label}
          </div>
          <div className="text-[11px] font-medium text-[#8E8E93] dark:text-[#98989D] truncate">
            {description}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-3 shrink-0">
        <span
          className={`text-xs font-bold transition-colors ${
            checked ? 'text-purple-600 dark:text-purple-400' : 'text-[#8E8E93]'
          }`}
        >
          {checked ? 'An' : 'Aus'}
        </span>
        <div
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
            checked
              ? 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.4)]'
              : 'bg-black/20 dark:bg-white/20'
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
  onReplaySplash,
}: SettingsSheetProps) {
  // 1. ZUFÄLLIGER EINZIGARTIGER SPIELERNAME
  const [playerName, setPlayerName] = useState(() => {
    try {
      const saved = localStorage.getItem('projektbox_player_name');
      if (saved && saved !== 'Spieler 1') return saved;
      // Generiere einen neuen, nahezu unikalen Namen
      const freshName = generateUniquePlayerName();
      localStorage.setItem('projektbox_player_name', freshName);
      return freshName;
    } catch {
      return generateUniquePlayerName();
    }
  });

  // 2. AVATAR CONFIG MIT LOCALSTORAGE
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    try {
      const saved = localStorage.getItem('projektbox_player_avatar');
      if (saved) return JSON.parse(saved);
      return DEFAULT_AVATAR;
    } catch {
      return DEFAULT_AVATAR;
    }
  });

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Synchronisieren, falls Name extern geändert wurde
  useEffect(() => {
    try {
      const saved = localStorage.getItem('projektbox_player_name');
      if (saved) setPlayerName(saved);
    } catch {
      // ignore
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Neuen zufälligen Namen generieren
  const handleRollNewName = () => {
    const newName = generateUniquePlayerName();
    setPlayerName(newName);
    try {
      localStorage.setItem('projektbox_player_name', newName);
      if (vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch {
      // ignore
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 24);
    setPlayerName(val);
    try {
      localStorage.setItem('projektbox_player_name', val);
    } catch {
      // ignore
    }
  };

  const handleSaveAvatar = (newConfig: AvatarConfig) => {
    setAvatarConfig(newConfig);
    try {
      localStorage.setItem('projektbox_player_avatar', JSON.stringify(newConfig));
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-screen-title"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#0B0B0F]/95 backdrop-blur-2xl text-white select-none animate-fade-in pb-[env(safe-area-inset-bottom)]"
    >
      {/* ─── VOLLBILD-KOMETEN-ANIMATION HINTER DER GESAMTEN EINSTELLUNGSSEITE ─── */}
      <BackgroundCometCanvas opacity={0.6} />

      {/* ─── Sanftes Ambient-Hintergrundlicht (Lila/Blau) ─── */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full blur-3xl opacity-60 bg-purple-600/25" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-50 bg-indigo-600/20" />

      {/* ─── Vollbild-Container mit sicherem iPhone Notch Schutzabstand ─── */}
      <div className="safe-screen relative z-10 flex h-full w-full flex-col justify-between overflow-hidden">
        {/* 1. OBERE LEISTE: Gewohnter Zurück-Button & Status-Badge */}
        <header className="flex shrink-0 items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-white/85 dark:bg-[#1C1C1E]/90 px-4 py-2 text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white shadow-xs ring-1 ring-black/[0.06] dark:ring-white/[0.1] backdrop-blur-xl transition-transform active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </button>

          <span className="rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase shadow-2xs bg-purple-500/15 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/30">
            System
          </span>
        </header>

        {/* 2. MITTE: Großes Zahnrad-Icon, Titel & Box mit Profil & Schaltern */}
        <main className="my-auto mx-auto flex w-full max-w-4xl flex-1 items-center justify-center py-4 overflow-y-auto scrollbar-none">
          <div className="grid w-full items-center gap-6 sm:gap-10 portrait:grid-cols-1 portrait:text-center landscape:grid-cols-[1fr_1.2fr] landscape:text-left">
            {/* Linke / Obere Seite: Großes Zahnrad-Icon & Titel */}
            <div className="flex flex-col portrait:items-center landscape:items-start">
              <div className="grid h-20 w-20 sm:h-26 sm:w-26 landscape:h-18 landscape:w-18 landscape:sm:h-22 landscape:sm:w-22 place-items-center rounded-[26px] sm:rounded-[32px] shadow-md ring-1 ring-purple-500/30 bg-gradient-to-br from-purple-500/20 via-purple-600/25 to-indigo-500/20 text-purple-600 dark:text-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.25)]">
                <Settings
                  className="h-10 w-10 sm:h-13 sm:w-13 landscape:h-9 landscape:w-9 landscape:sm:h-11 landscape:sm:w-11"
                  strokeWidth={2.1}
                />
              </div>

              <div className="mt-4 landscape:mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>App & Profil</span>
              </div>

              <h1
                id="settings-screen-title"
                className="mt-1 text-3xl sm:text-5xl landscape:text-3xl landscape:sm:text-4xl font-black tracking-tight leading-tight"
              >
                Einstellungen
              </h1>

              <p className="mt-2 text-xs sm:text-sm text-[#8E8E93] dark:text-[#98989D] max-w-xs">
                Passe deinen Avatar, Spielernamen und Einstellungen an.
              </p>
            </div>

            {/* Rechte / Untere Seite: Karte mit Profil & Schaltern */}
            <div className="flex flex-col justify-center rounded-[28px] bg-white/70 dark:bg-[#18181C]/80 p-5 sm:p-7 ring-1 ring-black/[0.05] dark:ring-white/[0.08] backdrop-blur-xl shadow-sm w-full max-w-md mx-auto landscape:mx-0">
              {/* ─── A) SPIELER-PROFIL SEKTION MIT ANPASSBAREM AVATAR ─── */}
              <div className="flex flex-col items-center pb-5 mb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
                {/* Runder Spieler-Avatar mit leuchtender Kontur & Klick-zum-Anpassen */}
                <div className="relative group mb-3 cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
                  <div className="relative rounded-full p-1 bg-gradient-to-tr from-[#7C3AED] via-[#EC4899] to-[#38BDF8] shadow-[0_0_26px_rgba(168,85,247,0.5)] transition-transform group-hover:scale-105 active:scale-95">
                    <Avatar config={avatarConfig} size={84} />
                    {/* Bearbeiten-Badge Overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                      <Palette className="h-4 w-4" />
                    </div>
                  </div>
                  {/* Status-Punkt */}
                  <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-[#10B981] ring-2 ring-white dark:ring-[#18181C]" />
                </div>

                {/* Button zum Öffnen des Avatar-Customizers */}
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-3 py-1 text-xs font-bold ring-1 ring-purple-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Palette className="h-3 w-3" />
                  <span>Avatar anpassen</span>
                </button>

                {/* Einzigartiger Spielername mit Würfeln & Bearbeiten */}
                <div className="flex items-center justify-center gap-1.5 max-w-full">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={playerName}
                      onChange={handleNameChange}
                      maxLength={24}
                      placeholder="Spielername..."
                      className="text-center text-base sm:text-lg font-black tracking-tight text-[#1C1C1E] dark:text-white bg-transparent border-b border-transparent hover:border-purple-500/40 focus:border-purple-500 focus:outline-none px-2 py-0.5 rounded transition-all max-w-[210px]"
                      title="Name antippen zum Anpassen"
                    />
                    <Pencil className="h-3 w-3 text-purple-400 opacity-60 pointer-events-none -ml-2" />
                  </div>

                  {/* Würfel-Button für neuen einzigartigen Namen */}
                  <button
                    type="button"
                    onClick={handleRollNewName}
                    title="Neuen einzigartigen Namen würfeln"
                    className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-purple-500/20 text-[#8E8E93] hover:text-[#7C3AED] dark:hover:text-purple-300 transition-colors active:scale-90 cursor-pointer shrink-0"
                  >
                    <Dices className="h-4 w-4" />
                  </button>
                </div>

                {/* Level- / Status-Badge */}
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-pink-500/15 px-3 py-1 text-xs font-bold text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/30">
                  <Trophy className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Level 5 &bull; Arcade Champ</span>
                </div>
              </div>

              {/* ─── B) DIE EIN/AUS-SCHALTER (TÖNE & VIBRATION) ─── */}
              <div className="space-y-2.5">
                {/* 1. Töne (An / Aus) */}
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

                {/* 2. Vibration (An / Aus) */}
                <ToggleRow
                  label="Vibration"
                  description="Haptisches Feedback bei Berührung"
                  checked={vibrationEnabled}
                  onChange={onToggleVibration}
                  icon={<Smartphone className="h-4 w-4" />}
                />
              </div>

              {/* Start-Animation ansehen */}
              {onReplaySplash && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReplaySplash();
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 px-4 py-3 text-xs font-bold text-purple-600 dark:text-purple-300 transition-all ring-1 ring-purple-500/25 active:scale-95 cursor-pointer"
                >
                  <Film className="h-4 w-4" />
                  <span>3D Start-Animation ansehen</span>
                </button>
              )}

              {/* Optional: PWA Installieren Button */}
              {onInstall && (
                <button
                  type="button"
                  onClick={onInstall}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] px-4 py-3 text-xs font-bold text-[#1C1C1E] dark:text-white transition-all ring-1 ring-black/5 dark:ring-white/10 active:scale-95 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
                  <span>App auf Startbildschirm installieren</span>
                </button>
              )}
            </div>
          </div>
        </main>

        {/* 3. UNTEN: Versionsanzeige & Auto-Save Hinweis */}
        <footer className="shrink-0 text-center text-[11px] font-medium text-[#8E8E93] dark:text-[#636366]">
          ProjektBox &bull; Alle Änderungen werden automatisch gespeichert
        </footer>
      </div>

      {/* ─── MODAL ZUM ANPASSEN DES AVATARS (HÜTE, FARBEN, FIGUR ETC.) ─── */}
      <AvatarCustomizerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        config={avatarConfig}
        onSave={handleSaveAvatar}
      />
    </div>
  );
}

export default SettingsSheet;
