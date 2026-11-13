import { Sparkles, Trophy } from 'lucide-react';
import { GAMES } from '../../data/games';
import { formatSoloScore } from '../../utils/soloScores';
import { CrystalButton, CrystalPanel, CrystalReadout } from '../CrystalUI';

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
  onPlayAgain,
  onExit,
}: SoloResultCardProps) {
  const displayScore = resultLabel || formatSoloScore(gameId, score);
  const displayBest = bestScore !== null ? formatSoloScore(gameId, bestScore) : displayScore;
  const game = GAMES.find((g) => g.id === gameId);
  const gameAccent = game?.accent ?? 'emerald';

  return (
    <div className="mx-auto w-full max-w-md animate-fade-in">
      <CrystalPanel
        title={isNewRecord ? 'NEUER REKORD!' : 'RUNDE BEENDET'}
        accent={gameAccent}
        contentClassName="gap-3.5 py-5"
      >
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div
            className={`grid h-14 w-14 place-items-center border-[3px] shadow-md ${
              isNewRecord
                ? 'bg-gradient-to-br from-[#FDE68A] to-[#D97706] border-[#78350F] text-[#78350F] animate-bounce'
                : 'bg-[#1E293B] border-[#0F172A] text-[#FBBF24]'
            }`}
          >
            {isNewRecord ? (
              <Sparkles className="h-7 w-7 stroke-[2.5]" />
            ) : (
              <Trophy className="h-7 w-7 stroke-[2.2]" />
            )}
          </div>
          {game && (
            <span className="font-arcade text-xs text-[#475569] uppercase tracking-wider">
              {game.title} • {game.category}
            </span>
          )}
        </div>

        <CrystalReadout label="ERGEBNIS" value={displayScore} />
        <CrystalReadout variant="gold" label="BESTLEISTUNG" value={displayBest} />

        <div className="mt-1.5 flex w-full flex-col items-center gap-2.5 px-2">
          <CrystalButton fullWidth size="md" variant={gameAccent} tilt="left" onClick={onPlayAgain}>
            NOCHMAL SPIELEN
          </CrystalButton>
          <CrystalButton
            size="md"
            variant="secondary"
            tilt="right"
            onClick={onExit}
            className="min-w-[130px]"
          >
            ZURÜCK ZUR AUSWAHL
          </CrystalButton>
        </div>
      </CrystalPanel>
    </div>
  );
}
