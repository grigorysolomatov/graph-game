import type { GraphNode, NodeTypeDef } from '../types';
import { UNLIMITED_CAPACITIES } from '../resources';
import { growLogistic } from './logistic';

const CAPACITY = 1000;
const MAX_RATE = 10; // peak fish growth per tick, at half capacity

function process(node: GraphNode) {
  node.inventory.fish = growLogistic(node.inventory.fish ?? 0, { capacity: CAPACITY, maxRate: MAX_RATE });

  // Convert as many fish+labor pairs into food as the scarcer of the two allows (bulk, not rate-limited).
  // Draining fish to 0 is fine: growLogistic reseeds it next tick, so the lake always recovers.
  const fish = node.inventory.fish;
  const labor = node.inventory.labor ?? 0;
  const converted = Math.min(fish, labor);
  if (converted > 0) {
    node.inventory.fish = fish - converted;
    node.inventory.labor = labor - converted;
    node.inventory.food = (node.inventory.food ?? 0) + converted;
  }
}

export const lakeType: NodeTypeDef = {
  id: 'lake',
  icon: '🏞️',
  label: 'Lake',
  description: 'Fish breed on their own, then convert with labor into food.',
  color: '#0891b2',
  initialInventory: { fish: CAPACITY },
  capacities: { ...UNLIMITED_CAPACITIES, fish: CAPACITY },
  process,
  parameters: [
    { label: 'Carrying capacity', value: `${CAPACITY}` },
    { label: 'Max growth', value: `${MAX_RATE}/tick (at half capacity)` },
  ],
  conversions: [{ inputs: ['fish', 'labor'], outputs: ['food'] }],
};
