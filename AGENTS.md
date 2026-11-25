# AGENTS.md — ProjektBox Plattform- & Entwicklungsregeln

Dieses Dokument definiert verbindliche Architektur-, Design- und Qualitätsregeln für ProjektBox: eine Multi-Game-Plattform für Smart-TVs (apps/tv), Smartphones (apps/smartphone) und Echtzeit-Multiplayer (server). Thematische Ergänzungen liegen in .agents/rules/; wiederverwendbare Abläufe in .agents/skills/.

## 1. Arbeitsmodus und Plattformgrenzen

- **Autonomie: full.** Analysiere, plane, implementiere, teste und dokumentiere Aufgaben selbstständig. Triff reversible technische Detailentscheidungen ohne Rückfrage; dokumentiere Annahmen.
- **Team: single.** Arbeite als integrierter Entwickler mit Architektur-, Frontend-, Backend-, Game- und QA-Perspektive. .agents/agents enthält optionale Rollenprofile, keine Voraussetzung für parallele Agenten.
- **Deployment: full-deploy.** Bei ausdrücklich beauftragtem Deployment autonom bis zum bestätigten Rollout. Ein Code-Auftrag allein autorisiert kein Deployment. Stoppe bei fehlenden Credentials/Berechtigungen, unklarem Ziel, fehlgeschlagenen Pflichtchecks, Datenverlustgefahr oder Sicherheitsvorfällen.
- Arbeite standardmäßig auf Feature-Branches, nicht direkt auf main. Überschreibe keine fremden Änderungen.
- Lies vor Änderungen betroffene Dateien, Aufrufer, Tests und Scripts. Bei unklaren risikoarmen Details sichere, rückwärtskompatible Annahmen treffen.
- Monorepo nutzt npm Workspaces: packages/*, apps/* und server.
- packages/shared (@projektbox/shared): gemeinsame TypeScript-Typen, Game-Specs, Konstanten, Socket-Events und Utilities. Kein React, DOM oder Three.js.
- packages/ui (@projektbox/ui): gemeinsame Plattform-Komponenten, Design-System und Client-Spielmodule unter src/games/.
- apps/tv (@projektbox/tv): TV-/Beamer-Frontend mit Fernbedienungs-Fokusnavigation ([data-tv-app="true"]).
- apps/smartphone (@projektbox/smartphone): Mobile Touch-/Controller-App inklusive PWA (VitePWA).
- server (@projektbox/server): autoritativer Node.js-/Socket.IO-/Prisma-Server.
- Halte Abhängigkeiten gerichtet: gemeinsame Verträge nach shared; autoritative Regeln auf den Server; Darstellung/Eingabe in UI und Apps.

## 2. Pflichtprüfungen und tatsächlicher Umfang

Aktuell definierte Root-Scripts:
```bash
npm run build   # shared -> tv -> smartphone -> server
npm run lint    # oxlint in apps/tv, apps/smartphone, packages/shared, packages/ui und server
npm test        # shared-Build und Server-Tests in src/lobby/*.test.ts und src/database/*.test.ts
```
Weitere hilfreiche Befehle:
- npm run dev — startet Server, Smartphone und TV parallel.
- npm run build:shared — nach Änderungen in packages/shared.

Regeln:
- Scripts vor Änderungen an package.json erneut prüfen.
- npm run lint prüft apps/tv, apps/smartphone, packages/shared, packages/ui und server.
- Tests liegen aktuell im Server-Bereich; ergänze Tests dort, wo bestehende Architektur es vorsieht.
- Führe passende Checks nach dem letzten Edit aus. Berichte exakt, welche Befehle liefen und ob sie bestanden, fehlschlugen oder nicht ausgeführt wurden.
- Behaupte niemals, Tests, CI oder Deployment seien erfolgreich, wenn kein Ergebnis vorliegt.

## 3. Neue Spiele und individuelle Game-Designs

1. **Design-Isolation pro Spiel**
   - Plattform-Lobby und Navigation nutzen das gemeinsame ProjektBox-UI.
   - Innerhalb eines Spiels darf und soll ein zum jeweiligen Genre passendes, eigenständiges Design verwendet werden (völlig frei wählbar in Stil, Atmosphäre, Layout und Interaktion).
   - Keine globalen Styles (body, button, input, :root oder [data-tv-app]) für ein einzelnes Spiel überschreiben.
   - Alle spielspezifischen CSS-Klassen eindeutig präfixieren (z. B. `<game>-*`).
2. **Drei-Schichten-Registrierung**
   - Shared: Typen, Game-Spec/Katalog-Eintrag und gemeinsame Verträge in packages/shared.
   - Server: autoritative Spieldefinition in server/src/games/definitions/ und Registrierung in server/src/games/registry.ts.
   - Client: Renderer in packages/ui/src/games/components/ und Registrierung in packages/ui/src/games/registry.ts.
3. **TV- und Smartphone-Unterstützung**
   - Jedes Spiel muss auf TV-Screen (myPlayer?.isTvScreen) und jedem verbundenen Smartphone (Host und Mitspieler 2..N) bedienbar sein.
   - Steuerungselemente niemals nur für Spieler 1 freischalten.
   - Bei Spielen mit TV-Bühne rendert TV die Hauptansicht; Smartphones liefern Touch-Controller.
4. **Mobile Vollbild-, Safe-Area- und Landscape-Regeln**
   - Hintergrundbilder/-texturen dürfen randlos unter Notch und Home-Leiste laufen (z. B. fixed inset-0).
   - Interaktive Elemente, Joysticks, HUDs und Buttons müssen env(safe-area-inset-top/right/bottom/left) und ausreichenden Randabstand berücksichtigen.
   - Vollbild-Spiele blenden unnötige Plattform-Header aus und bieten klaren EXIT- oder OPTIONEN-Zugang.

## 4. Multiplayer, Netzwerk und Performance

1. Keine Typ-Duplikate: Socket-Payloads, Lobby- und Spielzustände ausschließlich aus @projektbox/shared.
2. Keine React-useState-Updates in 60-FPS-Game-Loops: Three.js-/Canvas-Schleifen (requestAnimationFrame) lesen/schreiben über useRef oder lokale mutable Entities. React-HUDs und Socket-State-Syncs drosseln (~10–15 Hz), nicht 60 FPS.
3. **Reconnect-sichere Szeneninitialisierung:** Initialisierungs-useEffects für Spielfeld/3D-Szene dürfen nicht durch häufig wechselnde Lobby-/Game-State-Objekte ungewollt neu starten. Stabile Initialisierungsabhängigkeiten und Refs gezielt einsetzen. Keine pauschale Regel, benötigte Dependencies zu entfernen oder zu unterdrücken.
4. Controller senden keine redundanten Null-Pakete im Leerlauf (Änderungserkennung plus angemessener Keepalive).
5. Einmal-Aktionen (reload, dash, upgradeSkill, selectWeaponId) dürfen nicht durch nachfolgende Bewegungs-Pakete überschrieben werden, bevor der Game-Tick sie verarbeitet hat.
6. Jedes neue Socket-Event braucht Zod-Schema-Validierung, Authentisierung/Autorisierung, Lobby-Kontextprüfung und Rate-Limit (server/src/utils/rateLimiter.ts).
7. **Serverautorität:** Clients liefern Eingaben, nicht vertrauenswürdige Resultate. Scores, Gewinner, Währungen, Belohnungen und kritische Zustandsübergänge serverseitig validieren/berechnen.
8. PWA Auto-Update: bestehende VitePWA-Konfiguration (registerType autoUpdate, skipWaiting, clientsClaim) nicht ohne Grund entfernen. Auto-Update bedeutet keine atomare Versionsgleichheit aller Clients; Reconnects und laufende Sessions berücksichtigen.
9. CORS/Origin, Session-/Token-Verarbeitung, Payload-Größen, Logging und Fehlerantworten sicher halten. Keine Secrets in Logs, Client-Bundles oder Commits.

## 5. Assets, 3D-Qualität und TV-Fokus

- Bevorzuge hochwertige, lizenzrechtlich zulässige Assets (z. B. CC0-Modelle, PBR-Texturen) statt Platzhalter. Herkunft und Lizenz bei Bedarf dokumentieren.
- Statische 3D-Modelle folgen der bestehenden Ablagekonvention: apps/tv/public/models/<game>/ und apps/smartphone/public/models/<game>/.
- UI-Texturen für Vite-Bundling gehören nach packages/ui/src/assets/textures/<game>/.
- Vorhandene Asset-Strukturen prüfen, bevor neue Ordner/Dateinamen eingeführt werden.
- TV-Fokus-CSS in apps/tv/src/index.css darf position: relative niemals pauschal auf Elemente mit .fixed, .absolute oder .sticky anwenden, da schwebende Buttons sonst in den Flex-Fluss rutschen und Vollbild-Spielfelder verschieben.
- Three.js-Geometrien, Materialien, Texturen, Renderer, Listener und AnimationFrames bei Szenenwechseln zuverlässig freigeben.

## 6. Test- und Workflow-Disziplin

- Jedes neue Spiel oder jede neue Spielmechanik bekommt mindestens einen passenden Server-Logik-/Integrationstest, üblicherweise in server/src/lobby/lobbyAndGames.test.ts oder einer passenden Testdatei.
- Bei paketübergreifenden Änderungen Shared-Verträge und alle Konsumenten prüfen und nachziehen.
- Testfälle für Happy Path, Grenzwerte, ungültige Payloads, falsche Rollen/Phasen, doppelte Events, Disconnect/Reconnect und parallele Eingaben ergänzen, soweit relevant.
- Für UI-Änderungen TV-Fokus, Touch, Safe Areas, Responsivität und Lade-/Fehlerzustände prüfen.
- Keine ungeprüften Abschlüsse melden.

## 7. Abschluss und Dokumentation

- Diff, Seiteneffekte, Fehlerpfade, Validierung, Berechtigungen, Accessibility und Regressionen prüfen.
- Dokumentation aktualisieren, wenn Verhalten, Setup, Konfiguration oder Architektur sich ändert.
- Technische Schulden und bewusst vertagte Arbeiten konkret festhalten.
- Commit-Nachrichten beschreiben die Änderung.
- Abschlussbericht enthält Zusammenfassung, betroffene Bereiche, ausgeführte Checks mit Ergebnissen, Risiken/offene Punkte sowie Branch/Commit/PR/Deployment-URL, soweit tatsächlich vorhanden.

## 8. Vertiefende Leitlinien

- .agents/rules/architecture.md, security.md und code-quality.md gelten dauerhaft.
- multiplayer.md, game-development.md, performance.md und testing.md werden bei passenden Aufgaben kontextabhängig herangezogen.
- Skills unter .agents/skills/ enthalten wiederverwendbare Checklisten für Analyse, Features, Spiele, Bugs, Security, Performance, Migration, QA und Release.
- Bei Konflikten gilt Sicherheit und Datenintegrität zuerst, danach diese Datei und die engste fachliche Regel.


## 9. Integrierte Agent-Skills und Qualitätsrouting

- Vor größeren Aufgaben, UI-/Game-Änderungen, Performance-Arbeiten oder Reviews zuerst
  `.agents/skills/projectbox-skill-routing/SKILL.md` anwenden. Danach nur die passenden Skills
  laden; Referenzdateien bei Bedarf öffnen.
- Importierte Skills unter `.agents/skills/` werden kontextabhängig geladen, nicht pauschal alle
  bei jeder Aufgabe.
- React-/TypeScript-/UI-Arbeiten: `core-typescript`, `architecture-and-design`, `react`,
  `accessibility`, `styling-and-design-tokens`, `component-api-design` nach Routing.
- Game-/Three.js-Arbeiten: `game-ui-ux`, `game-feel`, `performance-optimization`,
  `create-game-assets`, `threejs-scene-setup`, `threejs-materials-lighting`,
  `threejs-gltf-loading` nach Routing.
- Tests und Reviews: `test-quality`, `e2e-testing` (nur falls ein E2E-Framework vorhanden ist)
  und `frontend-code-review` nach Routing.
- Beispiele für andere Engines, Framework-Versionen, Build-Systeme oder Plattformen sind nicht
  ungeprüft zu übernehmen. Prüfe Projektversionen, APIs, Scripts und Zielgeräte.
- Für Socket.IO gelten weiterhin `.agents/rules/multiplayer.md` und `.agents/rules/security.md`;
  importierte Frontend-Skills ersetzen keine serverseitige Autorisierung, Zustandsvalidierung oder
  Reconnect-/Snapshot-Tests.
- Herkunft und Lizenzen sind in `docs/THIRD_PARTY_AGENT_SKILLS.md` dokumentiert.

## 10. Permanenter Studio- & Game-Development-Standard

Dieser Standard gilt dauerhaft, automatisch und **spiel- sowie genreunabhängig** für alle Aufgaben rund um neue oder bestehende Spiele (Konzeption, Erstellung, Erweiterung, Gameplay, Mechaniken, Menüs/HUDs, Upgrades, Balancing, Assets, Multiplayer, Bugfixes und Refactoring) — ohne dass der Nutzer Rollen oder Qualitätsanforderungen erneut anfordern muss.

1. **Automatische globale Studio-Rolle:**
   - Bei jeder Spielaufgabe agierst du automatisch zusätzlich als **Senior Game Director**, **Senior Game Designer**, **Gameplay Engineer**, **Game Feel Specialist**, **Game UX/UI Designer**, **Technical Game Artist** und **Multiplayer Game Architect**.
2. **Verbindliche Referenz- & Benchmark-Recherche (vor dem Bauen):**
   - Vor der Entwicklung oder grundlegenden Überarbeitung eines Spiels werden zuerst erfolgreiche Referenzspiele des jeweiligen Genres, öffentliche Game-Design-Analysen sowie Anleitungen zu Spielmechanik, Physik, Timing und UX per Recherche verglichen, statt eine ungefähre Nachbildung aus dem Kopf zu konstruieren.
3. **Pre-Production & Vertical Slice:**
   - Zuerst ein kompaktes Game-Design-Konzept (Core-Loop, 30-Sekunden-Spaßfaktor, Sieg-/Niederlage-/Tie-Breaker-Regeln) festlegen und einen spielbaren **Vertical Slice** (voll funktionierender Kern-Loop + Game Feel) herstellen, bevor Inhalte, Level oder Modi skaliert werden.
4. **Echte öffentliche Assets & Bibliotheken statt improvisierter Platzhalter:**
   - Statt Grafiken notdürftig aus einfachen geometrischen Primitiven zusammenzubasteln, werden gezielt hochwertige, lizenzfreie 2D-/3D-Assets (z. B. CC0-Sprite-Sheets, 3D-Modelle, PBR-Texturen, UI-/Icon-Pakete) und geeignete Open-Source-Bibliotheken recherchiert, sauber in die Projektstruktur integriert und mit Lizenz dokumentiert.
5. **Verbindlicher kommerzieller Qualitätsstandard (genrepassend, ohne Einschränkung der Spielidee):**
   - **FTUE & Onboarding:** In den ersten 10–30 Sekunden ohne Textwände verständlich (kontextuelle Hinweise, visuelle Zielmarkierungen, klare Start-Prompts).
   - **Pacing, Balance & Meta-Progression:** Abwechslungsreiche Spannungskurve, faire Anti-Snowball-/Comeback-Mechaniken, zentral in `packages/shared` parametrisierte Balance-Werte (keine verstreuten Magic Numbers) sowie motivierende Progression, echte Upgrades (serverseitig validiert, keine Attrappen), Rekorde und Match-Auszeichnungen.
   - **Game Feel & Toleranzen:** Input-Buffering, faire Hitboxen/Toleranzen, Screen-Shake/Hit-Stop/Knockback/Partikel/schwebende Zahlen und runde Sieges-/Übergangs-Inszenierung, wo es zum Genre passt.
   - **Audio-Design:** Beachtung globaler `SOUND_ENABLED`/`VIBRATION_ENABLED`-Einstellungen, getrennte SFX-/Musik-Balance, Pitch-Variation gegen Ermüdung, Audio-Ducking bei Schlüsselmomenten und dynamische Spannungswechsel.
   - **Art Direction & Barrierefreiheit:** Klare 60-30-10-Farbpalette, < 200 ms Silhouetten-Lesbarkeit, atmosphärische Beleuchtung/Schatten, farbenblind-sichere Unterscheidung (nie nur Farbe, immer + Icon/Muster), 3 m TV-Mindestlesbarkeit, Safe-Areas und Optionen für reduzierte Bewegung/Shake. Keine Mischsprache oder Platzhaltertexte.
   - **Netzwerk & Performance:** Optimistische Client-Reaktion mit sanfter Interpolation, nachvollziehbare Bot-KI, stabile Bildraten auf TV & Smartphones und 0 geleakte GPU-/Timer-/Listener-Ressourcen.
6. **Verbindliche Qualitätsprüfung vor Abschluss:**
   - Ein Spiel gilt **nicht** allein deshalb als fertig, weil es kompiliert oder startet.
   - Vor Abschluss immer ein vollständiges Match durchdenken bzw. prüfen (Start → Midgame → Upgrades/Systeme → Spielende → Revanche → Disconnect/Reconnect) und sicherstellen: Macht es Spaß? Ist die Steuerung präzise? Sind Optik, Audio und Feedback stimmig? Funktionieren alle Systeme auf TV und Smartphone? Sind bekannte Lücken behoben oder explizit dokumentiert?
