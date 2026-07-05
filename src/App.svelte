<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import GameMap from './lib/GameMap.svelte';
  import NodeSelectionMenu from './lib/NodeSelectionMenu.svelte';
  import TimeControlMenu from './lib/TimeControlMenu.svelte';
  import NodeInfoPanel from './lib/NodeInfoPanel.svelte';
  import { game } from './lib/state.svelte';

  let rafId: number;
  let lastTime = 0;

  function frame(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.25);
    lastTime = now;
    game.tick(dt);
    rafId = requestAnimationFrame(frame);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      game.clearSelection();
      return;
    }
    if (e.code === 'Space') {
      // Don't hijack space while it's meant for a focused form control (e.g. the edge resource <select>).
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      e.preventDefault();
      game.togglePause();
    }
  }

  onMount(() => {
    lastTime = performance.now();
    rafId = requestAnimationFrame(frame);
    window.addEventListener('keydown', onKeydown);
  });

  onDestroy(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="game-root">
  <div class="time-counter">{game.simTime.toFixed(1)}s</div>
  <GameMap />
  <TimeControlMenu />
  <NodeInfoPanel />
  <NodeSelectionMenu />
</div>

<style>
  .game-root {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .time-counter {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 30;
    font-variant-numeric: tabular-nums;
    font-size: 15px;
    padding: 6px 10px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-dim);
    box-shadow: var(--shadow);
  }
</style>
