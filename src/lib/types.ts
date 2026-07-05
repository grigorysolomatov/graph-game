export interface NodeTypeDef {
  id: string;
  /** A single emoji, or a stack of layered emoji (base first, topmost last) rendered centered on one another. */
  emoji: string | string[];
  label: string;
  description: string;
  color: string;
  initialInventory?: Record<string, number>;
  /** Max units of a given resource this node kind can hold; absent/unspecified resourceId means it cannot hold that resource at all. */
  capacities?: Record<string, number>;
  /** Overrides the default `count <= capacities[resourceId]` acceptance check entirely, for rules that depend on the rest of the inventory. */
  canAccept?: (node: GraphNode, resourceId: string, amount: number) => boolean;
  /** Runs once per simulation tick, transforming this node's inventory in place. Also receives every node on the map, for rules that depend on global state. */
  process?: (node: GraphNode, allNodes: GraphNode[]) => void;
}

export interface GraphNode {
  id: string;
  typeId: string;
  x: number;
  y: number;
  inventory: Record<string, number>;
  lastProcessTime: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  resourceId: string | null;
  lastSpawnTime: number;
}

export interface ResourceTraveler {
  id: string;
  edgeId: string;
  resourceId: string;
  startTime: number;
  duration: number;
}

/** Length of one simulation tick, in seconds. Governs resource departure rate, edge travel time, and node processing cadence. */
export const TICK_SECONDS = 1;

export const NODE_RADIUS = 32;

/** Perpendicular separation applied to an edge when the reverse edge also exists, so the two don't overlap. */
export const EDGE_OFFSET = 12;

export function getEdgeGeometry(source: GraphNode, target: GraphNode, offset = 0) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const gap = NODE_RADIUS + 4;
  // Perpendicular to the travel direction, rotated so a source->target/target->source pair bows out clockwise.
  const ox = uy * offset;
  const oy = -ux * offset;
  return {
    x1: source.x + ux * gap + ox,
    y1: source.y + uy * gap + oy,
    x2: target.x - ux * gap + ox,
    y2: target.y - uy * gap + oy,
    dist,
  };
}
