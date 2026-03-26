import {
  AdditiveBlending,
  Group,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';

export interface LabPortalHandle {
  readonly group: Group;
  update(elapsed: number, localT: number): void;
  dispose(): void;
}

const portalFrag = `
uniform float uTime;
uniform float uLocalT;
varying vec2 vUv;

float hex(vec2 p) {
  p *= 12.0;
  vec2 q = vec2(p.x + p.y * 0.577, p.y * 1.154);
  vec2 g = abs(fract(q) - 0.5);
  float edge = max(g.x, g.y);
  return smoothstep(0.48, 0.5, edge);
}

void main() {
  vec2 uv = vUv - 0.5;
  float r = length(uv);
  float h = hex(uv * (1.2 + sin(uTime * 0.4) * 0.05));
  float mask = smoothstep(0.72, 0.28, r) * h;
  float caust = sin(uv.x * 30.0 + uTime * 1.1) * sin(uv.y * 26.0 - uTime * 0.9);
  vec3 cool = vec3(0.05, 0.2, 0.45);
  vec3 warm = vec3(0.55, 0.28, 0.12);
  vec3 inner = mix(cool, warm, 0.35 + 0.25 * sin(uLocalT * 6.28));
  inner += vec3(0.15, 0.45, 0.65) * caust * 0.08 * mask;
  float rim = smoothstep(0.5, 0.42, r) * (1.0 - smoothstep(0.4, 0.25, r));
  vec3 col = mix(vec3(0.01, 0.04, 0.08), inner, mask);
  col += vec3(0.4, 0.85, 1.0) * rim * 0.45;
  float alpha = mix(0.92, 1.0, mask);
  gl_FragColor = vec4(col, alpha);
}
`;

export function createLabPortalScene(): LabPortalHandle {
  const group = new Group();

  const backMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLocalT: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uLocalT;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv;
        float c = sin(p.x * 20.0 + uTime * 0.8) * sin(p.y * 18.0 - uTime * 0.6);
        vec3 col = mix(vec3(0.02, 0.08, 0.18), vec3(0.06, 0.22, 0.38), 0.5 + 0.5 * c);
        col *= 0.55 + 0.45 * uLocalT;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const back = new Mesh(new PlaneGeometry(14, 9), backMat);
  back.position.set(0, 1.2, -4.2);
  group.add(back);

  const portalMat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLocalT: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: portalFrag,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const portal = new Mesh(new PlaneGeometry(5.2, 5.2), portalMat);
  portal.position.set(0, 1.35, -2.85);
  group.add(portal);

  const floorMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float g = sin(vUv.x * 40.0 + uTime) * sin(vUv.y * 36.0 - uTime * 0.7);
        vec3 col = vec3(0.02, 0.06, 0.12) + vec3(0.04, 0.14, 0.22) * g * 0.15;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const floor = new Mesh(new PlaneGeometry(16, 16), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.4;
  group.add(floor);

  return {
    group,
    update(elapsed: number, localT: number) {
      backMat.uniforms.uTime.value = elapsed;
      backMat.uniforms.uLocalT.value = localT;
      portalMat.uniforms.uTime.value = elapsed;
      portalMat.uniforms.uLocalT.value = localT;
      floorMat.uniforms.uTime.value = elapsed;
    },
    dispose() {
      back.geometry.dispose();
      backMat.dispose();
      portal.geometry.dispose();
      portalMat.dispose();
      floor.geometry.dispose();
      floorMat.dispose();
    },
  };
}
