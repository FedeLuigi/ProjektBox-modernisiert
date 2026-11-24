---
name: new-game
description: Integriert ein Multiplayer-Spiel vollständig in Shared, Server, UI, TV und Smartphone.
---
# New Game
1. Bestehende Spiele und Registries vergleichen (`AGENTS.md` §3, §10 beachten).
2. Genrepassendes Game Design festlegen: Spielidentität, Kernmechanik, Progression/Upgrades, Balance, Game Feel und HUD-Hierarchie.
3. Game-ID, Metadaten, Phasen, Rollen, Inputs und Fehlerfälle definieren.
4. Shared-Typen, Katalog und Zod-Schemas ergänzen.
5. Server-Definition (inkl. autoritativer Validierung von Zügen, Upgrades/Käufen, Scores und Abbrüchen) und serverseitige Registry aktualisieren.
6. UI-Renderer (per `React.lazy` in `packages/ui/src/games/registry.ts`) und passende Skills (`game-ui-ux`, `game-feel`, `performance-optimization`, `create-game-assets`, bei 3D `threejs-*`) anwenden.
7. TV-Bühne und Controller für Host sowie alle Mitspieler (2..N) mit Safe-Areas, TV-Fokus und Touch-Ergonomie implementieren.
8. Socket-Events mit Auth, Lobby-Prüfung, Rate-Limit und Payload-Grenzen absichern.
9. Spielstyles kapseln; Audio (`isSoundEnabled`), Haptik (`triggerHapticFeedback`), Timer, Reconnect, Abbruch und GPU-/Listener-Cleanup behandeln.
10. Server-Tests für normale, autoritative und ungültige Abläufe ergänzen.
11. Shared-Build, Root-Build, Monorepo-Lint, Server-Tests sowie das Game Quality Gate (`AGENTS.md` §10) vollständig prüfen.
