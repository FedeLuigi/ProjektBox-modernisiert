import { useCallback, useState } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import type { Game } from '../../data/games';
import { getUserProfile } from '../../utils/userProfile';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { GameBackground } from '../GameBackground';
import { clientGameRegistry } from '../../games/registry';
import { getGameTheme } from '../../styles/uiTokens';
import {
  formatSoloScore,
  getSoloHighscore,
  isLowerBetterGame,
  saveSoloHighscore,
} from '../../utils/soloScores';
import { SoloResultCard } from './SoloResultCard';

interface SoloGameViewProps {
  game: Game;
  onLeave: () => void;
}

export function SoloGameView({ game, onLeave }: SoloGameViewProps) {
  const currentUser = getUserProfile();
  const theme = getGameTheme(game.id);
  const BoardComponent = clientGameRegistry.get(game.id);

  const [roundId, setRoundId] = useState(1);
  const [score, setScore] = useState(0);
  const [resultLabel, setResultLabel] = useState<string | undefined>(undefined);
  const [isFinished, setIsFinished] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(() => getSoloHighscore(game.id));
  const [isNewRecord, setIsNewRecord] = useState(false);

  const handleSoloMove = useCallback(
    (moveData: any) => {
      if (typeof moveData?.score === 'number') {
        const nextScore =
          moveData?.finish || moveData?.isAbsolute
            ? moveData.score
            : score + moveData.score;
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
          score
        );
        setBestScore(updatedBest);
        setIsNewRecord(newRec);
        setResultLabel(moveData?.label);
        setIsFinished(true);
      }
    },
    [game.id, score]
  );

  const handlePlayAgain = () => {
    setRoundId((r) => r + 1);
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
    <div className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-[#0B0B0F] text-white select-none animate-fade-in">
      <BackgroundCometCanvas opacity={0.35} />

      <div className="pointer-events-none absolute inset-0 opacity-25 transform-gpu">
        <GameBackground gameId={game.id} fullBleed />
      </div>

      {/* ─── Passender Themen-Glow bis ganz nach unten ─── */}
      <div className={`pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-50 ${theme.ambientTop}`} />
      <div className={`pointer-events-none absolute -bottom-16 -right-16 h-96 w-96 rounded-full blur-3xl opacity-55 ${theme.ambientBottom}`} />

      <div
        style={{
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
        className="relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between px-3 sm:px-6"
      >
        {/* 1. SCHMALE TOP-BAR */}
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 pb-1.5 landscape:pb-1">
          <button
            type="button"
            onClick={onLeave}
            className="justify-self-start inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 px-3 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Verlassen</span>
          </button>

          <div className="justify-self-center inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 ring-1 ring-white/10 text-xs font-bold">
            <span className="text-white truncate max-w-[120px]">{game.title}</span>
            {score > 0 && !isFinished && (
              <>
                <span className="text-white/25">•</span>
                <span className={`font-black tabular-nums ${theme.accentText}`}>
                  {formatSoloScore(game.id, score)}
                </span>
              </>
            )}
          </div>

          <div className="justify-self-end flex items-center">
            {bestScore !== null ? (
              <span className={`inline-flex h-8 sm:h-9 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold ${theme.badgePill}`}>
                <Trophy className="h-3 w-3 text-amber-400" />
                <span className="tabular-nums">{formatSoloScore(game.id, bestScore)}</span>
              </span>
            ) : (
              <span className={`inline-flex h-8 sm:h-9 items-center rounded-full px-2.5 text-[11px] font-bold uppercase ${theme.badgePill}`}>
                Solo
              </span>
            )}
          </div>
        </header>

        {/* 2. MITTE: ERGEBNIS-KARTE ODER SOLO-SPIELFELD */}
        {isFinished ? (
          <main className="my-auto mx-auto flex w-full flex-1 min-h-0 items-center justify-center overflow-y-auto px-2 py-4 landscape:py-2">
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
          <main className="my-auto mx-auto flex w-full max-w-md flex-1 min-h-0 items-center justify-center p-2 sm:p-3">
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
