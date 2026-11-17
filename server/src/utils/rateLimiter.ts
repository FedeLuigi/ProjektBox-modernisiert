import net from 'net';
import tls from 'tls';

export interface RateLimitRule {
  /** Maximale Burst-Größe (Bucket-Kapazität) */
  capacity: number;
  /** Nachfüllrate in Tokens pro Sekunde */
  refillRatePerSec: number;
}

export type RateLimitedEvent =
  | 'lobby:list'
  | 'lobby:create'
  | 'lobby:getByCode'
  | 'lobby:join'
  | 'lobby:ready'
  | 'lobby:update-settings'
  | 'lobby:update-profile'
  | 'lobby:start'
  | 'lobby:leave'
  | 'lobby:reconnect'
  | 'game:move'
  | 'game:rematch'
  | 'draw:strokes'
  | 'draw:clear'
  | 'draw:undo'
  | 'session:ping'
  | 'default';

export const EVENT_RATE_LIMITS: Record<RateLimitedEvent, RateLimitRule> = {
  'lobby:list': { capacity: 6, refillRatePerSec: 2 },
  'lobby:create': { capacity: 3, refillRatePerSec: 0.25 },
  'lobby:getByCode': { capacity: 6, refillRatePerSec: 2 },
  'lobby:join': { capacity: 5, refillRatePerSec: 1 },
  'lobby:ready': { capacity: 6, refillRatePerSec: 2 },
  'lobby:update-settings': { capacity: 8, refillRatePerSec: 3 },
  'lobby:update-profile': { capacity: 4, refillRatePerSec: 0.5 },
  'lobby:start': { capacity: 3, refillRatePerSec: 0.5 },
  'lobby:leave': { capacity: 4, refillRatePerSec: 1 },
  'lobby:reconnect': { capacity: 5, refillRatePerSec: 1 },
  'game:move': { capacity: 12, refillRatePerSec: 8 },
  'game:rematch': { capacity: 4, refillRatePerSec: 1 },
  'draw:strokes': { capacity: 45, refillRatePerSec: 30 },
  'draw:clear': { capacity: 4, refillRatePerSec: 1 },
  'draw:undo': { capacity: 10, refillRatePerSec: 4 },
  'session:ping': { capacity: 10, refillRatePerSec: 2 },
  default: { capacity: 12, refillRatePerSec: 8 },
};

export function getRateLimitRule(event: string): RateLimitRule {
  return EVENT_RATE_LIMITS[event as RateLimitedEvent] ?? EVENT_RATE_LIMITS.default;
}

export interface RateLimitStore {
  consume(key: string, rule: RateLimitRule, cost?: number, nowMs?: number): Promise<boolean>;
  cleanupPrefix(prefix: string): Promise<void>;
}

interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

/**
 * Echter In-Memory Token-Bucket (O(1) Zeit & Speicher pro Socket+Event).
 */
export class InMemoryTokenBucketStore implements RateLimitStore {
  private buckets = new Map<string, BucketState>();

  public consumeSync(key: string, rule: RateLimitRule, cost = 1, nowMs = Date.now()): boolean {
    const existing = this.buckets.get(key);
    let tokens = rule.capacity;
    let lastRefillMs = nowMs;

    if (existing) {
      const elapsedSec = Math.max(0, (nowMs - existing.lastRefillMs) / 1000);
      tokens = Math.min(rule.capacity, existing.tokens + elapsedSec * rule.refillRatePerSec);
      lastRefillMs = nowMs;
    }

    if (tokens < cost) {
      this.buckets.set(key, { tokens, lastRefillMs });
      return false;
    }

    this.buckets.set(key, { tokens: tokens - cost, lastRefillMs });
    return true;
  }

  public async consume(key: string, rule: RateLimitRule, cost = 1, nowMs = Date.now()): Promise<boolean> {
    return this.consumeSync(key, rule, cost, nowMs);
  }

  public cleanupPrefixSync(prefix: string): void {
    for (const k of this.buckets.keys()) {
      if (k.startsWith(prefix)) {
        this.buckets.delete(k);
      }
    }
  }

  public async cleanupPrefix(prefix: string): Promise<void> {
    this.cleanupPrefixSync(prefix);
  }
}

const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])
local now_ms = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local ttl_ms = tonumber(ARGV[5])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])

if not tokens or not ts then
  tokens = capacity
  ts = now_ms
else
  local elapsed = math.max(0, (now_ms - ts) / 1000.0)
  tokens = math.min(capacity, tokens + elapsed * refill)
  ts = now_ms
