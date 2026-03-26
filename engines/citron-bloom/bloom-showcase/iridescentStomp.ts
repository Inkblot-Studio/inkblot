import { Color, Group, MathUtils, Mesh, MeshPhysicalMaterial, TorusGeometry } from 'three';

/**
 * Vertebrae-like stacked tori with iridescent physical shading — central “stomp” for showcase scenes.
 */
export function createIridescentStomp(): Group {
  const g = new Group();
  const n = 16;
  const baseHue = 0.58;

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const major = MathUtils.lerp(0.52, 0.28, t);
    const minor = MathUtils.lerp(0.11, 0.07, t);
    const geo = new TorusGeometry(major, minor, 14, 40);
    const mat = new MeshPhysicalMaterial({
      color: new Color().setHSL(baseHue + t * 0.06, 0.35, 0.52),
      metalness: 0.94,
      roughness: MathUtils.lerp(0.14, 0.26, t),
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      iridescence: 1,
      iridescenceIOR: 1.25,
      iridescenceThicknessRange: [80, 380],
      emissive: new Color(0x2a0a44),
      emissiveIntensity: MathUtils.lerp(0.22, 0.08, t),
    });
    const mesh = new Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = t * 0.32 - 0.85;
    mesh.rotation.z = t * 0.35 + (i % 3) * 0.08;
    g.add(mesh);
  }

  return g;
}

export function disposeIridescentStomp(group: Group): void {
  group.traverse((obj) => {
    const m = obj as Mesh;
    if (m.isMesh) {
      m.geometry?.dispose();
      (m.material as MeshPhysicalMaterial)?.dispose?.();
    }
  });
}
