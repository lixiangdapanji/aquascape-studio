/**
 * @aquascape/render — Phase 1 scene primitives.
 *
 * Phase 1 partial surface: Tank, Lighting, WaterVolume, palette + types.
 * The full <Aquarium> composition (Rock, Plant, Storybook) lands in a
 * follow-up once render-agent finishes Phase 1.
 */

export * from "./palette.js";
export * from "./types.js";
export { Tank } from "./scene/Tank.js";
export { Lighting } from "./scene/Lighting.js";
export { WaterVolume } from "./scene/WaterVolume.js";
