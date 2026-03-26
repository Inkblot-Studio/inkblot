import { bloomScrollDrive } from '@citron-bloom-engine/bloom-runtime/flowerBloomExperience';
import type { FrameContext, ISystem } from '@/types';
import type { InkblotCamera } from '@/core/camera';
import { clamp, lerp, smoothstep } from '@/utils/math';

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

  update(ctx: FrameContext): void {
    if (!this.camera) return;

    if (this.mode === 'delicate') {
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
