import { z } from 'zod';
import { SOCKET_EVENTS } from '../events/socketEvents.js';

export const SESSION_COOKIE_NAME = 'pb_session';

export function resolveSessionCookieName(clientRole?: string | null): string {
  if (clientRole === 'tv') return `${SESSION_COOKIE_NAME}_tv`;
  if (clientRole === 'smartphone') return `${SESSION_COOKIE_NAME}_smartphone`;
  return SESSION_COOKIE_NAME;
}

export const EVENT_MAX_PAYLOAD_BYTES = {
  [SOCKET_EVENTS.LOBBY_LIST]: 1024,
  [SOCKET_EVENTS.LOBBY_GET_BY_CODE]: 1024,
  [SOCKET_EVENTS.LOBBY_CREATE]: 64 * 1024,
  [SOCKET_EVENTS.LOBBY_SIMULATE]: 64 * 1024,
  [SOCKET_EVENTS.LOBBY_JOIN]: 64 * 1024,
  [SOCKET_EVENTS.LOBBY_READY]: 512,
  [SOCKET_EVENTS.LOBBY_START]: 512,
  [SOCKET_EVENTS.LOBBY_UPDATE_PROFILE]: 64 * 1024,
  [SOCKET_EVENTS.LOBBY_UPDATE_SETTINGS]: 4096,
  [SOCKET_EVENTS.LOBBY_RECONNECT]: 2048,
  [SOCKET_EVENTS.LOBBY_SWITCH_MODE]: 512,
  [SOCKET_EVENTS.LOBBY_SWITCH_GAME]: 512,
  [SOCKET_EVENTS.GAME_MOVE]: 4096,
  [SOCKET_EVENTS.GAME_REMATCH]: 512,
  [SOCKET_EVENTS.DRAW_STROKES]: 24 * 1024,
  [SOCKET_EVENTS.ZOMBIE_INPUT]: 512,
  [SOCKET_EVENTS.ZOMBIE_STATE]: 8192,
  [SOCKET_EVENTS.SESSION_PING]: 256,
} as const;

const utf8Encoder = new TextEncoder();

export function getUtf8ByteLength(text: string): number {
  return utf8Encoder.encode(text).length;
}

export function isPayloadWithinLimit(payload: unknown, maxBytes: number): boolean {
  if (payload === undefined || payload === null) return true;
  try {
    const encoded = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return getUtf8ByteLength(encoded) <= maxBytes;
  } catch {
    return false;
  }
}

export const AvatarSchema = z
  .object({
    base: z.string().max(32).optional(),
    bg: z.string().max(32).optional(),
    hat: z.string().max(32).optional(),
    accessory: z.string().max(32).optional(),
    skinColor: z.string().max(24).optional(),
    customId: z.string().max(64).optional(),
    customImage: z
      .string()
      .max(48_000)
      .refine((v) => /^data:image\/(png|jpeg|webp);base64,/i.test(v), 'Ungültiges Bildformat')
      .optional(),
  })
  .passthrough();

export const UserProfileSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(32),
  avatar: AvatarSchema.optional().default({}),
});

export const LobbyListSchema = z.object({
  gameId: z.string().trim().max(48).optional().default(''),
});

export const LobbyGetByCodeSchema = z.object({
  code: z.string().trim().min(1).max(16),
});

export const LobbyCreateSchema = z.object({
  name: z.string().trim().max(48).optional().default(''),
  isPrivate: z.boolean().optional().default(true),
  gameId: z.string().trim().min(1).max(48),
  userProfile: UserProfileSchema,
  isTvMode: z.boolean().optional().default(false),
});

export const LobbyJoinSchema = z.object({
  lobbyIdOrCode: z.string().trim().min(1).max(64),
  userProfile: UserProfileSchema,
});

export const ActionMetaFields = {
  actionId: z.string().trim().min(1).max(80).optional(),
  expectedVersion: z.number().int().min(0).optional(),
};

export const LobbyReadySchema = z.object({
  ...ActionMetaFields,
});

export const LobbyStartSchema = z.object({
  ...ActionMetaFields,
});

export const GameRematchSchema = z.object({
  ...ActionMetaFields,
});

export const LobbySwitchModeSchema = z.object({
  isTvMode: z.boolean(),
  ...ActionMetaFields,
});

export const LobbySwitchGameSchema = z.object({
  gameId: z.string().trim().min(1).max(64),
  ...ActionMetaFields,
});

export const LobbyUpdateSettingsSchema = z.object({
  settings: z.object({
    rounds: z.number().int().min(1).max(30).optional(),
    roundDuration: z.number().int().min(15).max(180).optional(),
    category: z.string().trim().min(1).max(32).optional(),
    customWordsEnabled: z.boolean().optional(),
    stopButtonEnabled: z.boolean().optional(),
    categoryPreset: z.enum(['klassisch', 'party', 'bunt']).optional(),
    startingBalance: z.number().int().min(100).max(100000).optional(),
    smallBlind: z.number().int().min(5).max(500).optional(),
  }),
  ...ActionMetaFields,
});

export const LobbySimulateSchema = z.object({
  gameId: z.string().trim().min(1).max(48),
  userProfile: UserProfileSchema,
  isTvMode: z.boolean().optional().default(false),
  botCount: z.number().int().min(0).max(5).optional().default(2),
  settings: LobbyUpdateSettingsSchema.shape.settings.optional(),
});

export const LobbyUpdateProfileSchema = z.object({
  userProfile: UserProfileSchema,
});

