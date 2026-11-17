import { useState } from 'react';
import { ChevronDown, ChevronUp, Crown, Lock, Plus, X } from 'lucide-react';
import { OpenButton } from '../OpenSubpageUI';

interface LobbyGameSettingsProps {
  gameId: string;
  settings?: Record<string, any>;
  isHost: boolean;
  onUpdate: (newSettings: Record<string, any>) => void;
}

const CATEGORIES = ['Alle', 'Eigene', 'Tiere', 'Essen', 'Fahrzeuge', 'Natur', 'Gegenstände'];
const ROUND_OPTIONS = [3, 5, 8];
const DURATION_OPTIONS = [45, 60, 90];

export function LobbyGameSettings({
  gameId,
  settings,
  isHost,
  onUpdate,
}: LobbyGameSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [wordDraft, setWordDraft] = useState('');

  const isDrawAndGuess = gameId === 'draw-and-guess';
  const rounds = typeof settings?.rounds === 'number' ? settings.rounds : 3;
  const roundDuration = typeof settings?.roundDuration === 'number' ? settings.roundDuration : 60;
  const hints = settings?.hints === true;
  const category = settings?.category || 'Alle';
  const customWords: string[] = Array.isArray(settings?.customWords) ? settings.customWords : [];

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

  const handleAddCustomWords = () => {
    if (!isHost) return;
    const incoming = wordDraft
      .split(/[,;\n]+/)
      .map((w) => w.trim().slice(0, 28))
      .filter((w) => w.length >= 2);
    if (incoming.length === 0) return;

    const existingLower = new Set(customWords.map((w) => w.toLowerCase()));
    const nextWords = [...customWords];
    for (const w of incoming) {
      if (!existingLower.has(w.toLowerCase()) && nextWords.length < 40) {
        existingLower.add(w.toLowerCase());
        nextWords.push(w);
      }
    }
    setWordDraft('');
    onUpdate({
      ...settings,
      customWords: nextWords,
      category: 'Eigene',
    });
  };

  const handleRemoveCustomWord = (wordToRemove: string) => {
    if (!isHost) return;
    const nextWords = customWords.filter((w) => w !== wordToRemove);
    onUpdate({
      ...settings,
      customWords: nextWords,
      category: nextWords.length === 0 && category === 'Eigene' ? 'Alle' : category,
    });
  };

  const categorySummary =
    category === 'Eigene' && customWords.length > 0
      ? `EIGENE (${customWords.length})`
      : category;

  const summaryText = isDrawAndGuess
    ? `${rounds} RUNDEN • ${roundDuration}S • ${hints ? 'TIPPS AN' : 'TIPPS AUS'} • ${categorySummary}`
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
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">TIPPS</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <OpenButton
                    size="sm"
                    disabled={!isHost}
                    variant={hints ? 'primary' : 'secondary'}
                    onClick={() => handleSetHints(true)}
                  >
                    AN
                  </OpenButton>
                  <OpenButton
                    size="sm"
                    disabled={!isHost}
                    variant={!hints ? 'primary' : 'secondary'}
                    onClick={() => handleSetHints(false)}
                  >
                    AUS
                  </OpenButton>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-arcade text-xs text-[#94A3B8] uppercase">KATEGORIE</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <OpenButton
                      key={cat}
                      size="sm"
                      disabled={!isHost}
                      variant={category.toLowerCase() === cat.toLowerCase() ? 'amber' : 'secondary'}
                      onClick={() => handleSetCategory(cat)}
                    >
                      {cat}
                    </OpenButton>
                  ))}
                </div>
              </div>

              {/* Eigene Wörter hinzufügen & verwalten */}
              <div className="flex flex-col gap-2 border-t border-white/10 pt-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-arcade text-xs text-[#94A3B8] uppercase">
                    EIGENE WÖRTER ({customWords.length})
                  </span>
                  {customWords.length > 0 && (
                    <span className="font-arcade text-[10px] text-[#FDE68A] uppercase">
                      {category === 'Eigene' ? 'NUR EIGENE AKTIV' : 'GEMISCHT MIT ALLE'}
                    </span>
                  )}
                </div>

                {isHost && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={wordDraft}
                      onChange={(e) => setWordDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomWords();
                        }
                      }}
                      maxLength={120}
                      placeholder="Wort eingeben (z. B. Pizza, Rakete)..."
                      aria-label="Eigenes Wort hinzufügen"
                      className="h-8 flex-1 min-w-0 rounded-lg border border-white/20 bg-white/[0.06] px-2.5 text-xs text-white placeholder:text-white/40 focus:border-[#F59E0B] focus:outline-none"
                    />
                    <OpenButton
                      size="sm"
                      variant="amber"
                      disabled={wordDraft.trim().length < 2}
                      onClick={handleAddCustomWords}
                      aria-label="Eigenes Wort hinzufügen"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </OpenButton>
                  </div>
                )}

                {customWords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {customWords.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#F59E0B]/45 bg-[#F59E0B]/15 px-2 py-0.5 font-arcade text-[10px] text-[#FDE68A] uppercase"
                      >
                        <span>{word}</span>
                        {isHost && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomWord(word)}
                            aria-label={`${word} entfernen`}
                            className="text-[#FDE68A]/75 hover:text-white cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
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
