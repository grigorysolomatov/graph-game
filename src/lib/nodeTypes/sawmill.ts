import type { GraphNode, NodeTypeDef } from '../types';
import { UNLIMITED_CAPACITIES } from '../resources';

function process(node: GraphNode) {
  // Convert as many wood+labor pairs into planks as the scarcer of the two allows (bulk, not rate-limited).
  const wood = node.inventory.wood ?? 0;
  const labor = node.inventory.labor ?? 0;
  const converted = Math.min(wood, labor);
  if (converted > 0) {
    node.inventory.wood = wood - converted;
    node.inventory.labor = labor - converted;
    node.inventory.plank = (node.inventory.plank ?? 0) + converted;
  }
}

export const sawmillType: NodeTypeDef = {
  id: 'sawmill',
  icon: '🪚',
  label: 'Sawmill',
  description: 'Converts wood and labor into planks.',
  color: '#b45309',
  capacities: { ...UNLIMITED_CAPACITIES },
  process,
  conversions: [{ inputs: ['wood', 'labor'], outputs: ['plank'] }],
};
