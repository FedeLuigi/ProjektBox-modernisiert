import { type ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp, Crown, Lock } from 'lucide-react';
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
  onUpdate,
}: LobbyGameSettingsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

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
          ? 'w-full border-b border-white/15 overflow-visible'
          : 'w-full rounded-xl border border-white/15 bg-white/[0.04] overflow-hidden'
      }
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
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

      {isOpen && (
        <div className="px-3 sm:px-4 pb-3 pt-2.5 space-y-2.5 border-t border-white/12 animate-fade-in">
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
