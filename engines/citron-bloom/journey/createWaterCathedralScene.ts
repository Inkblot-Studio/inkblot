import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';

export interface WaterCathedralHandle {
  readonly group: Group;
  readonly fogColor: Color;
  update(elapsed: number, localT: number): void;
  dispose(): void;
}

const waterVert = `
varying vec2 vUv;
varying vec3 vView;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const waterFrag = `
uniform float uTime;
uniform float uLocalT;
uniform float uSubmerge;
varying vec2 vUv;
varying vec3 vView;

void main() {
  vec2 p = vUv * 6.0;
  float w1 = sin(p.x * 2.1 + uTime * 0.55) * cos(p.y * 1.7 + uTime * 0.42);
  float w2 = sin(p.x * 3.3 - uTime * 0.38) * sin(p.y * 2.4 + uTime * 0.5);
  vec3 n = normalize(vec3(-(w1 + w2) * 0.035, 1.0, -(w1 - w2) * 0.028));
  vec3 v = normalize(vView);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);
  vec3 deep = mix(vec3(0.01, 0.03, 0.08), vec3(0.002, 0.015, 0.06), uSubmerge);
  vec3 shallow = vec3(0.08, 0.32, 0.42);
  vec3 col = mix(deep, shallow, fres * (1.0 - uSubmerge * 0.55));
  float spec = pow(max(dot(reflect(-v, n), vec3(0.35, 0.85, 0.2)), 0.0), 48.0);
  col += vec3(0.55, 0.78, 1.0) * spec * 0.35 * (1.0 - uSubmerge * 0.4);
  col += vec3(0.02, 0.12, 0.22) * uLocalT * (0.4 + uSubmerge * 0.6);
  float alpha = mix(0.94, 0.88, uSubmerge);
  gl_FragColor = vec4(col, alpha);
}
`;

const dnaVert = `
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime;
uniform float uSubmerge;
uniform float uLocalT;
varying vec3 vColor;
varying float vTwinkle;

