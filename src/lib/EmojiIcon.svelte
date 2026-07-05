<script lang="ts">
  let { emoji }: { emoji: string | string[] } = $props();

  const layers = $derived(Array.isArray(emoji) ? emoji : [emoji]);
</script>

<div class="emoji-icon">
  {#each layers as layer, i (i)}
    <span class="layer" class:top={i === layers.length - 1 && layers.length > 1}>{layer}</span>
  {/each}
</div>

<style>
  .emoji-icon {
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
  /* The topmost layer of a composite icon renders a little smaller, so it reads as
     sitting/growing on top of the base layer rather than fully covering it. */
  .layer.top {
    font-size: 0.72em;
  }
</style>
