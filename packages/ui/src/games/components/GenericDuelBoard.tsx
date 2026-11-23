import { Flag, Sparkles, Swords, Zap } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { OpenButton } from '../../components/OpenSubpageUI';

export function GenericDuelBoard({
  gameState,
  myPlayer,
  opponent,
  isMyTurn,
  isGameOver,
  isSolo,
  onMove,
  disabled,
}: GameRendererProps) {
  const scores = gameState?.scores || {};
  const myScore = scores[myPlayer.id] || 0;
  const oppScore = opponent ? scores[opponent.id] || 0 : 0;
  const soloMode = Boolean(isSolo || !opponent);
  const canAct = (soloMode || isMyTurn) && !isGameOver && !disabled;

  const handleAction = () => {
    if (!canAct) return;
    onMove({ score: 1, timestamp: Date.now() });
  };

  const handleFinishSolo = () => {
    if (isGameOver || disabled) return;
    onMove({ score: myScore, isAbsolute: true, finish: true });
  };

  return (
    <div className="w-full max-w-sm landscape:max-w-lg rounded-2xl border border-white/15 bg-[#0F172A]/75 p-5 text-white backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] flex flex-col landscape:grid landscape:grid-cols-[1fr_auto] landscape:items-center landscape:gap-6 items-center justify-between gap-4">
      {/* Linke Spalte im Querformat: Punktestand & Status */}
      <div className="w-full flex flex-col items-center landscape:items-stretch gap-3">
        <div className="border-b-2 border-[#F59E0B] self-center px-2 pb-0.5">
          <span className="font-arcade text-sm tracking-wider text-white uppercase">
            {soloMode ? 'SOLO CHALLENGE' : 'DUELL'}
          </span>
        </div>

        {soloMode ? (
          <div className="flex flex-col items-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5">
            <span className="font-arcade text-[10px] tracking-wider text-[#94A3B8] uppercase">
              SCORE
            </span>
            <span className="font-arcade text-2xl text-[#FDE68A]">{myScore}</span>
          </div>
        ) : (
          <div className="w-full flex items-center justify-around py-3 px-3 rounded-xl bg-white/[0.04] border border-white/15">
            <div className="flex flex-col items-center min-w-0">
              <span className="font-arcade text-xs text-[#CBD5E1] truncate max-w-[90px] uppercase">
                {myPlayer.name}
              </span>
              <span className="font-arcade text-2xl text-[#FDE68A] mt-0.5">{myScore}</span>
            </div>

            <div className="flex flex-col items-center px-2 text-[#94A3B8]">
              <Swords className="h-5 w-5 text-[#FBBF24]" />
              <span className="font-arcade text-[10px] uppercase tracking-wider mt-0.5">
                VS
              </span>
            </div>

            <div className="flex flex-col items-center min-w-0">
              <span className="font-arcade text-xs text-[#CBD5E1] truncate max-w-[90px] uppercase">
                {opponent?.name || 'GEGNER'}
              </span>
              <span className="font-arcade text-2xl text-white mt-0.5">{oppScore}</span>
            </div>
          </div>
        )}

        {!soloMode && (
          <p className="hidden landscape:block font-arcade text-xs text-[#94A3B8] text-center uppercase">
            {isMyTurn ? 'DEIN ZUG!' : `WARTE AUF ${opponent?.name || 'GEGNER'}...`}
          </p>
        )}

        {soloMode && (
          <div className="hidden landscape:block">
            <OpenButton size="sm" variant="secondary" fullWidth onClick={handleFinishSolo}>
              <Flag className="h-3.5 w-3.5" />
              <span>BEENDEN</span>
            </OpenButton>
          </div>
        )}
      </div>

      {/* Interaktions-Button */}
      <div className="flex flex-col items-center my-1 landscape:my-0">
        <button
          type="button"
          disabled={!canAct}
          onClick={handleAction}
          className={`h-28 w-28 landscape:h-24 landscape:w-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-arcade uppercase tracking-wide transition-all border active:scale-95 ${
            canAct
              ? 'bg-[#10B981] hover:bg-[#059669] text-white border-[#6EE7B7]/40 shadow-sm cursor-pointer hover:scale-105'
              : 'bg-white/[0.05] text-white/35 border-white/15 cursor-not-allowed'
          }`}
        >
          <Zap className="h-7 w-7 fill-current" />
          <span className="text-xs">
            {soloMode ? '+1 PUNKT' : isMyTurn ? 'AKTION' : 'WARTEN...'}
          </span>
        </button>

        {!soloMode && (
          <p className="mt-3 landscape:hidden font-arcade text-xs text-[#94A3B8] text-center uppercase">
            {isMyTurn ? 'DEIN ZUG!' : `WARTE AUF ${opponent?.name || 'GEGNER'}...`}
          </p>
        )}
      </div>

      {soloMode ? (
        <div className="w-full landscape:hidden">
          <OpenButton size="sm" variant="secondary" fullWidth onClick={handleFinishSolo}>
            <Flag className="h-3.5 w-3.5" />
            <span>BEENDEN</span>
          </OpenButton>
        </div>
      ) : (
        <div className="w-full pt-2 border-t border-white/12 landscape:hidden flex items-center justify-center gap-1.5 font-arcade text-[11px] text-[#94A3B8] uppercase">
          <Sparkles className="h-3.5 w-3.5 text-[#FBBF24]" />
          <span>LIVE-SYNC AKTIV</span>
        </div>
      )}
    </div>
  );
}
