<script lang="ts">
  import { NODE_TYPES, getNodeType } from './nodeTypes';
  import { game } from './state.svelte';
  import EmojiIcon from './EmojiIcon.svelte';

  let collapsed = $state(false);

  interface Spawning {
    typeId: string;
    x: number;
    y: number;
    valid: boolean;
  }

  let spawning = $state<Spawning | null>(null);

  function computeValid(clientX: number, clientY: number): boolean {
    const mapEl = document.getElementById('game-map');
    if (!mapEl) return false;
    const rect = mapEl.getBoundingClientRect();
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
    const mapEl = document.getElementById('game-map');
    if (mapEl && spawning.valid) {
      const rect = mapEl.getBoundingClientRect();
      const world = game.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      game.addNode(spawning.typeId, world.x, world.y);
    }
    spawning = null;
  }

  const spawningType = $derived(spawning ? getNodeType(spawning.typeId) : undefined);
</script>

<div class="node-menu" class:collapsed>
  <button type="button" class="toggle" onclick={() => (collapsed = !collapsed)} aria-label="Toggle node menu">
    <span class="chevron">{collapsed ? '▲' : '▼'}</span>
    <span class="toggle-label">Nodes</span>
  </button>
  {#if !collapsed}
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
        >
          <div class="emoji node-circle-fill"><EmojiIcon emoji={t.emoji} /></div>
          <span class="label">{t.label}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if spawning && spawningType}
  <div
    class="ghost node-circle-fill"
    class:valid={spawning.valid}
    style="left:{spawning.x}px; top:{spawning.y}px; --node-color:{spawningType.color}"
  >
    <EmojiIcon emoji={spawningType.emoji} />
  </div>
{/if}

<style>
  .node-menu {
    position: fixed;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--panel);
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: 10px 10px 0 0;
    box-shadow: var(--shadow);
    max-width: calc(100% - 32px);
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    color: var(--text-dim);
    padding: 6px 16px;
    cursor: pointer;
    font-size: 13px;
    justify-content: center;
  }
  .toggle:hover {
    color: var(--text);
  }
  .chevron {
    font-size: 10px;
  }
  .items {
    display: flex;
    gap: 14px;
    padding: 4px 16px 16px;
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
