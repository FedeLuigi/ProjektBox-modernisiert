import { BaseGameState, MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';

export interface StrokeSegment {
  x0: number; // 0..1 normalisierte Koordinaten für perfekte Skalierung (Handy -> 4K TV)
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
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
  round: number;
  maxRounds: number;
  strokes: StrokeSegment[];
  guesses: DrawAndGuessGuess[];
  scores: Record<string, number>;
  correctGuesserIds: string[];
  roundStatus: 'drawing' | 'round_over' | 'game_over';
  roundWinnerName?: string;
}

export type DrawAndGuessMove =
  | { type: 'stroke'; stroke: StrokeSegment }
  | { type: 'clear' }
  | { type: 'guess'; text: string }
  | { type: 'next_round' };

// Umfangreicher deutscher Wortschatz für Zeichnen & Raten
const WORDS: { word: string; category: string }[] = [
  { word: 'Pizza', category: 'Essen' },
  { word: 'Haus', category: 'Gebäude' },
  { word: 'Katze', category: 'Tiere' },
  { word: 'Sonne', category: 'Natur' },
  { word: 'Fahrrad', category: 'Fahrzeuge' },
  { word: 'Baum', category: 'Natur' },
  { word: 'Rakete', category: 'Weltall' },
  { word: 'Schneemann', category: 'Winter' },
  { word: 'Gitarre', category: 'Musik' },
  { word: 'Flugzeug', category: 'Fahrzeuge' },
  { word: 'Apfel', category: 'Essen' },
  { word: 'Regenschirm', category: 'Gegenstände' },
  { word: 'Uhr', category: 'Gegenstände' },
  { word: 'Schiff', category: 'Fahrzeuge' },
  { word: 'Kamera', category: 'Technik' },
  { word: 'Brille', category: 'Kleidung' },
  { word: 'Herz', category: 'Symbole' },
  { word: 'Krone', category: 'Gegenstände' },
  { word: 'Vulkan', category: 'Natur' },
  { word: 'Roboter', category: 'Technik' },
  { word: 'Auto', category: 'Fahrzeuge' },
  { word: 'Blume', category: 'Natur' },
  { word: 'Kuchen', category: 'Essen' },
  { word: 'Lampe', category: 'Möbel' },
  { word: 'Berg', category: 'Natur' },
  { word: 'Pinguin', category: 'Tiere' },
  { word: 'Fisch', category: 'Tiere' },
  { word: 'Schlüssel', category: 'Gegenstände' },
  { word: 'Buch', category: 'Schule' },
  { word: 'Schmetterling', category: 'Insekten' },
  { word: 'Hund', category: 'Tiere' },
  { word: 'Mond', category: 'Weltall' },
  { word: 'Stern', category: 'Weltall' },
  { word: 'Eis', category: 'Essen' },
  { word: 'Banane', category: 'Essen' },
  { word: 'Burger', category: 'Essen' },
  { word: 'Bett', category: 'Möbel' },
  { word: 'Stuhl', category: 'Möbel' },
  { word: 'Tisch', category: 'Möbel' },
  { word: 'Ball', category: 'Sport' },
  { word: 'Kopfhörer', category: 'Musik' },
  { word: 'Schere', category: 'Werkzeug' },
  { word: 'Bleistift', category: 'Schule' },
  { word: 'Kaktus', category: 'Pflanzen' },
  { word: 'Burg', category: 'Gebäude' },
  { word: 'Schloss', category: 'Gebäude' },
  { word: 'Zelt', category: 'Camping' },
  { word: 'Kran', category: 'Baustelle' },
  { word: 'Wolke', category: 'Wetter' },
  { word: 'Regenbogen', category: 'Wetter' },
  { word: 'Blitz', category: 'Wetter' },
  { word: 'Feuer', category: 'Elemente' },
  { word: 'Wasser', category: 'Elemente' },
  { word: 'Schatzkiste', category: 'Abenteuer' },
  { word: 'Pirat', category: 'Figuren' },
  { word: 'Zauberer', category: 'Figuren' },
  { word: 'Drache', category: 'Fabelwesen' },
  { word: 'Einhorn', category: 'Fabelwesen' },
  { word: 'Geist', category: 'Gruselig' },
  { word: 'Kürbis', category: 'Gemüse' },
];

function getRandomWord(): { word: string; category: string } {
  const index = Math.floor(Math.random() * WORDS.length);
  return WORDS[index];
}

function makeWordHint(word: string): string {
  // Erzeugt z. B. "P _ _ _ a (5)"
  const letters = word.split('');
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

  initGameState(players: Player[], starterId?: string): DrawAndGuessState {
    if (players.length < 2) {
      throw new Error('Zeichnen & Raten benötigt mindestens 2 Spieler.');
    }

    const drawer = starterId && players.some((p) => p.id === starterId)
      ? starterId
      : players[0].id;

    const { word, category } = getRandomWord();

    return {
      gameId: 'draw-and-guess',
      currentTurn: drawer,
      currentDrawerId: drawer,
      secretWord: word,
      wordHint: makeWordHint(word),
      categoryName: category,
      round: 1,
      maxRounds: Math.max(players.length * 2, 4),
      strokes: [],
      guesses: [],
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      correctGuesserIds: [],
      roundStatus: 'drawing',
      status: 'playing',
      winnerId: null,
      startedAt: Date.now(),
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

    // 2. ZUG: LEINWAND LÖSCHEN (NUR ZEICHNER)
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
      let newCorrectIds = [...state.correctGuesserIds];
      let newRoundStatus: 'drawing' | 'round_over' | 'game_over' = state.roundStatus;
      let roundWinnerName = state.roundWinnerName;

      if (isMatch) {
        // Punkte verteilen: Rater bekommt 100 Punkte, Zeichner bekommt 50 Punkte
        newScores[playerId] = (newScores[playerId] || 0) + 100;
        newScores[state.currentDrawerId] = (newScores[state.currentDrawerId] || 0) + 50;
        newCorrectIds.push(playerId);
        roundWinnerName = player?.name;

        // Haben alle Rater das Wort erraten?
        const totalGuessers = players.length - 1;
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
        },
      };
    }

    // 4. ZUG: NÄCHSTE RUNDE (WECHSEL DES ZEICHNERS)
    if (move.type === 'next_round') {
      const currentDrawerIndex = players.findIndex((p) => p.id === state.currentDrawerId);
      const nextDrawerIndex = (currentDrawerIndex + 1) % players.length;
      const nextDrawer = players[nextDrawerIndex];

      const nextRoundNum = state.round + 1;
      const isGameOver = nextRoundNum > state.maxRounds;

      if (isGameOver) {
        // Höchste Punktzahl ermitteln
        let topScore = -1;
        let overallWinnerId: string | null = null;
        for (const [pid, score] of Object.entries(state.scores)) {
          if (score > topScore) {
            topScore = score;
            overallWinnerId = pid;
          }
        }

        return {
          valid: true,
          state: {
            ...state,
            status: 'won',
            winnerId: overallWinnerId,
            roundStatus: 'game_over',
          },
        };
      }

      const { word, category } = getRandomWord();

      return {
        valid: true,
        state: {
          ...state,
          currentTurn: nextDrawer.id,
          currentDrawerId: nextDrawer.id,
          secretWord: word,
          wordHint: makeWordHint(word),
          categoryName: category,
          round: nextRoundNum,
          strokes: [],
          guesses: [],
          correctGuesserIds: [],
          roundStatus: 'drawing',
          roundWinnerName: undefined,
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
      const { word, category } = getRandomWord();
      return {
        ...state,
        currentTurn: nextDrawer.id,
        currentDrawerId: nextDrawer.id,
        secretWord: word,
        wordHint: makeWordHint(word),
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
