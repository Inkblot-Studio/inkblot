import { createStompShowcaseScene } from './createStompShowcaseScene';
import type { BloomExperienceScene, BloomSceneFactoryContext } from '../bloom-runtime/bloomExperienceTypes';

export function createStompShowcaseBloomExperience(ctx: BloomSceneFactoryContext): BloomExperienceScene {
  const handle = createStompShowcaseScene({ renderer: ctx.renderer, lod: ctx.lod });
  return {
    id: 'stomp',
    root: handle.root,
    cameraMode: 'showcaseOrbit',
    update(delta: number, elapsed: number) {
      handle.update(delta, elapsed);
    },
    dispose() {
      handle.dispose();
    },
  };
}
