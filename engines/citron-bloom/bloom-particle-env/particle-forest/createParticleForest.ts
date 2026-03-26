import { Group, Vector3 } from 'three';
import type { BloomLod } from '../../bloom-core/types';
import { BloomTokens } from '../../bloom-core/tokens';
import { createInstancedParticleCloud } from '../particles-core/instancedParticleCloud';
import type { EnvParticleSample, ParticleEnvHandle } from '../particles-core/types';
import { buildParticleTreeSamples } from '../particle-trees/buildTreeSamples';

export interface ParticleForestConfig {
  lod?: BloomLod;
  /** Number of trees. */
  treeCount?: number;
  /** Per-tree particle budget (scaled by LOD). */
  particleBudgetPerTree?: number;
  /** Arena radius for XZ placement. */
  radius?: number;
  /** Min distance between tree bases (approximate). */
  minSeparation?: number;
  seed?: number;
}

function hash01(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Many particle trees on XZ via stratified noise; single merged InstancedMesh.
 */
export function createParticleForest(config: ParticleForestConfig = {}): ParticleEnvHandle {
  const treeCount = config.treeCount ?? 9;
  const radius = config.radius ?? 6.2;
  const minSep = config.minSeparation ?? 1.35;
  const seed = config.seed ?? 42;
  const perTreeBudget = config.particleBudgetPerTree ?? 1400;

  const positions: Vector3[] = [];
  let attempts = 0;
  const maxAttempts = treeCount * 80;

  while (positions.length < treeCount && attempts < maxAttempts) {
    attempts++;
    const i = positions.length;
    const a = hash01(seed, i * 3 + attempts) * Math.PI * 2;
    const r = (0.35 + hash01(seed, i * 7 + attempts) * 0.65) * radius;
    const p = new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    let ok = true;
    for (const q of positions) {
      if (p.distanceTo(q) < minSep) {
        ok = false;
        break;
      }
    }
    if (ok) positions.push(p);
  }

  const chunks: EnvParticleSample[][] = [];
  for (let t = 0; t < positions.length; t++) {
    const hue = hash01(seed, t * 11);
    const scale = 0.72 + hash01(seed, t * 19) * 0.55;
    const yaw = hash01(seed, t * 5) * Math.PI * 2;
    const trunk = BloomTokens.citron600.clone().lerp(BloomTokens.citron500, hue * 0.4);
    const leaf = BloomTokens.success.clone().lerp(BloomTokens.citron300, hue * 0.25);

    chunks.push(
      buildParticleTreeSamples({
        lod: config.lod,
        particleBudget: perTreeBudget,
        height: 1.2,
        sway: 0.1 + hash01(seed, t * 13) * 0.08,
        offset: positions[t],
        scale,
        yaw,
        trunkColor: trunk,
        branchColor: BloomTokens.citron500.clone().lerp(trunk, 0.35),
        leafColor: leaf,
      }),
    );
  }

  const total = chunks.reduce((a, c) => a + c.length, 0);
  const all: EnvParticleSample[] = new Array(total);
  let o = 0;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++) all[o++] = c[i]!;
  }

  const cloud = createInstancedParticleCloud(all, {
    baseRadius: 0.018,
    segments: 6,
    wind: 1.05,
    cohesion: 0.62,
    fadeNear: 38,
    fadeFar: 95,
    alpha: 0.86,
    coreColor: BloomTokens.citron700,
    rimColor: BloomTokens.citron300,
  });

  const group = new Group();
  group.name = 'particle-forest';
  group.add(cloud.group);

  return {
    group,
    update(delta: number, elapsed: number) {
      cloud.update(delta, elapsed);
    },
    dispose() {
      cloud.dispose();
      group.removeFromParent();
    },
  };
}
