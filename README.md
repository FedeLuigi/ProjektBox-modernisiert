# ProjektBox – TV, Smartphone & Backend Monorepo

**ProjektBox** ist eine modulare Echtzeit-Multiplayer-Spieleplattform im Crystal-Design. Die Codebasis ist als **npm-Workspaces-Monorepo** sauber in drei eigenständig entwickel-, build- und deploybare Anwendungen sowie gemeinsame Pakete aufgeteilt:

1. **ProjektBox TV (`apps/tv`)** – Wohnzimmer- & Beamer-App mit vollständiger **Fernbedienungssteuerung** (Pfeiltasten, OK/Enter, Zurück/Escape), sichtbaren Fokusmarkierungen, QR-Code-Einladung auf die Smartphone-App und gemeinsamer Spielbühne für alle Teilnehmer.
2. **ProjektBox Smartphone (`apps/smartphone`)** – Touch-optimierte **Mobile PWA** für Controller-, Zeichen-, Karten-, Schreib- und Drag-and-drop-Eingaben (z. B. Roulette-Chips, geheime Pocket-Karten, Kamera-QR-Scanner & Deep-Links `?join=CODE`).
3. **ProjektBox Backend (`server`)** – Autoritativer Express-, Socket.io- und **Prisma / Neon PostgreSQL**-Server mit Cross-Origin-Session-Management, Validierung, serverseitigen Phasen-Timern und Redis-/JSON-Fallback.

---

## 📁 Monorepo-Struktur

```text
ProjektBox-modernisiert/
├── apps/
│   ├── tv/                     # Eigenständige React 19 + Vite App für TV & Beamer (Port 5174)
│   └── smartphone/             # Eigenständige React 19 + Vite PWA für Smartphones (Port 5173)
├── server/                     # Autoritativer Node.js / Express / Socket.io Backend-Server (Port 5001)
│   ├── prisma/                 # schema.prisma & PostgreSQL-Migrationen (Neon)
│   └── src/
│       ├── api/                # REST-Endpunkte (/api/session, /api/games, /api/players, /api/leaderboard, /api/health)
│       ├── auth/               # SessionManager, Cross-Domain Cookies (SameSite=None) & Bearer/Token-Auth
│       ├── database/           # Zentraler PrismaClient (DATABASE_URL gepoolt), HybridPersistenceStore, Repositories
│       ├── games/              # Autoritative Spiellogik (4 Spiele) & GamePhaseScheduler
│       ├── lobby/              # LobbyManager, Bot-Simulation & StatePersistenceStore (Redis/JSON Fallback)
│       └── sockets/            # Socket.io Event-Handler & Per-Viewer-Sanitizing
├── packages/
│   ├── shared/                 # @projektbox/shared: Typen, Events, Zod-Schemas, Spielregeln & Katalog
│   └── ui/                     # @projektbox/ui: Crystal-UI Komponenten, Avatar-System, Socket-Client & Game Boards
├── docs/
│   └── NEON_AND_RENDER_GUIDE.md # Neon-Datenbank, Backup/Recovery & Render-Deployment-Anleitung
├── render.yaml                 # Render Blueprint für Backend + TV Static Site + Smartphone Static Site
└── package.json                # Root npm Workspaces & Build/Dev/Test-Skripte
```

---

## 🎯 Enthaltene Multiplayer-Spiele

| Spiel | ID | Spieler | Kurzbeschreibung |
| :--- | :--- | :--- | :--- |
| **Zeichnen & Raten** | `draw-and-guess` | 2–8 | Live-Canvas-Zeichnen auf dem Smartphone, gemeinsame Leinwand am TV, Raten & Punkte nach Geschwindigkeit. |
| **Stadt, Land, Fluss** | `stadt-land-fluss` | 2–8 | Gleichzeitiges Ausfüllen am Smartphone, Stopp-Knopf, gemeinsames Aufdecken & Veto-Abstimmung am TV/Handy (20/10/5/0 Pkt). |
| **Casino Roulette** | `roulette` | 1–8 | Paralleles Multiplayer-Setzen am gemeinsamen Tisch, Spieler-eigene Chipfarben, Drag-and-drop (Setzen/Verschieben/Zurückziehen) & Live-Synchronisation. |
| **Poker Texas Hold'em** | `texas-holdem` | 2–8 | No-Limit Texas Hold'em mit geheimen Pocket-Karten am Handy, Gemeinschaftskarten am TV, Side-Pots & automatischem Showdown. |

---

## ⚡ Lokale Entwicklung

### Voraussetzungen
- **Node.js** 20+ (empfohlen 22+)
- **npm** 10+

### 1. Abhängigkeiten installieren
```bash
npm run install:all
```

### 2. Umgebungsvariablen einrichten (optional / empfohlen)
- Backend: [`server/.env.example`](server/.env.example) → nach `server/.env` kopieren (niemals echte Zugangsdaten committen!).
- TV: [`apps/tv/.env.example`](apps/tv/.env.example) → nach `apps/tv/.env` kopieren (`VITE_SMARTPHONE_URL`, `VITE_API_URL`, `VITE_SOCKET_URL`).
- Smartphone: [`apps/smartphone/.env.example`](apps/smartphone/.env.example) → nach `apps/smartphone/.env` kopieren (`VITE_API_URL`, `VITE_SOCKET_URL`).

### 3. Alle drei Anwendungen gleichzeitig starten
```bash
npm run dev
```
Danach laufen lokal:
- **ProjektBox Backend:** `http://localhost:5001` (`/healthz`, `/api/health`)
- **ProjektBox Smartphone:** `http://localhost:5173`
- **ProjektBox TV:** `http://localhost:5174` (QR-Codes verweisen lokal automatisch auf `:5173/?join=CODE` bzw. über die LAN-IP)

---

## 🛠 Nützliche Befehle

| Befehl | Beschreibung |
| :--- | :--- |
| `npm run dev` | Baut `@projektbox/shared` und startet Server (`:5001`), Smartphone (`:5173`) & TV (`:5174`) parallel |
| `npm run build` | Baut `@projektbox/shared`, `apps/tv`, `apps/smartphone` und `server` |
| `npm run build:tv` | Baut ausschließlich `@projektbox/shared` + ProjektBox TV |
| `npm run build:smartphone` | Baut ausschließlich `@projektbox/shared` + ProjektBox Smartphone |
| `npm run build:server` | Baut `@projektbox/shared` + Prisma Generate + TypeScript-Server |
| `npm run lint` | Prüft `apps/tv` und `apps/smartphone` mit `oxlint` |
| `npm test` | Führt alle automatisierten Backend- & E2E-Tests aus (`tsx --test`) |

---

## 🗄️ Datenbank (Neon PostgreSQL) & ☁️ Render Deployment

Alle Details zur **bestehenden Neon-Datenbank (`DATABASE_URL` / `DIRECT_URL`)**, zu sicheren Prisma-Migrationen, **Backup & Wiederherstellung im Neon Free Tier** sowie zur Einrichtung der **3 getrennten Render-Services** (`projektbox-backend`, `projektbox-tv`, `projektbox-smartphone`) inklusive Cross-Domain-Cookies (`SameSite=None; Secure` + Bearer-Fallback) stehen in:

👉 **[docs/NEON_AND_RENDER_GUIDE.md](docs/NEON_AND_RENDER_GUIDE.md)**
