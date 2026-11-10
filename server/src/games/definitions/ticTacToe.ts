import { BaseGameState, MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';

export interface TicTacToeState extends BaseGameState {
  gameId: 'tic-tac-toe';
  board: (string | null)[];
  winningLine: number[] | null;
}

export interface TicTacToeMove {
  cellIndex: number;
}

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

export const ticTacToeGame: MultiplayerGameDefinition<TicTacToeState, TicTacToeMove> = {
  id: 'tic-tac-toe',
  title: 'Tic Tac Toe',
  minPlayers: 2,
  maxPlayers: 2,

  initGameState(players: Player[], starterId?: string): TicTacToeState {
    if (players.length < 2) {
      throw new Error('Tic Tac Toe benötigt 2 Spieler.');
    }

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
  },

  validateAndApplyMove({ state, players, playerId, move }) {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
    }

    if (state.currentTurn !== playerId) {
      return { valid: false, error: 'Du bist nicht am Zug.', state };
    }

    const { cellIndex } = move || {};
    if (
      typeof cellIndex !== 'number' ||
      cellIndex < 0 ||
      cellIndex > 8 ||
      !Number.isInteger(cellIndex)
    ) {
      return { valid: false, error: 'Ungültiges Spielfeld.', state };
    }

    if (state.board[cellIndex] !== null) {
      return { valid: false, error: 'Dieses Feld ist bereits belegt.', state };
    }

    const player = players.find((p) => p.id === playerId);
    if (!player || !player.symbol) {
      return { valid: false, error: 'Spieler nicht gefunden.', state };
    }

    const newBoard = [...state.board];
    newBoard[cellIndex] = player.symbol;

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

    const isDraw = !winnerId && newBoard.every((cell) => cell !== null);
    const newStatus = winnerId ? 'won' : isDraw ? 'draw' : 'playing';

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
