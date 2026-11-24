# AGENTS.md — ProjektBox Plattform- & Entwicklungsregeln

Dieses Dokument definiert die verbindlichen Architektur-, Design- und Qualitätsregeln für die Weiterentwicklung von **ProjektBox** — einer Multi-Game-Plattform für **Smart-TVs (`apps/tv`)**, **Smartphones (`apps/smartphone`)** und **Echtzeit-Multiplayer (`server`)** mit eigenständigen Spielen in unterschiedlichen visuellen Stilen.

---

## 1. Plattform-Vision & Monorepo-Grenzen

- **Ziel:** Eine gemeinsame, stabile Plattform-Shell (Lobby, QR-Join, Reconnect, Audio/Haptik, Einstellungen) für **viele unterschiedliche Spiele**, bei der jedes Spiel seine eigene Spielmechanik und sein eigenes, individuelles Design (z. B. Casino-Filz, Cartoon-Arcade, Industrial-Zombie-3D, Sci-Fi, Western) besitzt.
- **Workspaces & Strikte Grenzen:**
  - `packages/shared` (`@projektbox/shared`): Alle gemeinsamen TypeScript-Typen, Game-Specs, Konstanten und Hilfsfunktionen. **Kein React, kein DOM, kein Three.js.**
  - `packages/ui` (`@projektbox/ui`): Gemeinsame Plattform-Komponenten, Design-System sowie die Client-Spielmodule unter `packages/ui/src/games/`.
  - `apps/tv` (`@projektbox/tv`): TV-/Beamer-Frontend mit Fernbedienungs-Fokus-Navigation (`[data-tv-app="true"]`).
  - `apps/smartphone` (`@projektbox/smartphone`): Mobile Touch-/Controller-App inklusive PWA (`VitePWA` mit `autoUpdate`).
  - `server`: Authoritativer Node.js/Socket.IO/Prisma-Server.

---

## 2. Pflicht-Befehle vor Abschluss jeder Änderung

Vor jedem Commit/Abschluss müssen alle drei Checks ohne Fehler und mit **0 Lint-Warnungen** durchlaufen:

```bash
npm run build   # baut shared -> tv -> smartphone -> server
npm run lint    # oxlint in apps/tv und apps/smartphone
npm test        # baut shared & führt alle Server-Tests aus
```

Weitere hilfreiche Befehle:
- `npm run dev` — startet `server`, `apps/smartphone` und `apps/tv` parallel.
- `npm run build:shared` — muss nach jeder Änderung in `packages/shared` laufen.

---

## 3. Regeln für neue Spiele & individuelle Game-Designs

1. **Design-Isolation pro Spiel:**
   - Die Plattform-Lobby und Navigation nutzen das gemeinsame ProjektBox-UI.
   - Innerhalb eines Spiels darf und soll das Spiel ein **eigenes, zum Genre passendes Design** verwenden (eigene Farben, eigene Google Fonts, eigene Texturen/3D-Modelle, eigene Icons z. B. aus `react-icons/gi`).
   - **Verboten:** Globale Styles (`body`, `button`, `input`, `:root` oder `[data-tv-app]`) für ein einzelnes Spiel überschreiben. Alle spielspezifischen CSS-Klassen müssen eindeutig geprefixt sein (z. B. `.zombie-*`, `.roulette-*`, `.clip-armor-plate`).
2. **Drei-Schichten-Registrierung für jedes neue Spiel:**
   - **Shared:** Typen (`GameState`, `MovePayload`) und Katalog-Eintrag in `packages/shared`.
   - **Server:** Authoritative Spieldefinition in `server/src/games/definitions/` und Registrierung in `server/src/games/registry.ts`.
   - **Client:** Renderer in `packages/ui/src/games/components/` und Registrierung in `packages/ui/src/games/registry.ts`.
3. **TV- & Smartphone-Unterstützung für ALLE Teilnehmer:**
   - Jedes Spiel muss sowohl auf dem **TV-Screen** (`myPlayer?.isTvScreen`) als auch auf **jedem verbundenen Smartphone** (Host *und* Mitspieler 2..N) vollständig bedienbar sein.
   - Niemals Steuerungs-Elemente nur für Spieler 1 freischalten.
   - Bei Spielen mit TV-Bühne (wie Zombie Arena 3D) rendert der TV die Hauptansicht im Vollbild und jedes Smartphone seinen Touch-Controller.
