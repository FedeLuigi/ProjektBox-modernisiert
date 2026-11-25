---
trigger: always_on
---
# Architektur
- Monorepo-Grenzen aus AGENTS.md einhalten.
- Shared bleibt framework-neutral; autoritative Regeln gehören auf den Server.
- Keine duplizierten Socket-Payloads, Spieltypen oder Katalogdefinitionen.
- Zentrale Spielbalance-Parameter, Progressionskurven und Meta-Datenverträge gehören nach `packages/shared`, autoritative Auswertung und Persistenz (z. B. Rekorde/Stats) auf den Server.
- Vor Shared-Vertragsänderungen Produzenten, Konsumenten, Serialisierung und Kompatibilität prüfen.
- Spielregistrierung über Shared-Katalog, Server-Definition/Registry und UI-Renderer/Registry vollständig halten.
- Importzyklen und Querimporte aus fremden App-Ordnern vermeiden; bestehende Muster bevorzugen.
