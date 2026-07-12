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
    /* A fixed square box + object-fit: contain means the longer of an image's two
       dimensions always ends up at 1.4em, regardless of its aspect ratio — so two
       differently-shaped images (e.g. Farm's wide layout vs. Forest's tall one)
       still read as the same size instead of one looking bigger than the other. */
    width: 1.4em;
    height: 1.4em;
    object-fit: contain;
  }
  /* The topmost layer of a composite icon renders a little smaller, so it reads as
     sitting/growing on top of the base layer rather than fully covering it. */
  .layer.top {
    font-size: 0.72em;
  }
</style>
