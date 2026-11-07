import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/socket.js';

// Lädt Umgebungsvariablen aus der .env Datei
dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 1. Express App initialisieren
const app = express();

// 2. HTTP Server erstellen (Socket.io benötigt den nativen Node HTTP Server)
const server = http.createServer(app);

// 3. Socket.io Server mit Typen und CORS aufsetzen
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 4. Express Middlewares konfigurieren
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// 5. REST Routen einbinden
app.use('/api', apiRouter);

// Fallback Wurzelroute
app.get('/', (_req, res) => {
  res.send({
    message: '🚀 Socket.io & Express Backend läuft einwandfrei!',
    documentation: '/api/info',
    health: '/api/health',
  });
});

// 6. Socket Handlers registrieren
registerSocketHandlers(io);

// 7. Server starten
server.listen(PORT, () => {
  console.log(`
  ======================================================
  ⚡ Server läuft erfolgreich auf Port: ${PORT}
  📡 REST API:   http://localhost:${PORT}/api/health
  🔌 Socket.io:  ws://localhost:${PORT}
  🎯 Frontend:   ${CLIENT_ORIGIN}
  ======================================================
  `);
});
