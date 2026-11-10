import { ConnectFourState, Player } from '../types/multiplayer.js';

export const ROWS = 6;
export const COLS = 7;

export function initConnectFour(players: Player[], starterId?: string): ConnectFourState {
  if (players.length < 2) {
    throw new Error('Vier gewinnt benötigt mindestens 2 Spieler.');
  }

  // Farben zuweisen
  players[0].color = 'red';
  players[1].color = 'yellow';

  const firstTurn = starterId && players.some((p) => p.id === starterId)
    ? starterId
    : players[0].id;

  // 6 Zeilen x 7 Spalten, initial null
  const board: (string | null)[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null)
  );

  return {
    gameId: 'connect',
    board,
    currentTurn: firstTurn,
    status: 'playing',
    winnerId: null,
    winningCoords: null,
    lastDrop: null,
    startedAt: Date.now(),
  };
}

export function checkConnectFourWinner(board: (string | null)[][]): {
  winnerColor: string;
  coords: { row: number; col: number }[];
} | null {
  // 1. Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const color = board[r][c];
      if (
        color &&
        color === board[r][c + 1] &&
        color === board[r][c + 2] &&
        color === board[r][c + 3]
      ) {
        return {
          winnerColor: color,
          coords: [
            { row: r, col: c },
            { row: r, col: c + 1 },
            { row: r, col: c + 2 },
            { row: r, col: c + 3 },
          ],
        };
      }
    }
  }

  // 2. Vertikal
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = board[r][c];
      if (
        color &&
        color === board[r + 1][c] &&
        color === board[r + 2][c] &&
        color === board[r + 3][c]
      ) {
        return {
          winnerColor: color,
          coords: [
            { row: r, col: c },
            { row: r + 1, col: c },
            { row: r + 2, col: c },
            { row: r + 3, col: c },
          ],
        };
      }
    }
  }

  // 3. Diagonal nach unten-rechts
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const color = board[r][c];
      if (
        color &&
        color === board[r + 1][c + 1] &&
        color === board[r + 2][c + 2] &&
        color === board[r + 3][c + 3]
      ) {
        return {
          winnerColor: color,
          coords: [
            { row: r, col: c },
            { row: r + 1, col: c + 1 },
            { row: r + 2, col: c + 2 },
            { row: r + 3, col: c + 3 },
          ],
        };
      }
    }
  }

  // 4. Diagonal nach oben-rechts
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const color = board[r][c];
      if (
        color &&
        color === board[r - 1][c + 1] &&
        color === board[r - 2][c + 2] &&
        color === board[r - 3][c + 3]
      ) {
        return {
          winnerColor: color,
          coords: [
            { row: r, col: c },
            { row: r - 1, col: c + 1 },
            { row: r - 2, col: c + 2 },
            { row: r - 3, col: c + 3 },
          ],
        };
      }
    }
  }

  return null;
}

export function applyConnectFourMove(
  state: ConnectFourState,
  players: Player[],
  playerId: string,
  col: number
): { valid: boolean; error?: string; state: ConnectFourState } {
  if (state.status !== 'playing') {
    return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
  }

  if (state.currentTurn !== playerId) {
    return { valid: false, error: 'Du bist nicht am Zug.', state };
  }

  if (typeof col !== 'number' || col < 0 || col >= COLS || !Number.isInteger(col)) {
    return { valid: false, error: 'Ungültige Spalte gewählt.', state };
  }

  // Prüfen, ob Spalte voll ist
  if (state.board[0][col] !== null) {
    return { valid: false, error: 'Diese Spalte ist bereits voll.', state };
  }

  const player = players.find((p) => p.id === playerId);
  if (!player || !player.color) {
    return { valid: false, error: 'Spieler nicht gefunden.', state };
  }

  // Stein nach unten fallen lassen
  const newBoard = state.board.map((row) => [...row]);
  let dropRow = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (newBoard[r][col] === null) {
      newBoard[r][col] = player.color;
      dropRow = r;
      break;
    }
  }

  if (dropRow === -1) {
    return { valid: false, error: 'Spalte voll.', state };
  }

  // Gewinnprüfung
  const winResult = checkConnectFourWinner(newBoard);
  let winnerId: string | null = null;
  let winningCoords: { row: number; col: number }[] | null = null;

  if (winResult) {
    winnerId = playerId;
    winningCoords = winResult.coords;
  }

  // Unentschieden prüfen (alle obersten Felder belegt)
  const isDraw = !winnerId && newBoard[0].every((cell) => cell !== null);
  const newStatus = winnerId ? 'won' : isDraw ? 'draw' : 'playing';

  // Nächster Spieler am Zug
  const nextPlayer = players.find((p) => p.id !== playerId);
  const nextTurn = nextPlayer ? nextPlayer.id : state.currentTurn;

  const newState: ConnectFourState = {
    ...state,
    board: newBoard,
    status: newStatus,
    winnerId,
    winningCoords,
    lastDrop: { row: dropRow, col },
    currentTurn: newStatus === 'playing' ? nextTurn : state.currentTurn,
  };

  return { valid: true, state: newState };
}
