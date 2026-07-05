/** One visual layer of a node's icon: either an emoji character, or an image (e.g. an imported asset URL). */
export type IconLayer = string | { image: string };

export interface NodeTypeDef {
  id: string;
  /** A single icon layer, or a stack of layers (base first, topmost last) rendered centered on one another. Each layer is independently an emoji or an image. */
  icon: IconLayer | IconLayer[];
  label: string;
  description: string;
  color: string;
  initialInventory?: Record<string, number>;
  /** Max units of a given resource this node kind can hold; absent/unspecified resourceId means it cannot hold that resource at all. */
  capacities?: Record<string, number>;
  /** Overrides the Node Info panel's default per-resource `capacities` listing with a single line, for nodes whose capacity story doesn't read well as one entry per resource (e.g. Storage's "100 of any single type"). */
  capacityNote?: string;
  /** Overrides the default `count <= capacities[resourceId]` acceptance check entirely, for rules that depend on the rest of the inventory. */
  canAccept?: (node: GraphNode, resourceId: string, amount: number) => boolean;
  /** Runs once per simulation tick, transforming this node's inventory in place. Also receives every node on the map, for rules that depend on global state. */
  process?: (node: GraphNode, allNodes: GraphNode[]) => void;
  /** Resources this node generates without consuming any other resource (e.g. House's labor growth, Farm's sun collection) — free-form text, one line each, shown in the Node Info panel's Production section. Omit if this node type doesn't generate anything from nothing. */
  production?: string[];
  /** Named label/value facts shown in the Node Info panel's Parameters section (e.g. Forest's growth rate) — for nodes whose behavior is better described as a small table than prose. Values are free-form strings so a parameter can restate a number that also appears elsewhere (e.g. capacity) without needing to stay wired together. */
  parameters?: { label: string; value: string }[];
  /** Input(s) -> output(s) conversions this node performs, rendered as an emoji equation (e.g. ☀️ + 💪 → 🥕) in the Node Info panel's Conversion section. Omit if this node type doesn't convert resources. */
  conversions?: { inputs: string[]; outputs: string[] }[];
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
