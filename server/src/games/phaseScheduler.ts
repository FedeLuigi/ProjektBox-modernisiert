import type { Lobby } from '../types/multiplayer.js';

export type PhaseAdvanceExecutor = (lobbyId: string, playerId: string, move: any) => void;

/**
 * Autoritärer Server-Scheduler für Spielphasen-Deadlines (`phaseEndsAt` / `roundEndsAt`).
 * Stellt sicher, dass Roulette-Spins, Showdowns, Wortwahlen und Rundenwechsel auch ohne
 * Client-Trigger (z. B. TV-Only oder Smartphone im Hintergrund) zuverlässig weiterlaufen.
 */
export class GamePhaseScheduler {
  private readonly timers = new Map<string, { signature: string; timer: NodeJS.Timeout }>();
  private readonly executeMove: PhaseAdvanceExecutor;

  constructor(executeMove: PhaseAdvanceExecutor) {
    this.executeMove = executeMove;
  }

  public syncLobby(lobby: Lobby): void {
    if (lobby.status !== 'in_progress' || !lobby.gameState || lobby.isSimulated) {
      this.clearLobby(lobby.id);
      return;
    }

    const plan = this.computeNextAdvancePlan(lobby);
    if (!plan) {
      this.clearLobby(lobby.id);
      return;
    }

    const existing = this.timers.get(lobby.id);
    if (existing && existing.signature === plan.signature) {
      return;
    }

    this.clearLobby(lobby.id);

    const delayMs = Math.max(80, plan.triggerAt - Date.now());
    const timer = setTimeout(() => {
      this.timers.delete(lobby.id);
      this.executeMove(lobby.id, plan.actorId, plan.move);
    }, delayMs);
    timer.unref();

    this.timers.set(lobby.id, { signature: plan.signature, timer });
  }

  public clearLobby(lobbyId: string): void {
    const existing = this.timers.get(lobbyId);
    if (existing) {
      clearTimeout(existing.timer);
      this.timers.delete(lobbyId);
    }
  }

  public clearAll(): void {
    for (const entry of this.timers.values()) {
      clearTimeout(entry.timer);
    }
    this.timers.clear();
  }

  private computeNextAdvancePlan(
    lobby: Lobby
  ): { signature: string; triggerAt: number; actorId: string; move: any } | null {
    const gs = lobby.gameState;
    if (!gs || gs.status !== 'playing') return null;

    const actor =
      lobby.players.find((p) => !p.isTvScreen && p.connectionState !== 'offline') ||
      lobby.players[0];
    if (!actor) return null;

    if (lobby.gameId === 'roulette') {
      const phaseEndsAt = typeof gs.phaseEndsAt === 'number' ? gs.phaseEndsAt : 0;
      if (!phaseEndsAt) return null;
      if (gs.phase === 'betting') {
        return {
          signature: `roulette:${gs.round}:betting:${phaseEndsAt}`,
          triggerAt: phaseEndsAt + 120,
          actorId: actor.id,
          move: { type: 'time_up' },
        };
      }
      if (gs.phase === 'spinning') {
        return {
          signature: `roulette:${gs.round}:spinning:${phaseEndsAt}`,
          triggerAt: phaseEndsAt + 80,
          actorId: actor.id,
          move: { type: 'finish_spin' },
        };
      }
      if (gs.phase === 'result') {
        return {
          signature: `roulette:${gs.round}:result:${phaseEndsAt}`,
          triggerAt: phaseEndsAt + 150,
          actorId: actor.id,
          move: { type: 'next_round' },
        };
      }
    }

    if (lobby.gameId === 'texas-holdem') {
      const phaseEndsAt = typeof gs.phaseEndsAt === 'number' ? gs.phaseEndsAt : 0;
      if (!phaseEndsAt) return null;
      if (gs.phase === 'showdown') {
        return {
          signature: `poker:${gs.handNumber}:showdown:${phaseEndsAt}`,
          triggerAt: phaseEndsAt + 150,
          actorId: actor.id,
          move: { type: 'next_round' },
        };
      }
      if (gs.currentTurn && gs.phase !== 'game_over') {
        return {
          signature: `poker:${gs.handNumber}:${gs.phase}:${gs.currentTurn}:${phaseEndsAt}`,
          triggerAt: phaseEndsAt + 200,
          actorId: actor.id,
          move: { type: 'time_up' },
        };
      }
    }

    if (lobby.gameId === 'draw-and-guess') {
      const roundEndsAt = typeof gs.roundEndsAt === 'number' ? gs.roundEndsAt : 0;
      if (
        (gs.roundStatus === 'choosing_word' || gs.roundStatus === 'drawing') &&
        roundEndsAt
      ) {
        return {
          signature: `draw:${gs.round}:${gs.roundStatus}:${roundEndsAt}`,
          triggerAt: roundEndsAt + 200,
          actorId: actor.id,
          move: { type: 'time_up' },
        };
      }
      if (gs.roundStatus === 'round_over') {
        return {
          signature: `draw:${gs.round}:round_over`,
          triggerAt: Date.now() + 4500,
          actorId: actor.id,
          move: { type: 'next_round' },
        };
      }
    }

    if (lobby.gameId === 'stadt-land-fluss') {
      const phaseEndsAt = typeof gs.phaseEndsAt === 'number' ? gs.phaseEndsAt : 0;
      if (!phaseEndsAt) return null;
      if (gs.phase === 'writing' || gs.phase === 'review') {
        return {
          signature: `slf:${gs.round}:${gs.phase}:${phaseEndsAt}`,
          triggerAt: phaseEndsAt + 200,
          actorId: actor.id,
          move: { type: 'time_up' },
        };
      }
      if (gs.phase === 'round_over') {
        return {
          signature: `slf:${gs.round}:round_over:${phaseEndsAt}`,
          triggerAt: phaseEndsAt + 200,
          actorId: actor.id,
          move: { type: 'next_round' },
        };
      }
    }

    return null;
  }
}
