---
trigger: always_on
---
# 05 – Dual-Screen UI/UX & Ergonomie

## Dual-Screen-Prinzip (TV-Bühne vs. Smartphone-Controller)
- **TV-Screen (`apps/tv`):** Aus 2–3 m Entfernung sofort lesbar. Großzügige Typografie, ruhiger HUD-Streifen ohne Textwände, klare Fortschrittsbalken und keine überflüssigen Touch-Buttons auf der Bühne.
- **Smartphone-Controller (`apps/smartphone`):** Für ein- oder zweihändige Bedienung in der **Daumenzone** gebaut. Primäre Aktionen (z. B. Werfen, Springen, Schießen, Bieten) groß (`>= 48x48 px`), ohne Scrollen im Hauptspielfeld und mit `env(safe-area-inset-*)`-Abständen zu Notch und Home-Indicator.
- **Schwebende Plattform-Elemente:** Floating Exit-/Menü-Buttons dürfen niemals HUD-Zähler oder Spielbuttons überdecken (ausreichend `pl-*`/`pr-*`/`pt-*` einplanen).

## Lesbarkeit, Kontrast & Responsiveness
- **Silhouetten & Figur-Grund-Trennung:** Wichtige Spielobjekte müssen innerhalb von `< 200 ms` erkennbar sein (klare Kontur/Rim, gezielter Kontrast zum Hintergrund nach 60-30-10-Prinzip).
- **Barrierefreiheit:** Wichtige Zustände (Gefahr, Gewicht, Aktiv/Gesperrt, Zugrecht) niemals ausschließlich über Farbe vermitteln, sondern immer mit Icon, Form oder kurzem Label kombinieren.
- **Portrait & Landscape:** Beide Orientierungen (`landscape:` / `sm:`) aktiv unterstützen, ohne dass Inhalte abgeschnitten werden oder überlaufen (`min-h-0`, `overflow-hidden` bewusst steuern).

## Zero-Textwall-Onboarding & Direkte Rückmeldung
- Keine langen Regeltexte vor Spielstart: Steuerung und Zustand direkt im Interface durch klare Aktionslabels und kontextuelle Mikro-Hinweise vermitteln (z. B. situative Aktionstipps während des Zugs).
- Jede Benutzeraktion liefert sofortige Rückmeldung (visuelles Drück-/Aktivierungs-Feedback, optional Haptik über `triggerHapticFeedback()` und abgestimmtes Audio unter Beachtung von `isSoundEnabled()`).
