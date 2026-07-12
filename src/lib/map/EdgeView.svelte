<script lang="ts">
  import { game } from '../game/state.svelte';
  import { getEdgeGeometry, EDGE_OFFSET } from '../types';
  import type { GraphEdge } from '../types';

  let { edge }: { edge: GraphEdge } = $props();

  const source = $derived(game.getNode(edge.sourceId));
  const target = $derived(game.getNode(edge.targetId));
  const selected = $derived(game.selectedEdgeId === edge.id);
  const hasReverse = $derived(game.hasReverseEdge(edge.sourceId, edge.targetId));

  const geometry = $derived.by(() => {
    if (!source || !target) return null;
    return getEdgeGeometry(source, target, hasReverse ? EDGE_OFFSET : 0);
  });

  function onPointerUp(e: PointerEvent) {
    e.stopPropagation();
    game.clickEdge(edge.id);
  }
</script>

{#if geometry}
  <g class="edge" class:selected>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <line
      x1={geometry.x1}
      y1={geometry.y1}
      x2={geometry.x2}
      y2={geometry.y2}
      class="hit"
      onpointerdown={(e) => e.stopPropagation()}
      onpointerup={onPointerUp}
    />
    <line
      x1={geometry.x1}
      y1={geometry.y1}
      x2={geometry.x2}
      y2={geometry.y2}
      class="visible"
      marker-end={selected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
    />
  </g>
{/if}

<style>
  .hit {
    stroke: transparent;
    stroke-width: 20;
    pointer-events: stroke;
    cursor: pointer;
  }
  .visible {
    stroke: var(--accent);
    stroke-width: 2.5;
    pointer-events: none;
  }
  .edge.selected .visible {
    stroke: var(--accent-2);
    stroke-width: 3.5;
  }
</style>
