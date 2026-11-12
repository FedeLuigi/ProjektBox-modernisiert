import type { GameRendererProps } from '../types';
import { getGameTheme } from '../../styles/uiTokens';

export interface TicTacToeState {
  board: (string | null)[];
  winningLine: number[] | null;
}

export function TicTacToeBoard({
  gameId = 'tic-tac-toe',
  gameState,
  isMyTurn,
  isGameOver,
  onMove,
  disabled,
}: GameRendererProps<TicTacToeState>) {
  const { board, winningLine } = gameState || { board: Array(9).fill(null), winningLine: null };
  const theme = getGameTheme(gameId);

  const handleCellClick = (idx: number) => {
    if (!isMyTurn || isGameOver || disabled) return;
    if (board[idx] !== null) return;
    onMove({ cellIndex: idx });
  };

  return (
    <div className="grid grid-cols-3 gap-3 p-4 rounded-3xl bg-[#12121A]/90 ring-1 ring-white/15 shadow-2xl backdrop-blur-xl w-[min(78vw,20rem)] sm:w-[min(78vw,21rem)] max-h-[65dvh] aspect-square">
      {board.map((cell, idx) => {
        const isWinningCell = winningLine?.includes(idx);
        const canClick = isMyTurn && !isGameOver && !disabled && cell === null;

        return (
          <button
            key={idx}
            type="button"
            disabled={!canClick}
            onClick={() => handleCellClick(idx)}
            className={`relative flex items-center justify-center rounded-2xl text-4xl sm:text-5xl font-black transition-all ${
              cell === null
                ? canClick
                  ? `bg-white/5 hover:bg-white/10 active:scale-95 cursor-pointer ring-1 ring-white/10 ${theme.hoverRing}`
                  : 'bg-white/[0.03] cursor-not-allowed opacity-60'
                : isWinningCell
                  ? 'bg-sky-500/35 text-sky-200 ring-2 ring-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.55)] animate-pulse'
                  : cell === 'X'
                    ? 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30'
                    : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
            }`}
          >
            {cell === 'X' && (
              <span className="transform-gpu scale-110 drop-shadow-[0_0_10px_#38bdf8]">
                X
              </span>
            )}
            {cell === 'O' && (
              <span className="transform-gpu scale-110 drop-shadow-[0_0_10px_#fbbf24]">
                O
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
