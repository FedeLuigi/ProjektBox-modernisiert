# ProjektBox — Entwicklungsregeln

Gilt für TV (apps/tv), Smartphone/PWA (apps/smartphone), Server und Packages. Details in .agents/rules; Abläufe in .agents/skills.

## Arbeitsmodus
- Autonomie full: analysiere, plane, implementiere, teste und dokumentiere selbstständig; triff reversible Detailentscheidungen ohne Rückfrage.
- Team single: ein integrierter Entwicklerprozess; .agents/agents sind optionale Rollenperspektiven.
- Deployment full-deploy: bei ausdrücklich beauftragtem Deployment autonom bis zum bestätigten Rollout. Ein Code-Auftrag allein autorisiert kein Deployment. Stoppe bei fehlenden Credentials/Berechtigungen, unklarem Ziel, fehlgeschlagenen Pflichtchecks, Datenverlustgefahr oder Sicherheitsvorfällen.
- Standardmäßig Feature-Branch statt main. Fremde Änderungen nicht überschreiben. Betroffene Dateien, Aufrufer, Tests und Scripts vor Änderungen lesen.

## Monorepo
- npm Workspaces: packages/*, apps/* und server.
- packages/shared: framework-neutrale TypeScript-Verträge, Spieltypen, Socket-Events, Zod-Schemas und Utilities; kein React/DOM/Three.js.
- packages/ui: gemeinsame UI-/Design-System-Komponenten, Socket-Client und Spiel-Renderer.
- apps/tv: TV-/Beamer-Frontend mit Fernbedienungs- und Fokusnavigation.
- apps/smartphone: Touch-Controller und PWA.
- server: Express, Socket.IO, Prisma sowie Lobby- und Game-Logik.
- Shared enthält kanonische Verträge; Server implementiert autoritative Regeln; UI/Apps präsentieren Zustand und senden Eingaben.
- Bei Shared-Vertragsänderungen alle Produzenten, Konsumenten und Serialisierungswege prüfen.

## Spiele und UX
- Neue Spiele integrieren Shared-Katalog/Typen, Server-Definition/Registry und UI-Renderer/Registry.
- TV-Bühne, Host-Smartphone und Smartphones aller Mitspieler unterstützen; keine Steuerung nur für Spieler 1.
- Spielstyles kapseln; globale Selektoren body, button, :root oder [data-tv-app] nicht überschreiben.
- Safe Areas, Touch-Ziele, TV-Fokus, Responsivität und klaren Exit-/Optionen-Zugang berücksichtigen.
- TV-Fokus-CSS darf fixed/absolute/sticky Elemente nicht unbeabsichtigt verschieben.

## Multiplayer, Sicherheit, Performance
- Clientdaten sind nicht vertrauenswürdig. Zod-Validierung plus Identitäts-, Rollen-, Lobby-, Phasen- und Wertebereichsprüfung.
- Server berechnet wettbewerbsrelevante Scores, Gewinner und Belohnungen selbst.
- Neue Socket-Events brauchen Schema, Auth-/Lobby-Kontext, Rate-Limit, Payload-Grenzen, Fehlerbehandlung und Tests. RateLimiter aus server/src/utils/rateLimiter.ts verwenden.
- Keine Secrets in Git, Logs, Fehlermeldungen oder Client-Bundles.
- Three.js-/Canvas-Loops nicht über React-State pro Frame steuern; Refs/Engine-State nutzen und UI-/Socket-Sync drosseln.
- Szenen-Initialisierung stabilisieren, ohne notwendige useEffect-Dependencies pauschal zu entfernen.
- PWA autoUpdate garantiert keine atomare Versionsgleichheit aller Clients.
- Listener, Timer, AnimationFrames, Renderer, Geometrien und Materialien bereinigen.

## Verifizierte Root-Scripts
- npm run build: Shared, TV, Smartphone und Server.
- npm run lint: derzeit nur apps/tv und apps/smartphone.
- npm test: Shared-Build und Server-Tests aus src/lobby/*.test.ts sowie src/database/*.test.ts.
- Nach Shared-Änderungen npm run build:shared.
- Keine umfassendere Lint-/Testabdeckung behaupten als vorhanden. Passende Checks nach dem letzten Edit ausführen und exakt berichten.
- Niemals Tests, CI oder Deployments als erfolgreich melden, wenn kein Ergebnis vorliegt.

## Abschluss
Diff, Fehlerpfade, Validierung, Berechtigungen, Accessibility und Regressionen prüfen. Dokumentation aktualisieren. Technische Schulden konkret notieren. Bericht enthält Änderungen, Prüfungen, Risiken sowie Branch/Commit/PR/Deployment-URL, sofern vorhanden.
