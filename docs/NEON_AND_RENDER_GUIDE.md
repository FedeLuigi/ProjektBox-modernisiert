# ProjektBox – Neon PostgreSQL, Datensicherung & Render-Deployment

Dieses Dokument beschreibt die Architektur, sichere Datenbank-Migration, Datensicherung im **Neon Free Tier** sowie das getrennte Deployment der drei Render-Services.

---

## 1. Was wurde umgebaut?

1. **Monorepo (`npm workspaces`):**
   - `apps/tv`: Eigenständige React-App für Smart-TVs & Beamer mit Fernbedienungssteuerung (Pfeiltasten, OK/Enter, Zurück/Escape) und QR-Code zur Smartphone-App.
   - `apps/smartphone`: Eigenständige Mobile-PWA mit Touch-Bedienung, Kamera-QR-Scanner (`jsqr`), individuellem Spieler-Controller (inkl. Roulette Drag-and-drop & geheimer Poker-Karten).
   - `packages/shared`: Gemeinsame TypeScript-Typen, `SOCKET_EVENTS`, Zod-Validierungsschemas (`TextEncoder`-kompatibel für Browser & Server), Roulette-/Poker-/SLF-Regelhelfer sowie zentraler Spiele-Katalog.
   - `packages/ui`: Gemeinsames Crystal-Design-System, Avatar-Engine, Game-Boards und Cross-Domain-Socket-Client (`@projektbox/ui`).
   - `server`: Modulare Struktur (`api/`, `auth/`, `database/`, `games/`, `lobby/`, `sockets/`), **Neon PostgreSQL (Prisma)** über `HybridPersistenceStore` (bei Beibehaltung von Redis/JSON als Fallback/Cache), serverseitiger `GamePhaseScheduler`, Cross-Domain-CORS & Token-/Cookie-Authentifizierung.

---

## 2. Neon PostgreSQL – Verbindung & Datenmodell

### Schema-Isolation (`projektbox`)
Alle Prisma-Modelle von ProjektBox liegen isoliert im PostgreSQL-Schema **`projektbox`** (`schemas = ["projektbox"]` in `server/prisma/schema.prisma`). Bestehende Schemas und Tabellen in derselben Neon-Datenbank (z. B. `wohnbau` oder `public.housing_organizations` und `neon_auth`) bleiben dadurch vollständig unberührt, ohne dass `DATABASE_URL` oder `DIRECT_URL` geändert werden müssen.

### Trennung zwischen `DATABASE_URL` und `DIRECT_URL`
- **`DATABASE_URL` (Pooled Connection `-pooler`):** Wird ausschließlich zur Laufzeit vom zentralen `PrismaClient`-Singleton (`server/src/database/prismaClient.ts`) genutzt. Verhindert Connection-Erschöpfung auf Serverless-/Free-Tier-Instanzen.
- **`DIRECT_URL` (Direct Connection):** Wird von Prisma CLI für `prisma migrate status`, `prisma migrate deploy` sowie für direkte `pg_dump` Backups genutzt (PgBouncer im Transaction-Mode unterstützt keine Schema-Locks von Migrationen).

> **Sicherheitsregeln:** Niemals Zugangsdaten hart codieren, niemals Connection Strings loggen (`sanitizeDatabaseError` filtert URLs und Passwörter) und niemals `.env`-Dateien ins GitHub-Repository committen.

### Gespeicherte Daten vs. Live-Daten
1. **Dauerhaft in Neon PostgreSQL:**
   - `Player`: Spieler-ID, Anzeigename, Avatar-Konfiguration (`Json`), `lastSeenAt`.
   - `PlayerStats`: Gespielte Runden, Siege, Unentschieden, Gesamtpunkte & Bestwert pro `gameId`.
   - `GameResult`: Unveränderlicher Ergebnisdatensatz (`lobbyCode`, `gameId`, `winnerId`, `scores`, `playersJson`) – wird transaktional (`prisma.$transaction`) zusammen mit `PlayerStats` beim Spielende gespeichert.
