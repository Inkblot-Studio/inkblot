import * as THREE from 'three';

import type { WorkProject } from '@/data/workSectionContent';

const FOV = 35;
const CAMERA_Z = 5;

const SLAB_H_FRAC = 0.36;
const SLAB_GAP_FRAC = 0.14;

const VERT_SHADER = /* glsl */ `
  uniform float uBendLineY;
  uniform float uBendRange;
  uniform float uMaxAngle;
  varying vec2 vUv;
  varying float vBendT;

  void main() {
    vUv = uv;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    float distAbove = max(0.0, worldPos.y - uBendLineY);
    float bendT = clamp(distAbove / uBendRange, 0.0, 1.0);
    vBendT = bendT;

    if (bendT > 0.0001) {
      float angle = bendT * uMaxAngle;
      float radius = uBendRange / max(0.0001, uMaxAngle);

      float bentY = uBendLineY + radius * sin(angle);
      float bentZ = worldPos.z - radius * (1.0 - cos(angle));

      worldPos.y = bentY;
      worldPos.z = bentZ;
    }

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAG_SHADER = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uDir;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vBendT;

  vec3 procedural(vec2 uv, vec3 accent, float t) {
    vec2 p = uv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);

    float swirl = sin(a * 3.5 - r * 6.0 + t * 0.35) * 0.5 + 0.5;
    float pulse = sin(t * 0.3 + r * 4.0) * 0.5 + 0.5;

    vec3 deep = accent * 0.32;
    vec3 mid = accent;
    vec3 bright = mix(accent, vec3(1.0), 0.45);

    vec3 color = mix(deep, bright, swirl * pulse);
    color = mix(color, mid, 0.4 + 0.2 * sin(t * 0.18 + uv.x * 3.0 + uv.y * 2.0));

    float grain = fract(sin(dot(uv * 200.0 + t * 0.2, vec2(12.9898, 78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.025;

    return color;
  }

  void main() {
    float topEdge, bottomEdge;
    if (uDir < 0.5) {
      topEdge = 1.0 - 0.5 * vUv.x;
      bottomEdge = 0.5 * vUv.x;
    } else {
      topEdge = 0.5 + 0.5 * vUv.x;
      bottomEdge = 0.5 - 0.5 * vUv.x;
    }

    float aa = fwidth(vUv.y) * 1.4;
    float topAlpha = smoothstep(topEdge + aa, topEdge - aa, vUv.y);
    float bottomAlpha = smoothstep(bottomEdge - aa, bottomEdge + aa, vUv.y);
    float triAlpha = topAlpha * bottomAlpha;

    if (triAlpha < 0.001) discard;

    vec3 color;
    if (uHasTex > 0.5) {
      color = texture2D(uTex, vUv).rgb;
    } else {
      color = procedural(vUv, uAccent, uTime);
    }

    float bendDim = 1.0 - vBendT * 0.45;
    color *= bendDim;

    float bendFade = 1.0 - smoothstep(0.72, 1.0, vBendT);

    vec2 vp = vUv - 0.5;
    float vig = 1.0 - dot(vp, vp) * 0.45;
    color *= vig;

    gl_FragColor = vec4(color, triAlpha * uOpacity * bendFade);
  }
`;

interface SlabRecord {
  mesh: THREE.Mesh;
  uniforms: Record<string, { value: unknown }>;
  video: HTMLVideoElement | null;
  geometry: THREE.PlaneGeometry;
}

export interface WorkSectionSceneOptions {
  canvas: HTMLCanvasElement;
  projects: readonly WorkProject[];
}

