import {
  CanvasTexture,
  Color,
  Group,
  LinearFilter,
  Raycaster,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
} from 'three';
import type { JourneyState } from '@/journey/sectionMap';
import { damp, smoothstep } from '@/utils/math';
import type { FrameContext, IComponent } from '@/types';
import type { InteractionSystem } from '@/systems/interactionSystem';

const CALLOUT = "Ready for what's next?";
/**
 * Local space in front of the camera: +Y up, −Z into the scene (toward the flower).
 * Parenting the copy to the camera keeps it from swimming when the world/camera orbits.
 */
const CAM_LOCAL = { x: 0, y: 0.32, z: -4.25 } as const;

const CANVAS_W = 2200;
const CANVAS_H = 520;
/** World-space width in front of the camera; ~40% of the previous default for lighter framing. */
const BASE_WIDTH = 7.85 * 0.4;

/**
 * Canvas sprite, camera-parented (stable in the view while the flower moves) + pointer hover.
 */
export class FlowerCalloutTextComponent implements IComponent {
  readonly group = new Group();
  private sprite: Sprite | null = null;
  private material: SpriteMaterial | null = null;
  private map: CanvasTexture | null = null;
  private journey: JourneyState | null = null;
  private domEl: HTMLElement | null = null;
  private hoverSm = 0;
  /** Smoothed [0,1] from scroll speed — drives subtle scale/brightness. */
  private scrollSm = 0;
  private readonly ray = new Raycaster();
  private readonly colorIdle = new Color(0xf0f9ff);
  private readonly colorHover = new Color(0x7dd3fc);
  private readonly colorScrollBoost = new Color(0xf8fafc);
  private reducedMotion = false;

  constructor(
    private readonly isFlowerExperience: () => boolean,
    private readonly getInteraction: () => InteractionSystem | null,
    private readonly getScrollSpeedPx: () => number,
  ) {
    this.group.name = 'flower-callout-sprite';
  }

  setJourneyState(state: JourneyState | null): void {
    this.journey = state;
  }

