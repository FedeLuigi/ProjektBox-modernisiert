---
trigger: always_on
---
# 03 – Modulares Game Engineering

Gilt automatisch, **spiel- und genreunabhängig** für jedes neue oder bestehende Spiel und jede Erweiterung. Handle dabei als integriertes Studio-Team (Game Director, Game Designer, Gameplay Engineer, Game Feel Specialist, UX/UI Designer, Technical Artist, Multiplayer Architect).

## Basis-Pipeline (immer aktiv)
1. **Referenz & Benchmark:** Vor dem Bauen erfolgreiche Genre-Referenzen, öffentliche Game-Design-Analysen und Mechanik-/UX-Anleitungen recherchieren und vergleichen — keine ungefähren Nachbauten aus dem Kopf.
2. **Pre-Production & Vertical Slice:** Core-Loop, Spielziel und Einstieg (ohne Textwände) definieren; zuerst den spielbaren Kern inkl. Spielgefühl umsetzen, bevor Content skaliert wird.
3. **Echte öffentliche Assets:** Statt aus geometrischen Primitiven zusammengebastelter Platzhalter hochwertige, lizenzfreie 2D-/3D-Assets (CC0-Sprites, 3D-Modelle, PBR-Texturen, UI-Pakete) und Open-Source-Bibliotheken einbinden und inkl. Lizenz und sauberem Ablagepfad (`apps/*/public/models/<game>/` bzw. `packages/ui/src/assets/...`) dokumentieren.
4. **Dual-Screen-Ergonomie:** Jedes Spiel muss auf TV-Bühne (`isTvScreen`) und auf Smartphones aller Teilnehmer (`2..N`, nicht nur Host/Spieler 1) vollständig bedienbar sein — inklusive `env(safe-area-inset-*)`, Touch-Zielen und TV-Fokusnavigation.

## Zuschaltbare Fach-Module (nur aktivieren, wenn zum Spiel/Feature passend)
- **Modul A – Echtzeit, Physik & Action:** Delta-Time clampen, Input-Buffering & faire Toleranzen nutzen; 60-FPS-Loops über Refs/Engine-State statt React-`useState` treiben; Screen-Shake, Hit-Stop/Flash, Knockback und Partikel gezielt für Game Feel einsetzen.
- **Modul B – Ökonomie, Upgrades & Progression:** Balance-Parameter zentral in `packages/shared` pflegen; jedes Upgrade/Item muss spürbare Gameplay-Wirkung haben, serverseitig validiert werden und Reconnects überstehen.
- **Modul C – 3D / WebGL / Canvas / PixiJS:** Geometrien, Materialien, Texturen, Meshes und Texte poolen (keine Per-Frame-Allokationen); bei Szenenwechsel/Unmount alles vollständig über `dispose()`/`destroy()` freigeben.
- **Modul D – Runden-, Wort-, Quiz- & Kartenspiele:** Phasenübergänge und Timer serverseitig absichern, Clock-Skew-Retries zulassen und geheime Daten pro Empfänger trennen.
- **Modul E – Audio, Haptik & Barrierefreiheit:** Globale `isSoundEnabled()`- und `triggerHapticFeedback()`-Einstellungen strikt beachten; SFX/Musik ausgewogen mischen; wichtige Infos nie nur über Farbe vermitteln; TV-Lesbarkeit auf Distanz sicherstellen.
- **Modul F – Performance-Budgets:** Schwächere Smartphones und TV-Browser berücksichtigen; große Spielmodule per `React.lazy` nachladen; 0 geleakte Listener, Timer oder GPU-Objekte.
