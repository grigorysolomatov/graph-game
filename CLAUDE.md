# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based graph/production-simulation game built with **Svelte 5 + Vite + TypeScript**. The player drags "nodes" (buildings) from a bottom palette onto a pannable/zoomable map, connects them with directed edges, and assigns a resource to an edge so units flow from source to target at a steady rate. Nodes generate and convert resources over time.

> **Note on the current content:** the specific node types (House/Farm/Forest/Storage) and resources (food/sun/labor/tree/wood) are a **thin placeholder economy** and are expected to be redesigned. The stable, reusable part is the *framework* below — the data-driven node/resource catalogs, the state/simulation split, and the HUD. Treat the individual node files as examples to replace, not load-bearing rules. Adding or changing a resource, node type, or HUD region should each be a one-file change.

Current placeholder mechanics: **House** generates 1 labor/tick (cap 10). **Farm** generates 1 sun/tick then bulk-converts sun + labor → food. **Forest** grows trees logistically then bulk-converts tree + labor → wood. **Lake** grows fish logistically then bulk-converts fish + labor → food. **Sawmill** bulk-converts wood + labor → planks. **Workshop** bulk-converts planks + labor → furniture. **Storage** holds up to 100 of a single storable resource type, no conversion. Time can be paused/resumed with the space key (`togglePause`) or the Time controls in the top bar.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server (also runnable via `./run.sh`); default port 5173
- `npm run build` — production build
- `npm run preview` — preview a production build
- `npm run check` — type-check (`svelte-check` on the app, `tsc` on the node/config side)

There is **no test runner and no lint script** — do not assume `npm test` exists. The verification loop is `npm run check` (keep it at **0 errors / 0 warnings**) plus running the app and driving it.

## Architecture

Source layout:

```
src/
  App.svelte              # RAF loop + keyboard; composes <GameMap/> + <Hud/>
  app.css                 # design tokens + shared primitives (.hud-panel, .node-circle-fill)
  lib/
    types.ts              # core data shapes + geometry/timing consts
    resources.ts          # RESOURCE_TYPES catalog + getResource() + capacity helpers
    NodeIcon.svelte       # shared node-icon renderer (emoji or image layers)
    nodeTypes/            # one file per node kind + Map-backed catalog (index.ts)
    game/                 # non-visual game logic
      state.svelte.ts     # the reactive `game` singleton (data, selection, graph mutations, tick)
      camera.svelte.ts    # the reactive `camera` singleton (pan/zoom + world/screen transforms)
      simulation.ts       # tick physics (spawn/advance/process/deliver) — plain functions over game
      ids.ts              # nextId() shared id sequence
    map/                  # everything rendered on the map surface
      GameMap.svelte, NodeView, EdgeView, TravelerView, ContextMenu
    hud/                  # the overlay HUD
      Hud.svelte (layout), TopBar, Palette, Inspector
```

### State: `src/lib/game/state.svelte.ts`
Game **data** lives in a single reactive class instance (`game`), built with Svelte 5 runes (`$state`) in a `.svelte.ts` module — the pattern for reactive state outside `.svelte` files; reuse it rather than adding a store library. `game` is a singleton exported directly (no context/props plumbing); components import it and read/mutate it.

