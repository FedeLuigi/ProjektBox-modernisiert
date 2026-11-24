import type {
  DrawAndGuessGuess,
  DrawAndGuessMove,
  DrawAndGuessState,
  StrokeSegment,
} from '@projektbox/shared/types';
import { MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';

export type { StrokeSegment, DrawAndGuessGuess, DrawAndGuessState, DrawAndGuessMove };

const CHOOSE_WORD_DURATION_SEC = 30;

// Umfangreicher deutscher Wortschatz für Zeichnen & Raten ohne Sonderzeichen, Bindestriche oder ß
export const DRAW_AND_GUESS_WORDS: { word: string; category: string }[] = [
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
  { word: 'Wal', category: 'Tiere' },
  { word: 'Hai', category: 'Tiere' },
  { word: 'Oktopus', category: 'Tiere' },
  { word: 'Flamingo', category: 'Tiere' },
  { word: 'Papagei', category: 'Tiere' },
  { word: 'Fuchs', category: 'Tiere' },
  { word: 'Wolf', category: 'Tiere' },
  { word: 'Eichhörnchen', category: 'Tiere' },
  { word: 'Kuh', category: 'Tiere' },
  { word: 'Schwein', category: 'Tiere' },
  { word: 'Schaf', category: 'Tiere' },
  { word: 'Pferd', category: 'Tiere' },
  { word: 'Ente', category: 'Tiere' },
  { word: 'Huhn', category: 'Tiere' },
  { word: 'Biber', category: 'Tiere' },
  { word: 'Biene', category: 'Tiere' },
  { word: 'Marienkäfer', category: 'Tiere' },
  { word: 'Spinne', category: 'Tiere' },
  { word: 'Schnecke', category: 'Tiere' },
  { word: 'Schlange', category: 'Tiere' },
  { word: 'Kamel', category: 'Tiere' },
  { word: 'Zebra', category: 'Tiere' },
  { word: 'Nashorn', category: 'Tiere' },
  { word: 'Panda', category: 'Tiere' },
  { word: 'Koala', category: 'Tiere' },
  { word: 'Storch', category: 'Tiere' },
  { word: 'Pfau', category: 'Tiere' },
  { word: 'Tiger', category: 'Tiere' },
  { word: 'Reh', category: 'Tiere' },
  { word: 'Maus', category: 'Tiere' },
  { word: 'Chamäleon', category: 'Tiere' },
  { word: 'Qualle', category: 'Tiere' },

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
  { word: 'Brezel', category: 'Essen' },
  { word: 'Croissant', category: 'Essen' },
  { word: 'Kirsche', category: 'Essen' },
  { word: 'Traube', category: 'Essen' },
  { word: 'Ananas', category: 'Essen' },
  { word: 'Birne', category: 'Essen' },
  { word: 'Zitrone', category: 'Essen' },
  { word: 'Orange', category: 'Essen' },
  { word: 'Tomate', category: 'Essen' },
  { word: 'Gurke', category: 'Essen' },
  { word: 'Pilz', category: 'Essen' },
  { word: 'Maiskolben', category: 'Essen' },
  { word: 'Popcorn', category: 'Essen' },
  { word: 'Muffin', category: 'Essen' },
  { word: 'Pfannkuchen', category: 'Essen' },
  { word: 'Waffel', category: 'Essen' },
  { word: 'Keks', category: 'Essen' },
  { word: 'Lutscher', category: 'Essen' },
  { word: 'Bonbon', category: 'Essen' },
  { word: 'Honig', category: 'Essen' },
  { word: 'Milch', category: 'Essen' },
  { word: 'Kaffee', category: 'Essen' },
  { word: 'Brötchen', category: 'Essen' },
  { word: 'Spaghetti', category: 'Essen' },
  { word: 'Sandwich', category: 'Essen' },
  { word: 'Taco', category: 'Essen' },
  { word: 'Würstchen', category: 'Essen' },
  { word: 'Avocado', category: 'Essen' },
  { word: 'Zwiebel', category: 'Essen' },
  { word: 'Paprika', category: 'Essen' },
  { word: 'Kiwi', category: 'Essen' },
  { word: 'Pudding', category: 'Essen' },
  { word: 'Torte', category: 'Essen' },

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
  { word: 'Traktor', category: 'Fahrzeuge' },
  { word: 'Skateboard', category: 'Fahrzeuge' },
  { word: 'Bagger', category: 'Fahrzeuge' },
  { word: 'Kran', category: 'Fahrzeuge' },
  { word: 'Roller', category: 'Fahrzeuge' },
  { word: 'Rollstuhl', category: 'Fahrzeuge' },
  { word: 'Segelboot', category: 'Fahrzeuge' },
  { word: 'Kanu', category: 'Fahrzeuge' },
  { word: 'Piratenschiff', category: 'Fahrzeuge' },
  { word: 'Feuerwehrauto', category: 'Fahrzeuge' },
  { word: 'Polizeiauto', category: 'Fahrzeuge' },
  { word: 'Krankenwagen', category: 'Fahrzeuge' },
  { word: 'Müllwagen', category: 'Fahrzeuge' },
  { word: 'Wohnwagen', category: 'Fahrzeuge' },
  { word: 'Quad', category: 'Fahrzeuge' },
  { word: 'Panzer', category: 'Fahrzeuge' },
  { word: 'Zeppelin', category: 'Fahrzeuge' },
  { word: 'Seilbahn', category: 'Fahrzeuge' },
  { word: 'Schlitten', category: 'Fahrzeuge' },
  { word: 'Kutsche', category: 'Fahrzeuge' },
  { word: 'Rennwagen', category: 'Fahrzeuge' },
  { word: 'Gabelstapler', category: 'Fahrzeuge' },
  { word: 'Moped', category: 'Fahrzeuge' },
  { word: 'Dreirad', category: 'Fahrzeuge' },
  { word: 'Ruderboot', category: 'Fahrzeuge' },
  { word: 'Tretboot', category: 'Fahrzeuge' },
  { word: 'Raumschiff', category: 'Fahrzeuge' },
  { word: 'Taxi', category: 'Fahrzeuge' },
  { word: 'Cabrio', category: 'Fahrzeuge' },
  { word: 'Lastwagen', category: 'Fahrzeuge' },
  { word: 'Tandem', category: 'Fahrzeuge' },
  { word: 'Yacht', category: 'Fahrzeuge' },
  { word: 'Gondel', category: 'Fahrzeuge' },
  { word: 'Lokomotive', category: 'Fahrzeuge' },
  { word: 'Schneepflug', category: 'Fahrzeuge' },

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
  { word: 'See', category: 'Natur' },
  { word: 'Welle', category: 'Natur' },
  { word: 'Strand', category: 'Natur' },
  { word: 'Wüste', category: 'Natur' },
  { word: 'Höhle', category: 'Natur' },
  { word: 'Felsen', category: 'Natur' },
  { word: 'Tanne', category: 'Natur' },
  { word: 'Palme', category: 'Natur' },
  { word: 'Kleeblatt', category: 'Natur' },
  { word: 'Sonnenblume', category: 'Natur' },
  { word: 'Tulpe', category: 'Natur' },
  { word: 'Rose', category: 'Natur' },
  { word: 'Blatt', category: 'Natur' },
  { word: 'Schneeflocke', category: 'Natur' },
  { word: 'Eiszapfen', category: 'Natur' },
  { word: 'Nebel', category: 'Natur' },
  { word: 'Dschungel', category: 'Natur' },
  { word: 'Wiese', category: 'Natur' },
  { word: 'Bambus', category: 'Natur' },
  { word: 'Koralle', category: 'Natur' },
  { word: 'Kristall', category: 'Natur' },
  { word: 'Komet', category: 'Natur' },
  { word: 'Planet', category: 'Natur' },
  { word: 'Erde', category: 'Natur' },
  { word: 'Gletscher', category: 'Natur' },
  { word: 'Lagerfeuer', category: 'Natur' },
  { word: 'Tornado', category: 'Natur' },
  { word: 'Regen', category: 'Natur' },

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
  { word: 'Hammer', category: 'Gegenstände' },
  { word: 'Säge', category: 'Gegenstände' },
  { word: 'Zange', category: 'Gegenstände' },
  { word: 'Leiter', category: 'Gegenstände' },
  { word: 'Besen', category: 'Gegenstände' },
  { word: 'Eimer', category: 'Gegenstände' },
  { word: 'Blumentopf', category: 'Gegenstände' },
  { word: 'Spiegel', category: 'Gegenstände' },
  { word: 'Kamm', category: 'Gegenstände' },
  { word: 'Zahnbürste', category: 'Gegenstände' },
  { word: 'Seife', category: 'Gegenstände' },
  { word: 'Handtuch', category: 'Gegenstände' },
  { word: 'Wecker', category: 'Gegenstände' },
  { word: 'Kerze', category: 'Gegenstände' },
  { word: 'Taschenlampe', category: 'Gegenstände' },
  { word: 'Fernseher', category: 'Gegenstände' },
  { word: 'Laptop', category: 'Gegenstände' },
  { word: 'Handy', category: 'Gegenstände' },
  { word: 'Klavier', category: 'Gegenstände' },
  { word: 'Trommel', category: 'Gegenstände' },
  { word: 'Geige', category: 'Gegenstände' },
  { word: 'Trompete', category: 'Gegenstände' },
  { word: 'Mikrofon', category: 'Gegenstände' },
  { word: 'Kompass', category: 'Gegenstände' },
  { word: 'Fernglas', category: 'Gegenstände' },
  { word: 'Lupe', category: 'Gegenstände' },
  { word: 'Globus', category: 'Gegenstände' },
  { word: 'Pokal', category: 'Gegenstände' },
  { word: 'Medaille', category: 'Gegenstände' },
  { word: 'Geschenk', category: 'Gegenstände' },
  { word: 'Luftballon', category: 'Gegenstände' },
  { word: 'Anker', category: 'Gegenstände' },
  { word: 'Rettungsring', category: 'Gegenstände' },
  { word: 'Schwert', category: 'Gegenstände' },
  { word: 'Schild', category: 'Gegenstände' },
  { word: 'Würfel', category: 'Gegenstände' },
  { word: 'Pinsel', category: 'Gegenstände' },
  { word: 'Sofa', category: 'Gegenstände' },
  { word: 'Kühlschrank', category: 'Gegenstände' },
];
const WORDS = DRAW_AND_GUESS_WORDS;

function validateCustomWordInput(
  rawWord: unknown
): { valid: true; word: string } | { valid: false; error: string } {
  if (typeof rawWord !== 'string') {
    return { valid: false, error: 'Bitte gib ein gültiges Wort ein.' };
  }
  const normalized = rawWord.trim().replace(/ß/gi, 'ss');
  if (normalized.length < 2 || normalized.length > 20) {
    return { valid: false, error: 'Das Wort muss zwischen 2 und 20 Buchstaben lang sein.' };
  }
  if (!/^[a-zA-ZäöüÄÖÜ]+$/.test(normalized)) {
    return {
      valid: false,
      error: 'Bitte nur Buchstaben (A–Z, Ä, Ö, Ü) ohne Leer- oder Sonderzeichen eingeben.',
    };
  }
  return { valid: true, word: normalized };
}

function getRandomWord(
  categoryFilter?: string,
  usedWords: string[] = []
): { word: string; category: string } {
  let pool = WORDS;

  if (categoryFilter && categoryFilter !== 'Alle') {
    const filtered = WORDS.filter(
      (w) => w.category.toLowerCase() === categoryFilter.toLowerCase()
    );
    if (filtered.length > 0) {
      pool = filtered;
    }
  }

  const usedSet = new Set(usedWords.map((w) => w.toLowerCase()));
  const freshPool = pool.filter((entry) => !usedSet.has(entry.word.toLowerCase()));
  const activePool = freshPool.length > 0 ? freshPool : pool;

  const index = Math.floor(Math.random() * activePool.length);
  return activePool[index];
}

function createRoundPhaseFields(params: {
  customWordsEnabled: boolean;
  categoryFilter: string;
  usedWords: string[];
  roundDuration: number;
  now: number;
}): {
  secretWord: string;
  wordLength: number;
  categoryName: string;
  usedWords: string[];
  roundStatus: 'choosing_word' | 'drawing';
  roundStartedAt: number;
  roundEndsAt: number;
  chooseWordEndsAt?: number;
} {
  if (params.customWordsEnabled) {
    const deadline = params.now + CHOOSE_WORD_DURATION_SEC * 1000;
    return {
      secretWord: '',
      wordLength: 0,
      categoryName: 'Eigene',
      usedWords: params.usedWords,
      roundStatus: 'choosing_word',
      roundStartedAt: params.now,
      roundEndsAt: deadline,
      chooseWordEndsAt: deadline,
    };
  }

  const { word, category } = getRandomWord(params.categoryFilter, params.usedWords);
  return {
    secretWord: word,
    wordLength: word.length,
    categoryName: category,
    usedWords: [...params.usedWords, word],
    roundStatus: 'drawing',
    roundStartedAt: params.now,
    roundEndsAt: params.now + params.roundDuration * 1000,
    chooseWordEndsAt: undefined,
  };
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
    const customWordsEnabled = settings?.customWordsEnabled === true;
    const categoryFilter = settings?.category || 'Alle';
    const now = Date.now();

    const roundFields = createRoundPhaseFields({
      customWordsEnabled,
      categoryFilter,
      usedWords: [],
      roundDuration,
      now,
    });

    return {
      gameId: 'draw-and-guess',
      currentTurn: drawer,
      currentDrawerId: drawer,
      drawerIndex: 0,
      ...roundFields,
      categoryFilter,
      customWordsEnabled,
      round: 1,
      maxRounds: rounds,
      roundDuration,
      strokes: [],
      guesses: [],
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      correctGuesserIds: [],
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

    // 0. ZUG: EIGENES WORT EINGEBEN UND BESTÄTIGEN (NUR ZEICHNER IN DER WORTWAHL-PHASE)
    if (move.type === 'set_word') {
      if (!isDrawer) {
        return { valid: false, error: 'Nur der aktuelle Zeichner darf das Wort festlegen.', state };
      }
      if (state.roundStatus !== 'choosing_word') {
        return { valid: false, error: 'Aktuell wird kein Wort gewählt.', state };
      }

      const checked = validateCustomWordInput(move.word);
      if (!checked.valid) {
        return { valid: false, error: checked.error, state };
      }

      const now = Date.now();
      const roundDuration = state.roundDuration || 60;
      const usedWords = [...(state.usedWords || []), checked.word];

      return {
        valid: true,
        state: {
          ...state,
          secretWord: checked.word,
          wordLength: checked.word.length,
          categoryName: 'Eigene',
          usedWords,
          roundStatus: 'drawing',
          roundStartedAt: now,
          roundEndsAt: now + roundDuration * 1000,
          chooseWordEndsAt: undefined,
        },
      };
    }

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
      let newRoundStatus: DrawAndGuessState['roundStatus'] = state.roundStatus;
      let roundWinnerName = state.roundWinnerName;

      if (isMatch) {
        // Punkte verteilen: Rater bekommt 100 Punkte, Zeichner bekommt 50 Punkte
        newScores[playerId] = (newScores[playerId] || 0) + 100;
        newScores[state.currentDrawerId] = (newScores[state.currentDrawerId] || 0) + 50;
        newCorrectIds.push(playerId);
        roundWinnerName = player?.name;

        // Haben alle Rater das Wort erraten?
        const activePlayers = players.filter((p) => !p.isTvScreen && p.connectionState !== 'offline');
        const totalGuessers = Math.max(1, activePlayers.length - 1);
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
      if (state.roundStatus === 'choosing_word') {
        if (!isDrawer && state.roundEndsAt && Date.now() < state.roundEndsAt - 1500) {
          return { valid: true, state };
        }
        // Fallback falls der Zeichner rechtzeitig kein Wort bestätigt hat -> Zufallswort starten
        const now = Date.now();
        const roundDuration = state.roundDuration || 60;
        const { word, category } = getRandomWord(
          state.categoryFilter || 'Alle',
          state.usedWords || []
        );
        return {
          valid: true,
          state: {
            ...state,
            secretWord: word,
            wordLength: word.length,
            categoryName: category,
            usedWords: [...(state.usedWords || []), word],
            roundStatus: 'drawing',
            roundStartedAt: now,
            roundEndsAt: now + roundDuration * 1000,
            chooseWordEndsAt: undefined,
          },
        };
      }

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

      const activePlayers = players.filter((p) => !p.isTvScreen && p.connectionState !== 'offline');
      const rotationPlayers = activePlayers.length > 0 ? activePlayers : players;
      const currentDrawerIndex = rotationPlayers.findIndex((p) => p.id === state.currentDrawerId);
      const nextDrawerIndex = (currentDrawerIndex + 1) % rotationPlayers.length;
      const nextDrawer = rotationPlayers[nextDrawerIndex];

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
      const prevUsed = state.usedWords || [];
      const roundDuration = state.roundDuration || 60;
      const customWordsEnabled = state.customWordsEnabled === true;
      const now = Date.now();
      const nextRoundFields = createRoundPhaseFields({
        customWordsEnabled,
        categoryFilter,
        usedWords: prevUsed,
        roundDuration,
        now,
      });

      return {
        valid: true,
        state: {
          ...state,
          currentTurn: nextDrawer.id,
          currentDrawerId: nextDrawer.id,
          drawerIndex: nextDrawerIndex,
          ...nextRoundFields,
          round: nextRoundNum,
          roundDuration,
          strokes: [],
          guesses: [],
          correctGuesserIds: [],
          roundWinnerName: undefined,
          roundEndReason: undefined,
        },
      };
    }

    return { valid: false, error: 'Unbekannter Spielzug.', state };
  },

  onPlayerLeave(state, leavingPlayerId, remainingPlayers) {
    const activePlayers = remainingPlayers.filter(
      (p) => !p.isTvScreen && !p.eliminated && p.connectionState !== 'offline'
    );

    if (activePlayers.length < 2) {
      let winnerId = activePlayers[0]?.id || null;
      if (!winnerId && state.scores) {
        const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
        winnerId = sorted[0]?.[0] || null;
      }
      return {
        ...state,
        status: 'won',
        winnerId,
      };
    }

    // Wenn der Zeichner geht -> Nächster aktiver Spieler übernimmt, Punktestände bleiben erhalten
    if (leavingPlayerId === state.currentDrawerId) {
      const baseIndex = typeof state.drawerIndex === 'number' ? state.drawerIndex : 0;
      const nextIndex = baseIndex % activePlayers.length;
      const nextDrawer = activePlayers[nextIndex];
      const categoryFilter = state.categoryFilter || 'Alle';
      const usedWords = [...(state.usedWords || [])];
      const roundDuration = state.roundDuration || 60;
      const customWordsEnabled = state.customWordsEnabled === true;
      const now = Date.now();
      const nextFields = createRoundPhaseFields({
        customWordsEnabled,
        categoryFilter,
        usedWords,
        roundDuration,
        now,
      });

      return {
        ...state,
        drawerIndex: nextIndex,
        currentTurn: nextDrawer.id,
        currentDrawerId: nextDrawer.id,
        ...nextFields,
        strokes: [],
        guesses: [],
        correctGuesserIds: [],
        roundWinnerName: undefined,
        roundEndReason: undefined,
      };
    }

    return state;
  },
};
