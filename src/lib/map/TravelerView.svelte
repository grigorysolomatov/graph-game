<script lang="ts">
  import { game } from '../game/state.svelte';
  import { getEdgeGeometry, EDGE_OFFSET } from '../types';
  import type { ResourceTraveler } from '../types';
  import { getResource } from '../resources';

  let { traveler }: { traveler: ResourceTraveler } = $props();

  const edge = $derived(game.getEdge(traveler.edgeId));
  const source = $derived(game.getNode(edge?.sourceId));
  const target = $derived(game.getNode(edge?.targetId));
  const resourceDef = $derived(getResource(traveler.resourceId));
  const hasReverse = $derived(edge ? game.hasReverseEdge(edge.sourceId, edge.targetId) : false);

  const position = $derived.by(() => {
    if (!source || !target) return null;
    const g = getEdgeGeometry(source, target, hasReverse ? EDGE_OFFSET : 0);
    const progress = Math.min(1, Math.max(0, (game.simTime - traveler.startTime) / traveler.duration));
    return {
      x: g.x1 + (g.x2 - g.x1) * progress,
      y: g.y1 + (g.y2 - g.y1) * progress,
    };
  });
</script>

{#if position && resourceDef}
  <div class="traveler" style="left:{position.x}px; top:{position.y}px;">
    {resourceDef.emoji}
  </div>
{/if}

<style>
  .traveler {
    position: absolute;
    transform: translate(-50%, -50%);
    font-size: 18px;
    line-height: 1;
    pointer-events: none;
    z-index: 4;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
  }
</style>
