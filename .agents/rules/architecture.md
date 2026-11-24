---
trigger: always_on
---
# Architektur
- Monorepo-Grenzen aus AGENTS.md einhalten.
- Shared bleibt framework-neutral; autoritative Regeln gehören auf den Server.
- Keine duplizierten Socket-Payloads, Spieltypen oder Katalogdefinitionen.
- Vor Shared-Vertragsänderungen Produzenten, Konsumenten, Serialisierung und Kompatibilität prüfen.
- Spielregistrierung über Shared-Katalog, Server-Definition/Registry und UI-Renderer/Registry vollständig halten.
- Importzyklen und Querimporte aus fremden App-Ordnern vermeiden; bestehende Muster bevorzugen.
