import type { GraphNode, NodeTypeDef } from '../types';
import { UNLIMITED_CAPACITIES } from '../resources';

const TREE_CAPACITY = 200;
const TREE_MIN = 0.1;
const LABOR_CAPACITY = 200;
// Logistic growth dN/dt = r*N*(1-N/K). At N = K/2 = 100 this must equal 1/tick,
// so r*100*(1-100/200) = r*50 = 1 => r = 1/50.
const GROWTH_RATE = 1 / 50;

function process(node: GraphNode) {
  const tree = node.inventory.tree ?? 0;
  const growth = GROWTH_RATE * tree * (1 - tree / TREE_CAPACITY);
  node.inventory.tree = Math.min(TREE_CAPACITY, Math.max(TREE_MIN, tree + growth));

  const currentTree = node.inventory.tree;
  const labor = node.inventory.labor ?? 0;
  const availableTree = Math.max(0, currentTree - TREE_MIN);
  const converted = Math.min(availableTree, labor);
  if (converted > 0) {
    node.inventory.tree = currentTree - converted;
    node.inventory.labor = labor - converted;
    node.inventory.wood = (node.inventory.wood ?? 0) + converted;
  }
}

export const forestType: NodeTypeDef = {
  id: 'forest',
  icon: '🌲',
  label: 'Forest',
  description: 'Grows trees on its own, then converts trees and labor into wood.',
  color: '#15803d',
  initialInventory: { tree: TREE_CAPACITY },
  capacities: { ...UNLIMITED_CAPACITIES, tree: TREE_CAPACITY, labor: LABOR_CAPACITY },
  process,
  parameters: [
    { label: 'Growth rate', value: `${GROWTH_RATE.toFixed(3)}/tick (logistic)` },
    { label: 'Capacity', value: `${TREE_CAPACITY}` },
  ],
  conversions: [{ inputs: ['tree', 'labor'], outputs: ['wood'] }],
};
