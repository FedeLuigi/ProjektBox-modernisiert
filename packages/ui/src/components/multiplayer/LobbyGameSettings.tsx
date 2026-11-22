import { type ReactNode, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Crown, Lock } from 'lucide-react';
import {
  CASINO_BALANCE_OPTIONS,
  CASINO_DURATION_OPTIONS,
  DRAW_AND_GUESS_CATEGORIES as CATEGORIES,
  DURATION_OPTIONS,
  POKER_BLIND_OPTIONS,
  POKER_HAND_OPTIONS,
  ROUND_OPTIONS,
  ROULETTE_ROUND_OPTIONS,
  STADT_LAND_FLUSS_PRESETS,
} from '@projektbox/shared/utils';
import { OpenButton } from '../OpenSubpageUI';

interface LobbyGameSettingsProps {
  gameId: string;
  settings?: Record<string, any>;
  isHost: boolean;
  frameless?: boolean;
  hideRoleBadge?: boolean;
  defaultOpen?: boolean;
  alwaysOpen?: boolean;
  onUpdate: (newSettings: Record<string, any>) => void;
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[136px_1fr] items-start sm:items-center gap-2">
      <span className="font-arcade text-xs text-[#94A3B8] uppercase">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">{children}</div>
    </div>
  );
}

function OnOffButtons({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <>
      <OpenButton
        size="sm"
        disabled={disabled}
        variant={enabled ? 'primary' : 'secondary'}
        onClick={() => onChange(true)}
      >
        AN
      </OpenButton>
      <OpenButton
        size="sm"
        disabled={disabled}
        variant="secondary"
        className={
          !enabled
            ? '!border-slate-300/60 !bg-slate-600/85 !text-white shadow-[0_4px_12px_rgba(15,23,42,0.35)]'
            : '!text-white/60'
        }
        onClick={() => onChange(false)}
      >
        AUS
      </OpenButton>
    </>
  );
}

const SLF_PRESETS = (['klassisch', 'party', 'bunt'] as const).map((id) => ({
  id,
  ...STADT_LAND_FLUSS_PRESETS[id],
}));

