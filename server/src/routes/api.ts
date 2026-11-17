import { Router, Request, Response } from 'express';
import os from 'os';
import { lobbyManager, sanitizeLobbyForClient } from '../lobby/lobbyManager.js';
import {
  formatClearedSessionCookie,
  formatSessionCookie,
  parseCookieHeader,
  SESSION_COOKIE_NAME,
} from '../session/sessionManager.js';

export const apiRouter = Router();

function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string' && forwardedProto.split(',')[0].trim() === 'https') {
    return true;
  }
  return Boolean(req.secure);
}

function handleSessionEnsure(req: Request, res: Response, createIfMissing: boolean) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const rawCookieToken = cookies[SESSION_COOKIE_NAME];
  const secure = isSecureRequest(req);

  const verified = lobbyManager.sessionManager.verifySessionToken(rawCookieToken);
  if (verified.valid && verified.session) {
    const sess = verified.session;
    const activeLobby = lobbyManager.getLobbyByPlayerId(sess.playerId);
    const activePlayer = activeLobby?.players.find((p) => p.id === sess.playerId);
    const canRestoreLobby =
      Boolean(activeLobby && activePlayer) &&
      activeLobby?.status !== 'expired' &&
      activePlayer?.connectionState !== 'offline' &&
      !activePlayer?.eliminated;

    // Sliding Cookie-Expiration erneuern, ohne Token im JSON zu exponieren
    if (rawCookieToken) {
      res.setHeader(
        'Set-Cookie',
        formatSessionCookie(rawCookieToken, {
          maxAgeSeconds: lobbyManager.sessionManager.getTtlSeconds(),
          secure,
        })
      );
    }

    return res.json({
      authenticated: true,
      sessionId: sess.sessionId,
      playerId: sess.playerId,
      expiresAt: sess.expiresAt,
      activeLobby:
        canRestoreLobby && activeLobby ? sanitizeLobbyForClient(activeLobby) : null,
    });
  }

  if (!createIfMissing) {
    if (verified.reason === 'expired' || verified.reason === 'revoked') {
      res.setHeader('Set-Cookie', formatClearedSessionCookie(secure));
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
    })
  );

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
  const cookies = parseCookieHeader(req.headers.cookie);
  const rawCookieToken = cookies[SESSION_COOKIE_NAME];
  const verified = lobbyManager.sessionManager.verifySessionToken(rawCookieToken);
  if (verified.valid && verified.session) {
    lobbyManager.sessionManager.revokeSession(verified.session.sessionId, 'logout');
  }
  res.setHeader('Set-Cookie', formatClearedSessionCookie(isSecureRequest(req)));
  res.json({ ok: true });
});

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'ProjektBox Server',
  });
});

apiRouter.get('/server-info', (req: Request, res: Response) => {
  // Lokale Netzwerk-IPs ermitteln (z. B. 192.168.x.x für WLAN-Tests)
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
    timestamp: Date.now(),
  });
});
