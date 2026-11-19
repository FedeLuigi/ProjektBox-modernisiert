import crypto from 'node:crypto';
import { SLF_CUSTOM_CATEGORY_SUGGESTIONS } from '@projektbox/shared/utils';
import type { Lobby, Player } from '../types/multiplayer.js';

export type BotMoveExecutor = (lobbyId: string, playerId: string, move: any) => void;
export type BotStrokeEmitter = (lobbyId: string, strokes: any[]) => void;

const ROULETTE_SAMPLE_BETS = [
  'color:red',
  'color:black',
  'parity:even',
  'parity:odd',
  'dozen:1',
  'dozen:2',
  'dozen:3',
  'range:low',
  'range:high',
  'number:0',
  'number:7',
  'number:17',
  'number:23',
  'number:32',
  'split:14-17',
  'split:8-11',
  'split:0-2',
  'corner:1-2-4-5',
  'corner:14-15-17-18',
  'corner:25-26-28-29',
  'street:7-8-9',
  'line:13-18',
];

const SLF_WORDS: Record<
  string,
  { stadt: string; land: string; fluss: string; tier: string; name: string; extra: string }
> = {
  A: { stadt: 'Augsburg', land: 'Argentinien', fluss: 'Alster', tier: 'Adler', name: 'Anna', extra: 'Apfel' },
  B: { stadt: 'Berlin', land: 'Belgien', fluss: 'Bodensee', tier: 'Bär', name: 'Ben', extra: 'Banane' },
  C: { stadt: 'Chemnitz', land: 'Chile', fluss: 'Chiemsee', tier: 'Chamäleon', name: 'Clara', extra: 'Computer' },
  D: { stadt: 'Dresden', land: 'Dänemark', fluss: 'Donau', tier: 'Delfin', name: 'David', extra: 'Drucker' },
  E: { stadt: 'Essen', land: 'Estland', fluss: 'Elbe', tier: 'Elefant', name: 'Elena', extra: 'Erdbeere' },
  F: { stadt: 'Frankfurt', land: 'Frankreich', fluss: 'Fulda', tier: 'Fuchs', name: 'Felix', extra: 'Fenster' },
  G: { stadt: 'Göttingen', land: 'Griechenland', fluss: 'Ganges', tier: 'Giraffe', name: 'Greta', extra: 'Gitarre' },
  H: { stadt: 'Hamburg', land: 'Holland', fluss: 'Havel', tier: 'Hund', name: 'Hannah', extra: 'Hammer' },
  I: { stadt: 'Ingolstadt', land: 'Italien', fluss: 'Inn', tier: 'Igel', name: 'Ida', extra: 'Insel' },
  J: { stadt: 'Jena', land: 'Japan', fluss: 'Jordan', tier: 'Jaguar', name: 'Jonas', extra: 'Jacke' },
  K: { stadt: 'Köln', land: 'Kanada', fluss: 'Kocher', tier: 'Katze', name: 'Klara', extra: 'Kamera' },
  L: { stadt: 'Leipzig', land: 'Luxemburg', fluss: 'Lech', tier: 'Löwe', name: 'Luca', extra: 'Lampe' },
  M: { stadt: 'München', land: 'Mexiko', fluss: 'Main', tier: 'Maus', name: 'Mia', extra: 'Melone' },
  N: { stadt: 'Nürnberg', land: 'Norwegen', fluss: 'Neckar', tier: 'Nashorn', name: 'Noah', extra: 'Nudel' },
  O: { stadt: 'Oslo', land: 'Österreich', fluss: 'Oder', tier: 'Otter', name: 'Oskar', extra: 'Orange' },
  P: { stadt: 'Potsdam', land: 'Polen', fluss: 'Po', tier: 'Pinguin', name: 'Paul', extra: 'Pizza' },
  R: { stadt: 'Rostock', land: 'Rumänien', fluss: 'Rhein', tier: 'Reh', name: 'Rosa', extra: 'Radio' },
  S: { stadt: 'Stuttgart', land: 'Spanien', fluss: 'Spree', tier: 'Schwan', name: 'Sofia', extra: 'Sonne' },
  T: { stadt: 'Trier', land: 'Türkei', fluss: 'Themse', tier: 'Tiger', name: 'Tim', extra: 'Tisch' },
  U: { stadt: 'Ulm', land: 'Ungarn', fluss: 'Ural', tier: 'Uhu', name: 'Ulla', extra: 'Uhr' },
  V: { stadt: 'Venedig', land: 'Vietnam', fluss: 'Volta', tier: 'Vogel', name: 'Vera', extra: 'Vase' },
  W: { stadt: 'Wien', land: 'Wales', fluss: 'Weser', tier: 'Wolf', name: 'Walter', extra: 'Wasser' },
  Z: { stadt: 'Zürich', land: 'Zypern', fluss: 'Zill', tier: 'Zebra', name: 'Zoe', extra: 'Zitrone' },
};