export class WorkSectionScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;
  private slabs: SlabRecord[] = [];
  private uTime = { value: 0 };
  private uBendLineY = { value: 0 };
  private uBendRange = { value: 0 };
  private uMaxAngle = { value: Math.PI * 0.55 };
  private clock = new THREE.Clock();
  private raf = 0;
  private slabUnitWorld = 1;
  private projectsCount: number;
  private viewportHWorld = 0;

  constructor({ canvas, projects }: WorkSectionSceneOptions) {
    this.projectsCount = projects.length;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 100);
    this.camera.position.set(0, 0, CAMERA_Z);

    this.viewportHWorld = 2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360);
    this.uBendLineY.value = this.viewportHWorld * 0.18;
    this.uBendRange.value = this.viewportHWorld * 0.34;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.buildSlabs(projects, w / h);
    this.resize(w, h);
    this.tick();
  }

  private buildSlabs(projects: readonly WorkProject[], aspect: number): void {
    const slabH = this.viewportHWorld * SLAB_H_FRAC;
    const slabGap = this.viewportHWorld * SLAB_GAP_FRAC;
    const slabUnit = slabH + slabGap;
    this.slabUnitWorld = slabUnit;

    const viewportW = this.viewportHWorld * aspect;
    const slabW = Math.min(slabH * 2.4, viewportW * 0.84);

    projects.forEach((project, i) => {
      const isRight = i % 2 === 0;
      const geo = new THREE.PlaneGeometry(slabW, slabH, 96, 48);

      const accent = new THREE.Color(project.accent ?? '#777777');
      const uniforms = {
        uTex: { value: null as THREE.Texture | null },
        uHasTex: { value: 0.0 },
        uAccent: { value: accent },
        uTime: this.uTime,
        uDir: { value: isRight ? 0 : 1 },
        uOpacity: { value: 1.0 },
        uBendLineY: this.uBendLineY,
        uBendRange: this.uBendRange,
        uMaxAngle: this.uMaxAngle,
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT_SHADER,
        fragmentShader: FRAG_SHADER,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = -i * slabUnit;
      mesh.frustumCulled = false;
      this.group.add(mesh);

      let video: HTMLVideoElement | null = null;
      if (project.videoUrl) {
        video = this.attachVideo(project.videoUrl, uniforms);
      }

      this.slabs.push({ mesh, uniforms, video, geometry: geo });
    });
  }

  private attachVideo(
    url: string,
    uniforms: Record<string, { value: unknown }>,
  ): HTMLVideoElement {
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    (video as HTMLVideoElement & { webkitPlaysInline?: boolean }).webkitPlaysInline = true;
    video.autoplay = true;
    video.preload = 'auto';

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    uniforms.uTex.value = tex;
    uniforms.uHasTex.value = 1.0;

    void video.play().catch(() => {
      /* autoplay may be blocked; user interaction will start it */
    });
    return video;
  }

  /**
   * scrollT: 0..1 — normalized internal scroll progress.
   * 0 = first slab centered. 1 = last slab gone past top.
   */
  setScrollProgress(scrollT: number): void {
    const total = this.projectsCount * this.slabUnitWorld;
    this.group.position.y = scrollT * total;
  }

  resize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // Re-fit slab widths to the new aspect (height stays constant in world units)
    const aspect = w / h;
    const viewportW = this.viewportHWorld * aspect;
    const slabH = this.viewportHWorld * SLAB_H_FRAC;
    const slabW = Math.min(slabH * 2.4, viewportW * 0.84);

    this.slabs.forEach((s) => {
      const targetScaleX = slabW / (s.geometry.parameters.width || 1);
      s.mesh.scale.x = targetScaleX;
    });
  }

  private tick = (): void => {
    this.uTime.value = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.tick);
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.slabs.forEach((s) => {
      s.mesh.geometry.dispose();
      const mat = s.mesh.material as THREE.ShaderMaterial;
      const tex = mat.uniforms.uTex.value as THREE.Texture | null;
      tex?.dispose();
      mat.dispose();
      if (s.video) {
        s.video.pause();
        s.video.removeAttribute('src');
        s.video.load();
      }
    });
    this.slabs = [];
    this.renderer.dispose();
  }
}
