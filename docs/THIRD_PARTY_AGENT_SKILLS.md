# Integrierte Agent Skills – Quellen und Lizenzen

Ausgewählte Original-Skills wurden in `.agents/skills/` integriert. Die ausgewählten Originaldateien `SKILL.md` bleiben unverändert. Optionale Upstream-Referenzdateien
wurden in diesem ersten Import bewusst nicht mitkopiert, um die Integration schlank zu halten; die ProjektBox-spezifische Auswahl steht in
`.agents/skills/projectbox-skill-routing/SKILL.md`.

## Game development
- Quelle: https://github.com/gamedev-skills/awesome-gamedev-agent-skills
- Integriert: `game-ui-ux`, `game-feel`, `performance-optimization`,
  `create-game-assets`, `threejs-scene-setup`, `threejs-materials-lighting`,
  `threejs-gltf-loading`
- Lizenz: Apache License 2.0; Copyright- und Attribution-Hinweise siehe LICENSE und NOTICE
  unter `docs/licenses/`.

## Frontend engineering
- Quelle: https://github.com/danielteles/awesome-agent-skills
- Integriert: `core-typescript`, `architecture-and-design`, `react`, `accessibility`,
  `styling-and-design-tokens`, `web-performance`, `test-quality`, `e2e-testing`,
  `component-api-design`, `frontend-code-review`
- Lizenz: Creative Commons Attribution 4.0 International (CC BY 4.0); Autor: danielteles.
  Lizenztext unter `docs/licenses/`.

## Hinweise
- Antigravity-Projekt-Skills liegen unter `.agents/skills/<skill-name>/SKILL.md`.
- Referenzdateien liegen im jeweiligen `references/`-Unterordner.
- Engine-spezifische Beispiele anderer Engines sind keine ProjektBox-Vorgaben.
- Maßgeblich bleiben `AGENTS.md`, Projektregeln, package manifests und installierte APIs.
- Vor Upstream-Updates Lizenz, Referenzpfade und Projektkompatibilität erneut prüfen.
