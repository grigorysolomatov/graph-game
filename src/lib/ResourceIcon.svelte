<script lang="ts">
  import type { ResourceTypeDef } from './resources';

  // Renders a resource's image (if it has one) or its emoji, sized to the surrounding text.
  // Used in inventory badges, travelers, and the info panel. The edge <select> can't hold an
  // image, so it keeps using `emoji` directly.
  let { resource }: { resource: ResourceTypeDef | undefined } = $props();
</script>

{#if resource}
  {#if resource.image}
    <img class="res-img" src={resource.image} alt={resource.label} />
  {:else}{resource.emoji}{/if}
{/if}

<style>
  .res-img {
    /* Slightly larger than the cap height and nudged to sit on the text baseline, so it reads at
       the same weight as an emoji glyph next to a number. */
    height: 1.15em;
    width: 1.15em;
    object-fit: contain;
    vertical-align: -0.25em;
  }
</style>
