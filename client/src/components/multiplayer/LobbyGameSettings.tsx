import { useState } from 'react';
import { ChevronDown, ChevronUp, Crown, Lock } from 'lucide-react';
import { OpenButton } from '../OpenSubpageUI';

interface LobbyGameSettingsProps {
  gameId: string;
  settings?: Record<string, any>;
  isHost: boolean;
  onUpdate: (newSettings: Record<string, any>) => void;
}

const CATEGORIES = ['Alle', 'Tiere', 'Essen', 'Fahrzeuge', 'Natur', 'Gegenstände'];
const SLF_PRESETS = [
  { id: 'klassisch', label: 'KLASSISCH', preview: 'Stadt • Land • Fluss • Tier • Name' },
  { id: 'party', label: 'PARTY-MIX', preview: 'Stadt • Land • Tier • Beruf • Essen' },
  { id: 'bunt', label: 'BUNT', preview: 'Stadt • Tier • Film • Marke • Gegenstand' },
] as const;
const ROUND_OPTIONS = [3, 5, 8];
const ROULETTE_ROUND_OPTIONS = [3, 5, 8, 10];
const DURATION_OPTIONS = [45, 60, 90];
const ROULETTE_DURATION_OPTIONS = [20, 30, 45];
const ROULETTE_BALANCE_OPTIONS = [500, 1000, 2500];

export function LobbyGameSettings({
  gameId,
  settings,
  isHost,
  onUpdate,
}: LobbyGameSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isDrawAndGuess = gameId === 'draw-and-guess';
  const isStadtLandFluss = gameId === 'stadt-land-fluss';
  const isRoulette = gameId === 'roulette';
  const rounds = typeof settings?.rounds === 'number' ? settings.rounds : isRoulette ? 5 : 3;
  const roundDuration =
    typeof settings?.roundDuration === 'number' ? settings.roundDuration : isRoulette ? 30 : 60;
  const startingBalance =
    typeof settings?.startingBalance === 'number' ? settings.startingBalance : 1000;
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

  const activePresetLabel =
    SLF_PRESETS.find((p) => p.id === categoryPreset)?.label || 'KLASSISCH';

  const summaryText = isDrawAndGuess
    ? `${rounds} RUNDEN • ${roundDuration}S • ${
        customWordsEnabled ? 'EIGENE WÖRTER AN' : `EIGENE WÖRTER AUS • ${category}`
      }`
    : isStadtLandFluss
      ? `${rounds} RUNDEN • ${roundDuration}S • ${stopButtonEnabled ? 'STOPP AN' : 'STOPP AUS'} • ${activePresetLabel}`
      : isRoulette
        ? `${rounds} RUNDEN • ${roundDuration}S • START ${startingBalance.toLocaleString('de-DE')} €`
        : `${rounds === 1 ? '1 RUNDE' : `BEST OF ${rounds}`}`;

  return (
    <div className="w-full rounded-xl border border-white/15 bg-white/[0.04] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.05] transition-colors cursor-pointer select-none text-left"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-arcade text-sm tracking-wider text-white uppercase">
              OPTIONEN
            </span>
            {isHost ? (
              <span className="font-arcade inline-flex items-center gap-1 rounded-md border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] text-[#FDE68A]">
                <Crown className="h-2.5 w-2.5 fill-current" />
                <span>HOST</span>
              </span>
            ) : (
              <span className="font-arcade inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-[#94A3B8]">
                <Lock className="h-2.5 w-2.5" />
                <span>NUR HOST</span>
              </span>
            )}
          </div>
          {!isOpen && (
            <p className="font-arcade text-xs text-[#94A3B8] truncate mt-0.5 uppercase">
              {summaryText}
            </p>
          )}
        </div>

        <div className="text-white/75 pl-2 shrink-0">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3 sm:px-4 pb-3 pt-2 space-y-2.5 border-t border-white/12 animate-fade-in">
          {isDrawAndGuess ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">RUNDEN</span>
                <div className="flex items-center gap-1.5 flex-wrap">
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
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">ZEIT</span>
                <div className="flex items-center gap-1.5 flex-wrap">
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
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">EIGENE WÖRTER</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <OpenButton
                    size="sm"
                    disabled={!isHost}
                    variant={customWordsEnabled ? 'primary' : 'secondary'}
                    onClick={() => handleSetCustomWordsEnabled(true)}
                  >
                    AN
                  </OpenButton>
                  <OpenButton
                    size="sm"
                    disabled={!isHost}
                    variant={!customWordsEnabled ? 'primary' : 'secondary'}
                    onClick={() => handleSetCustomWordsEnabled(false)}
                  >
                    AUS
                  </OpenButton>
                </div>
              </div>

              {!customWordsEnabled && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-arcade text-xs text-[#94A3B8] uppercase">KATEGORIE</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                  </div>
                </div>
              )}
            </>
          ) : isStadtLandFluss ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">RUNDEN</span>
                <div className="flex items-center gap-1.5 flex-wrap">
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
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">ZEIT</span>
                <div className="flex items-center gap-1.5 flex-wrap">
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
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">STOPP-KNOPF</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <OpenButton
                    size="sm"
                    disabled={!isHost}
                    variant={stopButtonEnabled ? 'primary' : 'secondary'}
                    onClick={() => handleSetStopButton(true)}
                  >
                    AN
                  </OpenButton>
                  <OpenButton
                    size="sm"
                    disabled={!isHost}
                    variant={!stopButtonEnabled ? 'primary' : 'secondary'}
                    onClick={() => handleSetStopButton(false)}
                  >
                    AUS
                  </OpenButton>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">KATEGORIEN</span>
                <div className="flex items-center gap-1.5 flex-wrap">
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
                </div>
                <p className="font-arcade text-[10px] text-[#94A3B8] uppercase pt-0.5">
                  {SLF_PRESETS.find((p) => p.id === categoryPreset)?.preview}
                </p>
              </div>
            </>
          ) : isRoulette ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">RUNDEN</span>
                <div className="flex items-center gap-1.5 flex-wrap">
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
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">SETZZEIT</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ROULETTE_DURATION_OPTIONS.map((opt) => (
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
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">STARTGUTHABEN</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ROULETTE_BALANCE_OPTIONS.map((opt) => (
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
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-arcade text-xs text-[#94A3B8] uppercase">MODUS / RUNDEN</span>
              <div className="flex items-center gap-1.5 flex-wrap">
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
