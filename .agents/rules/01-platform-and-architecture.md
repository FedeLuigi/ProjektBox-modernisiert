---
trigger: always_on
---
# 01 – Plattform, Architektur & Code-Qualität

## Monorepo-Grenzen & Abhängigkeitsrichtung
- `packages/shared` (`@projektbox/shared`): Framework-neutrale Verträge (Typen, Game-Katalog, Balance-Konstanten, Socket-Events, Zod-Schemas, Utilities). **Kein** React, DOM, Three.js oder PixiJS.
- `server` (`@projektbox/server`): Autoritative Spiellogik, Lobbys, Sessions, Prisma/PostgreSQL, Socket.IO & REST-API.
- `packages/ui` (`@projektbox/ui`): Gemeinsame Plattform-Komponenten, Design-System, Socket-Client und per `React.lazy` geladene Spiel-Renderer (`src/games/`).
- `apps/tv` (`[data-tv-app="true"]`) & `apps/smartphone` (Touch + VitePWA): App-Shells und Navigation; keine Querimporte zwischen fremden Apps und keine Importzyklen.

## Drei-Schichten-Integration & Style-Isolation
- Jedes Spiel wird vollständig in Shared (Typen, Katalog, Schemas), Server (`definitions/` + `registry.ts`) und UI (`components/` + `registry.ts`) registriert.
- Innerhalb eines Spiels ist ein eigenes, genrepassendes Design ausdrücklich erwünscht. Globale Plattform-Styles (`body`, `button`, `input`, `:root`, `[data-tv-app]`) dürfen niemals für einzelne Spiele überschrieben werden; spielspezifische CSS-Klassen immer eindeutig präfixieren (`<game>-*`).
- TV-Fokus-CSS darf `position: relative` niemals pauschal auf `.fixed`, `.absolute` oder `.sticky` anwenden.

## Code-Disziplin
- TypeScript präzise halten (`any`, Casts und `!` nur begründet und eng begrenzt).
- Fehler explizit behandeln; keine leeren `catch`-Blöcke oder stillen Datenverlust-Fallbacks.
- Bestehende Utilities/Komponenten wiederverwenden; keine duplizierten Payloads/Logiken und keine funktionslosen Attrappen-Buttons oder Debug-/Mischsprachtexte.
- React-Effekte mit korrekten Dependencies pflegen; Engine-Initialisierung über stabile Refs entkoppeln.
