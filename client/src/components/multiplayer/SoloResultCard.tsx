import { RotateCcw, Trophy } from 'lucide-react';
import {
  BTN_PRIMARY_BASE,
  BTN_SECONDARY_BASE,
  BTN_SECONDARY_NEUTRAL,
  getGameTheme,
} from '../../styles/uiTokens';
import { formatSoloScore } from '../../utils/soloScores';

interface SoloResultCardProps {
  gameId: string;
  score: number;
  bestScore: number | null;
  isNewRecord: boolean;
  resultLabel?: string;
  secondaryLabel?: string;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function SoloResultCard({
  gameId,
  score,
  bestScore,
  isNewRecord,
  resultLabel,
  secondaryLabel = 'Zurück zur Übersicht',
  onPlayAgain,
  onExit,
}: SoloResultCardProps) {
  const theme = getGameTheme(gameId);
  const displayScore = resultLabel || formatSoloScore(gameId, score);
  const displayBest = bestScore !== null ? formatSoloScore(gameId, bestScore) : null;

  return (
    <div
      className={`max-w-sm mx-auto w-full p-5 sm:p-6 landscape:p-4 rounded-3xl bg-[#181824]/95 ${theme.softRing} shadow-2xl backdrop-blur-2xl text-center animate-fade-in`}
    >
      <div className="flex justify-center mb-2.5 landscape:mb-1.5">
        <Trophy
          className={`h-11 w-11 landscape:h-9 landscape:w-9 ${
            isNewRecord ? 'text-amber-400 animate-bounce' : theme.accentIcon
          }`}
        />
      </div>

      <h2 className="text-xl sm:text-2xl landscape:text-lg font-black text-white">
        {isNewRecord ? (
          <span className="text-amber-300">Neuer Highscore! 🎉</span>
        ) : (
          <span>Runde beendet!</span>
        )}
      </h2>

      {/* Punktestand & Highscore Pillen */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 py-1 ring-1 ring-white/15 text-xs">
          <span className="text-[#8E8E93]">Ergebnis:</span>
          <strong className={`font-black tabular-nums ${theme.accentText}`}>
            {displayScore}
          </strong>
        </div>

        {displayBest && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3.5 py-1 ring-1 ring-amber-400/35 text-xs">
            <span className="text-amber-200/80">Highscore:</span>
            <strong className="font-black tabular-nums text-amber-300">
              {displayBest}
            </strong>
          </div>
        )}
      </div>

      <div className="mt-5 landscape:mt-3.5 flex flex-col gap-2.5 landscape:gap-2">
        <button
          type="button"
          onClick={onPlayAgain}
          className={`${BTN_PRIMARY_BASE} ${theme.primaryBtn}`}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Nochmal spielen</span>
        </button>

        <button
          type="button"
          onClick={onExit}
          className={`${BTN_SECONDARY_BASE} ${BTN_SECONDARY_NEUTRAL}`}
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}
