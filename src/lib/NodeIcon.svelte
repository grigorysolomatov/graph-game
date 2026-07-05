<script lang="ts">
  import type { IconLayer } from './types';

  let { icon }: { icon: IconLayer | IconLayer[] } = $props();

  const layers = $derived(Array.isArray(icon) ? icon : [icon]);
</script>

<div class="node-icon">
  {#each layers as layer, i (i)}
    <span class="layer" class:top={i === layers.length - 1 && layers.length > 1}>
      {#if typeof layer === 'string'}
        {layer}
      {:else}
        <img src={layer.image} alt="" />
      {/if}
    </span>
  {/each}
</div>

<style>
  .node-icon {
    position: relative;
    width: 1em;
    height: 1em;
    line-height: 1;
  }
  .layer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .layer img {
    /* Sized in em (not %) so it shrinks along with .layer.top's reduced font-size. */
    width: 1em;
    height: 1em;
    object-fit: contain;
  }
  /* The topmost layer of a composite icon renders a little smaller, so it reads as
     sitting/growing on top of the base layer rather than fully covering it. */
  .layer.top {
    font-size: 0.72em;
  }
</style>
