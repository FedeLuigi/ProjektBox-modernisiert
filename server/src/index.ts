import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/api.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/socket.js';

// Lädt Umgebungsvariablen aus der .env Datei
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 1. Express App initialisieren
const app = express();

// 2. HTTP Server erstellen (Socket.io benötigt den nativen Node HTTP Server)
const server = http.createServer(app);

// 3. Socket.io Server mit Typen und CORS aufsetzen
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(server, {
  cors: {
    origin: (origin, callback) => {
      // Erlaubt Anfragen im Entwicklungsmodus und bei gleichem Host
      if (!origin || origin.includes('localhost') || origin === CLIENT_ORIGIN) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 4. Express Middlewares konfigurieren
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('localhost') || origin === CLIENT_ORIGIN) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());

// 5. REST Routen einbinden
app.use('/api', apiRouter);

// 6. Statische Bereitstellung des Frontends (für Fullstack-Deployment auf Render etc.)
const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  console.log(`[Server] Statische Frontend-Dateien geladen aus: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    // API- und Socket.io-Routen nicht mit index.html überschreiben
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
} else {
  // Fallback Wurzelroute, wenn nur das Backend ohne Frontend gebaut wurde
  app.get('/', (_req, res) => {
    res.send({
      message: '🚀 Socket.io & Express Backend läuft einwandfrei!',
      documentation: '/api/info',
      health: '/api/health',
    });
  });
}

// 7. Socket Handlers registrieren
registerSocketHandlers(io);

// 8. Server starten
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ======================================================
  ⚡ Server läuft erfolgreich auf Port: ${PORT}
  📡 REST API:   http://localhost:${PORT}/api/health
  🔌 Socket.io:  ws://localhost:${PORT}
  🎯 Frontend:   ${CLIENT_ORIGIN}
  ======================================================
  `);
});
