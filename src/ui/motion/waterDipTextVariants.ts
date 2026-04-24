import type { Variants } from 'framer-motion';

const easeOutDamp = [0.22, 0.8, 0.28, 1] as const;
const easeInDip = [0.42, 0, 0.28, 1] as const;

/** Per-glyph: `rank` 0 = first to “dip” in (the last letter of the word, then work left) */
export type WaterDipCharCustom = { rank: number };

export function makeWaterDipCharVariants(
  options: { stagger: number; reduce: boolean; startDelay: number },
): Variants {
  const { stagger, reduce, startDelay } = options;
  if (reduce) {
    return {
      hidden: { opacity: 0 },
      show: (custom: WaterDipCharCustom) => ({
        opacity: 1,
        transition: {
          delay: startDelay + custom.rank * stagger,
          duration: 0.18,
        },
      }),
    };
  }
  return {
    hidden: {
      y: '0.5em',
      opacity: 0.08,
      rotateX: 64,
      skewX: -5,
      filter: 'blur(6px) saturate(0.7) brightness(0.92)',
    },
    show: (custom: WaterDipCharCustom) => ({
      y: 0,
      opacity: 1,
      rotateX: 0,
      skewX: 0,
      filter: 'blur(0) saturate(1) brightness(1)',
      textShadow: '0 0 0 transparent',
      transition: {
        delay: startDelay + custom.rank * stagger,
        duration: 0.7,
        ease: easeOutDamp,
      },
    }),
  };
}

/**
 * Same “water dip” in/out for inline links: enter matches {@link makeWaterDipCharVariants}, exit
 * re-dissolves along the same rank order (end-of-word first) with blur and drop — avoids sliding on layout change.
 */
export function makeWaterDipCharEnterExitVariants(
  options: { stagger: number; reduce: boolean; startDelay: number; exitStagger?: number; exitDuration?: number },
): Variants {
  const { stagger, reduce, startDelay, exitStagger, exitDuration = 0.12 } = options;
  const exitSt = exitStagger ?? stagger * 0.82;
  if (reduce) {
    return {
      hidden: { opacity: 0 },
      show: (custom: WaterDipCharCustom) => ({
        opacity: 1,
        transition: {
          delay: startDelay + custom.rank * stagger * 0.4,
          duration: 0.16,
        },
      }),
      exit: (custom: WaterDipCharCustom) => ({
        opacity: 0,
        transition: {
          delay: (custom as WaterDipCharCustom).rank * exitSt * 0.32,
          duration: 0.1,
        },
      }),
    };
  }
  return {
    hidden: {
      y: '0.35em',
      opacity: 0,
      rotateX: 18,
      skewX: -2,
    },
    show: (custom: WaterDipCharCustom) => ({
      y: 0,
      opacity: 1,
      rotateX: 0,
      skewX: 0,
      transition: {
        delay: startDelay + custom.rank * stagger,
        duration: 0.22,
        ease: easeOutDamp,
      },
    }),
    exit: (custom: WaterDipCharCustom) => ({
      y: '0.2em',
      opacity: 0,
      rotateX: 10,
      skewX: -1.5,
      transition: {
        delay: (custom as WaterDipCharCustom).rank * exitSt,
        duration: exitDuration,
        ease: easeInDip,
      },
    }),
  };
}
