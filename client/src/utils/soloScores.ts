/**
 * Persistente Highscore-/Rekord-Verwaltung für Einzelspiele (Solo-Modus).
 */

const STORAGE_PREFIX = 'projektbox_solo_best_';

export function isLowerBetterGame(gameId: string): boolean {
  return gameId === 'reaction';
}

export function getSoloHighscore(gameId: string): number | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${gameId}`);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSoloHighscore(
  gameId: string,
  score: number,
  lowerIsBetter = isLowerBetterGame(gameId)
): { bestScore: number; isNewRecord: boolean } {
  const prev = getSoloHighscore(gameId);
  const validScore = Number.isFinite(score) ? score : 0;

  let isNewRecord = false;
  let bestScore = prev ?? validScore;

  if (prev === null) {
    isNewRecord = validScore > 0;
    bestScore = validScore;
  } else if (lowerIsBetter ? validScore > 0 && validScore < prev : validScore > prev) {
    isNewRecord = true;
    bestScore = validScore;
  }

  try {
    if (bestScore > 0) {
      localStorage.setItem(`${STORAGE_PREFIX}${gameId}`, String(bestScore));
    }
  } catch {
    // localStorage blockiert -> ignorieren
  }

  return { bestScore, isNewRecord };
}

export function formatSoloScore(gameId: string, score: number): string {
  if (gameId === 'reaction') return `${score} ms`;
  return `${score} Pkt`;
}
