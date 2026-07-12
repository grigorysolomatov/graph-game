# graph-game

[![Deploy to GitHub Pages](https://github.com/grigorysolomatov/graph-game/actions/workflows/deploy.yml/badge.svg)](https://github.com/grigorysolomatov/graph-game/actions/workflows/deploy.yml)

A browser-based graph / production-simulation game — place nodes on a pannable, zoomable
map, connect them with directed edges, and assign resources to make units flow and get
converted. Built with **Svelte 5 + Vite + TypeScript**. Works with mouse and touch.

**▶ Play: <https://grigorysolomatov.github.io/graph-game/>**

## Develop

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build to dist/
npm run check    # type-check (svelte-check + tsc)
```

## Deploy

Pushing to `main` auto-builds and publishes to GitHub Pages via the
[deploy workflow](.github/workflows/deploy.yml) — no manual step:

```bash
git push         # → Actions builds and deploys → live in ~1 min
```

## Project layout

See [CLAUDE.md](CLAUDE.md) for the full architecture. In short:

- `src/lib/game/` — reactive game state, camera, and simulation tick
- `src/lib/map/` — the map surface (nodes, edges, travelers, context menus)
- `src/lib/hud/` — the overlay HUD (top bar, palette, inspector); layout lives in `Hud.svelte`
- `src/lib/nodeTypes/` + `src/lib/resources.ts` — the data-driven node and resource catalogs
