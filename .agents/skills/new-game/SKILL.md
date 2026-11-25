---
name: new-game
description: Integriert ein Multiplayer-Spiel vollständig in Shared, Server, UI, TV und Smartphone.
---
# New Game
1. Bestehende Spiele und Registries vergleichen (`AGENTS.md` § 3, § 10 beachten).
2. **Referenz- & Benchmark-Recherche:** Erfolgreiche Genre-Referenzen, öffentliche Game-Design-Analysen und Anleitungen zu Mechanik, Physik, Timing und UX recherchieren und vergleichen.
3. **Pre-Production & Vertical Slice:** Core-Loop, 30-Sekunden-Spaßfaktor, FTUE-Onboarding (ohne Textwände), Pacing/Comeback-Regeln, Art Direction (60-30-10, Silhouetten-Lesbarkeit) und Meta-Progression festlegen.
4. **Echte öffentliche Assets:** Hochwertige lizenzfreie 2D-/3D-Assets (CC0-Sprites, 3D-Modelle, PBR-Texturen, UI-Kits) und Open-Source-Bibliotheken recherchieren und inkl. Lizenz in der Projektstruktur ablegen.
5. Game-ID, Metadaten, Phasen, Rollen, Inputs, Fehlerfälle und zentrale Balance-Parameter in `packages/shared` (Typen, Katalog, Zod-Schemas) definieren.
6. Server-Definition (inkl. autoritativer Validierung von Zügen, Upgrades/Käufen, Scores und Abbrüchen) und serverseitige Registry aktualisieren.
7. UI-Renderer (per `React.lazy` in `packages/ui/src/games/registry.ts`) und passende Skills (`game-ui-ux`, `game-feel`, `performance-optimization`, `create-game-assets`, bei 3D `threejs-*`) anwenden.
8. TV-Bühne und Controller für Host sowie alle Mitspieler (2..N) mit Safe-Areas, TV-Fokus, Farbenblind-Sicherheit und Touch-Ergonomie implementieren.
9. Socket-Events mit Auth, Lobby-Prüfung, Rate-Limit, Payload-Grenzen und Interpolation/Bot-KI absichern.
10. Spielstyles kapseln (`<game>-*`); Audio (`isSoundEnabled`, Mix/Pitch-Variation), Haptik (`triggerHapticFeedback`), Timer, Reconnect, Abbruch und GPU-/Listener-Cleanup behandeln.
11. Server-Tests für normale, autoritative und ungültige Abläufe ergänzen.
12. Shared-Build, Root-Build, Monorepo-Lint, Server-Tests sowie das vollständige Match-QA-Gate (`AGENTS.md` § 10) prüfen.
