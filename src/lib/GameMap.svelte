<script lang="ts">
  import { game } from './state.svelte';
  import { NODE_RADIUS } from './types';
  import { RESOURCE_TYPES } from './resources';
  import NodeView from './NodeView.svelte';
  import EdgeView from './EdgeView.svelte';
  import TravelerView from './TravelerView.svelte';
  import ContextMenu from './ContextMenu.svelte';

  const GRID_SIZE = 28;

  let mapEl: HTMLDivElement;

  function mapLocalPoint(e: { clientX: number; clientY: number }) {
    const rect = mapEl.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function midpoint(pts: { x: number; y: number }[]) {
    const [a, b] = pts;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function distance(pts: { x: number; y: number }[]) {
    const [a, b] = pts;
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  // Pan (single finger/mouse drag) and pinch-zoom (two fingers) on the background "ground".
  // Nodes/edges/menus stopPropagation on pointerdown, so these handlers only ever see
  // gestures that actually started on empty map — no need to check e.target beyond that.
  const activePointers = new Map<number, { x: number; y: number }>();
  let gestureStart: { x: number; y: number } | null = null;
  let gestureMoved = false;

  function onBackgroundPointerDown(e: PointerEvent) {
    if (e.target !== mapEl) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const point = mapLocalPoint(e);
    if (activePointers.size === 0) {
      gestureMoved = false;
      gestureStart = point;
    } else if (activePointers.size === 1) {
      // A second finger just landed — this is a pinch gesture, never a tap-to-deselect.
      gestureMoved = true;
    }
    activePointers.set(e.pointerId, point);
  }

  function onBackgroundPointerMove(e: PointerEvent) {
    if (game.isConnecting) {
      const p = mapLocalPoint(e);
      pointer = game.screenToWorld(p.x, p.y);
    }

    if (!activePointers.has(e.pointerId)) return;

    if (activePointers.size >= 2) {
      const before = [...activePointers.values()];
      const oldMid = midpoint(before);
      const oldDist = distance(before);

      activePointers.set(e.pointerId, mapLocalPoint(e));

      const after = [...activePointers.values()];
      const newMid = midpoint(after);
      const newDist = distance(after);

      const ratio = oldDist > 4 ? newDist / oldDist : 1;
      game.zoomToward(oldMid, newMid, game.camera.zoom * ratio);
    } else {
      const prev = activePointers.get(e.pointerId)!;
      const next = mapLocalPoint(e);
      activePointers.set(e.pointerId, next);
      game.panBy(next.x - prev.x, next.y - prev.y);
      if (gestureStart && Math.hypot(next.x - gestureStart.x, next.y - gestureStart.y) > 4) {
        gestureMoved = true;
      }
    }
  }

  function onBackgroundPointerUp(e: PointerEvent) {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.delete(e.pointerId);
    if (activePointers.size === 0) {
      if (!gestureMoved) {
        game.clearSelection();
      }
      gestureStart = null;
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const p = mapLocalPoint(e);
    const zoomFactor = Math.exp(-e.deltaY * 0.001);
    game.zoomAt(p, game.camera.zoom * zoomFactor);
  }

  let pointer = $state({ x: 0, y: 0 });

  const selectedNode = $derived(game.nodes.find((n) => n.id === game.selectedNodeId));
  const selectedNodeScreen = $derived(
    selectedNode ? game.worldToScreen(selectedNode.x, selectedNode.y - NODE_RADIUS) : undefined,
  );
  const selectedEdge = $derived(game.edges.find((e) => e.id === game.selectedEdgeId));
  const selectedEdgeMidScreen = $derived.by(() => {
    if (!selectedEdge) return undefined;
    const s = game.nodes.find((n) => n.id === selectedEdge.sourceId);
    const t = game.nodes.find((n) => n.id === selectedEdge.targetId);
    if (!s || !t) return undefined;
    return game.worldToScreen((s.x + t.x) / 2, (s.y + t.y) / 2);
  });
  const connectingFromNode = $derived(game.nodes.find((n) => n.id === game.connectingFromId));
</script>

<div
  class="map"
  id="game-map"
  bind:this={mapEl}
  style="background-position: {game.camera.x}px {game.camera.y}px; background-size: {GRID_SIZE * game.camera.zoom}px {GRID_SIZE * game.camera.zoom}px;"
  onpointerdown={onBackgroundPointerDown}
  onpointermove={onBackgroundPointerMove}
  onpointerup={onBackgroundPointerUp}
  onpointercancel={onBackgroundPointerUp}
  onwheel={onWheel}
>
  <div
    class="world"
    style="transform: translate({game.camera.x}px, {game.camera.y}px) scale({game.camera.zoom});"
  >
    <svg class="edges-layer">
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
        </marker>
        <marker id="arrowhead-selected" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--accent-2)" />
        </marker>
      </defs>
      {#each game.edges as edge (edge.id)}
        <EdgeView {edge} />
      {/each}
      {#if connectingFromNode}
        <line
          x1={connectingFromNode.x}
          y1={connectingFromNode.y}
          x2={pointer.x}
          y2={pointer.y}
          class="pending-edge"
        />
      {/if}
    </svg>

    {#each game.nodes as node (node.id)}
      <NodeView {node} />
    {/each}

    {#each game.travelers as traveler (traveler.id)}
      <TravelerView {traveler} />
    {/each}
  </div>

  {#if selectedNode && selectedNodeScreen}
    <ContextMenu
      x={selectedNodeScreen.x}
      y={selectedNodeScreen.y}
      items={[
        { label: '➝', title: 'Connect', onClick: () => game.startConnectFrom(selectedNode.id) },
        { label: '🗑️', title: 'Delete', danger: true, onClick: () => game.removeNode(selectedNode.id) },
      ]}
    />
  {/if}

  {#if selectedEdge && selectedEdgeMidScreen}
    <ContextMenu
      x={selectedEdgeMidScreen.x}
      y={selectedEdgeMidScreen.y}
      items={[{ label: '🗑️', title: 'Delete', danger: true, onClick: () => game.removeEdge(selectedEdge.id) }]}
    >
      {#snippet children()}
        <select
          class="resource-select"
          value={selectedEdge.resourceId ?? ''}
          onchange={(e) => game.setEdgeResource(selectedEdge.id, (e.currentTarget as HTMLSelectElement).value || null)}
        >
          <option value="">-</option>
          {#each RESOURCE_TYPES.filter((r) => r.transportable !== false) as r (r.id)}
            <option value={r.id}>{r.emoji}</option>
          {/each}
        </select>
      {/snippet}
    </ContextMenu>
  {/if}
</div>

<style>
  .map {
    position: absolute;
    inset: 0;
    background-color: var(--bg-map);
    background-image: radial-gradient(var(--bg-map-dot) 1.5px, transparent 1.5px);
    overflow: hidden;
    touch-action: none;
  }
  .world {
    position: absolute;
    inset: 0;
    transform-origin: 0 0;
    pointer-events: none;
  }
  .edges-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }
  .pending-edge {
    stroke: var(--accent-2);
    stroke-width: 2.5;
    stroke-dasharray: 6 5;
    pointer-events: none;
  }
  .resource-select {
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }
</style>
