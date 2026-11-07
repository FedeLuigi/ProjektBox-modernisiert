import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './types/socket';

// Die Server-URL:
// - Im Entwicklungsmodus standardmäßig http://localhost:5000
// - Im Produktivmodus (z. B. auf Render): die eigene Domain (window.location.origin),
//   oder eine über VITE_BACKEND_URL angegebene externe Backend-Adresse
const SERVER_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

// Erstellen des typsicheren Socket-Clients
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
