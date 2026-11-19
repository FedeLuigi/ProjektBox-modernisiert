import type { RouletteColor } from '@projektbox/shared/types';
import {
  buildPlayerChipMarkers,
  doesBetWin,
  formatBetLabel,
  getInsideBetNumbers,
  getRouletteColor,
  isNumberCellHighlightedByBet,
  PLAYER_CHIP_THEMES,
  RED_NUMBERS,
  type PlayerChipMarker,
  type PlayerChipTheme,
} from '@projektbox/shared/utils';

export {
  RED_NUMBERS,
  PLAYER_CHIP_THEMES,
  getRouletteColor,
  getInsideBetNumbers,
  doesBetWin,
  isNumberCellHighlightedByBet,
  formatBetLabel,
  buildPlayerChipMarkers,
  type RouletteColor,
  type PlayerChipTheme,
  type PlayerChipMarker,
};

export interface InsideSpot {
  betKey: string;
  kind: 'split' | 'street' | 'trio' | 'corner' | 'line';
  leftPct: number;
  topPct: number;
  widthStyle: string;
  heightStyle: string;
  zIndex: number;
  title: string;
}

function buildPortraitSpots(): InsideSpot[] {
  const spots: InsideSpot[] = [];

  // 1. 0-Splits (0-1, 0-2, 0-3) auf der oberen Naht zur 0
  [1, 2, 3].forEach((n, colIdx) => {
    spots.push({
      betKey: `split:0-${n}`,
      kind: 'split',
      leftPct: ((colIdx + 0.5) / 3) * 100,
      topPct: 0,
      widthStyle: '18%',
      heightStyle: '11px',
      zIndex: 20,
      title: `2er-Wette 0 & ${n} (17:1)`,
    });
  });

  // 2. 0-Trios (0-1-2, 0-2-3)
  spots.push(
    {
      betKey: 'street:0-1-2',
      kind: 'trio',
      leftPct: 33.3333,
      topPct: 0,
      widthStyle: '16px',
      heightStyle: '14px',
      zIndex: 30,
      title: '3er-Wette 0, 1, 2 (11:1)',
    },
    {
      betKey: 'street:0-2-3',
      kind: 'trio',
      leftPct: 66.6667,
      topPct: 0,
      widthStyle: '16px',
      heightStyle: '14px',
      zIndex: 30,
      title: '3er-Wette 0, 2, 3 (11:1)',
    }
  );

  // 3. First Four (0-1-2-3) an der linken oberen Ecke zwischen 0 und 1
  spots.push({
    betKey: 'corner:0-1-2-3',
    kind: 'corner',
    leftPct: 0,
    topPct: 0,
    widthStyle: '16px',
    heightStyle: '16px',
    zIndex: 30,
    title: '4er-Wette 0, 1, 2, 3 (8:1)',
  });

  // 4. Reihen-Splits (horizontal innerhalb jeder 3er-Reihe) + 3er-Straßen am linken Rand
  for (let r = 0; r < 12; r++) {
    const base = r * 3 + 1;
    const rowMidY = ((r + 0.5) / 12) * 100;

    spots.push(
      {
        betKey: `split:${base}-${base + 1}`,
        kind: 'split',
        leftPct: 33.3333,
        topPct: rowMidY,
        widthStyle: '11px',
        heightStyle: '4.4%',
        zIndex: 20,
        title: `2er-Wette ${base} & ${base + 1} (17:1)`,
      },
      {
        betKey: `split:${base + 1}-${base + 2}`,
        kind: 'split',
        leftPct: 66.6667,
        topPct: rowMidY,
        widthStyle: '11px',
        heightStyle: '4.4%',
        zIndex: 20,
        title: `2er-Wette ${base + 1} & ${base + 2} (17:1)`,
      },
      {
        betKey: `street:${base}-${base + 1}-${base + 2}`,
        kind: 'street',
        leftPct: 0,
        topPct: rowMidY,
        widthStyle: '12px',
        heightStyle: '4.4%',
        zIndex: 20,
        title: `3er-Reihe ${base}–${base + 2} (11:1)`,
      }
    );
  }

  // 5. Vertikale Splits (n, n+3), 4er-Carrés & 6er-Linien zwischen benachbarten Reihen
  for (let r = 0; r < 11; r++) {
    const base = r * 3 + 1;
    const seamY = ((r + 1) / 12) * 100;

    for (let c = 0; c < 3; c++) {
      const n = base + c;
      spots.push({
        betKey: `split:${n}-${n + 3}`,
        kind: 'split',
        leftPct: ((c + 0.5) / 3) * 100,
        topPct: seamY,
        widthStyle: '18%',
        heightStyle: '10px',
        zIndex: 20,
        title: `2er-Wette ${n} & ${n + 3} (17:1)`,
      });
    }

    spots.push(
      {
        betKey: `corner:${base}-${base + 1}-${base + 3}-${base + 4}`,
        kind: 'corner',
        leftPct: 33.3333,
        topPct: seamY,
        widthStyle: '16px',
        heightStyle: '16px',
        zIndex: 30,
        title: `4er-Wette ${base}, ${base + 1}, ${base + 3}, ${base + 4} (8:1)`,
      },
      {
        betKey: `corner:${base + 1}-${base + 2}-${base + 4}-${base + 5}`,
        kind: 'corner',
        leftPct: 66.6667,
        topPct: seamY,
        widthStyle: '16px',
        heightStyle: '16px',
        zIndex: 30,
        title: `4er-Wette ${base + 1}, ${base + 2}, ${base + 4}, ${base + 5} (8:1)`,
      },
      {
        betKey: `line:${base}-${base + 5}`,
        kind: 'line',
        leftPct: 0,
        topPct: seamY,
        widthStyle: '15px',
        heightStyle: '15px',
        zIndex: 30,
        title: `6er-Linie ${base}–${base + 5} (5:1)`,
      }
    );
  }

  return spots;
}

