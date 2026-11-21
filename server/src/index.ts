import express from 'express';
import cors, { type CorsOptions } from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import { apiRouter } from './api/apiRouter.js';
import {
  dashboardRouter,
  handleDashboardPage,
  setDashboardSocketIO,
} from './routes/dashboard.js';
import { registerSocketHandlers } from './sockets/socketHandlers.js';
import { lobbyManager } from './lobby/lobbyManager.js';
import { closeDatabaseClient } from './database/prismaClient.js';
import { configureOptionalRedisAdapter } from './utils/redisAdapter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5001;
const SSL_KEY = process.env.SSL_KEY_PATH;
const SSL_CERT = process.env.SSL_CERT_PATH;

function parseConfiguredCorsOrigins(): string[] {
  const candidates = [
    process.env.CORS_ORIGINS || '',
    process.env.TV_ORIGIN || '',
    process.env.SMARTPHONE_ORIGIN || '',
    process.env.CLIENT_ORIGIN || '',
  ]
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return Array.from(new Set(candidates));
}

const allowedOrigins = parseConfiguredCorsOrigins();

function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const cleanOrigin = origin.trim().replace(/\/+$/, '');
  if (allowedOrigins.length === 0) {
    // Keine explizite Produktionsliste gesetzt -> Entwicklungs-/LAN-Modus erlauben
    return true;
  }
  if (allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin)) {
    return true;
  }
  // Lokalhost/LAN-Tests automatisch zulassen solange nicht deaktiviert
  if (
    process.env.STRICT_CORS !== 'true' &&
    /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/i.test(
      cleanOrigin
    )
  ) {
    return true;
  }
  return false;
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (isCorsOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blockiert Herkunft: ${origin}`));
  },
  credentials: true,
  exposedHeaders: ['X-Session-Token'],
};

const app = express();

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: '128kb' }));

// Healthcheck für Cloud Provider (z. B. Render.com)
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// REST API Routen
app.use('/api', apiRouter);

// Backend Server Dashboard (direkt unter / und /dashboard)
app.use('/dashboard', dashboardRouter);
app.get('/admin', (_req, res) => res.redirect('/dashboard'));
app.get('/', handleDashboardPage);

// Optionales Fallback-Hosting (nur falls lokal zusammengebaut, in Produktion getrennte Render Static Sites)
const possibleClientPaths = [
  path.resolve(__dirname, '../../apps/smartphone/dist'),
  path.resolve(__dirname, '../../apps/tv/dist'),
];

const clientDistPath = possibleClientPaths.find((p) => fs.existsSync(p));

if (clientDistPath && process.env.DISABLE_STATIC_FRONTEND !== 'true') {
  console.log(`📦 Statisches Frontend Fallback gefunden unter: ${clientDistPath}`);
  app.use(
    express.static(clientDistPath, {
      setHeaders: (res, filePath) => {
        const baseName = path.basename(filePath);
        if (baseName === 'sw.js' || baseName === 'index.html' || baseName === 'manifest.webmanifest') {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return;
        }
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/dashboard') ||
      req.path.startsWith('/admin') ||
      req.path.startsWith('/socket.io') ||
      req.path.startsWith('/healthz')
    ) {
      return next();
    }
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(indexPath);
    }
    next();
  });
}

let server: http.Server | https.Server;

if (SSL_KEY && SSL_CERT && fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
  const options = {
    key: fs.readFileSync(SSL_KEY),
    cert: fs.readFileSync(SSL_CERT),
  };
  server = https.createServer(options, app);
  console.log('🔒 HTTPS-Modus mit SSL-Zertifikaten aktiviert');
} else {
  server = http.createServer(app);
}

const io = new SocketIOServer(server, {
  cors: {
    origin(origin, callback) {
      if (isCorsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
    exposedHeaders: ['X-Session-Token'],
  },
  maxHttpBufferSize: 96 * 1024,
  pingTimeout: 20000,
  pingInterval: 10000,
  connectTimeout: 20000,
  transports: ['websocket', 'polling'],
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
});

registerSocketHandlers(io);
setDashboardSocketIO(io);

async function bootstrap() {
  const restored = await lobbyManager.init();
  console.log(
    `[Startup] Zustand wiederhergestellt: ${restored.restoredLobbies} Lobbys, ${restored.restoredSessions} Sitzungen.`
  );

  const adapterStatus = await configureOptionalRedisAdapter(io);
  console.log(`[Socket.io] Adapter: ${adapterStatus.reason}`);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ ProjektBox Server & Socket.io läuft auf Port ${PORT} (0.0.0.0)`);
    console.log(`📊 Backend Dashboard verfügbar unter: http://localhost:${PORT}/dashboard`);
    if (allowedOrigins.length > 0) {
      console.log(`🛡️ CORS Allowlist aktiv (${allowedOrigins.length} Origins)`);
    }
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`🌐 Render.com URL: ${process.env.RENDER_EXTERNAL_URL}`);
    }
  });
}

let isShuttingDown = false;
async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Shutdown] Signal ${signal} empfangen, speichere Spielzustände...`);
  try {
    await lobbyManager.shutdown();
    await closeDatabaseClient();
  } catch (err) {
    console.error('[Shutdown] Fehler beim Speichern:', err);
  }
  io.close(() => {
    server.close(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => void handleShutdown('SIGTERM'));
process.on('SIGINT', () => void handleShutdown('SIGINT'));

void bootstrap();
