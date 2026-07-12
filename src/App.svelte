<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import GameMap from './lib/map/GameMap.svelte';
  import Hud from './lib/hud/Hud.svelte';
  import { game } from './lib/game/state.svelte';

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
  <GameMap />
  <Hud />
</div>

<style>
  .game-root {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
