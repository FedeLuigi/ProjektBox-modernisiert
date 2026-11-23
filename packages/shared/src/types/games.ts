import type { BaseGameState } from './multiplayer.js';

export type KnownGameId =
  | 'draw-and-guess'
  | 'stadt-land-fluss'
  | 'roulette'
  | 'texas-holdem'
  | 'zombie-survival';

// ─── DRAW & GUESS ───
export interface StrokeSegment {
  x0: number; // 0..1 normalisierte Koordinaten für perfekte Skalierung (Handy -> 4K TV)
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
  strokeId?: number;
}

export interface DrawAndGuessGuess {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface DrawAndGuessState extends BaseGameState {
  gameId: 'draw-and-guess';
  currentDrawerId: string;
  secretWord: string;
  wordLength: number;
  categoryName: string;
  categoryFilter?: string;
  customWordsEnabled: boolean;
  usedWords?: string[];
  round: number;
  maxRounds: number;
  roundDuration: number;
  roundEndsAt: number;
  chooseWordEndsAt?: number;
  strokes: StrokeSegment[];
  guesses: DrawAndGuessGuess[];
  scores: Record<string, number>;
  correctGuesserIds: string[];
  roundStatus: 'choosing_word' | 'drawing' | 'round_over' | 'game_over';
  roundWinnerName?: string;
  roundEndReason?: 'guessed' | 'time_up';
}

export type DrawAndGuessMove =
  | { type: 'stroke'; stroke: StrokeSegment }
  | { type: 'undo' }
  | { type: 'clear' }
  | { type: 'set_word'; word: string }
  | { type: 'guess'; text: string }
  | { type: 'time_up' }
  | { type: 'next_round' };

// ─── STADT, LAND, FLUSS ───
export type StadtLandFlussPreset = 'klassisch' | 'party' | 'bunt';

export interface EvaluatedAnswer {
  text: string;
  valid: boolean;
  rejected: boolean;
  points: number;
  reason?: string;
}

export interface StadtLandFlussState extends BaseGameState {
  gameId: 'stadt-land-fluss';
  round: number;
  maxRounds: number;
  roundDuration: number;
  stopButtonEnabled: boolean;
  customWordsEnabled?: boolean;
  categoryChooserId?: string | null;
  categoryChooserName?: string;
  categoryPreset: StadtLandFlussPreset;
  categories: string[];
  letter: string;
  usedLetters: string[];
  phase: 'choosing_categories' | 'writing' | 'review' | 'round_over' | 'game_over';
  phaseEndsAt: number;
  answers: Record<string, Record<string, string>>;
  filledCounts: Record<string, number>;
  submittedPlayerIds: string[];
  stoppedByPlayerName?: string;
  rejectVotes: Record<string, Record<string, string[]>>;
  evaluated: Record<string, Record<string, EvaluatedAnswer>>;
  roundScores: Record<string, number>;
  reviewReadyIds: string[];
  scores: Record<string, number>;
}

export type StadtLandFlussMove =
  | { type: 'set_categories'; categories: string[] }
  | { type: 'save_draft'; answers: Record<string, string> }
  | { type: 'submit_round'; answers: Record<string, string>; triggerStop?: boolean }
  | { type: 'time_up' }
  | { type: 'toggle_vote'; targetPlayerId: string; category: string }
  | { type: 'review_ready' }
  | { type: 'next_round' };

// ─── CASINO ROULETTE ───
export type RouletteColor = 'green' | 'red' | 'black';

export interface RouletteSpinOutcome {
  round: number;
  winningNumber: number;
  winningColor: RouletteColor;
  settledBets: Record<string, Record<string, number>>;
  totalWagered: Record<string, number>;
  totalPayout: Record<string, number>;
  netProfit: Record<string, number>;
  balancesAfter: Record<string, number>;
}

export interface RouletteState extends BaseGameState {
  gameId: 'roulette';
  round: number;
  maxRounds: number;
  betDuration: number;
  startingBalance: number;
  phase: 'betting' | 'spinning' | 'result' | 'game_over';
  phaseEndsAt: number;
  spinStartedAt?: number;
  balances: Record<string, number>;
  rebuyBonuses: Record<string, number>;
  bets: Record<string, Record<string, number>>;
  betOrder: Record<string, Array<{ betKey: string; amount: number }>>;
  lastRoundBets: Record<string, Record<string, number>>;
  lockedPlayerIds: string[];
  nextReadyIds: string[];
  winningNumber: number | null;
  winningColor: RouletteColor | null;
  history: Array<{ round: number; number: number; color: RouletteColor }>;
  lastOutcome?: RouletteSpinOutcome;
  scores: Record<string, number>;
}

export type RouletteMove =
  | { type: 'place_bet'; betKey: string; amount: number }
  | { type: 'remove_bet'; betKey: string; amount?: number }
  | { type: 'move_bet'; fromBetKey: string; toBetKey: string; amount?: number }
  | { type: 'undo_bet' }
  | { type: 'clear_bets' }
  | { type: 'rebet' }
  | { type: 'double_bets' }
  | { type: 'lock_bets' }
  | { type: 'finish_spin' }
  | { type: 'next_round' }
  | { type: 'time_up' };

// ─── TEXAS HOLD'EM POKER ───
export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export interface PokerCard {
  suit: CardSuit;
  rank: number; // 2..14 (11=Bube, 12=Dame, 13=König, 14=Ass)
}

export type PokerPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'game_over';

export type PokerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all_in';

export interface PokerShowdownPlayerResult {
  playerId: string;
  handName: string;
  wonAmount: number;
  netProfit: number;
  bestCards: PokerCard[];
  isWinner: boolean;
  folded: boolean;
}

export interface PokerShowdownSummary {
  handNumber: number;
  potTotal: number;
  wonByFold: boolean;
  winnerIds: string[];
  results: Record<string, PokerShowdownPlayerResult>;
}

export interface TexasHoldemState extends BaseGameState {
  gameId: 'texas-holdem';
  handNumber: number;
  maxHands: number;
  turnDuration: number;
  startingBalance: number;
  smallBlind: number;
  bigBlind: number;
  phase: PokerPhase;
  phaseEndsAt: number;
  seatOrder: string[];
  activeHandIds: string[];
  dealerId: string;
  smallBlindId: string;
  bigBlindId: string;
  pot: number;
  currentBet: number;
  minRaiseDelta: number;
  balances: Record<string, number>;
  streetBets: Record<string, number>;
  handContributions: Record<string, number>;
  handStartBalances: Record<string, number>;
  holeCards: Record<string, PokerCard[]>;
  communityCards: PokerCard[];
  deck?: PokerCard[]; // Streng serverseitig, wird vor Auslieferung an Clients entfernt
  foldedIds: string[];
  allInIds: string[];
  actedIds: string[];
  revealedPlayerIds: string[];
  nextReadyIds: string[];
  lastActions: Record<string, string>;
  lastActionText?: string;
  showdown?: PokerShowdownSummary;
  scores: Record<string, number>;
}

export type TexasHoldemMove =
  | { type: 'poker_action'; action: PokerActionType; targetBet?: number }
  | { type: 'next_round' }
  | { type: 'time_up' };

// ─── 3D ZOMBIE SURVIVAL ───
export type ZombieDifficulty = 'normal' | 'hard' | 'nightmare';

export type ZombieSkillKey = 'hp' | 'damage' | 'speed' | 'ammo';

export interface ZombiePlayerSkills {
  hp: number;
  damage: number;
  speed: number;
  ammo: number;
}

export interface ZombiePlayerHudState {
  playerId: string;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  weaponId: string;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
  kills: number;
  score: number;
  alive: boolean;
  dashReadyAt?: number;
  skillPoints?: number;
  skills?: ZombiePlayerSkills;
  overdriveActive?: boolean;
}

export interface ZombieInputPayload {
  moveX: number; // -1..1
  moveY: number; // -1..1
  aimX: number;  // -1..1
  aimY: number;  // -1..1
  firing: boolean;
  reload?: boolean;
  dash?: boolean;
  selectWeaponId?: string;
  upgradeSkill?: ZombieSkillKey;
}

export interface ZombieHudStatePayload {
  wave: number;
  zombiesRemaining: number;
  players: Record<string, ZombiePlayerHudState>;
  status: 'playing' | 'won' | 'draw';
}

export interface ZombieSurvivalState extends BaseGameState {
  gameId: 'zombie-survival';
  difficulty: ZombieDifficulty;
  wave: number;
  zombiesKilled: number;
  scores: Record<string, number>;
  kills: Record<string, number>;
  levels: Record<string, number>;
  weapons: Record<string, string>;
}

export type ZombieSurvivalMove = {
  type: 'zombie_finish';
  wave: number;
  scores: Record<string, number>;
  kills: Record<string, number>;
  levels: Record<string, number>;
  weapons: Record<string, string>;
};
