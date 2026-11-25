---
trigger: always_on
---
# 04 – Verifikation, Qualitätssicherung & Auslieferung

## Pflichtprüfungen nach dem letzten Edit
- `npm run build`: Baut `shared`, `apps/tv`, `apps/smartphone` und `server` (inkl. Prisma Client).
- `npm run lint`: Prüft `apps/tv`, `apps/smartphone`, `packages/shared`, `packages/ui` und `server` (Ziel: `0 warnings`, `0 errors`).
- `npm test`: Baut `shared` und führt alle Server-Logik-, Session-, Lobby- und Datenbanktests aus.

## Test- & Match-QA-Gate
- Neue Server-Regeln, Spielmechaniken und Sicherheitsprüfungen mit Tests für Happy Path, Grenzwerte, falsche Rollen/Phasen, doppelte Events und Disconnect/Reconnect absichern; Tests niemals löschen oder abschwächen.
- Ein Spiel oder Feature gilt nicht allein durch Kompilieren als fertig: vollständigen Match-Ablauf (Start → Midgame → Systeme/Upgrades → Spielende → Revanche → Reconnect) sowie TV-Fokus, Touch und Safe-Areas prüfen.
- **Visuelles Browser-Gate:** Bei größeren UI-, Layout- oder Canvas-/WebGL-Änderungen nach Möglichkeit gegen den lokalen Dev-Server per `browser`-Subagent (TV- und Smartphone-Ansicht, inkl. Landscape) prüfen; wird kein Browser-Check ausgeführt, das ausdrücklich im Abschlussbericht benennen. Beim Screenshot-Audit explizit prüfen: (1) keine abgeschnittenen Grafiken oder Letterbox-Balken an den Rändern, (2) keine Überlappung durch schwebende Plattform-Buttons (`EXIT`/Menü), (3) vollständige Stil-Kohärenz ohne flache Fremdkörper- oder Giant-Flat-Box-Elemente, (4) sauber zentrierte, thematisch passende Darstellung von Namen, Scores und HUD-Elementen.
- Bei Shared-Änderungen immer alle Konsumenten bauen und prüfen.

## Ehrliche Berichterstattung & Git-Hygiene
- Nur geprüfte Fakten und reale Befehlsergebnisse berichten; nicht ausgeführte Checks (z. B. fehlende visuelle Browser-/Geräteläufe) ausdrücklich als nicht ausgeführt benennen.
- Dokumentation (`README.md`, `AGENTS.md`, `docs/`) synchron halten, wenn Architektur, Scripts oder Standards sich ändern.
- Automatisierte Deployments nur auf ausdrücklichen Auftrag; Secrets und Zugangsdaten bleiben aus Commits und Logs fern.
