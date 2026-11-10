import { BaseGameState, MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';

export const ROWS = 6;
export const COLS = 7;

export interface ConnectFourState extends BaseGameState {
  gameId: 'connect';
  board: (string | null)[][]; // 6 Zeilen x 7 Spalten
  winningCoords: { row: number; col: number }[] | null;
  lastDrop: { row: number; col: number } | null;
}

export interface ConnectFourMove {
  col: number;
}

function checkWinner(board: (string | null)[][]): {
  winnerColor: string;
  coords: { row: number; col: number }[];
} | null {
  // Horizontal
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

  // Vertikal
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

  // Diagonal (unten-rechts)
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

  // Diagonal (oben-rechts)
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

export const connectFourGame: MultiplayerGameDefinition<ConnectFourState, ConnectFourMove> = {
  id: 'connect',
  title: 'Vier gewinnt',
  minPlayers: 2,
  maxPlayers: 2,

  initGameState(players: Player[], starterId?: string): ConnectFourState {
    if (players.length < 2) {
      throw new Error('Vier gewinnt benötigt 2 Spieler.');
    }

    players[0].color = 'red';
    players[1].color = 'yellow';

    const firstTurn = starterId && players.some((p) => p.id === starterId)
      ? starterId
      : players[0].id;

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
  },

  validateAndApplyMove({ state, players, playerId, move }) {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
    }

    if (state.currentTurn !== playerId) {
      return { valid: false, error: 'Du bist nicht am Zug.', state };
    }

    const { col } = move || {};
    if (typeof col !== 'number' || col < 0 || col >= COLS || !Number.isInteger(col)) {
      return { valid: false, error: 'Ungültige Spalte gewählt.', state };
    }

    if (state.board[0][col] !== null) {
      return { valid: false, error: 'Diese Spalte ist bereits voll.', state };
    }

    const player = players.find((p) => p.id === playerId);
    if (!player || !player.color) {
      return { valid: false, error: 'Spieler nicht gefunden.', state };
    }

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

    const winResult = checkWinner(newBoard);
    let winnerId: string | null = null;
    let winningCoords: { row: number; col: number }[] | null = null;

    if (winResult) {
      winnerId = playerId;
      winningCoords = winResult.coords;
    }

    const isDraw = !winnerId && newBoard[0].every((cell) => cell !== null);
    const newStatus = winnerId ? 'won' : isDraw ? 'draw' : 'playing';

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
  },

  onPlayerLeave(state, leavingPlayerId, remainingPlayers) {
    if (state.status === 'playing' && remainingPlayers.length > 0) {
      return {
        ...state,
        status: 'won',
        winnerId: remainingPlayers[0].id,
      };
    }
    return state;
  },
};
