// Einfacher Token-Bucket / Timestamp Rate Limiter für Sockets
const socketActionMap = new Map<string, number[]>();

const WINDOW_MS = 1000;
const MAX_ACTIONS_PER_WINDOW = 12;

export function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const timestamps = socketActionMap.get(socketId) || [];
  
  // Entferne alte Timestamps außerhalb des Zeitfensters
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);
  
  if (recent.length >= MAX_ACTIONS_PER_WINDOW) {
    return false; // Rate limit überschritten
  }

  recent.push(now);
  socketActionMap.set(socketId, recent);
  return true;
}

export function cleanupSocketRateLimit(socketId: string): void {
  socketActionMap.delete(socketId);
}
