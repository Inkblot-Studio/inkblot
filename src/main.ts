import { Clock, type Scene } from 'three';
import { InkblotRenderer } from '@/core/renderer';
import { InkblotScene } from '@/core/scene';
import { InkblotCamera } from '@/core/camera';
import { InkblotControls } from '@/core/controls';
import { PostprocessingPipeline } from '@/postprocessing/pipeline';
import { ScrollSystem } from '@/systems/scrollSystem';
import { InteractionSystem } from '@/systems/interactionSystem';
import { AnimationSystem } from '@/systems/animationSystem';
import { AudioSystem } from '@/systems/audioSystem';
import { FluidFlowerComponent } from '@/components/fluidFlower';
import { CitronBloomComponent } from '@/components/citronBloomComponent';
import { Sections3DComponent } from '@/components/sections3D';
import type { FrameContext, ISystem, IComponent } from '@/types';
import { smootherstep } from '@/utils/math';
import { CitronBloomComposer } from '@citron-bloom-engine/bloom-postprocess/citronBloomComposer';
import {
  createBloomTransitionScene,
  type BloomTransitionSceneHandle,
} from '@citron-bloom-engine/examples/createBloomTransitionScene';
import { bloomScrollDrive } from '@citron-bloom-engine/bloom-runtime/flowerBloomExperience';
import { BLOOM_LOD_PROFILES, type BloomLod } from '@citron-bloom-engine/bloom-core/types';
import { initCookieConsent } from '@/ui/cookieConsent';
import { initNavChrome, updateNavChrome } from '@/ui/navChrome';

/**
 * Production: Citron Bloom only with `?citronBloom` (optional `=medium` | `low`).
 * Development: Bloom is the default so `npm run dev` shows the engine; add `?fluid` for the raymarched flower.
 */
function parseCitronBloomMode(): { active: boolean; lod: BloomLod } {
  const params = new URLSearchParams(location.search);
  if (params.has('fluid')) {
    return { active: false, lod: 'high' };
  }
  const raw = params.get('citronBloom');
  const lodFrom = (v: string | null): BloomLod =>
    v === 'medium' || v === 'low' ? v : 'high';

  if (raw !== null) {
    return { active: true, lod: lodFrom(raw) };
  }
  if (import.meta.env.DEV) {
    return { active: true, lod: lodFrom(params.get('lod')) };
  }
  return { active: false, lod: 'high' };
}

/** `?experience=stomp` — iridescent stomp + floating video tiles; default `flower`. */
function parseBloomExperienceId(): string {
  const raw = new URLSearchParams(location.search).get('experience');
  if (raw && /^[a-z0-9_-]+$/i.test(raw)) {
    return raw.toLowerCase();
  }
  return 'flower';
}

type PostStack = PostprocessingPipeline | CitronBloomComposer;

class Inkblot {
  private readonly renderer: InkblotRenderer;
  private readonly scene: InkblotScene;
  private readonly camera: InkblotCamera;

  private readonly controls: InkblotControls;
  private readonly postprocessing: PostStack;
  private readonly clock = new Clock();

  private readonly systems: ISystem[] = [];
  private readonly components: IComponent[] = [];

  private frameContext!: FrameContext;

  private readonly useCitronBloom: boolean;
  private readonly citronBloomLod: BloomLod;
  private readonly bloomExperienceId: string;
  private fluidFlowerComponent: FluidFlowerComponent | null = null;
  private citronBloomComponent: CitronBloomComponent | null = null;

  private scrollSystem!: ScrollSystem;
  private interactionSystem!: InteractionSystem;
  private animationSystem!: AnimationSystem;
  private audioSystem!: AudioSystem;
  private sections3DComponent: Sections3DComponent | null = null;
  private citronTransitionScene: Scene | null = null;
  private citronTransitionHandle: BloomTransitionSceneHandle | null = null;

  constructor() {
    const { active: useCitronBloom, lod: citronBloomLod } = parseCitronBloomMode();
    this.useCitronBloom = useCitronBloom;
    this.citronBloomLod = citronBloomLod;
    this.bloomExperienceId = useCitronBloom ? parseBloomExperienceId() : 'flower';

    document.body.classList.toggle('citron-bloom-mode', useCitronBloom);
    document.body.classList.toggle(
      'experience-stomp',
      useCitronBloom && this.bloomExperienceId === 'stomp',
    );

    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Missing #canvas-container element');

    this.renderer = new InkblotRenderer({ container });
    this.scene = new InkblotScene();
    this.camera = new InkblotCamera();
    this.controls = new InkblotControls(
      this.camera.instance,
      this.renderer.instance.domElement,
    );

    if (useCitronBloom) {
      const profile = BLOOM_LOD_PROFILES[citronBloomLod];
      this.postprocessing = new CitronBloomComposer({
        // Lower than profile so the flower stays readable; threshold leaves midtones crisp.
        bloomStrength: profile.bloomStrength * 0.48,
        bloomRadius: 0.36,
        bloomThreshold: 0.82,
        enableDof: profile.enableDof,
      });
    } else {
      this.postprocessing = new PostprocessingPipeline();
    }

    this.frameContext = {
      renderer: this.renderer.instance,
      scene: this.scene.instance,
      camera: this.camera.instance,
      delta: 0,
      elapsed: 0,
    };

    this.registerSystems();
    this.registerComponents();
    this.init();
  }

