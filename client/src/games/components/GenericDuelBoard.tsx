import { Flag, Sparkles, Swords, Zap } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { getGameTheme } from '../../styles/uiTokens';

export function GenericDuelBoard({
  gameId,
  gameState,
  myPlayer,
  opponent,
  isMyTurn,
  isGameOver,
  isSolo,
  onMove,
  disabled,
}: GameRendererProps) {
  const theme = getGameTheme(gameId || gameState?.gameId);
  const scores = gameState?.scores || {};
  const myScore = scores[myPlayer.id] || 0;
  const oppScore = opponent ? scores[opponent.id] || 0 : 0;
  const soloMode = Boolean(isSolo || !opponent);

  const handleAction = () => {
    if ((!soloMode && !isMyTurn) || isGameOver || disabled) return;
    onMove({ score: 1, timestamp: Date.now() });
  };

  const handleFinishSolo = () => {
    if (isGameOver || disabled) return;
    onMove({ score: myScore, isAbsolute: true, finish: true });
  };

  return (
    <div className="flex flex-col landscape:grid landscape:grid-cols-[1fr_auto] landscape:items-center landscape:gap-6 items-center justify-between p-6 landscape:p-5 rounded-3xl bg-[#12121A]/90 ring-1 ring-white/15 shadow-2xl backdrop-blur-xl w-80 max-w-full landscape:w-full landscape:max-w-lg">
      {/* ─── Linke Spalte im Querformat: Punktestand & Status ─── */}
      <div className="w-full flex flex-col items-center landscape:items-stretch">
        {soloMode ? (
          <div className="w-full flex flex-col items-center py-3 px-4 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 mb-5 landscape:mb-3">
            <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
              Punktestand
            </span>
            <span className={`text-3xl font-black mt-0.5 tabular-nums ${theme.accentText}`}>
              {myScore}
            </span>
          </div>
        ) : (
          <div className="w-full flex items-center justify-around py-3 px-4 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 mb-6 landscape:mb-2">
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
        )}

        {!soloMode && (
          <p className="hidden landscape:block mt-1 text-xs font-semibold text-[#8E8E93] text-center">
            {isMyTurn
              ? 'Du bist am Zug!'
              : `Warte auf ${opponent?.name || 'Mitspieler'}...`}
          </p>
        )}

        {soloMode && (
          <button
            type="button"
            onClick={handleFinishSolo}
            className="hidden landscape:inline-flex items-center justify-center gap-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] px-4 py-2 text-xs font-bold text-white ring-1 ring-white/12 transition-all active:scale-95 cursor-pointer"
          >
            <Flag className="h-3.5 w-3.5" />
            <span>Runde beenden</span>
          </button>
        )}
      </div>

      {/* ─── Interaktions-Button ─── */}
      <div className="flex flex-col items-center my-3 landscape:my-0">
        <button
          type="button"
          disabled={(!soloMode && !isMyTurn) || isGameOver || disabled}
          onClick={handleAction}
          className={`h-28 w-28 landscape:h-24 landscape:w-24 rounded-full flex flex-col items-center justify-center gap-1.5 font-extrabold tracking-wide transition-all shadow-xl active:scale-95 ${
            (soloMode || isMyTurn) && !isGameOver && !disabled
              ? theme.actionOrb
              : 'bg-white/10 text-white/40 ring-2 ring-white/10 cursor-not-allowed opacity-60'
          }`}
        >
          <Zap className="h-7 w-7 fill-current" />
          <span className="text-xs uppercase font-black">
            {soloMode ? '+1 Punkt' : isMyTurn ? 'Zug machen' : 'Warten...'}
          </span>
        </button>

        {!soloMode && (
          <p className="mt-4 landscape:hidden text-xs font-semibold text-[#8E8E93] text-center">
            {isMyTurn
              ? 'Du bist am Zug!'
              : `Warte auf ${opponent?.name || 'Mitspieler'}...`}
          </p>
        )}
      </div>

      {soloMode ? (
        <button
          type="button"
          onClick={handleFinishSolo}
          className="mt-3 landscape:hidden inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] px-4 py-2 text-xs font-bold text-white ring-1 ring-white/12 transition-all active:scale-95 cursor-pointer"
        >
          <Flag className="h-3.5 w-3.5" />
          <span>Runde beenden</span>
        </button>
      ) : (
        <div className={`w-full pt-4 mt-2 border-t border-white/10 landscape:hidden flex items-center justify-center gap-1.5 text-[11px] ${theme.accentText} font-medium`}>
          <Sparkles className="h-3.5 w-3.5" />
          <span>Echtzeit-Synchronisation aktiv</span>
        </div>
      )}
    </div>
  );
}
