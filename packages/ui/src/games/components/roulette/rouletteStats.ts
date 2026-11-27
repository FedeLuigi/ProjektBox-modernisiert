import type { RouletteColor, RouletteSpinOutcome } from '@projektbox/shared/types';
import { getRouletteColor } from '@projektbox/shared/utils';

export interface HotColdEntry {
  number: number;
  color: RouletteColor;
  count: number;
}

export interface RouletteSessionStats {
  hotNumbers: HotColdEntry[];
  coldNumbers: HotColdEntry[];
  lastWin: number;
  lastBets: number;
  netLastWin: number;
  trendBars: number[];
}

export function computeRouletteSessionStats(
  history: Array<{ round: number; number: number; color: RouletteColor }>,
  lastOutcome: RouletteSpinOutcome | undefined,
  myId: string,
  allPlayerIds: string[]
): RouletteSessionStats {
  const counts = new Map<number, number>();
  for (let n = 0; n <= 36; n++) counts.set(n, 0);
  for (const h of history) {
    counts.set(h.number, (counts.get(h.number) ?? 0) + 1);
  }

  const allEntries: HotColdEntry[] = Array.from(counts.entries()).map(([number, count]) => ({
    number,
    color: getRouletteColor(number),
    count,
  }));

  const hotNumbers = [...allEntries]
    .sort((a, b) => b.count - a.count || a.number - b.number)
    .slice(0, 5);

  const coldNumbers = [...allEntries]
    .sort((a, b) => a.count - b.count || a.number - b.number)
    .slice(0, 5);

  let lastWin = 0;
  let lastBets = 0;
  let netLastWin = 0;

  if (lastOutcome) {
    if (myId && lastOutcome.totalWagered[myId] !== undefined) {
      lastWin = lastOutcome.totalPayout[myId] ?? 0;
      lastBets = lastOutcome.totalWagered[myId] ?? 0;
      netLastWin = lastOutcome.netProfit[myId] ?? 0;
    } else {
      for (const pid of allPlayerIds) {
        lastWin += lastOutcome.totalPayout[pid] ?? 0;
        lastBets += lastOutcome.totalWagered[pid] ?? 0;
        netLastWin += lastOutcome.netProfit[pid] ?? 0;
      }
    }
  }

  // Normalized 6-bar visual trend from recent history (or smooth baseline if empty)
  const recent = history.slice(-6);
  const trendBars = Array.from({ length: 6 }, (_, i) => {
    const entry = recent[i];
    if (!entry) return 22 + i * 10;
    return entry.number === 0 ? 95 : 28 + ((entry.number * 17) % 68);
  });

  return {
    hotNumbers,
    coldNumbers,
    lastWin,
    lastBets,
    netLastWin,
    trendBars,
  };
}
