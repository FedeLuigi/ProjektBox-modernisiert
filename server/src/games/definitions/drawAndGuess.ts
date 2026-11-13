import { BaseGameState, MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';

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
  wordHint: string;
  categoryName: string;
  categoryFilter?: string;
  hintsEnabled?: boolean;
  round: number;
  maxRounds: number;
  roundDuration: number; // Dauer einer Runde in Sekunden (z. B. 60)
  roundEndsAt: number;   // Timestamp wann die Runde abläuft
  strokes: StrokeSegment[];
  guesses: DrawAndGuessGuess[];
  scores: Record<string, number>;
  correctGuesserIds: string[];
  roundStatus: 'drawing' | 'round_over' | 'game_over';
  roundWinnerName?: string;
  roundEndReason?: 'guessed' | 'time_up';
}

export type DrawAndGuessMove =
  | { type: 'stroke'; stroke: StrokeSegment }
  | { type: 'undo' }
  | { type: 'clear' }
  | { type: 'guess'; text: string }
  | { type: 'time_up' }
  | { type: 'next_round' };

// Umfangreicher deutscher Wortschatz für Zeichnen & Raten mit klaren Kategorien
const WORDS: { word: string; category: string }[] = [
  // Tiere
  { word: 'Katze', category: 'Tiere' },
  { word: 'Hund', category: 'Tiere' },
  { word: 'Pinguin', category: 'Tiere' },
  { word: 'Fisch', category: 'Tiere' },
  { word: 'Schmetterling', category: 'Tiere' },
  { word: 'Elefant', category: 'Tiere' },
  { word: 'Giraffe', category: 'Tiere' },
  { word: 'Löwe', category: 'Tiere' },
  { word: 'Bär', category: 'Tiere' },
  { word: 'Affe', category: 'Tiere' },
  { word: 'Delfin', category: 'Tiere' },
  { word: 'Känguru', category: 'Tiere' },
  { word: 'Frosch', category: 'Tiere' },
  { word: 'Schildkröte', category: 'Tiere' },
  { word: 'Igel', category: 'Tiere' },
  { word: 'Hase', category: 'Tiere' },
  { word: 'Krokodil', category: 'Tiere' },
  { word: 'Eule', category: 'Tiere' },

  // Essen
  { word: 'Pizza', category: 'Essen' },
  { word: 'Apfel', category: 'Essen' },
  { word: 'Kuchen', category: 'Essen' },
  { word: 'Eis', category: 'Essen' },
  { word: 'Banane', category: 'Essen' },
  { word: 'Burger', category: 'Essen' },
  { word: 'Pommes', category: 'Essen' },
  { word: 'Schokolade', category: 'Essen' },
  { word: 'Käse', category: 'Essen' },
  { word: 'Brot', category: 'Essen' },
  { word: 'Suppe', category: 'Essen' },
  { word: 'Erdbeere', category: 'Essen' },
  { word: 'Donut', category: 'Essen' },
  { word: 'Wassermelone', category: 'Essen' },
  { word: 'Spiegelei', category: 'Essen' },
  { word: 'Karotte', category: 'Essen' },
  { word: 'Kürbis', category: 'Essen' },

  // Fahrzeuge
  { word: 'Fahrrad', category: 'Fahrzeuge' },
  { word: 'Auto', category: 'Fahrzeuge' },
  { word: 'Flugzeug', category: 'Fahrzeuge' },
  { word: 'Schiff', category: 'Fahrzeuge' },
  { word: 'Rakete', category: 'Fahrzeuge' },
  { word: 'Zug', category: 'Fahrzeuge' },
  { word: 'Hubschrauber', category: 'Fahrzeuge' },
  { word: 'Bus', category: 'Fahrzeuge' },
  { word: 'Motorrad', category: 'Fahrzeuge' },
  { word: 'U-Boot', category: 'Fahrzeuge' },
  { word: 'Traktor', category: 'Fahrzeuge' },
  { word: 'Skateboard', category: 'Fahrzeuge' },
  { word: 'Heißluftballon', category: 'Fahrzeuge' },
  { word: 'Bagger', category: 'Fahrzeuge' },
  { word: 'Kran', category: 'Fahrzeuge' },

  // Natur
  { word: 'Sonne', category: 'Natur' },
  { word: 'Baum', category: 'Natur' },
  { word: 'Berg', category: 'Natur' },
  { word: 'Blume', category: 'Natur' },
  { word: 'Vulkan', category: 'Natur' },
  { word: 'Mond', category: 'Natur' },
  { word: 'Stern', category: 'Natur' },
  { word: 'Wolke', category: 'Natur' },
  { word: 'Regenbogen', category: 'Natur' },
  { word: 'Blitz', category: 'Natur' },
  { word: 'Feuer', category: 'Natur' },
  { word: 'Wasserfall', category: 'Natur' },
  { word: 'Insel', category: 'Natur' },
  { word: 'Wald', category: 'Natur' },
  { word: 'Kaktus', category: 'Natur' },
  { word: 'Schneemann', category: 'Natur' },

  // Gegenstände
  { word: 'Regenschirm', category: 'Gegenstände' },
  { word: 'Uhr', category: 'Gegenstände' },
  { word: 'Kamera', category: 'Gegenstände' },
  { word: 'Brille', category: 'Gegenstände' },
  { word: 'Krone', category: 'Gegenstände' },
  { word: 'Schlüssel', category: 'Gegenstände' },
  { word: 'Buch', category: 'Gegenstände' },
  { word: 'Lampe', category: 'Gegenstände' },
  { word: 'Kopfhörer', category: 'Gegenstände' },
  { word: 'Schere', category: 'Gegenstände' },
  { word: 'Bleistift', category: 'Gegenstände' },
  { word: 'Gitarre', category: 'Gegenstände' },
  { word: 'Rucksack', category: 'Gegenstände' },
  { word: 'Koffer', category: 'Gegenstände' },
  { word: 'Tasse', category: 'Gegenstände' },
  { word: 'Bett', category: 'Gegenstände' },
  { word: 'Stuhl', category: 'Gegenstände' },
  { word: 'Tisch', category: 'Gegenstände' },
  { word: 'Ball', category: 'Gegenstände' },
  { word: 'Schatzkiste', category: 'Gegenstände' },
];

