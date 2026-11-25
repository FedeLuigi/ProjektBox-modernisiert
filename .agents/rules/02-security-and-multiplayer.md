---
trigger: always_on
---
# 02 – Sicherheit, Serverautorität & Multiplayer

## Zero-Trust & Serverautorität
- Clientdaten sind niemals vertrauenswürdig; Schema-Validierung ersetzt keine Autorisierung.
- Identität, Lobby-Mitgliedschaft, Host-/TV-Rolle, Spielphase, Wertebereiche, Scores, Währungen, Käufe/Upgrades und Gewinner immer serverseitig prüfen und berechnen.
- Geheime Spiel- oder Spielerdaten (z. B. verdeckte Karten, geheime Wörter, Lösungen) pro Empfänger über `sanitizeLobbyForClient` und gezielte Socket-Zustellung schützen.

## Socket.IO, API & Datenbank
- Jedes Socket-Event benötigt Zod-Validierung (`@projektbox/shared`), Auth-/Session-Prüfung, Lobby-/Spiel-Kontextprüfung, Rate-Limit (`rateLimiter.ts`) und Payload-Limit.
- CORS/Origin, HttpOnly-Cookies (`SameSite`), Bearer-/Session-Tokens, Admin-Endpunkte und Reconnect-Tokens sicher konfigurieren; Secrets ausschließlich über Umgebungsvariablen beziehen und nie committen/loggen.
- Prisma-Abfragen parametrisiert halten; Migrationen auf Datenverlust, Rollback und Mehrinstanzbetrieb prüfen.

## Resilienz, Sync & Bot-KI
- Disconnects, Browser-Refreshes, Host-Wechsel, doppelte/verspätete Events und parallele Eingaben sauber behandeln; Züge möglichst idempotent über `actionId` / `stateVersion` absichern.
- Reconnects über autoritative Server-Snapshots wiederherstellen (Socket.IO-Recovery allein genügt nicht).
- Einmal-Aktionen (z. B. Nachladen, Fähigkeiten, Käufe) dürfen nicht durch nachfolgende Bewegungs-Pakete überschrieben werden.
- Netzwerksync drosseln (~10–15 Hz), im Leerlauf keine redundanten Null-Pakete senden, Bewegungen clientseitig sanft interpolieren und Bot-KI mit fairem, nachvollziehbarem Timing gestalten.
