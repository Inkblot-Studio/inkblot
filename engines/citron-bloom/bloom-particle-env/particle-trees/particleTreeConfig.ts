import type { Color, Vector3 } from 'three';
import type { BloomLod } from '../../bloom-core/types';

export interface ParticleTreeConfig {
  lod?: BloomLod;
  particleBudget?: number;
  height?: number;
  sway?: number;
  trunkColor?: Color;
  branchColor?: Color;
  leafColor?: Color;
}

export interface TreeSampleOptions extends ParticleTreeConfig {
  offset?: Vector3;
  scale?: number;
  yaw?: number;
}
