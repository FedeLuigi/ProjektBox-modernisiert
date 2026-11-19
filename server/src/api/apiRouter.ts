import { Router, type Request, type Response } from 'express';
import os from 'node:os';
import { GAMES_CATALOG_META } from '@projektbox/shared/utils';
import { UserProfileSchema } from '@projektbox/shared/validation';
import { lobbyManager, sanitizeLobbyForClient } from '../lobby/lobbyManager.js';
import {
  extractBearerToken,
  formatClearedSessionCookie,
  formatSessionCookie,
  parseCookieHeader,
  resolveSessionCookieName,
} from '../auth/sessionManager.js';
import {
  getGameLeaderboard,
  getPersistentPlayerProfile,
  upsertPersistentPlayerProfile,
} from '../database/playerRepository.js';
import { isDatabaseConfigured, isDatabaseConnected } from '../database/prismaClient.js';

export const apiRouter = Router();

function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string' && forwardedProto.split(',')[0].trim() === 'https') {
    return true;
  }
  return Boolean(req.secure);
}

function isCrossOriginRequest(req: Request): boolean {
  if (process.env.CROSS_SITE_COOKIES === 'true') {
    return true;
  }
  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (!originHeader) {
    return req.headers['x-client-transport'] === 'cross-origin';
  }
  try {
    const originHost = new URL(originHeader).host.toLowerCase();
    const requestHost = (req.get('host') || '').toLowerCase();
    return Boolean(requestHost && originHost && originHost !== requestHost);
  } catch {
    return false;
  }
}

function resolveClientRole(req: Request): string | undefined {
  const headerRole = req.headers['x-client-role'];
  if (typeof headerRole === 'string' && (headerRole === 'tv' || headerRole === 'smartphone')) {
    return headerRole;
  }
  const bodyRole = req.body?.clientRole;
  if (bodyRole === 'tv' || bodyRole === 'smartphone') {
    return bodyRole;
  }
  return undefined;
}

function extractSessionToken(req: Request, cookieName: string): string | undefined {
  const bearer = extractBearerToken(req.headers.authorization);
  if (bearer) return bearer;
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[cookieName];
}

function handleSessionEnsure(req: Request, res: Response, createIfMissing: boolean) {
  const clientRole = resolveClientRole(req);
  const cookieName = resolveSessionCookieName(clientRole);
  const rawToken = extractSessionToken(req, cookieName);
  const secure = isSecureRequest(req);
  const crossSite = isCrossOriginRequest(req);

  const verified = lobbyManager.sessionManager.verifySessionToken(rawToken);
  if (verified.valid && verified.session) {
    const sess = verified.session;
    const activeLobby = lobbyManager.getLobbyByPlayerId(sess.playerId);
    const activePlayer = activeLobby?.players.find((p) => p.id === sess.playerId);
    const canRestoreLobby =
      Boolean(activeLobby && activePlayer) &&
      activeLobby?.status !== 'expired' &&
      activePlayer?.connectionState !== 'offline' &&
      !activePlayer?.eliminated;

    if (rawToken) {
      res.setHeader(
        'Set-Cookie',
        formatSessionCookie(rawToken, {
          maxAgeSeconds: lobbyManager.sessionManager.getTtlSeconds(),
          secure,
          crossSite,
          cookieName,
        })
      );
      if (crossSite || req.headers['x-client-transport'] === 'cross-origin') {
        res.setHeader('X-Session-Token', rawToken);
      }
    }

    return res.json({
      authenticated: true,
      sessionId: sess.sessionId,
      playerId: sess.playerId,
      expiresAt: sess.expiresAt,
      activeLobby:
        canRestoreLobby && activeLobby ? sanitizeLobbyForClient(activeLobby, sess.playerId) : null,
    });
  }

  if (!createIfMissing) {
    if (verified.reason === 'expired' || verified.reason === 'revoked') {
      res.setHeader('Set-Cookie', formatClearedSessionCookie(secure, crossSite, cookieName));
    }
    return res.status(401).json({
      authenticated: false,
      reason: verified.reason || 'missing',
    });
  }

  const preferredId =
    typeof req.body?.playerId === 'string' ? req.body.playerId.trim() : undefined;
  const safePreferredId =
    preferredId && !lobbyManager.isPlayerIdClaimedByAnotherSession(preferredId)
      ? preferredId
      : undefined;

  const { session, rawSessionToken } = lobbyManager.sessionManager.createSession(safePreferredId);

  res.setHeader(
    'Set-Cookie',
    formatSessionCookie(rawSessionToken, {
      maxAgeSeconds: lobbyManager.sessionManager.getTtlSeconds(),
      secure,
      crossSite,
      cookieName,
    })
  );
  if (crossSite || req.headers['x-client-transport'] === 'cross-origin') {
    res.setHeader('X-Session-Token', rawSessionToken);
  }

  return res.json({
    authenticated: true,
    created: true,
    sessionId: session.sessionId,
    playerId: session.playerId,
    expiresAt: session.expiresAt,
    activeLobby: null,
  });
}

