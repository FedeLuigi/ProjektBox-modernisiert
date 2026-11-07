import { Router, Request, Response } from 'express';

export const apiRouter = Router();

// Beispielhafter Health-Check Endpunkt
// Zeigt Anfängern, wie klassische REST-Endpoints neben WebSockets existieren können
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'ProjektBox Modernisiert Backend',
  });
});

// Beispielhafter Info-Endpunkt
apiRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'Fullstack Starter Boilerplate',
    version: '1.0.0',
    techStack: [
      'Node.js',
      'Express',
      'Socket.io',
      'TypeScript',
      'React',
      'Vite',
      'Tailwind CSS',
      'Lucide Icons'
    ],
    features: [
      'Echtzeit-Chat',
      'Gemeinsamer Live-Zähler',
      'Latenzmessung (Ping/Pong)',
      'Aktive Benutzerzähler'
    ]
  });
});