  private registerSystems(): void {
    const cameraMode = this.useCitronBloom ? 'delicate' : 'orbit';
    this.animationSystem = new AnimationSystem(this.camera, cameraMode);
    this.scrollSystem = new ScrollSystem();
    this.interactionSystem = new InteractionSystem();
    this.audioSystem = new AudioSystem();

    if (this.useCitronBloom) {
      this.camera.setDampFactor(1.42);
    }

    this.systems.push(
      this.scrollSystem,
      this.interactionSystem,
      this.animationSystem,
      this.audioSystem,
    );
  }

  private registerComponents(): void {
    if (this.useCitronBloom) {
      this.citronBloomComponent = new CitronBloomComponent(
        this.citronBloomLod,
        this.bloomExperienceId,
        this.interactionSystem,
      );
      this.components.push(this.citronBloomComponent);
    } else {
      this.fluidFlowerComponent = new FluidFlowerComponent();
      this.sections3DComponent = new Sections3DComponent();
      this.components.push(this.fluidFlowerComponent, this.sections3DComponent);
    }
  }

  private init(): void {
    this.camera.resize(this.renderer.viewport);

    if (this.postprocessing instanceof CitronBloomComposer) {
      if (this.useCitronBloom && this.bloomExperienceId === 'flower') {
        this.citronTransitionHandle = createBloomTransitionScene();
        this.citronTransitionScene = this.citronTransitionHandle.scene;
      }
      this.postprocessing.init(
        this.renderer.instance,
        this.scene.instance,
        this.camera.instance,
        this.citronTransitionScene ?? undefined,
      );
    } else {
      this.postprocessing.init(this.renderer.instance);
    }

    for (const system of this.systems) {
      system.init(this.frameContext);
    }
    for (const component of this.components) {
      component.init(this.frameContext);
    }

    if (this.useCitronBloom && this.citronBloomComponent) {
      this.animationSystem.setMode(this.citronBloomComponent.getCameraMode());
    }

    initNavChrome(this.audioSystem);
    initCookieConsent();

    this.onResize();

    window.addEventListener('resize', this.onResize);
    this.renderer.instance.setAnimationLoop(this.tick);
  }

  private tick = (): void => {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.frameContext.delta = delta;
    this.frameContext.elapsed = elapsed;

    this.scrollSystem.update(this.frameContext);
    document.documentElement.style.setProperty(
      '--scroll-raw',
      String(this.scrollSystem.progress),
    );
    this.interactionSystem.update(this.frameContext);
    this.animationSystem.setScrollProgress(this.scrollSystem.progress);
    if (this.useCitronBloom) {
      this.animationSystem.setPointerNdc(
        this.interactionSystem.pointer.x,
        this.interactionSystem.pointer.y,
      );
    }
    this.animationSystem.update(this.frameContext);
    this.audioSystem.update(this.frameContext);
    updateNavChrome(this.audioSystem, this.scrollSystem, elapsed);

    if (this.citronBloomComponent && this.scrollSystem) {
      this.citronBloomComponent.setBloomFromScroll(this.scrollSystem.progress);
    }

    for (const component of this.components) {
      component.update(this.frameContext);
    }

    if (this.sections3DComponent && this.scrollSystem) {
      this.sections3DComponent.setInteractionValues(this.scrollSystem.progress);
    }

    if (this.useCitronBloom) {
      const p = this.scrollSystem.progress;
      const bloomCss =
        this.bloomExperienceId === 'flower' ? bloomScrollDrive(p) : p;
      document.documentElement.style.setProperty(
        '--bloom-scroll',
        String(bloomCss),
      );
      if (
        this.bloomExperienceId === 'flower' &&
        this.postprocessing instanceof CitronBloomComposer
      ) {
        const t = smootherstep(0.9, 0.998, this.scrollSystem.progress);
        this.postprocessing.setSceneTransition(
          t,
          this.interactionSystem.pointer.x,
          this.interactionSystem.pointer.y,
        );
      }
    }

    if (this.fluidFlowerComponent && this.scrollSystem && this.audioSystem) {
      this.fluidFlowerComponent.setInteractionValues(
        this.scrollSystem.progress,
        this.audioSystem.lowFrequencyVolume,
      );
    }

    this.camera.update(delta);
    this.controls.update();

    if (this.citronTransitionHandle && this.bloomExperienceId === 'flower') {
      this.citronTransitionHandle.update(elapsed, this.camera.instance);
    }

    this.postprocessing.render(
      this.renderer.instance,
      this.scene.instance,
      this.camera.instance,
      elapsed,
    );

  };

  private onResize = (): void => {
    this.renderer.resize();
    this.camera.resize(this.renderer.viewport);

    const { width, height, pixelRatio } = this.renderer.viewport;
    this.postprocessing.resize(width, height, pixelRatio);

  };

  dispose(): void {
    this.renderer.instance.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);

    for (const component of this.components) component.dispose();
    for (const system of this.systems) system.dispose();

    this.citronTransitionHandle?.dispose();
    this.citronTransitionHandle = null;
    this.citronTransitionScene = null;

    this.postprocessing.dispose();
    this.controls.dispose();
    this.scene.dispose();
    this.renderer.dispose();
  }
}

new Inkblot();
