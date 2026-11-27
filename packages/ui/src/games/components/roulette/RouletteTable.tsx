import { useMemo } from 'react';
import type { Player, RouletteState } from '@projektbox/shared/types';
import {
  buildPlayerChipMarkers,
  formatBetLabel,
  getRouletteColor,
  HORIZONTAL_INSIDE_SPOTS,
  isNumberCellHighlightedByBet,
  PORTRAIT_INSIDE_SPOTS,
  type InsideSpot,
  type PlayerChipMarker,
} from '../rouletteBets';

export const CHIP_DENOMINATIONS: Array<{
  value: number | 'all';
  label: string;
  bg: string;
  rim: string;
  text: string;
}> = [
  { value: 5, label: '5', bg: '#B91C1C', rim: '#FCA5A5', text: '#FFFFFF' },
  { value: 25, label: '25', bg: '#047857', rim: '#6EE7B7', text: '#FFFFFF' },
  { value: 100, label: '100', bg: '#1E293B', rim: '#FBBF24', text: '#FEF08A' },
  { value: 500, label: '500', bg: '#6D28D9', rim: '#DDD6FE', text: '#FFFFFF' },
  { value: 'all', label: 'MAX', bg: '#B45309', rim: '#FDE047', text: '#FEF9C3' },
];

export function getChipStyle(amount: number) {
  if (amount >= 1000) return CHIP_DENOMINATIONS[4];
  if (amount >= 500) return CHIP_DENOMINATIONS[3];
  if (amount >= 100) return CHIP_DENOMINATIONS[2];
  if (amount >= 25) return CHIP_DENOMINATIONS[1];
  return CHIP_DENOMINATIONS[0];
}

export function formatChipAmount(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(Math.round(amount));
}

const HORIZONTAL_ROWS = [
  Array.from({ length: 12 }, (_, c) => (c + 1) * 3), // 3, 6, ..., 36
  Array.from({ length: 12 }, (_, c) => c * 3 + 2), // 2, 5, ..., 35
  Array.from({ length: 12 }, (_, c) => c * 3 + 1), // 1, 4, ..., 34
];

const PORTRAIT_ROWS = Array.from({ length: 12 }, (_, r) => [r * 3 + 1, r * 3 + 2, r * 3 + 3]);

interface PlacedChipItem {
  marker: PlayerChipMarker;
  amount: number;
}

interface RouletteTableProps {
  bets: RouletteState['bets'];
  players: Player[];
  myId: string;
  isTvScreen: boolean;
  isBettingOpen: boolean;
  layout: 'horizontal' | 'portrait';
  winningNumber: number | null;
  phase: RouletteState['phase'];
  highlightedBetKey: string | null;
  onPlaceOrInspect: (betKey: string) => void;
  onRemoveBet?: (betKey: string) => void;
  onHoverBet?: (betKey: string | null) => void;
  compact?: boolean;
}

function ChipStack({
  items,
  showPlayerColors,
  onClick,
}: {
  items: PlacedChipItem[];
  showPlayerColors: boolean;
  onClick?: () => void;
}) {
  if (items.length === 0) return null;
  const top = items[0];
  const style = getChipStyle(top.amount);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick();
      }}
      className="pointer-events-auto relative z-30 flex items-center justify-center"
    >
      {items.length > 1 && (
        <div
          className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full border border-amber-200/80 shadow"
          style={{ backgroundColor: showPlayerColors ? items[1].marker.theme.color : style.bg }}
        />
      )}
      <div
        className="flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-dashed px-1 text-[10px] font-black leading-none shadow-[0_3px_8px_rgba(0,0,0,0.75)]"
        style={{
          backgroundColor: showPlayerColors ? top.marker.theme.color : style.bg,
          borderColor: showPlayerColors ? top.marker.theme.border : style.rim,
          color: showPlayerColors ? top.marker.theme.text : style.text,
        }}
      >
        {formatChipAmount(totalAmount)}
      </div>
    </div>
  );
}

