import { useEffect, useState } from 'react';
import { Check, Dices } from 'lucide-react';
import {
  Avatar,
  type AvatarConfig,
  AVATAR_ACCESSORIES,
  AVATAR_BASES,
  AVATAR_BGS,
  AVATAR_HATS,
  AVATAR_SKIN_COLORS,
  DEFAULT_AVATAR,
} from './Avatar';
import { CrystalButton, CrystalIconButton, CrystalPanel } from './CrystalUI';

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
    `min-w-0 w-full flex flex-col items-center p-2.5 border-[3px] transition-transform cursor-pointer active:scale-95 ${
      isSelected
        ? 'bg-[#2B9FD6] border-[#0E5A8A] text-white shadow-[inset_0_2px_0_#8AD8F8]'
        : 'bg-[#B8ECFD]/80 hover:bg-[#CFF2FF] border-[#17608E] text-[#15608E]'
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 min-h-dvh z-60 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-[#103858]/70 backdrop-blur-xs animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-lg pt-3 flex flex-col"
      >
        <CrystalPanel topTabLabel="AVATAR" contentClassName="w-full gap-3 p-4 sm:p-5">
          {/* Vorschau + Würfel-Icon-Button */}
          <div className="flex items-center justify-center gap-4">
            <div className="border-[4px] border-[#17608E] bg-[#52A9D6] p-2 shadow-[inset_0_2px_0_#AEE8FC]">
              <Avatar config={current} size={84} />
            </div>
            <CrystalIconButton
              size="md"
              tilt="right"
              onClick={handleRandomize}
              title="Zufälliger Avatar"
            >
              <Dices className="h-6 w-6" />
            </CrystalIconButton>
          </div>

          {/* Kategorie-Tabs als abgeschrägte Crystal-Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
            {(
              [
                { id: 'base', label: 'FIGUR' },
                { id: 'skin', label: 'FARBE' },
                { id: 'hat', label: 'HUT' },
                { id: 'accessory', label: 'BRILLE' },
                { id: 'bg', label: 'AURA' },
              ] as const
            ).map((tab, idx) => (
              <CrystalButton
                key={tab.id}
                size="sm"
                tilt={idx % 2 === 0 ? 'left' : 'right'}
                variant={activeTab === tab.id ? 'primary' : 'secondary'}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </CrystalButton>
            ))}
          </div>

          {/* Auswahl-Gitter */}
          <div className="w-full max-h-[38dvh] overflow-y-auto px-1 py-1">
            {activeTab === 'base' && (
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_BASES.map((b) => {
                  const isSelected = current.base === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setCurrent({ ...current, base: b.id })}
                      className={optionCardClass(isSelected)}
                    >
                      <Avatar config={{ ...current, base: b.id }} size={44} />
                      <span className="font-arcade mt-1 w-full truncate text-center text-xs uppercase">
                        {b.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'skin' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                        className="h-9 w-9 shrink-0 border-2 border-[#17608E] flex items-center justify-center"
                        style={{ backgroundColor: s.id }}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
                      </div>
                      <span className="font-arcade mt-1 w-full truncate text-center text-[11px] uppercase">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'hat' && (
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_HATS.map((h) => {
                  const isSelected = current.hat === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setCurrent({ ...current, hat: h.id })}
                      className={optionCardClass(isSelected)}
                    >
                      <Avatar config={{ ...current, hat: h.id }} size={44} />
                      <span className="font-arcade mt-1 w-full truncate text-center text-[11px] uppercase">
                        {h.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'accessory' && (
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_ACCESSORIES.map((acc) => {
                  const isSelected = current.accessory === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setCurrent({ ...current, accessory: acc.id })}
                      className={optionCardClass(isSelected)}
                    >
                      <Avatar config={{ ...current, accessory: acc.id }} size={44} />
                      <span className="font-arcade mt-1 w-full truncate text-center text-[11px] uppercase">
                        {acc.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'bg' && (
              <div className="grid grid-cols-3 gap-2">
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
                        className="h-9 w-9 shrink-0 border-2 border-[#17608E] flex items-center justify-center"
                        style={{
                          backgroundImage: `linear-gradient(to top right, ${bg.from}, ${bg.to})`,
                        }}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
                      </div>
                      <span className="font-arcade mt-1 w-full truncate text-center text-[11px] uppercase">
                        {bg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Untere Aktionsleiste: EXIT & OK */}
          <div className="flex w-full items-center justify-center gap-3 pt-2">
            <CrystalButton size="md" variant="secondary" tilt="right" onClick={onClose}>
              EXIT
            </CrystalButton>
            <CrystalButton size="md" tilt="left" onClick={handleSave} className="min-w-[130px]">
              OK
            </CrystalButton>
          </div>
        </CrystalPanel>
      </div>
    </div>
  );
}

export default AvatarCustomizerModal;