2. **Persistente Wiederherstellungs-Zustände (überleben Server-Neustarts/Spindown):**
   - `Session`: Gehashtes Session-Token, rotierendes Reconnect-Token, gebundene `lobbyId`/`lobbyCode`, Ablaufzeit.
   - `Lobby` & `LobbyParticipant`: Aktiver Raumcode, Einstellungen, `gameState`, Teilnehmer-Zustände & Reconnect-Deadlines (werden beim Start über `restoreFromStore()` geladen).
3. **Kurzlebig / nur Echtzeit-Transport:**
   - Einzelne WebSocket-IDs, hochfrequente Canvas-Einzelstriche während des Zeichnens und In-Memory Rate-Limit-Buckets.

### Warum hatte der alte StateStore `disabled: true`?
Im Konstruktor von `LobbyManager` (`server/src/lobby/lobbyManager.ts`) dient `new StatePersistenceStore({ disabled: true })` lediglich als isolierter Default für Unit-Tests (`new LobbyManager()`), damit Tests weder echte Dateien überschreiben noch Redis/Postgres berühren. Der produktive Singleton nutzt dagegen `createDefaultPersistenceStore(...)` (`HybridPersistenceStore`), das **Neon PostgreSQL** mit **Redis/JSON-Fallback** kombiniert.

---

## 3. Sichere Migration gegen die bestehende Neon-Datenbank

Führe niemals `prisma migrate reset` oder `--force-reset` auf einer bestehenden Datenbank aus!

### Empfohlener Ablauf vor und bei der Migration:
1. **Umgebungsvariablen lokal (temporär / nur in `server/.env`) hinterlegen:**
   - `DATABASE_URL` (Pooled URL aus Neon/Render, mit `?sslmode=require`)
   - `DIRECT_URL` (Direct URL aus Neon/Render, mit `?sslmode=require`)
2. **Bestehenden Datenbestand vorab prüfen:**
   ```bash
   # Aktuellen Zustand im Neon-Schema inspizieren (nur lesend!)
   cd server
   npx prisma db execute --stdin <<'SQL'
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   SQL
   ```
   Falls bereits Tabellen existieren, sichere vorab einen Dump (siehe Abschnitt 4) und prüfe `npx prisma migrate status`.
3. **Migration anwenden:**
   - Bei leerer neuer Datenbank ohne bestehende Tabellen:
     ```bash
     npm --prefix server run prisma:migrate:deploy
     ```
   - Falls in deiner Neon-DB bereits Tabellen existieren, zuerst mit `npx prisma db pull` abgleichen oder per `npx prisma migrate resolve` sauber baseline-markieren, bevor neue Migrationen ausgerollt werden.

---

## 4. Absicherung & Wiederherstellung im Neon Free Tier

Da der Neon Free Tier zeitliche/branch-basierte Limits hat (z. B. begrenzter History-/PITR-Zeitraum), solltest du vor wichtigen Updates zusätzlich eigene Backups ziehen:

### Manuelles logisches Backup vor Updates (`pg_dump`)
Verwende immer die **direkte** Verbindung (`DIRECT_URL`):
```bash
pg_dump "$DIRECT_URL" --format=custom --no-owner --no-acl -f "backup_projektbox_$(date +%Y%m%d_%H%M).dump"
```
Für lesbares SQL-Backup alternativ:
```bash
pg_dump "$DIRECT_URL" --clean --if-exists --no-owner --no-acl -f "backup_projektbox_$(date +%Y%m%d_%H%M).sql"
```

### Wiederherstellung aus einem Backup
```bash
# In eine leere Zieldatenbank oder Test-Branch einspielen:
pg_restore --no-owner --no-acl --dbname="$DIRECT_URL" backup_projektbox_YYYYMMDD_HHMM.dump
```
*(Oder bei SQL-Dump: `psql "$DIRECT_URL" -f backup_projektbox_YYYYMMDD_HHMM.sql`)*

