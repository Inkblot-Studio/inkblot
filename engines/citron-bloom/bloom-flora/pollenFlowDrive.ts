import { smoothstep } from '../bloom-core/math';

export interface PollenFlowState {
  smoothGate: number;
  smoothAlong: number;
  /** Slower, wider scroll band so opacity eases in at the crown before motion reads loud */
  smoothOpacityAlong: number;
  /** Smoothed spread sent to GPU */
  smoothSpread: number;
  /** Act-local progress last frame — detect scroll-up vs scroll-down */
  prevJourneyP: number;
  /** Ratchet shaped(p) while scrolling down; gate01 still multiplies so top-of-page fade works */
  scrollSpreadEnvelopePeak: number;
}

export interface PollenFlowResult {
  opacityTarget: number;
  burstTarget: number;
  driftScale: number;
  ambientScale: number;
  /** 0 = imploded at bud core, 1 = full halo (shrinks only when scrolling up in act) */
  spread01: number;
}

export function createPollenFlowState(): PollenFlowState {
  return {
    smoothGate: 0,
    smoothAlong: 0,
    smoothOpacityAlong: 0,
    smoothSpread: 0,
    prevJourneyP: -1,
    scrollSpreadEnvelopePeak: 0,
  };
}

const GATE_SMOOTH_RISE = 5.5;
const GATE_SMOOTH_FALL = 1.55;
const ALONG_SMOOTH_RISE = 3.9;
const ALONG_SMOOTH_FALL = 1.35;
const ALONG_OPACITY_RISE = 2.25;
const ALONG_OPACITY_FALL = 0.95;
/** Spread eases toward ratcheted target (same rate up or down) */
const SPREAD_SMOOTH = 4.6;

function expSmoothK(dt: number, lambda: number): number {
  return 1 - Math.exp(-lambda * Math.max(dt, 0.0001));
}

/**
 * Scroll/journey + bloom → smooth motion/opacity targets (no binary gates on drift/ambient).
 * Asymmetric smoothing: fast when opening, slow when closing (top scroll / section exit).
 */
export function drivePollenFlow(
  state: PollenFlowState,
  delta: number,
  gate01: number,
  journeyProgress01: number,
  bloom01: number,
): PollenFlowResult {
  const p = Math.max(0, Math.min(1, journeyProgress01));
  const dt = Math.max(delta, 0.0001);

  const errG = gate01 - state.smoothGate;
  const kG = expSmoothK(dt, errG > 0 ? GATE_SMOOTH_RISE : GATE_SMOOTH_FALL);
  state.smoothGate += errG * kG;

  const along = smoothstep(0.0, 0.48, p);
  const errA = along - state.smoothAlong;
  const kA = expSmoothK(dt, errA > 0 ? ALONG_SMOOTH_RISE : ALONG_SMOOTH_FALL);
  state.smoothAlong += errA * kA;

  const opacityAlong = smoothstep(0.0, 0.52, p);
  const errAo = opacityAlong - state.smoothOpacityAlong;
  const kAo = expSmoothK(dt, errAo > 0 ? ALONG_OPACITY_RISE : ALONG_OPACITY_FALL);
  state.smoothOpacityAlong += errAo * kAo;

  const shaped = smoothstep(0.04, 0.92, p);
  const advancing = state.prevJourneyP < 0 || p >= state.prevJourneyP - 1e-6;
  if (advancing) {
    state.scrollSpreadEnvelopePeak = Math.max(state.scrollSpreadEnvelopePeak, shaped);
  } else {
    state.scrollSpreadEnvelopePeak = shaped;
  }
  state.prevJourneyP = p;

  const targetSpread = gate01 * state.scrollSpreadEnvelopePeak;
  const kSp = expSmoothK(dt, SPREAD_SMOOTH);
  state.smoothSpread += (targetSpread - state.smoothSpread) * kSp;

  const depth = 0.46 + 0.54 * p;
  /** Opacity stays readable even when phase bloom is still low; motion scales more with bloom. */
  const opacityBloom = 0.58 + 0.42 * bloom01;
  const motionBloom = 0.32 + 0.68 * bloom01;
  const spread = state.smoothSpread;
  const motionCore =
    state.smoothGate * motionBloom * state.smoothAlong * depth * (0.15 + 0.85 * spread);
  const opacityCore =
    state.smoothGate * opacityBloom * state.smoothOpacityAlong * (0.42 + 0.58 * depth);
  const softVis = opacityCore * (0.78 + 0.22 * opacityCore);

  return {
    opacityTarget: Math.min(0.94, softVis * 0.96),
    burstTarget: motionCore * 0.88,
    driftScale: motionCore * (0.95 + 0.62 * p) * (0.2 + 0.8 * spread),
    ambientScale: motionCore * 0.85 * (0.2 + 0.8 * spread),
    spread01: spread,
  };
}
