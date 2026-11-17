import { z } from 'zod';

export const EVENT_MAX_PAYLOAD_BYTES = {
  'lobby:list': 1024,
  'lobby:getByCode': 1024,
  'lobby:create': 64 * 1024,
  'lobby:join': 64 * 1024,
  'lobby:update-profile': 64 * 1024,
  'lobby:update-settings': 2048,
  'lobby:reconnect': 1024,
  'game:move': 4096,
  'draw:strokes': 24 * 1024,
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

export const LobbyUpdateSettingsSchema = z.object({
  settings: z.object({
    rounds: z.number().int().min(1).max(20).optional(),
    roundDuration: z.number().int().min(15).max(180).optional(),
    hints: z.boolean().optional(),
    category: z.string().trim().min(1).max(32).optional(),
  }),
});

export const LobbyUpdateProfileSchema = z.object({
  userProfile: UserProfileSchema,
});

export const LobbyReconnectSchema = z.object({
  userId: z.string().trim().min(1).max(80),
});

export const GameMoveSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('guess'),
    text: z.string().trim().min(1).max(64),
  }),
  z.object({ type: z.literal('undo') }),
  z.object({ type: z.literal('clear') }),
  z.object({ type: z.literal('time_up') }),
  z.object({ type: z.literal('next_round') }),
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