4. **Mobile Vollbild-, Safe-Area- & Landscape-Regeln:**
   - Hintergrundbilder/-texturen dürfen randlos bis unter Notch und Home-Leiste laufen (`fixed inset-0`).
   - Alle interaktiven Bedienelemente, Joysticks, HUDs und Buttons müssen `env(safe-area-inset-top/right/bottom/left)` plus ausreichend Randabstand einhalten, damit nichts an Kanten klebt oder abgeschnitten wird.
   - Vollbild-Spiele blenden unnötige Plattform-Header aus und bieten einen klaren `EXIT`- oder `OPTIONEN`-Button oben rechts.

---

## 4. Multiplayer-, Netzwerk- & Performance-Regeln

1. **Keine Typ-Duplikate:** Alle Socket-Payloads, Lobby- und Spielzustände stammen ausschließlich aus `@projektbox/shared`.
2. **Kein `useState` in 60-FPS-Game-Loops:**
   - Three.js-/Canvas-Schleifen (`requestAnimationFrame`) lesen und schreiben über `useRef` bzw. lokale mutable Entities.
   - React-HUDs und Socket-State-Syncs (`emitZombieState` o. Ä.) werden gedrosselt aktualisiert (~10–15 Hz), nicht mit 60 FPS.
3. **Reconnect-Sicherheit in `useEffect`:**
   - `useEffect`-Hooks, die ein Spielfeld oder eine 3D-Szene initialisieren, dürfen **`players` oder `isGameOver` niemals direkt im Dependency-Array haben** (stattdessen über `useRef` lesen). Sonst setzt jeder Lobby-/Reconnect-Update das laufende Spiel zurück.
4. **Einmal-Aktionen & Input-Throttling:**
   - Controller senden keine redundanten Null-Pakete mit 25 Hz im Leerlauf (Änderungserkennung + leichter Keepalive-Heartbeat).
   - Einmal-Aktionen (`reload`, `dash`, `upgradeSkill`, `selectWeaponId`) dürfen beim Empfang neuer Bewegungs-Pakete nicht überschrieben werden, bevor der Game-Tick sie verarbeitet hat.
5. **Server-Sicherheit & Rate-Limiting:**
   - Jedes neue Socket-Event in `server/src/sockets/socketHandlers.ts` braucht Zod-Schema-Validierung und einen Eintrag im `RateLimiter` (`server/src/utils/rateLimiter.ts`).
6. **PWA Auto-Update (`apps/smartphone`):**
   - `VitePWA` bleibt auf `registerType: 'autoUpdate'` mit `skipWaiting: true` und `clientsClaim: true`, damit alle Mitspieler nach einem Deploy automatisch dieselbe Client-Version ausführen.

---

## 5. Assets, 3D-Qualität & TV-Fokus-Schutz

- **Hochwertige Assets statt Platzhalter:** Bevorzuge echte CC0-3D-Modelle (`.glb`/`.gltf`), PBR-Texturen (Poly Haven) und Game-Icons (`react-icons/gi`) gegenüber groben Standard-Boxen oder schlichten Linien-Icons.
- **Asset-Ablage:** Statische 3D-Modelle kommen synchron in `apps/tv/public/models/<game>/` und `apps/smartphone/public/models/<game>/`; UI-Texturen für Vite-Bundling in `packages/ui/src/assets/textures/<game>/`.
- **TV-Fokus-CSS-Regel:** Fokus-Regeln in `apps/tv/src/index.css` dürfen `position: relative` niemals auf Elemente mit `.fixed`, `.absolute` oder `.sticky` anwenden, da sonst schwebende Buttons in den Flex-Fluss rutschen und Vollbild-Spielfelder verschieben.

---

## 6. Test- & Workflow-Disziplin

- **Tests erweitern:** Jedes neue Spiel oder neue Spielmechanik bekommt mindestens einen End-to-End-/Logik-Test in `server/src/lobby/lobbyAndGames.test.ts`.
- **Plan bei Paket-übergreifenden Änderungen:** Bei Änderungen, die `packages/shared`, `server` und `packages/ui` gleichzeitig betreffen, zuerst die betroffenen Verträge prüfen und alle Konsumenten sauber nachziehen.
- **Keine ungeprüften Abschlüsse:** Nur Änderungen als fertig melden, nachdem `npm run build`, `npm run lint` und `npm test` nach dem letzten Edit komplett bestanden wurden.
