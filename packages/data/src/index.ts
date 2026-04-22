/**
 * @aquascape/data — public entry.
 *
 * Re-exports the canonical Plant schema and provides typed accessors over
 * `plants.json`. Every downstream consumer (sim, render, app) imports from
 * here to avoid hand-rolling the type.
 */

import plantsJson from "../plants.json" with { type: "json" };
import { plantArraySchema, type Plant } from "./schema.js";

export * from "./schema.js";

/**
 * Runtime-validated array of all plants.
 * Throws at import time if plants.json ever drifts from the schema — this
 * gives every consumer (and CI) a single, early failure.
 */
export const plants: ReadonlyArray<Plant> = plantArraySchema.parse(plantsJson);

export function byId(id: string): Plant | undefined {
  return plants.find((p) => p.id === id);
}

export function bySpecies(scientificName: string): Plant | undefined {
  return plants.find(
    (p) => p.scientificName.toLowerCase() === scientificName.toLowerCase(),
  );
}

export function byDifficulty(difficulty: 1 | 2 | 3 | 4 | 5): Plant[] {
  return plants.filter((p) => p.difficulty === difficulty);
}

export function byGrowthForm(form: Plant["growthForm"]): Plant[] {
  return plants.filter((p) => p.growthForm === form);
}
