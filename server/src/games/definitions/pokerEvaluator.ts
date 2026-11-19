import crypto from 'node:crypto';
import type { CardSuit, PokerCard } from '@projektbox/shared/types';
import {
  evaluateBestPokerHand,
  formatRankLabel,
  formatRankPluralGerman,
  POKER_SUITS,
  type EvaluatedPokerHand,
} from '@projektbox/shared/utils';

export {
  evaluateBestPokerHand,
  formatRankLabel,
  formatRankPluralGerman,
  type CardSuit,
  type PokerCard,
  type EvaluatedPokerHand,
};

export function createShuffledDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of POKER_SUITS) {
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
