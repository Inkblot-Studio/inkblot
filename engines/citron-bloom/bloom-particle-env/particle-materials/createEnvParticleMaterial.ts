import { Color, ShaderMaterial } from 'three';
import envParticleVert from './shaders/envParticle.vert';
import envParticleFrag from './shaders/envParticle.frag';
import { BloomTokens } from '../../bloom-core/tokens';

export interface EnvParticleMaterialOptions {
  wind?: number;
  cohesion?: number;
  rimPower?: number;
  fadeNear?: number;
  fadeFar?: number;
  alpha?: number;
  coreColor?: Color;
  rimColor?: Color;
}

export function createEnvParticleMaterial(options: EnvParticleMaterialOptions = {}): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: envParticleVert,
    fragmentShader: envParticleFrag,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: options.wind ?? 1 },
      uCohesion: { value: options.cohesion ?? 0.65 },
      uRimColor: { value: (options.rimColor ?? BloomTokens.citron300).clone() },
      uCoreColor: { value: (options.coreColor ?? BloomTokens.citron700).clone() },
      uRimPower: { value: options.rimPower ?? 2.2 },
      uFadeNear: { value: options.fadeNear ?? 28 },
      uFadeFar: { value: options.fadeFar ?? 72 },
      uAlpha: { value: options.alpha ?? 0.88 },
    },
    transparent: true,
    depthWrite: false,
  });
}
