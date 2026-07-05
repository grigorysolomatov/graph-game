<script lang="ts">
  import { game, SPEED_PRESETS } from './state.svelte';

  let collapsed = $state(false);
</script>

<div class="time-menu" class:collapsed>
  <button type="button" class="toggle" onclick={() => (collapsed = !collapsed)} aria-label="Toggle time controls">
    {collapsed ? '◀' : '▶'}
  </button>
  {#if !collapsed}
    <div class="controls">
      <div class="title">Time</div>
      {#each SPEED_PRESETS as preset (preset.value)}
        <button
          type="button"
          class="speed-btn"
          class:active={game.speed === preset.value}
          onclick={() => game.setSpeed(preset.value)}
        >
          <span class="icon">{preset.icon}</span>
          <span class="label">{preset.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .time-menu {
    position: fixed;
    top: 16px;
    right: 0;
    z-index: 20;
    display: flex;
    align-items: flex-start;
  }
  .toggle {
    background: var(--panel);
    border: 1px solid var(--border);
    border-right: none;
    color: var(--text-dim);
    padding: 10px 8px;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
    box-shadow: var(--shadow);
  }
  .toggle:hover {
    color: var(--text);
  }
  .controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px 0 0 10px;
    padding: 12px;
    box-shadow: var(--shadow);
    min-width: 128px;
  }
  .title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    margin-bottom: 2px;
  }
  .speed-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--panel-2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .speed-btn:hover {
    background: color-mix(in srgb, var(--panel-2) 80%, var(--accent) 20%);
  }
  .speed-btn.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--panel-2) 70%, var(--accent) 30%);
    color: var(--text);
  }
  .icon {
    font-size: 15px;
  }
</style>
