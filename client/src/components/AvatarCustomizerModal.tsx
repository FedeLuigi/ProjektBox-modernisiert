import { useEffect, useState } from 'react';
import { Check, Dices, Sparkles, X } from 'lucide-react';
import {
  Avatar,
  type AvatarConfig,
  AVATAR_ACCESSORIES,
  AVATAR_BASES,
  AVATAR_BGS,
  AVATAR_HATS,
  AVATAR_SKIN_COLORS,
  DEFAULT_AVATAR,
  getAvatarBgMeta,
} from './Avatar';
import { BTN_PRIMARY_BASE, BTN_PRIMARY_ENABLED } from '../styles/uiTokens';

interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
}

type TabType = 'base' | 'skin' | 'hat' | 'accessory' | 'bg';

export function AvatarCustomizerModal({
  isOpen,
  onClose,
  config,
  onSave,
}: AvatarCustomizerModalProps) {
  const [current, setCurrent] = useState<AvatarConfig>(() => ({ ...DEFAULT_AVATAR, ...config }));
  const [activeTab, setActiveTab] = useState<TabType>('base');

  useEffect(() => {
    if (isOpen) {
      setCurrent({ ...DEFAULT_AVATAR, ...config });
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const previewBgMeta = getAvatarBgMeta(current.bg);

  // Zufällige lustige Kombination würfeln
  const handleRandomize = () => {
    const randomBase =
      AVATAR_BASES[Math.floor(Math.random() * AVATAR_BASES.length)].id;
    const randomSkin =
      AVATAR_SKIN_COLORS[Math.floor(Math.random() * AVATAR_SKIN_COLORS.length)].id;
    const randomHat =
      AVATAR_HATS[Math.floor(Math.random() * AVATAR_HATS.length)].id;
    const randomAcc =
      AVATAR_ACCESSORIES[
        Math.floor(Math.random() * AVATAR_ACCESSORIES.length)
      ].id;
    const randomBg =
      AVATAR_BGS[Math.floor(Math.random() * AVATAR_BGS.length)].id;

    setCurrent({
      base: randomBase,
      skinColor: randomSkin,
      hat: randomHat,
      accessory: randomAcc,
      bg: randomBg,
    });
  };

  const handleSave = () => {
    onSave(current);
    onClose();
  };

  const optionCardClass = (isSelected: boolean) =>
    `min-w-0 w-full flex flex-col items-center p-2.5 rounded-2xl transition-all cursor-pointer ${
      isSelected
        ? 'bg-purple-500/18 ring-2 ring-[#8B5CF6] shadow-sm'
        : 'bg-white/[0.05] hover:bg-white/[0.09] ring-1 ring-white/[0.06]'
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 min-h-dvh z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative w-full max-w-lg landscape:max-w-3xl rounded-[32px] landscape:rounded-[26px] bg-[#16161C] text-white p-5 sm:p-6 landscape:p-4 shadow-2xl ring-1 ring-white/10 flex flex-col max-h-[90dvh] landscape:max-h-[92dvh] overflow-hidden">
        {/* Header mit Schließen-Button */}
        <div className="flex items-center justify-between pb-3 landscape:pb-2 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
              Avatar anpassen
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[#98989D] hover:text-white ring-1 ring-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body: Hochformat vertikal gestapelt, Querformat links Vorschau & rechts Auswahl */}
        <div className="flex flex-col flex-1 min-h-0 landscape:grid landscape:grid-cols-[175px_1fr] sm:landscape:grid-cols-[200px_1fr] landscape:gap-5 landscape:pt-3">
          {/* ─── LIVE VORSCHAU DES AVATARS ─── */}
          <div className="my-5 landscape:my-0 flex flex-col items-center justify-center shrink-0">
            <div className="relative inline-flex items-center justify-center rounded-full">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-5 rounded-full transition-all duration-300"
                style={{
                  background: `radial-gradient(circle closest-side, ${previewBgMeta.glowRgba} 62%, ${previewBgMeta.haloMidRgba} 78%, ${previewBgMeta.haloEdgeRgba} 90%, rgba(0, 0, 0, 0) 99%)`,
                }}
              />
              <div
                className="relative inline-flex items-center justify-center rounded-full p-1 transition-all duration-300"
                style={{
                  backgroundImage: `linear-gradient(to top right, ${previewBgMeta.from}, ${previewBgMeta.accent}, ${previewBgMeta.to})`,
                }}
              >
                <Avatar config={current} size={110} />
              </div>
              {/* Würfeln-Button (nur Icon) */}
              <button
                type="button"
                onClick={handleRandomize}
                aria-label="Zufälligen Avatar würfeln"
                title="Zufälligen Avatar würfeln"
                className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-[#23232B] hover:bg-[#2E2E38] text-white shadow-lg ring-1 ring-white/20 active:scale-95 transition-all cursor-pointer"
              >
                <Dices className="h-4 w-4 text-purple-300" />
              </button>
            </div>
          </div>

          {/* ─── RECHTE SPALTE: KATEGORIE-TABS & OPTIONEN ─── */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* ─── KATEGORIE-TABS ─── */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-2 py-2 landscape:pt-0 border-b border-white/[0.08] shrink-0">
              {(
                [
                  { id: 'base', label: 'Figur' },
                  { id: 'skin', label: 'Farbe' },
                  { id: 'hat', label: 'Hut' },
                  { id: 'accessory', label: 'Brille' },
                  { id: 'bg', label: 'Aura' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white/[0.15] text-white ring-1 ring-white/20 shadow-xs'
                      : 'text-[#98989D] hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ─── AUSWAHL-OPTIONEN (Seitlicher Puffer gegen Ring-/Schatten-Clipping) ─── */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-none">
          {/* TAB 1: BASIS-FIGUR */}
          {activeTab === 'base' && (
            <div className="grid grid-cols-3 gap-2.5">
              {AVATAR_BASES.map((b) => {
                const isSelected = current.base === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, base: b.id })}
                    className={optionCardClass(isSelected)}
                  >
                    <Avatar
                      config={{ ...current, base: b.id }}
                      size={48}
                    />
                    <span className="mt-1.5 w-full truncate text-center text-xs font-bold text-white">
                      {b.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: HAUT- / GRUNDFARBE */}
          {activeTab === 'skin' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {AVATAR_SKIN_COLORS.map((s) => {
                const isSelected = current.skinColor === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, skinColor: s.id })}
                    className={optionCardClass(isSelected)}
                  >
                    <div
                      className="h-10 w-10 shrink-0 rounded-full shadow-inner ring-1 ring-white/20 flex items-center justify-center"
                      style={{ backgroundColor: s.id }}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
                    </div>
                    <span className="mt-1.5 w-full truncate text-center text-[11px] font-bold text-white">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 3: HÜTE */}
          {activeTab === 'hat' && (
            <div className="grid grid-cols-3 gap-2.5">
              {AVATAR_HATS.map((h) => {
                const isSelected = current.hat === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, hat: h.id })}
                    className={optionCardClass(isSelected)}
                  >
                    <Avatar
                      config={{ ...current, hat: h.id }}
                      size={46}
                    />
                    <span className="mt-1.5 w-full truncate text-center text-[11px] font-bold text-white">
                      {h.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 4: ACCESSOIRES / BRILLEN */}
          {activeTab === 'accessory' && (
            <div className="grid grid-cols-3 gap-2.5">
              {AVATAR_ACCESSORIES.map((acc) => {
                const isSelected = current.accessory === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, accessory: acc.id })}
                    className={optionCardClass(isSelected)}
                  >
                    <Avatar
                      config={{ ...current, accessory: acc.id }}
                      size={46}
                    />
                    <span className="mt-1.5 w-full truncate text-center text-[11px] font-bold text-white">
                      {acc.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 5: HINTERGRUND-AURA */}
          {activeTab === 'bg' && (
            <div className="grid grid-cols-3 gap-2.5">
              {AVATAR_BGS.map((bg) => {
                const isSelected = current.bg === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, bg: bg.id })}
                    className={optionCardClass(isSelected)}
                  >
                    <div
                      className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr ${bg.gradient} ring-1 ring-white/20 flex items-center justify-center`}
                      style={{
                        backgroundImage: `linear-gradient(to top right, ${bg.from}, ${bg.to})`,
                      }}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
                    </div>
                    <span className="mt-1.5 w-full truncate text-center text-[11px] font-bold text-white">
                      {bg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
            </div>
          </div>
        </div>

        {/* ─── SPEICHERN BUTTON ─── */}
        <div className="pt-3 landscape:pt-2 border-t border-white/[0.08] shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className={`${BTN_PRIMARY_BASE} ${BTN_PRIMARY_ENABLED}`}
          >
            <Check className="h-4 w-4" />
            <span>Avatar speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarCustomizerModal;
