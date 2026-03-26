import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
} from 'three';
import type { BloomLod } from '../bloom-core/types';
import {
  FLOWER_GROUND_DISC_LOCAL_Y,
  FLOWER_GROUND_DISC_RADIUS,
} from '../bloom-runtime/flowerStageConstants';

function scaleCount(lod: BloomLod, base: number): number {
  if (lod === 'medium') return Math.floor(base * 0.7);
  if (lod === 'low') return Math.floor(base * 0.45);
  return base;
}

export interface FlowerFogMistHandle {
  readonly group: Group;
  update(elapsed: number): void;
  dispose(): void;
}

/**
 * Soft mist specks — very slow drift (reference: particle “floor” on studio homepages).
 */
export function createFlowerFogMistParticles(lod: BloomLod): FlowerFogMistHandle {
  const group = new Group();
  group.name = 'flower-fog-mist';

  const count = scaleCount(lod, 720);
  const geo = new BufferGeometry();
  const pos = new Float32Array(count * 3);
  const mist = new Float32Array(count * 2);
  const rnd = (s: number) => {
    const x = Math.sin(s * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const inner = 0.2;
  const outer = FLOWER_GROUND_DISC_RADIUS * 0.94;
  const y0 = FLOWER_GROUND_DISC_LOCAL_Y - 0.028;
  const y1 = FLOWER_GROUND_DISC_LOCAL_Y + 0.11;
  for (let i = 0; i < count; i++) {
    const th = rnd(i * 3.17) * Math.PI * 2;
    const rr = inner + rnd(i * 5.91) * (outer - inner);
    pos[i * 3] = Math.cos(th) * rr;
    pos[i * 3 + 1] = y0 + rnd(i * 7.23) * (y1 - y0);
    pos[i * 3 + 2] = Math.sin(th) * rr;
    mist[i * 2] = 0.58 + rnd(i * 11.13) * 0.62;
    mist[i * 2 + 1] = 0.5 + rnd(i * 13.41) * 0.55;
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aMist', new BufferAttribute(mist, 2));

  const mat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(0x3a6d78) },
      uColorCore: { value: new Color(0x8ec5ce) },
    },
    vertexShader: `
      uniform float uTime;
      attribute vec2 aMist;
      varying vec2 vMist;
      void main() {
        vMist = aMist;
        vec3 p = position;
        float w = uTime * 0.19;
        p.x += sin(w + position.z * 2.1) * 0.016;
        p.z += cos(w * 0.85 + position.x * 1.7) * 0.016;
        p.y += sin(w * 0.52 + position.x * 3.0) * 0.0065;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float sz = 2.05 * aMist.x * (180.0 / max(-mv.z, 0.4));
        gl_PointSize = clamp(sz, 1.2, 6.5);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uColorCore;
      varying vec2 vMist;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c) * 2.0;
        if (r > 1.0) discard;
        float s = pow(max(0.0, 1.0 - r), 2.35);
        s = s * s * (3.0 - 2.0 * s);
        vec3 col = mix(uColor, uColorCore, s * 0.62);
        float a = 0.042 * s * vMist.y;
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.name = 'flower-fog-mist-points';
  group.add(points);

  return {
    group,
    update(elapsed: number) {
      mat.uniforms.uTime.value = elapsed;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
