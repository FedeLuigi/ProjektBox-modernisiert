# ProjektBox — Antigravity AI Development System

## Dateien
- AGENTS.md: Projektorientierung, Architektur, Arbeitsmodus und Abschlussregeln.
- .agents/rules/*.md: dauerhafte oder kontextabhängige Leitlinien.
- .agents/skills/<skill>/SKILL.md: wiederverwendbare Abläufe und Checklisten.
- .agents/agents/*.md: optionale Rollenprofile.

Antigravity-Versionen können Discovery und Metadaten ändern. Aktuelle Dokumentation und installierte Version prüfen. Die Dateien allein beweisen nicht, dass eine lokale Instanz sie geladen hat.

## Gewähltes Profil
- Autonomie full: selbstständige Analyse, Planung, Implementierung, Tests und Dokumentation.
- Team single: ein integrierter Entwicklerprozess; Rollenprofile sind Perspektiven.
- Deployment full-deploy: bei explizitem Auftrag autonom bis zum bestätigten Rollout. Code-Aufträge allein lösen kein Deployment aus. Sicherheits-, Datenintegritäts- und Berechtigungsstopps bleiben verbindlich.

## Einrichtung
1. Repository in Antigravity als Workspace öffnen.
2. AGENTS.md und .agents-Verzeichnis im Workspace belassen.
3. Customizations/Rules/Skills-Ansicht auf Erkennung prüfen.
4. Bei Nichterkennung Version und Discovery-Regeln prüfen.
5. Aufgaben als gewünschtes Ergebnis beschreiben; bei Deployments Zielumgebung nennen.

## Skills
project-analysis (Analyse/Plan), new-game (Spielintegration), feature-development (Features), bug-fixing (Fehlerbehebung), security-audit (Sicherheit), performance-audit (Performance), database-migration (Prisma/PostgreSQL), testing-and-qa (Verifikation), release-check (Release/Deployment).

## Permanenter Game-Development-Standard (`AGENTS.md` §10)
- **Automatische globale Spielrolle:** Bei jeder Spielaufgabe agiert der Agent automatisch als Senior Game Director, Senior Game Designer, Gameplay Engineer, Game Feel Specialist, Game UX/UI Designer, Technical Game Artist und Multiplayer Game Architect.
- **Qualitätsstandard:** Jedes Spiel erhält eine genrepassende Spielidentität, präzise Steuerung, flüssige Animationen/Game Feel, klares visuelles & akustisches Feedback, professionelles HUD, funktionierende Progression/Upgrades, ausgewogene Balance, stabile Performance und zuverlässigen Multiplayer.
- **Skill-Routing:** `.agents/skills/projectbox-skill-routing/SKILL.md` wählt bei Spielaufgaben automatisch `new-game`, `game-ui-ux`, `game-feel`, `performance-optimization`, `create-game-assets`, `threejs-*` und `testing-and-qa`/`test-quality` aus.
- **Qualitätsprüfung:** Kompilieren/Starten allein reicht nicht; Gameplay, Steuerung, Feedback, Upgrades, UI und Zielgeräte (TV & Smartphone) müssen vor Abschluss geprüft sein.

## ProjektBox-Hinweise
- `npm run build` baut Shared, TV, Smartphone und Server.
- `npm run lint` prüft `apps/tv`, `apps/smartphone`, `packages/shared`, `packages/ui` und `server`.
- `npm test` baut Shared und führt Server-Lobby- und Database-Tests aus.
- Spielanzahl/Features aus aktuellem Code/Katalog ableiten, nicht aus möglicherweise veralteten README-Angaben.
- PWA autoUpdate garantiert keine atomare Versionsgleichheit aller Clients.

## Wartung
Bei Änderungen an Workspaces, Scripts, Socket-Verträgen, Spielregistrierung, Deployment oder Datenbanktechnik Rules/Skills aktualisieren. Keine Secrets in Git/Logs. Statusberichte geben reale Prüfergebnisse wieder.
