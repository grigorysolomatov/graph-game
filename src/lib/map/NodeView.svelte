<script lang="ts">
  import { game } from '../game/state.svelte';
  import { camera } from '../game/camera.svelte';
  import { NODE_RADIUS } from '../types';
  import type { GraphNode } from '../types';
  import { getNodeType } from '../nodeTypes';
  import { getResource } from '../resources';
  import NodeIcon from '../NodeIcon.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';

  let { node }: { node: GraphNode } = $props();

  const typeDef = $derived(getNodeType(node));
  const inventoryEntries = $derived(Object.entries(node.inventory).filter(([, count]) => count !== 0));

  let dragging = false;
  let moved = false;
  let startClientX = 0;
  let startClientY = 0;
  let startNodeX = 0;
  let startNodeY = 0;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging = true;
    moved = false;
    startClientX = e.clientX;
    startClientY = e.clientY;
    startNodeX = node.x;
    startNodeY = node.y;
    e.stopPropagation();
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    e.stopPropagation();
    const screenDx = e.clientX - startClientX;
    const screenDy = e.clientY - startClientY;
    if (!moved && Math.hypot(screenDx, screenDy) > 4) moved = true;
    if (moved) {
      // Screen-space drag distance must be converted to world units by the current zoom,
      // so the node tracks the pointer 1:1 on screen regardless of zoom level.
      const dx = screenDx / camera.zoom;
      const dy = screenDy / camera.zoom;
      game.moveNode(node.id, startNodeX + dx, startNodeY + dy);
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    e.stopPropagation();
    if (!moved) {
      game.clickNode(node.id);
    }
  }
</script>

<div
  class="node node-circle-fill"
  class:selected={game.selectedNodeId === node.id}
  class:connect-source={game.connectingFromId === node.id}
  style="left:{node.x}px; top:{node.y}px; width:{NODE_RADIUS * 2}px; height:{NODE_RADIUS * 2}px; margin-left:-{NODE_RADIUS}px; margin-top:-{NODE_RADIUS}px; --node-color:{typeDef?.color};"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  role="button"
  tabindex="0"
>
  <div class="emoji"><NodeIcon icon={typeDef?.icon ?? ''} /></div>
</div>

{#if inventoryEntries.length > 0}
  <div class="inventory" style="left:{node.x}px; top:{node.y + NODE_RADIUS + 6}px;">
    {#each inventoryEntries as [resourceId, count] (resourceId)}
      {@const resourceDef = getResource(resourceId)}
      {#if resourceDef}
        <span class="inv-badge">{Math.trunc(count)}<ResourceIcon resource={resourceDef} /></span>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .node {
    position: absolute;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 34px;
    cursor: grab;
    touch-action: none;
    user-select: none;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
    transition: box-shadow 0.15s ease, transform 0.15s ease;
    z-index: 5;
    pointer-events: auto;
  }
  .node:active {
    cursor: grabbing;
  }
  .node.selected {
    box-shadow: 0 0 0 3px var(--accent), 0 4px 14px rgba(0, 0, 0, 0.5);
  }
  .node.connect-source {
    box-shadow: 0 0 0 3px var(--accent-2), 0 0 18px 3px var(--accent-2);
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.06);
    }
  }
  .emoji {
    line-height: 1;
    pointer-events: none;
  }

  .inventory {
    position: absolute;
    transform: translateX(-50%);
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 140px;
    pointer-events: none;
    z-index: 5;
  }
  .inv-badge {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 1px 7px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-dim);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
    white-space: nowrap;
  }
</style>
