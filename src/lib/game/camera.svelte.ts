/**
 * The pan/zoom view state — the sole mapping between world coordinates (where nodes/edges live,
 * unaffected by pan/zoom) and screen coordinates (client pixels relative to `#game-map`'s top-left).
 * Formula: `screen = world * zoom + {x,y}`. It has no dependency on graph data, so it lives in its
 * own singleton; any code converting between a pointer event and a node position must go through
 * `worldToScreen`/`screenToWorld` here rather than assuming a 1:1 mapping.
 */
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3;

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

class Camera {
  state = $state<CameraState>({ x: 0, y: 0, zoom: 1 });

  get x() {
    return this.state.x;
  }
  get y() {
    return this.state.y;
  }
  get zoom() {
    return this.state.zoom;
  }

  screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - this.state.x) / this.state.zoom,
      y: (screenY - this.state.y) / this.state.zoom,
    };
  }

  worldToScreen(worldX: number, worldY: number) {
    return {
      x: worldX * this.state.zoom + this.state.x,
      y: worldY * this.state.zoom + this.state.y,
    };
  }

  panBy(dx: number, dy: number) {
    this.state.x += dx;
    this.state.y += dy;
  }

  /** Zooms so the world point currently at `screenAnchor` ends up at `screenTarget`. Powers both wheel zoom
   *  (anchor === target) and pinch zoom (anchor is the pinch midpoint's previous position, target its new one),
   *  so a pinch can pan and zoom in one step. */
  zoomToward(screenAnchor: { x: number; y: number }, screenTarget: { x: number; y: number }, nextZoom: number) {
    const worldAnchor = this.screenToWorld(screenAnchor.x, screenAnchor.y);
    const clamped = clampZoom(nextZoom);
    this.state.zoom = clamped;
    this.state.x = screenTarget.x - worldAnchor.x * clamped;
    this.state.y = screenTarget.y - worldAnchor.y * clamped;
  }

  zoomAt(screenPoint: { x: number; y: number }, nextZoom: number) {
    this.zoomToward(screenPoint, screenPoint, nextZoom);
  }
}

export const camera = new Camera();
