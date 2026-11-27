import { RotateCcw, Trash2, Flame, Snowflake } from 'lucide-react';
import type { Player, RouletteMove, RouletteState } from '@projektbox/shared/types';
import { Avatar } from '../../../components/Avatar';
import mahoganyBackdropUrl from '../../../assets/textures/roulette/mahogany_backdrop.jpg';
import { computeRouletteSessionStats } from './rouletteStats';
import { RouletteWheel } from './RouletteWheel';
import { CHIP_DENOMINATIONS, RouletteTable, formatChipAmount } from './RouletteTable';
import { rouletteAudio } from './rouletteAudio';

interface RouletteTvStageProps {
  gameState: RouletteState;
  allPlayers: Player[];
  myPlayer: Player;
  isTvScreen: boolean;
  isBettingOpen: boolean;
  isLocked: boolean;
  timeLeft: number;
  selectedChip: number | 'all';
  onSelectChip: (val: number | 'all') => void;
  highlightedBetKey: string | null;
  onHoverBet: (betKey: string | null) => void;
  onPlaceBet: (betKey: string) => void;
  onRemoveBet: (betKey: string) => void;
  onMove: (move: RouletteMove) => void;
}

function formatChips(val: number): string {
  return Math.round(val).toLocaleString('de-DE');
}

function getNumberPillClass(color: 'green' | 'red' | 'black'): string {
  if (color === 'green') return 'bg-emerald-600 text-white border-emerald-300/60';
  if (color === 'red') return 'bg-red-700 text-white border-red-300/50';
  return 'bg-zinc-900 text-amber-50 border-amber-400/35';
}