  private static drawToCanvas(
    ctx2d: CanvasRenderingContext2D,
    w: number,
    h: number,
    forOpacity = 1,
  ): void {
    const g = forOpacity;
    ctx2d.clearRect(0, 0, w, h);
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    const cx = (w * 0.5) | 0;
    const cy = (h * 0.5) | 0;
    ctx2d.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx2d) {
      ctx2d.imageSmoothingQuality = 'high';
    }
    const basePx = Math.round(100 * (w / 2200));
    const font = `600 ${basePx}px "Syne", "Outfit", "Fraunces", system-ui, sans-serif`;
    ctx2d.font = font;
    const pad = 12;
    const maxW = w - pad * 2;
    if (ctx2d.measureText(CALLOUT).width > maxW) {
      const scale = maxW / ctx2d.measureText(CALLOUT).width;
      const fs = Math.max(36, Math.round(basePx * scale));
      ctx2d.font = `600 ${fs}px "Syne", "Outfit", "Fraunces", system-ui, sans-serif`;
    }
    ctx2d.lineJoin = 'round';
    ctx2d.miterLimit = 2;
    /* Fill + soft shadow only: strokeText draws interior paths in counters and reads as “seams”. */
    ctx2d.shadowColor = `rgba(2,6,23,${0.92 * g})`;
    ctx2d.shadowBlur = 20 * g;
    ctx2d.shadowOffsetX = 0;
    ctx2d.shadowOffsetY = 0;
    ctx2d.fillStyle = `rgba(240,249,255,${0.99 * g})`;
    ctx2d.fillText(CALLOUT, cx, cy);
    ctx2d.shadowBlur = 0;
  }

  init(ctx: FrameContext): void {
    this.domEl = ctx.renderer.domElement;
    this.reducedMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const c2d = canvas.getContext('2d');
    if (!c2d) return;

    FlowerCalloutTextComponent.drawToCanvas(c2d, CANVAS_W, CANVAS_H, 1);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.map = tex;

    const mat = new SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0,
      sizeAttenuation: true,
    });
    this.material = mat;

    const sp = new Sprite(mat);
    sp.renderOrder = 30;
    const a = BASE_WIDTH;
    sp.scale.set(a, a * (CANVAS_H / CANVAS_W), 1);
    this.sprite = sp;
    this.group.add(sp);
    this.group.position.set(CAM_LOCAL.x, CAM_LOCAL.y, CAM_LOCAL.z);
    this.group.renderOrder = 5;
    ctx.camera.add(this.group);
  }

  private clearCursor(): void {
    if (this.domEl) {
      this.domEl.style.removeProperty('cursor');
    }
  }

  update(ctx: FrameContext): void {
    if (!this.sprite || !this.material || !this.map) return;

    const on = this.isFlowerExperience();
    this.group.visible = on;
    this.material.opacity = 0;
    this.material.color.copy(this.colorIdle);
    if (!on || !this.journey) {
      this.hoverSm = damp(this.hoverSm, 0, 10, ctx.delta);
      this.scrollSm = damp(this.scrollSm, 0, 5, ctx.delta);
      this.clearCursor();
      return;
    }

    if (this.journey.section !== 0) {
      this.hoverSm = damp(this.hoverSm, 0, 10, ctx.delta);
      this.scrollSm = damp(this.scrollSm, 0, 5, ctx.delta);
      this.clearCursor();
      return;
    }

    const lt = this.journey.localT;
    const enter = smoothstep(0.34, 0.52, lt);
    const exit = 1 - smoothstep(0.76, 0.92, lt);
    const vis = enter * exit;

    if (vis < 0.0005) {
      this.hoverSm = damp(this.hoverSm, 0, 10, ctx.delta);
      this.scrollSm = damp(this.scrollSm, 0, 5, ctx.delta);
      this.clearCursor();
      return;
    }

    this.material.opacity = vis;

    const int = this.getInteraction();
    const aspect = CANVAS_H / CANVAS_W;

    let over = 0;
    if (int) {
      /* Damped NDC lags the cursor; use raw pointer so the ray matches the actual pointer. */
      this.ray.setFromCamera(int.rawPointer, ctx.camera);
      const hits = this.ray.intersectObject(this.sprite, false);
      over = hits.length > 0 ? 1 : 0;
    }

    const scrollTarget = this.reducedMotion
      ? 0
      : Math.min(1, Math.abs(this.getScrollSpeedPx()) / 1100);
    this.scrollSm = damp(this.scrollSm, scrollTarget, 5, ctx.delta);

    const hoverTarget = this.reducedMotion ? 0 : over;
    this.hoverSm = damp(this.hoverSm, hoverTarget, 16, ctx.delta);

    this.material.color.copy(this.colorIdle);
    this.material.color.lerp(this.colorScrollBoost, 0.07 * this.scrollSm * (1 - this.hoverSm * 0.5));
    this.material.color.lerp(this.colorHover, 0.78 * this.hoverSm);

    const scrollK = 0.96 + 0.04 * enter + 0.06 * this.scrollSm;
    const hoverK = 1 + (this.reducedMotion ? 0.04 : 0.11) * this.hoverSm;
    const w = BASE_WIDTH * scrollK * hoverK;
    this.sprite!.scale.set(w, w * aspect, 1);

    this.group.position.set(CAM_LOCAL.x, CAM_LOCAL.y, CAM_LOCAL.z);
    this.group.updateMatrixWorld(true);

    if (int && this.domEl && this.material.opacity > 0.12) {
      this.domEl.style.cursor = over === 1 ? 'pointer' : 'default';
    } else {
      this.clearCursor();
    }
  }

  dispose(): void {
    this.clearCursor();
    this.group.removeFromParent();
    this.material?.dispose();
    this.map?.dispose();
  }
}
