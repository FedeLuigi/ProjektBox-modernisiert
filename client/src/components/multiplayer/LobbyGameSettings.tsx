import { useState } from 'react';
import { ChevronDown, ChevronUp, Crown, Lock } from 'lucide-react';
import { CrystalButton } from '../CrystalUI';

interface LobbyGameSettingsProps {
  gameId: string;
  settings?: Record<string, any>;
  isHost: boolean;
  onUpdate: (newSettings: Record<string, any>) => void;
}

const CATEGORIES = ['Alle', 'Tiere', 'Essen', 'Fahrzeuge', 'Natur', 'Gegenstände'];
const ROUND_OPTIONS = [3, 5, 8];
const DURATION_OPTIONS = [45, 60, 90];

export function LobbyGameSettings({
  gameId,
  settings,
  isHost,
  onUpdate,
}: LobbyGameSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isDrawAndGuess = gameId === 'draw-and-guess';
  const rounds = typeof settings?.rounds === 'number' ? settings.rounds : 3;
  const roundDuration = typeof settings?.roundDuration === 'number' ? settings.roundDuration : 60;
  const hints = settings?.hints !== false;
  const category = settings?.category || 'Alle';

  const handleSetRounds = (val: number) => {
    if (!isHost) return;
    onUpdate({ ...settings, rounds: val });
  };

  const handleSetDuration = (val: number) => {
    if (!isHost) return;
    onUpdate({ ...settings, roundDuration: val });
  };

  const handleSetHints = (val: boolean) => {
    if (!isHost) return;
    onUpdate({ ...settings, hints: val });
  };

  const handleSetCategory = (cat: string) => {
    if (!isHost) return;
    onUpdate({ ...settings, category: cat });
  };

  const summaryText = isDrawAndGuess
    ? `${rounds} RUNDEN • ${roundDuration}S • ${hints ? 'TIPPS AN' : 'OHNE TIPPS'} • ${category}`
    : `${rounds === 1 ? '1 RUNDE' : `BEST OF ${rounds}`}`;

  return (
    <div className="w-full border-[3px] border-[#17608E] bg-[#B8ECFD]/85 shadow-[inset_0_2px_0_#E6F8FF] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#CFF2FF]/70 transition-colors cursor-pointer select-none text-left"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-arcade text-sm tracking-wider text-[#15608E] uppercase">
              OPTIONS
            </span>
            {isHost ? (
              <span className="font-arcade inline-flex items-center gap-1 text-[10px] text-[#15608E] bg-[#FDE0A6] px-2 py-0.5 border border-[#D9923E]">
                <Crown className="h-2.5 w-2.5 fill-current" />
                <span>HOST</span>
              </span>
            ) : (
              <span className="font-arcade inline-flex items-center gap-1 text-[10px] text-[#15608E]/80 bg-[#88D6F8] px-2 py-0.5 border border-[#17608E]">
                <Lock className="h-2.5 w-2.5" />
                <span>HOST ONLY</span>
              </span>
            )}
          </div>
          {!isOpen && (
            <p className="font-arcade text-xs text-[#17689A] truncate mt-0.5 uppercase">
              {summaryText}
            </p>
          )}
        </div>

        <div className="text-[#15608E] pl-2 shrink-0">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-3.5 pt-2 space-y-3 border-t-2 border-[#66C4EE] animate-fade-in">
          {isDrawAndGuess ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#15608E] uppercase">RUNDEN</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ROUND_OPTIONS.map((opt) => (
                    <CrystalButton
                      key={opt}
                      size="sm"
                      disabled={!isHost}
                      variant={rounds === opt ? 'primary' : 'secondary'}
                      onClick={() => handleSetRounds(opt)}
                    >
                      {opt}
                    </CrystalButton>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#15608E] uppercase">ZEIT</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {DURATION_OPTIONS.map((opt) => (
                    <CrystalButton
                      key={opt}
                      size="sm"
                      disabled={!isHost}
                      variant={roundDuration === opt ? 'primary' : 'secondary'}
                      onClick={() => handleSetDuration(opt)}
                    >
                      {opt}S
                    </CrystalButton>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#15608E] uppercase">TIPPS</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <CrystalButton
                    size="sm"
                    disabled={!isHost}
                    variant={hints ? 'primary' : 'secondary'}
                    onClick={() => handleSetHints(true)}
                  >
                    ON
                  </CrystalButton>
                  <CrystalButton
                    size="sm"
                    disabled={!isHost}
                    variant={!hints ? 'primary' : 'secondary'}
                    onClick={() => handleSetHints(false)}
                  >
                    OFF
                  </CrystalButton>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-arcade text-xs text-[#15608E] uppercase">KATEGORIE</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <CrystalButton
                      key={cat}
                      size="sm"
                      disabled={!isHost}
                      variant={category.toLowerCase() === cat.toLowerCase() ? 'primary' : 'secondary'}
                      onClick={() => handleSetCategory(cat)}
                    >
                      {cat}
                    </CrystalButton>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-arcade text-xs text-[#15608E] uppercase">DIFFICULTY / ROUNDS</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { val: 1, label: 'EASY (1)' },
                  { val: 3, label: 'NORMAL (3)' },
                  { val: 5, label: 'HARD (5)' },
                ].map(({ val, label }) => (
                  <CrystalButton
                    key={val}
                    size="sm"
                    disabled={!isHost}
                    variant={rounds === val ? 'primary' : 'secondary'}
                    onClick={() => handleSetRounds(val)}
                  >
                    {label}
                  </CrystalButton>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
