import { bloomExperienceRegistry } from './bloomExperienceRegistry';
import { createFlowerBloomExperience } from './flowerBloomExperience';
import { createStompShowcaseBloomExperience } from '../bloom-showcase/stompShowcaseBloomExperience';
import {
  createParticleForestDemoExperience,
  createParticleInteriorDemoExperience,
} from '../bloom-particle-env/examples';

let done = false;

/** Register built-in experiences (`flower`, `stomp`, particle demos). Safe to call multiple times. */
export function registerDefaultBloomExperiences(): void {
  if (done) return;
  done = true;
  bloomExperienceRegistry.register('flower', (ctx) => createFlowerBloomExperience(ctx));
  bloomExperienceRegistry.register('stomp', (ctx) => createStompShowcaseBloomExperience(ctx));
  bloomExperienceRegistry.register('particleforest', (ctx) => createParticleForestDemoExperience(ctx));
  bloomExperienceRegistry.register('particleinterior', (ctx) => createParticleInteriorDemoExperience(ctx));
}
