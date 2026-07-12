export interface ResourceTypeDef {
  id: string;
  /** Text icon, used everywhere and required (it's the fallback, and the only option a `<select>` dropdown can show). */
  emoji: string;
  label: string;
  /** Optional image (imported asset URL) shown instead of `emoji` in visual contexts — inventory badges,
   *  travelers, and the info panel — for resources whose emoji reads poorly. The dropdown still uses `emoji`. */
  image?: string;
  /** Whether this resource can be assigned to an edge and travel between nodes. Defaults to true; sun/tree never leave the node that made them. */
  transportable?: boolean;
  /** Whether a generic storage node can hold this resource. Defaults to true; labor is consumed on the spot and never stockpiled. */
  storable?: boolean;
}

import plankImage from '../../assets/plank.svg';

export const RESOURCE_TYPES: ResourceTypeDef[] = [
  { id: 'food', emoji: '🥕', label: 'Food' },
  { id: 'sun', emoji: '☀️', label: 'Sun', transportable: false },
  { id: 'labor', emoji: '💪', label: 'Labor', storable: false },
  { id: 'tree', emoji: '🌳', label: 'Tree', transportable: false },
  { id: 'wood', emoji: '🪵', label: 'Wood' },
  { id: 'plank', emoji: '🟫', label: 'Plank', image: plankImage },
  { id: 'furniture', emoji: '🪑', label: 'Furniture' },
  { id: 'fish', emoji: '🐟', label: 'Fish', transportable: false },
];

const RESOURCE_BY_ID = new Map(RESOURCE_TYPES.map((r) => [r.id, r]));

/** The single lookup for a resource's definition — prefer this over re-writing `RESOURCE_TYPES.find(...)` inline. */
export function getResource(id: string): ResourceTypeDef | undefined {
  return RESOURCE_BY_ID.get(id);
}

/** No cap on any known resource — the default `capacities` for a node type without its own restriction. */
export const UNLIMITED_CAPACITIES: Record<string, number> = Object.fromEntries(
  RESOURCE_TYPES.map((r) => [r.id, Infinity]),
);

/** A `capacities` object with the same finite cap for every known resource (e.g. Storage's uniform 100). */
export function uniformCapacities(cap: number): Record<string, number> {
  return Object.fromEntries(RESOURCE_TYPES.map((r) => [r.id, cap]));
}
