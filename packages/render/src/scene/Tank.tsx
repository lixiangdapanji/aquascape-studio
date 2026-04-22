import { useMemo } from "react";
import * as THREE from "three";
import { GLASS_TINT, SUBSTRATE_DRY, SUBSTRATE_WET } from "../palette";
import type { TankSizeCm } from "../types";

interface TankProps {
  sizeCm: TankSizeCm;
}

/**
 * Tank = four glass panes (front + two sides + back) plus a substrate slab.
 * Top is open; the water surface is drawn by `WaterVolume`.
 *
 * Draw-call budget: 5 meshes max (4 glass + 1 substrate). Glass panes share a
 * single material so modern three batches them into ~2 draw calls when sorted.
 */
export function Tank({ sizeCm }: TankProps) {
  const [w, d, h] = sizeCm;
  // Convert cm to world units. We treat 1 world unit = 1 cm so props are readable.
  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: GLASS_TINT,
        transparent: true,
        opacity: 0.18,
        roughness: 0.08,
        metalness: 0.0,
        side: THREE.DoubleSide,
        // No refraction in phase 1.
        depthWrite: false,
      }),
    [],
  );

  const substrateMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: SUBSTRATE_DRY,
      roughness: 0.95,
      metalness: 0.0,
    });
    // Low-frequency height variation baked into a vertex colour mix would be
    // ideal; for phase 1 we fake wetness by slightly darkening toward the glass
    // with an onBeforeCompile hook.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWet = { value: new THREE.Color(SUBSTRATE_WET) };
      shader.uniforms.uHalfExtent = {
        value: new THREE.Vector2(w / 2, d / 2),
      };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>\nvarying vec3 vLocalPos;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>\nvLocalPos = position;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>\nvarying vec3 vLocalPos;\nuniform vec3 uWet;\nuniform vec2 uHalfExtent;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
           // Wetness term: 1 at centre, fades to 0 within 2cm of the glass.
           vec2 dToEdge = uHalfExtent - abs(vLocalPos.xz);
           float wet = smoothstep(0.0, 3.0, min(dToEdge.x, dToEdge.y));
           diffuseColor.rgb = mix(uWet, diffuseColor.rgb, wet);`,
        );
    };
    return mat;
  }, [w, d]);

  const substrateThickness = 3; // cm
  const glassThickness = 0.4; // cm

  return (
    <group>
      {/* Substrate slab sitting at Y = 0 (top surface at Y = substrateThickness/2 + substrateThickness/2 = substrateThickness) */}
      <mesh
        position={[0, substrateThickness / 2, 0]}
        castShadow={false}
        receiveShadow
        material={substrateMat}
      >
        <boxGeometry args={[w - glassThickness * 2, substrateThickness, d - glassThickness * 2]} />
      </mesh>

      {/* Front pane (+Z face) */}
      <mesh position={[0, h / 2, d / 2]} material={glassMat}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* Back pane */}
      <mesh
        position={[0, h / 2, -d / 2]}
        rotation={[0, Math.PI, 0]}
        material={glassMat}
      >
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* Left pane */}
      <mesh
        position={[-w / 2, h / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={glassMat}
      >
        <planeGeometry args={[d, h]} />
      </mesh>
      {/* Right pane */}
      <mesh
        position={[w / 2, h / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        material={glassMat}
      >
        <planeGeometry args={[d, h]} />
      </mesh>
    </group>
  );
}