function getRandomWord(categoryFilter?: string): { word: string; category: string } {
  let pool = WORDS;
  if (categoryFilter && categoryFilter !== 'Alle') {
    const filtered = WORDS.filter(
      (w) => w.category.toLowerCase() === categoryFilter.toLowerCase()
    );
    if (filtered.length > 0) {
      pool = filtered;
    }
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

function makeWordHint(word: string, hintsEnabled = true): string {
  const letters = word.split('');
  if (!hintsEnabled) {
    return letters.map(() => '_').join(' ');
  }
  if (letters.length <= 3) {
    return letters.map(() => '_').join(' ');
  }
  return letters
    .map((char, idx) => (idx === 0 || idx === letters.length - 1 ? char : '_'))
    .join(' ');
}

export const drawAndGuessGame: MultiplayerGameDefinition<DrawAndGuessState, DrawAndGuessMove> = {
  id: 'draw-and-guess',
  title: 'Zeichnen & Raten',
  minPlayers: 2,
  maxPlayers: 8,

  initGameState(
    players: Player[],
    starterId?: string,
    settings?: Record<string, any>
  ): DrawAndGuessState {
    if (players.length < 2) {
      throw new Error('Zeichnen & Raten benötigt mindestens 2 Spieler.');
    }

    // Zufällige Auswahl des ersten Zeichners beim Spielstart
    const randomIndex = Math.floor(Math.random() * players.length);
    const drawer = starterId && players.some((p) => p.id === starterId)
      ? starterId
      : players[randomIndex].id;

    const rounds = typeof settings?.rounds === 'number' ? settings.rounds : 3;
    const roundDuration = typeof settings?.roundDuration === 'number' ? settings.roundDuration : 60;
    const hintsEnabled = settings?.hints !== false;
    const categoryFilter = settings?.category || 'Alle';

    const { word, category } = getRandomWord(categoryFilter);
    const now = Date.now();

    return {
      gameId: 'draw-and-guess',
      currentTurn: drawer,
      currentDrawerId: drawer,
      secretWord: word,
      wordHint: makeWordHint(word, hintsEnabled),
      categoryName: category,
      categoryFilter,
      hintsEnabled,
      round: 1,
      maxRounds: rounds,
      roundDuration,
      roundEndsAt: now + roundDuration * 1000,
      strokes: [],
      guesses: [],
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      correctGuesserIds: [],
      roundStatus: 'drawing',
      status: 'playing',
      winnerId: null,
      startedAt: now,
    };
  },

  validateAndApplyMove({ state, players, playerId, move }) {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Das Spiel ist beendet.', state };
    }

    const player = players.find((p) => p.id === playerId);
    const isDrawer = playerId === state.currentDrawerId;

    // 1. ZUG: STRICHE ZEICHNEN (NUR ZEICHNER)
    if (move.type === 'stroke') {
      if (!isDrawer) {
        return { valid: false, error: 'Nur der aktuelle Zeichner darf malen.', state };
      }
      if (state.roundStatus !== 'drawing') {
        return { valid: false, error: 'Die Runde ist bereits vorbei.', state };
      }

      // Stroke anhängen (Limit 1200 für Performance)
      const newStrokes = state.strokes.length < 1200
        ? [...state.strokes, move.stroke]
        : [...state.strokes.slice(1), move.stroke];

      return {
        valid: true,
        state: {
          ...state,
          strokes: newStrokes,
        },
      };
    }

    // 2. ZUG: STRICH RÜCKGÄNGIG MACHEN (UNDO, NUR ZEICHNER)
    if (move.type === 'undo') {
      if (!isDrawer) {
        return { valid: false, error: 'Nur der Zeichner kann Striche rückgängig machen.', state };
      }
      if (state.roundStatus !== 'drawing' || state.strokes.length === 0) {
        return { valid: true, state };
      }

      const lastSeg = state.strokes[state.strokes.length - 1];
      let newStrokes: StrokeSegment[] = [];
      if (lastSeg?.strokeId !== undefined) {
        const targetId = lastSeg.strokeId;
        newStrokes = state.strokes.filter((s) => s.strokeId !== targetId);
      } else {
        newStrokes = state.strokes.slice(0, -1);
      }

      return {
        valid: true,
        state: {
          ...state,
          strokes: newStrokes,
        },
      };
    }

    // 2b. ZUG: LEINWAND LÖSCHEN (NUR ZEICHNER)
    if (move.type === 'clear') {
      if (!isDrawer) {
        return { valid: false, error: 'Nur der Zeichner kann die Leinwand löschen.', state };
      }

      return {
        valid: true,
        state: {
          ...state,
          strokes: [],
        },
      };
    }

    // 3. ZUG: WORT RATEN (NUR RATER)
    if (move.type === 'guess') {
      if (isDrawer) {
        return { valid: false, error: 'Der Zeichner darf nicht selbst raten.', state };
      }

      if (state.correctGuesserIds.includes(playerId)) {
        return { valid: false, error: 'Du hast das Wort bereits erraten!', state };
      }

      if (state.roundStatus !== 'drawing') {
        return { valid: false, error: 'Diese Runde ist bereits abgeschlossen.', state };
      }

      const guessText = (move.text || '').trim();
      if (!guessText) {
        return { valid: false, error: 'Bitte gib ein Wort ein.', state };
      }

      const isMatch = guessText.toLowerCase() === state.secretWord.toLowerCase();
      const newGuess: DrawAndGuessGuess = {
        id: `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        playerId,
        playerName: player?.name || 'Rater',
        text: guessText,
        isCorrect: isMatch,
        timestamp: Date.now(),
      };

      const newScores = { ...state.scores };
      const newCorrectIds = [...state.correctGuesserIds];
      let newRoundStatus: 'drawing' | 'round_over' | 'game_over' = state.roundStatus;
      let roundWinnerName = state.roundWinnerName;

      if (isMatch) {
        // Punkte verteilen: Rater bekommt 100 Punkte, Zeichner bekommt 50 Punkte
        newScores[playerId] = (newScores[playerId] || 0) + 100;
        newScores[state.currentDrawerId] = (newScores[state.currentDrawerId] || 0) + 50;
        newCorrectIds.push(playerId);
        roundWinnerName = player?.name;

        // Haben alle Rater das Wort erraten?
        const totalGuessers = Math.max(1, players.length - 1);
        if (newCorrectIds.length >= totalGuessers) {
          newRoundStatus = 'round_over';
        }
      }

      return {
        valid: true,
        state: {
          ...state,
          guesses: [newGuess, ...state.guesses].slice(0, 50),
          scores: newScores,
          correctGuesserIds: newCorrectIds,
          roundStatus: newRoundStatus,
          roundWinnerName,
          roundEndReason: isMatch ? 'guessed' : state.roundEndReason,
        },
      };
    }

    // 3b. ZUG: ZEIT ABGELAUFEN (AUTOMATISCH VOM CLIENT/SERVER)
    if (move.type === 'time_up') {
      if (state.roundStatus !== 'drawing') {
        return { valid: true, state };
      }
      if (!isDrawer && state.roundEndsAt && Date.now() < state.roundEndsAt - 1500) {
        return { valid: true, state };
      }
      return {
        valid: true,
        state: {
          ...state,
          roundStatus: 'round_over',
          roundEndReason: 'time_up',
        },
      };
    }

    // 4. ZUG: NÄCHSTE RUNDE (WECHSEL DES ZEICHNERS)
    if (move.type === 'next_round') {
      // Idempotent, falls mehrere Clients gleichzeitig das Rundenende quittieren
      if (state.roundStatus !== 'round_over') {
        return { valid: true, state };
      }

      const currentDrawerIndex = players.findIndex((p) => p.id === state.currentDrawerId);
      const nextDrawerIndex = (currentDrawerIndex + 1) % players.length;
      const nextDrawer = players[nextDrawerIndex];

      const nextRoundNum = state.round + 1;
      const isGameOver = nextRoundNum > state.maxRounds;

      if (isGameOver) {
        // Höchste Punktzahl ermitteln & Unentschieden prüfen
        let topScore = -1;
        let overallWinnerId: string | null = null;
        let isTie = false;

        for (const [pid, score] of Object.entries(state.scores)) {
          if (score > topScore) {
            topScore = score;
            overallWinnerId = pid;
            isTie = false;
          } else if (score === topScore && score > 0) {
            isTie = true;
          }
        }

        const isDraw = isTie || topScore <= 0;

        return {
          valid: true,
          state: {
            ...state,
            status: isDraw ? 'draw' : 'won',
            winnerId: isDraw ? null : overallWinnerId,
            roundStatus: 'game_over',
          },
        };
      }

      const categoryFilter = state.categoryFilter || 'Alle';
      const hintsEnabled = state.hintsEnabled !== false;
      const { word, category } = getRandomWord(categoryFilter);
      const roundDuration = state.roundDuration || 60;
      const now = Date.now();

      return {
        valid: true,
        state: {
          ...state,
          currentTurn: nextDrawer.id,
          currentDrawerId: nextDrawer.id,
          secretWord: word,
          wordHint: makeWordHint(word, hintsEnabled),
          categoryName: category,
          round: nextRoundNum,
          roundDuration,
          roundEndsAt: now + roundDuration * 1000,
          strokes: [],
          guesses: [],
          correctGuesserIds: [],
          roundStatus: 'drawing',
          roundWinnerName: undefined,
          roundEndReason: undefined,
        },
      };
    }

    return { valid: false, error: 'Unbekannter Spielzug.', state };
  },

  onPlayerLeave(state, leavingPlayerId, remainingPlayers) {
    if (remainingPlayers.length < 2) {
      return {
        ...state,
        status: 'won',
        winnerId: remainingPlayers[0]?.id || null,
      };
    }

    // Wenn der Zeichner geht -> Nächster Spieler übernimmt
    if (leavingPlayerId === state.currentDrawerId) {
      const nextDrawer = remainingPlayers[0];
      const categoryFilter = state.categoryFilter || 'Alle';
      const hintsEnabled = state.hintsEnabled !== false;
      const { word, category } = getRandomWord(categoryFilter);
      return {
        ...state,
        currentTurn: nextDrawer.id,
        currentDrawerId: nextDrawer.id,
        secretWord: word,
        wordHint: makeWordHint(word, hintsEnabled),
        categoryName: category,
        strokes: [],
        guesses: [],
        correctGuesserIds: [],
        roundStatus: 'drawing',
      };
    }

    return state;
  },
};
