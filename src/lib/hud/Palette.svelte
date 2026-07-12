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

  // A press that hasn't yet been classified as "pull a node onto the map" vs. "scroll the palette".
  // We defer capturing the pointer until we know which, so a horizontal swipe can scroll natively.
  let pending: { typeId: string; pointerId: number; x: number; y: number } | null = null;
  const DRAG_THRESHOLD = 6;

  function mapRect() {
    return document.getElementById('game-map')?.getBoundingClientRect();
  }

  /** Whether the pointer is over the map (a valid drop target for a new node). */
  function computeValid(clientX: number, clientY: number): boolean {
    const r = mapRect();
    if (!r) return false;
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }

  function onItemPointerDown(e: PointerEvent, typeId: string) {
    pending = { typeId, pointerId: e.pointerId, x: e.clientX, y: e.clientY };
    // Don't capture or preventDefault on touch yet: a horizontal swipe should scroll the palette
    // (touch-action: pan-x on the tiles hands that gesture to the browser). Only a mouse press needs
    // its native text-selection / image-drag suppressed up front.
    if (e.pointerType === 'mouse') e.preventDefault();
  }

  function onItemPointerMove(e: PointerEvent) {
    if (spawning) {
      spawning.x = e.clientX;
      spawning.y = e.clientY;
      spawning.valid = computeValid(e.clientX, e.clientY);
      return;
    }
    if (!pending || e.pointerId !== pending.pointerId) return;
    const dx = e.clientX - pending.x;
    const dy = e.clientY - pending.y;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (Math.abs(dy) >= Math.abs(dx)) {
      // Vertical-dominant intent → pull a node out: capture the pointer and start dragging the ghost.
      (e.currentTarget as HTMLElement).setPointerCapture(pending.pointerId);
      spawning = { typeId: pending.typeId, x: e.clientX, y: e.clientY, valid: computeValid(e.clientX, e.clientY) };
      pending = null;
    } else {
      // Horizontal-dominant intent → let the browser scroll the palette; stop tracking this press.
      pending = null;
    }
  }

  function onItemPointerUp(e: PointerEvent) {
    if (spawning) {
      const r = mapRect();
      if (r && spawning.valid) {
        const world = camera.screenToWorld(e.clientX - r.left, e.clientY - r.top);
        game.addNode(spawning.typeId, world.x, world.y);
      }
      spawning = null;
    }
    pending = null;
  }

  function onItemPointerCancel() {
    pending = null;
    spawning = null;
  }

  // Desktop: translate vertical wheel into horizontal scroll so a mouse can reach off-screen tiles.
  function onWheel(e: WheelEvent) {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  }

  const spawningType = $derived(spawning ? getNodeType(spawning.typeId) : undefined);
</script>

<div class="palette hud-panel">
  <div class="items" onwheel={onWheel}>
    {#each NODE_TYPES as t (t.id)}
      <div
        class="item"
        style="--node-color:{t.color}"
        onpointerdown={(e) => onItemPointerDown(e, t.id)}
        onpointermove={onItemPointerMove}
        onpointerup={onItemPointerUp}
        onpointercancel={onItemPointerCancel}
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
  /* Centered with margin:auto (block flow, not flex) so the panel caps at the viewport and its items
     scroll, instead of a flex item's min-content width pushing it off-screen when many nodes exist. */
  .palette {
    width: max-content;
    max-width: 100%;
    margin: 0 auto;
    border-radius: 12px 12px 0 0;
    border-bottom: none;
  }
  .items {
    display: flex;
    gap: 12px;
    /* Pad past the home-indicator / rounded-corner safe areas on phones. */
    padding: 10px calc(16px + env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom))
      calc(16px + env(safe-area-inset-left));
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
  }
  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    border-radius: 12px;
    cursor: grab;
    /* pan-x: horizontal swipes scroll the palette; vertical drags are ours (pull a node onto the map). */
    touch-action: pan-x;
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
