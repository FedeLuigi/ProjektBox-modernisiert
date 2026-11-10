import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { apiRouter } from './routes/api.js';
import { registerSocketHandlers } from './lobby/socketHandlers.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5001;
const SSL_KEY = process.env.SSL_KEY_PATH;
const SSL_CERT = process.env.SSL_CERT_PATH;

const app = express();

app.use(cors());
app.use(express.json());

// Healthcheck für Cloud Provider (z. B. Render.com)
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// REST API Routen
app.use('/api', apiRouter);

// Statische Bereitstellung des Frontends (PWA) mit robustem Pfad-Fallback
const possibleClientPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist'),
];

const clientDistPath = possibleClientPaths.find((p) => fs.existsSync(p)) || possibleClientPaths[0];

if (fs.existsSync(clientDistPath)) {
  console.log(`📦 Statisches Frontend gefunden unter: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/socket.io') ||
      req.path.startsWith('/healthz')
    ) {
      return next();
    }
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
} else {
  console.warn(`⚠️ client/dist nicht gefunden! Pfade geprüft:`, possibleClientPaths);
  app.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'ProjektBox Server aktiv (Frontend-Build client/dist noch nicht erstellt).',
    });
  });
}

// HTTP / HTTPS Server erstellen
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

// Socket.io Server initialisieren (CORS für beliebige Domains/Render aktiv)
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
});

// Multiplayer Socket-Events registrieren
registerSocketHandlers(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ ProjektBox Server & Socket.io läuft auf Port ${PORT} (0.0.0.0)`);
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`🌐 Render.com URL: ${process.env.RENDER_EXTERNAL_URL}`);
  }
});
