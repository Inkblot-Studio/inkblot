import type { WebGLRenderer } from 'three';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  PointLight,
  Vector3,
} from 'three';
import type { BloomLod } from '../bloom-core/types';
import { createFloatingVideoTile } from './floatingVideoTile';
import { createIridescentStomp, disposeIridescentStomp } from './iridescentStomp';
import { createParticleMist } from './particleMist';

export interface CreateStompShowcaseSceneOptions {
  renderer: WebGLRenderer;
  lod?: BloomLod;
}

export interface StompShowcaseSceneHandle {
  readonly root: Group;
  update(delta: number, elapsed: number): void;
  dispose(): void;
}

interface TileSpec {
  readonly title: string;
  readonly subtitle: string;
  readonly angle: number;
  readonly dist: number;
  readonly y: number;
  readonly tilt: number;
  readonly videoSrc?: string;
}

const TILES: TileSpec[] = [
  {
    title: 'MILLION PIECE MISSION',
    subtitle: 'Realtime WebGL · Case study',
    angle: 0.85,
    dist: 5.15,
    y: 1.52,
    tilt: 0.11,
  },
  {
    title: 'GHOST CITIES',
    subtitle: 'Installation · Depth & parallax',
    angle: 2.45,
    dist: 5.65,
    y: 1.12,
    tilt: -0.07,
  },
  {
    title: 'BXRDUJA',
    subtitle: 'Brand world · Film',
    angle: 3.95,
    dist: 4.55,
    y: 1.78,
    tilt: 0.06,
  },
  {
    title: 'DEPTH FIELD',
    subtitle: 'Product story · 3D UI',
    angle: 5.35,
    dist: 5.95,
    y: 1.22,
    tilt: -0.05,
  },
];

function mistCountForLod(lod: BloomLod | undefined): number {
  switch (lod) {
    case 'low':
      return 900;
    case 'medium':
      return 1400;
    default:
      return 2200;
  }
}

/**
 * Active Theory–style showcase: iridescent central stomp, neon mist, orbiting glass video tiles with titles.
 */
export function createStompShowcaseScene(
  options: CreateStompShowcaseSceneOptions,
): StompShowcaseSceneHandle {
  const root = new Group();

  root.add(new HemisphereLight(0x4c1d95, 0x020617, 0.55));
  root.add(new AmbientLight(0x312e81, 0.28));

  const key = new DirectionalLight(0xc4b5fd, 0.85);
  key.position.set(5, 12, 7);
  root.add(key);

  const rim = new DirectionalLight(0x22d3ee, 0.35);
  rim.position.set(-8, 6, -5);
  root.add(rim);

  const mag = new PointLight(0xe879f9, 1.2, 24, 2);
  mag.position.set(0, 2.4, 1.2);
  root.add(mag);

  const stomp = createIridescentStomp();
  root.add(stomp);

  const mist = createParticleMist(
    mistCountForLod(options.lod),
    new Color(0x7c3aed),
    new Color(0x22d3ee),
  );
  mist.points.position.set(0, 0.4, 0);
  root.add(mist.points);

  const lookTarget = new Vector3(0, 1.05, 0);
  const tiles: ReturnType<typeof createFloatingVideoTile>[] = [];

  for (const spec of TILES) {
    const h = createFloatingVideoTile({
      title: spec.title,
      subtitle: spec.subtitle,
      videoSrc: spec.videoSrc,
    });
    tiles.push(h);
    const g = h.group;
    const a = spec.angle;
    g.position.set(Math.cos(a) * spec.dist, spec.y, Math.sin(a) * spec.dist);
    g.lookAt(lookTarget);
    g.rotateX(spec.tilt);
    root.add(g);
  }

  return {
    root,
    update(delta: number, elapsed: number) {
      void delta;
      mist.update(elapsed);
      stomp.rotation.y = Math.sin(elapsed * 0.11) * 0.04;
      stomp.rotation.x = Math.sin(elapsed * 0.09) * 0.018;
      for (const t of tiles) {
        t.update(options.renderer, elapsed);
      }
    },
    dispose() {
      for (const t of tiles) {
        t.group.removeFromParent();
        t.dispose();
      }
      mist.points.removeFromParent();
      mist.dispose();
      stomp.removeFromParent();
      disposeIridescentStomp(stomp);
      root.removeFromParent();
    },
  };
}
