import { bloomScrollDrive } from '@citron-bloom-engine/bloom-runtime/flowerBloomExperience';
import type { FrameContext, ISystem } from '@/types';
import type { InkblotCamera } from '@/core/camera';
import { clamp, lerp, smoothstep } from '@/utils/math';
import { Vector3 } from 'three';

export type CameraMotionMode = 'orbit' | 'delicate' | 'showcaseOrbit';

/**
 * Camera motion: heavy scroll orbit (fluid / SDF) vs Citron Bloom delicate mode
 * (scroll-synced dolly + orbit around the plant, matched to bloom unveiling).
 */
export class AnimationSystem implements ISystem {
  private camera: InkblotCamera | null = null;
  private scrollProgress = 0;
  private pointerNdcX = 0;
  private pointerNdcY = 0;
  private mode: CameraMotionMode;
  /** When set while mode is `delicate`, drives six-band journey cameras (flower experience). */
  private journeyFlower: { section: number; localT: number } | null = null;
  private readonly tmpUp = new Vector3(0, 1, 0);

  constructor(
    camera: InkblotCamera,
    initialMode: CameraMotionMode = 'orbit',
  ) {
    this.camera = camera;
    this.mode = initialMode;
  }

  setMode(mode: CameraMotionMode): void {
    this.mode = mode;
  }

  getMode(): CameraMotionMode {
    return this.mode;
  }

  init(_ctx: FrameContext): void {}

  setScrollProgress(progress: number): void {
    this.scrollProgress = progress;
  }

  /** Normalised pointer [-1, 1] for subtle parallax in delicate mode. */
  setPointerNdc(x: number, y: number): void {
    this.pointerNdcX = x;
    this.pointerNdcY = y;
  }

  /** Flower journey: pass each frame; pass `null` to fall back to scroll-based delicate orbit. */
  setJourneyFlower(state: { section: number; localT: number } | null): void {
    this.journeyFlower = state;
  }

