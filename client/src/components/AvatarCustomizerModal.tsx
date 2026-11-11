import { useState } from 'react';
import { Check, Dices, Sparkles, X } from 'lucide-react';
import {
  Avatar,
  type AvatarConfig,
  AVATAR_ACCESSORIES,
  AVATAR_BASES,
  AVATAR_BGS,
  AVATAR_HATS,
  AVATAR_SKIN_COLORS,
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
  const [current, setCurrent] = useState<AvatarConfig>(config);
  const [activeTab, setActiveTab] = useState<TabType>('base');

  if (!isOpen) return null;

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative w-full max-w-lg rounded-[32px] bg-[#F2F2F7] dark:bg-[#15151A] p-6 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 flex flex-col max-h-[90dvh] overflow-hidden">
        {/* Header mit Schließen-Button */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-[#1C1C1E] dark:text-white">
              Avatar anpassen
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─── LIVE VORSCHAU DES AVATARS ─── */}
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="relative inline-flex items-center justify-center rounded-full">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-5 rounded-full"
              style={{
                background:
                  'radial-gradient(circle closest-side, rgba(139, 92, 246, 0.55) 62%, rgba(236, 72, 153, 0.3) 78%, rgba(56, 189, 248, 0.1) 90%, rgba(168, 85, 247, 0) 99%)',
              }}
            />
            <div className="relative inline-flex items-center justify-center rounded-full p-1 bg-gradient-to-tr from-[#8B5CF6] via-[#EC4899] to-[#38BDF8]">
              <Avatar config={current} size={110} />
            </div>
            {/* Würfeln-Button (Stufe 2/3 Utility-Pille statt grellem Pink) */}
            <button
              type="button"
              onClick={handleRandomize}
              title="Zufälligen Avatar würfeln"
              className="absolute -bottom-1 -right-1 flex items-center gap-1.5 rounded-full bg-[#23232B] hover:bg-[#2E2E38] px-3 py-1.5 text-xs font-bold text-white shadow-lg ring-1 ring-white/20 active:scale-95 transition-all cursor-pointer"
            >
              <Dices className="h-3.5 w-3.5 text-purple-300" />
              <span>Würfeln</span>
            </button>
          </div>
        </div>

        {/* ─── KATEGORIE-TABS ─── */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-2 pt-1 border-b border-black/[0.06] dark:border-white/[0.08]">
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
                  ? 'bg-[#1C1C1E] text-white dark:bg-white dark:text-[#1C1C1E] shadow-xs'
                  : 'text-[#6C6C70] dark:text-[#98989D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── AUSWAHL-OPTIONEN ─── */}
        <div className="flex-1 overflow-y-auto py-3 scrollbar-none min-h-[160px]">
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
                    className={`flex flex-col items-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-500/15 ring-2 ring-[#8B5CF6] shadow-sm'
                        : 'bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <Avatar
                      config={{ ...current, base: b.id }}
                      size={48}
                    />
                    <span className="mt-1.5 text-xs font-bold text-[#1C1C1E] dark:text-white">
                      {b.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: HAUT- / GRUNDFARBE */}
          {activeTab === 'skin' && (
            <div className="grid grid-cols-4 gap-2.5">
              {AVATAR_SKIN_COLORS.map((s) => {
                const isSelected = current.skinColor === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrent({ ...current, skinColor: s.id })}
                    className={`flex flex-col items-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-500/15 ring-2 ring-[#8B5CF6] shadow-sm'
                        : 'bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <div
                      className="h-10 w-10 rounded-full shadow-inner ring-1 ring-black/10 dark:ring-white/20 flex items-center justify-center"
                      style={{ backgroundColor: s.id }}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
                    </div>
                    <span className="mt-1.5 text-[11px] font-bold text-[#1C1C1E] dark:text-white">
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
                    className={`flex flex-col items-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-500/15 ring-2 ring-[#8B5CF6] shadow-sm'
                        : 'bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <Avatar
                      config={{ ...current, hat: h.id }}
                      size={46}
                    />
                    <span className="mt-1.5 text-[11px] font-bold text-[#1C1C1E] dark:text-white truncate max-w-full">
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
                    className={`flex flex-col items-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-500/15 ring-2 ring-[#8B5CF6] shadow-sm'
                        : 'bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <Avatar
                      config={{ ...current, accessory: acc.id }}
                      size={46}
                    />
                    <span className="mt-1.5 text-[11px] font-bold text-[#1C1C1E] dark:text-white truncate max-w-full">
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
                    className={`flex flex-col items-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-500/15 ring-2 ring-[#8B5CF6] shadow-sm'
                        : 'bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-full bg-gradient-to-tr ${bg.gradient} ring-1 ring-white/20 flex items-center justify-center`}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
                    </div>
                    <span className="mt-1.5 text-[11px] font-bold text-[#1C1C1E] dark:text-white truncate max-w-full">
                      {bg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── SPEICHERN BUTTON ─── */}
        <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
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
