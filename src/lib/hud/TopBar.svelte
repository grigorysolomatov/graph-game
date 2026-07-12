<script lang="ts">
  import { game, SPEED_PRESETS } from '../game/state.svelte';
</script>

<div class="top-bar hud-panel">
  <div class="clock" title="Simulation time">{game.simTime.toFixed(1)}s</div>
  <div class="speeds">
    {#each SPEED_PRESETS as preset (preset.value)}
      <button
        type="button"
        class="speed-btn"
        class:active={game.speed === preset.value}
        onclick={() => game.setSpeed(preset.value)}
        title={preset.label}
        aria-label={preset.label}
        aria-pressed={game.speed === preset.value}
      >
        <span class="icon">{preset.icon}</span>
        <span class="label">{preset.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    /* Overrides the shared .hud-panel rounding: a full-width top bar reads better squared-off. */
    border-radius: 0 0 10px 10px;
    border-top: none;
    /* Pad past the notch/status-bar safe area (viewport-fit=cover) so the bar clears it. */
    padding: calc(6px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 6px
      calc(12px + env(safe-area-inset-left));
  }
  .clock {
    font-variant-numeric: tabular-nums;
    font-size: 15px;
    color: var(--text-dim);
    padding-left: 4px;
    min-width: 60px;
  }
  .speeds {
    display: flex;
    gap: 4px;
  }
  .speed-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--panel-2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 6px 10px;
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
  }
  .icon {
    font-size: 15px;
    line-height: 1;
  }
  /* The word label is a nicety on wide screens; the icon alone carries meaning when space is tight. */
  @media (max-width: 560px) {
    .speed-btn .label {
      display: none;
    }
  }
</style>