export function RouletteTvStage({
  gameState,
  allPlayers,
  myPlayer,
  isTvScreen,
  isBettingOpen,
  isLocked,
  timeLeft,
  selectedChip,
  onSelectChip,
  highlightedBetKey,
  onHoverBet,
  onPlaceBet,
  onRemoveBet,
  onMove,
}: RouletteTvStageProps) {
  const myId = myPlayer?.id || '';
  const phase = gameState.phase;
  const round = gameState.round;
  const maxRounds = gameState.maxRounds;
  const history = gameState.history ?? [];
  const activeHumanPlayers = allPlayers.filter((p) => !p.isTvScreen);
  const myBalance = gameState.balances[myId] ?? gameState.startingBalance;
  const myBets = gameState.bets[myId] ?? {};
  const myTotalBet = Object.values(myBets).reduce((sum, v) => sum + (v || 0), 0);

  const stats = computeRouletteSessionStats(
    history,
    gameState.lastOutcome,
    isTvScreen ? '' : myId,
    activeHumanPlayers.map((p) => p.id)
  );

  const recentNumbers = history.slice(-13);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#1b0704] bg-cover bg-center px-4 pt-14 pb-4 text-amber-50 select-none sm:px-6 lg:px-8 lg:pt-6"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 45%, rgba(80,22,12,0.28), rgba(14,4,2,0.72)), url(${mahoganyBackdropUrl})`,
      }}
    >
      {/* Main 2-Column Casino Layout matching reference */}
      <div className="mx-auto grid h-full w-full max-w-[1440px] min-h-0 flex-1 grid-cols-1 items-center gap-4 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr]">
        {/* LEFT COLUMN: Luxury Wheel + Hot/Cold Numbers */}
        <div className="flex flex-col items-center justify-between gap-3">
          <RouletteWheel
            phase={phase}
            winningNumber={gameState.winningNumber}
            spinStartedAt={gameState.spinStartedAt}
            sizeClass="w-56 h-56 sm:w-68 sm:h-68 lg:w-[310px] lg:h-[310px] xl:w-[335px] xl:h-[335px]"
          />

          {/* Hot & Cold Numbers Panels */}
          <div className="w-full max-w-[360px] space-y-2 rounded-2xl border border-[#D4AF37]/45 bg-[#190805]/85 p-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-amber-300 uppercase">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                <span>Heiße Zahlen</span>
              </div>
              <div className="flex items-center gap-1.5">
                {stats.hotNumbers.map((entry) => (
                  <span
                    key={`hot-${entry.number}`}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black leading-none shadow ${getNumberPillClass(
                      entry.color
                    )}`}
                  >
                    {entry.number}
                  </span>
                ))}
              </div>
            </div>

            <div className="h-px bg-amber-500/20" />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-sky-300 uppercase">
                <Snowflake className="h-3.5 w-3.5 text-sky-400" />
                <span>Kalte Zahlen</span>
              </div>
              <div className="flex items-center gap-1.5">
                {stats.coldNumbers.map((entry) => (
                  <span
                    key={`cold-${entry.number}`}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black leading-none shadow ${getNumberPillClass(
                      entry.color
                    )}`}
                  >
                    {entry.number}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Player/Stats Header + Recent Results + Main Betting Felt */}
        <div className="flex h-full min-h-0 flex-col justify-between gap-3">
          {/* Top Bar: Players + Session Stats Card */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_320px]">
            {/* Left Top: Active Players / Solo Bankroll & Round Timer */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/45 bg-[#190805]/80 px-4 py-2.5 shadow-lg">
              {isTvScreen && activeHumanPlayers.length > 1 ? (
                <div className="flex flex-wrap items-center gap-3">
                  {activeHumanPlayers.slice(0, 5).map((p) => {
                    const bal = gameState.balances[p.id] ?? gameState.startingBalance;
                    const isReady = gameState.lockedPlayerIds.includes(p.id);
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <Avatar config={p.avatar} size={28} />
                        <div className="leading-tight">
                          <div className="text-xs font-bold text-amber-100">
                            {p.name} {isReady ? '✓' : ''}
                          </div>
                          <div className="text-xs font-black tabular-nums text-amber-300">
                            {formatChips(bal)} €
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar config={myPlayer.avatar} size={38} />
                  <div className="leading-tight">
                    <div className="text-xs font-bold tracking-wide text-amber-200/80">
                      {myPlayer.name}
                    </div>
                    <div className="font-serif text-xl font-black leading-none tabular-nums text-amber-300">
                      {formatChips(myBalance)} €
                    </div>
                  </div>
                </div>
              )}

              {/* Round & Phase Countdown */}
              <div className="flex items-center gap-3 leading-none">
                <span className="text-xs font-bold tracking-wider text-amber-200/80 uppercase">
                  Runde {round}/{maxRounds}
                </span>
                <span
                  className={`font-serif text-2xl font-black leading-none tabular-nums ${
                    phase === 'betting' && timeLeft <= 5
                      ? 'animate-pulse text-red-400'
                      : 'text-amber-300'
                  }`}
                >
                  {phase === 'spinning' ? 'LÄUFT!' : `${timeLeft}s`}
                </span>
              </div>
            </div>

            {/* Right Top: Session Stats Panel (German) */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/45 bg-[#190805]/85 px-4 py-2 shadow-lg">
              <div className="space-y-0.5 text-xs">
                <div className="font-serif text-[11px] font-bold tracking-widest text-amber-300 uppercase">
                  Sitzungs-Statistik
                </div>
                <div className="flex items-center justify-between gap-4 text-amber-100/80">
                  <span>Letzter Gewinn:</span>
                  <span className="font-bold tabular-nums text-amber-200">
                    {formatChips(stats.lastWin)} €
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-amber-100/80">
                  <span>Letzter Einsatz:</span>
                  <span className="font-bold tabular-nums text-amber-200">
                    {formatChips(stats.lastBets)} €
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-amber-100/80">
                  <span>Netto-Ergebnis:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      stats.netLastWin >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {stats.netLastWin >= 0 ? '+' : ''}
                    {formatChips(stats.netLastWin)} €
                  </span>
                </div>
              </div>

              {/* Mini Trend Bar Chart */}
              <div className="flex h-12 items-end gap-1 pt-2">
                {stats.trendBars.map((pct, i) => (
                  <div
                    key={i}
                    className="w-2.5 rounded-t bg-gradient-to-t from-red-800 to-red-500"
                    style={{ height: `${pct}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Recent Results Ribbon (py-1.5 px-1.5 prevents ring clipping on active number) */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/40 bg-[#190805]/80 px-3 py-1">
            <span className="shrink-0 font-serif text-[11px] font-bold tracking-widest text-amber-300 uppercase">
              Letzte Zahlen
            </span>
            <div className="flex flex-1 items-center justify-end gap-1.5 overflow-x-auto px-1.5 py-1.5">
              {recentNumbers.length === 0 ? (
                <span className="text-xs text-amber-200/50">Noch keine Drehung</span>
              ) : (
                recentNumbers.map((item, idx) => (
                  <span
                    key={`${item.round}-${idx}`}
                    className={`flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-xs font-black leading-none shadow ${getNumberPillClass(
                      item.color
                    )} ${idx === recentNumbers.length - 1 ? 'ring-2 ring-amber-300' : ''}`}
                  >
                    {item.number}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Central Roulette Betting Felt */}
          <div className="flex flex-1 min-h-0 items-center justify-center">
            <RouletteTable
              bets={gameState.bets}
              players={allPlayers}
              myId={myId}
              isTvScreen={isTvScreen}
              isBettingOpen={isBettingOpen}
              layout="horizontal"
              winningNumber={gameState.winningNumber}
              phase={phase}
              highlightedBetKey={highlightedBetKey}
              onHoverBet={onHoverBet}
              onPlaceOrInspect={(betKey) => {
                if (!isBettingOpen) return;
                rouletteAudio.playChipPlace();
                onPlaceBet(betKey);
              }}
              onRemoveBet={onRemoveBet}
            />
          </div>

          {/* Bottom Bar: Chips (left) + Bet Controls & Golden SPIN Button (right) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/45 bg-[#190805]/85 px-4 py-2 shadow-xl">
            {/* Chip Denominations */}
            <div className="flex items-center gap-2">
              {CHIP_DENOMINATIONS.map((chip) => {
                const isSelected = selectedChip === chip.value;
                return (
                  <button
                    key={String(chip.value)}
                    type="button"
                    disabled={isTvScreen || !isBettingOpen}
                    onClick={() => onSelectChip(chip.value)}
                    style={{
                      backgroundColor: chip.bg,
                      borderColor: chip.rim,
                      color: chip.text,
                    }}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-dashed text-[11px] font-black leading-none shadow-lg transition sm:h-12 sm:w-12 ${
                      isSelected
                        ? 'scale-110 ring-2 ring-[#FDE047] shadow-[0_0_16px_rgba(253,224,71,0.75)]'
                        : 'opacity-85 hover:opacity-100'
                    } ${isTvScreen ? 'cursor-default' : ''}`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Right-Handed Action Cluster + Golden SPIN */}
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <div className="text-[10px] font-bold tracking-wider text-amber-200/70 uppercase">
                  Einsatz
                </div>
                <div className="font-serif text-lg font-black tabular-nums text-amber-300">
                  {formatChipAmount(myTotalBet)} €
                </div>
              </div>

              {!isTvScreen && (
                <>
                  <button
                    type="button"
                    disabled={!isBettingOpen || myTotalBet === 0}
                    onClick={() => onMove({ type: 'undo_bet' })}
                    aria-label="Rückgängig"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D4AF37]/55 bg-[#2A1109] text-amber-200 transition hover:bg-[#3F190D] disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={!isBettingOpen || myTotalBet === 0}
                    onClick={() => onMove({ type: 'clear_bets' })}
                    aria-label="Einsätze löschen"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D4AF37]/55 bg-[#2A1109] text-amber-200 transition hover:bg-[#3F190D] disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={
                      phase === 'spinning' ||
                      (phase === 'betting' && isLocked)
                    }
                    onClick={() => {
                      if (phase === 'betting') onMove({ type: 'lock_bets' });
                      else if (phase === 'result') onMove({ type: 'next_round' });
                    }}
                    className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-[3px] border-[#FEF08A] bg-gradient-to-b from-[#F59E0B] via-[#D97706] to-[#78350F] font-serif text-sm font-black tracking-wider text-amber-50 shadow-[0_0_24px_rgba(245,158,11,0.65)] transition hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <span className="leading-none">
                      {phase === 'result' ? 'WEITER' : isLocked ? 'BEREIT' : 'DREHEN'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
