import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  HalfFloatType,
  NearestFilter,
  Points,
  RGBAFormat,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import particleVert from './shaders/particle.vert';
import particleFrag from './shaders/particle.frag';
import particleComputeFrag from './shaders/particleCompute.frag';
import { BloomTokens } from '../bloom-core/tokens';

const TREE_COUNT = 14;

export interface GpgpuParticlesOptions {
  textureSize: number;
}

/**
 * GPUComputationRenderer-driven positions; points sample the latest position texture.
 */
export class GpgpuParticles {
  readonly points: Points;
  private readonly gpu: GPUComputationRenderer;
  /** GPUComputation variable (texturePosition). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly posVar: any;
  private readonly treeDataTexture: DataTexture;
  private readonly size: number;
  private readonly attract = new Vector3(0, 1.1, 0);
  private readonly pointer = new Vector2(0, 0);
  pointerStrength = 0.09;

  constructor(renderer: WebGLRenderer, options: GpgpuParticlesOptions) {
    this.size = options.textureSize;

    const posDataType = renderer.capabilities.isWebGL2 ? FloatType : HalfFloatType;

    this.gpu = new GPUComputationRenderer(this.size, this.size, renderer);
    this.gpu.setDataType(posDataType);

    const treeData = new Float32Array(TREE_COUNT * 4);
    for (let i = 0; i < TREE_COUNT; i++) {
      const a = (i / TREE_COUNT) * Math.PI * 2 + 0.28;
      const R = 5.55 + (i % 3) * 0.22;
      treeData[i * 4] = Math.cos(a) * R;
      treeData[i * 4 + 1] = 0.08;
      treeData[i * 4 + 2] = Math.sin(a) * R;
      treeData[i * 4 + 3] = 1;
    }
    this.treeDataTexture = new DataTexture(treeData, TREE_COUNT, 1, RGBAFormat, posDataType);
    this.treeDataTexture.minFilter = NearestFilter;
    this.treeDataTexture.magFilter = NearestFilter;
    this.treeDataTexture.needsUpdate = true;

    const pos0 = this.gpu.createTexture();
    const data = pos0.image.data as Float32Array;
    // Most points live in the flower volume (uAttract ~ y=1.1); forest fringe stays sparse.
    const flowerFrac = 0.82;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < flowerFrac) {
        const u = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        const rmax = 0.38;
        data[i] = Math.cos(u) * r * rmax;
        data[i + 1] = 0.72 + Math.random() * 0.62;
        data[i + 2] = Math.sin(u) * r * rmax;
        data[i + 3] = 0.015 + Math.random() * 0.055;
      } else {
        const tid = Math.floor(Math.random() * TREE_COUNT);
        const ba = (tid / TREE_COUNT) * Math.PI * 2 + 0.18;
        const R = 4.85 + Math.random() * 1.45;
        data[i] = Math.cos(ba) * R + (Math.random() - 0.5) * 1.05;
        data[i + 1] = Math.random() * 1.35;
        data[i + 2] = Math.sin(ba) * R + (Math.random() - 0.5) * 1.05;
        data[i + 3] = 0.1 + ((tid + 0.5) / TREE_COUNT) * 0.9;
      }
    }
    pos0.needsUpdate = true;

    this.posVar = this.gpu.addVariable('texturePosition', particleComputeFrag, pos0);
    this.gpu.setVariableDependencies(this.posVar, [this.posVar]);
    this.posVar.material.uniforms.uTime = { value: 0 };
    this.posVar.material.uniforms.uAttract = { value: this.attract };
    this.posVar.material.uniforms.uPointer = { value: this.pointer };
    this.posVar.material.uniforms.uPointerStrength = { value: this.pointerStrength };
    this.posVar.material.uniforms.uTreeData = { value: this.treeDataTexture };
    this.posVar.material.uniforms.uTreeCount = { value: TREE_COUNT };
    this.posVar.material.uniforms.uCanopyHeight = { value: 2.75 };
    this.posVar.material.uniforms.uForestAttract = { value: 0.036 };

    const err = this.gpu.init();
    if (err) {
      console.warn('[Citron Bloom] GPGPU init:', err);
    }

    const count = this.size * this.size;
    const geo = new BufferGeometry();
    const refs = new Float32Array(count * 2);
    const z = new Float32Array(count * 3);
    let k = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        refs[k++] = (x + 0.5) / this.size;
        refs[k++] = (y + 0.5) / this.size;
      }
    }
    geo.setAttribute('position', new BufferAttribute(z, 3));
    geo.setAttribute('aRef', new BufferAttribute(refs, 2));

    const tex = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    const pMat = new ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      uniforms: {
        uPositions: { value: tex },
        uSize: { value: 2.0 },
        uColorCore: { value: BloomTokens.citron400.clone().lerp(BloomTokens.success, 0.3) },
        uColorEdge: { value: BloomTokens.citron300.clone().lerp(BloomTokens.success, 0.42) },
        uForestCore: {
          value: BloomTokens.citron300.clone().lerp(BloomTokens.success, 0.48),
        },
        uForestEdge: {
          value: BloomTokens.success.clone().lerp(BloomTokens.textSecondary, 0.18),
        },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.points = new Points(geo, pMat);
    this.points.frustumCulled = false;
  }

  setPointerWorld(x: number, z: number): void {
    this.pointer.set(x, z);
  }

  setAttract(y: number): void {
    this.attract.y = y;
  }

  update(elapsed: number): void {
    this.posVar.material.uniforms.uTime.value = elapsed;
    this.posVar.material.uniforms.uPointerStrength.value = this.pointerStrength;
    this.gpu.compute();
    const tex = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    (this.points.material as ShaderMaterial).uniforms.uPositions.value = tex;
  }

  dispose(): void {
    this.treeDataTexture.dispose();
    this.gpu.dispose();
    this.points.geometry.dispose();
    (this.points.material as ShaderMaterial).dispose();
    this.points.removeFromParent();
  }
}
