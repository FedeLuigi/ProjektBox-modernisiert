import { z } from 'zod';

export const EVENT_MAX_PAYLOAD_BYTES = {
  'lobby:list': 1024,
  'lobby:getByCode': 1024,
  'lobby:create': 64 * 1024,
  'lobby:join': 64 * 1024,
  'lobby:ready': 512,
  'lobby:start': 512,
  'lobby:update-profile': 64 * 1024,
  'lobby:update-settings': 4096,
  'lobby:reconnect': 2048,
  'lobby:switch-mode': 512,
  'game:move': 4096,
  'game:rematch': 512,
  'draw:strokes': 24 * 1024,
  'session:ping': 256,
} as const;

export function isPayloadWithinLimit(payload: unknown, maxBytes: number): boolean {
  if (payload === undefined || payload === null) return true;
  try {
    const encoded = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return Buffer.byteLength(encoded, 'utf8') <= maxBytes;
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

export const LobbyUpdateSettingsSchema = z.object({
  settings: z.object({
    rounds: z.number().int().min(1).max(20).optional(),
    roundDuration: z.number().int().min(15).max(180).optional(),
    category: z.string().trim().min(1).max(32).optional(),
    customWordsEnabled: z.boolean().optional(),
    stopButtonEnabled: z.boolean().optional(),
    categoryPreset: z.enum(['klassisch', 'party', 'bunt']).optional(),
  }),
  ...ActionMetaFields,
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
]);

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
