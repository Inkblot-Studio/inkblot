/** Dispatched when the loading shell begins its exit (ties 3D intro to the handoff). */
export const INK_BLOT_POST_LOAD_INTRO = 'inkblot:postload-intro-start' as const;

/** Duration of the flower “show” (ms); envelope is sin(π·t) over this window. */
export const POST_LOAD_INTRO_MS = 4200;
