import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
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
import { CrystalButton } from '../CrystalUI';
import { getGameWorldStage } from '../../styles/uiTokens';

interface SoloGameViewProps {
  game: Game;
  onLeave: () => void;
}

export function SoloGameView({ game, onLeave }: SoloGameViewProps) {
  const currentUser = useUserProfile();
  const BoardComponent = clientGameRegistry.get(game.id);
  const worldStage = getGameWorldStage(game.id);

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

  const GameIcon = game.icon;

  return (
    <div
      className={`fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-gradient-to-br ${worldStage.bgGradient} text-[#F8FAFC] select-none animate-fade-in`}
    >
      {/* Atmosphärische Spielwelt-Lichtkugeln */}
      <div
        className={`pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl ${worldStage.glowPrimary}`}
      />
      <div
        className={`pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full blur-3xl ${worldStage.glowSecondary}`}
      />
      <BackgroundCometCanvas opacity={0.45} />

      <div
        className="relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between pt-[calc(5px+env(safe-area-inset-top,0px))] pb-[calc(5px+env(safe-area-inset-bottom,0px))] pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] sm:px-4 lg:px-6"
      >
        {/* 1. INTEGRIERTE GAME-WORLD TOP-HUD-LEISTE */}
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 pb-1">
          <div className="justify-self-start flex items-center gap-1.5 sm:gap-2">
            <CrystalButton size="sm" variant="secondary" tilt="left" onClick={onLeave}>
              EXIT
            </CrystalButton>
            <button
              type="button"
              onClick={handlePlayAgain}
              title="Runde neu starten"
              aria-label="Runde neu starten"
              className="inline-flex h-8 sm:h-9 items-center gap-1.5 bg-[#0F172A]/85 hover:bg-[#1E293B] text-[#F8FAFC] border-2 border-[#475569] px-2.5 sm:px-3 text-[11px] sm:text-xs font-arcade uppercase transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span className="hidden xs:inline">NEU</span>
            </button>
          </div>

          <div
            className={`justify-self-center inline-flex items-center gap-2 px-3 sm:px-4 py-1 border-2 ${worldStage.hudBadgeBg} ${worldStage.hudBadgeBorder} shadow-[0_4px_12px_rgba(0,0,0,0.35)]`}
          >
            <GameIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${worldStage.hudBadgeText}`} />
            <span className="font-arcade text-xs sm:text-sm tracking-wider text-white uppercase">
              {game.title}
            </span>
            <span
              className={`hidden md:inline text-[10px] font-arcade uppercase opacity-80 ${worldStage.hudBadgeText}`}
            >
              • {worldStage.worldLabel}
            </span>
          </div>

          <div className="justify-self-end flex items-center gap-1.5">
            <div className="inline-flex items-center gap-1.5 bg-[#0F172A]/90 border-2 border-[#F59E0B]/80 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-arcade uppercase text-[#FDE68A] shadow-[0_3px_10px_rgba(0,0,0,0.3)]">
              <Trophy className="h-3.5 w-3.5 text-[#FBBF24] shrink-0" />
              <span>
                {bestScore !== null
                  ? formatSoloScore(game.id, bestScore)
                  : score > 0
                    ? formatSoloScore(game.id, score)
                    : 'REKORD --'}
              </span>
            </div>
          </div>
        </header>

        {/* 2. VOLLFLÄCHIGE SPIELBÜHNE (im Zentrum des Bildschirms ohne einengende äußere Cards) */}
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
          <main className="mx-auto flex w-full max-w-[1440px] flex-1 min-h-0 flex-col items-center justify-center overflow-hidden p-0.5 sm:p-1.5">
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
