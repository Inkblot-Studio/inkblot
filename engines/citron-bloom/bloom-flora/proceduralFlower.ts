import {
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import petalVert from './shaders/petal.vert';
import petalFrag from './shaders/petal.frag';
import type { FlowerLayerSpec, ProceduralFlowerOptions } from '../bloom-core/types';
import { BloomTokens } from '../bloom-core/tokens';
import { computeProceduralFlowerLayout } from '../bloom-worker/proceduralFlowerLayout';
import { requestProceduralFlower } from '../bloom-worker/bloomWorkerPool';

/** Default multi-layer citron flower — good baseline for complex blooms. */
export function defaultFlowerLayers(): FlowerLayerSpec[] {
  return [
    { petalCount: 11, radius: 0.14, yOffset: -0.02, tilt: 0.55, scale: 0.78, twist: 0.12 },
    { petalCount: 14, radius: 0.26, yOffset: 0.06, tilt: 0.42, scale: 1.0, twist: -0.08 },
    { petalCount: 18, radius: 0.38, yOffset: 0.14, tilt: 0.32, scale: 1.12, twist: 0.2 },
    { petalCount: 22, radius: 0.48, yOffset: 0.22, tilt: 0.22, scale: 1.05, twist: -0.15 },
  ];
}

function applyPetalLayout(
  geo: PlaneGeometry,
  petalMesh: InstancedMesh,
  layout: ReturnType<typeof computeProceduralFlowerLayout>,
): void {
  petalMesh.instanceMatrix.array.set(layout.matrices);
  petalMesh.instanceMatrix.needsUpdate = true;
  geo.setAttribute('aInstanceColor', new InstancedBufferAttribute(layout.colors, 4));
  geo.setAttribute('aPhase', new InstancedBufferAttribute(layout.phases, 1));
  petalMesh.count = layout.total;
}

/**
 * Layered procedural flower: instanced petals with shader-driven bloom opening,
 * wind, and rim lighting. Single glass bud core (no additive cluster).
 */
export class ProceduralFlower extends Group {
  readonly petalMesh: InstancedMesh;
  readonly coreMesh: Mesh;
  private readonly petalMaterial: ShaderMaterial;
  private readonly coreMaterial: ShaderMaterial;
  private isDirty = true;

  constructor(options: ProceduralFlowerOptions & { petalCount?: number; radius?: number }) {
    super();
    this.matrixAutoUpdate = false;
    const petalCount = options.petalCount ?? 8;
    const radius = options.radius ?? 0.15;
    const total = petalCount;

    const geo = new PlaneGeometry(0.12, 0.45, 4, 12);
    geo.translate(0, 0.22, 0);

    this.petalMaterial = new ShaderMaterial({
      vertexShader: petalVert,
      fragmentShader: petalFrag,
      uniforms: {
        uTime: { value: 0 },
        uBloom: { value: 0 },
        uPulse: { value: 0 },
        uWind: { value: 1 },
        uRimColor: { value: BloomTokens.citron300.clone().lerp(new Color(0xffffff), 0.35) },
        uDeepColor: { value: BloomTokens.citron700.clone().lerp(new Color(0x0a1628), 0.5) },
        uRimPower: { value: 2.35 },
        uAccentGlow: { value: BloomTokens.success.clone().lerp(BloomTokens.citron300, 0.25) },
        uRipplePhase: { value: 0 },
        uRippleStrength: { value: 0 },
        uSH: {
          value: [
            new Vector3(0.12, 0.22, 0.32),
            new Vector3(0.06, 0.12, 0.18),
            new Vector3(0.04, 0.08, 0.14),
            new Vector3(0.02, 0.05, 0.1),
            new Vector3(-0.02, -0.04, -0.06),
            new Vector3(0.0, 0.0, 0.0),
            new Vector3(0.0, 0.0, 0.0),
            new Vector3(0.0, 0.0, 0.0),
            new Vector3(0.0, 0.0, 0.0),
          ],
        },
      },
      transparent: true,
      depthWrite: true,
      side: DoubleSide,
    });

    this.petalMesh = new InstancedMesh(geo, this.petalMaterial, total);
    this.petalMesh.matrixAutoUpdate = false;
    this.petalMesh.frustumCulled = false;

    const coreScale = options.coreScale ?? 1;
    const coreGeo = new SphereGeometry(0.052 * coreScale, 32, 24);

    this.coreMaterial = new ShaderMaterial({
      vertexShader: `
        uniform float uTime;
        uniform float uBloom;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float bb = uBloom * uBloom;
          float swell = 1.0 + 0.12 * bb + 0.02 * sin(uTime * 1.05);
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position * swell, 1.0);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uBloom;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vView);
          float ndv = max(dot(N, V), 0.001);
          float fresnel = pow(1.0 - ndv, 3.2);
          float bb = uBloom * uBloom;
          vec3 c = uColor * (0.5 + 0.5 * bb);
          c += vec3(0.18, 0.55, 0.88) * fresnel * 0.92;
          vec3 L = normalize(vec3(0.45, 0.85, 0.35));
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 96.0) * 0.65;
          c += vec3(1.0) * spec;
          float alpha = mix(0.58, 0.92, fresnel) * (0.9 + 0.1 * bb);
          gl_FragColor = vec4(c, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uBloom: { value: 0 },
        uColor: { value: BloomTokens.success.clone().lerp(BloomTokens.citron300, 0.35) },
      },
      transparent: true,
      depthWrite: true,
    });

    this.coreMesh = new Mesh(coreGeo, this.coreMaterial);
    this.coreMesh.matrixAutoUpdate = false;
    this.coreMesh.frustumCulled = false;
    this.coreMesh.position.set(0, 0.02 * coreScale, 0);
    this.coreMesh.updateMatrix();

    const syncLayout = computeProceduralFlowerLayout(petalCount, radius);
    applyPetalLayout(geo, this.petalMesh, syncLayout);

    this.add(this.petalMesh, this.coreMesh);

    requestProceduralFlower({
      type: 'PROCEDURAL_FLOWER_INIT',
      petalCount,
      radius,
      coreScale,
    })
      .then((res) => {
        this.petalMesh.instanceMatrix.array.set(res.matrices);
        this.petalMesh.instanceMatrix.needsUpdate = true;
        const col = geo.getAttribute('aInstanceColor') as InstancedBufferAttribute | undefined;
        const ph = geo.getAttribute('aPhase') as InstancedBufferAttribute | undefined;
        if (col?.array && col.array.byteLength === res.colors.byteLength) {
          col.array.set(res.colors);
          col.needsUpdate = true;
        }
        if (ph?.array && ph.array.byteLength === res.phases.byteLength) {
          ph.array.set(res.phases);
          ph.needsUpdate = true;
        }
        this.petalMesh.count = res.total;
      })
      .catch(() => {
        /* sync layout already applied */
      });
  }

  setBloom(progress: number, pulse: number): void {
    this.petalMaterial.uniforms.uBloom.value = progress;
    this.petalMaterial.uniforms.uPulse.value = pulse;
    this.coreMaterial.uniforms.uBloom.value = progress;
  }

  setWind(w: number): void {
    this.petalMaterial.uniforms.uWind.value = w;
  }

  setDirty(): void {
    this.isDirty = true;
  }

  setRippleShimmer(phase: number, strength: number): void {
    this.petalMaterial.uniforms.uRipplePhase.value = phase;
    this.petalMaterial.uniforms.uRippleStrength.value = strength;
  }

  update(elapsed: number): void {
    if (this.isDirty) {
      this.updateMatrix();
      this.isDirty = false;
    }
    this.petalMaterial.uniforms.uTime.value = elapsed;
    this.coreMaterial.uniforms.uTime.value = elapsed;
  }

  dispose(): void {
    this.petalMesh.geometry.dispose();
    this.petalMaterial.dispose();
    this.coreMesh.geometry.dispose();
    this.coreMaterial.dispose();
    this.removeFromParent();
  }
}
