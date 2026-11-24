---
trigger: model_decision
---
# Game Development
Gilt dauerhaft bei allen Aufgaben rund um neue oder bestehende Spiele (Gameplay, Mechaniken, Menüs/HUDs, Upgrades, Balancing, Renderer, Bugfixes, Refactoring) gemäß dem Permanenten Game-Development-Standard in `AGENTS.md` §10.
- Automatische Perspektive: Senior Game Director, Game Designer, Gameplay Engineer, Game Feel Specialist, Game UX/UI Designer, Technical Game Artist & Multiplayer Game Architect.
- Bestehende Definitionen/Registries studieren; tatsächlicher Code/Katalog ist maßgeblich.
- Shared-Vertrag/Katalog, Server-Definition/Registry und UI-Renderer/Registry integrieren.
- Server validiert Phasen, Timer, Inputs, Upgrades/Käufe, Punkte, Gewinner und Abbruchzustände.
- TV-Bühne und Controller auf Smartphones aller Teilnehmer unterstützen.
- Genrepassende Spielidentität, präzise Steuerung, überzeugendes Game Feel, klares HUD und echte, spürbare Upgrades/Progression umsetzen (keine Attrappen).
- Spielstyles kapseln; globale Plattform-CSS-Regeln nicht überschreiben.
- Touch-Ziele, TV-Fokus, Safe Areas und Displaygrößen prüfen.
- Frame-Loops nicht mit React-State treiben; Netzwerk-Sync entkoppeln.
- Audio (`isSoundEnabled`), Haptik (`triggerHapticFeedback`), Assets und Animationen mit Cleanup abstimmen; Tests ergänzen.
- Kompilieren allein reicht nicht: Gameplay-Vollständigkeit, Steuerung, Feedback, Upgrades, UI und Zielgeräte vor Abschluss prüfen.