apiRouter.get('/session', (req: Request, res: Response) => {
  handleSessionEnsure(req, res, true);
});

apiRouter.post('/session', (req: Request, res: Response) => {
  handleSessionEnsure(req, res, true);
});

apiRouter.post('/session/logout', (req: Request, res: Response) => {
  const cookieName = resolveSessionCookieName(resolveClientRole(req));
  const rawToken = extractSessionToken(req, cookieName);
  const verified = lobbyManager.sessionManager.verifySessionToken(rawToken);
  if (verified.valid && verified.session) {
    lobbyManager.sessionManager.revokeSession(verified.session.sessionId, 'logout');
  }
  res.setHeader(
    'Set-Cookie',
    formatClearedSessionCookie(isSecureRequest(req), isCrossOriginRequest(req), cookieName)
  );
  res.json({ ok: true });
});

apiRouter.get('/games', (_req: Request, res: Response) => {
  res.json({ games: GAMES_CATALOG_META });
});

apiRouter.get('/players/:playerId', async (req: Request, res: Response) => {
  const playerId = String(req.params.playerId || '').trim();
  if (!playerId || playerId.length > 80) {
    return res.status(400).json({ error: 'Ungültige Spieler-ID.' });
  }
  const profile = await getPersistentPlayerProfile(playerId);
  if (!profile) {
    return res.status(404).json({ error: 'Spielerprofil nicht gefunden.' });
  }
  return res.json({ player: profile });
});

apiRouter.put('/players/me', async (req: Request, res: Response) => {
  const cookieName = resolveSessionCookieName(resolveClientRole(req));
  const rawToken = extractSessionToken(req, cookieName);
  const verified = lobbyManager.sessionManager.verifySessionToken(rawToken);
  if (!verified.valid || !verified.session) {
    return res.status(401).json({ error: 'Nicht authentifiziert.' });
  }

  const parsed = UserProfileSchema.safeParse({
    ...req.body,
    id: verified.session.playerId,
  });
  if (!parsed.success) {
    return res.status(400).json({ error: 'Ungültige Profildaten.' });
  }

  const saved = await upsertPersistentPlayerProfile({
    id: verified.session.playerId,
    name: parsed.data.name,
    avatar: parsed.data.avatar,
  });

  return res.json({
    ok: true,
    persistedToDatabase: saved,
    playerId: verified.session.playerId,
  });
});

apiRouter.get('/leaderboard', async (req: Request, res: Response) => {
  const gameId = typeof req.query.gameId === 'string' ? req.query.gameId.trim() : undefined;
  const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 20;
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 20;

  const entries = await getGameLeaderboard(gameId || undefined, limit);
  const recentResults = lobbyManager.stateStore
    .getCompletedResults()
    .filter((r) => !gameId || r.gameId === gameId)
    .slice(-limit)
    .reverse();

  return res.json({
    leaderboard: entries,
    recentResults,
  });
});

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'ProjektBox Server',
    database: {
      configured: isDatabaseConfigured(),
      connected: isDatabaseConnected(),
    },
  });
});

apiRouter.get('/server-info', (req: Request, res: Response) => {
  const interfaces = os.networkInterfaces();
  const localIps: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIps.push(iface.address);
      }
    }
  }

  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
  const renderUrl = process.env.RENDER_EXTERNAL_URL || null;

  res.json({
    status: 'ok',
    host: req.get('host') || null,
    proto: req.protocol || 'http',
    localIps,
    isRender,
    renderUrl,
    smartphoneUrl: process.env.SMARTPHONE_ORIGIN || process.env.SMARTPHONE_URL || null,
    tvUrl: process.env.TV_ORIGIN || process.env.TV_URL || null,
    databaseConfigured: isDatabaseConfigured(),
    databaseConnected: isDatabaseConnected(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});
