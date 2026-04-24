import type { Variants } from 'framer-motion';

const EASE_UP = [0.16, 1, 0.3, 1] as const;
const EASE_DOWN = [0.4, 0, 0.2, 1] as const;

/**
 * Full overlay: minimal fade; optional nudge. When `anchorToTop`, no `y` on `main` —
 * transforms here stack with top-aligned content and read as clipped under the z-50 nav.
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
      initial: { opacity: 0, y: 0 },
      animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.24, ease: EASE_UP },
      },
      exit: {
        opacity: 0,
        y: 0,
        transition: { duration: 0.2, ease: EASE_DOWN },
      },
    };
  }
  return {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: EASE_UP },
    },
    exit: {
      opacity: 0,
      y: 10,
      transition: { duration: 0.32, ease: EASE_DOWN },
    },
  };
}

export function contactPageMist(reduce: boolean): Variants {
  if (reduce) {
    return { initial: { opacity: 0 }, animate: { opacity: 0 }, exit: { opacity: 0 } };
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 0.2, transition: { delay: 0, duration: 0.28, ease: EASE_UP } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: EASE_DOWN } },
  };
}

/**
 * Second “layer” — content eases in after the shell.
 * When `anchorToTop`, skip vertical parallax so the new-business layout doesn’t read as floating.
 */
export function contactPageInner(reduce: boolean, anchorToTop = false): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.2 } },
    };
  }
  if (anchorToTop) {
    return {
      initial: { opacity: 0, y: 0 },
      animate: {
        opacity: 1,
        y: 0,
        transition: { delay: 0.01, duration: 0.22, ease: EASE_UP },
      },
    };
  }
  return {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.04, duration: 0.5, ease: EASE_UP },
    },
  };
}
