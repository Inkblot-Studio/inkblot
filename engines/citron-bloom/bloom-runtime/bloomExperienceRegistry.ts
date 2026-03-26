import type { Scene, WebGLRenderer } from 'three';
import type { BloomLod } from '../bloom-core/types';
import type {
  BloomExperienceScene,
  BloomSceneFactory,
  BloomSceneFactoryContext,
} from './bloomExperienceTypes';

/**
 * Host any number of bloom experiences by id. Only one active root is attached to the scene at a time.
 */
export class BloomExperienceRegistry {
  private readonly factories = new Map<string, BloomSceneFactory>();
  private active: BloomExperienceScene | null = null;

  register(id: string, factory: BloomSceneFactory): void {
    if (this.factories.has(id)) {
      console.warn(`[Citron Bloom] Overwriting experience factory: ${id}`);
    }
    this.factories.set(id, factory);
  }

  unregister(id: string): void {
    this.factories.delete(id);
  }

  listIds(): string[] {
    return [...this.factories.keys()];
  }

  /**
   * Disposes previous experience (if any), builds the new one, and adds `root` to `scene`.
   */
  activate(
    id: string,
    scene: Scene,
    renderer: WebGLRenderer,
    lod: BloomLod,
  ): BloomExperienceScene {
    const factory = this.factories.get(id);
    if (!factory) {
      throw new Error(
        `[Citron Bloom] Unknown experience "${id}". Registered: ${this.listIds().join(', ') || '(none)'}`,
      );
    }

    this.disposeActive();

    const ctx: BloomSceneFactoryContext = { renderer, lod };
    const next = factory(ctx);
    scene.add(next.root);
    this.active = next;
    return next;
  }

  disposeActive(): void {
    if (!this.active) return;
    this.active.root.removeFromParent();
    this.active.dispose();
    this.active = null;
  }

  getActive(): BloomExperienceScene | null {
    return this.active;
  }
}

/** Shared registry — app and tests can register additional experiences at startup. */
export const bloomExperienceRegistry = new BloomExperienceRegistry();