const DRAW_BOT_WORDS = ['HAUS', 'SONNE', 'BAUM', 'BOOT', 'FISCH', 'STERN', 'BLUME'];
const BOT_DOODLE_SEGMENTS = [
  { x0: 0.3, y0: 0.72, x1: 0.3, y1: 0.45, color: '#0F172A', size: 6 },
  { x0: 0.3, y0: 0.45, x1: 0.7, y1: 0.45, color: '#0F172A', size: 6 },
  { x0: 0.7, y0: 0.45, x1: 0.7, y1: 0.72, color: '#0F172A', size: 6 },
  { x0: 0.3, y0: 0.72, x1: 0.7, y1: 0.72, color: '#0F172A', size: 6 },
  { x0: 0.25, y0: 0.46, x1: 0.5, y1: 0.24, color: '#DC2626', size: 7 },
  { x0: 0.5, y0: 0.24, x1: 0.75, y1: 0.46, color: '#DC2626', size: 7 },
  { x0: 0.78, y0: 0.22, x1: 0.85, y1: 0.22, color: '#F59E0B', size: 10 },
  { x0: 0.46, y0: 0.72, x1: 0.46, y1: 0.56, color: '#1E293B', size: 6 },
];

function buildSlfBotAnswers(letter: string, categories: string[], botIdx: number): Record<string, string> {
  const upper = (letter || 'B').slice(0, 1).toUpperCase();
  const entry = SLF_WORDS[upper] || SLF_WORDS.B;
  const result: Record<string, string> = {};

  categories.forEach((cat, idx) => {
    const low = cat.toLowerCase();
    let word = entry.extra;
    if (low.includes('stadt')) word = entry.stadt;
    else if (low.includes('land')) word = entry.land;
    else if (low.includes('fluss') || low.includes('gewässer')) word = entry.fluss;
    else if (low.includes('tier')) word = entry.tier;
    else if (low.includes('name')) word = entry.name;

    // Bot 2/3 liefern gelegentlich eigene Varianten oder ein leeres Feld für realistische Wertung
    if (botIdx > 0 && idx === categories.length - 1 && (botIdx + idx) % 3 === 0) {
      word = '';
    } else if (!word.toUpperCase().startsWith(upper)) {
      word = `${upper}${word.toLowerCase()}`;
    }
    result[cat] = word;
  });

  return result;
}

/**
 * Steuert virtuelle Bot-Spieler in Simulations-Lobbys (alle 4 Spiele inkl. TV-Only-Simulation).
 */
