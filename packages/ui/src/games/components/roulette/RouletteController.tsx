import { RotateCcw, Trash2 } from 'lucide-react';
import type { Player, RouletteMove, RouletteState } from '@projektbox/shared/types';
import mahoganyBackdropUrl from '../../../assets/textures/roulette/mahogany_backdrop.jpg';
import { CHIP_DENOMINATIONS, RouletteTable, formatChipAmount } from './RouletteTable';
import { rouletteAudio } from './rouletteAudio';

interface RouletteControllerProps {
  gameState: RouletteState;
  allPlayers: Player[];
  myPlayer: Player;
  isBettingOpen: boolean;
  isLocked: boolean;
  timeLeft: number;
  selectedChip: number | 'all';
  onSelectChip: (val: number | 'all') => void;
  highlightedBetKey: string | null;
  onPlaceBet: (betKey: string) => void;
  onRemoveBet: (betKey: string) => void;
  onMove: (move: RouletteMove) => void;
}

export function RouletteController({
  gameState,
  allPlayers,
  myPlayer,
  isBettingOpen,
  isLocked,
  timeLeft,
  selectedChip,
  onSelectChip,
  highlightedBetKey,
  onPlaceBet,
  onRemoveBet,
  onMove,
}: RouletteControllerProps) {
  const myId = myPlayer?.id || '';
  const phase = gameState.phase;
  const myBalance = gameState.balances[myId] ?? gameState.startingBalance;
  const myBets = gameState.bets[myId] ?? {};
  const myTotalBet = Object.values(myBets).reduce((sum, v) => sum + (v || 0), 0);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#1b0704] bg-cover bg-center pt-[max(0.45rem,env(safe-area-inset-top))] pr-[max(0.65rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.65rem,env(safe-area-inset-left))] text-amber-50 select-none"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 45%, rgba(80,22,12,0.28), rgba(14,4,2,0.82)), url(${mahoganyBackdropUrl})`,
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-between gap-1.5 landscape:gap-2">
        {/* Clean single-line Mahogany HUD (pl-24 reserves MENÜ zone, uniform height) */}
        <header className="flex h-10 shrink-0 items-center justify-between gap-2 rounded-2xl border border-[#D4AF37]/50 bg-[#190805]/90 pr-3.5 pl-24 shadow-lg sm:pl-28">
          <div className="flex h-8 items-center gap-2.5 leading-none">
            <span className="font-serif text-base font-black leading-none tabular-nums text-amber-300 sm:text-lg">
              {Math.round(myBalance).toLocaleString('de-DE')} €
            </span>
            <span className="text-xs font-bold leading-none tabular-nums text-amber-100/75">
              Einsatz: {formatChipAmount(myTotalBet)} €
            </span>
          </div>

          <div className="flex h-8 items-center gap-2.5 leading-none">
            <span className="text-xs font-bold leading-none text-amber-200/80 uppercase">
              R{gameState.round}/{gameState.maxRounds}
            </span>
            <span
              className={`font-serif text-base font-black leading-none tabular-nums sm:text-lg ${
                phase === 'betting' && timeLeft <= 5 ? 'animate-pulse text-red-400' : 'text-amber-300'
              }`}
            >
              {phase === 'spinning' ? 'LÄUFT' : `${timeLeft}s`}
            </span>
          </div>
        </header>

        {/* Main Body: Single-screen-fit Table on LEFT/CENTER, Right-Handed Controls on RIGHT in Landscape */}
        <div className="flex flex-1 min-h-0 flex-col justify-between gap-1.5 landscape:grid landscape:grid-cols-[1fr_205px] landscape:items-center landscape:gap-2.5">
          {/* Portrait Table (no items-center on scroll container, fits single screen cleanly) */}
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto landscape:hidden">
            <RouletteTable
              bets={gameState.bets}
              players={allPlayers}
              myId={myId}
              isTvScreen={false}
              isBettingOpen={isBettingOpen}
              layout="portrait"
              winningNumber={gameState.winningNumber}
              phase={phase}
              highlightedBetKey={highlightedBetKey}
              onPlaceOrInspect={(betKey) => {
                if (!isBettingOpen) return;
                rouletteAudio.playChipPlace();
                onPlaceBet(betKey);
              }}
              onRemoveBet={onRemoveBet}
              compact
            />
          </div>

          {/* Landscape Horizontal Table */}
          <div className="hidden min-h-0 items-center justify-center landscape:flex">
            <RouletteTable
              bets={gameState.bets}
              players={allPlayers}
              myId={myId}
              isTvScreen={false}
              isBettingOpen={isBettingOpen}
              layout="horizontal"
              winningNumber={gameState.winningNumber}
              phase={phase}
              highlightedBetKey={highlightedBetKey}
              onPlaceOrInspect={(betKey) => {
                if (!isBettingOpen) return;
                rouletteAudio.playChipPlace();
                onPlaceBet(betKey);
              }}
              onRemoveBet={onRemoveBet}
              compact
            />
          </div>

          {/* Right-Handed Control Deck (5 chips in ONE row/tight cluster, zero dead space) */}
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-[#D4AF37]/45 bg-[#190805]/90 px-2.5 py-2 shadow-xl landscape:h-full landscape:flex-col landscape:justify-evenly">
            {/* All 5 Chips cleanly in one row on portrait, or 3+2 compact on landscape */}
            <div className="flex flex-nowrap items-center justify-center gap-1.5 landscape:flex-wrap">
              {CHIP_DENOMINATIONS.map((chip) => {
                const isSelected = selectedChip === chip.value;
                return (
                  <button
                    key={String(chip.value)}
                    type="button"
                    disabled={!isBettingOpen}
                    onClick={() => onSelectChip(chip.value)}
                    style={{
                      backgroundColor: chip.bg,
                      borderColor: chip.rim,
                      color: chip.text,
                    }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2.5px] border-dashed text-[10px] font-black leading-none shadow transition sm:h-10 sm:w-10 ${
                      isSelected
                        ? 'scale-110 ring-2 ring-[#FDE047] shadow-[0_0_12px_rgba(253,224,71,0.75)]'
                        : 'opacity-80'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Undo / Clear / 2x */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!isBettingOpen || myTotalBet === 0}
                onClick={() => onMove({ type: 'undo_bet' })}
                aria-label="Rückgängig"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/50 bg-[#2A1109] text-amber-200 disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!isBettingOpen || myTotalBet === 0}
                onClick={() => onMove({ type: 'clear_bets' })}
                aria-label="Einsätze löschen"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/50 bg-[#2A1109] text-amber-200 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!isBettingOpen || myTotalBet === 0}
                onClick={() => onMove({ type: 'double_bets' })}
                className="flex h-9 items-center justify-center rounded-full border border-[#D4AF37]/50 bg-[#2A1109] px-2.5 font-serif text-xs font-black text-amber-200 disabled:opacity-40"
              >
                2×
              </button>
            </div>

            {/* Primary Golden DREHEN Trigger (cleanly padded text inside circle) */}
            <button
              type="button"
              disabled={phase === 'spinning' || (phase === 'betting' && isLocked)}
              onClick={() => {
                if (phase === 'betting') onMove({ type: 'lock_bets' });
                else if (phase === 'result') onMove({ type: 'next_round' });
              }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-[#FEF08A] bg-gradient-to-b from-[#F59E0B] via-[#D97706] to-[#78350F] font-serif text-[10px] font-black tracking-normal text-amber-50 shadow-[0_0_20px_rgba(245,158,11,0.65)] transition active:scale-95 disabled:opacity-50 landscape:h-16 landscape:w-16 landscape:text-[11px]"
            >
              {phase === 'result' ? 'WEITER' : isLocked ? 'BEREIT' : 'DREHEN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
