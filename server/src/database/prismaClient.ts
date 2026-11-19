import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  __projektboxPrisma?: PrismaClient;
  __projektboxDbConnected?: boolean;
};

const POSTGRES_TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

/**
 * Entfernt Credentials/Hosts aus Fehlertexten, damit niemals ein Connection String in Logs landet.
 */
export function sanitizeDatabaseError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/(password|pwd|secret|token)=([^&\s]+)/gi, '$1=[REDACTED]');
}

export function getPrismaClient(): PrismaClient | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!globalForPrisma.__projektboxPrisma) {
    globalForPrisma.__projektboxPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  return globalForPrisma.__projektboxPrisma;
}

export async function connectDatabaseClient(): Promise<boolean> {
  const client = getPrismaClient();
  if (!client) {
    globalForPrisma.__projektboxDbConnected = false;
    return false;
  }

  try {
    await withDatabaseRetry(async () => {
      await client.$queryRaw`SELECT 1`;
    });
    globalForPrisma.__projektboxDbConnected = true;
    return true;
  } catch (err) {
    globalForPrisma.__projektboxDbConnected = false;
    console.warn('[Database] Verbindung zu Neon PostgreSQL fehlgeschlagen:', sanitizeDatabaseError(err));
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return Boolean(globalForPrisma.__projektboxDbConnected);
}

export async function closeDatabaseClient(): Promise<void> {
  if (globalForPrisma.__projektboxPrisma) {
    try {
      await globalForPrisma.__projektboxPrisma.$disconnect();
    } catch (err) {
      console.warn('[Database] Fehler beim Schließen:', sanitizeDatabaseError(err));
    } finally {
      globalForPrisma.__projektboxDbConnected = false;
      globalForPrisma.__projektboxPrisma = undefined;
    }
  }
}

/**
 * Wiederholt kurzlebige Neon-Free-Tier-Wakeup/Connection-Fehler automatisch (max. 2 Retries).
 */
export async function withDatabaseRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const code = typeof err?.code === 'string' ? err.code : '';
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const isTransient =
        POSTGRES_TRANSIENT_CODES.has(code) ||
        msg.includes('connection reset') ||
        msg.includes('connection terminated') ||
        msg.includes('server closed the connection') ||
        msg.includes('timeout');

      if (!isTransient || attempt >= maxRetries) {
        throw err;
      }
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 180 * attempt));
    }
  }
  throw lastError;
}
