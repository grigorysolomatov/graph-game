<script lang="ts">
  import TopBar from './TopBar.svelte';
  import Palette from './Palette.svelte';
  import Inspector from './Inspector.svelte';
</script>

<!--
  The single place HUD layout lives. Each region (TopBar / Palette / Inspector) is a layout-agnostic
  component that just renders its content; positioning is entirely in the `.slot` wrappers below, so
  rearranging the HUD (e.g. moving the palette to the side) means editing only this file.
  Slots are pointer-transparent; only the panels inside them (`.hud-panel`) catch pointer events, so
  empty HUD areas pass clicks/drags through to the map underneath.
-->
<div class="slot top"><TopBar /></div>
<div class="slot bottom"><Palette /></div>
<div class="slot right"><Inspector /></div>

<style>
  .slot {
    position: fixed;
    z-index: 20;
    pointer-events: none;
  }
  .slot :global(.hud-panel) {
    pointer-events: auto;
  }
  .top {
    top: 0;
    left: 0;
    right: 0;
  }
  /* Full-width block (the palette centers itself via margin:auto and caps at the viewport so it can
     scroll horizontally). Deliberately no `transform` here: a transformed ancestor would become the
     containing block for the palette's `position: fixed` drag-ghost and break its viewport placement. */
  .bottom {
    left: 0;
    right: 0;
    bottom: 0;
  }
  .right {
    top: 64px;
    right: 12px;
  }

  /* On a narrow (phone) screen a right-docked panel would cover most of the map and hide the
     tapped node + its Connect/Delete context menu. Re-dock the inspector as a full-width bottom
     sheet instead, keeping the map (and the node you tapped) clear above it. Because all layout
     lives here, this is the only change needed to reshape the HUD for mobile. */
  @media (max-width: 640px) {
    .right {
      top: auto;
      right: 0;
      left: 0;
      bottom: 0;
    }
  }
</style>
