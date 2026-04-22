/**
 * Phase-1 public types for `@aquascape/render`.
 * Units: centimetres unless noted. World origin sits at the tank's substrate centre,
 * Y axis is up, Z axis is the viewer's forward.
 */

export type Vec3 = [number, number, number];

/** Tank dimensions in centimetres — [width X, depth Z, height Y]. */
export type TankSizeCm = [number, number, number];

/** A single procedural hardscape rock. Position is on-substrate (Y handled internally). */
export interface RockSpec {
  id: string;
  /** Centimetre offset from tank centre on the substrate plane. */
  position: [number, number];
  /** Y-axis rotation in radians. */
  rotationY?: number;
  /** Approximate radius of the deformed icosahedron, in centimetres. */
  radiusCm: number;
  /** 0..1 seed for noise deformation — same seed -> same rock. */
  seed?: number;
}

/** A single Phase-1 plant placeholder (stem morphology only for now). */
export interface PlantSpec {
  id: string;
  /** Centimetre offset from tank centre on the substrate plane. */
  position: [number, number];
  /** Y-axis rotation in radians. */
  rotationY?: number;
  /** Target plant height in centimetres. */
  heightCm: number;
  /** How many internodes/leaf pairs along the stem. */
  nodeCount?: number;
  /** Phase-2 morphology switch. Phase 1 ignores non-stem values. */
  morphology?: "stem" | "rosette" | "carpet" | "moss" | "epiphyte" | "floating";
}

export type CameraPreset =
  | "front"
  | "three-quarter"
  | "top-down"
  | "orbit";

export interface AquariumProps {
  tankSizeCm: TankSizeCm;
  hardscape?: readonly RockSpec[];
  plants?: readonly PlantSpec[];
  /** Camera preset; "orbit" is the Storybook default. */
  camera?: CameraPreset;
  /** Optional data-testid forwarded to the canvas container. */
  "data-testid"?: string;
}