export function LobbyGameSettings({
  gameId,
  settings,
  isHost,
  frameless = false,
  hideRoleBadge = false,
  defaultOpen = false,
  alwaysOpen = false,
  onUpdate,
}: LobbyGameSettingsProps) {
  const [isOpenState, setIsOpenState] = useState(defaultOpen);
  const isOpen = alwaysOpen || isOpenState;

  const isDrawAndGuess = gameId === 'draw-and-guess';
  const isStadtLandFluss = gameId === 'stadt-land-fluss';
  const isRoulette = gameId === 'roulette';
  const isPoker = gameId === 'texas-holdem';
  const rounds =
    typeof settings?.rounds === 'number'
      ? settings.rounds
      : isPoker
        ? 10
        : isRoulette
          ? 5
          : 3;
  const roundDuration =
    typeof settings?.roundDuration === 'number'
      ? settings.roundDuration
      : isRoulette || isPoker
        ? 30
        : 60;
  const startingBalance =
    typeof settings?.startingBalance === 'number' ? settings.startingBalance : 1000;
  const smallBlind = typeof settings?.smallBlind === 'number' ? settings.smallBlind : 10;
  const customWordsEnabled = settings?.customWordsEnabled === true;
  const category = settings?.category || 'Alle';
  const stopButtonEnabled = settings?.stopButtonEnabled !== false;
  const categoryPreset = settings?.categoryPreset || 'klassisch';

  const handleSetRounds = (val: number) => {
    if (!isHost) return;
    onUpdate({ ...settings, rounds: val });
  };

  const handleSetDuration = (val: number) => {
    if (!isHost) return;
    onUpdate({ ...settings, roundDuration: val });
  };

  const handleSetCustomWordsEnabled = (val: boolean) => {
    if (!isHost) return;
    onUpdate({ ...settings, customWordsEnabled: val });
  };

  const handleSetCategory = (cat: string) => {
    if (!isHost) return;
    onUpdate({ ...settings, category: cat });
  };

  const handleSetStopButton = (val: boolean) => {
    if (!isHost) return;
    onUpdate({ ...settings, stopButtonEnabled: val });
  };

  const handleSetPreset = (presetId: string) => {
    if (!isHost) return;
    onUpdate({ ...settings, categoryPreset: presetId });
  };

  const handleSetStartingBalance = (val: number) => {
    if (!isHost) return;
    onUpdate({ ...settings, startingBalance: val });
  };

  const handleSetSmallBlind = (val: number) => {
    if (!isHost) return;
    onUpdate({ ...settings, smallBlind: val });
  };

  const activePresetLabel =
    SLF_PRESETS.find((p) => p.id === categoryPreset)?.label || 'KLASSISCH';

  const summaryText = isDrawAndGuess
    ? `${rounds} RUNDEN • ${roundDuration}S • ${
        customWordsEnabled ? 'EIGENE WÖRTER AN' : `EIGENE WÖRTER AUS • ${category}`
      }`
    : isStadtLandFluss
      ? `${rounds} RUNDEN • ${roundDuration}S • ${stopButtonEnabled ? 'STOPP AN' : 'STOPP AUS'} • ${
          customWordsEnabled ? 'EIGENE WÖRTER AN' : activePresetLabel
        }`
      : isRoulette
        ? `${rounds} RUNDEN • ${roundDuration}S • START ${startingBalance.toLocaleString('de-DE')} €`
        : isPoker
          ? `${rounds} HÄNDE • ${roundDuration}S • BLINDS ${smallBlind}/${smallBlind * 2} • ${startingBalance.toLocaleString('de-DE')} €`
          : `${rounds === 1 ? '1 RUNDE' : `BEST OF ${rounds}`}`;

  return (
    <div
      className={
        frameless
          ? alwaysOpen
            ? 'w-full overflow-visible'
            : 'w-full border-b border-white/15 overflow-visible'
          : 'w-full rounded-xl border border-white/15 bg-white/[0.04] overflow-hidden'
      }
    >
      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => setIsOpenState((prev) => !prev)}
          className={`w-full flex items-center justify-between transition-colors cursor-pointer select-none text-left ${
            frameless
              ? 'rounded-lg px-2 py-2.5 hover:bg-white/[0.05]'
              : 'px-4 py-2.5 hover:bg-white/[0.05]'
          }`}
          aria-expanded={isOpen}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-arcade text-sm tracking-wider text-white uppercase">
                OPTIONEN
              </span>
              {!hideRoleBadge &&
                (isHost ? (
                  <span className="font-arcade inline-flex items-center gap-1 rounded-md border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] text-[#FDE68A]">
                    <Crown className="h-2.5 w-2.5 fill-current" />
                    <span>HOST</span>
                  </span>
                ) : (
                  <span className="font-arcade inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-[#94A3B8]">
                    <Lock className="h-2.5 w-2.5" />
                    <span>NUR HOST</span>
                  </span>
                ))}
            </div>
            {!isOpen && (
              <p className="font-arcade text-[11px] sm:text-xs text-[#94A3B8] leading-snug mt-0.5 uppercase">
                {summaryText}
              </p>
            )}
          </div>

          <div className="font-arcade inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/85 uppercase shrink-0">
            <span>{isOpen ? 'ZUKLAPPEN' : 'ANPASSEN'}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
      )}

      {isOpen && (
        <div
          className={
            alwaysOpen
              ? 'space-y-3 animate-fade-in'
              : 'px-3 sm:px-4 pb-3 pt-2.5 space-y-2.5 border-t border-white/12 animate-fade-in'
          }
        >
          {isDrawAndGuess ? (
            <>
              <SettingRow label="RUNDEN">
                {ROUND_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={rounds === opt ? 'amber' : 'secondary'}
                    onClick={() => handleSetRounds(opt)}
                  >
                    {opt}
                  </OpenButton>
                ))}
              </SettingRow>

              <SettingRow label="ZEIT">
                {DURATION_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={roundDuration === opt ? 'amber' : 'secondary'}
                    onClick={() => handleSetDuration(opt)}
                  >
                    {opt}S
                  </OpenButton>
                ))}
              </SettingRow>

              <SettingRow label="EIGENE WÖRTER">
                <OnOffButtons
                  enabled={customWordsEnabled}
                  disabled={!isHost}
                  onChange={handleSetCustomWordsEnabled}
                />
              </SettingRow>

              {!customWordsEnabled && (
                <SettingRow label="KATEGORIE">
                  {CATEGORIES.map((cat) => (
                    <OpenButton
                      key={cat}
                      size="sm"
                      disabled={!isHost}
                      variant={
                        category.toLowerCase() === cat.toLowerCase() ? 'amber' : 'secondary'
                      }
                      onClick={() => handleSetCategory(cat)}
                    >
                      {cat}
                    </OpenButton>
                  ))}
                </SettingRow>
              )}
            </>
          ) : isStadtLandFluss ? (
            <>
              <SettingRow label="RUNDEN">
                {ROUND_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={rounds === opt ? 'amber' : 'secondary'}
                    onClick={() => handleSetRounds(opt)}
                  >
                    {opt}
                  </OpenButton>
                ))}
              </SettingRow>

              <SettingRow label="ZEIT">
                {DURATION_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={roundDuration === opt ? 'amber' : 'secondary'}
                    onClick={() => handleSetDuration(opt)}
                  >
                    {opt}S
                  </OpenButton>
                ))}
              </SettingRow>

              <SettingRow label="STOPP-KNOPF">
                <OnOffButtons
                  enabled={stopButtonEnabled}
                  disabled={!isHost}
                  onChange={handleSetStopButton}
                />
              </SettingRow>

              <SettingRow label="EIGENE WÖRTER">
                <OnOffButtons
                  enabled={customWordsEnabled}
                  disabled={!isHost}
                  onChange={handleSetCustomWordsEnabled}
                />
              </SettingRow>

              {customWordsEnabled ? (
                <p className="font-arcade text-[10px] text-[#6EE7B7] uppercase pt-0.5 sm:text-right">
                  REIHUM WÄHLT VOR JEDER RUNDE EIN SPIELER EIGENE KATEGORIEN
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <SettingRow label="KATEGORIEN">
                    {SLF_PRESETS.map((preset) => (
                      <OpenButton
                        key={preset.id}
                        size="sm"
                        disabled={!isHost}
                        variant={categoryPreset === preset.id ? 'amber' : 'secondary'}
                        onClick={() => handleSetPreset(preset.id)}
                      >
                        {preset.label}
                      </OpenButton>
                    ))}
                  </SettingRow>
                  <p className="font-arcade text-[10px] text-[#94A3B8] uppercase pt-0.5 sm:text-right">
                    {SLF_PRESETS.find((p) => p.id === categoryPreset)?.preview}
                  </p>
                </div>
              )}
            </>
          ) : isRoulette ? (
            <>
              <SettingRow label="RUNDEN">
                {ROULETTE_ROUND_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={rounds === opt ? 'amber' : 'secondary'}
                    onClick={() => handleSetRounds(opt)}
                  >
                    {opt}
                  </OpenButton>
                ))}
              </SettingRow>

              <SettingRow label="SETZZEIT">
                {CASINO_DURATION_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={roundDuration === opt ? 'amber' : 'secondary'}
                    onClick={() => handleSetDuration(opt)}
                  >
                    {opt}S
                  </OpenButton>
                ))}
              </SettingRow>

              <SettingRow label="STARTGUTHABEN">
                {CASINO_BALANCE_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={startingBalance === opt ? 'primary' : 'secondary'}
                    onClick={() => handleSetStartingBalance(opt)}
                  >
                    {opt.toLocaleString('de-DE')} €
                  </OpenButton>
                ))}
              </SettingRow>
            </>
          ) : isPoker ? (
            <>
              <SettingRow label="MAX HÄNDE">
                {POKER_HAND_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={rounds === opt ? 'amber' : 'secondary'}
                    onClick={() => handleSetRounds(opt)}
                  >
                    {opt}
                  </OpenButton>
                ))}
              </SettingRow>

              <SettingRow label="ZUGZEIT">
                {CASINO_DURATION_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={roundDuration === opt ? 'amber' : 'secondary'}
                    onClick={() => handleSetDuration(opt)}
                  >
                    {opt}S
                  </OpenButton>
                ))}
              </SettingRow>

              <SettingRow label="BLINDS">
                {POKER_BLIND_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={smallBlind === opt ? 'amber' : 'secondary'}
                    onClick={() => handleSetSmallBlind(opt)}
                  >
                    {opt}/{opt * 2} €
                  </OpenButton>
                ))}
              </SettingRow>

              <SettingRow label="STARTGUTHABEN">
                {CASINO_BALANCE_OPTIONS.map((opt) => (
                  <OpenButton
                    key={opt}
                    size="sm"
                    disabled={!isHost}
                    variant={startingBalance === opt ? 'primary' : 'secondary'}
                    onClick={() => handleSetStartingBalance(opt)}
                  >
                    {opt.toLocaleString('de-DE')} €
                  </OpenButton>
                ))}
              </SettingRow>
            </>
          ) : (
            <SettingRow label="MODUS / RUNDEN">
              {[
                { val: 1, label: '1 RUNDE' },
                { val: 3, label: 'BEST OF 3' },
                { val: 5, label: 'BEST OF 5' },
              ].map(({ val, label }) => (
                <OpenButton
                  key={val}
                  size="sm"
                  disabled={!isHost}
                  variant={rounds === val ? 'primary' : 'secondary'}
                  onClick={() => handleSetRounds(val)}
                >
                  {label}
                </OpenButton>
              ))}
            </SettingRow>
          )}
        </div>
      )}
    </div>
  );
}

