import { Group } from 'three';
import { createInstancedParticleCloud } from '../particles-core/instancedParticleCloud';
import type { ParticleEnvHandle } from '../particles-core/types';
import { BloomTokens } from '../../bloom-core/tokens';
import { buildParticleTreeSamples } from './buildTreeSamples';
import type { ParticleTreeConfig } from './particleTreeConfig';

export type { ParticleTreeConfig, TreeSampleOptions } from './particleTreeConfig';

/**
 * Procedural particle-only tree: trunk + branches + leaf clusters along curves.
 */
export function createParticleTree(config: ParticleTreeConfig = {}): ParticleEnvHandle {
  const all = buildParticleTreeSamples(config);

  const cloud = createInstancedParticleCloud(all, {
    baseRadius: 0.02,
    segments: 6,
    wind: 0.95,
    cohesion: 0.7,
    fadeNear: 32,
    fadeFar: 85,
    alpha: 0.9,
    coreColor: BloomTokens.citron700,
    rimColor: BloomTokens.citron300,
  });

  const group = new Group();
  group.name = 'particle-tree';
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
