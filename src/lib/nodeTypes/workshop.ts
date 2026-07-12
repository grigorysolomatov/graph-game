import type { GraphNode, NodeTypeDef } from '../types';
import { UNLIMITED_CAPACITIES } from '../resources';

function process(node: GraphNode) {
  // Convert as many plank+labor pairs into furniture as the scarcer of the two allows (bulk, not rate-limited).
  const plank = node.inventory.plank ?? 0;
  const labor = node.inventory.labor ?? 0;
  const converted = Math.min(plank, labor);
  if (converted > 0) {
    node.inventory.plank = plank - converted;
    node.inventory.labor = labor - converted;
    node.inventory.furniture = (node.inventory.furniture ?? 0) + converted;
  }
}

export const workshopType: NodeTypeDef = {
  id: 'workshop',
  icon: '🛠️',
  label: 'Workshop',
  description: 'Converts planks and labor into furniture.',
  color: '#7c3aed',
  capacities: { ...UNLIMITED_CAPACITIES },
  process,
  conversions: [{ inputs: ['plank', 'labor'], outputs: ['furniture'] }],
};
