import { useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Dices, Paintbrush, X } from 'lucide-react';
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
import { OpenButton, OpenModalFrame } from './OpenSubpageUI';
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
  const [page, setPage] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [nameInput, setNameInput] = useState(name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [customAvatars, setCustomAvatars] = useState<CustomAvatar[]>(() => getCustomAvatars());
  const [showCreator, setShowCreator] = useState(false);

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
    `min-w-0 w-full h-[76px] sm:h-[82px] landscape:h-[68px] flex flex-col items-center justify-center rounded-xl py-1.5 px-1.5 landscape:py-1 landscape:px-1 border transition-all cursor-pointer active:scale-95 ${
      isSelected
        ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#FDE68A] shadow-[0_0_18px_rgba(245,158,11,0.2)]'
        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/15 text-white/85 hover:text-white'
    }`;

  const ITEMS_PER_PAGE = 6; // Exakt 2 Reihen × 3 Spalten

  // Berechnet Seiteninhalt für das aktive 2×3-Raster
  const paginate = <T,>(items: T[]) => {
    const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    const safePage = Math.min(page, totalPages - 1);
    const start = safePage * ITEMS_PER_PAGE;
    return {
      slice: items.slice(start, start + ITEMS_PER_PAGE),
      totalPages,
      safePage,
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch) {
      swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>, totalPages: number) => {
    if (!swipeStartRef.current || totalPages <= 1) {
      swipeStartRef.current = null;
      return;
    }
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - swipeStartRef.current.x;
    const dy = touch.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        setPage((p) => Math.min(totalPages - 1, p + 1));
      } else {
        setPage((p) => Math.max(0, p - 1));
      }
    }
  };

  const renderPager = (safePage: number, totalPages: number) => (
    <div className="flex h-7 shrink-0 items-center justify-center gap-2.5">
      <button
        type="button"
        disabled={safePage === 0}
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        aria-label="Vorherige Ansicht"
        className="flex h-6 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/[0.06] text-white cursor-pointer active:scale-95 hover:bg-white/15 disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <ChevronLeft className="h-4 w-4 stroke-[2.6]" />
      </button>
      <span className="font-arcade text-xs text-[#94A3B8] min-w-[36px] text-center">
        {safePage + 1} / {totalPages}
      </span>
      <button
        type="button"
        disabled={safePage >= totalPages - 1}
        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        aria-label="Nächste Ansicht"
        className="flex h-6 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/[0.06] text-white cursor-pointer active:scale-95 hover:bg-white/15 disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <ChevronRight className="h-4 w-4 stroke-[2.6]" />
      </button>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profil & Avatar anpassen"
      className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto overflow-x-hidden overscroll-contain pt-[max(12px,env(safe-area-inset-top,0px))] pb-[max(12px,env(safe-area-inset-bottom,0px))] pl-[max(10px,env(safe-area-inset-left,0px))] pr-[max(10px,env(safe-area-inset-right,0px))] sm:p-4 bg-[#0F172A]/80 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        inert={showCreator}
        aria-hidden={showCreator}
        className={`tablet-modal-box my-auto w-full max-w-xl landscape:max-w-3xl flex flex-col ${
          showCreator ? 'pointer-events-none' : ''
        }`}
      >
        <OpenModalFrame
          title="SPIELER"
          accentWord="PROFIL"
          onClose={onClose}
          contentClassName="w-full gap-2.5 sm:gap-3.5 landscape:gap-2 p-3.5 sm:p-5 landscape:p-3"
        >
          {/* Hauptinhalt: In Portrait vertikal, in Landscape 2-spaltig nebeneinander */}
          <div className="flex flex-col landscape:flex-row landscape:items-center landscape:gap-5 w-full gap-3 sm:gap-4">
            {/* Linke Seite: Zentrierte Avatar-Vorschau, Spielername & Aktions-Buttons im Querformat */}
            <div className="flex flex-col items-center justify-center landscape:w-52 shrink-0 gap-2.5 landscape:gap-2">
              <div className="flex w-full items-center justify-center">
                <div className="flex items-center justify-center rounded-full ring-2 ring-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                  <Avatar config={current} size={68} className="sm:w-[76px] sm:h-[76px] landscape:w-[60px] landscape:h-[60px]" />
                </div>
              </div>

              {/* Spielername direkt unter dem Avatar – Teil des persönlichen Profils */}
              <div className="w-full flex flex-col items-center">
                <label
                  htmlFor="player-profile-name-input"
                  className="font-arcade mb-1.5 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#94A3B8] uppercase"
                >
                  SPIELERNAME
                </label>
                <div className="grid w-full grid-cols-[38px_minmax(0,228px)_38px] sm:grid-cols-[42px_minmax(0,260px)_42px] landscape:grid-cols-[34px_minmax(0,1fr)_34px] items-stretch justify-center gap-1.5">
                  <div aria-hidden="true" />

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
                    className={`font-sans h-9 sm:h-10 landscape:h-8 w-full min-w-0 rounded-xl border bg-white/[0.06] ${
                      nameError ? 'border-[#FDA4AF]' : 'border-white/20 focus:border-[#F59E0B]'
                    } px-3 text-center text-sm sm:text-base landscape:text-xs font-bold tracking-wide text-white placeholder:text-white/40 focus:bg-white/[0.09] focus:outline-none caret-[#FBBF24]`}
                  />

                  <button
                    type="button"
                    onClick={handleRollNewName}
                    title="Zufälligen Spielernamen generieren"
                    aria-label="Zufälligen Spielernamen generieren"
                    className="flex w-full items-center justify-center rounded-xl border border-[#F59E0B]/60 bg-[#F59E0B]/15 text-[#FDE68A] hover:bg-[#F59E0B]/25 transition-colors active:scale-95 cursor-pointer"
                  >
                    <Dices className="h-4 w-4 stroke-[2.4]" />
                  </button>
                </div>

                {nameError && (
                  <span
                    id="player-profile-name-error"
                    role="alert"
                    className="font-arcade mt-1 text-center text-xs text-[#FDA4AF] uppercase"
                  >
                    {nameError}
                  </span>
                )}
              </div>

              {/* Aktions-Buttons direkt links im Querformat */}
              <div className="hidden landscape:flex flex-col gap-1.5 w-full pt-1">
                <OpenButton size="sm" variant="primary" onClick={handleSave} fullWidth>
                  SPEICHERN
                </OpenButton>
                <OpenButton size="sm" variant="secondary" onClick={onClose} fullWidth>
                  ABBRECHEN
                </OpenButton>
              </div>
            </div>

            {/* Rechte Seite: Tabs & Auswahl-Gitter (kompakt & ohne Scrollleiste) */}
            <div className="flex flex-1 min-w-0 flex-col gap-2.5 w-full">
              {/* Kategorie-Tabs im Open-Gallery-Underline-Stil */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 w-full border-b border-white/12 pb-0.5">
                {(
                  [
                    { id: 'base', label: 'FIGUR' },
                    { id: 'skin', label: 'FARBE' },
                    { id: 'hat', label: 'HUT' },
                    { id: 'accessory', label: 'BRILLE' },
                    { id: 'bg', label: 'AURA' },
                  ] as const
                ).map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setPage(0);
                      }}
                      className={`font-arcade relative pb-1.5 text-xs sm:text-sm tracking-wider uppercase transition-colors cursor-pointer ${
                        active ? 'text-[#FDE68A]' : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {active && (
                        <span className="absolute right-0 bottom-0 left-0 h-[3px] rounded-full bg-[#F59E0B] shadow-[0_0_10px_#F59E0B]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Einheitlicher 2×3-Auswahlbereich (immer max. 6 Elemente in 2 Reihen, kein Scrollen, kein Überlappen) */}
              <div className="flex w-full flex-col gap-2 touch-pan-y">
            {activeTab === 'base' && (() => {
              const allBaseItems = [
                ...customAvatars.map((ca) => ({ kind: 'custom' as const, data: ca })),
                ...AVATAR_BASES.map((b) => ({ kind: 'preset' as const, data: b })),
              ];
              const { slice, totalPages, safePage } = paginate(allBaseItems);
              return (
                <div
                  className="flex flex-col gap-2"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, totalPages)}
                >
                  <div className="grid grid-cols-3 grid-rows-2 gap-2">
                    {slice.map((entry) => {
                      if (entry.kind === 'custom') {
                        const ca = entry.data;
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
                                size={34}
                                className="sm:w-[38px] sm:h-[38px] landscape:w-[30px] landscape:h-[30px]"
                              />
                              <span className="font-arcade mt-1 w-full truncate text-center text-[10px] sm:text-[11px] leading-tight uppercase">
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
                      }

                      const b = entry.data;
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
                            size={34}
                            className="sm:w-[38px] sm:h-[38px] landscape:w-[30px] landscape:h-[30px]"
                          />
                          <span className="font-arcade mt-1 w-full truncate text-center text-[10px] sm:text-[11px] leading-tight uppercase">
                            {b.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {renderPager(safePage, totalPages)}
                </div>
              );
            })()}

            {activeTab === 'skin' && (() => {
              const { slice, totalPages, safePage } = paginate(AVATAR_SKIN_COLORS);
              return (
                <div
                  className="flex flex-col gap-2"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, totalPages)}
                >
                  <div className="grid grid-cols-3 grid-rows-2 gap-2">
                    {slice.map((s) => {
                      const isSelected = current.skinColor === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setCurrent({ ...current, skinColor: s.id })}
                          className={optionCardClass(isSelected)}
                        >
                          <div
                            className="h-7 w-7 sm:h-8 sm:w-8 landscape:h-6 landscape:w-6 shrink-0 border-2 border-[#17608E] flex items-center justify-center"
                            style={{ backgroundColor: s.id }}
                          >
                            {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
                          </div>
                          <span className="font-arcade mt-1 w-full truncate text-center text-[10px] sm:text-[11px] leading-tight uppercase">
                            {s.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {renderPager(safePage, totalPages)}
                </div>
              );
            })()}

            {activeTab === 'hat' && (() => {
              const { slice, totalPages, safePage } = paginate(AVATAR_HATS);
              return (
                <div
                  className="flex flex-col gap-2"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, totalPages)}
                >
                  <div className="grid grid-cols-3 grid-rows-2 gap-2">
                    {slice.map((h) => {
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
                            size={34}
                            className="sm:w-[38px] sm:h-[38px] landscape:w-[30px] landscape:h-[30px]"
                          />
                          <span className="font-arcade mt-1 w-full truncate text-center text-[10px] sm:text-[11px] leading-tight uppercase">
                            {h.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {renderPager(safePage, totalPages)}
                </div>
              );
            })()}

            {activeTab === 'accessory' && (() => {
              const { slice, totalPages, safePage } = paginate(AVATAR_ACCESSORIES);
              return (
                <div
                  className="flex flex-col gap-2"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, totalPages)}
                >
                  <div className="grid grid-cols-3 grid-rows-2 gap-2">
                    {slice.map((acc) => {
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
                            size={34}
                            className="sm:w-[38px] sm:h-[38px] landscape:w-[30px] landscape:h-[30px]"
                          />
                          <span className="font-arcade mt-1 w-full truncate text-center text-[10px] sm:text-[11px] leading-tight uppercase">
                            {acc.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {renderPager(safePage, totalPages)}
                </div>
              );
            })()}

            {activeTab === 'bg' && (() => {
              const { slice, totalPages, safePage } = paginate(AVATAR_BGS);
              return (
                <div
                  className="flex flex-col gap-2"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, totalPages)}
                >
                  <div className="grid grid-cols-3 grid-rows-2 gap-2">
                    {slice.map((bg) => {
                      const isSelected = current.bg === bg.id;
                      return (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => setCurrent({ ...current, bg: bg.id })}
                          className={optionCardClass(isSelected)}
                        >
                          <div
                            className="h-7 w-7 sm:h-8 sm:w-8 landscape:h-6 landscape:w-6 shrink-0 border-2 border-[#17608E] flex items-center justify-center"
                            style={{
                              backgroundImage: `linear-gradient(to top right, ${bg.from}, ${bg.to})`,
                            }}
                          >
                            {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
                          </div>
                          <span className="font-arcade mt-1 w-full truncate text-center text-[10px] sm:text-[11px] leading-tight uppercase">
                            {bg.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {renderPager(safePage, totalPages)}
                </div>
              );
            })()}
          </div>

          {/* „Eigenen Avatar erstellen“ unterhalb der Auswahlmöglichkeiten */}
          <OpenButton
            size="sm"
            variant="outline-amber"
            fullWidth
            onClick={() => setShowCreator(true)}
            className="h-9 sm:h-10 landscape:h-8"
          >
            <Paintbrush className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-sm landscape:text-xs">EIGENEN AVATAR ERSTELLEN</span>
          </OpenButton>
        </div>
      </div>

      {/* Untere Aktionsleiste in Portrait: ABBRECHEN & SPEICHERN */}
      <div className="flex landscape:hidden w-full items-center justify-center gap-3.5 sm:gap-4 pt-2 sm:pt-3">
        <OpenButton size="md" variant="secondary" onClick={onClose} className="min-w-[130px]">
          ABBRECHEN
        </OpenButton>
        <OpenButton size="md" variant="primary" onClick={handleSave} className="min-w-[145px]">
          SPEICHERN
        </OpenButton>
      </div>
        </OpenModalFrame>
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
