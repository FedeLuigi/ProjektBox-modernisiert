import { Router, Request, Response } from 'express';

export const apiRouter = Router();

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'ProjektBox Server',
  });
});
