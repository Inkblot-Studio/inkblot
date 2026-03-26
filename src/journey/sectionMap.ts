import { clamp } from '@/utils/math';

export const JOURNEY_SECTION_COUNT = 6;

/** Default desktop weights (sum arbitrary; normalized in resolve). */
/** Longer acts: flower, hero, portfolio, water, lab, closing flower. */
const JOURNEY_WEIGHTS_DEFAULT = [0.18, 0.16, 0.24, 0.18, 0.12, 0.12] as const;

export interface JourneyState {
  /** 0..5 */
  readonly section: number;
  /** Progress within current section [0, 1] */
  readonly localT: number;
  /** Global scroll [0, 1] */
  readonly globalT: number;
  /** Normalized start of current section on global timeline */
  readonly sectionStart: number;
  /** Normalized end of current section on global timeline */
  readonly sectionEnd: number;
}

function buildCumulative(weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const cumulative: number[] = [0];
  let acc = 0;
  for (const w of weights) {
    acc += w / sum;
    cumulative.push(acc);
  }
  cumulative[cumulative.length - 1] = 1;
  return cumulative;
}

/** Cumulative global stops: `[0, endS0, endS1, …, 1]` — length `JOURNEY_SECTION_COUNT + 1`. */
export function journeyCumulativeStops(
  weights: readonly number[] = getJourneySectionWeights(),
): number[] {
  return buildCumulative(weights);
}

/** Tunable weights: mobile and reduced-motion get alternate pacing. */
export function getJourneySectionWeights(): readonly number[] {
  if (typeof window === 'undefined') {
    return JOURNEY_WEIGHTS_DEFAULT;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  }
  if (window.matchMedia('(max-width: 768px)').matches) {
    return [0.16, 0.14, 0.22, 0.17, 0.15, 0.16];
  }
  return JOURNEY_WEIGHTS_DEFAULT;
}

/**
 * Map global scroll progress [0,1] to section index and local progress.
 */
export function resolveJourney(
  globalT: number,
  weights: readonly number[] = getJourneySectionWeights(),
): JourneyState {
  const g = clamp(globalT, 0, 1);
  const cumulative = buildCumulative(weights);
  let section = JOURNEY_SECTION_COUNT - 1;
  for (let i = 0; i < JOURNEY_SECTION_COUNT; i++) {
    if (g < cumulative[i + 1] - 1e-9) {
      section = i;
      break;
    }
  }
  const start = cumulative[section];
  const end = cumulative[section + 1];
  const span = Math.max(end - start, 1e-6);
  const localT = clamp((g - start) / span, 0, 1);
  return {
    section,
    localT,
    globalT: g,
    sectionStart: start,
    sectionEnd: end,
  };
}