export function RouletteTable({
  bets,
  players,
  myId,
  isTvScreen,
  isBettingOpen,
  layout,
  winningNumber,
  phase,
  highlightedBetKey,
  onPlaceOrInspect,
  onRemoveBet,
  onHoverBet,
  compact = false,
}: RouletteTableProps) {
  const showPlayerColors = isTvScreen || players.length > 1;
  const showResultHighlight = (phase === 'result' || phase === 'game_over') && winningNumber !== null;

  const chipsByBet = useMemo(() => {
    const playerMarkers = buildPlayerChipMarkers(players, myId);
    const map = new Map<string, PlacedChipItem[]>();

    for (const [playerId, playerBets] of Object.entries(bets)) {
      const marker = playerMarkers.get(playerId);
      if (!marker) continue;
      for (const [betKey, amount] of Object.entries(playerBets || {})) {
        if (!amount || amount <= 0) continue;
        const list = map.get(betKey) ?? [];
        list.push({ marker, amount });
        map.set(betKey, list);
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => Number(b.marker.isMe) - Number(a.marker.isMe) || b.amount - a.amount);
    }
    return map;
  }, [bets, players, myId]);

  const renderMarkers = (betKey: string) => {
    const items = chipsByBet.get(betKey) ?? [];
    if (items.length === 0) return null;
    const hasMyBet = items.some((item) => item.marker.isMe);
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <ChipStack
          items={items}
          showPlayerColors={showPlayerColors}
          onClick={
            isBettingOpen && hasMyBet && onRemoveBet ? () => onRemoveBet(betKey) : undefined
          }
        />
      </div>
    );
  };

  const renderNumberCell = (num: number) => {
    const color = getRouletteColor(num);
    const betKey = `number:${num}`;
    const isWin = showResultHighlight && winningNumber === num;
    const isHighlighted = isNumberCellHighlightedByBet(highlightedBetKey, num);

    const bgClass =
      color === 'red'
        ? 'bg-gradient-to-b from-[#991B1B] to-[#6B0F0F] hover:from-[#B91C1C] hover:to-[#7F1D1D]'
        : 'bg-gradient-to-b from-[#1E2229] to-[#0E1015] hover:from-[#2A303B] hover:to-[#171A21]';

    return (
      <button
        key={num}
        type="button"
        data-bet-key={betKey}
        onClick={() => onPlaceOrInspect(betKey)}
        onMouseEnter={() => onHoverBet?.(betKey)}
        onMouseLeave={() => onHoverBet?.(null)}
        className={`relative flex items-center justify-center border border-[#D4AF37]/55 font-serif font-bold text-amber-50 transition ${bgClass} ${
          compact ? 'h-9 text-sm' : 'h-11 text-base lg:h-12 lg:text-lg'
        } ${isHighlighted ? 'ring-2 ring-inset ring-amber-300 brightness-125' : ''} ${
          isWin ? 'z-20 ring-2 ring-[#FDE047] shadow-[0_0_18px_rgba(253,224,71,0.85)]' : ''
        }`}
      >
        <span className="leading-none">{num}</span>
        {renderMarkers(betKey)}
      </button>
    );
  };

  const renderInsideSpots = (spots: InsideSpot[]) =>
    spots.map((spot) => {
      const hasMarkers = (chipsByBet.get(spot.betKey)?.length ?? 0) > 0;
      const isActive = highlightedBetKey === spot.betKey;
      if (!isBettingOpen && !hasMarkers) return null;

      return (
        <button
          key={spot.betKey}
          type="button"
          data-bet-key={spot.betKey}
          title={spot.title}
          aria-label={formatBetLabel(spot.betKey) ?? spot.title}
          onClick={() => onPlaceOrInspect(spot.betKey)}
          onMouseEnter={() => onHoverBet?.(spot.betKey)}
          onMouseLeave={() => onHoverBet?.(null)}
          style={{
            left: `${spot.leftPct}%`,
            top: `${spot.topPct}%`,
            width: spot.widthStyle,
            height: spot.heightStyle,
            zIndex: spot.zIndex,
          }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition ${
            isActive ? 'bg-amber-300/60 ring-2 ring-amber-200' : 'hover:bg-amber-300/35'
          }`}
        >
          {renderMarkers(spot.betKey)}
        </button>
      );
    });

  const renderOutsideButton = (betKey: string, label: string, extraClass = '') => {
    const isHighlighted = highlightedBetKey === betKey;
    return (
      <button
        key={betKey}
        type="button"
        data-bet-key={betKey}
        onClick={() => onPlaceOrInspect(betKey)}
        onMouseEnter={() => onHoverBet?.(betKey)}
        onMouseLeave={() => onHoverBet?.(null)}
        className={`relative flex items-center justify-center border border-[#D4AF37]/55 bg-[#12161E]/85 font-serif text-xs font-bold tracking-wide text-amber-100 transition hover:bg-[#1E2430] sm:text-sm ${
          compact ? 'h-9' : 'h-10 lg:h-11'
        } ${isHighlighted ? 'ring-2 ring-inset ring-amber-300' : ''} ${extraClass}`}
      >
        <span className="leading-none">{label}</span>
        {renderMarkers(betKey)}
      </button>
    );
  };

  if (layout === 'portrait') {
    return (
      <div
        data-roulette-table="true"
        className="w-full rounded-2xl border-2 border-[#D4AF37]/70 bg-[#0A1612]/90 p-2 shadow-[0_12px_32px_rgba(0,0,0,0.65)]"
      >
        <button
          type="button"
          data-bet-key="number:0"
          onClick={() => onPlaceOrInspect('number:0')}
          className={`relative mb-0.5 flex h-10 w-full items-center justify-center rounded-t-xl border border-[#D4AF37]/60 bg-gradient-to-b from-[#047857] to-[#064E3B] font-serif text-lg font-bold text-amber-50 ${
            showResultHighlight && winningNumber === 0
              ? 'ring-2 ring-[#FDE047] shadow-[0_0_16px_rgba(253,224,71,0.8)]'
              : ''
          }`}
        >
          <span className="leading-none">0</span>
          {renderMarkers('number:0')}
        </button>

        <div className="relative grid grid-cols-3">
          {PORTRAIT_ROWS.flatMap((row) => row.map((num) => renderNumberCell(num)))}
          {renderInsideSpots(PORTRAIT_INSIDE_SPOTS)}
        </div>

        <div className="mt-0.5 grid grid-cols-3">
          {renderOutsideButton('column:1', '2:1')}
          {renderOutsideButton('column:2', '2:1')}
          {renderOutsideButton('column:3', '2:1')}
        </div>

        <div className="mt-1 grid grid-cols-3">
          {renderOutsideButton('dozen:1', '1st 12')}
          {renderOutsideButton('dozen:2', '2nd 12')}
          {renderOutsideButton('dozen:3', '3rd 12')}
        </div>
        <div className="mt-0.5 grid grid-cols-3">
          {renderOutsideButton('range:low', '1-18')}
          {renderOutsideButton('parity:even', 'EVEN')}
          {renderOutsideButton('color:red', 'ROT', 'bg-gradient-to-b from-[#991B1B] to-[#6B0F0F]')}
          {renderOutsideButton('color:black', 'SCHWARZ', 'bg-gradient-to-b from-[#1E2229] to-[#0E1015]')}
          {renderOutsideButton('parity:odd', 'ODD')}
          {renderOutsideButton('range:high', '19-36')}
        </div>
      </div>
    );
  }

  return (
    <div
      data-roulette-table="true"
      className="w-full rounded-2xl border-2 border-[#D4AF37]/75 bg-[#091410]/85 p-2 shadow-[0_14px_36px_rgba(0,0,0,0.65)]"
    >
      <div className="grid grid-cols-[44px_1fr_44px] sm:grid-cols-[52px_1fr_52px]">
        <button
          type="button"
          data-bet-key="number:0"
          onClick={() => onPlaceOrInspect('number:0')}
          onMouseEnter={() => onHoverBet?.('number:0')}
          onMouseLeave={() => onHoverBet?.(null)}
          className={`relative flex items-center justify-center rounded-l-xl border border-[#D4AF37]/60 bg-gradient-to-b from-[#047857] to-[#064E3B] font-serif text-xl font-bold text-amber-50 transition hover:brightness-110 ${
            showResultHighlight && winningNumber === 0
              ? 'ring-2 ring-[#FDE047] shadow-[0_0_18px_rgba(253,224,71,0.85)]'
              : ''
          }`}
        >
          <span className="leading-none">0</span>
          {renderMarkers('number:0')}
        </button>

        <div className="relative grid grid-cols-12">
          {HORIZONTAL_ROWS.flatMap((row) => row.map((num) => renderNumberCell(num)))}
          {renderInsideSpots(HORIZONTAL_INSIDE_SPOTS)}
        </div>

        <div className="grid grid-rows-3">
          {renderOutsideButton('column:3', '2:1', 'rounded-tr-xl h-auto')}
          {renderOutsideButton('column:2', '2:1', 'h-auto')}
          {renderOutsideButton('column:1', '2:1', 'rounded-br-xl h-auto')}
        </div>
      </div>

      <div className="mt-1 grid grid-cols-[44px_1fr_44px] sm:grid-cols-[52px_1fr_52px]">
        <div />
        <div className="grid grid-cols-3">
          {renderOutsideButton('dozen:1', '1st 12')}
          {renderOutsideButton('dozen:2', '2nd 12')}
          {renderOutsideButton('dozen:3', '3rd 12')}
        </div>
        <div />
      </div>

      <div className="mt-0.5 grid grid-cols-[44px_1fr_44px] sm:grid-cols-[52px_1fr_52px]">
        <div />
        <div className="grid grid-cols-6">
          {renderOutsideButton('range:low', '1 to 18', 'rounded-bl-xl')}
          {renderOutsideButton('parity:even', 'EVEN')}
          {renderOutsideButton('color:red', '◆', 'bg-gradient-to-b from-[#991B1B] to-[#6B0F0F] text-red-200')}
          {renderOutsideButton('color:black', '◆', 'bg-gradient-to-b from-[#1E2229] to-[#0E1015] text-stone-300')}
          {renderOutsideButton('parity:odd', 'ODD')}
          {renderOutsideButton('range:high', '19 to 36', 'rounded-br-xl')}
        </div>
        <div />
      </div>
    </div>
  );
}
