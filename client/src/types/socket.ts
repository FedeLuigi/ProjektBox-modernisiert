// Typdefinitionen für Socket.IO Events auf dem Client

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface UserNotification {
  text: string;
  type: 'join' | 'leave' | 'info';
}

export interface ServerToClientEvents {
  userCount: (count: number) => void;
  receiveMessage: (message: ChatMessage) => void;
  counterUpdated: (count: number) => void;
  pong: (clientTimestamp: number) => void;
  userNotification: (notification: UserNotification) => void;
}

export interface ClientToServerEvents {
  sendMessage: (data: { user: string; text: string }) => void;
  incrementCounter: () => void;
  decrementCounter: () => void;
  ping: (clientTimestamp: number) => void;
}
