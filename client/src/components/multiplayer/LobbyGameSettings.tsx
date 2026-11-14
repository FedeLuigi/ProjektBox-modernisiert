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
    <div className="w-full border-[3px] border-[#334155] bg-[#F8FAFC] shadow-[inset_0_2px_0_#FFFFFF,0_3px_0_rgba(15,23,42,0.16)] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F1F5F9] transition-colors cursor-pointer select-none text-left"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-arcade text-sm tracking-wider text-[#1E293B] uppercase">
              OPTIONEN
            </span>
            {isHost ? (
              <span className="font-arcade inline-flex items-center gap-1 text-[10px] text-[#78350F] bg-[#FEF3C7] px-2 py-0.5 border border-[#D97706]">
                <Crown className="h-2.5 w-2.5 fill-current" />
                <span>HOST</span>
              </span>
            ) : (
              <span className="font-arcade inline-flex items-center gap-1 text-[10px] text-[#334155] bg-[#E2E8F0] px-2 py-0.5 border border-[#64748B]">
                <Lock className="h-2.5 w-2.5" />
                <span>NUR HOST</span>
              </span>
            )}
          </div>
          {!isOpen && (
            <p className="font-arcade text-xs text-[#475569] truncate mt-0.5 uppercase">
              {summaryText}
            </p>
          )}
        </div>

        <div className="text-[#1E293B] pl-2 shrink-0">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-3.5 pt-2 space-y-3 border-t-2 border-[#CBD5E1] animate-fade-in">
          {isDrawAndGuess ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#334155] uppercase">RUNDEN</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ROUND_OPTIONS.map((opt) => (
                    <CrystalButton
                      key={opt}
                      size="sm"
                      disabled={!isHost}
                      variant={rounds === opt ? 'rose' : 'secondary'}
                      onClick={() => handleSetRounds(opt)}
                    >
                      {opt}
                    </CrystalButton>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#334155] uppercase">ZEIT</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {DURATION_OPTIONS.map((opt) => (
                    <CrystalButton
                      key={opt}
                      size="sm"
                      disabled={!isHost}
                      variant={roundDuration === opt ? 'rose' : 'secondary'}
                      onClick={() => handleSetDuration(opt)}
                    >
                      {opt}S
                    </CrystalButton>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-arcade text-xs text-[#334155] uppercase">TIPPS</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <CrystalButton
                    size="sm"
                    disabled={!isHost}
                    variant={hints ? 'primary' : 'secondary'}
                    onClick={() => handleSetHints(true)}
                  >
                    AN
                  </CrystalButton>
                  <CrystalButton
                    size="sm"
                    disabled={!isHost}
                    variant={!hints ? 'primary' : 'secondary'}
                    onClick={() => handleSetHints(false)}
                  >
                    AUS
                  </CrystalButton>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-arcade text-xs text-[#334155] uppercase">KATEGORIE</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <CrystalButton
                      key={cat}
                      size="sm"
                      disabled={!isHost}
                      variant={category.toLowerCase() === cat.toLowerCase() ? 'rose' : 'secondary'}
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
              <span className="font-arcade text-xs text-[#334155] uppercase">MODUS / RUNDEN</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { val: 1, label: '1 RUNDE' },
                  { val: 3, label: 'BEST OF 3' },
                  { val: 5, label: 'BEST OF 5' },
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
