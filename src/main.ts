import { Clock } from 'three';
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
import { smoothstep } from '@/utils/math';
import { CitronBloomComposer } from '@citron-bloom-engine/bloom-postprocess/citronBloomComposer';
import { bloomScrollDrive } from '@citron-bloom-engine/bloom-runtime/flowerBloomExperience';
import { bloomExperienceRegistry } from '@citron-bloom-engine/bloom-runtime/bloomExperienceRegistry';
import { BLOOM_LOD_PROFILES, type BloomLod } from '@citron-bloom-engine/bloom-core/types';
import { initCookieConsent } from '@/ui/cookieConsent';
import { initNavChrome, updateNavChrome } from '@/ui/navChrome';
import { PORTFOLIO_PROJECTS } from '@/data/portfolioProjects';
import { journeyCumulativeStops, resolveJourney } from '@/journey/sectionMap';
import {
  createJourneyWebScene,
  setMeshTreeOpacity,
  syncJourneyFog,
  type JourneyWebSceneHandle,
} from '@/journey/journeyWebScene';
import { initPortfolioChat } from '@/ui/portfolioChatStub';

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
  private journeyWeb: JourneyWebSceneHandle | null = null;
  private prevJourneySection: number | null = null;

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
    document.body.classList.toggle(
      'journey-flower-active',
      useCitronBloom && this.bloomExperienceId === 'flower',
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
      this.camera.setDampFactor(
        this.bloomExperienceId === 'flower' ? 12.5 : 1.42,
      );
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
      this.postprocessing.init(
        this.renderer.instance,
        this.scene.instance,
        this.camera.instance,
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

    if (this.useCitronBloom && this.bloomExperienceId === 'flower') {
      this.journeyWeb = createJourneyWebScene(PORTFOLIO_PROJECTS);
      this.scene.instance.add(this.journeyWeb.root);
      initPortfolioChat();
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

    if (this.useCitronBloom && this.bloomExperienceId === 'flower') {
      const journey = resolveJourney(this.scrollSystem.progress);
      document.documentElement.style.setProperty('--journey-section', String(journey.section));
      document.documentElement.style.setProperty('--journey-local', String(journey.localT));
      document.body.dataset.journeySection = String(journey.section);
      const stops = journeyCumulativeStops();
      const s0End = stops[1];
      const s1End = stops[2];
      const g = journey.globalT;

      if (this.prevJourneySection !== null && this.prevJourneySection !== journey.section) {
        document.body.classList.remove('journey-boundary-flash');
        void document.body.offsetWidth;
        document.body.classList.add('journey-boundary-flash');
        window.setTimeout(() => document.body.classList.remove('journey-boundary-flash'), 700);
      }
      this.prevJourneySection = journey.section;

      const edge = Math.min(journey.localT, 1 - journey.localT);
      document.documentElement.style.setProperty(
        '--journey-edge',
        String(Math.min(1, Math.pow(edge * 2.4, 1.15))),
      );

      let heroOpacity = 0;
      if (journey.section === 1) {
        const fadeIn = smoothstep(s0End + 0.004, s0End + 0.058, g);
        const fadeOut = 1 - smoothstep(s1End - 0.055, s1End + 0.04, g);
        heroOpacity = Math.min(fadeIn, fadeOut);
      }
      document.documentElement.style.setProperty('--journey-hero-ui', String(heroOpacity));

      const bloomCss =
        journey.section === 0
          ? bloomScrollDrive(journey.localT)
          : journey.section === 5
            ? bloomScrollDrive(1 - journey.localT)
            : 1;
      document.documentElement.style.setProperty('--bloom-scroll', String(bloomCss));

      this.animationSystem.setJourneyFlower({
        section: journey.section,
        localT: journey.localT,
      });
      syncJourneyFog(this.scene.instance, journey.section);

      if (this.journeyWeb) {
        this.journeyWeb.update({
          journey,
          renderer: this.renderer.instance,
          elapsed,
          heroOpacity,
        });
      }

      const flowerRoot = bloomExperienceRegistry.getActive()?.root ?? null;
      if (flowerRoot) {
        if (journey.section === 0) {
          flowerRoot.visible = true;
          const fo = 1 - smoothstep(s0End - 0.125, s0End - 0.012, g);
          setMeshTreeOpacity(flowerRoot, fo);
        } else if (journey.section === 5) {
          flowerRoot.visible = true;
          setMeshTreeOpacity(flowerRoot, 1);
        } else {
          flowerRoot.visible = false;
        }
      }

      let drive = 1;
      if (journey.section === 0) drive = bloomScrollDrive(journey.localT);
      else if (journey.section === 5) drive = bloomScrollDrive(1 - journey.localT);
      this.citronBloomComponent?.applyBloomDrive(drive);
    } else if (this.useCitronBloom) {
      this.camera.setDampFactor(1.42);
      this.animationSystem.setJourneyFlower(null);
      document.documentElement.style.removeProperty('--journey-section');
      document.documentElement.style.removeProperty('--journey-local');
      document.documentElement.style.removeProperty('--journey-hero-ui');
      document.documentElement.style.removeProperty('--journey-edge');
      this.prevJourneySection = null;
      delete document.body.dataset.journeySection;
      syncJourneyFog(this.scene.instance, -1);
      this.citronBloomComponent?.setBloomFromScroll(this.scrollSystem.progress);
      document.documentElement.style.setProperty(
        '--bloom-scroll',
        String(this.scrollSystem.progress),
      );
    }

    this.animationSystem.update(this.frameContext);
    this.audioSystem.update(this.frameContext);
    updateNavChrome(this.audioSystem, this.scrollSystem, elapsed);

    if (
      this.citronBloomComponent &&
      this.scrollSystem &&
      !(this.useCitronBloom && this.bloomExperienceId === 'flower')
    ) {
      this.citronBloomComponent.setBloomFromScroll(this.scrollSystem.progress);
    }

    for (const component of this.components) {
      component.update(this.frameContext);
    }

    if (this.sections3DComponent && this.scrollSystem) {
      this.sections3DComponent.setInteractionValues(this.scrollSystem.progress);
    }

    if (this.useCitronBloom && this.bloomExperienceId !== 'flower') {
      const p = this.scrollSystem.progress;
      document.documentElement.style.setProperty('--bloom-scroll', String(p));
    }

    if (this.fluidFlowerComponent && this.scrollSystem && this.audioSystem) {
      this.fluidFlowerComponent.setInteractionValues(
        this.scrollSystem.progress,
        this.audioSystem.lowFrequencyVolume,
      );
    }

    this.camera.update(delta);
    this.controls.update();

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

    this.journeyWeb?.root.removeFromParent();
    this.journeyWeb?.dispose();
    this.journeyWeb = null;

    this.postprocessing.dispose();
    this.controls.dispose();
    this.scene.dispose();
    this.renderer.dispose();
  }
}

new Inkblot();
