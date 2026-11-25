---
name: projectbox-skill-routing
description: >-
  ProjectBox-specific dispatcher for choosing imported engineering and game-development
  skills. Use at the start of substantial feature, bug-fix, UI, game, performance, or review work.
---

# ProjectBox Skill Routing

Load only the smallest relevant set of installed skills. Read each selected `SKILL.md`;
the imported `SKILL.md` is the available unit; upstream reference subfiles are not vendored in this integration. Do not assume those optional files exist locally.

## Project fingerprint

TypeScript/npm-workspaces monorepo: React 19 + Vite in `apps/tv` and `apps/smartphone`;
shared UI and Three.js game renderers in `packages/ui`; shared contracts and Zod schemas in
`packages/shared`; Express + Socket.IO + Prisma backend in `server`.

Do not route to Unity, Godot, Unreal, Phaser, or other engine instructions. The relevant game
runtime is Three.js inside React. Re-check manifests and source if this architecture changes.

## Routing table

| Task | Skills |
|---|---|
| Any TypeScript change | `core-typescript` |
| Architecture, cross-package change, state ownership | `architecture-and-design` + `core-typescript` |
| React component, hook, state, rendering | `react` + `core-typescript` |
| Shared UI component API | `component-api-design` + `react` |
| UI, navigation, HUD, modal, menu | `accessibility` + `game-ui-ux`; add `react` for implementation |
| CSS, responsive layout, design tokens | `styling-and-design-tokens` + `accessibility` |
| Loading, bundle size, rendering cost | `web-performance`; add `performance-optimization` for game loops |
| New game or full game overhaul | `new-game` + `game-ui-ux` + `game-feel` + `performance-optimization` + `testing-and-qa` (+ `threejs-*` / `create-game-assets` for 3D/visuals) |
| Any game task (gameplay, mechanics, upgrades, balance, menus, bugfix, refactoring) | `game-ui-ux` + `game-feel` + `performance-optimization` + `test-quality` (plus `threejs-*` / `create-game-assets` if 3D/assets are touched) |
| Three.js scene, lifecycle, camera, renderer | `threejs-scene-setup` |
| Three.js GLTF/GLB and animation loading | `threejs-gltf-loading` |
| Three.js materials, lights, visual quality | `threejs-materials-lighting` |
| Game feedback, impact feel, animation response | `game-feel` |
| Game art direction and asset validation | `create-game-assets` |
| Unit/integration test design | `test-quality` |
| Browser E2E tests (only if a supported framework exists) | `e2e-testing` + `test-quality` |
| Full frontend diff review | `frontend-code-review` + applicable skills |
| Socket.IO, lobby state, reconnect, authoritative state | Existing `.agents/rules/02-security-and-multiplayer.md` and `.agents/skills/testing-and-qa/SKILL.md` |

## Permanent Game Quality Gate

For every game task (`AGENTS.md` §10), automatically apply the multi-discipline studio perspective (Director, Designer, Gameplay Engineer, Game Feel, Game UX/UI, Technical Artist, Multiplayer Architect) and verify before completion:
- Reference & benchmark research and public/license-free asset quality are applied instead of improvised primitive placeholders.
- Gameplay works end-to-end across a full match (start -> midgame -> upgrades/progression -> end -> rematch -> reconnect), feels responsive and fun, and matches the genre's identity without restricting future genres.
- Controls, animations, audio mix/haptics, HUD, colorblind safety, and all upgrades/progression systems have real, verifiable effect.
- TV and Smartphone layouts, safe areas, focus/touch navigation, and performance/resource cleanup budgets are verified.

## ProjectBox precedence

1. Security, authorization, data integrity, and server authority.
2. Root `AGENTS.md` and the narrowest applicable ProjectBox rule.
3. Imported skills interpreted for the actual React/Three.js/Socket.IO stack.
4. General conventions.

Imported skills are guidance, not permission to add dependencies or rewrite architecture. Do not
copy engine-specific snippets, version assumptions, tooling commands, or numeric budgets without
checking current project versions, APIs, scripts, and target devices.

## Required quality behavior

- UI: inspect rendered states; verify TV focus navigation, phone touch, and safe areas. Never
  claim visual verification without screenshots or an actual browser/device run.
- Gameplay: verify input -> state transition -> visible feedback -> authoritative outcome ->
  persistence/reconnect behavior where applicable.
- Multiplayer: Socket.IO recovery is an optimization, not the only recovery mechanism; reconcile
  from authoritative snapshots and test duplicate/stale events and reconnect paths.
- Reviews: report concrete findings with severity, evidence, affected file, and actionable fix.
