---
trigger: model_decision
---
# Multiplayer und Socket.IO
Bei Lobby-, Session-, Reconnect-, Socket- oder synchronisiertem State anwenden.
- Verträge in packages/shared und Handler/Schemas in server/src/sockets prüfen.
- Aktionen dem authentisierten Spieler und der richtigen Lobby zuordnen.
- Disconnects, Reconnects, doppelte/verspätete Events und parallele Eingaben behandeln.
- Zustandsänderungen soweit möglich idempotent gestalten.
- Rate, Payload-Größe und Werte begrenzen; Einmal-Aktionen nicht durch Bewegungsupdates verlieren.
- Nur notwendige Zustandsänderungen senden; Broadcasts und React-Updates drosseln.
- Optimistische Client-Reaktion und sanfte Interpolation/Smoothing bei 10–15 Hz Sync einsetzen, um Rubber-Banding zu vermeiden; Bot-KI mit nachvollziehbarem, fairem Timing statt reinem Zufall gestalten.
- Server-State bleibt autoritativ; neue Abläufe mit Tests absichern.
