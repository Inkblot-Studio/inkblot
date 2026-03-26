import { clamp, smootherstep } from '@/utils/math';
import {
  createCitronBloomScene,
  type CitronBloomSceneHandle,
} from '../examples/createCitronBloomScene';
import type { BloomSceneFactoryContext, BloomExperienceScene } from './bloomExperienceTypes';

/** Same curve as flower bloom: soft at top of page, most change mid–scroll. */
export function bloomScrollDrive(scroll01: number): number {
  const s = clamp(scroll01, 0, 1);
  return Math.pow(s, 2.65);
}

function wrapFlowerHandle(handle: CitronBloomSceneHandle): BloomExperienceScene {
  return {
    id: 'flower',
    root: handle.root,
    cameraMode: 'delicate',
    update(delta: number, elapsed: number) {
      handle.update(delta, elapsed);
    },
    dispose() {
      handle.dispose();
    },
    setBloomFromScroll(scroll01: number) {
      const s = clamp(scroll01, 0, 1);
      const drive = bloomScrollDrive(s);
      const open = smootherstep(0.06, 0.98, drive);
      const main = Math.pow(open, 0.78);
      const branch = Math.pow(smootherstep(0.1, 0.98, drive), 0.6);
      const bud = Math.pow(smootherstep(0.04, 0.96, drive), 0.64);
      handle.setBloomTarget(main, branch, bud);
    },
  };
}

export function createFlowerBloomExperience(ctx: BloomSceneFactoryContext): BloomExperienceScene {
  const handle = createCitronBloomScene({ lod: ctx.lod });
  handle.root.position.set(0, -0.35, 0);
  return wrapFlowerHandle(handle);
}
