import type {
  EvaluatedAnswer,
  StadtLandFlussMove,
  StadtLandFlussPreset,
  StadtLandFlussState,
} from '@projektbox/shared/types';
import {
  CHOOSE_CATEGORIES_DURATION_SEC,
  getPresetCategories,
  normalizeSlfAnswerText as normalizeAnswerText,
  normalizeSlfCategories,
  normalizeSlfComparisonKey as normalizeComparisonKey,
  PLAYABLE_SLF_LETTERS as PLAYABLE_LETTERS,
  REVIEW_DURATION_SEC,
  SLF_MIN_CUSTOM_CATEGORIES,
  STADT_LAND_FLUSS_PRESETS,
  startsWithLetter,
} from '@projektbox/shared/utils';
import { MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';

export {
  STADT_LAND_FLUSS_PRESETS,
  type StadtLandFlussPreset,
  type EvaluatedAnswer,
  type StadtLandFlussState,
  type StadtLandFlussMove,
};

function pickNextLetter(usedLetters: string[]): string {
  const usedSet = new Set(usedLetters);
  const available = PLAYABLE_LETTERS.filter((l) => !usedSet.has(l));
  const pool = available.length > 0 ? available : PLAYABLE_LETTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function resolveCategoryChooser(
  players: Player[],
  round: number,
  starterId?: string,
  previousChooserId?: string | null
): Player | null {
  const active = players.filter(
    (p) => !p.isTvScreen && !p.eliminated && p.connectionState !== 'offline'
  );
  const eligible = active.length > 0 ? active : players.filter((p) => !p.isTvScreen);
  if (eligible.length === 0) return null;

  if (previousChooserId) {
    const prevIdx = eligible.findIndex((p) => p.id === previousChooserId);
    if (prevIdx >= 0) {
      return eligible[(prevIdx + 1) % eligible.length];
    }
  }

  if (starterId) {
    const startIdx = eligible.findIndex((p) => p.id === starterId);
    if (startIdx >= 0) {
      return eligible[(startIdx + Math.max(0, round - 1)) % eligible.length];
    }
  }

  return eligible[Math.max(0, round - 1) % eligible.length];
}

function startWritingPhase(
  state: StadtLandFlussState,
  players: Player[],
  categories: string[]
): StadtLandFlussState {
  const nextLetter = pickNextLetter(state.usedLetters);
  const now = Date.now();
  return {
    ...state,
    categories,
    letter: nextLetter,
    usedLetters: [...state.usedLetters, nextLetter],
    phase: 'writing',
    phaseEndsAt: now + state.roundDuration * 1000,
    answers: Object.fromEntries(players.map((p) => [p.id, {}])),
    filledCounts: Object.fromEntries(players.map((p) => [p.id, 0])),
    submittedPlayerIds: [],
    stoppedByPlayerName: undefined,
    rejectVotes: {},
    evaluated: {},
    roundScores: Object.fromEntries(players.map((p) => [p.id, 0])),
    reviewReadyIds: [],
  };
}

function sanitizeAnswersForPlayer(
  rawAnswers: unknown,
  categories: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  const source = rawAnswers && typeof rawAnswers === 'object' ? (rawAnswers as Record<string, unknown>) : {};
  for (const cat of categories) {
    out[cat] = normalizeAnswerText(source[cat]);
  }
  return out;
}

function countFilledAnswers(answers: Record<string, string>, categories: string[]): number {
  let count = 0;
  for (const cat of categories) {
    if ((answers[cat] || '').trim().length >= 2) {
      count++;
    }
  }
  return count;
}

/**
 * Bewertet alle eingereichten Antworten pro Kategorie:
 * - 20 Punkte: Einzige gültige Antwort in der gesamten Kategorie
 * - 10 Punkte: Gültig und einzigartig (andere Spieler haben andere gültige Wörter)
 * - 5 Punkte: Mehrfachnennung (dasselbe normalisierte Wort bei >= 2 Spielern)
 * - 0 Punkte: Leer, < 2 Zeichen, falscher Anfangsbuchstabe oder per Veto abgelehnt
 */
function evaluateRoundAnswers(params: {
  players: Player[];
  categories: string[];
  letter: string;
  answers: Record<string, Record<string, string>>;
  rejectVotes: Record<string, Record<string, string[]>>;
}): {
  evaluated: Record<string, Record<string, EvaluatedAnswer>>;
  roundScores: Record<string, number>;
} {
  const { players, categories, letter, answers, rejectVotes } = params;
  const evaluated: Record<string, Record<string, EvaluatedAnswer>> = {};
  const roundScores: Record<string, number> = Object.fromEntries(players.map((p) => [p.id, 0]));

  const otherPlayerCount = Math.max(1, players.length - 1);
  // Mehrheit der Mitspieler lehnt ab (>= 1 bei 2 Spielern, >= ceil(other/2) bei 3+ Spielern)
  const rejectThreshold = Math.max(1, Math.ceil(otherPlayerCount / 2));

  for (const cat of categories) {
    evaluated[cat] = {};
    const catVotes = rejectVotes[cat] || {};

    interface Candidate {
      playerId: string;
      text: string;
      key: string;
    }
    const validCandidates: Candidate[] = [];

    for (const p of players) {
      const text = normalizeAnswerText(answers[p.id]?.[cat]);
      const votes = catVotes[p.id] || [];
      const rejectedByVote = votes.length >= rejectThreshold;

      if (!text) {
        evaluated[cat][p.id] = { text: '', valid: false, rejected: false, points: 0, reason: 'Leer' };
        continue;
      }
      if (text.length < 2) {
        evaluated[cat][p.id] = {
          text,
          valid: false,
          rejected: false,
          points: 0,
          reason: 'Zu kurz',
        };
        continue;
      }
      if (!startsWithLetter(text, letter)) {
        evaluated[cat][p.id] = {
          text,
          valid: false,
          rejected: false,
          points: 0,
          reason: `Nicht mit ${letter}`,
        };
        continue;
      }
      if (rejectedByVote) {
        evaluated[cat][p.id] = {
          text,
          valid: false,
          rejected: true,
          points: 0,
          reason: 'Abgelehnt',
        };
        continue;
      }

      const key = normalizeComparisonKey(text);
      validCandidates.push({ playerId: p.id, text, key });
    }

    const keyCounts = new Map<string, number>();
    for (const c of validCandidates) {
      keyCounts.set(c.key, (keyCounts.get(c.key) || 0) + 1);
    }

    for (const c of validCandidates) {
      const occurrences = keyCounts.get(c.key) || 1;
      let points = 10;
      let reason = 'Einzigartig';

      if (occurrences > 1) {
        points = 5;
        reason = 'Doppelt';
      } else if (validCandidates.length === 1) {
        points = 20;
        reason = 'Solo-Wort';
      }

      evaluated[cat][c.playerId] = {
        text: c.text,
        valid: true,
        rejected: false,
        points,
        reason,
      };
      roundScores[c.playerId] = (roundScores[c.playerId] || 0) + points;
    }
  }

  return { evaluated, roundScores };
}

function transitionToReview(
  state: StadtLandFlussState,
  players: Player[],
  stoppedByPlayerName?: string
): StadtLandFlussState {
  const { evaluated, roundScores } = evaluateRoundAnswers({
    players,
    categories: state.categories,
    letter: state.letter,
    answers: state.answers,
    rejectVotes: state.rejectVotes,
  });

  return {
    ...state,
    phase: 'review',
    phaseEndsAt: Date.now() + REVIEW_DURATION_SEC * 1000,
    stoppedByPlayerName: stoppedByPlayerName ?? state.stoppedByPlayerName,
    evaluated,
    roundScores,
    reviewReadyIds: [],
  };
}

function finalizeReviewToRoundOver(state: StadtLandFlussState): StadtLandFlussState {
  const newScores = { ...state.scores };
  for (const [pid, pts] of Object.entries(state.roundScores)) {
    newScores[pid] = (newScores[pid] || 0) + pts;
  }

  return {
    ...state,
    scores: newScores,
    phase: 'round_over',
    phaseEndsAt: Date.now() + 4_000,
  };
}

function finalizeOverallGame(state: StadtLandFlussState): StadtLandFlussState {
  let topScore = -1;
  let winnerId: string | null = null;
  let isTie = false;

  for (const [pid, score] of Object.entries(state.scores)) {
    if (score > topScore) {
      topScore = score;
      winnerId = pid;
      isTie = false;
    } else if (score === topScore && score > 0) {
      isTie = true;
    }
  }

  const isDraw = isTie || topScore <= 0;

  return {
    ...state,
    status: isDraw ? 'draw' : 'won',
    winnerId: isDraw ? null : winnerId,
    phase: 'game_over',
  };
}

export const stadtLandFlussGame: MultiplayerGameDefinition<
  StadtLandFlussState,
  StadtLandFlussMove
> = {
  id: 'stadt-land-fluss',
  title: 'Stadt, Land, Fluss',
  minPlayers: 2,
  maxPlayers: 8,

  initGameState(
    players: Player[],
    starterId?: string,
    settings?: Record<string, any>
  ): StadtLandFlussState {
    if (players.length < 2) {
      throw new Error('Stadt, Land, Fluss benötigt mindestens 2 Spieler.');
    }

    const rounds = typeof settings?.rounds === 'number' ? settings.rounds : 3;
    const roundDuration =
      typeof settings?.roundDuration === 'number' ? settings.roundDuration : 60;
    const stopButtonEnabled = settings?.stopButtonEnabled !== false;
    const customWordsEnabled = settings?.customWordsEnabled === true;
    const { presetKey, categories } = getPresetCategories(settings?.categoryPreset);
    const now = Date.now();
    const firstTurn =
      starterId && players.some((p) => p.id === starterId) ? starterId : players[0].id;

    if (customWordsEnabled) {
      const chooser = resolveCategoryChooser(players, 1, firstTurn);
      return {
        gameId: 'stadt-land-fluss',
        currentTurn: chooser?.id || firstTurn,
        status: 'playing',
        winnerId: null,
        startedAt: now,
        round: 1,
        maxRounds: rounds,
        roundDuration,
        stopButtonEnabled,
        customWordsEnabled: true,
        categoryChooserId: chooser?.id || firstTurn,
        categoryChooserName: chooser?.name || players[0].name,
        categoryPreset: presetKey,
        categories,
        letter: '',
        usedLetters: [],
        phase: 'choosing_categories',
        phaseEndsAt: now + CHOOSE_CATEGORIES_DURATION_SEC * 1000,
        answers: Object.fromEntries(players.map((p) => [p.id, {}])),
        filledCounts: Object.fromEntries(players.map((p) => [p.id, 0])),
        submittedPlayerIds: [],
        rejectVotes: {},
        evaluated: {},
        roundScores: Object.fromEntries(players.map((p) => [p.id, 0])),
        reviewReadyIds: [],
        scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      };
    }

    const letter = pickNextLetter([]);

    return {
      gameId: 'stadt-land-fluss',
      currentTurn: firstTurn,
      status: 'playing',
      winnerId: null,
      startedAt: now,
      round: 1,
      maxRounds: rounds,
      roundDuration,
      stopButtonEnabled,
      customWordsEnabled: false,
      categoryPreset: presetKey,
      categories,
      letter,
      usedLetters: [letter],
      phase: 'writing',
      phaseEndsAt: now + roundDuration * 1000,
      answers: Object.fromEntries(players.map((p) => [p.id, {}])),
      filledCounts: Object.fromEntries(players.map((p) => [p.id, 0])),
      submittedPlayerIds: [],
      rejectVotes: {},
      evaluated: {},
      roundScores: Object.fromEntries(players.map((p) => [p.id, 0])),
      reviewReadyIds: [],
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    };
  },

  validateAndApplyMove({ state, players, playerId, move }) {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
    }

    const player = players.find((p) => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Spieler ist nicht aktiv.', state };
    }

    // 0. EIGENE KATEGORIEN FÜR DIE RUNDE FESTLEGEN
    if (move.type === 'set_categories') {
      if (state.phase !== 'choosing_categories') {
        return { valid: true, state };
      }
      if (state.categoryChooserId && state.categoryChooserId !== playerId) {
        return { valid: false, error: 'Gerade wählt ein anderer Spieler die Kategorien.', state };
      }

      const cleaned = normalizeSlfCategories(move.categories);
      if (cleaned.length < SLF_MIN_CUSTOM_CATEGORIES) {
        return {
          valid: false,
          error: `Bitte mindestens ${SLF_MIN_CUSTOM_CATEGORIES} eindeutige Kategorien (je 2–28 Zeichen) eingeben.`,
          state,
        };
      }

      return {
        valid: true,
        state: startWritingPhase(state, players, cleaned),
      };
    }

    // 1. ZWISCHENSTAND SPEICHERN (während writing, synchronisiert ausgefüllte Felder live)
    if (move.type === 'save_draft') {
      if (state.phase !== 'writing') {
        return { valid: true, state };
      }

      const cleaned = sanitizeAnswersForPlayer(move.answers, state.categories);
      const filled = countFilledAnswers(cleaned, state.categories);

      return {
        valid: true,
        state: {
          ...state,
          answers: {
            ...state.answers,
            [playerId]: cleaned,
          },
          filledCounts: {
            ...state.filledCounts,
            [playerId]: filled,
          },
        },
      };
    }

    // 2. RUNDE EINREICHEN / STOPP-KNOPF DRÜCKEN
    if (move.type === 'submit_round') {
      if (state.phase !== 'writing') {
        return { valid: true, state };
      }

      const cleaned = sanitizeAnswersForPlayer(move.answers, state.categories);
      const filled = countFilledAnswers(cleaned, state.categories);

      if (move.triggerStop && !state.stopButtonEnabled) {
        return { valid: false, error: 'Der Stopp-Knopf ist in den Optionen deaktiviert.', state };
      }

      if (move.triggerStop && filled < state.categories.length) {
        return {
          valid: false,
          error: 'Für STOPP müssen zuerst alle Kategorien (mind. 2 Zeichen) ausgefüllt sein.',
          state,
        };
      }

      const nextAnswers = { ...state.answers, [playerId]: cleaned };
      const nextFilled = { ...state.filledCounts, [playerId]: filled };
      const nextSubmitted = state.submittedPlayerIds.includes(playerId)
        ? state.submittedPlayerIds
        : [...state.submittedPlayerIds, playerId];

      const updated: StadtLandFlussState = {
        ...state,
        answers: nextAnswers,
        filledCounts: nextFilled,
        submittedPlayerIds: nextSubmitted,
      };

      const activeHumanPlayers = players.filter((p) => !p.isTvScreen && p.connectionState !== 'offline');
      const allSubmitted = (activeHumanPlayers.length > 0 ? activeHumanPlayers : players).every((p) =>
        nextSubmitted.includes(p.id)
      );
      if (move.triggerStop || allSubmitted) {
        return {
          valid: true,
          state: transitionToReview(
            updated,
            players,
            move.triggerStop ? player.name : undefined
          ),
        };
      }

      return { valid: true, state: updated };
    }

    // 3. ZEIT ABGELAUFEN
    if (move.type === 'time_up') {
      if (state.phase === 'choosing_categories') {
        if (Date.now() < state.phaseEndsAt - 1500) {
          return { valid: true, state };
        }
        const fallbackCategories = getPresetCategories(state.categoryPreset).categories;
        return {
          valid: true,
          state: startWritingPhase(state, players, fallbackCategories),
        };
      }

      if (state.phase === 'writing') {
        if (Date.now() < state.phaseEndsAt - 1500) {
          return { valid: true, state };
        }
        return {
          valid: true,
          state: transitionToReview(state, players),
        };
      }

      if (state.phase === 'review') {
        if (Date.now() < state.phaseEndsAt - 1500) {
          return { valid: true, state };
        }
        return {
          valid: true,
          state: finalizeReviewToRoundOver(state),
        };
      }

      return { valid: true, state };
    }

    // 4. VETO / ABSTIMMUNG IN DER REVIEW-PHASE
    if (move.type === 'toggle_vote') {
      if (state.phase !== 'review') {
        return { valid: false, error: 'Abstimmen ist nur in der Auswertungsphase möglich.', state };
      }
      if (!state.categories.includes(move.category)) {
        return { valid: false, error: 'Unbekannte Kategorie.', state };
      }
      if (move.targetPlayerId === playerId) {
        return { valid: false, error: 'Du kannst nicht gegen deine eigene Antwort stimmen.', state };
      }
      const targetExists = players.some((p) => p.id === move.targetPlayerId);
      if (!targetExists) {
        return { valid: false, error: 'Zielspieler nicht gefunden.', state };
      }

      const targetText = normalizeAnswerText(state.answers[move.targetPlayerId]?.[move.category]);
      if (!targetText || targetText.length < 2 || !startsWithLetter(targetText, state.letter)) {
        return { valid: true, state };
      }

      const catVotes = { ...state.rejectVotes[move.category] };
      const currentVoters = catVotes[move.targetPlayerId] || [];
      const alreadyVoted = currentVoters.includes(playerId);

      catVotes[move.targetPlayerId] = alreadyVoted
        ? currentVoters.filter((id) => id !== playerId)
        : [...currentVoters, playerId];

      const nextRejectVotes = {
        ...state.rejectVotes,
        [move.category]: catVotes,
      };

      const { evaluated, roundScores } = evaluateRoundAnswers({
        players,
        categories: state.categories,
        letter: state.letter,
        answers: state.answers,
        rejectVotes: nextRejectVotes,
      });

      return {
        valid: true,
        state: {
          ...state,
          rejectVotes: nextRejectVotes,
          evaluated,
          roundScores,
          // Bei neuer Abstimmung Bestätigungen zurücksetzen, damit alle das geänderte Ergebnis sehen
          reviewReadyIds: [],
        },
      };
    }

    // 5. AUSWERTUNG BESTÄTIGEN (WEITER)
    if (move.type === 'review_ready') {
      if (state.phase !== 'review') {
        return { valid: true, state };
      }

      const nextReady = state.reviewReadyIds.includes(playerId)
        ? state.reviewReadyIds
        : [...state.reviewReadyIds, playerId];

      const updated: StadtLandFlussState = {
        ...state,
        reviewReadyIds: nextReady,
      };

      const activeHumanPlayers = players.filter((p) => !p.isTvScreen && p.connectionState !== 'offline');
      const allReady = (activeHumanPlayers.length > 0 ? activeHumanPlayers : players).every((p) =>
        nextReady.includes(p.id)
      );
      if (allReady) {
        return {
          valid: true,
          state: finalizeReviewToRoundOver(updated),
        };
      }

      return { valid: true, state: updated };
    }

    // 6. NÄCHSTE RUNDE ODER SPIELENDE
    if (move.type === 'next_round') {
      if (state.phase !== 'round_over') {
        return { valid: true, state };
      }

      const nextRound = state.round + 1;
      if (nextRound > state.maxRounds) {
        return {
          valid: true,
          state: finalizeOverallGame(state),
        };
      }

      if (state.customWordsEnabled) {
        const nextChooser = resolveCategoryChooser(
          players,
          nextRound,
          undefined,
          state.categoryChooserId
        );
        const now = Date.now();
        return {
          valid: true,
          state: {
            ...state,
            round: nextRound,
            currentTurn: nextChooser?.id || state.currentTurn,
            categoryChooserId: nextChooser?.id || state.categoryChooserId,
            categoryChooserName: nextChooser?.name || state.categoryChooserName,
            letter: '',
            phase: 'choosing_categories',
            phaseEndsAt: now + CHOOSE_CATEGORIES_DURATION_SEC * 1000,
            answers: Object.fromEntries(players.map((p) => [p.id, {}])),
            filledCounts: Object.fromEntries(players.map((p) => [p.id, 0])),
            submittedPlayerIds: [],
            stoppedByPlayerName: undefined,
            rejectVotes: {},
            evaluated: {},
            roundScores: Object.fromEntries(players.map((p) => [p.id, 0])),
            reviewReadyIds: [],
          },
        };
      }

      return {
        valid: true,
        state: startWritingPhase(
          {
            ...state,
            round: nextRound,
          },
          players,
          state.categories
        ),
      };
    }

    return { valid: false, error: 'Unbekannter Spielzug.', state };
  },

  onPlayerLeave(state, _leavingPlayerId, remainingPlayers) {
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
        phase: 'game_over',
      };
    }

    if (state.phase === 'choosing_categories') {
      if (!state.categoryChooserId || state.categoryChooserId === _leavingPlayerId) {
        const nextChooser = resolveCategoryChooser(activePlayers, state.round);
        if (nextChooser) {
          return {
            ...state,
            currentTurn: nextChooser.id,
            categoryChooserId: nextChooser.id,
            categoryChooserName: nextChooser.name,
            phaseEndsAt: Date.now() + CHOOSE_CATEGORIES_DURATION_SEC * 1000,
          };
        }
      }
      return state;
    }

    if (state.phase === 'writing') {
      const allSubmitted = activePlayers.every((p) => state.submittedPlayerIds.includes(p.id));
      if (allSubmitted) {
        return transitionToReview(state, activePlayers);
      }
      return state;
    }

    if (state.phase === 'review') {
      const { evaluated, roundScores } = evaluateRoundAnswers({
        players: activePlayers,
        categories: state.categories,
        letter: state.letter,
        answers: state.answers,
        rejectVotes: state.rejectVotes,
      });
      const updated = { ...state, evaluated, roundScores };
      const allReady = activePlayers.every((p) => updated.reviewReadyIds.includes(p.id));
      if (allReady) {
        return finalizeReviewToRoundOver(updated);
      }
      return updated;
    }

    return state;
  },
};
