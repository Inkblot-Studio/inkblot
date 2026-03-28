import {
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  ShaderMaterial,
  Vector3,
} from 'three';

function createTaperedTube(
  curve: CatmullRomCurve3,
  segs: number,
  radialSegs: number,
  radiusFn: (t: number) => number,
): BufferGeometry {
  const frames = curve.computeFrenetFrames(segs, false);
  const rows = segs + 1;
  const cols = radialSegs + 1;
  const pos = new Float32Array(rows * cols * 3);
  const nrm = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);

  let vi = 0;
  for (let i = 0; i < rows; i++) {
    const t = i / segs;
    const pt = curve.getPointAt(t);
    const r = radiusFn(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j < cols; j++) {
      const a = (j / radialSegs) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);

      const nx = ca * N.x + sa * B.x;
      const ny = ca * N.y + sa * B.y;
      const nz = ca * N.z + sa * B.z;

      pos[vi * 3] = pt.x + r * nx;
      pos[vi * 3 + 1] = pt.y + r * ny;
      pos[vi * 3 + 2] = pt.z + r * nz;
      nrm[vi * 3] = nx;
      nrm[vi * 3 + 1] = ny;
      nrm[vi * 3 + 2] = nz;
      uvs[vi * 2] = j / radialSegs;
      uvs[vi * 2 + 1] = t;
      vi++;
    }
  }

  const idx: number[] = [];
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return geo;
}

const stemVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;
uniform float uTime;
uniform float uWind;

void main(){
  vUv = uv;
  float sway = sin(uTime * 0.22 + uv.y * 2.5) * 0.003 * uWind * (1.0 - uv.y);
  vec3 p = position;
  p.x += sway;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = -mv.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`;

const stemFrag = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);

  float grain = sin(vUv.y * 220.0 + vUv.x * 4.0) * 0.5 + 0.5;
  grain = grain * 0.04 + 0.96;

  vec3 baseCol = vec3(0.035, 0.15, 0.065) * grain;

  vec3 L = normalize(vec3(0.5, 0.85, 0.35));
  float diff = max(dot(N, L), 0.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 36.0) * 0.35;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);

  vec3 col = baseCol * diff * 0.82;
  col += baseCol * 0.22;
  col += vec3(1.0) * spec;
  col += vec3(0.08, 0.25, 0.12) * fres * 0.32;

  gl_FragColor = vec4(col, 0.94);
}
`;

export interface HeroStemOptions {
  height?: number;
  baseRadius?: number;
  tipRadius?: number;
}

export class HeroStem extends Mesh {
  private readonly mat: ShaderMaterial;

  constructor(opts: HeroStemOptions = {}) {
    const h = opts.height ?? 0.5;
    const rBase = opts.baseRadius ?? 0.015;
    const rTip = opts.tipRadius ?? 0.006;

    const curve = new CatmullRomCurve3([
      new Vector3(-0.004, -h, 0),
      new Vector3(-0.008, -h * 0.6, 0.006),
      new Vector3(0.005, -h * 0.2, 0.003),
      new Vector3(0, 0, 0),
    ]);

    const geo = createTaperedTube(curve, 40, 8, (t) => {
      const r = rBase + (rTip - rBase) * t;
      return r * (1.0 + 0.05 * Math.sin(t * 14));
    });

    const mat = new ShaderMaterial({
      vertexShader: stemVert,
      fragmentShader: stemFrag,
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: 1 },
      },
      transparent: true,
      depthWrite: true,
      side: DoubleSide,
    });

    super(geo, mat);
    this.mat = mat;
    this.matrixAutoUpdate = false;
    this.frustumCulled = false;
    this.updateMatrix();
  }

  tick(elapsed: number, wind: number): void {
    this.mat.uniforms.uTime.value = elapsed;
    this.mat.uniforms.uWind.value = wind;
  }

  dispose(): void {
    this.geometry.dispose();
    this.mat.dispose();
  }
}
