import type { GraphNode, GraphEdge, ResourceTraveler } from '../types';
import { getNodeType } from '../nodeTypes';
import { nextId } from './ids';
import { spawnTravelers, advanceTravelers, processNodes, deliverTravelers } from './simulation';

export type SpeedSetting = 0 | 1 | 4;

export const SPEED_PRESETS: { value: SpeedSetting; label: string; icon: string }[] = [
  { value: 0, label: 'Pause', icon: '⏸️' },
  { value: 1, label: 'Normal', icon: '▶️' },
  { value: 4, label: 'Fast', icon: '⏩️' },
];

/**
 * All game data and the mutations over it, as a single reactive singleton (`game`). Camera/view state
 * lives separately in `camera.svelte.ts`; the simulation physics lives in `simulation.ts` and is called
 * from `tick`. Components import `game` directly and read/mutate it — there's no store/context plumbing.
 */
class GameState {
  nodes = $state<GraphNode[]>([]);
  edges = $state<GraphEdge[]>([]);
  travelers = $state<ResourceTraveler[]>([]);

  // selection / context-menu state (selectedNodeId and selectedEdgeId are mutually exclusive)
  selectedNodeId = $state<string | null>(null);
  selectedEdgeId = $state<string | null>(null);
  connectingFromId = $state<string | null>(null);

  // simulation clock
  simTime = $state(0);
  speed = $state<SpeedSetting>(1);
  /** The last non-zero speed the user picked (Normal or Fast) — lets pause/resume restore whichever of those was active, instead of always resuming at Normal. */
  private lastActiveSpeed: SpeedSetting = 1;

  // O(1) id lookups, rebuilt only when a node/edge is added or removed (not when one is mutated in place).
  private nodeById = $derived(new Map(this.nodes.map((n) => [n.id, n])));
  private edgeById = $derived(new Map(this.edges.map((e) => [e.id, e])));

  /** The single node-by-id lookup — prefer this over `game.nodes.find((n) => n.id === ...)` everywhere. */
  getNode(id: string | null | undefined): GraphNode | undefined {
    return id == null ? undefined : this.nodeById.get(id);
  }
  getEdge(id: string | null | undefined): GraphEdge | undefined {
    return id == null ? undefined : this.edgeById.get(id);
  }

  get isConnecting() {
    return this.connectingFromId !== null;
  }

  get isPaused() {
    return this.speed === 0;
  }

  addNode(typeId: string, x: number, y: number): GraphNode {
    const typeDef = getNodeType(typeId);
    const node: GraphNode = {
      id: nextId('node'),
      typeId,
      x,
      y,
      inventory: { ...(typeDef?.initialInventory ?? {}) },
      lastProcessTime: this.simTime,
    };
    this.nodes.push(node);
    return node;
  }

  moveNode(id: string, x: number, y: number) {
    const node = this.getNode(id);
    if (node) {
      node.x = x;
      node.y = y;
    }
  }

  removeNode(id: string) {
    const removedEdgeIds = new Set(
      this.edges.filter((e) => e.sourceId === id || e.targetId === id).map((e) => e.id),
    );
    // Deliver in-flight travelers before the edges disappear, so deleting a node/edge doesn't destroy
    // resources in transit. Travelers *targeting* this node have nowhere to go and are excluded; the rest land.
    deliverTravelers(this, removedEdgeIds, id);
    this.nodes = this.nodes.filter((n) => n.id !== id);
    this.edges = this.edges.filter((e) => e.sourceId !== id && e.targetId !== id);
    if (this.selectedNodeId === id) this.selectedNodeId = null;
    if (this.connectingFromId === id) this.connectingFromId = null;
  }

  addEdge(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const exists = this.edges.some((e) => e.sourceId === sourceId && e.targetId === targetId);
    if (exists) return;
    this.edges.push({ id: nextId('edge'), sourceId, targetId, resourceId: null, lastSpawnTime: this.simTime });
  }

  /** Whether an edge already runs the opposite direction between these two nodes — used both to reject duplicate edges and to decide whether `EdgeView`/`TravelerView` need to bow their line out via `EDGE_OFFSET`. */
  hasReverseEdge(sourceId: string, targetId: string): boolean {
    return this.edges.some((e) => e.sourceId === targetId && e.targetId === sourceId);
  }

  removeEdge(id: string) {
    deliverTravelers(this, new Set([id]));
    this.edges = this.edges.filter((e) => e.id !== id);
    if (this.selectedEdgeId === id) this.selectedEdgeId = null;
  }

  setEdgeResource(edgeId: string, resourceId: string | null) {
    const edge = this.getEdge(edgeId);
    if (!edge) return;
    edge.resourceId = resourceId;
    edge.lastSpawnTime = this.simTime;
  }

  /** Click on a node: either finishes a pending connection, or toggles its context menu. */
  clickNode(id: string) {
    if (this.connectingFromId) {
      if (this.connectingFromId !== id) this.addEdge(this.connectingFromId, id);
      this.connectingFromId = null;
      this.selectedNodeId = null;
      this.selectedEdgeId = null;
      return;
    }
    this.selectedEdgeId = null;
    this.selectedNodeId = this.selectedNodeId === id ? null : id;
  }

  clickEdge(id: string) {
    if (this.connectingFromId) this.connectingFromId = null;
    this.selectedNodeId = null;
    this.selectedEdgeId = this.selectedEdgeId === id ? null : id;
  }

  startConnectFrom(id: string) {
    this.connectingFromId = id;
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
  }

  clearSelection() {
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.connectingFromId = null;
  }

  setSpeed(speed: SpeedSetting) {
    if (speed !== 0) this.lastActiveSpeed = speed;
    this.speed = speed;
  }

  /** Toggles between paused and running — resuming at whatever speed (Normal or Fast) was active before pausing. */
  togglePause() {
    this.setSpeed(this.speed === 0 ? this.lastActiveSpeed : 0);
  }

  tick(dtSeconds: number) {
    if (this.speed === 0) return;
    this.simTime += dtSeconds * this.speed;
    spawnTravelers(this);
    advanceTravelers(this);
    processNodes(this);
  }
}

export type { GameState };
export const game = new GameState();
