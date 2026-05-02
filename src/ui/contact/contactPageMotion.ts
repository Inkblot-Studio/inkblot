import type { Variants } from 'framer-motion';

const EASE_UP = [0.16, 1, 0.3, 1] as const;
const EASE_DOWN = [0.4, 0, 0.2, 1] as const;

/**
 * Full overlay: scales in from slightly enlarged (bloom-expand feel). When `anchorToTop`,
 * no `y` on `main` -- transforms stack with top-aligned content and clip under the z-50 nav.
 */
export function contactPageSky(reduce: boolean, anchorToTop = false): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.2 } },
    };
  }
  if (anchorToTop) {
    return {
      initial: { opacity: 0, scale: 1.025 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, ease: EASE_UP },
      },
      exit: {
        opacity: 0,
        scale: 0.975,
        transition: { delay: 0.06, duration: 0.26, ease: EASE_DOWN },
      },
    };
  }
  return {
    initial: { opacity: 0, y: 16, scale: 1.025 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: EASE_UP },
    },
    exit: {
      opacity: 0,
      y: 10,
      scale: 0.975,
      transition: { delay: 0.06, duration: 0.28, ease: EASE_DOWN },
    },
  };
}

/** Mist condenses inward from a slightly larger scale, then dissolves outward on exit. */
export function contactPageMist(reduce: boolean): Variants {
  if (reduce) {
    return { initial: { opacity: 0 }, animate: { opacity: 0 }, exit: { opacity: 0 } };
  }
  return {
    initial: { opacity: 0, scale: 1.1 },
    animate: {
      opacity: 0.3,
      scale: 1,
      transition: { duration: 0.65, ease: EASE_UP },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.2, ease: EASE_DOWN },
    },
  };
}

/**
 * Second "layer" -- content rises into the shell after the backdrop lands.
 * y offset is safe on the inner div regardless of anchorToTop; only the root main clips under nav.
 * Exit retreats upward so the content leaves before the sky closes.
 */
export function contactPageInner(reduce: boolean, anchorToTop = false): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.15 } },
    };
  }
  const yIn = anchorToTop ? 16 : 22;
  const yOut = anchorToTop ? -10 : -14;
  return {
    initial: { opacity: 0, y: yIn },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.12, duration: 0.52, ease: EASE_UP },
    },
    exit: {
      opacity: 0,
      y: yOut,
      transition: { duration: 0.18, ease: EASE_DOWN },
    },
  };
}