export class SimulationBotRunner {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly executeMove: BotMoveExecutor,
    private readonly emitDrawStrokes?: BotStrokeEmitter
  ) {}

  public clearLobby(lobbyId: string): void {
    const existing = this.timers.get(lobbyId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(lobbyId);
    }
  }

  public clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  public syncLobby(lobby: Lobby | undefined): void {
    if (!lobby) return;
    this.clearLobby(lobby.id);

    if (!lobby.isSimulated || lobby.status !== 'in_progress' || !lobby.gameState) {
      return;
    }

    const gs = lobby.gameState;
    if (gs.status !== 'playing') {
      return;
    }

    const activeBots = lobby.players.filter(
      (p) => p.isBot && !p.isTvScreen && !p.eliminated && p.connectionState === 'connected'
    );
    const hasHumanPlayer = lobby.players.some(
      (p) => !p.isBot && !p.isTvScreen && p.connected && p.connectionState === 'connected'
    );

    if (activeBots.length === 0) {
      return;
    }

    if (lobby.gameId === 'roulette') {
      this.scheduleRoulette(lobby, activeBots, hasHumanPlayer);
    } else if (lobby.gameId === 'texas-holdem') {
      this.schedulePoker(lobby, activeBots, hasHumanPlayer);
    } else if (lobby.gameId === 'stadt-land-fluss') {
      this.scheduleStadtLandFluss(lobby, activeBots, hasHumanPlayer);
    } else if (lobby.gameId === 'draw-and-guess') {
      this.scheduleDrawAndGuess(lobby, activeBots, hasHumanPlayer);
    }
  }

  private scheduleTimer(lobbyId: string, delayMs: number, task: () => void): void {
    this.clearLobby(lobbyId);
    const timer = setTimeout(() => {
      this.timers.delete(lobbyId);
      task();
    }, Math.max(40, delayMs));
    timer.unref?.();
    this.timers.set(lobbyId, timer);
  }

  private scheduleRoulette(lobby: Lobby, bots: Player[], hasHumanPlayer: boolean): void {
    const gs = lobby.gameState!;
    const now = Date.now();
    const phase = gs.phase as 'betting' | 'spinning' | 'result' | 'game_over';

    if (phase === 'betting') {
      const pendingBot = bots.find((b) => {
        const botBets = gs.bets?.[b.id] || {};
        const total = Object.values(botBets).reduce(
          (acc: number, v: any) => acc + (typeof v === 'number' ? v : 0),
          0
        );
        return total === 0 && (gs.balances?.[b.id] ?? 0) >= 5;
      });

      if (pendingBot) {
        this.scheduleTimer(lobby.id, 650, () => {
          const bal = gs.balances?.[pendingBot.id] ?? 0;
          const amount = bal >= 100 ? 100 : bal >= 25 ? 25 : Math.min(5, bal);
          const betKey = ROULETTE_SAMPLE_BETS[crypto.randomInt(0, ROULETTE_SAMPLE_BETS.length)];
          if (amount > 0) {
            this.executeMove(lobby.id, pendingBot.id, { type: 'place_bet', betKey, amount });
          }
        });
        return;
      }

      if (!hasHumanPlayer && typeof gs.phaseEndsAt === 'number') {
        const waitMs = Math.max(250, gs.phaseEndsAt - now + 180);
        this.scheduleTimer(lobby.id, waitMs, () => {
          this.executeMove(lobby.id, bots[0].id, { type: 'time_up' });
        });
      }
      return;
    }

    if (phase === 'spinning' && !hasHumanPlayer && typeof gs.phaseEndsAt === 'number') {
      const waitMs = Math.max(250, gs.phaseEndsAt - now + 180);
      this.scheduleTimer(lobby.id, waitMs, () => {
        this.executeMove(lobby.id, bots[0].id, { type: 'finish_spin' });
      });
      return;
    }

    if (phase === 'result') {
      const readyIds: string[] = Array.isArray(gs.nextReadyIds) ? gs.nextReadyIds : [];
      if (hasHumanPlayer) {
        const nextBot = bots.find((b) => !readyIds.includes(b.id));
        if (nextBot) {
          this.scheduleTimer(lobby.id, 450, () => {
            this.executeMove(lobby.id, nextBot.id, { type: 'next_round' });
          });
        }
      } else if (typeof gs.phaseEndsAt === 'number') {
        const waitMs = Math.max(800, gs.phaseEndsAt - now + 180);
        this.scheduleTimer(lobby.id, waitMs, () => {
          this.executeMove(lobby.id, bots[0].id, { type: 'time_up' });
        });
      }
    }
  }

  private schedulePoker(lobby: Lobby, bots: Player[], hasHumanPlayer: boolean): void {
    const gs = lobby.gameState!;
    const now = Date.now();
    const phase = gs.phase as string;

    if (phase === 'showdown') {
      const readyIds: string[] = Array.isArray(gs.nextReadyIds) ? gs.nextReadyIds : [];
      const nextBot = bots.find((b) => !readyIds.includes(b.id));
      if (nextBot) {
        const delayMs = hasHumanPlayer ? 450 : 2800;
        this.scheduleTimer(lobby.id, delayMs, () => {
          this.executeMove(lobby.id, nextBot.id, { type: 'next_round' });
        });
      } else if (!hasHumanPlayer && typeof gs.phaseEndsAt === 'number') {
        const waitMs = Math.max(250, gs.phaseEndsAt - now + 200);
        this.scheduleTimer(lobby.id, waitMs, () => {
          this.executeMove(lobby.id, bots[0].id, { type: 'time_up' });
        });
      }
      return;
    }

    const turnBot = bots.find((b) => b.id === gs.currentTurn);
    if (turnBot) {
      this.scheduleTimer(lobby.id, 850, () => {
        const bal = gs.balances?.[turnBot.id] ?? 0;
        const streetBet = gs.streetBets?.[turnBot.id] ?? 0;
        const currentBet = gs.currentBet ?? 0;
        const bigBlind = gs.bigBlind ?? 20;
        const minRaise = gs.minRaise ?? bigBlind;
        const toCall = Math.max(0, currentBet - streetBet);
        const roll = crypto.randomInt(0, 100);

        if (toCall === 0) {
          const minTarget = Math.max(currentBet + minRaise, bigBlind);
          const maxBet = streetBet + bal;
          if (roll < 72 || bal < minTarget - streetBet) {
            this.executeMove(lobby.id, turnBot.id, { type: 'poker_action', action: 'check' });
          } else {
            this.executeMove(lobby.id, turnBot.id, {
              type: 'poker_action',
              action: 'raise',
              targetBet: Math.min(maxBet, minTarget),
            });
          }
          return;
        }

        if (bal <= toCall) {
          this.executeMove(lobby.id, turnBot.id, {
            type: 'poker_action',
            action: roll < 35 ? 'fold' : 'call',
          });
          return;
        }

        const raiseTarget = currentBet + minRaise;
        if (roll < 20) {
          this.executeMove(lobby.id, turnBot.id, { type: 'poker_action', action: 'fold' });
        } else if (roll < 84 || bal < raiseTarget - streetBet) {
          this.executeMove(lobby.id, turnBot.id, { type: 'poker_action', action: 'call' });
        } else {
          this.executeMove(lobby.id, turnBot.id, {
            type: 'poker_action',
            action: 'raise',
            targetBet: Math.min(streetBet + bal, raiseTarget),
          });
        }
      });
      return;
    }

    if (!hasHumanPlayer && typeof gs.phaseEndsAt === 'number') {
      const waitMs = Math.max(250, gs.phaseEndsAt - now + 200);
      this.scheduleTimer(lobby.id, waitMs, () => {
        this.executeMove(lobby.id, bots[0].id, { type: 'time_up' });
      });
    }
  }

  private scheduleStadtLandFluss(lobby: Lobby, bots: Player[], hasHumanPlayer: boolean): void {
    const gs = lobby.gameState!;
    const now = Date.now();
    const phase = gs.phase as 'choosing_categories' | 'writing' | 'review' | 'round_over' | 'game_over';

    if (phase === 'choosing_categories') {
      const chooserBot = bots.find((b) => b.id === gs.categoryChooserId);
      if (chooserBot) {
        this.scheduleTimer(lobby.id, 1100, () => {
          const roundIdx = Math.max(0, (Number(gs.round) || 1) - 1);
          const customCats =
            SLF_CUSTOM_CATEGORY_SUGGESTIONS[roundIdx % SLF_CUSTOM_CATEGORY_SUGGESTIONS.length];
          this.executeMove(lobby.id, chooserBot.id, {
            type: 'set_categories',
            categories: customCats,
          });
        });
      } else if (!hasHumanPlayer && typeof gs.phaseEndsAt === 'number') {
        const waitMs = Math.max(250, gs.phaseEndsAt - now + 150);
        this.scheduleTimer(lobby.id, waitMs, () => {
          this.executeMove(lobby.id, bots[0].id, { type: 'time_up' });
        });
      }
      return;
    }

    if (phase === 'writing') {
      const submittedIds: string[] = Array.isArray(gs.submittedPlayerIds) ? gs.submittedPlayerIds : [];
      const pendingIdx = bots.findIndex((b) => !submittedIds.includes(b.id));
      if (pendingIdx >= 0) {
        const bot = bots[pendingIdx];
        this.scheduleTimer(lobby.id, hasHumanPlayer ? 1800 : 1400, () => {
          const answers = buildSlfBotAnswers(
            gs.letter || 'B',
            Array.isArray(gs.categories) ? gs.categories : [],
            pendingIdx
          );
          const triggerStop = !hasHumanPlayer && pendingIdx === bots.length - 1;
          this.executeMove(lobby.id, bot.id, {
            type: 'submit_round',
            answers,
            triggerStop: triggerStop && gs.stopButtonEnabled !== false,
          });
        });
        return;
      }

      if (!hasHumanPlayer && typeof gs.phaseEndsAt === 'number') {
        const waitMs = Math.max(250, gs.phaseEndsAt - now + 150);
        this.scheduleTimer(lobby.id, waitMs, () => {
          this.executeMove(lobby.id, bots[0].id, { type: 'time_up' });
        });
      }
      return;
    }

    if (phase === 'review') {
      const readyIds: string[] = Array.isArray(gs.reviewReadyIds) ? gs.reviewReadyIds : [];
      const nextBot = bots.find((b) => !readyIds.includes(b.id));
      if (nextBot) {
        this.scheduleTimer(lobby.id, hasHumanPlayer ? 600 : 2800, () => {
          this.executeMove(lobby.id, nextBot.id, { type: 'review_ready' });
        });
      }
      return;
    }

    if (phase === 'round_over' && !hasHumanPlayer) {
      this.scheduleTimer(lobby.id, 2600, () => {
        this.executeMove(lobby.id, bots[0].id, { type: 'next_round' });
      });
    }
  }

  private scheduleDrawAndGuess(lobby: Lobby, bots: Player[], hasHumanPlayer: boolean): void {
    const gs = lobby.gameState!;
    const roundStatus = gs.roundStatus as string;
    const drawerBot = bots.find((b) => b.id === gs.currentDrawerId);

    if (roundStatus === 'choosing_word') {
      if (drawerBot) {
        this.scheduleTimer(lobby.id, 900, () => {
          const word = DRAW_BOT_WORDS[crypto.randomInt(0, DRAW_BOT_WORDS.length)];
          this.executeMove(lobby.id, drawerBot.id, { type: 'set_word', word });
        });
      }
      return;
    }

    if (roundStatus === 'drawing') {
      const strokesCount = Array.isArray(gs.strokes) ? gs.strokes.length : 0;
      if (drawerBot && strokesCount < BOT_DOODLE_SEGMENTS.length) {
        this.scheduleTimer(lobby.id, 450, () => {
          const seg = {
            ...BOT_DOODLE_SEGMENTS[strokesCount],
            strokeId: strokesCount + 1,
          };
          this.executeMove(lobby.id, drawerBot.id, { type: 'stroke', stroke: seg });
          this.emitDrawStrokes?.(lobby.id, [seg]);
        });
        return;
      }

      const guessers = bots.filter(
        (b) => b.id !== gs.currentDrawerId && !(gs.correctGuesserIds || []).includes(b.id)
      );
      if (guessers.length > 0 && typeof gs.secretWord === 'string' && gs.secretWord.length > 0) {
        const guesser = guessers[0];
        const guessCount = Array.isArray(gs.guesses) ? gs.guesses.length : 0;
        const delayMs = hasHumanPlayer ? (guessCount === 0 ? 5000 : 12000) : 2400;
        this.scheduleTimer(lobby.id, delayMs, () => {
          const solveNow = !hasHumanPlayer || guessCount >= 1;
          const text = solveNow ? gs.secretWord : 'SONNE';
          this.executeMove(lobby.id, guesser.id, { type: 'guess', text });
        });
      }
      return;
    }

    if (roundStatus === 'round_over' && !hasHumanPlayer) {
      this.scheduleTimer(lobby.id, 3000, () => {
        this.executeMove(lobby.id, bots[0].id, { type: 'next_round' });
      });
    }
  }
}
