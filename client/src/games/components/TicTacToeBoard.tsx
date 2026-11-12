import type { GameRendererProps } from '../types';

export interface TicTacToeState {
  board: (string | null)[];
  winningLine: number[] | null;
}

export function TicTacToeBoard({
  gameState,
  isMyTurn,
  isGameOver,
  onMove,
  disabled,
}: GameRendererProps<TicTacToeState>) {
  const { board, winningLine } = gameState || { board: Array(9).fill(null), winningLine: null };

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
                  ? 'bg-white/5 hover:bg-white/10 active:scale-95 cursor-pointer ring-1 ring-white/10 hover:ring-purple-500/50'
                  : 'bg-white/[0.03] cursor-not-allowed opacity-60'
                : isWinningCell
                  ? 'bg-purple-600/40 text-purple-300 ring-2 ring-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)] animate-pulse'
                  : cell === 'X'
                    ? 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30'
                    : 'bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/30'
            }`}
          >
            {cell === 'X' && (
              <span className="transform-gpu scale-110 drop-shadow-[0_0_10px_#a855f7]">
                X
              </span>
            )}
            {cell === 'O' && (
              <span className="transform-gpu scale-110 drop-shadow-[0_0_10px_#ec4899]">
                O
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
