import type { GraphNode, NodeTypeDef } from '../types';

const SUN_CAPACITY = 10;
const FOOD_CAPACITY = 10;
const LABOR_CAPACITY = 10;

function process(node: GraphNode) {
  const sun = node.inventory.sun ?? 0;
  if (sun < SUN_CAPACITY) {
    node.inventory.sun = sun + 1;
  }

  const currentSun = node.inventory.sun ?? 0;
  const labor = node.inventory.labor ?? 0;
  const food = node.inventory.food ?? 0;
  const room = Math.max(0, FOOD_CAPACITY - food);
  const converted = Math.min(currentSun, labor, room);
  if (converted > 0) {
    node.inventory.sun = currentSun - converted;
    node.inventory.labor = labor - converted;
    node.inventory.food = food + converted;
  }
}

export const farmType: NodeTypeDef = {
  id: 'farm',
  emoji: '🛖',
  label: 'Farm',
  description: 'Collects sun on its own, then converts sun and labor into food.',
  color: '#65a30d',
  capacities: { sun: SUN_CAPACITY, labor: LABOR_CAPACITY, food: FOOD_CAPACITY },
  process,
  production: ['1 ☀️ per tick.'],
  conversions: [{ inputs: ['sun', 'labor'], outputs: ['food'] }],
};