Key state and invariants:
- `nodes` / `edges` / `travelers` — the graph data and in-flight resource units (`GraphNode`, `GraphEdge`, `ResourceTraveler` in `types.ts`). `GraphNode.inventory` is a plain `Record<resourceId, number>` that Svelte deep-proxies, so `node.inventory[id] += 1` in place is reactive.
- **`getNode(id)` / `getEdge(id)`** — the single id-lookup path, backed by `$derived` `nodeById`/`edgeById` Maps (rebuilt only when a node/edge is *added or removed*, not when one is mutated in place). Always use these instead of writing `game.nodes.find((n) => n.id === …)` inline — that pattern was removed everywhere and should not come back.
- `selectedNodeId` / `selectedEdgeId` — mutually exclusive; drive which floating `ContextMenu` (map) and the `Inspector` (HUD) show. `connectingFromId` — non-null while in "connect mode"; the next `clickNode` completes or cancels the edge. This state machine is centralized in `clickNode`/`clickEdge`/`startConnectFrom`/`clearSelection` — don't duplicate connect-mode logic in components.
- `speed` (0 / 1 / 4) — consumed by the RAF loop in `App.svelte`, which calls `game.tick(dt)` per frame. `simTime` accumulates sim-seconds. Pausing (`speed === 0`) skips accumulation *and* all spawning/movement/processing. Always change speed via `setSpeed()` (never assign): it records `lastActiveSpeed` so `togglePause()` (space key, guarded against firing while a form control is focused) resumes at whichever of Normal/Fast was last active.

When adding new mutable game concepts, extend this class rather than creating parallel stores.

