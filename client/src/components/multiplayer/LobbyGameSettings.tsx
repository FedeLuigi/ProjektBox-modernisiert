import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  HelpCircle,
  Layers,
  Lock,
  Palette,
  SlidersHorizontal,
} from 'lucide-react';
import { getGameTheme } from '../../styles/uiTokens';

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
  const theme = getGameTheme(gameId);

  // Defaults je nach Spiel
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

  // Zusammenfassung für den Header
  const summaryText = isDrawAndGuess
    ? `${rounds} Runden • ${roundDuration}s • ${hints ? 'Tipps an' : 'Ohne Tipps'} • ${category}`
    : `${rounds === 1 ? '1 Runde' : `Best of ${rounds}`}`;

  return (
    <div className="w-full rounded-2xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-md overflow-hidden transition-all">
      {/* Header-Leiste: Klickbar zum Ein-/Ausklappen */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 hover:bg-white/[0.03] transition-colors cursor-pointer select-none text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className={`h-4 w-4 ${theme.accentIcon} shrink-0`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                Spieleinstellungen
              </span>
              {isHost ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded-full ring-1 ring-amber-400/30">
                  <Crown className="h-2.5 w-2.5 fill-current" />
                  <span>Host</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#AEAEB2] bg-white/[0.06] px-1.5 py-0.5 rounded-full ring-1 ring-white/10">
                  <Lock className="h-2.5 w-2.5 text-amber-400/80" />
                  <span>Nur Host kann anpassen</span>
                </span>
              )}
            </div>
            {!isOpen && (
              <p className="text-[11px] font-medium text-[#8E8E93] truncate mt-0.5">
                {summaryText}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#8E8E93] pl-2 shrink-0">
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Aufklappbarer Inhalt mit Regeloptionen */}
      {isOpen && (
        <div className="px-3.5 pb-3 sm:px-4 sm:pb-3.5 pt-1 space-y-3 border-t border-white/[0.06] animate-fade-in text-xs">
          {isDrawAndGuess ? (
            <>
              {/* 1. Rundenanzahl */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1.5 shrink-0">
                  <Layers className="h-3 w-3" />
                  Runden
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ROUND_OPTIONS.map((opt) => {
                    const active = rounds === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleSetRounds(opt)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                          active
                            ? `${theme.brushActive} ring-1 ring-white/30 scale-102`
                            : isHost
                            ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white cursor-pointer ring-1 ring-white/5'
                            : 'bg-white/[0.03] text-white/30 ring-1 ring-transparent cursor-default pointer-events-none opacity-40'
                        }`}
                      >
                        {opt} Runden
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Zeit pro Runde */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1.5 shrink-0">
                  <Clock className="h-3 w-3" />
                  Zeit pro Runde
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {DURATION_OPTIONS.map((opt) => {
                    const active = roundDuration === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleSetDuration(opt)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                          active
                            ? `${theme.brushActive} ring-1 ring-white/30 scale-102`
                            : isHost
                            ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white cursor-pointer ring-1 ring-white/5'
                            : 'bg-white/[0.03] text-white/30 ring-1 ring-transparent cursor-default pointer-events-none opacity-40'
                        }`}
                      >
                        {opt}s
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Buchstaben-Hinweise */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1.5 shrink-0">
                  <HelpCircle className="h-3 w-3" />
                  Buchstaben-Tipps
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => handleSetHints(true)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      hints
                        ? `${theme.brushActive} ring-1 ring-white/30 scale-102`
                        : isHost
                        ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white cursor-pointer ring-1 ring-white/5'
                        : 'bg-white/[0.03] text-white/30 ring-1 ring-transparent cursor-default pointer-events-none opacity-40'
                    }`}
                  >
                    Tipps an
                  </button>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => handleSetHints(false)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      !hints
                        ? `${theme.brushActive} ring-1 ring-white/30 scale-102`
                        : isHost
                        ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white cursor-pointer ring-1 ring-white/5'
                        : 'bg-white/[0.03] text-white/30 ring-1 ring-transparent cursor-default pointer-events-none opacity-40'
                    }`}
                  >
                    Ohne Tipps
                  </button>
                </div>
              </div>

              {/* 4. Wortkategorie */}
              <div className="flex flex-col gap-1.5 pt-0.5">
                <span className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1.5">
                  <Palette className="h-3 w-3" />
                  Wortkategorie
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CATEGORIES.map((cat) => {
                    const active = category.toLowerCase() === cat.toLowerCase();
                    return (
                      <button
                        key={cat}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleSetCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                          active
                            ? `${theme.brushActive} ring-1 ring-white/30 scale-102`
                            : isHost
                            ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white cursor-pointer ring-1 ring-white/5'
                            : 'bg-white/[0.03] text-white/30 ring-1 ring-transparent cursor-default pointer-events-none opacity-40'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Fallback für Duell- und 2-Spieler-Spiele (Connect 4, Tic Tac Toe etc.) */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1.5 shrink-0">
                <Layers className="h-3 w-3" />
                Spielmodus
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { val: 1, label: '1 Runde' },
                  { val: 3, label: 'Best of 3' },
                  { val: 5, label: 'Best of 5' },
                ].map(({ val, label }) => {
                  const active = rounds === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleSetRounds(val)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        active
                          ? `${theme.brushActive} ring-1 ring-white/30 scale-102`
                          : isHost
                          ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white cursor-pointer ring-1 ring-white/5'
                          : 'bg-white/[0.03] text-white/30 ring-1 ring-transparent cursor-default pointer-events-none opacity-40'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!isHost && (
            <p className="text-[10px] text-[#8E8E93] text-center pt-1 border-t border-white/[0.04]">
              Nur der Host kann diese Einstellungen anpassen. Alle Änderungen werden live synchronisiert.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
