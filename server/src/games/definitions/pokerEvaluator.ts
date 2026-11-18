import crypto from 'crypto';

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export interface PokerCard {
  suit: CardSuit;
  rank: number; // 2..14 (11=Bube, 12=Dame, 13=König, 14=Ass)
}

export interface EvaluatedPokerHand {
  category: number; // 0 (High Card) .. 8 (Straight Flush / Royal Flush)
  score: number; // Vergleichbarer Gesamtwert (Basis-15-Kodierung)
  name: string; // Deutscher Handname
  bestCards: PokerCard[]; // Die 5 Karten der besten Hand
}

const SUITS: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function createShuffledDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ suit, rank });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

export function formatRankLabel(rank: number): string {
  switch (rank) {
    case 14:
      return 'A';
    case 13:
      return 'K';
    case 12:
      return 'D';
    case 11:
      return 'B';
    default:
      return String(rank);
  }
}

export function formatRankPluralGerman(rank: number): string {
  switch (rank) {
    case 14:
      return 'Asse';
    case 13:
      return 'Könige';
    case 12:
      return 'Damen';
    case 11:
      return 'Buben';
    default:
      return `${rank}er`;
  }
}

function encodeScore(category: number, tieBreakers: number[]): number {
  let score = category;
  for (let i = 0; i < 5; i++) {
    score = score * 15 + (tieBreakers[i] ?? 0);
  }
  return score;
}

function getStraightHighRank(sortedDescUniqueRanks: number[]): number | null {
  if (sortedDescUniqueRanks.length !== 5) return null;
  if (sortedDescUniqueRanks[0] - sortedDescUniqueRanks[4] === 4) {
    return sortedDescUniqueRanks[0];
  }
  // Wheel-Straße: A-5-4-3-2
  if (
    sortedDescUniqueRanks[0] === 14 &&
    sortedDescUniqueRanks[1] === 5 &&
    sortedDescUniqueRanks[2] === 4 &&
    sortedDescUniqueRanks[3] === 3 &&
    sortedDescUniqueRanks[4] === 2
  ) {
    return 5;
  }
  return null;
}

function evaluateFiveCards(cards: PokerCard[]): EvaluatedPokerHand {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const isFlush = sorted.every((c) => c.suit === sorted[0].suit);

  const countMap = new Map<number, number>();
  for (const r of ranks) {
    countMap.set(r, (countMap.get(r) || 0) + 1);
  }

  // Sortiere Gruppen erst nach Häufigkeit desc, dann nach Rang desc
  const groups = Array.from(countMap.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const uniqueDesc = Array.from(countMap.keys()).sort((a, b) => b - a);
  const straightHigh = getStraightHighRank(uniqueDesc);

  if (isFlush && straightHigh !== null) {
    const isRoyal = straightHigh === 14;
    return {
      category: 8,
      score: encodeScore(8, [straightHigh]),
      name: isRoyal ? 'Royal Flush' : 'Straight Flush',
      bestCards: sorted,
    };
  }

  if (groups[0][1] === 4) {
    const quadRank = groups[0][0];
    const kicker = groups[1][0];
    return {
      category: 7,
      score: encodeScore(7, [quadRank, kicker]),
      name: `Vierling (${formatRankPluralGerman(quadRank)})`,
      bestCards: sorted,
    };
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    const tripRank = groups[0][0];
    const pairRank = groups[1][0];
    return {
      category: 6,
      score: encodeScore(6, [tripRank, pairRank]),
      name: `Full House (${formatRankPluralGerman(tripRank)} & ${formatRankPluralGerman(pairRank)})`,
      bestCards: sorted,
    };
  }

  if (isFlush) {
    return {
      category: 5,
      score: encodeScore(5, ranks),
      name: `Flush (${formatRankLabel(ranks[0])} hoch)`,
      bestCards: sorted,
    };
  }

  if (straightHigh !== null) {
    return {
      category: 4,
      score: encodeScore(4, [straightHigh]),
      name: `Straße (${formatRankLabel(straightHigh)} hoch)`,
      bestCards: sorted,
    };
  }

  if (groups[0][1] === 3) {
    const tripRank = groups[0][0];
    const kickers = groups.slice(1).map((g) => g[0]);
    return {
      category: 3,
      score: encodeScore(3, [tripRank, ...kickers]),
      name: `Drilling (${formatRankPluralGerman(tripRank)})`,
      bestCards: sorted,
    };
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const highPair = groups[0][0];
    const lowPair = groups[1][0];
    const kicker = groups[2][0];
    return {
      category: 2,
      score: encodeScore(2, [highPair, lowPair, kicker]),
      name: `Zwei Paare (${formatRankPluralGerman(highPair)} & ${formatRankPluralGerman(lowPair)})`,
      bestCards: sorted,
    };
  }

  if (groups[0][1] === 2) {
    const pairRank = groups[0][0];
    const kickers = groups.slice(1).map((g) => g[0]);
    return {
      category: 1,
      score: encodeScore(1, [pairRank, ...kickers]),
      name: `Ein Paar (${formatRankPluralGerman(pairRank)})`,
      bestCards: sorted,
    };
  }

  return {
    category: 0,
    score: encodeScore(0, ranks),
    name: `Höchste Karte (${formatRankLabel(ranks[0])})`,
    bestCards: sorted,
  };
}

/**
 * Bewertet die bestmögliche 5-Karten-Hand aus 5 bis 7 Karten (oder Pre-Flop/Teilhand).
 */
export function evaluateBestPokerHand(cards: PokerCard[]): EvaluatedPokerHand | null {
  if (cards.length < 2) return null;

  // Bei 2-4 Karten (z. B. Pre-Flop-Anzeige auf Handy)
  if (cards.length < 5) {
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);
    if (sorted.length === 2 && sorted[0].rank === sorted[1].rank) {
      return {
        category: 1,
        score: encodeScore(1, [sorted[0].rank]),
        name: `Pocket Paar (${formatRankPluralGerman(sorted[0].rank)})`,
        bestCards: sorted,
      };
    }
    return {
      category: 0,
      score: encodeScore(0, sorted.map((c) => c.rank)),
      name: `Höchste Karte (${formatRankLabel(sorted[0].rank)})`,
      bestCards: sorted,
    };
  }

  let best: EvaluatedPokerHand | null = null;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const candidate = evaluateFiveCards([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || candidate.score > best.score) {
              best = candidate;
            }
          }
        }
      }
    }
  }

  return best;
}
