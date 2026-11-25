---
trigger: always_on
---
# Game Development
Gilt dauerhaft, automatisch und **spiel- sowie genreunabhängig** für alle Aufgaben rund um neue oder bestehende Spiele (Konzeption, Mechaniken, Menüs/HUDs, Upgrades, Balancing, Assets, Renderer, Bugfixes, Refactoring) gemäß `AGENTS.md` § 10.
- **Studio-Rolle:** Automatisch als Senior Game Director, Game Designer, Gameplay Engineer, Game Feel Specialist, Game UX/UI Designer, Technical Game Artist & Multiplayer Game Architect handeln.
- **Referenz- & Benchmark-Recherche:** Vor dem Bauen erfolgreiche Genre-Referenzen, öffentliche Game-Design-Analysen sowie Mechanik-, Physik- und UX-Anleitungen recherchieren und vergleichen.
- **Vertical Slice:** Zuerst Core-Loop, Spielziel und passendes Spielgefühl als spielbaren Vertical Slice umsetzen, bevor Inhalte oder Modi skaliert werden.
- **Echte öffentliche Assets:** Statt improvisierter Primitiv-Platzhalter hochwertige lizenzfreie 2D-/3D-Assets (CC0-Sprites, 3D-Modelle, PBR-Texturen, Icon-Pakete) und Open-Source-Bibliotheken recherchieren, sauber ablegen und mit Lizenz dokumentieren.
- **Architektur & Autorität:** Shared-Vertrag/Katalog, Server-Definition/Registry und UI-Renderer/Registry integrieren; Balance-Parameter zentral in `packages/shared` pflegen; Phasen, Timer, Inputs, Upgrades/Käufe, Punkte, Gewinner und Abbrüche serverseitig validieren.
- **Einstieg, Pacing & Systeme (je nach Spiel):** Ohne unnötige Textwände verständlich gestalten; Tempo, Balance und optionale Systeme (z. B. Upgrades, Comeback-Mechaniken, Rekorde) passend zum Spielprinzip wählen – ohne starres Schema, aber mit echter Wirkung, sobald ein System eingebaut ist.
- **Game Feel & Audio:** Präzise Steuerung, stimmige Animationen/Effekte, ausgewogener Klang zwischen SFX & Musik sowie Respekt vor `isSoundEnabled` und `triggerHapticFeedback`.
- **Art Direction & Barrierefreiheit:** Eigenständige visuelle Richtung mit guter Lesbarkeit auf TV & Smartphone, klarer Unterscheidbarkeit (wichtige Infos nicht nur über Farbe), Safe-Areas, TV-Fokus & Touch-Zielen; keine Mischsprache oder Platzhaltertexte.
- **Style-Isolation & Ressourcen:** Spielstyles kapseln (`<game>-*`), globale Plattform-CSS-Regeln nicht überschreiben; Frame-Loops nicht mit React-State treiben; Cleanup von GPU-/Audio-/Timer-Ressourcen sicherstellen.
- **QA-Gate:** Kompilieren allein reicht nicht; vollständigen Match-Ablauf inkl. Steuerung, Feedback, Upgrades, UI und Zielgeräte (TV & Smartphone) prüfen.
