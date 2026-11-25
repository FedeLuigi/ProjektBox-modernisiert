---
trigger: always_on
---
# Code-Qualität
- TypeScript präzise halten; any, Casts und Non-null Assertions nur begründet und eng begrenzt.
- Fehler explizit behandeln; keine leeren Catch-Blöcke oder stillen Datenverlust-Fallbacks.
- Kleine Änderungen; keine unaufgeforderten Refactorings/Dependency-Upgrades.
- Vorhandene Komponenten/Utilities und Projektkonventionen wiederverwenden.
- UI-Texte konsistent und produktreif halten (keine Mischsprache, keine Platzhalter wie `TODO` oder Debug-Labels); Unterscheidungsmerkmale niemals nur über Farbe codieren.
- React-Effekt-Dependencies korrekt halten. Engine-Initialisierung gezielt über stabile Refs entkoppeln, nicht pauschal Dependencies entfernen.
- Listener, Timer, AnimationFrames, Three.js-Ressourcen und Renderer bereinigen.
