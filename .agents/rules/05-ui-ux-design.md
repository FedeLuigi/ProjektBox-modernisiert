---
trigger: always_on
---
# 05 – Dual-Screen UI/UX & Ergonomie

## Dual-Screen-Prinzip (TV-Bühne vs. Smartphone-Controller)
- **Full-Bleed-Bühne ohne Ränder / Letterboxing:** Spielhintergründe und Canvas-/WebGL-Bühnen müssen den gesamten verfügbaren Viewport nahtlos bis an alle Bildschirmränder füllen (dynamisches Kamera-/Viewport-Scaling oder randlos fortgeführte Hintergrund-Ebene). Separates Stacking über feste Balken, die das Spielfeld stauchen und leere Streifen erzeugen, vermeiden — HUD-Elemente schweben sauber über sicheren Randzonen oder integrieren sich nahtlos in die Szene.
- **TV-Screen (`apps/tv`):** Aus 2–3 m Entfernung sofort lesbar. Großzügige Typografie, ruhiger HUD-Streifen ohne Textwände, klare Fortschrittsbalken und keine überflüssigen Touch-Buttons auf der Bühne.
- **Smartphone-Controller (`apps/smartphone`):** Für ein- oder zweihändige Bedienung in der **Daumenzone** gebaut. Primäre Aktionen (z. B. Werfen, Springen, Schießen, Bieten) griffig und ergonomisch (`>= 48x48 px`), ohne Scrollen im Hauptspielfeld und mit `env(safe-area-inset-*)`-Abständen zu Notch und Home-Indicator.
  - **Rechtshänder-Ergonomie im Quermodus (Landscape):** Im Landscape-Modus gehört die **wichtigste / häufigste Primäraktion** auf die **rechte Seite** (dominante rechte Daumenzone); sekundäre oder situative Aktionen (z. B. Spezial-Items, Sprengung, Schild) liegen links.
  - **Grafiken direkt als Bedienelement (keine CSS-Kreise/Boxen um Sprites):** Echte Spielgrafiken (Hebel, Greifer, Waffen, Items) stehen **frei und direkt** als interaktive Schaltfläche oder auf einer authentischen diegetischen Unterlage — niemals als kleines Bildchen in einen generischen CSS-Kreis oder ein Standard-Icon-Kästchen eingesperrt.
  - **Zero „Box-in-Box“-Verschachtelung:** Keine unnötigen Rahmen und Kästen (`border` um jeden einzelnen Wert, Shop-Eintrag oder jedes Widget). Stattdessen offene, luftige Hierarchie über Abstände, dezente Trennlinien, klare Typo-Kontraste und maximal eine ruhige Haupt-Trägerfläche nutzen.
- **Fest verankerte Plattform-Navigation (`EXIT` / Menü):** Navigations-Buttons (`EXIT`, Zurück, Einstellungen) müssen **fest und bündig im Layout-Grid / in der Header-Zeile** verankert sein (mit einheitlichen Abständen zur Safe-Area) — niemals als lose darübergelegter Fremdkörper, der schief auf Spiel-Panels sitzt oder Elemente berührt.

## Lesbarkeit, Kontrast & UI-Kohärenz
- **Diegetische & stilangepasste Spieler-Identität:** Auf dem Smartphone-Controller den eigenen Namen weglassen, wenn er keinen Mehrwert bietet. Wird ein Spielername/Status angezeigt (z. B. TV-Bühne oder Team-Farbe), dann im **voll angepassten Spiel-Design** (Wappen, Porträt, Holz-/Metall-Schild) — niemals als generischer `●`-HTML-Farbpunkt.
- **Zero Fluff / Keine unnötigen Hilfstexte:** Selbsterklärende Aktions-Buttons erhalten **keine** überflüssigen Erklärungstexte darunter (wie *„Im richtigen Winkel tippen“* oder *„Zum Auslösen drücken“*). Jedes sichtbare Text-Element muss unmittelbaren Spielwert haben.
- **Silhouetten, Luminanz-Kontrast & Figur-Grund-Trennung:** Wichtige Spielobjekte müssen innerhalb von `< 200 ms` erkennbar sein. Auf dunklen oder detailreichen Hintergründen dürfen Sammelobjekte und Hindernisse niemals ebenfalls düster oder zu feinkörnig wirken — sie brauchen klare **Helligkeits- (Luminanz-) und Sättigungstrennung**, saubere Konturen sowie leuchtende Highlights für wichtige Targets.
- **Einheitliche Typo-Baseline & harmonische Ausrichtung:** Werden Display-Fonts mit Standard-UI-Fonts oder Icons in derselben Zeile/Karte kombiniert (z. B. Icon + Label + Zähler + Einheit), müssen alle Elemente über konsistente `line-height` (`leading-none`), `items-center` und harmonisch abgestimmte Schriftgrößen exakt auf einer gemeinsamen optischen Mittelachse sitzen — ohne vertikale Sprünge.
- **Barrierefreiheit:** Wichtige Zustände (Gefahr, Gewicht, Aktiv/Gesperrt, Zugrecht) niemals ausschließlich über Farbe vermitteln, sondern immer mit Icon, Form oder kurzem Label kombinieren.
- **Portrait & Landscape:** Beide Orientierungen (`landscape:` / `sm:`) aktiv unterstützen, ohne dass Inhalte abgeschnitten werden oder überlaufen (`min-h-0`, `overflow-hidden` bewusst steuern).

## Zero-Textwall-Onboarding & Direkte Rückmeldung
- Keine langen Regeltexte vor Spielstart: Steuerung und Zustand direkt im Interface durch klare Aktionslabels und kontextuelle Mikro-Hinweise vermitteln (z. B. situative Aktionstipps während des Zugs).
- Jede Benutzeraktion liefert sofortige Rückmeldung (visuelles Drück-/Aktivierungs-Feedback, optional Haptik über `triggerHapticFeedback()` und abgestimmtes Audio unter Beachtung von `isSoundEnabled()`).
