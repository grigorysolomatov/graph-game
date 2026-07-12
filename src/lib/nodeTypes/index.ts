import type { GraphNode, NodeTypeDef } from '../types';
import { farmType } from './farm';
import { forestType } from './forest';
import { houseType } from './house';
import { lakeType } from './lake';
import { sawmillType } from './sawmill';
import { storageType } from './storage';
import { workshopType } from './workshop';

/**
 * Every placeable node kind, in the order the node-selection menu shows them.
 * To add a new one: write a file next to this one exporting a `NodeTypeDef`,
 * then list it here.
 */
export const NODE_TYPES: NodeTypeDef[] = [
  houseType,
  farmType,
  forestType,
  lakeType,
  sawmillType,
  workshopType,
  storageType,
];

const NODE_TYPE_BY_ID = new Map(NODE_TYPES.map((t) => [t.id, t]));

/** Looks up a node kind's `NodeTypeDef`, either from a placed node or directly from a type id (e.g. while spawning one, before it exists as a `GraphNode`). */
export function getNodeType(nodeOrTypeId: GraphNode | string): NodeTypeDef | undefined {
  const typeId = typeof nodeOrTypeId === 'string' ? nodeOrTypeId : nodeOrTypeId.typeId;
  return NODE_TYPE_BY_ID.get(typeId);
}

export function getNodeCapacity(node: GraphNode, resourceId: string): number {
  return getNodeType(node)?.capacities?.[resourceId] ?? 0;
}

export function canNodeAccept(node: GraphNode, resourceId: string, amount = 1): boolean {
  const typeDef = getNodeType(node);
  if (typeDef?.canAccept) return typeDef.canAccept(node, resourceId, amount);
  const current = node.inventory[resourceId] ?? 0;
  return current + amount <= (typeDef?.capacities?.[resourceId] ?? 0);
}
