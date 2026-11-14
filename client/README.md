# 📱 ProjektBox Client – Frontend & PWA

Das Frontend von **ProjektBox** ist eine hochmoderne, mobile-optimierte **Progressive Web App (PWA)**, entwickelt mit React 19, TypeScript, Vite 8 und Tailwind CSS v4.

---

## 📋 Inhaltsverzeichnis

- [🛠 Tech-Stack](#-tech-stack)
- [📁 Ordnerstruktur](#-ordnerstruktur)
- [📲 PWA & Mobile-First Features](#-pwa--mobile-first-features)
- [💎 Crystal UI & Design System](#-crystal-ui--design-system)
- [🔊 Audio- & Haptik-Engine](#-audio---haptik-engine)
- [👤 Avatar- & Profil-System](#-avatar---profil-system)
- [⚡ Socket.io Service & Multiplayer](#-socketio-service--multiplayer)
- [🎮 Neues Spiel im Frontend hinzufügen](#-neues-spiel-im-frontend-hinzufügen)
- [🚀 Nützliche Befehle](#-nützliche-befehle)

---

## 🛠 Tech-Stack

- **Framework:** [React 19](https://react.dev/) mit Hooks & moderner State-Verwaltung
- **Build-Tool:** [Vite 8](https://vite.dev/) für blitzschnelles Hot Module Replacement (HMR)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) mit `@tailwindcss/vite`
- **Typisierung:** [TypeScript](https://www.typescriptlang.org/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Echtzeit-Netzwerk:** [Socket.io Client](https://socket.io/)
- **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) mit Google Workbox
- **QR-Codes:** `qrcode` (Erstellung) und `jsqr` (Kamera-Scanner)
- **Linter:** [Oxlint](https://oxc.rs/) für ultraschnelle statische Code-Analyse

---

## 📁 Ordnerstruktur

```text
client/
├── public/                  # Statische Assets, App-Icons (192x192, 512x512) & Favicon
├── src/
│   ├── components/          # Allgemeine UI-Komponenten
│   │   ├── multiplayer/     # Multiplayer- & TV-spezifische Views
│   │   │   ├── ConnectionStatusBadge.tsx  # Statusanzeige der WebSocket-Verbindung
│   │   │   ├── InLobbyView.tsx            # Wartezimmer mit Spielerliste & Ready-Button
│   │   │   ├── LobbyGameSettingsModal.tsx # Spieleinstellungen vor Rundenstart
│   │   │   ├── LobbyScreen.tsx            # Haupt-Lobbyansicht (Erstellen / Beitreten)
│   │   │   ├── MultiplayerGameView.tsx    # Container für aktive Multiplayer-Runden
│   │   │   ├── QrScannerModal.tsx         # Kamera-Scanner für schnellen QR-Beitritt
│   │   │   ├── TvGameView.tsx             # Zuschauer- und Board-Bildschirm für TV-Host
│   │   │   ├── TvJoinModal.tsx            # Beitritts-Dialog für TV-Partys
│   │   │   └── TvLobbyView.tsx            # TV-Wartezimmer mit animiertem QR-Code
│   │   ├── Avatar.tsx                     # SVG-basierter Avatar-Renderer
│   │   ├── AvatarCustomizerModal.tsx      # Modal zur Gestaltung des eigenen Spielers
│   │   ├── BackgroundCometCanvas.tsx      # Animierte Kometen- & Sternenpartikel
│   │   ├── CrystalUI.tsx                  # Buttons, Panels, Stat-Bars im Crystal-Look
│   │   ├── GameCard.tsx                   # Große Spielkarten mit Vorschau, Dauer & Favoriten
│   │   ├── GamePreviewArtwork.tsx         # Maßgeschneiderte SVG-Spielvorschauen (Hero & Card)
│   │   ├── IslandBackground.tsx           # Dekorative Hintergrund-Landschaft
│   │   ├── SettingsSheet.tsx              # Audio-, Haptik- & Spielerprofil-Einstellungen
│   │   └── SplashScreen.tsx               # Willkommens- und Ladebildschirm
│   │
│   ├── data/
│   │   └── games.ts         # Metadaten der Multiplayer-Spiele (Spieltyp, Spielerzahl, Dauer)
│   │
│   ├── games/
│   │   ├── components/      # Spiel-Boards der Multiplayer-Spiele
│   │   │   ├── ConnectFourBoard.tsx       # Vier gewinnt Board
│   │   │   ├── DrawAndGuessBoard.tsx      # Zeichenfläche & Rate-Chat für Montagsmaler
│   │   │   ├── GenericDuelBoard.tsx       # Fallback-Board für Duelle
│   │   │   └── TicTacToeBoard.tsx         # 3×3 Tic Tac Toe Gitter
│   │   └── registry.ts      # Mapping von Game-IDs auf Komponenten
│   │
│   ├── services/
│   │   └── socket.ts        # Singleton-Service für die Socket.io Verbindung
│   │
│   ├── utils/
│   │   ├── qrCodeHelper.ts  # Deep-Link URL-Parsing & QR-Code Generierung
│   │   ├── soundEffects.ts  # Web Audio Synthesizer für Soundeffekte
│   │   └── userProfile.ts   # Lokale Profil-Speicherung & Avatar-Generierung
│   │
│   ├── types/
│   │   └── multiplayer.ts   # Client-Typdefinitionen für Lobbys & Spieler
│   │
│   ├── App.tsx              # Haupt-Karussell, State-Machine & Modals
│   ├── main.tsx             # React Bootstrapping mit PWA-Registrierung
│   └── index.css            # Globale Styles & Tailwind CSS Integration
│
├── vite.config.ts           # Vite- und PWA-Konfiguration mit Proxy
└── package.json
```

---

## 📲 PWA & Mobile-First Features

- **Installierbar**: Erkennt `beforeinstallprompt` und bietet eine nahtlose Ein-Klick-Installation auf Smartphones und Desktops.
- **Display Mode**: Vollbild (`fullscreen`, `standalone`, `window-controls-overlay`) ohne störende Browser-Leisten.
- **Safe Area Insets**: Berücksichtigt iOS Dynamic Island, Notches und Home-Balken via `env(safe-area-inset-*)`.
- **Gesten-Optimierung**: Verhindert unabsichtliches Zoomen (Double-Tap Zoom) und ungewolltes Pull-to-Refresh beim Spielen auf Touchscreens.
- **Caching-Strategien (Workbox)**:
  - HTML/Dokumente: `NetworkFirst` (mit Offline-Fallback nach 7 Tagen).
  - Skripte, Stylesheets und Bilder: `StaleWhileRevalidate` (30 Tage Cache für blitzschnelle Ladezeiten).

---

## 💎 Crystal UI & Design System

ProjektBox nutzt eine konsistente, futuristische Arcade-Designsprache:

- **Farbschema & Akzente**:
  - `amber`: Warme Töne für Memory & Arcade.
  - `coral`: Kräftiges Orange für intensive Duelle (Vier gewinnt).
  - `emerald`: Frisches Grün für Reaktionsspiele & Snake.
  - `violet`: Tiefes Lila für Taktikspiele wie Tic Tac Toe.
  - `rose`: Verspieltes Pink für Zeichnen & Raten.
  - `gold`: Luxuriöses Gold für Puzzle (2048).
  - `indigo`: Dunkelblau für Logik & Minenfeld.
  - `cyan`: Kosmisches Cyan für Space Dodge.
- **Wiederverwendbare Crystal-Komponenten**:
  - `CrystalButton`: Dreidimensional wirkende Buttons mit Klick-Sound und Haptik.
  - `CrystalPanel`: Glassmorphismus-Container mit farbigen Neon-Akzenten.
  - `CrystalReadout` & `CrystalStatBar`: Retro-Displays für Rundenzeiten, Punkte und Codes.

---

## 🔊 Audio- & Haptik-Engine

ProjektBox benötigt keine schweren MP3-Dateien für Sound-Effekte:

- **Web Audio Synthesizer (`src/utils/soundEffects.ts`)**:
  - Nutzt `AudioContext` und Oszillatoren (Sinus, Sägezahn, Dreieck) zur dynamischen Echtzeit-Klangsynthese.
  - Vordefinierte Sounds: `playClickSound`, `playCardFlipSound`, `playSuccessSound`, `playWinSound`, `playErrorSound`, `playGameOverSound`.
  - Global in den Einstellungen stummschaltbar.
- **Vibration API**:
  - Taktiles Feedback bei Tastendrücken, Treffern und Spielsiegen.
  - Einstellbar und auf Geräten ohne Vibrationsmotor sicher abgefangen.

---

## 👤 Avatar- & Profil-System

Jeder Spieler erhält beim ersten Öffnen automatisch ein einzigartiges lokales Profil (`localStorage`):

- Zufällige, freundliche Spielernamen (z. B. *GalacticFox*, *NeonPanda*, *CyberKitten*).
- SVG-generierter Avatar mit anpassbaren Eigenschaften:
  - Frisuren & Mützen
  - Augen- & Mundausdrücke
  - Accessoires (Sonnenbrillen, Kronen, Kopfhörer)
  - Farben für Haut und Kleidung
- Die Avatar-Konfiguration wird bei jedem Lobby-Beitritt automatisch an Mitspieler und TV übertragen.

---

## ⚡ Socket.io Service & Multiplayer

Der zentrale `SocketService` (`src/services/socket.ts`) verwaltet die Echtzeitverbindung:

- **Singleton Pattern**: Nur eine aktive WebSocket-Verbindung pro Tab.
- **Automatischer Reconnect**: Erkennt Verbindungsabbrüche und stellt die Verbindung bei Netzwerkwiederkehr sofort wieder her.
- **Custom Server URL**: In den Einstellungen kann bei Bedarf eine alternative Backend-URL eingetragen werden.
- **Typisierte Methoden**:
  - `createLobby(name, isPrivate, gameId, isTvMode)`
  - `joinLobby(code)`
  - `sendMove(moveData)`
  - `emitStrokes(strokes)` & Canvas-Synchronisation für Zeichnen & Raten

---

## 🎮 Neues Spiel im Frontend hinzufügen

Um ein neues Spiel im Client anzulegen:

1. **Metadaten definieren (`src/data/games.ts`)**:
   Füge dein Spiel zum `GAMES`-Array hinzu mit `id`, `title`, `description`, `icon`, `category` und `accent`.
2. **Board-Komponente erstellen (`src/games/components/MyGameBoard.tsx`)**:
   Erstelle deine Spielansicht. Das Board erhält Props für den Spielstand, Spielerdaten und Callbacks für Züge.
3. **In der Registry eintragen (`src/games/registry.ts`)**:
   Verknüpfe die Spiel-ID mit der neuen Komponente:
   ```typescript
   clientGameRegistry.register('my-game-id', MyGameBoard);
   ```

---

## 🚀 Nützliche Befehle

| Befehl | Beschreibung |
| :--- | :--- |
| `npm run dev` | Startet den Vite-Entwicklungsserver mit Hot-Reloading unter Port 5173. |
| `npm run build` | Kompiliert TypeScript (`tsc -b`) und baut die PWA für die Produktion (`dist/`). |
| `npm run lint` | Führt den schnellen Oxlint-Linter über alle Frontend-Dateien aus. |
| `npm run preview` | Startet einen lokalen Server zur Vorschau des Produktions-Builds. |
