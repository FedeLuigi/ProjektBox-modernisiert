import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { GameResultRecord, Lobby } from '../types/multiplayer.js';
import type { PersistedSessionRecord } from '../session/sessionManager.js';

export interface PersistedSnapshot {
  version: 1;
  savedAt: number;
  lobbies: Lobby[];
  sessions: PersistedSessionRecord[];
  completedResults: GameResultRecord[];
}

export interface StateStoreOptions {
  filePath?: string;
  redisUrl?: string;
  redisKey?: string;
  maxCompletedResults?: number;
  disabled?: boolean;
}

interface MinimalRedisClient {
  connect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  quit(): Promise<unknown>;
}

/**
 * Persistenter Zustandsspeicher für Meilenstein-Snapshots (Lobbys, Sessions, abgeschlossene Spielergebnisse).
 * Schreibt im Einzelinstanz-Betrieb atomar in eine JSON-Datei und nutzt optional Redis (REDIS_URL).
 * Vermeidet Schreiblast bei hochfrequenten Echtzeit-Events (z. B. Zeichenstriche).
 */
export class StatePersistenceStore {
  private readonly filePath: string | null;
  private readonly redisUrl: string | undefined;
  private readonly redisKey: string;
  private readonly maxCompletedResults: number;
  private readonly disabled: boolean;

  private writeChain: Promise<void> = Promise.resolve();
  private redisClient: MinimalRedisClient | null = null;
  private completedResults: GameResultRecord[] = [];
  private latestSnapshot: PersistedSnapshot | null = null;

  constructor(options: StateStoreOptions = {}) {
    this.disabled = options.disabled ?? false;
    this.filePath = options.filePath ?? null;
    this.redisUrl = options.redisUrl;
    this.redisKey = options.redisKey ?? 'projektbox:multiplayer_state:v1';
    this.maxCompletedResults = options.maxCompletedResults ?? 200;
  }

  public async init(): Promise<void> {
    if (this.disabled) return;
    if (this.filePath) {
      await fsPromises.mkdir(path.dirname(this.filePath), { recursive: true });
    }
    if (this.redisUrl) {
      try {
        const modName = 'redis';
        const redisMod = (await import(modName)) as {
          createClient?: (opts: { url: string }) => MinimalRedisClient;
        };
        if (typeof redisMod.createClient === 'function') {
          const client = redisMod.createClient({ url: this.redisUrl });
          await client.connect();
          this.redisClient = client;
          console.log('[StateStore] Verbunden mit Redis für gemeinsamen Zustandsspeicher.');
        }
      } catch (err) {
        console.warn(
          '[StateStore] REDIS_URL gesetzt, aber Redis-Client nicht verfügbar; verwende Dateispeicher:',
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }

  public getCompletedResults(): GameResultRecord[] {
    return [...this.completedResults];
  }

  public recordCompletedResult(result: GameResultRecord): void {
    // Duplikat-Schutz über gameId + startedAt + finishedAt
    const duplicate = this.completedResults.some(
      (r) =>
        r.gameId === result.gameId &&
        r.startedAt === result.startedAt &&
        r.finishedAt === result.finishedAt
    );
    if (duplicate) return;
    this.completedResults.push(result);
    if (this.completedResults.length > this.maxCompletedResults) {
      this.completedResults.splice(0, this.completedResults.length - this.maxCompletedResults);
    }
  }

  public async loadSnapshot(): Promise<PersistedSnapshot | null> {
    if (this.disabled) return this.latestSnapshot;

    // 1. Primär Redis prüfen, sofern aktiv
    if (this.redisClient) {
      try {
        const raw = await this.redisClient.get(this.redisKey);
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedSnapshot;
          this.completedResults = Array.isArray(parsed.completedResults)
            ? parsed.completedResults
            : [];
          this.latestSnapshot = parsed;
          return parsed;
        }
      } catch (err) {
        console.warn('[StateStore] Fehler beim Laden aus Redis:', err);
      }
    }

    // 2. Fallback: atomare JSON-Datei
    if (this.filePath && fs.existsSync(this.filePath)) {
      try {
        const raw = await fsPromises.readFile(this.filePath, 'utf-8');
        if (!raw.trim()) return null;
        const parsed = JSON.parse(raw) as PersistedSnapshot;
        this.completedResults = Array.isArray(parsed.completedResults)
          ? parsed.completedResults
          : [];
        this.latestSnapshot = parsed;
        return parsed;
      } catch (err) {
        console.warn('[StateStore] Fehler beim Lesen des Dateisnapshots:', err);
      }
    }

    return null;
  }

  public queueSave(lobbies: Lobby[], sessions: PersistedSessionRecord[]): Promise<void> {
    const snapshot: PersistedSnapshot = {
      version: 1,
      savedAt: Date.now(),
      lobbies: JSON.parse(JSON.stringify(lobbies)),
      sessions: JSON.parse(JSON.stringify(sessions)),
      completedResults: JSON.parse(JSON.stringify(this.completedResults)),
    };
    this.latestSnapshot = snapshot;

    if (this.disabled) {
      return Promise.resolve();
    }

    this.writeChain = this.writeChain
      .then(() => this.persistSnapshot(snapshot))
      .catch((err) => {
        console.error('[StateStore] Persistierungsfehler:', err);
      });

    return this.writeChain;
  }

  public async flush(): Promise<void> {
    await this.writeChain;
  }

  public async close(): Promise<void> {
    await this.flush();
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        // ignore close errors
      }
      this.redisClient = null;
    }
  }

  private async persistSnapshot(snapshot: PersistedSnapshot): Promise<void> {
    const serialized = JSON.stringify(snapshot);

    if (this.redisClient) {
      await this.redisClient.set(this.redisKey, serialized);
    }

    if (this.filePath) {
      const dir = path.dirname(this.filePath);
      await fsPromises.mkdir(dir, { recursive: true });
      const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      await fsPromises.writeFile(tmpPath, serialized, 'utf-8');
      await fsPromises.rename(tmpPath, this.filePath);
    }
  }
}
