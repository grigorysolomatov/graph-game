import type { GraphNode, NodeTypeDef } from '../types';
import { RESOURCE_TYPES } from '../resources';

const STORAGE_CAPACITY = 100;

function canAccept(node: GraphNode, resourceId: string, amount: number): boolean {
  if (resourceId === 'labor') return false;
  const hasOtherResource = Object.entries(node.inventory).some(
    ([id, count]) => id !== resourceId && count > 0,
  );
  if (hasOtherResource) return false;
  const current = node.inventory[resourceId] ?? 0;
  return current + amount <= STORAGE_CAPACITY;
}

export const storageType: NodeTypeDef = {
  id: 'storage',
  emoji: '📦',
  label: 'Storage',
  description: 'Holds up to 100 units of a single resource type. No conversion.',
  color: '#57534e',
  capacities: Object.fromEntries(
    RESOURCE_TYPES.filter((r) => r.id !== 'labor').map((r) => [r.id, STORAGE_CAPACITY]),
  ),
  canAccept,
  capacityNote: '100 of any single resource type.',
};