export const LobbyReconnectSchema = z.object({
  userId: z.string().trim().min(1).max(80).optional(),
  lobbyIdOrCode: z.string().trim().max(64).optional(),
  reconnectToken: z.string().trim().min(8).max(160).optional(),
});

export const SessionPingSchema = z.object({
  clientTime: z.number().finite().optional(),
});

const AnswersRecordSchema = z.record(
  z.string().trim().min(1).max(40),
  z.string().max(40)
);

export const GameMoveSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('guess'),
    text: z.string().trim().min(1).max(64),
    ...ActionMetaFields,
  }),
  z.object({
    type: z.literal('set_word'),
    word: z.string().trim().min(2).max(28),
    ...ActionMetaFields,
  }),
  z.object({ type: z.literal('undo'), ...ActionMetaFields }),
  z.object({ type: z.literal('clear'), ...ActionMetaFields }),
  z.object({ type: z.literal('time_up'), ...ActionMetaFields }),
  z.object({ type: z.literal('next_round'), ...ActionMetaFields }),
  z.object({
    type: z.literal('set_categories'),
    categories: z.array(z.string().trim().min(2).max(28)).min(3).max(5),
    ...ActionMetaFields,
  }),
  z.object({
    type: z.literal('save_draft'),
    answers: AnswersRecordSchema,
    ...ActionMetaFields,
  }),
  z.object({
    type: z.literal('submit_round'),
    answers: AnswersRecordSchema,
    triggerStop: z.boolean().optional(),
    ...ActionMetaFields,
  }),
  z.object({
    type: z.literal('toggle_vote'),
    targetPlayerId: z.string().trim().min(1).max(80),
    category: z.string().trim().min(1).max(40),
    ...ActionMetaFields,
  }),
  z.object({ type: z.literal('review_ready'), ...ActionMetaFields }),
  z.object({
    type: z.literal('place_bet'),
    betKey: z.string().trim().min(3).max(32),
    amount: z.number().int().min(1).max(1000000),
    ...ActionMetaFields,
  }),
  z.object({
    type: z.literal('remove_bet'),
    betKey: z.string().trim().min(3).max(32),
    amount: z.number().int().min(1).max(1000000).optional(),
    ...ActionMetaFields,
  }),
  z.object({
    type: z.literal('move_bet'),
    fromBetKey: z.string().trim().min(3).max(32),
    toBetKey: z.string().trim().min(3).max(32),
    amount: z.number().int().min(1).max(1000000).optional(),
    ...ActionMetaFields,
  }),
  z.object({ type: z.literal('undo_bet'), ...ActionMetaFields }),
  z.object({ type: z.literal('clear_bets'), ...ActionMetaFields }),
  z.object({ type: z.literal('rebet'), ...ActionMetaFields }),
  z.object({ type: z.literal('double_bets'), ...ActionMetaFields }),
  z.object({ type: z.literal('lock_bets'), ...ActionMetaFields }),
  z.object({ type: z.literal('finish_spin'), ...ActionMetaFields }),
  z.object({
    type: z.literal('poker_action'),
    action: z.enum(['fold', 'check', 'call', 'raise', 'all_in']),
    targetBet: z.number().int().min(1).max(10000000).optional(),
    ...ActionMetaFields,
  }),
  z.object({
    type: z.literal('zombie_finish'),
    wave: z.number().int().min(1).max(999),
    scores: z.record(z.string().min(1).max(80), z.number().finite().min(0).max(10000000)),
    kills: z.record(z.string().min(1).max(80), z.number().int().min(0).max(1000000)),
    levels: z.record(z.string().min(1).max(80), z.number().int().min(1).max(999)),
    weapons: z.record(z.string().min(1).max(80), z.string().min(1).max(32)),
    ...ActionMetaFields,
  }),
]);

export const ZombieInputSchema = z.object({
  moveX: z.number().finite().min(-1).max(1),
  moveY: z.number().finite().min(-1).max(1),
  aimX: z.number().finite().min(-1).max(1),
  aimY: z.number().finite().min(-1).max(1),
  firing: z.boolean(),
  reload: z.boolean().optional(),
  dash: z.boolean().optional(),
});

export const ZombiePlayerHudSchema = z.object({
  playerId: z.string().min(1).max(80),
  hp: z.number().finite().min(0).max(10000),
  maxHp: z.number().finite().min(1).max(10000),
  xp: z.number().finite().min(0).max(10000000),
  level: z.number().int().min(1).max(999),
  weaponId: z.string().min(1).max(32),
  ammo: z.number().int().min(0).max(999),
  maxAmmo: z.number().int().min(1).max(999),
  reloading: z.boolean(),
  kills: z.number().int().min(0).max(1000000),
  score: z.number().finite().min(0).max(10000000),
  alive: z.boolean(),
  dashReadyAt: z.number().finite().optional(),
});

export const ZombieStateSchema = z.object({
  wave: z.number().int().min(1).max(999),
  zombiesRemaining: z.number().int().min(0).max(10000),
  players: z.record(z.string().min(1).max(80), ZombiePlayerHudSchema),
  status: z.enum(['playing', 'won', 'draw']),
});

export const StrokeSegmentSchema = z.object({
  x0: z.number().finite().min(0).max(1),
  y0: z.number().finite().min(0).max(1),
  x1: z.number().finite().min(0).max(1),
  y1: z.number().finite().min(0).max(1),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{3,8}$/)
    .catch('#000000'),
  size: z.number().finite().min(1).max(24),
  strokeId: z.number().finite().optional(),
});

export const DrawStrokesSchema = z.object({
  strokes: z.array(StrokeSegmentSchema).min(1).max(120),
});
