---
name: new-game
description: Integriert ein Multiplayer-Spiel vollständig in Shared, Server, UI, TV und Smartphone.
---
# New Game (Studio-Produktionsplan Gate 0–5)
1. **Gate 0 – Greenlight & Benchmark:** Bestehende Spiele/Registries prüfen (`01`–`04` Rules); 2–3 erfolgreiche Genre-Referenzen sowie öffentliche Mechanik-/UX-Anleitungen recherchieren; Core-Loop, Ziel und Dual-Screen-Rollen (TV + Smartphone `2..N`) festlegen.
2. **Gate 1 – Asset- & Tech-Scouting:** Echte, lizenzfreie 2D-/3D-Assets (CC0-Sprites, Modelle, PBR-Texturen, UI-Kits) und Open-Source-Bibliotheken auswählen; Lizenzen und Zielpfade dokumentieren; Render-Stack (DOM/Canvas/PixiJS/Three.js) und `React.lazy`-Splitting festlegen.
3. **Gate 2 – Vertical Slice:** Shared-Verträge (`packages/shared`), autoritative Server-Basis (`server/`) und den reinen spielbaren Kern-Loop mit präziser Steuerung und erstem Game Feel bauen, bevor Content skaliert wird.
4. **Gate 3 – Full Production:** Zum Spielprinzip passende Systeme (Balance-Parameter in `shared`, echte Upgrades, Art Direction, gekapselte `<game>-*`-Styles, Spielmenü ohne Plattform-Header, Safe-Areas, TV-Fokus, Audio-Mix & Haptik) ausbauen; passende Module A–F anwenden.
5. **Gate 4 – Multiplayer- & Reconnect-Hardening:** TV + Smartphones (`2..N`), `sanitizeLobbyForClient`, Server-Timer, Rate-/Payload-Limits, Bot-KI, Disconnect/Reconnect und Idempotenz absichern und in Server-Tests verifizieren.
6. **Gate 5 – Studio QA & Gold Master:** Vollständiges Match prüfen, Ressourcen-Cleanup (`dispose()`/`destroy()`) kontrollieren sowie `npm run build`, `npm run lint` und `npm test` bestehen.
