import { useState } from 'react';
import { Check, Dices, Paintbrush, X } from 'lucide-react';
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
import { CustomAvatarCreatorModal } from './CustomAvatarCreatorModal';
import { generateUniquePlayerName } from '../utils/nameGenerator';
import {
  deleteCustomAvatar,
  getCustomAvatars,
  validatePlayerName,
  type CustomAvatar,
} from '../utils/userProfile';

interface AvatarCustomizerModalProps {
  onClose: () => void;
  config: AvatarConfig;
  /** Aktueller Spielername aus dem bestehenden Nutzerprofil */
  name: string;
  /** Speichert Name und Avatar gemeinsam über das bestehende Nutzerprofil-System */
  onSave: (profile: { avatar: AvatarConfig; name: string }) => void;
}

type TabType = 'base' | 'skin' | 'hat' | 'accessory' | 'bg';

/**
 * Zentrale Profil-Verwaltung: Spielername + Avatar-Anpassung in einem Crystal-Panel.
 * Wird nur gemountet, solange es geöffnet ist – der Entwurf startet dadurch immer
 * mit dem aktuell gespeicherten Profil.
 */
export function AvatarCustomizerModal({
  onClose,
  config,
  name,
  onSave,
}: AvatarCustomizerModalProps) {
  const [current, setCurrent] = useState<AvatarConfig>(() => ({ ...DEFAULT_AVATAR, ...config }));
  const [activeTab, setActiveTab] = useState<TabType>('base');
  const [nameInput, setNameInput] = useState(name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [customAvatars, setCustomAvatars] = useState<CustomAvatar[]>(() => getCustomAvatars());
  const [showCreator, setShowCreator] = useState(false);

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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setNameInput(raw);
    const validation = validatePlayerName(raw);
    setNameError(validation.valid ? null : validation.error || 'Ungültiger Name');
  };

  const handleRollNewName = () => {
    setNameInput(generateUniquePlayerName());
    setNameError(null);
  };

  const handleSave = () => {
    const validation = validatePlayerName(nameInput);
    if (!validation.valid) {
      setNameError(validation.error || 'Ungültiger Name');
      return;
    }
    onSave({ avatar: current, name: validation.cleaned });
    onClose();
  };

  const optionCardClass = (isSelected: boolean) =>
    `min-w-0 w-full flex flex-col items-center p-2.5 border-[3px] transition-transform cursor-pointer active:scale-95 ${
      isSelected
        ? 'bg-[#4F46E5] border-[#312E81] text-white shadow-[inset_0_2px_0_#A5B4FC,0_3px_0_rgba(15,23,42,0.28)]'
        : 'bg-[#F8FAFC] hover:bg-[#FFFFFF] border-[#334155] text-[#1E293B] shadow-[inset_0_2px_0_#FFFFFF]'
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profil & Avatar anpassen"
      className="fixed inset-0 min-h-dvh z-60 flex items-center justify-center overflow-y-auto overflow-x-hidden p-3 sm:p-4 bg-[#0F172A]/80 backdrop-blur-xs animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tablet-modal-box my-auto w-full max-w-lg landscape:max-w-2xl pt-3 landscape:pt-0 flex flex-col"
      >
        <CrystalPanel topTabLabel="PROFIL" accent="indigo" contentClassName="w-full gap-3.5 landscape:gap-2 p-4 sm:p-5 landscape:p-2.5">
          {/* Hauptinhalt: In Portrait vertikal, in Landscape 2-spaltig nebeneinander */}
          <div className="flex flex-col landscape:flex-row landscape:items-center landscape:gap-5 w-full gap-3.5 sm:gap-4">
            {/* Linke Seite: Vorschau, Würfel, Spielername & Aktions-Buttons im Querformat */}
            <div className="flex flex-col items-center justify-center landscape:w-52 shrink-0 gap-3 landscape:gap-2">
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <div className="rounded-full drop-shadow-[0_5px_0_rgba(15,23,42,0.3)]">
                  <Avatar config={current} size={74} className="landscape:w-[60px] landscape:h-[60px]" />
                </div>
                <CrystalIconButton
                  size="md"
                  variant="amber"
                  tilt="right"
                  onClick={handleRandomize}
                  title="Zufälliger Avatar"
                  aria-label="Zufälligen Avatar würfeln"
                >
                  <Dices className="h-5 w-5 text-[#0F172A] stroke-[2.4]" />
                </CrystalIconButton>
              </div>

              {/* Spielername direkt unter dem Avatar – Teil des persönlichen Profils */}
              <div className="w-full flex flex-col items-center">
                <label
                  htmlFor="player-profile-name-input"
                  className="font-arcade mb-1 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#334155] uppercase"
                >
                  SPIELERNAME
                </label>
                <div className="flex items-stretch gap-1.5 w-full max-w-[290px] justify-center">
                  <div
                    style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                    className="flex-1 min-w-0 bg-[#334155] p-[2.5px] shadow-[0_3px_0_rgba(15,23,42,0.16)]"
                  >
                    <input
                      id="player-profile-name-input"
                      type="text"
                      value={nameInput}
                      onChange={handleNameChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSave();
                        }
                      }}
                      maxLength={20}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Spielername eingeben..."
                      aria-invalid={Boolean(nameError)}
                      aria-describedby={nameError ? 'player-profile-name-error' : undefined}
                      style={{
                        clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)',
                        paddingInline: '14px',
                      }}
                      className={`font-arcade h-9 sm:h-10 landscape:h-8 w-full bg-[#F8FAFC] border-2 ${
                        nameError ? 'border-[#E11D48]' : 'border-[#CBD5E1] focus:border-[#4F46E5]'
                      } px-3 text-center text-sm landscape:text-xs font-bold tracking-wider text-[#0F172A] placeholder:text-[#64748B] uppercase focus:outline-none caret-[#4F46E5]`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRollNewName}
                    title="Zufälligen Spielernamen generieren"
                    aria-label="Zufälligen Spielernamen generieren"
                    style={{ clipPath: 'polygon(4% 0%, 100% 6%, 96% 100%, 0% 94%)' }}
                    className="flex w-9 sm:w-10 landscape:w-8 items-center justify-center bg-[#78350F] p-[2.5px] shadow-[0_3px_0_rgba(15,23,42,0.25)] active:scale-95 cursor-pointer shrink-0"
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
                  <span
                    id="player-profile-name-error"
                    role="alert"
                    className="font-arcade mt-1 text-center text-xs text-[#E11D48] uppercase"
                  >
                    {nameError}
                  </span>
                )}
              </div>

              {/* Aktions-Buttons direkt links im Querformat */}
              <div className="hidden landscape:flex flex-col gap-1.5 w-full pt-1">
                <CrystalButton size="sm" tilt="left" onClick={handleSave} fullWidth>
                  SPEICHERN
                </CrystalButton>
                <CrystalButton size="sm" variant="secondary" tilt="right" onClick={onClose} fullWidth>
                  ABBRECHEN
                </CrystalButton>
              </div>
            </div>

            {/* Rechte Seite: Tabs & Auswahl-Gitter */}
            <div className="flex flex-1 min-w-0 flex-col gap-2.5 sm:gap-3 w-full">
              {/* Kategorie-Tabs als abgeschrägte Crystal-Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 landscape:gap-1.5 w-full pb-0.5">
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
                    variant={activeTab === tab.id ? 'indigo' : 'secondary'}
                    onClick={() => setActiveTab(tab.id)}
                    className="landscape:h-7 landscape:px-2.5 landscape:text-xs min-w-[56px] sm:min-w-[62px]"
                  >
                    {tab.label}
                  </CrystalButton>
                ))}
              </div>

              {/* Auswahl-Gitter */}
              <div className="w-full max-h-[36dvh] sm:max-h-[38dvh] landscape:max-h-[30dvh] overflow-y-auto px-1 py-1">
            {activeTab === 'base' && (
              <div className="flex flex-col gap-2.5 sm:gap-3">
                <CrystalButton
                  size="sm"
                  variant="indigo"
                  fullWidth
                  onClick={() => setShowCreator(true)}
                  className="h-9 sm:h-10"
                >
                  <Paintbrush className="h-4 w-4 shrink-0" />
                  <span>EIGENEN AVATAR ERSTELLEN</span>
                </CrystalButton>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {customAvatars.map((ca) => {
                    const isSelected =
                      current.base === 'custom' && current.customId === ca.id;
                    return (
                      <div key={ca.id} className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrent({
                              ...current,
                              base: 'custom',
                              customImage: ca.imageData,
                              customId: ca.id,
                              skinColor: ca.skinColor,
                            })
                          }
                          className={optionCardClass(isSelected)}
                        >
                          <Avatar
                            config={{
                              ...current,
                              base: 'custom',
                              customImage: ca.imageData,
                              skinColor: ca.skinColor,
                            }}
                            size={44}
                          />
                          <span className="font-arcade mt-1 w-full truncate text-center text-xs uppercase">
                            {ca.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const remaining = deleteCustomAvatar(ca.id);
                            setCustomAvatars(remaining);
                            if (current.base === 'custom' && current.customId === ca.id) {
                              setCurrent({
                                ...current,
                                base: 'human',
                                customImage: undefined,
                                customId: undefined,
                              });
                            }
                          }}
                          title={`Avatar "${ca.name}" löschen`}
                          aria-label={`Avatar ${ca.name} löschen`}
                          className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#334155] bg-[#F8FAFC] text-[#E11D48] shadow-xs hover:bg-[#FEE2E2] cursor-pointer"
                        >
                          <X className="h-3 w-3 stroke-[2.8]" />
                        </button>
                      </div>
                    );
                  })}

                  {AVATAR_BASES.map((b) => {
                    const isSelected = current.base === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() =>
                          setCurrent({
                            ...current,
                            base: b.id,
                            customImage: undefined,
                            customId: undefined,
                          })
                        }
                        className={optionCardClass(isSelected)}
                      >
                        <Avatar
                          config={{
                            ...current,
                            base: b.id,
                            customImage: undefined,
                          }}
                          size={44}
                        />
                        <span className="font-arcade mt-1 w-full truncate text-center text-xs uppercase">
                          {b.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'skin' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
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
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
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
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
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
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
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
        </div>
      </div>

      {/* Untere Aktionsleiste in Portrait: ABBRECHEN & SPEICHERN */}
      <div className="flex landscape:hidden w-full items-center justify-center gap-3.5 sm:gap-4 pt-3 sm:pt-4">
        <CrystalButton size="md" variant="secondary" tilt="right" onClick={onClose} className="min-w-[130px]">
          ABBRECHEN
        </CrystalButton>
        <CrystalButton size="md" tilt="left" onClick={handleSave} className="min-w-[145px]">
          SPEICHERN
        </CrystalButton>
      </div>
        </CrystalPanel>
      </div>

      {showCreator && (
        <CustomAvatarCreatorModal
          initialSkinColor={current.skinColor}
          initialBg={current.bg}
          onCancel={() => setShowCreator(false)}
          onSave={(created) => {
            setCustomAvatars(getCustomAvatars());
            setCurrent({
              ...current,
              base: 'custom',
              customImage: created.imageData,
              customId: created.id,
              skinColor: created.skinColor,
            });
            setShowCreator(false);
          }}
        />
      )}
    </div>
  );
}

export default AvatarCustomizerModal;
