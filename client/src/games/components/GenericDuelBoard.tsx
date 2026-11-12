import { Sparkles, Swords, Zap } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { getGameTheme } from '../../styles/uiTokens';

export function GenericDuelBoard({
  gameId,
  gameState,
  myPlayer,
  opponent,
  isMyTurn,
  isGameOver,
  onMove,
  disabled,
}: GameRendererProps) {
  const theme = getGameTheme(gameId || gameState?.gameId);
  const scores = gameState?.scores || {};
  const myScore = scores[myPlayer.id] || 0;
  const oppScore = opponent ? scores[opponent.id] || 0 : 0;

  const handleAction = () => {
    if (!isMyTurn || isGameOver || disabled) return;
    onMove({ score: 1, timestamp: Date.now() });
  };

  return (
    <div className="flex flex-col items-center justify-between p-6 rounded-3xl bg-[#12121A]/90 ring-1 ring-white/15 shadow-2xl backdrop-blur-xl w-80 max-w-full">
      {/* ─── Match Punktestand ─── */}
      <div className="w-full flex items-center justify-around py-3 px-4 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 mb-6">
        <div className="flex flex-col items-center">
          <span className={`text-[11px] font-bold ${theme.accentIcon} truncate max-w-[90px]`}>
            {myPlayer.name} (Du)
          </span>
          <span className="text-2xl font-black text-white mt-0.5">{myScore}</span>
        </div>

        <div className="flex flex-col items-center px-2">
          <Swords className="h-5 w-5 text-[#8E8E93]" />
          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mt-0.5">
            VS
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className={`text-[11px] font-bold ${theme.secondaryAccentText} truncate max-w-[90px]`}>
            {opponent?.name || 'Gegner'}
          </span>
          <span className="text-2xl font-black text-white mt-0.5">{oppScore}</span>
        </div>
      </div>

      {/* ─── Interaktions-Button ─── */}
      <div className="flex flex-col items-center my-4">
        <button
          type="button"
          disabled={!isMyTurn || isGameOver || disabled}
          onClick={handleAction}
          className={`h-28 w-28 rounded-full flex flex-col items-center justify-center gap-1.5 font-extrabold tracking-wide transition-all shadow-xl active:scale-95 ${
            isMyTurn && !isGameOver && !disabled
              ? theme.actionOrb
              : 'bg-white/10 text-white/40 ring-2 ring-white/10 cursor-not-allowed opacity-60'
          }`}
        >
          <Zap className="h-7 w-7 fill-current" />
          <span className="text-xs uppercase font-black">
            {isMyTurn ? 'Zug machen' : 'Warten...'}
          </span>
        </button>

        <p className="mt-4 text-xs font-semibold text-[#8E8E93] text-center">
          {isMyTurn
            ? 'Du bist am Zug! Tippe auf den Button, um zu punkten.'
            : `Warte auf den Zug von ${opponent?.name || 'deinem Gegner'}...`}
        </p>
      </div>

      {/* ─── Footer Status ─── */}
      <div className={`w-full pt-4 mt-2 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] ${theme.accentText} font-medium`}>
        <Sparkles className="h-3.5 w-3.5" />
        <span>Echtzeit-Synchronisation aktiv</span>
      </div>
    </div>
  );
}
