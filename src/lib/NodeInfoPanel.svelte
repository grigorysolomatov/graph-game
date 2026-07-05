<script lang="ts">
  import { game } from './state.svelte';
  import { getNodeType } from './nodeTypes';
  import { RESOURCE_TYPES } from './resources';
  import EmojiIcon from './EmojiIcon.svelte';

  let collapsed = $state(false);

  const selectedNode = $derived(game.nodes.find((n) => n.id === game.selectedNodeId));
  const selectedType = $derived(selectedNode ? getNodeType(selectedNode) : undefined);

  const initialInventoryEntries = $derived(
    Object.entries(selectedType?.initialInventory ?? {}).filter(
      ([resourceId, amount]) => amount !== selectedType?.capacities?.[resourceId],
    ),
  );
  const capacityEntries = $derived(
    Object.entries(selectedType?.capacities ?? {}).filter(
      ([, max]) => Number.isFinite(max) && max > 0,
    ),
  );

  function resourceEmoji(resourceId: string): string {
    return RESOURCE_TYPES.find((r) => r.id === resourceId)?.emoji ?? resourceId;
  }
</script>

<div class="info-panel" class:collapsed>
  {#if !collapsed}
    <div class="content">
      <div class="title">Node Info</div>
      {#if selectedType}
        <div class="node-summary">
          <div class="emoji node-circle-fill" style="--node-color:{selectedType.color}">
            <EmojiIcon emoji={selectedType.emoji} />
          </div>
          <div class="name">{selectedType.label}</div>
        </div>
        <p class="description">{selectedType.description}</p>
        {#if initialInventoryEntries.length}
          <div class="section-title">Starts with</div>
          <ul class="stat-list">
            {#each initialInventoryEntries as [resourceId, amount] (resourceId)}
              <li>{resourceEmoji(resourceId)} {amount}</li>
            {/each}
          </ul>
        {/if}
        {#if selectedType.production?.length}
          <div class="section-title">Production</div>
          <ul class="stat-list">
            {#each selectedType.production as line, i (i)}
              <li>{line}</li>
            {/each}
          </ul>
        {/if}
        {#if selectedType.parameters?.length}
          <div class="section-title">Parameters</div>
          <ul class="stat-list">
            {#each selectedType.parameters as param, i (i)}
              <li>{param.label}: {param.value}</li>
            {/each}
          </ul>
        {/if}
        {#if selectedType.conversions?.length}
          <div class="section-title">Conversion</div>
          <ul class="stat-list">
            {#each selectedType.conversions as conversion, i (i)}
              <li>
                {conversion.inputs.map(resourceEmoji).join(' + ')}
                →
                {conversion.outputs.map(resourceEmoji).join(' + ')}
              </li>
            {/each}
          </ul>
        {/if}
        {#if selectedType.capacityNote}
          <div class="section-title">Capacity</div>
          <ul class="stat-list">
            <li>{selectedType.capacityNote}</li>
          </ul>
        {:else if capacityEntries.length}
          <div class="section-title">Capacity</div>
          <ul class="stat-list">
            {#each capacityEntries as [resourceId, max] (resourceId)}
              <li>{resourceEmoji(resourceId)} {max}</li>
            {/each}
          </ul>
        {/if}
      {:else}
        <p class="placeholder">Click a node to see its info.</p>
      {/if}
    </div>
  {/if}
  <button type="button" class="toggle" onclick={() => (collapsed = !collapsed)} aria-label="Toggle node info">
    {collapsed ? '▶' : '◀'}
  </button>
</div>

<style>
  .info-panel {
    position: fixed;
    top: 64px;
    left: 0;
    z-index: 20;
    display: flex;
    align-items: flex-start;
  }
  .toggle {
    background: var(--panel);
    border: 1px solid var(--border);
    border-left: none;
    color: var(--text-dim);
    padding: 10px 8px;
    border-radius: 0 8px 8px 0;
    cursor: pointer;
    box-shadow: var(--shadow);
  }
  .toggle:hover {
    color: var(--text);
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0 10px 10px 0;
    padding: 12px;
    box-shadow: var(--shadow);
    width: 240px;
  }
  .title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    margin-bottom: 2px;
  }
  .node-summary {
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
  .placeholder {
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
  }
</style>
