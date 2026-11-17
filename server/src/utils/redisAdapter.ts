import type { Server as SocketIOServer } from 'socket.io';

export interface RedisAdapterStatus {
  enabled: boolean;
  reason: string;
}

/**
 * Konfiguriert optional den Redis Pub/Sub Adapter für Socket.io bei mehreren Backend-Instanzen.
 * Hinweis für Render / Multi-Instance-Betrieb mit HTTP Long-Polling Fallback:
 * In Load-Balancer-Umgebungen müssen Sticky Sessions (z. B. Cookie-/IP-Affinität) aktiv sein,
 * wenn Clients Polling vor dem WebSocket-Upgrade nutzen.
 * Im Einzelinstanz-Betrieb bleibt Socket.io ohne Zusatzabhängigkeiten im Standardmodus.
 */
export async function configureOptionalRedisAdapter(
  io: SocketIOServer,
  redisUrl = process.env.REDIS_URL
): Promise<RedisAdapterStatus> {
  if (!redisUrl) {
    return {
      enabled: false,
      reason: 'single-instance (REDIS_URL nicht gesetzt)',
    };
  }

  try {
    const redisModName = 'redis';
    const adapterModName = '@socket.io/redis-adapter';

    const [redisMod, adapterMod] = await Promise.all([
      import(redisModName) as Promise<{
        createClient?: (opts: { url: string }) => {
          connect(): Promise<void>;
          duplicate(): { connect(): Promise<void> };
        };
      }>,
      import(adapterModName) as Promise<{
        createAdapter?: (pubClient: unknown, subClient: unknown) => unknown;
      }>,
    ]);

    if (typeof redisMod.createClient !== 'function' || typeof adapterMod.createAdapter !== 'function') {
      return {
        enabled: false,
        reason: 'Redis-Adapter-Exports unvollständig',
      };
    }

    const pubClient = redisMod.createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(adapterMod.createAdapter(pubClient, subClient) as Parameters<typeof io.adapter>[0]);
    return {
      enabled: true,
      reason: 'Redis-Adapter aktiv für Multi-Instance Socket.io',
    };
  } catch (err) {
    return {
      enabled: false,
      reason: `Redis-Adapter Fallback auf Einzelinstanz (${
        err instanceof Error ? err.message : String(err)
      })`,
    };
  }
}
