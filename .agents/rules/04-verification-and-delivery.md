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
- **Visuelles Browser-Gate:** Bei größeren UI-, Layout- oder Canvas-/WebGL-Änderungen nach Möglichkeit gegen den lokalen Dev-Server per `browser`-Subagent (TV- und Smartphone-Ansicht, inkl. Landscape) prüfen; wird kein Browser-Check ausgeführt, das ausdrücklich im Abschlussbericht benennen. Beim Screenshot-Audit explizit prüfen: (1) keine abgeschnittenen Grafiken oder Letterbox-Balken, (2) `EXIT`/Menü fest und bündig im Layout verankert, (3) freie Spielgrafiken statt in CSS-Kreise/Boxen gesperrter Icons und keine „Box-in-Box“-Kästen, (4) Rechtshänder-Ergonomie im Quermodus (Primäraktion rechts), (5) keine unnötigen `● Name`-Pills oder Erklärungstexte unter Buttons, (6) klarer Luminanz-Kontrast und ruhige Typo-Baseline.
- Bei Shared-Änderungen immer alle Konsumenten bauen und prüfen.

## Ehrliche Berichterstattung & Git-Hygiene
- Nur geprüfte Fakten und reale Befehlsergebnisse berichten; nicht ausgeführte Checks (z. B. fehlende visuelle Browser-/Geräteläufe) ausdrücklich als nicht ausgeführt benennen.
- Dokumentation (`README.md`, `AGENTS.md`, `docs/`) synchron halten, wenn Architektur, Scripts oder Standards sich ändern.
- Automatisierte Deployments nur auf ausdrücklichen Auftrag; Secrets und Zugangsdaten bleiben aus Commits und Logs fern.
