/**
 * Logistic population growth, shared by any node that grows a resource toward a ceiling
 * (Forest's trees, Lake's fish, …).
 *
 * The model is `dN/dt = r·N·(1 − N/K)`. Its growth peaks at `N = K/2`, where it equals `r·K/4`.
 * So rather than specifying the abstract rate `r`, a node specifies the two quantities that read
 * as game design — the **carrying capacity** `K` and the **max growth per tick** — and `r` is
 * derived from them: `r = 4·maxRate / K`.
 */
export interface LogisticParams {
  /** Carrying capacity `K`: the population ceiling. */
  capacity: number;
  /** Peak growth per tick, reached at half capacity. Determines the logistic rate `r = 4·maxRate/K`. */
  maxRate: number;
  /** Small floor the population is seeded/kept at, so it can regrow after being fully harvested
   *  (logistic growth from exactly 0 would stay 0 forever). */
  min?: number;
}

/** One tick of logistic growth: returns the next population, seeded to `min` and clamped to `capacity`. */
export function growLogistic(current: number, { capacity, maxRate, min = 0.5 }: LogisticParams): number {
  const n = Math.max(min, current);
  const r = (4 * maxRate) / capacity;
  const growth = r * n * (1 - n / capacity);
  return Math.min(capacity, Math.max(min, n + growth));
}
