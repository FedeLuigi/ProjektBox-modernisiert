---
trigger: always_on
---
# 03 – Modulares Studio Game Engineering

Gilt automatisch, **spiel- und genreunabhängig** für jedes neue oder bestehende Spiel und jede Erweiterung. Handle dabei als integriertes Entwicklerstudio (Game Director, Game Designer, Gameplay Engineer, Game Feel Specialist, UX/UI Designer, Technical Artist, Audio Designer, Multiplayer Architect, QA Engineer).

## Studio-Produktionsplan (Gate 0 bis Gate 5)
Jedes neue Spiel (und analog jede größere Spielerweiterung) durchläuft diese festen Studio-Phasen. Keine Phase wird übersprungen, und **kein Gate ist bestanden, solange sein Exit-Kriterium offen ist**:

- **Gate 0 – Greenlight & Benchmark-Recherche:**
  - 2–3 erfolgreiche Genre-Referenzen sowie öffentliche Game-Design-Analysen, Mechanik-, Physik- und UX-Anleitungen recherchieren und auswerten.
  - Core-Loop, Spielziel, Dual-Screen-Rollen (TV-Bühne vs. Smartphone-Controller 2..N), Steuerungsmodell und Scope festlegen.
  - *Exit-Kriterium:* Klares Spielkonzept ohne unklare Kernregeln.
- **Gate 1 – Asset-, Audio- & Tech-Scouting:**
  - Echte, lizenzfreie 2D-/3D-Assets (CC0-Sprites, 3D-Modelle, PBR-Texturen, UI-Kits) und passende Open-Source-Bibliotheken auswählen statt improvisierter Primitiv-Platzhalter; Lizenzen und Zielpfade (`apps/*/public/models/<game>/`, `packages/ui/src/assets/...`) festlegen.
  - Passende Render-/Engine-Architektur wählen (DOM/SVG, Canvas, PixiJS oder Three.js) und `React.lazy`-Code-Splitting vorsehen.
  - *Exit-Kriterium:* Asset-Paket und Tech-Stack stehen fest.
- **Gate 2 – Spielbarer Vertical Slice (Kern-Loop zuerst):**
  - Zuerst Shared-Vertrag (`packages/shared`), autoritative Server-Basis (`server/`) und den **reinen spielbaren Kern-Loop** mit präziser Steuerung und erstem Game Feel bauen — *bevor* Shops, Menüs, Varianten oder Content-Masse ergänzt werden.
  - *Exit-Kriterium:* Der Kern macht für sich allein spielerisch Sinn und fühlt sich reaktionsschnell an.
- **Gate 3 – Full Production (Systeme, Art Direction, HUD & Audio):**
  - Alle zum Spielprinzip passenden Systeme ausbauen (Progression, Upgrades, Balance-Kurven in `packages/shared`, UI/HUD ohne Plattform-Header, schwebendes Spielmenü, Safe-Areas, TV-Fokus, Farbkontrast/Barrierefreiheit, Audio-Mix & Haptik).
  - *Exit-Kriterium:* Alle Features haben echte Gameplay-Wirkung (keine Attrappen).
- **Gate 4 – Multiplayer-, Bot- & Reconnect-Hardening:**
  - Gleichzeitiges Spiel aller Teilnehmer (`2..N` + TV), Serverautorität, `sanitizeLobbyForClient`, Bot-KI, Disconnect/Reconnect, Host-Wechsel und Idempotenz absichern.
  - *Exit-Kriterium:* Stabile Synchronisation und vollständige Server-Tests.
- **Gate 5 – Studio QA & Gold Master:**
  - Vollständiges Match durchprüfen (Start → Midgame → Systeme/Upgrades → Spielende → Revanche → Reconnect), Ressourcen-Cleanup (`dispose()`/`destroy()`) sowie `build`, `lint` und `test` bestehen.
  - *Exit-Kriterium:* Produktionsreifer Zustand; nicht geprüfte visuelle Gerätetests ehrlich dokumentieren.

## Zuschaltbare Fach-Module (Werkzeugkasten für Gate 2–4)
- **Modul A – Echtzeit, Physik & Action:** Delta-Time clampen, Input-Buffering & faire Toleranzen nutzen; 60-FPS-Loops über Refs/Engine-State statt React-`useState` treiben; Screen-Shake, Hit-Stop/Flash, Knockback und Partikel gezielt für Game Feel einsetzen.
- **Modul B – Ökonomie, Upgrades & Progression:** Balance-Parameter zentral in `packages/shared` pflegen; jedes Upgrade/Item muss spürbare Gameplay-Wirkung haben, serverseitig validiert werden und Reconnects überstehen.
- **Modul C – 3D / WebGL / Canvas / PixiJS:** Geometrien, Materialien, Texturen, Meshes und Texte poolen (keine Per-Frame-Allokationen); bei Szenenwechsel/Unmount alles vollständig über `dispose()`/`destroy()` freigeben.
- **Modul D – Runden-, Wort-, Quiz- & Kartenspiele:** Phasenübergänge und Timer serverseitig absichern, Clock-Skew-Retries zulassen und geheime Daten pro Empfänger trennen.
- **Modul E – Audio, Haptik & Barrierefreiheit:** Globale `isSoundEnabled()`- und `triggerHapticFeedback()`-Einstellungen strikt beachten; SFX/Musik ausgewogen mischen; wichtige Infos nie nur über Farbe vermitteln; TV-Lesbarkeit auf Distanz sicherstellen; keine Mischsprache.
- **Modul F – Performance-Budgets:** Schwächere Smartphones und TV-Browser berücksichtigen; große Spielmodule per `React.lazy` nachladen; 0 geleakte Listener, Timer oder GPU-Objekte.
