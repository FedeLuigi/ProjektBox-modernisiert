---
name: release-check
description: Prüft Releases und führt bei ausdrücklichem Auftrag den verfügbaren Rollout durch.
---
# Release Check
1. Scope, Zielbranch, Version und Zielumgebung verifizieren.
2. Git-Status/Diff prüfen; fremde Änderungen nicht überschreiben.
3. Build, Lint und Tests ausführen; Abdeckungslimits benennen.
4. Secrets, Prisma-Migrationen und Runtime-Kompatibilität prüfen.
5. Client-/Server-Kompatibilität, Socket-Verträge, PWA-Update und Sessions berücksichtigen.
6. Recovery, Monitoring, Release Notes und Risiken festlegen.
7. Bei explizitem Auftrag Pipeline autonom zum eindeutig autorisierten Ziel ausführen.
8. Bei fehlgeschlagenen Checks, unklarem Ziel, Datenrisiko oder Security Incident stoppen.
9. Nach Rollout Health, Logs und kritische Flows prüfen; Erfolg nur bei bestätigtem Resultat melden.