function buildHorizontalSpots(): InsideSpot[] {
  const spots: InsideSpot[] = [];

  // 1. 0-Splits (0-3 oben, 0-2 mitte, 0-1 unten) entlang linker Naht zur 0
  spots.push(
    {
      betKey: 'split:0-3',
      kind: 'split',
      leftPct: 0,
      topPct: 16.6667,
      widthStyle: '12px',
      heightStyle: '18%',
      zIndex: 20,
      title: '2er-Wette 0 & 3 (17:1)',
    },
    {
      betKey: 'split:0-2',
      kind: 'split',
      leftPct: 0,
      topPct: 50,
      widthStyle: '12px',
      heightStyle: '18%',
      zIndex: 20,
      title: '2er-Wette 0 & 2 (17:1)',
    },
    {
      betKey: 'split:0-1',
      kind: 'split',
      leftPct: 0,
      topPct: 83.3333,
      widthStyle: '12px',
      heightStyle: '18%',
      zIndex: 20,
      title: '2er-Wette 0 & 1 (17:1)',
    }
  );

  // 2. 0-Trios (0-2-3 & 0-1-2) + First Four (0-1-2-3)
  spots.push(
    {
      betKey: 'street:0-2-3',
      kind: 'trio',
      leftPct: 0,
      topPct: 33.3333,
      widthStyle: '16px',
      heightStyle: '15px',
      zIndex: 30,
      title: '3er-Wette 0, 2, 3 (11:1)',
    },
    {
      betKey: 'street:0-1-2',
      kind: 'trio',
      leftPct: 0,
      topPct: 66.6667,
      widthStyle: '16px',
      heightStyle: '15px',
      zIndex: 30,
      title: '3er-Wette 0, 1, 2 (11:1)',
    },
    {
      betKey: 'corner:0-1-2-3',
      kind: 'corner',
      leftPct: 0,
      topPct: 100,
      widthStyle: '16px',
      heightStyle: '16px',
      zIndex: 30,
      title: '4er-Wette 0, 1, 2, 3 (8:1)',
    }
  );

  // 3. Vertikale Splits innerhalb jeder Spalte + 3er-Straßen entlang unterem Rand
  for (let c = 0; c < 12; c++) {
    const base = c * 3 + 1;
    const colMidX = ((c + 0.5) / 12) * 100;

    spots.push(
      {
        betKey: `split:${base + 1}-${base + 2}`,
        kind: 'split',
        leftPct: colMidX,
        topPct: 33.3333,
        widthStyle: '4.4%',
        heightStyle: '11px',
        zIndex: 20,
        title: `2er-Wette ${base + 1} & ${base + 2} (17:1)`,
      },
      {
        betKey: `split:${base}-${base + 1}`,
        kind: 'split',
        leftPct: colMidX,
        topPct: 66.6667,
        widthStyle: '4.4%',
        heightStyle: '11px',
        zIndex: 20,
        title: `2er-Wette ${base} & ${base + 1} (17:1)`,
      },
      {
        betKey: `street:${base}-${base + 1}-${base + 2}`,
        kind: 'street',
        leftPct: colMidX,
        topPct: 100,
        widthStyle: '4.4%',
        heightStyle: '12px',
        zIndex: 20,
        title: `3er-Reihe ${base}–${base + 2} (11:1)`,
      }
    );
  }

  // 4. Horizontale Splits, 4er-Carrés & 6er-Linien zwischen benachbarten Spalten
  for (let c = 0; c < 11; c++) {
    const base = c * 3 + 1;
    const seamX = ((c + 1) / 12) * 100;

    spots.push(
      {
        betKey: `split:${base + 2}-${base + 5}`,
        kind: 'split',
        leftPct: seamX,
        topPct: 16.6667,
        widthStyle: '11px',
        heightStyle: '18%',
        zIndex: 20,
        title: `2er-Wette ${base + 2} & ${base + 5} (17:1)`,
      },
      {
        betKey: `split:${base + 1}-${base + 4}`,
        kind: 'split',
        leftPct: seamX,
        topPct: 50,
        widthStyle: '11px',
        heightStyle: '18%',
        zIndex: 20,
        title: `2er-Wette ${base + 1} & ${base + 4} (17:1)`,
      },
      {
        betKey: `split:${base}-${base + 3}`,
        kind: 'split',
        leftPct: seamX,
        topPct: 83.3333,
        widthStyle: '11px',
        heightStyle: '18%',
        zIndex: 20,
        title: `2er-Wette ${base} & ${base + 3} (17:1)`,
      },
      {
        betKey: `corner:${base + 1}-${base + 2}-${base + 4}-${base + 5}`,
        kind: 'corner',
        leftPct: seamX,
        topPct: 33.3333,
        widthStyle: '16px',
        heightStyle: '16px',
        zIndex: 30,
        title: `4er-Wette ${base + 1}, ${base + 2}, ${base + 4}, ${base + 5} (8:1)`,
      },
      {
        betKey: `corner:${base}-${base + 1}-${base + 3}-${base + 4}`,
        kind: 'corner',
        leftPct: seamX,
        topPct: 66.6667,
        widthStyle: '16px',
        heightStyle: '16px',
        zIndex: 30,
        title: `4er-Wette ${base}, ${base + 1}, ${base + 3}, ${base + 4} (8:1)`,
      },
      {
        betKey: `line:${base}-${base + 5}`,
        kind: 'line',
        leftPct: seamX,
        topPct: 100,
        widthStyle: '15px',
        heightStyle: '15px',
        zIndex: 30,
        title: `6er-Linie ${base}–${base + 5} (5:1)`,
      }
    );
  }

  return spots;
}

export const PORTRAIT_INSIDE_SPOTS: InsideSpot[] = buildPortraitSpots();
export const HORIZONTAL_INSIDE_SPOTS: InsideSpot[] = buildHorizontalSpots();
