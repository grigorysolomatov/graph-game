<script lang="ts">
  import { fly } from 'svelte/transition';
  import { game } from '../game/state.svelte';
  import { getNodeType } from '../nodeTypes';
  import { getResource } from '../resources';
  import NodeIcon from '../NodeIcon.svelte';

  const selectedNode = $derived(game.getNode(game.selectedNodeId));
  const type = $derived(selectedNode ? getNodeType(selectedNode) : undefined);

  // Skip "starts with" entries that just equal the resource's own cap (i.e. "starts full") — not informative.
  const initialInventoryEntries = $derived(
    Object.entries(type?.initialInventory ?? {}).filter(
      ([resourceId, amount]) => amount !== type?.capacities?.[resourceId],
    ),
  );
  const capacityEntries = $derived(
    Object.entries(type?.capacities ?? {}).filter(([, max]) => Number.isFinite(max) && max > 0),
  );

  function resourceEmoji(resourceId: string): string {
    return getResource(resourceId)?.emoji ?? resourceId;
  }

  // Slide in from the side on desktop (right panel) but up from the bottom on phones (bottom sheet),
  // matching where the panel is docked. Evaluated each time the inspector opens, so it follows the
  // current viewport width. Keep the breakpoint in sync with the `.right` bottom-sheet media query in Hud.svelte.
  function slideIn() {
    const bottomSheet = window.matchMedia('(max-width: 640px)').matches;
    return bottomSheet ? { y: 24, duration: 160 } : { x: 20, duration: 150 };
  }
</script>

{#if type}
  <div class="inspector hud-panel" transition:fly={slideIn()}>
    <div class="title">Node Info</div>
    <div class="summary">
      <div class="emoji node-circle-fill" style="--node-color:{type.color}">
        <NodeIcon icon={type.icon} />
      </div>
      <div class="name">{type.label}</div>
    </div>
    <p class="description">{type.description}</p>

    {#if initialInventoryEntries.length}
      <div class="section-title">Starts with</div>
      <ul class="stat-list">
        {#each initialInventoryEntries as [resourceId, amount] (resourceId)}
          <li>{resourceEmoji(resourceId)} {amount}</li>
        {/each}
      </ul>
    {/if}

    {#if type.production?.length}
      <div class="section-title">Production</div>
      <ul class="stat-list">
        {#each type.production as line, i (i)}
          <li>{line}</li>
        {/each}
      </ul>
    {/if}

    {#if type.parameters?.length}
      <div class="section-title">Parameters</div>
      <ul class="stat-list">
        {#each type.parameters as param, i (i)}
          <li>{param.label}: {param.value}</li>
        {/each}
      </ul>
    {/if}

    {#if type.conversions?.length}
      <div class="section-title">Conversion</div>
      <ul class="stat-list">
        {#each type.conversions as conversion, i (i)}
          <li>
            {conversion.inputs.map(resourceEmoji).join(' + ')}
            →
            {conversion.outputs.map(resourceEmoji).join(' + ')}
          </li>
        {/each}
      </ul>
    {/if}

    {#if type.capacityNote}
      <div class="section-title">Capacity</div>
      <ul class="stat-list">
        <li>{type.capacityNote}</li>
      </ul>
    {:else if capacityEntries.length}
      <div class="section-title">Capacity</div>
      <ul class="stat-list">
        {#each capacityEntries as [resourceId, max] (resourceId)}
          <li>{resourceEmoji(resourceId)} {max}</li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .inspector {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    width: 240px;
    max-height: calc(100dvh - 88px);
    overflow-y: auto;
  }
  /* Bottom-sheet form on phones (see the matching `.right` media query in Hud.svelte): full width,
     capped height, rounded only along the top, and padded past the home-indicator safe area. */
  @media (max-width: 640px) {
    .inspector {
      width: auto;
      max-height: 45dvh;
      border-radius: 14px 14px 0 0;
      border-bottom: none;
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
    }
  }
  .title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    margin-bottom: 2px;
  }
  .summary {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .emoji {
    font-size: 24px;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  .name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }
  .description {
    margin: 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--text-dim);
  }
  .section-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    margin-top: 4px;
  }
  .stat-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    line-height: 1.4;
    color: var(--text);
  }
</style>
