export interface ResourceTypeDef {
  id: string;
  emoji: string;
  label: string;
  /** Whether this resource can be assigned to an edge and travel between nodes. Defaults to true; sun never leaves the farm that made it. */
  transportable?: boolean;
}

export const RESOURCE_TYPES: ResourceTypeDef[] = [
  { id: 'food', emoji: '🥕', label: 'Food' },
  { id: 'sun', emoji: '☀️', label: 'Sun', transportable: false },
  { id: 'labor', emoji: '💪', label: 'Labor' },
  { id: 'tree', emoji: '🌳', label: 'Tree', transportable: false },
  { id: 'wood', emoji: '🪵', label: 'Wood' },
];

/** No cap on any known resource — the default `capacities` for a node type without its own restriction. */
export const UNLIMITED_CAPACITIES: Record<string, number> = Object.fromEntries(
  RESOURCE_TYPES.map((r) => [r.id, Infinity]),
);