### Hinweise zum Free Tier (Neon Auto-Suspend & Render Spindown)
- **Neon Auto-Suspend:** Nach 5 Minuten Inaktivität pausiert Neon den Compute-Node. Der Server fängt Wakeup-Latenzen durch `withDatabaseRetry(...)` im `prismaClient.ts` (automatische kurze Retries) ab.
- **Render Free-Tier Spindown:** Nach 15 Minuten Inaktivität fährt Render den Web-Service herunter. Bei Reaktivierung stellt `LobbyManager.init()` über `HybridPersistenceStore` aktive Lobbys, Sitzungen und Ergebnisse aus Neon wieder her. Beachte: Bei sehr langen Pausen (> Lobby-TTL / Reconnect-Frist) werden alte Lobbys sauber als `expired` bereinigt, während `Player`, `PlayerStats` und `GameResult` dauerhaft erhalten bleiben.

---

## 5. Render.com Deployment (3 getrennte Services)

Die Datei [`render.yaml`](../render.yaml) definiert alle 3 Services:

### Service 1: `projektbox-backend` (Web Service / Node)
- **Build Command:** `npm install --include=dev && npm run build:server`
- **Start Command:** `npm run start`
- **Healthcheck:** `/healthz`
- **Umgebungsvariablen in Render:**
  - `NODE_ENV=production`
  - `PORT=10000`
  - `CROSS_SITE_COOKIES=true`
  - `DISABLE_STATIC_FRONTEND=true`
  - `DATABASE_URL=<Neon Pooled URL>`
  - `DIRECT_URL=<Neon Direct URL>`
  - `TV_ORIGIN=https://<dein-tv-service>.onrender.com`
  - `SMARTPHONE_ORIGIN=https://<dein-smartphone-service>.onrender.com`
  - `CORS_ORIGINS=https://<dein-tv-service>.onrender.com,https://<dein-smartphone-service>.onrender.com`

### Service 2: `projektbox-tv` (Static Site)
- **Build Command:** `npm install --include=dev && npm run build:tv`
- **Publish Directory:** `apps/tv/dist`
- **SPA Rewrite:** `/* -> /index.html`
- **Umgebungsvariablen in Render:**
  - `VITE_API_URL=https://<dein-backend-service>.onrender.com`
  - `VITE_SOCKET_URL=https://<dein-backend-service>.onrender.com`
  - `VITE_SMARTPHONE_URL=https://<dein-smartphone-service>.onrender.com`

### Service 3: `projektbox-smartphone` (Static Site / PWA)
- **Build Command:** `npm install --include=dev && npm run build:smartphone`
- **Publish Directory:** `apps/smartphone/dist`
- **SPA Rewrite:** `/* -> /index.html`
- **Umgebungsvariablen in Render:**
  - `VITE_API_URL=https://<dein-backend-service>.onrender.com`
  - `VITE_SOCKET_URL=https://<dein-backend-service>.onrender.com`
  - `VITE_PUBLIC_URL=https://<dein-smartphone-service>.onrender.com`

### Cross-Domain Session-Konzept
Da TV, Smartphone und Backend auf drei verschiedenen `.onrender.com`-Subdomains laufen:
- Bei Cross-Origin-HTTPS-Anfragen setzt das Backend Cookies automatisch mit `SameSite=None; Secure`.
- Zusätzlich übermittelt das Backend bei Cross-Origin-Session-Aufrufen `X-Session-Token` (über CORS `exposedHeaders`), den die Apps ausschließlich in Memory / `sessionStorage` halten und über `Authorization: Bearer ...` sowie Socket.io `auth: { sessionToken }` mitsenden – so funktioniert die Authentifizierung auch in Browsern mit blockierten Third-Party-Cookies (z. B. Safari iOS).
