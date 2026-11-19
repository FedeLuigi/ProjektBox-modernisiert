# ProjektBox Backend (`@projektbox/server`)

Autoritativer Echtzeit-Multiplayer-Server auf Basis von **Node.js**, **Express**, **Socket.io**, **Zod** (`@projektbox/shared`) und **Prisma (Neon PostgreSQL)**.

---

## Architektur & Ordnerstruktur

```text
server/
├── prisma/
│   ├── schema.prisma                   # PostgreSQL-Datenmodell (Player, PlayerStats, Session, Lobby, LobbyParticipant, GameResult)
│   └── migrations/                     # Überprüfbare SQL-Migrationen (mit DIRECT_URL anwenden)
├── src/
│   ├── api/
│   │   └── apiRouter.ts                # REST API (/api/session, /api/games, /api/players, /api/leaderboard, /api/health, /api/server-info)
│   ├── auth/
│   │   └── sessionManager.ts           # SHA-256 gehashte Session- & rotierende Reconnect-Tokens, SameSite=None/Lax + Bearer
│   ├── database/
│   │   ├── prismaClient.ts             # Zentraler Prisma-Singleton (DATABASE_URL Pooler, Retry bei Neon Cold-Start, Error-Sanitizing)
│   │   ├── persistenceStore.ts         # PersistenceStore-Abstraktion & HybridPersistenceStore (Neon PostgreSQL + Redis/JSON Fallback)
│   │   ├── playerRepository.ts         # Dauerhafte Spielerprofile, Statistiken & Leaderboards
│   │   └── persistenceAndAuth.test.ts  # Tests für Persistenz, Cross-Origin-Auth, Scheduler & TV↔Smartphone E2E
│   ├── games/
│   │   ├── registry.ts                 # Zentrale Spiele-Registry
│   │   ├── phaseScheduler.ts           # Autoritäre Server-Timer für Spielphasen & Timeouts
│   │   └── definitions/                # Autoritative Logik: drawAndGuess.ts, stadtLandFluss.ts, roulette.ts, texasHoldem.ts
│   ├── lobby/
│   │   ├── lobbyManager.ts             # Raumverwaltung, State-Versionierung, Idempotenz, Host-Failover, TV-Modus
│   │   ├── simulationBotRunner.ts      # Bot-Steuerung für Solo- & TV-Simulationen
│   │   ├── stateStore.ts               # Bestehender Redis- & atomarer JSON-StateStore (als Fallback/Cache erhalten)
│   │   └── lobbyAndGames.test.ts       # Umfassende Unit- & Szenario-Tests (Reconnect, Host-Failover, Simulation, alle 4 Spiele)
│   ├── sockets/
│   │   └── socketHandlers.ts           # Socket.io Middleware (Cookie + Handshake-Token), Rate-Limiting & Per-Viewer-Sanitizing
│   ├── utils/
│   │   ├── rateLimiter.ts              # Token-Bucket Rate-Limiter (In-Memory oder Redis)
│   │   └── redisAdapter.ts             # Optionaler @socket.io/redis-adapter
│   └── index.ts                        # Server-Bootstrap, CORS-Allowlist & Graceful Shutdown
└── package.json
```

---

## REST-Endpunkte

| Methode & Pfad | Beschreibung |
| :--- | :--- |
| `GET /healthz` | Schneller Liveness-Check (`200 OK`) für Render.com |
| `GET /api/health` | Status, Uptime sowie Datenbank-Status (`configured` / `connected`, ohne Zugangsdaten) |
| `GET /api/server-info` | Host, LAN-IPv4-Adressen sowie konfigurierte `SMARTPHONE_ORIGIN` / `TV_ORIGIN` |
| `GET / POST /api/session` | Stellt/erneuert eine Sitzung (HttpOnly Cookie + optional `X-Session-Token` bei Cross-Origin) |
| `POST /api/session/logout` | Widerruft die aktuelle Sitzung |
| `GET /api/games` | Metadaten der verfügbaren Multiplayer-Spiele aus `@projektbox/shared` |
| `GET /api/players/:playerId` | Gespeichertes Spielerprofil inkl. `PlayerStats` aus Neon |
| `PUT /api/players/me` | Speichert Name & Avatar des authentifizierten Spielers dauerhaft |
| `GET /api/leaderboard` | Bestenlisten & aktuelle Spielergebnisse (`?gameId=...&limit=...`) |

---

## Prisma & Neon PostgreSQL Befehle

> **Wichtig:** Prüfe vor jeder Migration auf einer bestehenden Datenbank zunächst den vorhandenen Datenbestand und setze niemals produktive Daten zurück (`migrate reset` vermeiden).

```bash
# Schema validieren
npm --prefix server run prisma:validate

# Prisma Client generieren (benötigt im Build keine echte DB)
npm --prefix server run prisma:generate

# Status bestehender Migrationen gegen Neon prüfen (nutzt DIRECT_URL)
npm --prefix server run prisma:migrate:status

# Sichere produktive Migration ausrollen (nutzt DIRECT_URL)
npm --prefix server run prisma:migrate:deploy
```

---

## Tests

```bash
npm test
```

Führt alle Unit-, Persistenz-, Cross-Origin-Auth-, Scheduler-, Reconnect-, Simulations- und E2E-Tests (`lobbyAndGames.test.ts` + `persistenceAndAuth.test.ts`) ohne externe DB-Pflicht durch.
