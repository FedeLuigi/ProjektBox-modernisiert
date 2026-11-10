import { Player, TicTacToeState } from '../types/multiplayer.js';

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function initTicTacToe(players: Player[], starterId?: string): TicTacToeState {
  if (players.length < 2) {
    throw new Error('Tic Tac Toe benötigt mindestens 2 Spieler.');
  }

  // Symbole zuweisen
  players[0].symbol = 'X';
  players[1].symbol = 'O';

  const firstTurn = starterId && players.some((p) => p.id === starterId)
    ? starterId
    : players[0].id;

  return {
    gameId: 'tic-tac-toe',
    board: Array(9).fill(null),
    currentTurn: firstTurn,
    status: 'playing',
    winnerId: null,
    winningLine: null,
    startedAt: Date.now(),
  };
}

export function applyTicTacToeMove(
  state: TicTacToeState,
  players: Player[],
  playerId: string,
  cellIndex: number
): { valid: boolean; error?: string; state: TicTacToeState } {
  if (state.status !== 'playing') {
    return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
  }

  if (state.currentTurn !== playerId) {
    return { valid: false, error: 'Du bist nicht am Zug.', state };
  }

  if (typeof cellIndex !== 'number' || cellIndex < 0 || cellIndex > 8 || !Number.isInteger(cellIndex)) {
    return { valid: false, error: 'Ungültiges Spielfeld.', state };
  }

  if (state.board[cellIndex] !== null) {
    return { valid: false, error: 'Dieses Feld ist bereits belegt.', state };
  }

  const player = players.find((p) => p.id === playerId);
  if (!player || !player.symbol) {
    return { valid: false, error: 'Spieler nicht gefunden.', state };
  }

  // Zug ausführen
  const newBoard = [...state.board];
  newBoard[cellIndex] = player.symbol;

  // Gewinnprüfung
  let winnerId: string | null = null;
  let winningLine: number[] | null = null;

  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
      winnerId = playerId;
      winningLine = line;
      break;
    }
  }

  // Unentschieden-Prüfung
  const isDraw = !winnerId && newBoard.every((cell) => cell !== null);

  // Neuer Status
  const newStatus = winnerId ? 'won' : isDraw ? 'draw' : 'playing';

  // Nächster Spieler am Zug
  const nextPlayer = players.find((p) => p.id !== playerId);
  const nextTurn = nextPlayer ? nextPlayer.id : state.currentTurn;

  const newState: TicTacToeState = {
    ...state,
    board: newBoard,
    status: newStatus,
    winnerId,
    winningLine,
    currentTurn: newStatus === 'playing' ? nextTurn : state.currentTurn,
  };

  return { valid: true, state: newState };
}
