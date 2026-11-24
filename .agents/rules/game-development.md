---
trigger: model_decision
---
# Game Development
Bei neuen Spielen, Mechaniken, Balancing und Renderer-Änderungen anwenden.
- Bestehende Definitionen/Registries studieren; tatsächlicher Code/Katalog ist maßgeblich.
- Shared-Vertrag/Katalog, Server-Definition/Registry und UI-Renderer/Registry integrieren.
- Server validiert Phasen, Timer, Inputs, Punkte, Gewinner und Abbruchzustände.
- TV-Bühne und Controller auf Smartphones aller Teilnehmer unterstützen.
- Spielstyles kapseln; globale Plattform-CSS-Regeln nicht überschreiben.
- Touch-Ziele, TV-Fokus, Safe Areas und Displaygrößen prüfen.
- Frame-Loops nicht mit React-State treiben; Netzwerk-Sync entkoppeln.
- Audio, Haptik, Assets und Animationen mit Cleanup abstimmen; Tests ergänzen.
