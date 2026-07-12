import type { GraphNode, NodeTypeDef } from '../types';
import { UNLIMITED_CAPACITIES } from '../resources';
import { growLogistic } from './logistic';
import forestImage from '../../../assets/forest.png';

const CAPACITY = 1000;
const MAX_RATE = 10; // peak tree growth per tick, at half capacity

function process(node: GraphNode) {
  node.inventory.tree = growLogistic(node.inventory.tree ?? 0, { capacity: CAPACITY, maxRate: MAX_RATE });

  // Convert as many tree+labor pairs into wood as the scarcer of the two allows (bulk, not rate-limited).
  // Draining tree to 0 is fine: growLogistic reseeds it next tick, so the forest always recovers.
  const tree = node.inventory.tree;
  const labor = node.inventory.labor ?? 0;
  const converted = Math.min(tree, labor);
  if (converted > 0) {
    node.inventory.tree = tree - converted;
    node.inventory.labor = labor - converted;
    node.inventory.wood = (node.inventory.wood ?? 0) + converted;
  }
}

export const forestType: NodeTypeDef = {
  id: 'forest',
  icon: { image: forestImage },
  label: 'Forest',
  description: 'Grows trees on its own, then converts trees and labor into wood.',
  color: '#15803d',
  initialInventory: { tree: CAPACITY },
  capacities: { ...UNLIMITED_CAPACITIES, tree: CAPACITY },
  process,
  parameters: [
    { label: 'Carrying capacity', value: `${CAPACITY}` },
    { label: 'Max growth', value: `${MAX_RATE}/tick (at half capacity)` },
  ],
  conversions: [{ inputs: ['tree', 'labor'], outputs: ['wood'] }],
};
