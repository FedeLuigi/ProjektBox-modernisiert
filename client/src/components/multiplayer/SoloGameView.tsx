import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '../../data/games';
import { useUserProfile } from '../../utils/userProfile';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { clientGameRegistry } from '../../games/registry';
import {
  formatSoloScore,
  getSoloHighscore,
  isLowerBetterGame,
  saveSoloHighscore,
} from '../../utils/soloScores';
import { SoloResultCard } from './SoloResultCard';
import { CrystalButton, CrystalReadout } from '../CrystalUI';

interface SoloGameViewProps {
  game: Game;
  onLeave: () => void;
}

export function SoloGameView({ game, onLeave }: SoloGameViewProps) {
  const currentUser = useUserProfile();
  const BoardComponent = clientGameRegistry.get(game.id);

  const [roundId, setRoundId] = useState(1);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [resultLabel, setResultLabel] = useState<string | undefined>(undefined);
  const [isFinished, setIsFinished] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(() => getSoloHighscore(game.id));
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const handleSoloMove = useCallback(
    (moveData: any) => {
      if (typeof moveData?.score === 'number') {
        const nextScore =
          moveData?.finish || moveData?.isAbsolute
            ? moveData.score
            : scoreRef.current + moveData.score;
        scoreRef.current = nextScore;
        setScore(nextScore);

        if (moveData?.finish) {
          const lowerIsBetter =
            typeof moveData?.lowerIsBetter === 'boolean'
              ? moveData.lowerIsBetter
              : isLowerBetterGame(game.id);
          const { bestScore: updatedBest, isNewRecord: newRec } = saveSoloHighscore(
            game.id,
            nextScore,
            lowerIsBetter
          );
          setBestScore(updatedBest);
          setIsNewRecord(newRec);
          setResultLabel(moveData?.label);
          setIsFinished(true);
        }
      } else if (moveData?.finish) {
        const { bestScore: updatedBest, isNewRecord: newRec } = saveSoloHighscore(
          game.id,
          scoreRef.current
        );
        setBestScore(updatedBest);
        setIsNewRecord(newRec);
        setResultLabel(moveData?.label);
        setIsFinished(true);
      }
    },
    [game.id]
  );

  const handlePlayAgain = () => {
    setRoundId((r) => r + 1);
    scoreRef.current = 0;
    setScore(0);
    setResultLabel(undefined);
    setIsFinished(false);
    setIsNewRecord(false);
  };

  const soloPlayer = {
    id: currentUser.id,
    socketId: 'solo',
    name: currentUser.name,
    avatar: currentUser.avatar,
    isReady: true,
    isHost: true,
    connected: true,
  };

  return (
    <div className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-[#1B2B40] text-[#1E293B] select-none animate-fade-in">
      <BackgroundCometCanvas opacity={0.85} />

      <div
        className="relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between pt-[calc(6px+env(safe-area-inset-top,0px))] pb-[calc(6px+env(safe-area-inset-bottom,0px))] pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] sm:px-4 lg:px-6"
      >
        {/* 1. KOMPAKTE CRYSTAL HUD TOP-BAR (nimmt minimalen Platz ein, damit das Spiel die volle Fläche hat) */}
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 pb-1">
          <div className="justify-self-start flex items-center gap-1.5 sm:gap-2">
            <CrystalButton size="sm" variant="secondary" tilt="left" onClick={onLeave}>
              EXIT
            </CrystalButton>
            <CrystalButton
              size="sm"
              variant={game.accent}
              tilt="right"
              onClick={handlePlayAgain}
            >
              NEUSTART
            </CrystalButton>
          </div>

          <div className="justify-self-center hidden sm:block">
            <CrystalReadout
              value={
                score > 0 && !isFinished
                  ? `${game.title} • ${formatSoloScore(game.id, score)}`
                  : game.title
              }
            />
          </div>

          <div className="justify-self-end flex items-center">
            <CrystalReadout
              variant="gold"
              value={bestScore !== null ? `BEST: ${formatSoloScore(game.id, bestScore)}` : game.title}
            />
          </div>
        </header>

        {/* 2. VOLLFLÄCHIGE SPIELBÜHNE (nutzt die gesamte verfügbare Bildschirmfläche) */}
        {isFinished ? (
          <main className="my-auto mx-auto flex w-full flex-1 min-h-0 items-center justify-center overflow-y-auto px-2 py-3">
            <SoloResultCard
              gameId={game.id}
              score={score}
              bestScore={bestScore}
              isNewRecord={isNewRecord}
              resultLabel={resultLabel}
              onPlayAgain={handlePlayAgain}
              onExit={onLeave}
            />
          </main>
        ) : (
          <main className="mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col items-center justify-center overflow-hidden p-1 sm:p-2">
            <BoardComponent
              key={roundId}
              gameId={game.id}
              gameState={{
                gameId: game.id,
                currentTurn: currentUser.id,
                status: 'playing',
                winnerId: null,
                scores: { [currentUser.id]: score },
              }}
              myPlayer={soloPlayer}
              allPlayers={[soloPlayer]}
              isMyTurn={true}
              isGameOver={false}
              isSolo={true}
              onMove={handleSoloMove}
            />
          </main>
        )}
      </div>
    </div>
  );
}
