import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './types/socket';

// Die Server-URL: Im Entwicklungsmodus Port 5000 oder per Umgebungsvariable konfiguriert
const SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Erstellen des typsicheren Socket-Clients
// autoConnect: true verbindet sich automatisch beim Laden der Seite
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
