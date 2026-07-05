import type { GraphNode, GraphEdge, ResourceTraveler } from './types';
import { TICK_SECONDS } from './types';
import { getNodeType, canNodeAccept } from './nodeTypes';

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export type SpeedSetting = 0 | 1 | 4;

export const SPEED_PRESETS: { value: SpeedSetting; label: string; icon: string }[] = [
  { value: 0, label: 'Pause', icon: '⏸️' },
  { value: 1, label: 'Normal', icon: '▶️' },
  { value: 4, label: 'Fast', icon: '⏩️' },
];

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

class GameState {
  nodes = $state<GraphNode[]>([]);
  edges = $state<GraphEdge[]>([]);
  travelers = $state<ResourceTraveler[]>([]);

  // selection / context-menu state
  selectedNodeId = $state<string | null>(null);
  selectedEdgeId = $state<string | null>(null);
  connectingFromId = $state<string | null>(null);

  // simulation clock
  simTime = $state(0);
  speed = $state<SpeedSetting>(1);
  /** The last non-zero speed the user picked (Normal or Fast) — lets pause/resume (e.g. via the space key) restore whichever of those was active, instead of always resuming at Normal. */
  private lastActiveSpeed: SpeedSetting = 1;

  // camera: maps world coordinates (where nodes/edges live) to screen coordinates (where pointer events land)
  camera = $state<Camera>({ x: 0, y: 0, zoom: 1 });

  get isConnecting() {
    return this.connectingFromId !== null;
  }

  get isPaused() {
    return this.speed === 0;
  }

  screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - this.camera.x) / this.camera.zoom,
      y: (screenY - this.camera.y) / this.camera.zoom,
    };
  }

  worldToScreen(worldX: number, worldY: number) {
    return {
      x: worldX * this.camera.zoom + this.camera.x,
      y: worldY * this.camera.zoom + this.camera.y,
    };
  }

  panBy(dx: number, dy: number) {
    this.camera.x += dx;
    this.camera.y += dy;
  }

  /** Zooms so that the world point currently at `screenAnchor` ends up at `screenTarget`. Powers both wheel zoom (anchor === target) and pinch zoom (anchor is the pinch midpoint's previous position, target is its new one), so a pinch can pan and zoom in the same step. */
  zoomToward(screenAnchor: { x: number; y: number }, screenTarget: { x: number; y: number }, nextZoom: number) {
    const worldAnchor = this.screenToWorld(screenAnchor.x, screenAnchor.y);
    const clamped = clampZoom(nextZoom);
    this.camera.zoom = clamped;
    this.camera.x = screenTarget.x - worldAnchor.x * clamped;
    this.camera.y = screenTarget.y - worldAnchor.y * clamped;
  }

  zoomAt(screenPoint: { x: number; y: number }, nextZoom: number) {
    this.zoomToward(screenPoint, screenPoint, nextZoom);
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
    const node = this.nodes.find((n) => n.id === id);
    if (node) {
      node.x = x;
      node.y = y;
    }
  }

  removeNode(id: string) {
    const removedEdgeIds = new Set(
      this.edges.filter((e) => e.sourceId === id || e.targetId === id).map((e) => e.id),
    );
    // Deliver in-flight travelers before the edges disappear, so deleting a node/edge doesn't
    // destroy resources that were already in transit. Travelers *targeting* this node have
    // nowhere to go (it's being deleted too) and are excluded; everything else lands instantly.
    this.deliverTravelers(removedEdgeIds, id);
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
    this.deliverTravelers(new Set([id]));
    this.edges = this.edges.filter((e) => e.id !== id);
    if (this.selectedEdgeId === id) this.selectedEdgeId = null;
  }

  /** Credits `amount` of `resourceId` to `node`'s inventory if capacity/exclusivity rules allow it; silently does nothing otherwise (the unit is lost, same trade-off as an overflowing arrival). */
  private tryDeliver(node: GraphNode | undefined, resourceId: string, amount = 1) {
    if (!node || !canNodeAccept(node, resourceId, amount)) return;
    node.inventory[resourceId] = (node.inventory[resourceId] ?? 0) + amount;
  }

  /** Instantly delivers in-flight travelers on the given (about-to-be-removed) edges to their target's inventory, respecting capacity, instead of destroying them. `excludeTargetId` skips delivery for edges whose target is itself being deleted (nowhere to deliver to). Must run before the edges themselves are removed from `this.edges`, since it looks up each traveler's edge to find its target. */
  private deliverTravelers(edgeIds: Set<string>, excludeTargetId?: string) {
    if (edgeIds.size === 0) return;
    for (const t of this.travelers) {
      if (!edgeIds.has(t.edgeId)) continue;
      const edge = this.edges.find((e) => e.id === t.edgeId);
      if (!edge || edge.targetId === excludeTargetId) continue;
      const target = this.nodes.find((n) => n.id === edge.targetId);
      this.tryDeliver(target, t.resourceId);
    }
    this.travelers = this.travelers.filter((t) => !edgeIds.has(t.edgeId));
  }

  setEdgeResource(edgeId: string, resourceId: string | null) {
    const edge = this.edges.find((e) => e.id === edgeId);
    if (!edge) return;
    edge.resourceId = resourceId;
    edge.lastSpawnTime = this.simTime;
  }

  /** Click on a node: either finishes a pending connection, or toggles its context menu. */
  clickNode(id: string) {
    if (this.connectingFromId) {
      if (this.connectingFromId !== id) {
        this.addEdge(this.connectingFromId, id);
      }
      this.connectingFromId = null;
      this.selectedNodeId = null;
      this.selectedEdgeId = null;
      return;
    }
    this.selectedEdgeId = null;
    this.selectedNodeId = this.selectedNodeId === id ? null : id;
  }

  clickEdge(id: string) {
    if (this.connectingFromId) {
      this.connectingFromId = null;
    }
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

  /** Toggles between paused and running — resuming at whatever speed (Normal or Fast) was active before pausing, not always Normal. */
  togglePause() {
    this.setSpeed(this.speed === 0 ? this.lastActiveSpeed : 0);
  }

  tick(dtSeconds: number) {
    if (this.speed === 0) return;
    this.simTime += dtSeconds * this.speed;
    this.spawnTravelers();
    this.advanceTravelers();
    this.processNodes();
  }

  private spawnTravelers() {
    for (const edge of this.edges) {
      if (!edge.resourceId) continue;
      while (this.simTime - edge.lastSpawnTime >= TICK_SECONDS) {
        edge.lastSpawnTime += TICK_SECONDS;
        this.trySpawnOnEdge(edge);
      }
    }
  }

  private trySpawnOnEdge(edge: GraphEdge) {
    const resourceId = edge.resourceId;
    if (!resourceId) return;
    const source = this.nodes.find((n) => n.id === edge.sourceId);
    const target = this.nodes.find((n) => n.id === edge.targetId);
    if (!source || !target) return;
    const available = source.inventory[resourceId] ?? 0;
    if (available < 1) return;
    if (!canNodeAccept(target, resourceId, 1)) return;
    source.inventory[resourceId] = available - 1;
    this.travelers.push({
      id: nextId('traveler'),
      edgeId: edge.id,
      resourceId,
      startTime: this.simTime,
      duration: TICK_SECONDS,
    });
  }

  private processNodes() {
    for (const node of this.nodes) {
      const typeDef = getNodeType(node);
      if (!typeDef?.process) continue;
      while (this.simTime - node.lastProcessTime >= TICK_SECONDS) {
        node.lastProcessTime += TICK_SECONDS;
        typeDef.process(node, this.nodes);
      }
    }
  }

  private advanceTravelers() {
    if (this.travelers.length === 0) return;
    const stillTraveling: ResourceTraveler[] = [];
    for (const t of this.travelers) {
      if (this.simTime - t.startTime >= t.duration) {
        const edge = this.edges.find((e) => e.id === t.edgeId);
        const target = edge ? this.nodes.find((n) => n.id === edge.targetId) : undefined;
        // Re-check capacity on arrival, not just at departure: two travelers converging on the
        // same node in the same tick (e.g. two edges feeding one Chest) could otherwise both pass
        // the departure-time check and jointly overflow the target's capacity on arrival.
        this.tryDeliver(target, t.resourceId);
      } else {
        stillTraveling.push(t);
      }
    }
    this.travelers = stillTraveling;
  }
}

export const game = new GameState();
