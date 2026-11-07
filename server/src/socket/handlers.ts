import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  ChatMessage,
} from '../types/socket.js';

// In-Memory Zustand für die Demo
// (In einer Produktivanwendung würde man hier eine Datenbank wie PostgreSQL oder Redis nutzen)
let globalCounter = 0;
const messageHistory: ChatMessage[] = [
  {
    id: 'welcome-msg',
    user: 'System-Bot 🤖',
    text: 'Willkommen im Echtzeit-Boilerplate! Schreibe eine Nachricht, um Socket.io in Aktion zu sehen.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>) => {
    const clientId = socket.id.slice(0, 5);
    console.log(`[Socket.io] Neuer Client verbunden: ${socket.id} (Kurz-ID: #${clientId})`);

    // 1. Allen Clients die aktuelle Anzahl verbundener Nutzer mitteilen
    io.emit('userCount', io.engine.clientsCount);

    // 2. Dem neu verbundenen Client den aktuellen Zählerstand senden
    socket.emit('counterUpdated', globalCounter);

    // 3. Vorhandene Nachrichten der Historie an den neuen Client senden
    for (const msg of messageHistory) {
      socket.emit('receiveMessage', msg);
    }

    // 4. Benachrichtigung an alle (außer dem neuen Nutzer selbst)
    socket.broadcast.emit('userNotification', {
      text: `Nutzer #${clientId} ist dem Server beigetreten.`,
      type: 'join',
    });

    // Event: Neue Chat-Nachricht
    socket.on('sendMessage', (data) => {
      const trimmedText = data.text.trim();
      const trimmedUser = data.user.trim() || `Gast #${clientId}`;

      if (!trimmedText) return;

      const newMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user: trimmedUser,
        text: trimmedText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Nachricht im Verlauf speichern (max. 50 Nachrichten)
      messageHistory.push(newMessage);
      if (messageHistory.length > 50) {
        messageHistory.shift();
      }

      // An ALLE verbundenen Clients senden (Broadcast)
      io.emit('receiveMessage', newMessage);
    });

    // Event: Live-Zähler erhöhen
    socket.on('incrementCounter', () => {
      globalCounter += 1;
      console.log(`[Zähler] Erhöht auf: ${globalCounter}`);
      io.emit('counterUpdated', globalCounter);
    });

    // Event: Live-Zähler verringern
    socket.on('decrementCounter', () => {
      globalCounter -= 1;
      console.log(`[Zähler] Verringert auf: ${globalCounter}`);
      io.emit('counterUpdated', globalCounter);
    });

    // Event: Ping/Pong für Latenzmessung
    socket.on('ping', (clientTimestamp: number) => {
      socket.emit('pong', clientTimestamp);
    });

    // Event: Verbindung getrennt
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client getrennt: ${socket.id} (Grund: ${reason})`);
      io.emit('userCount', io.engine.clientsCount);
      io.emit('userNotification', {
        text: `Nutzer #${clientId} hat den Server verlassen.`,
        type: 'leave',
      });
    });
  });
}
