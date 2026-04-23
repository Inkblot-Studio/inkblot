import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  NormalBlending,
  PerspectiveCamera,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { FrameContext, IComponent } from '@/types';
import type { BloomLod } from '@citron-bloom-engine/bloom-core/types';

const GOLDEN = 0.6180339887498949;
const TAU = 6.283185307179586;

/** Inner / outer "radius" in NDC from center; matches old edge-band intent. */
const NDC_R_MIN = 0.72;
const NDC_R_MAX = 0.992;
const Z0 = -7.8;
const Z1 = -9.6;

const vert = /* glsl */ `
attribute float aOrder;
attribute float aPhase;
attribute float aSeed;

uniform float uTime;
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uAnimMix;
uniform float uChaosT;

varying vec2 vNdc;
varying float vOrder;
varying float vPhase;
varying float vSeed;

const float TAU = 6.28318530718;

void main() {
  vOrder = aOrder;
  vPhase = aPhase;
  vSeed = aSeed;

  float ndcX = position.x;
  float ndcY = position.y;
  float z = position.z;
  float d = -z;

  float t = uChaosT * uAnimMix;
  float chaos = 0.01 + 0.006 * (sin(t * 0.19) * 0.5 + 0.5);
  float ph = aOrder * 4.0 + aSeed * 0.2;

  float wob =
    sin(t * 0.58 + aSeed * TAU + ph) * chaos * d
    + sin(t * 0.95 + aOrder * 11.0 + aSeed * 2.0) * chaos * 0.5 * d
    + sin(t * 0.36 + aPhase * 0.3) * chaos * 0.4 * d;

  float wob2 = sin(t * 0.41 + aOrder * 7.0) * chaos * 0.35 * d;

  float xe = ndcX * d * uTanHalfFov * uAspect + wob;
  float ye = ndcY * d * uTanHalfFov + wob2;

  vec4 mv = modelViewMatrix * vec4(xe, ye, z, 1.0);
  vec4 clip = projectionMatrix * mv;
  vNdc = clip.xy / clip.w;
  gl_PointSize = mix(0.5, 1.05, aSeed) * (52.0 / max(-mv.z, 0.25));
  gl_Position = clip;
}
`;

const frag = /* glsl */ `
uniform float uTime;
uniform float uAspect;
uniform float uAnimMix;
uniform float uChaosT;
uniform vec3 uBaseDark;
uniform vec3 uGoldA;
uniform vec3 uGoldB;
uniform vec3 uIce;
uniform float uBaseAlpha;
uniform vec3 uBreath;

varying vec2 vNdc;
varying float vOrder;
varying float vPhase;
varying float vSeed;

const float TAU = 6.28318530718;

float hash12(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

const float G = 1.61803398875;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float pr = length(c) * 2.0;
  if (pr > 1.0) discard;
  float disc = smoothstep(1.0, 0.64, pr);

  float t = uChaosT * uAnimMix;
  float o = vOrder;
  float p = vPhase;

  float p1 = sin(t * 0.33 + p);
  float p2 = sin(t * 0.27 * G + o * TAU * G);
  float p3 = sin(t * 0.41 * 0.7 + o * 8.9 + p * 1.3);
  float p4 = 0.18 * (uBreath.x * sin(o * 3.0 + uBreath.y) + uBreath.z * sin(t * 0.15 + p));
  float phasor = 0.34 * p1 + 0.3 * p2 + 0.32 * p3 + p4;
  float breathShell = 0.5 + 0.5 * phasor;

  vec2 qn = vNdc;
  qn.x *= uAspect;
  float r = length(qn);
  float rimN = smoothstep(0.28, 0.99, r);

  float n1 = 0.5 + 0.5 * sin(t * 0.11 + o * 14.0 + vNdc.x * 4.0);
  float n2 = 0.5 + 0.5 * sin(t * 0.09 - vNdc.y * 3.0 + vSeed);
  float grain = 0.62 + 0.38 * mix(n1, n2, 0.5);

  vec2 tile = floor(vNdc * vec2(20.0, 20.0));
  float h = hash12(tile + vSeed * 0.02);
  grain *= 0.78 + 0.22 * h;

  float pulse = breathShell * grain * (0.65 + 0.35 * rimN);

  vec3 gold = mix(uGoldA, uGoldB, vSeed);
  vec3 col = mix(uBaseDark, mix(gold, uIce, 0.2 + 0.15 * p2 * p2 + 0.1 * p3), 0.35 + 0.45 * pulse);
  col = mix(col, uIce, 0.06 * (0.5 + 0.5 * p1));

  float a = uBaseAlpha * disc * (0.55 + 0.45 * pulse) * (0.4 + 0.6 * rimN);
  a *= 0.88 + 0.12 * abs(vNdc.x);

  if (a < 0.0025) discard;
  gl_FragColor = vec4(col, a);
}
`;

function countForLod(lod: BloomLod): number {
  if (lod === 'low') return 1100;
  if (lod === 'medium') return 1700;
  return 2600;
}