### Camera: `src/lib/game/camera.svelte.ts`
The pan/zoom view state is its own reactive singleton (`camera`) because it has **no dependency on graph data**. It is the sole mapping between **world coordinates** (where `node.x`/`node.y` live — unaffected by pan/zoom) and **screen coordinates** (client pixels relative to `#game-map`'s top-left). Formula: `screen = world * zoom + {x,y}`. Any code converting between a pointer event and a node position must go through `camera.worldToScreen`/`camera.screenToWorld` — never assume 1:1. Zoom is clamped to `[0.3, 3]` inside `zoomToward`/`zoomAt`; always mutate the camera through those methods (and `panBy`), never write `camera.state` directly, or the clamp is bypassed. `zoomToward(anchor, target, zoom)` powers both wheel zoom (anchor === target) and pinch (different anchor/target lets one gesture pan+zoom).

### Simulation: `src/lib/game/simulation.ts`
The tick physics is **plain functions taking `game`**, kept out of the state class so the reactive-data class stays thin. `state.svelte.ts` imports the `GameState` *type* only (erased at runtime), so there's no import cycle even though `game.tick` and `removeNode`/`removeEdge` call back into these functions. `game.tick(dt)`:
1. `simTime += dt * speed`
2. `spawnTravelers(game)` — per edge with a `resourceId`, once per `TICK_SECONDS` of elapsed `simTime` (a `while` loop, so fast-forward catches up on missed spawns), move one unit from source into a new `ResourceTraveler`. A spawn is skipped (interval still consumed, so cadence stays fixed) if the source is empty **or** `canNodeAccept(target, …)` is false — this is what makes a full target stop pulling.
3. `advanceTravelers(game)` — move each traveler by `(simTime − startTime) / duration` (`duration` is always `TICK_SECONDS`, **not** distance-based); on arrival credit the target via `tryDeliver`, which **re-checks capacity** (two edges can both pass the departure check and jointly overflow one target in the same tick) and silently drops the unit if it now fails.
4. `processNodes(game)` — for each node whose type defines `process`, run it once per elapsed `TICK_SECONDS` (again a `while` loop for exact fast-forward catch-up). `process(node, allNodes)` also receives every node, for rules that depend on global map state.

Two shared helpers live here and must be the only paths for their jobs:
- **`tryDeliver(node, resourceId, amount?)`** — the single way to credit inventory (capacity-checked). New crediting code should call this, not re-write the `canNodeAccept` + `inventory[id] += amount` pair inline.
- **`deliverTravelers(game, edgeIds, excludeTargetId?)`** — called by `removeNode`/`removeEdge` *before* the edges are removed, so deleting a node/edge doesn't destroy in-flight resources: each affected traveler is delivered to its edge's target (via `tryDeliver`), then dropped. `removeNode` passes its own id as `excludeTargetId` so travelers *heading into* the deleted node are dropped (nowhere to land) while travelers on its *outgoing* edges still arrive normally. Any new node/edge removal must route through `deliverTravelers`, not filter `game.travelers` directly, or it reintroduces silent resource loss.

### The tick constant: `TICK_SECONDS`
`TICK_SECONDS` (`types.ts`, currently `1`) is the single cadence constant: how often a resource departs an assigned edge, how long a resource takes to cross an edge (always exactly one tick, regardless of on-screen length), and how often every `process` runs. There is no per-type interval override. If a future node needs to act less often than every tick, do what a smooth periodic effect should: divide the per-interval amount by the interval and still run every tick, rather than adding an interval mechanism.

### Node types: `src/lib/nodeTypes/`
Each placeable kind is its own file exporting one `NodeTypeDef` const, listed in `index.ts`'s `NODE_TYPES` array (which is also the palette order). **To add a node type: write a file here and add it to that array — nothing else changes.** The palette, map, inventory rendering, inspector, and edge resource dropdown all key off `NODE_TYPES`/`RESOURCE_TYPES` generically; there is **no per-`typeId` branching anywhere** in the components or state.

`index.ts` also hosts the catalog functions (Map-backed): `getNodeType(nodeOrTypeId)` (the single lookup — accepts a placed `GraphNode` or a raw type-id string; don't re-write `NODE_TYPES.find(...)`), `getNodeCapacity`, and `canNodeAccept`.

`NodeTypeDef` fields (`types.ts`): `id`, `icon`, `label`, `description`, `color` (border color; the fill is a shared neutral gray via `.node-circle-fill`), and optionals `initialInventory`, `capacities`, `capacityNote`, `canAccept`, `process`, and the Inspector-only descriptors `production` / `parameters` / `conversions`.

- **Capacities**: `capacities[resourceId]` defaults to `0` (cannot hold) if unlisted. Helpers in `resources.ts`: `UNLIMITED_CAPACITIES` (no cap on anything — Forest spreads it then overrides specific resources), and `uniformCapacities(n)` (same cap for every resource — Storage uses this). Spread-and-override (`{ ...UNLIMITED_CAPACITIES, sun: 5 }`) is the pattern for "unrestricted except one"; write the object by hand for a from-scratch restriction like House's.
- **`canAccept(node, resourceId, amount)`**: overrides the default `count + amount ≤ capacity` check entirely, for rules that depend on the rest of the inventory (which `capacities` alone can't express). Storage uses it for "one storable resource type at a time." `canNodeAccept()` calls it instead of the capacity math whenever present.
- **`process(node, allNodes)`**: runs once per tick, mutating inventory in place. Production nodes convert in bulk (all matching stock in one call, `Math.min` for two-input conversions) — they are **not** rate-limited per conversion. If a future node must be rate-limited (an old "shop sells 1/tick" style), that's the deliberate exception, not the default.
- **Logistic growth** (`nodeTypes/logistic.ts`): a node that grows a resource toward a ceiling (Forest's trees, Lake's fish) uses `growLogistic(current, { capacity, maxRate })`. It's parameterized by the two design-facing quantities — carrying capacity `K` and peak growth per tick (reached at `N = K/2`) — and derives the logistic rate `r = 4·maxRate/K` internally. It seeds a small floor so a fully-harvested population always regrows, so the conversion step can safely drain the resource to 0. Both Forest and Lake are `growLogistic` + a bulk `input+labor → output` conversion; copy that shape for new "renewable + harvest" nodes.

### Resources: `src/lib/resources.ts`
`RESOURCE_TYPES` is the catalog of transportable/storable units: `food` 🥕, `sun` ☀️ (`transportable: false`), `labor` 💪 (`storable: false`), `tree` 🌳 (`transportable: false`), `wood` 🪵, `plank` 🟫, `furniture` 🪑, `fish` 🐟 (`transportable: false`). It drives the edge resource dropdown and the icon for inventory badges/travelers. **`getResource(id)`** (Map-backed) is the single lookup — don't write `RESOURCE_TYPES.find(...)` inline.

A resource may also carry an optional **`image`** (imported asset URL, e.g. `plank`'s `assets/plank.svg`) that renders instead of the emoji in the visual contexts — inventory badges, travelers, and the info panel — via **`ResourceIcon.svelte`** (the shared `<img>`-or-emoji renderer; use it wherever a resource icon appears in HTML). The edge `<select>` dropdown always uses `emoji`, since an `<option>` can't hold an image — so `emoji` stays required as the text fallback.
- `transportable: false` — cannot be assigned to an edge (won't appear in the edge dropdown); the resource never leaves the node that made it (sun, tree).
- `storable: false` — a generic Storage node won't hold it (labor). This flag replaced a hardcoded `resourceId === 'labor'` string check; add the flag rather than special-casing an id.

Resource emoji and node icons are separate namespaces and may coincide without it being a bug.

`NodeView`'s inventory badges filter on `count !== 0` (not `> 0`) so a value that goes negative stays visible, and render `Math.trunc(count)` (not floor/round) so a fractional or negative count shows only its integer part while the stored value keeps full precision. Nothing in the current placeholder economy actually goes negative/fractional, but keep this behavior if a future node reintroduces a smooth drain.

### Icons: `src/lib/NodeIcon.svelte`
`NodeTypeDef.icon` is `IconLayer | IconLayer[]`, where `IconLayer` is a string (emoji) **or** `{ image: string }` (an imported asset URL — Farm/Forest use PNGs from `assets/`). A single layer renders as-is; an array stacks layers centered, with the last scaled down (`0.72em`) to read as sitting on top. `NodeIcon` is used everywhere a node's icon appears (map node, palette tile, drag ghost, inspector) — a composite/image icon is just data on the node file, no per-component change.

### Core data shapes & geometry: `src/lib/types.ts`
Home for the structural interfaces (`NodeTypeDef`, `GraphNode`, `GraphEdge`, `ResourceTraveler`, `IconLayer`, `ResourceTypeDef` lives in resources.ts) and geometry/timing constants: `TICK_SECONDS`, `NODE_RADIUS` (also used by `getEdgeGeometry()` to stop arrows at the node's edge — keep in sync if node sizing changes), `EDGE_OFFSET`, and `getEdgeGeometry(source, target, offset)`. This file intentionally depends on neither `nodeTypes/` nor `resources.ts` — it's the shared vocabulary they're built from.

### Map rendering: `src/lib/map/`
- **`GameMap.svelte`** renders two layers inside `#game-map`: a `.world` child (`transform: translate(camera.{x,y}) scale(camera.zoom)`, `transform-origin: 0 0` — the camera math assumes top-left pivot) holding the edges `<svg>`, `NodeView`s, and `TravelerView`s in plain world coordinates; and an **overlay** of `ContextMenu`s rendered *outside* `.world`, positioned in screen space via `camera.worldToScreen(...)` so menus stay constant-size regardless of zoom. `.world` is `pointer-events: none` so empty space passes through to the map background; `NodeView`'s `.node` sets `pointer-events: auto` back on (any new interactive element inside `.world` needs the same). The dot-grid is a `background-image` on `#game-map` driven off `camera.{x,y,zoom}` (CSS backgrounds tile infinitely; a panned DOM element wouldn't).
- **Pan/zoom gestures** live in the map background's pointer handlers (`onBackgroundPointer*`), which only fire for gestures starting on empty map (every interactive child `stopPropagation()`s on `pointerdown`). One active pointer → pan (`camera.panBy`); two → pinch (`camera.zoomToward`). Wheel → `camera.zoomAt` (non-passive listener, so `preventDefault` is safe). `gestureMoved` (>4px screen threshold, or a second finger) distinguishes a tap-to-deselect from a pan/pinch.
- **`EdgeView`** renders two SVG `<line>`s: an invisible wide "hit" line (`pointer-events: stroke`) and the visible arrow line with a `marker-end`. When both `A→B` and `B→A` exist, each is offset by `EDGE_OFFSET` (via `game.hasReverseEdge` + `getEdgeGeometry`) so the pair doesn't overlap; `TravelerView` applies the identical offset or the icon drifts off the line.
- **`TravelerView`** is a pure reactive read of state — position derived from `game.simTime` and the edge's *current* endpoints each frame, no animation loop. Do the same for any new per-frame visual.
- **`ContextMenu`** is a generic floating menu (map-local `x`/`y`) with emoji-label buttons (real word in `title`, which is also the `aria-label`) plus an optional `children` snippet — the edge's resource `<select>` is passed this way. Extend `items`/`children` at the call site in `GameMap` rather than building a second menu component.

### HUD: `src/lib/hud/`
The overlay is composed in **`Hud.svelte`**, which is the single place layout lives: `.slot` wrappers position each region (top bar, bottom-center palette, right inspector) so **rearranging the HUD means editing only this file**. Slots are `pointer-events: none`; only `.hud-panel` elements inside them catch events, so empty HUD areas pass clicks/drags through to the map. (The bottom slot centers with flex, deliberately **not** `transform` — a transformed ancestor would become the containing block for the palette's `position: fixed` drag-ghost and break its viewport placement.)

Regions are layout-agnostic (no `position: fixed` of their own):
- **`TopBar`** — clock (`simTime`) + speed buttons (`SPEED_PRESETS`, `game.setSpeed`).
- **`Palette`** — drag node types onto the map. `onItemPointerDown/Move/Up` use raw Pointer Events + `setPointerCapture` and `camera.screenToWorld` for placement; a `position: fixed` ghost follows the pointer.
- **`Inspector`** — read-only details of the selected node, slid in with a `fly` transition when `game.selectedNodeId` is set (no manual collapse). Renders the type's `description` + `production`/`parameters`/`conversions`/capacity descriptors. The **actions** on a selected node (Connect/Delete) stay in the map's spatially-anchored `ContextMenu`, not here.

**Mobile:** a `@media (max-width: 640px)` block in `Hud.svelte` re-docks the inspector from the right side to a full-width **bottom sheet** (so a narrow screen doesn't hide the tapped node and its context menu); `Inspector.slideIn()` matches the `fly` direction (up vs. from-right) to that breakpoint — keep the two in sync. `index.html` uses `viewport-fit=cover` + `user-scalable=no`, and TopBar/Palette/Inspector pad past `env(safe-area-inset-*)` for notches/home-indicators. All touch gestures already work through the shared Pointer-Events path (drag-to-place, one-finger pan, two-finger pinch-zoom).

### Drag & pointer-event conventions
All dragging (nodes, palette placement, pan/zoom) uses raw Pointer Events + `setPointerCapture`, not HTML5 Drag-and-Drop, for uniform mouse/touch/pen behavior. Preserve: distinguish click from drag by a ~4px **screen-pixel** threshold (not a separate click handler); interactive elements `stopPropagation()` on `pointerdown`/`pointerup` so the map background's pan/zoom/clear-selection doesn't fire; draggable elements set `touch-action: none` (required for touch drag and our custom pinch). Node drag deltas are divided by `camera.zoom` (screen→world) so nodes track the cursor 1:1 at any zoom.

### Styling
Dark theme only. CSS custom properties in `src/app.css` (`--bg`, `--panel`, `--accent`, …), reused via `var(--x)` including inside SVG. Two shared global primitives live in `app.css`: **`.hud-panel`** (common floating-panel chrome — background/border/radius/shadow; regions override padding/corners) and **`.node-circle-fill`** (the radial-gradient circle keyed off `--node-color`, shared by the map node, palette tile, and drag ghost). Otherwise styling is plain scoped Svelte `<style>` per component — no CSS framework/utility classes. Add a shared class in `app.css` rather than copy-pasting chrome/gradient if a new place needs it.
