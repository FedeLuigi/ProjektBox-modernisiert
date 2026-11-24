---
trigger: model_decision
---
# Testing und QA
- Tests risikobasiert auswählen: Logik, Server-Integration, Build, Lint und Gerätechecks.
- npm run build deckt Shared, TV, Smartphone und Server ab.
- npm run lint deckt derzeit nur TV und Smartphone ab.
- npm test baut Shared und führt derzeit Server-Lobby- und Database-Tests aus.
- Neue Server-Regeln mit Happy Path, Grenzwerten, falschen Rollen/Phasen, doppelten Events und Disconnects testen.
- Nach Shared-Änderungen alle Konsumenten bauen.
- Tests nicht löschen/abschwächen. Nicht ausgeführte Checks als nicht ausgeführt melden.
- UI auf TV-Fokus, Touch, Safe Areas, Responsivität und Lade-/Fehlerzustände prüfen.
