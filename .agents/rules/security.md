---
trigger: always_on
---
# Sicherheit
- Clientdaten sind nicht vertrauenswürdig. Schema-Validierung ersetzt keine Autorisierung und semantische Prüfung.
- Spieleridentität, Lobby-Mitgliedschaft, Rollen, Spielphase und Wertebereiche serverseitig prüfen.
- Scores, Gewinner, Währungen und Belohnungen serverautoritativ berechnen.
- Socket-Events benötigen Zod-Schema, Auth-/Lobby-Prüfung, Rate-Limit, Payload-Grenzen, Fehlerbehandlung und Tests.
- CORS/Origin, Sessions, Cookies/Tokens und Reconnect sicher konfigurieren.
- Secrets nur über Umgebungsvariablen/Secret-Manager; nie committen oder loggen.
- Prisma-Zugriffe parametrisiert halten; Templates/Eingaben gegen Injection absichern.
- Migrationen auf Datenverlust, Backup, Rollback und Mehrinstanzbetrieb prüfen.
- Findings nach Evidenz unterscheiden: bestätigt, plausibel oder Verbesserungshinweis.
