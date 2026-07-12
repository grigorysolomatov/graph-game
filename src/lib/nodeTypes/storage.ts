import type { GraphNode, NodeTypeDef } from '../types';
import { RESOURCE_TYPES, uniformCapacities } from '../resources';

const STORAGE_CAPACITY = 100;

/** Resources this storage can ever hold — everything except non-storable ones (labor). */
const STORABLE_IDS = new Set(RESOURCE_TYPES.filter((r) => r.storable !== false).map((r) => r.id));

/** Holds a single resource type at a time, up to the cap: refuse anything non-storable, refuse a
 *  second distinct resource while one is already stocked, otherwise enforce the numeric cap. */
function canAccept(node: GraphNode, resourceId: string, amount: number): boolean {
  if (!STORABLE_IDS.has(resourceId)) return false;
  const holdsOther = Object.entries(node.inventory).some(([id, count]) => id !== resourceId && count > 0);
  if (holdsOther) return false;
  return (node.inventory[resourceId] ?? 0) + amount <= STORAGE_CAPACITY;
}

export const storageType: NodeTypeDef = {
  id: 'storage',
  icon: '📦',
  label: 'Storage',
  description: 'Holds up to 100 units of a single resource type. No conversion.',
  color: '#92400e',
  capacities: uniformCapacities(STORAGE_CAPACITY),
  canAccept,
  capacityNote: '100 of any single storable resource type.',
};