function buildCoronaGeometry(n: number): BufferGeometry {
  const geo = new BufferGeometry();
  const pos = new Float32Array(n * 3);
  const aOrder = new Float32Array(n);
  const aPhase = new Float32Array(n);
  const aSeed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = TAU * ((i + 0.5) / n) + (Math.random() - 0.5) * (TAU * 0.15) / n;
    const rStrat = (i * GOLDEN) % 1;
    const r = NDC_R_MIN + (NDC_R_MAX - NDC_R_MIN) * (0.15 + 0.85 * rStrat) + (Math.random() - 0.5) * 0.012;
    const ndcX = r * Math.cos(u);
    const ndcY = r * Math.sin(u);
    const t = Math.random();
    const z = Z0 + t * (Z1 - Z0);
    pos[i * 3] = ndcX;
    pos[i * 3 + 1] = ndcY;
    pos[i * 3 + 2] = z;
    aOrder[i] = (i + 0.5) / n;
    aPhase[i] = Math.random() * TAU;
    aSeed[i] = Math.random();
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aOrder', new BufferAttribute(aOrder, 1));
  geo.setAttribute('aPhase', new BufferAttribute(aPhase, 1));
  geo.setAttribute('aSeed', new BufferAttribute(aSeed, 1));
  return geo;
}

function tanHalfVerticalFov(cam: PerspectiveCamera): number {
  const rad = (cam.fov * Math.PI) / 180;
  return Math.tan(rad * 0.5);
}

/**
 * Procedural NDC "echo lattice" in the view margin: elliptical corona, time-only phasor.
 * Invisible when not the flower experience; not driven by audio.
 */
export class PeripheralLatticeComponent implements IComponent {
  readonly group = new Group();
  private material!: ShaderMaterial;
  private points!: Points;
  private breath = new Vector3(0, 0, 0);
  private reducedMotion = false;
  private mediaQuery: MediaQueryList | null = null;
  private readonly onReducedChange = (): void => {
    this.syncReducedMotion();
  };

  private syncReducedMotion(): void {
    this.reducedMotion = Boolean(
      this.mediaQuery?.matches ??
        (typeof matchMedia === 'function' &&
          matchMedia('(prefers-reduced-motion: reduce)').matches),
    );
    if (this.material) {
      this.material.uniforms.uAnimMix.value = this.reducedMotion ? 0.0 : 1.0;
    }
  }

  constructor(
    private readonly isFlowerExperience: () => boolean,
    private readonly lod: BloomLod,
  ) {
    if (typeof matchMedia === 'function') {
      this.mediaQuery = matchMedia('(prefers-reduced-motion: reduce)');
    }
  }

  init(ctx: FrameContext): void {
    this.syncReducedMotion();
    this.mediaQuery?.addEventListener('change', this.onReducedChange);

    const n = countForLod(this.lod);
    const geo = buildCoronaGeometry(n);
    const cam = ctx.camera instanceof PerspectiveCamera ? ctx.camera : null;
    const tanHalf = cam ? tanHalfVerticalFov(cam) : Math.tan(((45 * Math.PI) / 180) * 0.5);
    const asp = Math.max(0.25, cam?.aspect ?? 1);
    const baseA = this.lod === 'low' ? 0.078 : this.lod === 'medium' ? 0.092 : 0.108;

    this.material = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0 },
        uChaosT: { value: 0 },
        uAspect: { value: asp },
        uTanHalfFov: { value: tanHalf },
        uAnimMix: { value: this.reducedMotion ? 0.0 : 1.0 },
        uBaseDark: { value: new Color(0x06080d) },
        uGoldA: { value: new Color(0xc9a227) },
        uGoldB: { value: new Color(0xf5e6b8) },
        uIce: { value: new Color(0x7dd3fc) },
        uBaseAlpha: { value: baseA },
        uBreath: { value: this.breath },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: NormalBlending,
    });

    this.points = new Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 999;
    this.group.name = 'peripheral-lattice-particles';
    this.group.add(this.points);
    ctx.camera.add(this.group);
  }

  update(ctx: FrameContext): void {
    if (!this.material) return;
    const on = this.isFlowerExperience();
    this.group.visible = on;
    if (!on) return;

    const elapsed = ctx.elapsed;
    const delta = ctx.delta;
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uChaosT.value = elapsed;
    const cam = ctx.camera instanceof PerspectiveCamera ? ctx.camera : null;
    const asp = cam ? Math.max(0.25, cam.aspect) : 1;
    this.material.uniforms.uAspect.value = asp;
    if (cam) {
      this.material.uniforms.uTanHalfFov.value = tanHalfVerticalFov(cam);
    }

    if (this.reducedMotion) {
      this.material.uniforms.uAnimMix.value = 0.0;
    } else {
      this.material.uniforms.uAnimMix.value = 1.0;
      this.breath.x += (Math.random() - 0.5) * 0.12 * delta - this.breath.x * 0.35 * delta;
      this.breath.y += (Math.random() - 0.5) * 0.1 * delta - this.breath.y * 0.4 * delta;
      this.breath.z += (Math.random() - 0.5) * 0.09 * delta - this.breath.z * 0.32 * delta;
    }
    this.material.uniforms.uBreath.value.copy(this.breath);
  }

  dispose(): void {
    this.mediaQuery?.removeEventListener('change', this.onReducedChange);
    this.group.removeFromParent();
    this.points?.geometry.dispose();
    this.material?.dispose();
  }
}
