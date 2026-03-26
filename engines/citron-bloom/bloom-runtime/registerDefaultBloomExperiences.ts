import { bloomExperienceRegistry } from './bloomExperienceRegistry';
import { createFlowerBloomExperience } from './flowerBloomExperience';
import { createStompShowcaseBloomExperience } from '../bloom-showcase/stompShowcaseBloomExperience';

let done = false;

/** Register built-in experiences (`flower`, `stomp`). Safe to call multiple times. */
export function registerDefaultBloomExperiences(): void {
  if (done) return;
  done = true;
  bloomExperienceRegistry.register('flower', (ctx) => createFlowerBloomExperience(ctx));
  bloomExperienceRegistry.register('stomp', (ctx) => createStompShowcaseBloomExperience(ctx));
}
