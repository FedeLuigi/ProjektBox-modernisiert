---
trigger: model_decision
---
# Performance
- Bei Rendering, Animation, Socket-Sync, Assets oder Performance-Bugs anwenden.
- Engpass zuerst messen/profilieren und Zielplattform/Szenario benennen.
- Keine React-State-Updates pro Frame; Refs/Engine-State für häufige Mutationen.
- Socket-Nachrichten nur bei Änderungen oder notwendigem Heartbeat senden.
- 3D-Assets/Texturen bedarfsgerecht laden und Ressourcen freigeben.
- Re-Renders, Objektneuerzeugung in Hot Paths und teure Render-Berechnungen vermeiden.
- Schwächere Smartphones, TV-Browser, Speicher und Netzwerk-Latenz berücksichtigen.
- Klare Performance-Budgets einhalten: stabile Ziel-Framerate auf TV/Desktop und Mobilgeräten, begrenzte Bundle-/Texturgrößen (Code-Splitting per `React.lazy`) und 0 geleakte GPU-, Audio-, Timer- oder Listener-Ressourcen nach Spielende.
- Korrektheit und Accessibility nicht zugunsten von FPS opfern; Trade-offs dokumentieren.
