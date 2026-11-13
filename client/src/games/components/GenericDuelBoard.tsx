import { Flag, Sparkles, Swords, Zap } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalButton, CrystalPanel, CrystalReadout } from '../../components/CrystalUI';

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
    <div className="w-full max-w-sm landscape:max-w-lg">
      <CrystalPanel
        title={soloMode ? 'SOLO CHALLENGE' : 'CRYSTAL DUEL'}
        contentClassName="flex flex-col landscape:grid landscape:grid-cols-[1fr_auto] landscape:items-center landscape:gap-6 items-center justify-between gap-4 py-5 px-5"
      >
        {/* Linke Spalte im Querformat: Punktestand & Status */}
        <div className="w-full flex flex-col items-center landscape:items-stretch gap-3">
          {soloMode ? (
            <CrystalReadout label="SCORE" value={myScore} />
          ) : (
            <div className="w-full flex items-center justify-around py-3 px-3 bg-[#B8ECFD]/85 border-[3px] border-[#17608E] shadow-[inset_0_2px_0_#E6F8FF]">
              <div className="flex flex-col items-center min-w-0">
                <span className="font-arcade text-xs text-[#15608E] truncate max-w-[90px] uppercase">
                  {myPlayer.name}
                </span>
                <span className="font-arcade text-2xl text-[#0E4D78] mt-0.5">{myScore}</span>
              </div>

              <div className="flex flex-col items-center px-2 text-[#17689A]">
                <Swords className="h-5 w-5" />
                <span className="font-arcade text-[10px] uppercase tracking-wider mt-0.5">
                  VS
                </span>
              </div>

              <div className="flex flex-col items-center min-w-0">
                <span className="font-arcade text-xs text-[#17689A] truncate max-w-[90px] uppercase">
                  {opponent?.name || 'OPPONENT'}
                </span>
                <span className="font-arcade text-2xl text-[#0E4D78] mt-0.5">{oppScore}</span>
              </div>
            </div>
          )}

          {!soloMode && (
            <p className="hidden landscape:block font-arcade text-xs text-[#15608E] text-center uppercase">
              {isMyTurn ? 'YOUR TURN!' : `WAITING FOR ${opponent?.name || 'OPPONENT'}...`}
            </p>
          )}

          {soloMode && (
            <div className="hidden landscape:block">
              <CrystalButton size="sm" variant="secondary" fullWidth onClick={handleFinishSolo}>
                <Flag className="h-3.5 w-3.5" />
                <span>FINISH</span>
              </CrystalButton>
            </div>
          )}
        </div>

        {/* Interaktions-Button */}
        <div className="flex flex-col items-center my-1 landscape:my-0">
          <button
            type="button"
            disabled={!canAct}
            onClick={handleAction}
            className={`h-28 w-28 landscape:h-24 landscape:w-24 flex flex-col items-center justify-center gap-1.5 font-arcade uppercase tracking-wide transition-all border-[4px] active:scale-95 ${
              canAct
                ? 'bg-[#2B9FD6] hover:bg-[#38ACE0] text-white border-[#0E5A8A] shadow-[inset_0_3px_0_#8AD8F8,0_6px_0_rgba(14,62,96,0.45)] cursor-pointer hover:scale-105'
                : 'bg-[#74BCE0]/60 text-[#15608E]/50 border-[#17608E]/60 cursor-not-allowed opacity-70'
            }`}
            style={{ clipPath: 'polygon(6% 0%, 96% 4%, 100% 94%, 0% 100%)' }}
          >
            <Zap className="h-7 w-7 fill-current" />
            <span className="text-xs">
              {soloMode ? '+1 SCORE' : isMyTurn ? 'STRIKE' : 'WAIT...'}
            </span>
          </button>

          {!soloMode && (
            <p className="mt-3 landscape:hidden font-arcade text-xs text-[#15608E] text-center uppercase">
              {isMyTurn ? 'YOUR TURN!' : `WAITING FOR ${opponent?.name || 'OPPONENT'}...`}
            </p>
          )}
        </div>

        {soloMode ? (
          <div className="w-full landscape:hidden">
            <CrystalButton size="sm" variant="secondary" fullWidth onClick={handleFinishSolo}>
              <Flag className="h-3.5 w-3.5" />
              <span>FINISH</span>
            </CrystalButton>
          </div>
        ) : (
          <div className="w-full pt-2 border-t-2 border-[#66C4EE] landscape:hidden flex items-center justify-center gap-1.5 font-arcade text-[11px] text-[#15608E] uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>LIVE SYNC ACTIVE</span>
          </div>
        )}
      </CrystalPanel>
    </div>
  );
}
