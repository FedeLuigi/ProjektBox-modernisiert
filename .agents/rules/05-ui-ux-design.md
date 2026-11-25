---
trigger: always_on
---
# 05 – Dual-Screen UI/UX & Ergonomie

## Dual-Screen-Prinzip (TV-Bühne vs. Smartphone-Controller)
- **Full-Bleed-Bühne ohne Ränder / Letterboxing:** Spielhintergründe und Canvas-/WebGL-Bühnen müssen den gesamten verfügbaren Viewport nahtlos bis an alle Bildschirmränder füllen (dynamisches Kamera-/Viewport-Scaling oder randlos fortgeführte Hintergrund-Ebene). Separates Stacking über feste Balken, die das Spielfeld stauchen und leere Streifen erzeugen, vermeiden — HUD-Elemente schweben sauber über sicheren Randzonen oder integrieren sich nahtlos in die Szene.
- **TV-Screen (`apps/tv`):** Aus 2–3 m Entfernung sofort lesbar. Großzügige Typografie, ruhiger HUD-Streifen ohne Textwände, klare Fortschrittsbalken und keine überflüssigen Touch-Buttons auf der Bühne.
- **Smartphone-Controller (`apps/smartphone`):** Für ein- oder zweihändige Bedienung in der **Daumenzone** gebaut. Primäre Aktionen (z. B. Werfen, Springen, Schießen, Bieten) griffig und ergonomisch (`>= 48x48 px`), ohne Scrollen im Hauptspielfeld und mit `env(safe-area-inset-*)`-Abständen zu Notch und Home-Indicator.
  - **Thematische Spiel-Bedienelemente statt Standard-Web-UI:** Controller, Shops und Aktions-Decks dürfen niemals wie generische CSS-Button-Felder oder Web-Formulare aussehen und nicht zu leeren „Giant-Flat-Boxes“ aufgeblasen werden. Sie nutzen zum Spiel passende **Grafiken, Texturen/Materialien (z. B. Holz, Metall, Pergament, Filz) und spielspezifisch illustrierte Bedienelemente** (Hebel, Zünder, Item-Grafiken, Karten), sodass TV-Bühne und Controller wie ein einziges Spiel wirken.
  - **Zero „Box-in-Box“-Verschachtelung:** Keine unnötigen verschachtelten Rahmen und Kästen (`border` um jeden einzelnen Wert, Namen oder jedes Widget). Stattdessen offene, luftige Hierarchie über Abstände, dezente Trennlinien, klare Typo-Kontraste und maximal eine ruhige Haupt-Trägerfläche nutzen.
- **Kollisionsfreie Plattform-Schutzzone (`EXIT` / Menü):** Floating Plattform-Buttons (`EXIT`, Menü, Ton) dürfen **niemals** HUD-Icons, Zähler oder Buttons berühren oder überlappen — auch nicht im Smartphone-Landscape-Modus mit Notch/Safe-Area. Verbindlich ausreichend Abstand reservieren (z. B. `pl-28` inkl. `env(safe-area-inset-left)` oder eigene klare HUD-Zone außerhalb des Floating-Button-Bereichs).

## Lesbarkeit, Kontrast & UI-Kohärenz
- **Diegetische & stilangepasste UI-Elemente:** Spieler-Namen, Scores, Status-Badges und Panels müssen dieselbe visuelle Designsprache (Farbpalette, Materialität, Rahmen, Typografie) wie das Spiel selbst sprechen — keine generischen Standard-Pills oder fremden Dark-Boxen auf einem thematischen Spiel.
- **Präzise Verankerung:** Spielerbezogene Infos (Name, Punktestand, Zug-Indikator) werden sauber zentriert direkt am zugehörigen Spielobjekt/Slot oder in einem symmetrisch ausgerichteten Ecken-Grid platziert, niemals verloren oder deplatziert im freien Raum.
- **Silhouetten, Luminanz-Kontrast & Figur-Grund-Trennung:** Wichtige Spielobjekte müssen innerhalb von `< 200 ms` erkennbar sein. Auf dunklen oder detailreichen Hintergründen dürfen Sammelobjekte und Hindernisse niemals ebenfalls düster oder zu feinkörnig wirken — sie brauchen klare **Helligkeits- (Luminanz-) und Sättigungstrennung**, saubere Konturen sowie leuchtende Highlights für wichtige Targets.
- **Einheitliche Typo-Baseline & harmonische Ausrichtung:** Werden Display-Fonts mit Standard-UI-Fonts oder Icons in derselben Zeile/Karte kombiniert (z. B. Icon + Label + Zähler + Einheit), müssen alle Elemente über konsistente `line-height` (`leading-none`), `items-center` und harmonisch abgestimmte Schriftgrößen exakt auf einer gemeinsamen optischen Mittelachse sitzen — ohne vertikale Sprünge.
- **Barrierefreiheit:** Wichtige Zustände (Gefahr, Gewicht, Aktiv/Gesperrt, Zugrecht) niemals ausschließlich über Farbe vermitteln, sondern immer mit Icon, Form oder kurzem Label kombinieren.
- **Portrait & Landscape:** Beide Orientierungen (`landscape:` / `sm:`) aktiv unterstützen, ohne dass Inhalte abgeschnitten werden oder überlaufen (`min-h-0`, `overflow-hidden` bewusst steuern).

## Zero-Textwall-Onboarding & Direkte Rückmeldung
- Keine langen Regeltexte vor Spielstart: Steuerung und Zustand direkt im Interface durch klare Aktionslabels und kontextuelle Mikro-Hinweise vermitteln (z. B. situative Aktionstipps während des Zugs).
- Jede Benutzeraktion liefert sofortige Rückmeldung (visuelles Drück-/Aktivierungs-Feedback, optional Haptik über `triggerHapticFeedback()` und abgestimmtes Audio unter Beachtung von `isSoundEnabled()`).
