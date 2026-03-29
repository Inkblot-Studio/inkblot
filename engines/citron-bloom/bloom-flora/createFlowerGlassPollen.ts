import {
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Camera,
  type Texture,
} from 'three';
import glassPollenFrag from './shaders/glassPollen.frag';
import glassPollenVert from './shaders/glassPollen.vert';
import { HERO_RING_COLOR_PAIRS, HERO_RING_COUNT } from './heroFlowerPalette';
import {
  POLLEN_EMERGE_BUD_R,
  POLLEN_EMERGE_FLOWER_HEAD_R,
  POLLEN_EMERGE_HALO_R,
} from './pollenExtents';
import { createPollenFlowState, drivePollenFlow } from './pollenFlowDrive';
import type { BloomLod } from '../bloom-core/types';

function scaleCount(lod: BloomLod, base: number): number {
  if (lod === 'medium') return Math.floor(base * 0.68);
  if (lod === 'low') return Math.floor(base * 0.45);
  return base;
}

export interface FlowerGlassPollenUpdateOpts {
  bloom01: number;
  /** Act-local [0,1] while in flower section (host maps global scroll → section local). */
  journeyProgress01: number;
  gate01: number;
}

export interface FlowerGlassPollenHandle {
  readonly group: Group;
  update(elapsed: number, delta: number, opts: FlowerGlassPollenUpdateOpts): void;
  syncCamera(camera: Camera): void;
  setEnvMap(texture: Texture | null, intensity?: number): void;
  dispose(): void;
}

const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3(1, 1, 1);
const _m = new Matrix4();
const _camLocal = new Vector3();
const _camRight = new Vector3();
const _camUp = new Vector3();
const _invFlowerWorld = new Matrix4();
const _tmpColor = new Color();
const _emergeRadii = new Vector3(
  POLLEN_EMERGE_BUD_R,
  POLLEN_EMERGE_FLOWER_HEAD_R,
  POLLEN_EMERGE_HALO_R,
);

function pollenRingIndex(layerIdx: number, rnd01: number): number {
  const base = layerIdx * 2;
  const bump = rnd01 < 0.5 ? 0 : 1;
  return Math.min(base + bump, HERO_RING_COUNT - 1);
}

/**
 * Pollen spawns at the flower crown then bursts up and wide; strength from scroll position (flow drive).
 */
