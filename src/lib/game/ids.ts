let idCounter = 0;

/** Monotonic unique id with a type prefix (e.g. `node-7`). Shared by state mutations and the simulation so both mint ids from one sequence. */
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
