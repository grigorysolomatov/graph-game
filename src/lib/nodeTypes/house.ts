import type { GraphNode, NodeTypeDef } from '../types';

const LABOR_CAPACITY = 10;

function process(node: GraphNode) {
  const current = node.inventory.labor ?? 0;
  if (current < LABOR_CAPACITY) {
    node.inventory.labor = current + 1;
  }
}

export const houseType: NodeTypeDef = {
  id: 'house',
  icon: '🏠',
  label: 'House',
  description: 'Generates labor over time, up to a cap of 10.',
  color: '#a16207',
  capacities: { labor: LABOR_CAPACITY },
  process,
  production: ['1 💪 per tick.'],
};