void main() {
  vColor = aColor;
  vec3 pos = position;
  float drift = sin(uTime * 0.35 + aPhase) * 0.08 * (0.3 + uSubmerge);
  pos.x += drift;
  pos.z += cos(uTime * 0.28 + aPhase * 0.7) * 0.06 * uSubmerge;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float dist = -mv.z;
  vTwinkle = 0.55 + 0.45 * sin(uTime * 2.8 + aPhase);
  float size = mix(1.8, 3.2, uSubmerge) * (220.0 / max(dist, 1.0));
  size *= (0.75 + 0.25 * sin(uTime * 3.1 + aPhase));
  gl_PointSize = clamp(size, 1.2, 14.0);
  gl_Position = projectionMatrix * mv;
}
`;

const dnaFrag = `
varying vec3 vColor;
varying float vTwinkle;
uniform float uSubmerge;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float core = smoothstep(0.5, 0.12, r);
  float glow = exp(-r * 5.5) * vTwinkle;
  vec3 col = vColor * (core * 0.85 + glow * 1.4);
  col = mix(col, col * vec3(0.75, 0.95, 1.15), uSubmerge);
  float alpha = mix(0.35, 0.72, uSubmerge) * (0.5 + glow);
  gl_FragColor = vec4(col, alpha);
}
`;

function pushHelix(
  positions: number[],
  phases: number[],
  colors: number[],
  cx: number,
  cz: number,
  height: number,
  turns: number,
  radius: number,
  phase0: number,
  hueShift: number,
): void {
  const steps = 140;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * Math.PI * 2 * turns + phase0;
    const y = (t - 0.5) * height;
    positions.push(cx + Math.cos(ang) * radius, y, cz + Math.sin(ang) * radius);
    phases.push(t * 62 + cx * 3 + cz * 2);
    const hue = 0.55 + hueShift * 0.08 + t * 0.12;
    colors.push(0.35 + hue * 0.45, 0.55 + (1 - hue) * 0.35, 0.95);
  }
}

function pushRung(
  positions: number[],
  phases: number[],
  colors: number[],
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y: number,
  seed: number,
): void {
  const segs = 10;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    positions.push(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t);
    phases.push(seed + t * 20);
    colors.push(0.5, 0.75, 1.0);
  }
}

function buildDnaField(): BufferGeometry {
  const positions: number[] = [];
  const phases: number[] = [];
  const colors: number[] = [];

  const helixConfigs: { cx: number; cz: number; phase: number; hue: number }[] = [
    { cx: 0, cz: 0, phase: 0, hue: 0 },
    { cx: 0, cz: 0, phase: Math.PI, hue: 0.15 },
    { cx: -4.2, cz: 1.5, phase: 0.4, hue: -0.1 },
    { cx: -4.2, cz: 1.5, phase: Math.PI + 0.4, hue: 0.05 },
    { cx: 4.2, cz: -1.2, phase: 1.1, hue: 0.08 },
    { cx: 4.2, cz: -1.2, phase: Math.PI + 1.1, hue: -0.05 },
    { cx: -2.5, cz: -3.5, phase: 2.0, hue: 0.12 },
    { cx: -2.5, cz: -3.5, phase: Math.PI + 2.0, hue: -0.08 },
    { cx: 3.0, cz: 3.2, phase: 0.7, hue: -0.12 },
    { cx: 3.0, cz: 3.2, phase: Math.PI + 0.7, hue: 0.1 },
    { cx: -5.5, cz: -2.8, phase: 1.5, hue: 0.06 },
    { cx: -5.5, cz: -2.8, phase: Math.PI + 1.5, hue: -0.04 },
    { cx: 5.5, cz: 2.5, phase: 2.8, hue: -0.06 },
    { cx: 5.5, cz: 2.5, phase: Math.PI + 2.8, hue: 0.04 },
  ];

  const h = 9;
  const turns = 5.5;
  const r = 0.42;

  for (const cfg of helixConfigs) {
    pushHelix(positions, phases, colors, cfg.cx, cfg.cz, h, turns, r, cfg.phase, cfg.hue);
  }

  for (let k = 0; k < helixConfigs.length; k += 2) {
    const a = helixConfigs[k];
    const b = helixConfigs[k + 1];
    if (!b) continue;
    for (let s = 0; s < 18; s++) {
      const t = s / 18;
      const y = (t - 0.5) * h * 0.92;
      const angA = t * Math.PI * 2 * turns + a.phase;
      const angB = t * Math.PI * 2 * turns + b.phase;
      const xa = a.cx + Math.cos(angA) * r;
      const za = a.cz + Math.sin(angA) * r;
      const xb = b.cx + Math.cos(angB) * r;
      const zb = b.cz + Math.sin(angB) * r;
      pushRung(positions, phases, colors, xa, za, xb, zb, y, s * 17 + k * 31);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('aPhase', new BufferAttribute(new Float32Array(phases), 1));
  geo.setAttribute('aColor', new BufferAttribute(new Float32Array(colors), 3));
  return geo;
}

export function createWaterCathedralScene(): WaterCathedralHandle {
  const group = new Group();

  const waterMat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLocalT: { value: 0 },
      uSubmerge: { value: 0 },
    },
    vertexShader: waterVert,
    fragmentShader: waterFrag,
    transparent: true,
    side: DoubleSide,
  });

  const water = new Mesh(new PlaneGeometry(56, 56, 1, 1), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.15;
  group.add(water);

  const surfaceSheen = new Mesh(
    new PlaneGeometry(52, 52, 1, 1),
    new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSubmerge: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSubmerge;
        varying vec2 vUv;
        void main() {
          float rip = sin(vUv.x * 40.0 + uTime) * sin(vUv.y * 36.0 - uTime * 0.8);
          vec3 col = vec3(0.15, 0.45, 0.55) * (0.2 + rip * 0.08);
          float a = (1.0 - uSubmerge) * 0.22;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
    }),
  );
  surfaceSheen.rotation.x = -Math.PI / 2;
  surfaceSheen.position.y = 0.55;
  group.add(surfaceSheen);

  const domeMat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y * 0.5 + 0.5;
        vec3 c = mix(vec3(0.02, 0.04, 0.09), vec3(0.04, 0.12, 0.22), h);
        float streak = sin(vPos.x * 0.35 + uTime * 0.15) * 0.03;
        c += streak;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    side: BackSide,
    depthWrite: false,
  });

  const dome = new Mesh(new PlaneGeometry(120, 60, 1, 1), domeMat);
  dome.position.set(0, 18, -22);
  group.add(dome);

  const dnaGeo = buildDnaField();
  const dnaMat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSubmerge: { value: 0 },
      uLocalT: { value: 0 },
    },
    vertexShader: dnaVert,
    fragmentShader: dnaFrag,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const dnaPoints = new Points(dnaGeo, dnaMat);
  dnaPoints.position.set(0, 0.4, -1.2);
  group.add(dnaPoints);

  const fogColor = new Color(0x030912);
  const tmp = new Vector3();

  return {
    group,
    fogColor,
    update(elapsed: number, localT: number) {
      const submerge = Math.min(
        1,
        Math.max(0, Math.pow((localT - 0.02) / 0.88, 0.62)),
      );
      waterMat.uniforms.uTime.value = elapsed;
      waterMat.uniforms.uLocalT.value = localT;
      waterMat.uniforms.uSubmerge.value = submerge;
      domeMat.uniforms.uTime.value = elapsed;
      dnaMat.uniforms.uTime.value = elapsed;
      dnaMat.uniforms.uSubmerge.value = submerge;
      dnaMat.uniforms.uLocalT.value = localT;
      const sheen = surfaceSheen.material as ShaderMaterial;
      sheen.uniforms.uTime.value = elapsed;
      sheen.uniforms.uSubmerge.value = submerge;

      tmp.set(
        Math.sin(elapsed * 0.055 + localT * 0.6) * 0.28 * submerge,
        -submerge * 1.35,
        Math.sin(elapsed * 0.04) * 0.22 * submerge,
      );
      group.position.copy(tmp);

      dnaPoints.rotation.y = elapsed * 0.04 * (0.35 + submerge);
    },
    dispose() {
      water.geometry.dispose();
      waterMat.dispose();
      surfaceSheen.geometry.dispose();
      ;(surfaceSheen.material as ShaderMaterial).dispose();
      dome.geometry.dispose();
      domeMat.dispose();
      dnaGeo.dispose();
      dnaMat.dispose();
    },
  };
}
