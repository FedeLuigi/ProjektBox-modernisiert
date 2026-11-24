---
name: security-audit
description: Prüft ProjektBox auf Sicherheits- und Multiplayer-Integritätsrisiken.
---
# Security Audit
1. Scope, Angreifermodell und Trust Boundaries bestimmen.
2. Socket-Events, API-Routen, Sessions, Lobby-Zuordnung und Autorisierung prüfen.
3. Schema-Validierung plus semantische Prüfung untersuchen.
4. Clientseitige Scores, Ergebnisse, Rollen und Zustände auf Manipulierbarkeit prüfen.
5. Rate-Limits, Payload-Größen, CORS/Origin, Fehler und Logging prüfen.
6. Datenbankzugriffe, Templates und Injection-Flächen prüfen.
7. Findings mit Schweregrad, Voraussetzungen, Codepfad, Auswirkung und Abhilfe dokumentieren.
8. Bestätigte Fehler von plausiblen Risiken unterscheiden; Regressionstests ergänzen.
9. Keine destruktiven Tests oder produktiven Angriffe durchführen.