end

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HSET', key, 'tokens', tokens, 'ts', ts)
redis.call('PEXPIRE', key, ttl_ms)
return allowed
`;

/**
 * Atomarer Redis-Token-Bucket über Lua-Script (für Multi-Instanz-Deployments via REDIS_URL).
 * Fällt bei Verbindungsfehlern automatisch auf den lokalen InMemoryTokenBucketStore zurück.
 */
export class RedisTokenBucketStore implements RateLimitStore {
  private fallback = new InMemoryTokenBucketStore();
  private host: string;
  private port: number;
  private password?: string;
  private useTls: boolean;

  constructor(redisUrl: string) {
    const parsed = new URL(redisUrl);
    this.host = parsed.hostname || '127.0.0.1';
    this.port = Number(parsed.port) || 6379;
    this.password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
    this.useTls = parsed.protocol === 'rediss:';
  }

  private encodeCommand(args: (string | number)[]): string {
    let out = `*${args.length}\r\n`;
    for (const arg of args) {
      const s = String(arg);
      out += `$${Buffer.byteLength(s)}\r\n${s}\r\n`;
    }
    return out;
  }

  private execRedis(args: (string | number)[]): Promise<number | string | null> {
    return new Promise((resolve, reject) => {
      const socket = this.useTls
        ? tls.connect({ host: this.host, port: this.port })
        : net.createConnection({ host: this.host, port: this.port });

      socket.setTimeout(1500);
      let buffer = '';
      let sentMain = false;

      const sendMain = () => {
        if (sentMain) return;
        sentMain = true;
        socket.write(this.encodeCommand(args));
      };

      socket.on('connect', () => {
        if (this.password) {
          socket.write(this.encodeCommand(['AUTH', this.password]));
        } else {
          sendMain();
        }
      });

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        if (!sentMain) {
          if (buffer.includes('\r\n')) {
            const firstLine = buffer.split('\r\n')[0];
            if (firstLine.startsWith('-')) {
              socket.destroy();
              reject(new Error(firstLine.slice(1)));
              return;
            }
            buffer = buffer.slice(buffer.indexOf('\r\n') + 2);
            sendMain();
          }
          return;
        }

        if (!buffer.includes('\r\n')) return;
        const line = buffer.split('\r\n')[0];
        socket.end();
        if (line.startsWith(':')) {
          resolve(Number(line.slice(1)));
        } else if (line.startsWith('-')) {
          reject(new Error(line.slice(1)));
        } else {
          resolve(line.slice(1));
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Redis timeout'));
      });
      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
    });
  }

  public async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
    nowMs = Date.now()
  ): Promise<boolean> {
    try {
      const ttlMs = Math.max(5000, Math.ceil((rule.capacity / rule.refillRatePerSec) * 2000));
      const res = await this.execRedis([
        'EVAL',
        TOKEN_BUCKET_LUA,
        1,
        `pb:rl:${key}`,
        rule.capacity,
        rule.refillRatePerSec,
        nowMs,
        cost,
        ttlMs,
      ]);
      return Number(res) === 1;
    } catch {
      return this.fallback.consume(key, rule, cost, nowMs);
    }
  }

  public async cleanupPrefix(prefix: string): Promise<void> {
    this.fallback.cleanupPrefixSync(prefix);
  }
}

const memoryStore = new InMemoryTokenBucketStore();
const activeStore: RateLimitStore = process.env.REDIS_URL
  ? new RedisTokenBucketStore(process.env.REDIS_URL)
  : memoryStore;

if (process.env.REDIS_URL) {
  console.log('🛡️  Rate-Limiter nutzt gemeinsamen Redis Token-Bucket Speicher');
}

export function checkRateLimit(
  socketId: string,
  event: RateLimitedEvent | string = 'default',
  nowMs = Date.now()
): boolean {
  const rule = getRateLimitRule(event);
  return memoryStore.consumeSync(`${socketId}:${event}`, rule, 1, nowMs);
}

export async function consumeRateLimit(
  socketId: string,
  event: RateLimitedEvent | string = 'default',
  nowMs = Date.now()
): Promise<boolean> {
  const rule = getRateLimitRule(event);
  return activeStore.consume(`${socketId}:${event}`, rule, 1, nowMs);
}

export function cleanupSocketRateLimit(socketId: string): void {
  memoryStore.cleanupPrefixSync(`${socketId}:`);
  void activeStore.cleanupPrefix(`${socketId}:`);
}
