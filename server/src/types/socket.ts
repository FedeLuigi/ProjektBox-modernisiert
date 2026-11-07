// Typdefinitionen für Socket.IO Events
// Ermöglicht Typsicherheit und Autovervollständigung auf Client und Server

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

// Events, die der Server an den Client sendet
export interface ServerToClientEvents {
  // Aktualisiert die Anzahl aktuell verbundener Clients
  userCount: (count: number) => void;
  // Sendet eine neue Chatnachricht an Clients
  receiveMessage: (message: ChatMessage) => void;
  // Sendet den synchronisierten Zählerstand
  counterUpdated: (count: number) => void;
  // Antwort auf einen Ping zur Latenzmessung
  pong: (clientTimestamp: number) => void;
  // Benachrichtigung bei Betreten/Verlassen
  userNotification: (notification: { text: string; type: 'join' | 'leave' | 'info' }) => void;
}

// Events, die der Client an den Server sendet
export interface ClientToServerEvents {
  // Client schickt eine Chatnachricht
  sendMessage: (data: { user: string; text: string }) => void;
  // Client verändert den Zähler
  incrementCounter: () => void;
  decrementCounter: () => void;
  // Client testet die Latenz (Ping)
  ping: (clientTimestamp: number) => void;
}

// Zusätzliche Daten, die an den Socket angehängt werden können
export interface SocketData {
  username?: string;
  joinedAt?: Date;
}