  update(ctx: FrameContext): void {
    if (!this.camera) return;

    if (this.mode === 'delicate' && this.journeyFlower) {
      const { section, localT } = this.journeyFlower;
      const cam = this.camera.instance;
      const px = this.pointerNdcX * 0.22;
      const py = this.pointerNdcY * 0.14;

      if (section === 5) {
        cam.up.set(0, -1, 0);
      } else {
        cam.up.copy(this.tmpUp.set(0, 1, 0));
      }

      if (section === 0) {
        const u = bloomScrollDrive(localT);
        const ease = smoothstep(0, 1, u);
        const theta = u * Math.PI * 2.5 + ctx.elapsed * 0.0022;
        const radiusXZ = lerp(10.15, 8.05, ease);
        const camY = lerp(3.02, 1.48, ease);
        const lookY = lerp(0.06, 0.9, ease);
        const breathe = Math.sin(ctx.elapsed * 0.038) * (0.01 * (1 - ease * 0.55));
        this.camera.moveTo(
          Math.sin(theta) * radiusXZ + px,
          camY + breathe + py,
          Math.cos(theta) * radiusXZ,
        );
        this.camera.lookAtTarget(0, lookY, 0);
        return;
      }

      if (section === 1) {
        const t = Math.pow(smoothstep(0, 1, localT), 0.52);
        const z = lerp(7.05, 4.45, t);
        const yLift = lerp(0, 0.12, t);
        const breathe = Math.sin(ctx.elapsed * 0.09) * 0.04;
        this.camera.moveTo(px * 1.15, 1.72 + yLift + breathe + py, z);
        this.camera.lookAtTarget(0, 0.28, 0);
        return;
      }

      if (section === 2) {
        const ang = Math.pow(localT, 0.55) * Math.PI * 0.72 + ctx.elapsed * 0.08;
        const rad = 8.15;
        this.camera.moveTo(Math.sin(ang) * rad + px, 2.02 + py, Math.cos(ang) * rad);
        this.camera.lookAtTarget(0, 1.02, 0);
        return;
      }

      if (section === 3) {
        const sub = Math.min(
          1,
          Math.max(0, Math.pow((localT - 0.02) / 0.88, 0.62)),
        );
        const drift = Math.sin(ctx.elapsed * 0.048) * (0.22 + sub * 0.35);
        const camY = 3.15 + py - sub * 2.05 + Math.sin(ctx.elapsed * 0.055) * 0.12 * sub;
        const camZ = 9.4 - sub * 3.15 + localT * 0.55;
        const lookY = -0.42 + sub * 0.55 + localT * 0.12;
        const lookZ = sub * 0.45;
        this.camera.moveTo(drift + px, camY, camZ);
        this.camera.lookAtTarget(0, lookY, lookZ);
        return;
      }

      if (section === 4) {
        const sweep = Math.pow(localT, 0.5);
        const drift = Math.sin(ctx.elapsed * 0.1) * (0.22 + sweep * 0.2);
        const z = lerp(6.1, 5.35, sweep);
        this.camera.moveTo(drift + px, 2.02 + py, z);
        this.camera.lookAtTarget(0, 0.52 + sweep * 0.08, -1.02 - sweep * 0.12);
        return;
      }

      const u = bloomScrollDrive(localT);
      const ease = smoothstep(0, 1, u);
      const theta = u * Math.PI * 2.5 + ctx.elapsed * 0.0022;
      const radiusXZ = lerp(10.15, 8.05, ease);
      const camY = lerp(3.02, 1.48, ease);
      const lookY = lerp(0.06, 0.9, ease);
      const breathe = Math.sin(ctx.elapsed * 0.038) * (0.01 * (1 - ease * 0.55));
      this.camera.moveTo(
        Math.sin(theta) * radiusXZ + px,
        camY + breathe + py,
        Math.cos(theta) * radiusXZ,
      );
      this.camera.lookAtTarget(0, lookY, 0);
      return;
    }

    if (this.mode === 'delicate') {
      this.camera.instance.up.set(0, 1, 0);
      const raw = clamp(this.scrollProgress, 0, 1);
      const u = bloomScrollDrive(raw);
      const ease = smoothstep(0, 1, u);

      // Slow spiral: angle advances gently with scroll (~1.25 turns); almost no time-based spin.
      const theta = u * Math.PI * 2.5 + ctx.elapsed * 0.0022;

      // Stay at a similar stand-off; modest zoom + clear downward drift (helix / spiral down).
      const radiusXZ = lerp(10.15, 8.05, ease);
      const camY = lerp(3.02, 1.48, ease);
      const lookY = lerp(0.06, 0.9, ease);

      const breathe = Math.sin(ctx.elapsed * 0.038) * (0.01 * (1 - ease * 0.55));
      const parallaxX = this.pointerNdcX * (0.18 + ease * 0.14);
      const parallaxY = this.pointerNdcY * (0.12 + ease * 0.1);

      this.camera.moveTo(
        Math.sin(theta) * radiusXZ + parallaxX,
        camY + breathe + parallaxY,
        Math.cos(theta) * radiusXZ,
      );
      this.camera.lookAtTarget(0, lookY, 0);
      return;
    }

    if (this.mode === 'showcaseOrbit') {
      const driftAngle = ctx.elapsed * 0.125;
      const radius = 7.35;
      const y = 2.15 + Math.sin(ctx.elapsed * 0.085) * 0.22;
      const px = this.pointerNdcX * 0.55;
      const py = this.pointerNdcY * 0.35;
      this.camera.moveTo(
        Math.sin(driftAngle) * radius + px,
        y + py,
        Math.cos(driftAngle) * radius,
      );
      this.camera.lookAtTarget(0, 1.05, 0);
      return;
    }

    const t = this.scrollProgress;
    const targetAngle = t * Math.PI * 1.5;
    const radius = 12.0;
    const driftAngle = ctx.elapsed * 0.05;
    const finalAngle = targetAngle + driftAngle;

    const targetX = Math.sin(finalAngle) * radius;
    const targetZ = Math.cos(finalAngle) * radius;
    const targetY = 2.0 + Math.sin(ctx.elapsed * 0.2) * 0.5;

    this.camera.moveTo(targetX, targetY, targetZ);
    this.camera.lookAtTarget(0, 0, 0);
  }

  setCamera(camera: InkblotCamera): void {
    this.camera = camera;
  }

  dispose(): void {
    this.camera = null;
  }
}
