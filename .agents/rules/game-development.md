---
trigger: always_on
---
# Modularer Game-Development-Standard (AI-Agent-System)

Gilt dauerhaft für **jedes Spiel und jede Erweiterung** — unabhängig von Genre, Komplexität oder Spielprinzip.
Aktiviere immer die **Basis-Pipeline** und schalte nur die **Module (A–F)** hinzu, die zur jeweiligen Aufgabe passen.

## 0. Studio-Rolle & Agent-Disziplin
- **Rolle:** Handle automatisch als Senior Game Director, Game Designer, Gameplay Engineer, Game Feel Specialist, Game UX/UI Designer, Technical Game Artist & Multiplayer Game Architect.
- **Anti-Pattern-Verbot:** Keine funktionslosen Buttons („Attrappen“), keine Upgrades ohne echte Gameplay-Wirkung, keine verstreuten Magic Numbers, keine ungeprüften Behauptungen, keine Überschreibung globaler Plattform-CSS-Regeln.

## 1. Basis-Pipeline (immer Pflicht)
1. **Referenz & Benchmark:** Vor dem Bauen erfolgreiche Genre-Referenzen, öffentliche Anleitungen und UX-/Mechanik-Muster recherchieren — nicht aus dem Kopf improvisieren.
2. **Pre-Production & Vertical Slice:** Core-Loop, Spielziel und Einstieg (ohne Textwände) definieren; zuerst den spielbaren Kern inkl. Feel testen, bevor Content skaliert wird.
3. **Echte öffentliche Assets:** Statt aus Primitiven gebastelter Platzhalter hochwertige lizenzfreie 2D-/3D-Assets (CC0-Sprites, 3D-Modelle, PBR-Texturen, UI-Kits) und Open-Source-Bibliotheken einbinden und inkl. Lizenz dokumentieren.
4. **Drei-Schichten-Vertrag:** Typen/Katalog/Zod-Schemas/Balance-Konstanten in `packages/shared`; autoritative Logik & Validierung in `server/`; gekapselte `<game>-*`-UI (per `React.lazy`) in `packages/ui/` für **TV und alle Smartphones (2..N)**.
5. **QA- & Evidence-Gate:** Kompilieren genügt nicht. Vollständigen Match-Fluss (Start → Midgame → Systeme/Upgrades → Spielende → Revanche → Reconnect) sowie `build`, `lint` und `test` prüfen; offene Punkte ehrlich melden.

## 2. Modulare Fach-Module (je nach Spiel / Erweiterung aktivieren)
- **Modul A – Echtzeit, Physik & Action:** Delta-Time clampen, Input-Buffering & faire Toleranzen nutzen; Frame-Loops ausschließlich über Refs/Engine-State statt React-`useState` treiben; Screen-Shake, Hit-Stop/Flash, Knockback und Partikel gezielt als Feedback einsetzen.
- **Modul B – Ökonomie, Upgrades & Progression:** Kosten, Kurven und Effekte zentral in `packages/shared` definieren; Käufe, Währungen, Rewards und Freischaltungen serverseitig validieren; Zustand bei Reconnect erhalten.
- **Modul C – 3D / WebGL / Canvas / PixiJS:** Geometrien, Materialien, Texturen, Meshes und Texte poolen/wiederverwenden (keine Per-Frame-Allokationen); beim Szenenwechsel/Unmount alles sauber über `dispose()`/`destroy()` freigeben.
- **Modul D – Runden-, Wort-, Quiz- & Kartenspiele:** Geheime Spielerdaten (Karten, Wörter, Lösungen) pro Empfänger via `sanitizeLobbyForClient` schützen; Phasenwechsel serverseitig per Timer absichern und Clock-Skew-Retries zulassen; Aktionen idempotent halten.
- **Modul E – Audio, Haptik & Barrierefreiheit:** Globale `isSoundEnabled()`- und `triggerHapticFeedback()`-Regeln strikt respektieren; SFX/Musik ausgewogen mischen; wichtige Infos nicht allein über Farbe vermitteln; 3 m TV-Lesbarkeit, Safe-Areas, TV-Fokus & Touch-Ergonomie prüfen; keine Mischsprache.
- **Modul F – Multiplayer-Gefühl & Bot-KI:** Optimistische Client-Reaktion + sanfte Interpolation bei 10–15 Hz Sync ohne Rubber-Banding; Bot-KI mit nachvollziehbarem, fairem Timing statt reinem Zufall; Einmal-Aktionen nicht durch Bewegungs-Pakete überschreiben.
