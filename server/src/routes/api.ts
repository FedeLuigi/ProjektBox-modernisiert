import { Router, Request, Response } from 'express';
import os from 'os';

export const apiRouter = Router();

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
