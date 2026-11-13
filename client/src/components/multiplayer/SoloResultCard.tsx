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
  const gameAccent = GAMES.find((g) => g.id === gameId)?.accent ?? 'emerald';

  return (
    <div className="mx-auto w-full max-w-sm animate-fade-in">
      {/* 1:1 Umsetzung des "LEVEL 16" Kristall-Ergebnis-Fensters aus dem Referenzbild */}
      <CrystalPanel
        stars={isNewRecord ? 3 : 2}
        title={isNewRecord ? 'NEW RECORD' : 'LEVEL CLEAR'}
        accent={gameAccent}
        contentClassName="gap-4 py-6"
      >
        <CrystalReadout label="SCORE" value={displayScore} />
        <CrystalReadout label="REWARD" value={displayBest} />

        <div className="mt-2 flex w-full flex-col items-center gap-2.5 px-2">
          <CrystalButton fullWidth size="md" variant={gameAccent} tilt="left" onClick={onPlayAgain}>
            REPLAY
          </CrystalButton>
          <CrystalButton
            size="md"
            variant="secondary"
            tilt="right"
            onClick={onExit}
            className="min-w-[130px]"
          >
            OK
          </CrystalButton>
        </div>
      </CrystalPanel>
    </div>
  );
}
