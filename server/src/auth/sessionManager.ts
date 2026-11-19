import crypto from 'node:crypto';
import { resolveSessionCookieName, SESSION_COOKIE_NAME } from '@projektbox/shared/validation';

export { resolveSessionCookieName, SESSION_COOKIE_NAME };

export interface PersistedSessionRecord {
  sessionId: string;
  tokenHash: string;
  reconnectTokenHash?: string;
  revokedReconnectTokenHashes: string[];
  playerId: string;
  lobbyId?: string;
  lobbyCode?: string;
  activeSocketId?: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  revoked: boolean;
  revokedReason?: string;
}

export interface SessionConfig {
  sessionTtlMs?: number;
  revokedRetentionMs?: number;
  maxRevokedTokenHistory?: number;
}

export interface SessionCookieOptions {
  maxAgeSeconds: number;
  secure: boolean;
  crossSite?: boolean;
  cookieName?: string;
}

export function hashSecretToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function parseCookieHeader(cookieHeader?: string | string[]): Record<string, string> {
  if (!cookieHeader) return {};
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  const result: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = part.slice(0, eqIndex).trim();
    const val = part.slice(eqIndex + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

export function extractBearerToken(authorizationHeader?: string | string[]): string | undefined {
  const raw = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  if (!raw) return undefined;
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : undefined;
}

export function formatSessionCookie(
  rawSessionToken: string,
  options: SessionCookieOptions
): string {
  const cookieName = options.cookieName || SESSION_COOKIE_NAME;
  const useCrossSite = Boolean(options.crossSite && options.secure);
  const parts = [
    `${cookieName}=${encodeURIComponent(rawSessionToken)}`,
    'Path=/',
    'HttpOnly',
    useCrossSite ? 'SameSite=None' : 'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
  ];
  if (options.secure || useCrossSite) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function formatClearedSessionCookie(
  secure: boolean,
  crossSite = false,
  cookieName = SESSION_COOKIE_NAME
): string {
  const useCrossSite = Boolean(crossSite && secure);
  const parts = [
    `${cookieName}=`,
    'Path=/',
    'HttpOnly',
    useCrossSite ? 'SameSite=None' : 'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure || useCrossSite) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export class SessionManager {
  private sessions = new Map<string, PersistedSessionRecord>();
  private tokenHashToSessionId = new Map<string, string>();
  private readonly sessionTtlMs: number;
  private readonly revokedRetentionMs: number;
  private readonly maxRevokedTokenHistory: number;

  constructor(config: SessionConfig = {}) {
    this.sessionTtlMs = config.sessionTtlMs ?? 24 * 60 * 60 * 1000;
    this.revokedRetentionMs = config.revokedRetentionMs ?? 60 * 60 * 1000;
    this.maxRevokedTokenHistory = config.maxRevokedTokenHistory ?? 12;
  }

  public getTtlSeconds(): number {
    return Math.floor(this.sessionTtlMs / 1000);
  }

  public createSession(preferredPlayerId?: string): {
    session: PersistedSessionRecord;
    rawSessionToken: string;
    rawReconnectToken: string;
  } {
    const now = Date.now();
    const sessionId = `sess_${crypto.randomUUID()}`;
    const rawSessionToken = generateSecureToken(32);
    const rawReconnectToken = generateSecureToken(24);
    const tokenHash = hashSecretToken(rawSessionToken);

    const safePlayerId =
      preferredPlayerId && /^[a-zA-Z0-9_-]{2,64}$/.test(preferredPlayerId)
        ? preferredPlayerId
        : `usr_${crypto.randomBytes(12).toString('hex')}`;

    const session: PersistedSessionRecord = {
      sessionId,
      tokenHash,
      reconnectTokenHash: hashSecretToken(rawReconnectToken),
      revokedReconnectTokenHashes: [],
      playerId: safePlayerId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + this.sessionTtlMs,
      revoked: false,
    };

    this.sessions.set(sessionId, session);
    this.tokenHashToSessionId.set(tokenHash, sessionId);

    return { session, rawSessionToken, rawReconnectToken };
  }

  public verifySessionToken(rawToken?: string | null): {
    valid: boolean;
    session?: PersistedSessionRecord;
    reason?: 'missing' | 'not_found' | 'expired' | 'revoked';
  } {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false, reason: 'missing' };
    }
    const tokenHash = hashSecretToken(rawToken);
    const sessionId = this.tokenHashToSessionId.get(tokenHash);
    if (!sessionId) {
      return { valid: false, reason: 'not_found' };
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { valid: false, reason: 'not_found' };
    }
    if (!this.timingSafeHexEqual(session.tokenHash, tokenHash)) {
      return { valid: false, reason: 'not_found' };
    }
    if (session.revoked) {
      return { valid: false, reason: 'revoked', session };
    }
    const now = Date.now();
    if (now > session.expiresAt) {
      return { valid: false, reason: 'expired', session };
    }

    session.lastSeenAt = now;
    session.expiresAt = now + this.sessionTtlMs;
    return { valid: true, session };
  }

  public getSessionById(sessionId?: string | null): PersistedSessionRecord | undefined {
    if (!sessionId) return undefined;
    const session = this.sessions.get(sessionId);
    if (!session || session.revoked || Date.now() > session.expiresAt) {
      return undefined;
    }
    return session;
  }

  public getRawRecord(sessionId: string): PersistedSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  public issueReconnectToken(sessionId: string): string | null {
    return this.rotateReconnectToken(sessionId);
  }

  public rotateReconnectToken(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.revoked || Date.now() > session.expiresAt) return null;

    if (session.reconnectTokenHash) {
      session.revokedReconnectTokenHashes.push(session.reconnectTokenHash);
      if (session.revokedReconnectTokenHashes.length > this.maxRevokedTokenHistory) {
        session.revokedReconnectTokenHashes.splice(
          0,
          session.revokedReconnectTokenHashes.length - this.maxRevokedTokenHistory
        );
      }
    }

    const nextRawToken = generateSecureToken(24);
    session.reconnectTokenHash = hashSecretToken(nextRawToken);
    session.lastSeenAt = Date.now();
    return nextRawToken;
  }

  public verifyAndRotateReconnectToken(
    sessionId: string,
    rawReconnectToken: string
  ): { valid: boolean; nextReconnectToken?: string; error?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { valid: false, error: 'Sitzung nicht gefunden' };
    }
    if (session.revoked) {
      return { valid: false, error: 'Sitzung wurde widerrufen' };
    }
    if (Date.now() > session.expiresAt) {
      return { valid: false, error: 'Sitzung ist abgelaufen' };
    }
    if (!rawReconnectToken || typeof rawReconnectToken !== 'string') {
      return { valid: false, error: 'Reconnect-Token fehlt' };
    }

    const incomingHash = hashSecretToken(rawReconnectToken);

    if (session.revokedReconnectTokenHashes.includes(incomingHash)) {
      return { valid: false, error: 'Altes Reconnect-Token kann nicht wiederverwendet werden' };
    }

    if (!session.reconnectTokenHash || !this.timingSafeHexEqual(session.reconnectTokenHash, incomingHash)) {
      return { valid: false, error: 'Ungültiges Reconnect-Token' };
    }

    const nextReconnectToken = this.rotateReconnectToken(sessionId) ?? undefined;
    return { valid: true, nextReconnectToken };
  }

  public bindSocket(sessionId: string, socketId: string): { previousSocketId?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return {};
    const previousSocketId =
      session.activeSocketId && session.activeSocketId !== socketId
        ? session.activeSocketId
        : undefined;
    session.activeSocketId = socketId;
    session.lastSeenAt = Date.now();
    return { previousSocketId };
  }

  public clearSocket(sessionId: string, socketId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.activeSocketId === socketId) {
      session.activeSocketId = undefined;
      session.lastSeenAt = Date.now();
    }
  }

  public setLobbyBinding(sessionId: string, lobbyId?: string, lobbyCode?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.lobbyId = lobbyId;
    session.lobbyCode = lobbyCode;
    session.lastSeenAt = Date.now();
  }

  public revokeSession(sessionId: string, reason = 'revoked'): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.revoked = true;
    session.revokedReason = reason;
    if (session.reconnectTokenHash) {
      session.revokedReconnectTokenHashes.push(session.reconnectTokenHash);
      session.reconnectTokenHash = undefined;
    }
    session.lobbyId = undefined;
    session.lobbyCode = undefined;
    session.activeSocketId = undefined;
  }

  public invalidateLobbyAccess(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.reconnectTokenHash) {
      session.revokedReconnectTokenHashes.push(session.reconnectTokenHash);
      session.reconnectTokenHash = undefined;
    }
    session.lobbyId = undefined;
    session.lobbyCode = undefined;
    session.activeSocketId = undefined;
  }

  public exportSessions(): PersistedSessionRecord[] {
    return Array.from(this.sessions.values()).map((s) => ({
      ...s,
      revokedReconnectTokenHashes: [...s.revokedReconnectTokenHashes],
    }));
  }

  public restoreSessions(records: PersistedSessionRecord[]): number {
    const now = Date.now();
    this.sessions.clear();
    this.tokenHashToSessionId.clear();

    let restored = 0;
    for (const record of records) {
      if (!record?.sessionId || !record.tokenHash) continue;
      const isExpired = now > record.expiresAt;
      if (isExpired) continue;
      if (record.revoked && now - record.lastSeenAt > this.revokedRetentionMs) continue;

      const copy: PersistedSessionRecord = {
        ...record,
        activeSocketId: undefined,
        revokedReconnectTokenHashes: Array.isArray(record.revokedReconnectTokenHashes)
          ? [...record.revokedReconnectTokenHashes]
          : [],
      };
      this.sessions.set(copy.sessionId, copy);
      this.tokenHashToSessionId.set(copy.tokenHash, copy.sessionId);
      restored++;
    }
    return restored;
  }

  public cleanupExpiredSessions(): number {
    const now = Date.now();
    let removed = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      const expired = now > session.expiresAt;
      const staleRevoked =
        session.revoked && now - session.lastSeenAt > this.revokedRetentionMs;
      if (expired || staleRevoked) {
        this.sessions.delete(sessionId);
        this.tokenHashToSessionId.delete(session.tokenHash);
        removed++;
      }
    }
    return removed;
  }

  private timingSafeHexEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
    } catch {
      return false;
    }
  }
}
