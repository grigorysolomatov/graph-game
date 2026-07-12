<script lang="ts">
  import { NODE_TYPES, getNodeType } from '../nodeTypes';
  import { game } from '../game/state.svelte';
  import { camera } from '../game/camera.svelte';
  import NodeIcon from '../NodeIcon.svelte';

  interface Spawning {
    typeId: string;
    x: number;
    y: number;
    valid: boolean;
  }

  let spawning = $state<Spawning | null>(null);

  function mapRect() {
    return document.getElementById('game-map')?.getBoundingClientRect();
  }

  /** Whether the pointer is over the map (a valid drop target for a new node). */
  function computeValid(clientX: number, clientY: number): boolean {
    const rect = mapRect();
    if (!rect) return false;
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  function onItemPointerDown(e: PointerEvent, typeId: string) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    spawning = { typeId, x: e.clientX, y: e.clientY, valid: computeValid(e.clientX, e.clientY) };
    e.preventDefault();
  }

  function onItemPointerMove(e: PointerEvent) {
    if (!spawning) return;
    spawning.x = e.clientX;
    spawning.y = e.clientY;
    spawning.valid = computeValid(e.clientX, e.clientY);
  }

  function onItemPointerUp(e: PointerEvent) {
    if (!spawning) return;
    const rect = mapRect();
    if (rect && spawning.valid) {
      const world = camera.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      game.addNode(spawning.typeId, world.x, world.y);
    }
    spawning = null;
  }

  const spawningType = $derived(spawning ? getNodeType(spawning.typeId) : undefined);
</script>

<div class="palette hud-panel">
  <div class="items">
    {#each NODE_TYPES as t (t.id)}
      <div
        class="item"
        style="--node-color:{t.color}"
        onpointerdown={(e) => onItemPointerDown(e, t.id)}
        onpointermove={onItemPointerMove}
        onpointerup={onItemPointerUp}
        onpointercancel={onItemPointerUp}
        role="button"
        tabindex="0"
        title="Drag onto the map to place a {t.label}"
      >
        <div class="emoji node-circle-fill"><NodeIcon icon={t.icon} /></div>
        <span class="label">{t.label}</span>
      </div>
    {/each}
  </div>
</div>

{#if spawning && spawningType}
  <div
    class="ghost node-circle-fill"
    class:valid={spawning.valid}
    style="left:{spawning.x}px; top:{spawning.y}px; --node-color:{spawningType.color}"
  >
    <NodeIcon icon={spawningType.icon} />
  </div>
{/if}

<style>
  .palette {
    border-radius: 12px 12px 0 0;
    border-bottom: none;
    max-width: 100%;
  }
  .items {
    display: flex;
    gap: 12px;
    /* Pad past the home-indicator / rounded-corner safe areas on phones. */
    padding: 10px calc(16px + env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom))
      calc(16px + env(safe-area-inset-left));
    overflow-x: auto;
    max-width: 100%;
  }
  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    border-radius: 12px;
    cursor: grab;
    touch-action: none;
    user-select: none;
    background: var(--panel-2);
    border: 1px solid var(--border);
    transition: background 0.15s ease, transform 0.1s ease;
    flex-shrink: 0;
  }
  .item:hover {
    background: color-mix(in srgb, var(--panel-2) 80%, var(--node-color) 20%);
  }
  .item:active {
    cursor: grabbing;
    transform: scale(0.96);
  }
  .item .emoji {
    font-size: 30px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  .item .label {
    font-size: 12px;
    color: var(--text-dim);
  }

  .ghost {
    position: fixed;
    z-index: 25;
    width: 64px;
    height: 64px;
    margin-left: -32px;
    margin-top: -32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 34px;
    pointer-events: none;
    opacity: 0.55;
    border: 2px dashed rgba(255, 255, 255, 0.4);
    transition: opacity 0.1s ease;
  }
  .ghost.valid {
    opacity: 0.9;
    border: 2px solid var(--accent);
  }
</style>
