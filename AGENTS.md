# AGENTS.md — ProjektBox Master-Vertrag

ProjektBox ist eine Multi-Game-Plattform für Smart-TVs (`apps/tv`), Smartphones (`apps/smartphone`) und Echtzeit-Multiplayer (`server`) mit gemeinsamen Verträgen (`packages/shared`) und UI-/Spielmodulen (`packages/ui`).

## 1. Arbeitsmodus & Vorrangordnung
- **Autonomie: full.** Analysiere, plane, implementiere, teste und dokumentiere Aufgaben selbstständig innerhalb der bestehenden Architektur.
- **Team: single.** Integrierter Entwicklerprozess über alle Disziplinen (Architektur, Backend, Frontend, Game Engineering, QA); `.agents/agents/` enthält optionale Perspektiven.
- **Deployment: full-deploy.** Produktive Deployments nur bei explizitem Auftrag; Sicherheits-, Datenintegritäts- und Berechtigungsstopps haben immer Vorrang.
- **Vorrangordnung:**
  1. Sicherheit, Autorisierung, Datenintegrität und Serverautorität.
  2. Die 4 verbindlichen `always_on`-Rules unter `.agents/rules/`.
  3. Kontextabhängige Skills über `.agents/skills/projectbox-skill-routing/SKILL.md`.
  4. Allgemeine Konventionen.

## 2. Verbindliches Regelwerk (`.agents/rules/`)
Alle Regeln gelten **automatisch, dauerhaft und spielunabhängig** bei jedem Prompt:
1. `.agents/rules/01-platform-and-architecture.md` — Monorepo-Grenzen, Drei-Schichten-Integration, CSS-/Style-Isolation, TypeScript- & Code-Disziplin.
2. `.agents/rules/02-security-and-multiplayer.md` — Zero-Trust, Serverautorität, Socket.IO/Zod/Rate-Limits, Reconnect-Snapshots, Bot-KI & Sync.
3. `.agents/rules/03-game-engineering.md` — Studio-Rolle, Referenz-Recherche, Vertical Slice, echte öffentliche/lizenzfreie Assets, Dual-Screen-Ergonomie sowie modulare Fach-Module A–F.
4. `.agents/rules/04-verification-and-delivery.md` — Pflichtchecks (`build`, `lint`, `test`), Match-QA-Gate, ehrliche Berichterstattung & Git-/Doku-Hygiene.

## 3. Skill-Routing & Befehle
- Vor größeren Aufgaben, UI-/Game-Arbeiten, Performance-Analysen oder Reviews `.agents/skills/projectbox-skill-routing/SKILL.md` anwenden und nur die passenden Skills laden.
- Herkunft und Lizenzen importierter Skills sind in `docs/THIRD_PARTY_AGENT_SKILLS.md` dokumentiert.
- Root-Scripts:
  - `npm run dev` — startet Server, Smartphone und TV parallel.
  - `npm run build` — baut `shared`, `apps/tv`, `apps/smartphone` und `server`.
  - `npm run lint` — prüft `apps/tv`, `apps/smartphone`, `packages/shared`, `packages/ui` und `server`.
  - `npm test` — baut `shared` und führt alle Server-Tests (`src/lobby/*.test.ts`, `src/database/*.test.ts`) aus.
