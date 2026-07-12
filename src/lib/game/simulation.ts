import type { GraphNode, GraphEdge } from '../types';
import { TICK_SECONDS } from '../types';
import { getNodeType, canNodeAccept } from '../nodeTypes';
import { nextId } from './ids';
import type { GameState } from './state.svelte';

/**
 * The simulation physics, kept out of `GameState` so the reactive-data class stays thin. Every
 * function takes the game as its first argument and mutates it in place. `GameState` is imported
 * for its type only (erased at runtime), so there's no import cycle even though `state.svelte.ts`
 * calls back into these functions.
 */

/** Credits `amount` of `resourceId` to `node`'s inventory if capacity/exclusivity rules allow it; silently
 *  drops it otherwise (same trade-off as an overflowing arrival). The single path for crediting inventory —
 *  new code should call this rather than re-writing the `canNodeAccept` + `inventory[id] += amount` pair. */
export function tryDeliver(node: GraphNode | undefined, resourceId: string, amount = 1) {
  if (!node || !canNodeAccept(node, resourceId, amount)) return;
  node.inventory[resourceId] = (node.inventory[resourceId] ?? 0) + amount;
}

/** Instantly delivers in-flight travelers on the given (about-to-be-removed) edges to their target's inventory,
 *  respecting capacity, instead of destroying them. `excludeTargetId` skips delivery for edges whose target is
 *  itself being deleted (nowhere to deliver to). Must run before the edges are removed from `game.edges`. */
export function deliverTravelers(game: GameState, edgeIds: Set<string>, excludeTargetId?: string) {
  if (edgeIds.size === 0) return;
  for (const t of game.travelers) {
    if (!edgeIds.has(t.edgeId)) continue;
    const edge = game.getEdge(t.edgeId);
    if (!edge || edge.targetId === excludeTargetId) continue;
    tryDeliver(game.getNode(edge.targetId), t.resourceId);
  }
  game.travelers = game.travelers.filter((t) => !edgeIds.has(t.edgeId));
}

/** Once per `TICK_SECONDS` per edge, tries to move one unit of the edge's resource from source to a new traveler.
 *  A `while` loop (not `if`) so a large fast-forward `dt` catches up on missed spawns rather than dropping them. */
export function spawnTravelers(game: GameState) {
  for (const edge of game.edges) {
    if (!edge.resourceId) continue;
    while (game.simTime - edge.lastSpawnTime >= TICK_SECONDS) {
      edge.lastSpawnTime += TICK_SECONDS;
      trySpawnOnEdge(game, edge);
    }
  }
}

function trySpawnOnEdge(game: GameState, edge: GraphEdge) {
  const resourceId = edge.resourceId;
  if (!resourceId) return;
  const source = game.getNode(edge.sourceId);
  const target = game.getNode(edge.targetId);
  if (!source || !target) return;
  const available = source.inventory[resourceId] ?? 0;
  if (available < 1) return;
  // Skip (but still consume the interval, so cadence stays fixed) if the target can't take it — this is what
  // makes a full target stop pulling more in.
  if (!canNodeAccept(target, resourceId, 1)) return;
  source.inventory[resourceId] = available - 1;
  game.travelers.push({
    id: nextId('traveler'),
    edgeId: edge.id,
    resourceId,
    startTime: game.simTime,
    duration: TICK_SECONDS,
  });
}

/** Advances each traveler; on arrival credits the target (re-checking capacity — two travelers converging on the
 *  same node in one tick could both pass the departure check and jointly overflow) or drops it if that now fails. */
export function advanceTravelers(game: GameState) {
  if (game.travelers.length === 0) return;
  const stillTraveling = [];
  for (const t of game.travelers) {
    if (game.simTime - t.startTime >= t.duration) {
      const edge = game.getEdge(t.edgeId);
      tryDeliver(edge ? game.getNode(edge.targetId) : undefined, t.resourceId);
    } else {
      stillTraveling.push(t);
    }
  }
  game.travelers = stillTraveling;
}

/** Runs each node's `process` once per elapsed tick (a `while` loop for fast-forward catch-up, so per-tick
 *  effects stay exact rather than lumping into one big step). Passes every node, for globally-dependent rules. */
export function processNodes(game: GameState) {
  for (const node of game.nodes) {
    const typeDef = getNodeType(node);
    if (!typeDef?.process) continue;
    while (game.simTime - node.lastProcessTime >= TICK_SECONDS) {
      node.lastProcessTime += TICK_SECONDS;
      typeDef.process(node, game.nodes);
    }
  }
}