export function createFlowerGlassPollen(lod: BloomLod): FlowerGlassPollenHandle {
  const group = new Group();
  group.name = 'flower-glass-pollen';
  group.position.set(0, 0.02, 0);

  const count = scaleCount(lod, 480);
  const geo = new SphereGeometry(1, 10, 8);

  const seeds = new Float32Array(count * 4);
  const layer = new Float32Array(count);
  const color = new Float32Array(count * 3);
  const budCore = new Float32Array(count * 3);
  const rnd = (i: number, k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  const crownY = 0.1;
  const rInner = 0.11;
  const rOuter = 0.485;
  const mesh = new InstancedMesh(
    geo,
    new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBloom: { value: 0 },
        uEnvMap: { value: null },
        uEnvMapIntensity: { value: 0 },
        uDrift: { value: 0 },
        uBurst: { value: 0 },
        uAmbient: { value: 0 },
        uCameraLocal: { value: new Vector3(0, 0, 8) },
        uCamRightLocal: { value: new Vector3(1, 0, 0) },
        uCamUpLocal: { value: new Vector3(0, 1, 0) },
        uOpacity: { value: 0 },
        uRevealMotion: { value: 0 },
        uSpread: { value: 0 },
        uEmergeRadii: { value: _emergeRadii.clone() },
      },
      vertexShader: glassPollenVert,
      fragmentShader: glassPollenFrag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
    }),
    count,
  );
  mesh.frustumCulled = false;
  mesh.name = 'glass-pollen-instances';

  for (let i = 0; i < count; i++) {
    const u = rnd(i, 0);
    const th = rnd(i, 1) * Math.PI * 2;
    let rr: number;
    let y: number;
    let layerIdx: number;

    if (u < 0.18) {
      layerIdx = 0;
      rr = rInner + rnd(i, 3) * (rOuter - rInner) * 0.62;
      y = crownY - 0.03 + rnd(i, 15) * 0.12;
      _p.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    } else if (u < 0.42) {
      layerIdx = 1;
      rr = rInner + 0.03 + rnd(i, 3) * (rOuter - rInner + 0.1);
      y = crownY - 0.02 + rnd(i, 16) * 0.16;
      _p.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    } else if (u < 0.88) {
      layerIdx = 1;
      rr = rOuter * 0.68 + rnd(i, 3) * 0.42;
      y = crownY + 0.02 + rnd(i, 17) * 0.28;
      _p.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    } else {
      layerIdx = 2;
      rr = rInner + 0.05 + rnd(i, 3) * (rOuter - rInner) * 0.55;
      y = crownY - 0.08 + rnd(i, 18) * 0.12;
      _p.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    }

    layer[i] = layerIdx;

    const coreR = 0.008 + rnd(i, 21) * 0.014;
    const coreTh = rnd(i, 22) * Math.PI * 2;
    const coreY = 0.012 + layerIdx * 0.012 + rnd(i, 23) * 0.038;
    budCore[i * 3] = Math.cos(coreTh) * coreR;
    budCore[i * 3 + 1] = coreY;
    budCore[i * 3 + 2] = Math.sin(coreTh) * coreR;

    const ri = pollenRingIndex(layerIdx, rnd(i, 19));
    const [c0, c1] = HERO_RING_COLOR_PAIRS[ri];
    _tmpColor.lerpColors(c0, c1, rnd(i, 20));
    color[i * 3] = _tmpColor.r;
    color[i * 3 + 1] = _tmpColor.g;
    color[i * 3 + 2] = _tmpColor.b;

    const sc = (0.0015 + rnd(i, 4) * 0.0028) * (1.02 + layerIdx * 0.05);
    _q.setFromAxisAngle(
      new Vector3(rnd(i, 5) + 0.01, rnd(i, 6) + 0.01, rnd(i, 7) + 0.01).normalize(),
      rnd(i, 8) * Math.PI * 2,
    );
    _s.setScalar(sc);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);
    seeds[i * 4] = rnd(i, 9);
    seeds[i * 4 + 1] = rnd(i, 10);
    seeds[i * 4 + 2] = rnd(i, 11);
    seeds[i * 4 + 3] = rnd(i, 12);
  }
  mesh.instanceMatrix.needsUpdate = true;

  geo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4));
  geo.setAttribute('aLayer', new InstancedBufferAttribute(layer, 1));
  geo.setAttribute('aColor', new InstancedBufferAttribute(color, 3));
  geo.setAttribute('aBudCore', new InstancedBufferAttribute(budCore, 3));

  const mat = mesh.material as ShaderMaterial;
  mesh.renderOrder = 1010;
  mesh.count = count;
  group.add(mesh);

  const flowState = createPollenFlowState();
  let smoothBurst = 0;
  let smoothOpacity = 0;
  let smoothRevealMotion = 0;

  return {
    group,
    update(elapsed: number, delta: number, opts: FlowerGlassPollenUpdateOpts) {
      const { bloom01, journeyProgress01, gate01 } = opts;
      const flow = drivePollenFlow(flowState, delta, gate01, journeyProgress01, bloom01);

      const dt = Math.max(delta, 0.0001);
      const errBurst = flow.burstTarget - smoothBurst;
      const kBurst = 1 - Math.exp(-(errBurst >= 0 ? 4.6 : 2.05) * dt);
      const errOp = flow.opacityTarget - smoothOpacity;
      const kOp = 1 - Math.exp(-(errOp >= 0 ? 1.65 : 0.88) * dt);
      smoothBurst += errBurst * kBurst;
      smoothOpacity += errOp * kOp;
      const revealTarget = Math.min(1, flow.spread01 * 0.98 + flow.driftScale * 0.12);
      const errRm = revealTarget - smoothRevealMotion;
      const kRm = 1 - Math.exp(-(errRm >= 0 ? 2.4 : 1.35) * dt);
      smoothRevealMotion += errRm * kRm;

      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uBloom.value = bloom01;
      mat.uniforms.uDrift.value = flow.driftScale;
      mat.uniforms.uBurst.value = smoothBurst;
      mat.uniforms.uAmbient.value = flow.ambientScale;
      mat.uniforms.uOpacity.value = smoothOpacity;
      mat.uniforms.uRevealMotion.value = smoothRevealMotion;
      mat.uniforms.uSpread.value = flow.spread01;
      group.visible = smoothOpacity > 0.00035;
    },
    syncCamera(camera: Camera) {
      _camLocal.copy(camera.position);
      group.worldToLocal(_camLocal);
      mat.uniforms.uCameraLocal.value.copy(_camLocal);

      _camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      _camUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      _invFlowerWorld.copy(group.matrixWorld).invert();
      _camRight.transformDirection(_invFlowerWorld);
      _camUp.transformDirection(_invFlowerWorld);
      mat.uniforms.uCamRightLocal.value.copy(_camRight);
      mat.uniforms.uCamUpLocal.value.copy(_camUp);
    },
    setEnvMap(texture: Texture | null, intensity = 1.5): void {
      mat.uniforms.uEnvMap.value = texture;
      mat.uniforms.uEnvMapIntensity.value = texture ? intensity : 0;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      mesh.removeFromParent();
    },
  };
}