interface LobbyOptionsModalProps {
  isOpen: boolean;
  gameTitle?: string;
  gameId: string;
  settings?: Record<string, any>;
  isHost: boolean;
  onUpdate: (newSettings: Record<string, any>) => void;
  onClose: () => void;
}

/**
 * Vollbild-Menü für Spieloptionen im einheitlichen Design der App-Modals.
 */
export function LobbyOptionsModal({
  isOpen,
  gameTitle,
  gameId,
  settings,
  isHost,
  onUpdate,
  onClose,
}: LobbyOptionsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Spieloptionen"
      data-tv-scope="modal"
      onClick={onClose}
      className="fixed inset-0 z-50 flex w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0F172A]/88 pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(14px+env(safe-area-inset-bottom,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pt-[calc(28px+env(safe-area-inset-top,0px))] sm:pb-[calc(28px+env(safe-area-inset-bottom,0px))] sm:pl-[max(32px,env(safe-area-inset-left,0px))] sm:pr-[max(32px,env(safe-area-inset-right,0px))] backdrop-blur-md select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-1 min-h-0 w-full max-w-2xl flex-col justify-between"
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            data-tv-autofocus="true"
            onClick={onClose}
            className="font-arcade inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>ZURÜCK</span>
          </button>

          {!isHost && (
            <span className="font-arcade inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-[#94A3B8] uppercase">
              <Lock className="h-3 w-3" />
              <span>NUR HOST</span>
            </span>
          )}
        </div>

        <div className="my-auto mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-2 sm:px-6 py-4">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
              <h2 className="font-arcade text-xl sm:text-3xl tracking-wider text-white uppercase">
                SPIEL<span className="text-[#FBBF24]">OPTIONEN</span>
              </h2>
            </div>
            {gameTitle && (
              <p className="font-arcade text-xs sm:text-sm tracking-wider text-[#94A3B8] uppercase">
                {gameTitle}
              </p>
            )}
          </div>

          <LobbyGameSettings
            gameId={gameId}
            settings={settings}
            isHost={isHost}
            frameless={true}
            alwaysOpen={true}
            onUpdate={onUpdate}
          />

          <div className="pt-2 w-full sm:w-56">
            <OpenButton fullWidth size="md" variant="primary" onClick={onClose}>
              FERTIG
            </OpenButton>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
