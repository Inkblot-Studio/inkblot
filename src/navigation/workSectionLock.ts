/**
 * Work-section lock: when the user scrolls past the end of the flower scene,
 * the work section auto-snaps fully into view, page scroll is intercepted, and
 * only the work section's internal scroll responds. The lock releases on
 * Index nav click (or programmatic exitWorkLock()).
 *
 * State machine: idle → entering → locked → exiting → idle.
 */

type LockState = 'idle' | 'entering' | 'locked' | 'exiting';

let state: LockState = 'idle';
let wheelHandler: ((e: WheelEvent) => void) | null = null;
let touchMoveHandler: ((e: TouchEvent) => void) | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let lastExitMs = 0;
let scrollAnimationVersion = 0;

const COOLDOWN_AFTER_EXIT_MS = 900;
const ENTER_DURATION_MS = 850;
const EXIT_DURATION_MS = 700;

/** Global progress to land at when locked (well into section 1, workSlide=1). */
const ENTER_TARGET_PROGRESS = 0.62;
/** Global progress to return to when exiting (start of flower). */
const EXIT_TARGET_PROGRESS = 0.02;

const SCROLL_INSIDE_SELECTOR = '.work-section__scroll';

export function workLockState(): LockState {
  return state;
}

export function isWorkLocked(): boolean {
  return state === 'locked' || state === 'entering';
}

export function isWorkLockBusy(): boolean {
  return state === 'entering' || state === 'exiting';
}

/** Call from inkblotApp tick when threshold reached. Idempotent. */
export function autoEnterWorkLock(): void {
  if (state !== 'idle') return;
  if (performance.now() - lastExitMs < COOLDOWN_AFTER_EXIT_MS) return;

  state = 'entering';
  document.body.classList.add('work-section-locking');
  installScrollLock();

  const targetY = progressToScrollY(ENTER_TARGET_PROGRESS);
  const version = nextScrollAnimationVersion();
  smoothScrollTo(targetY, ENTER_DURATION_MS, () => isCurrentScrollAnimation(version), () => {
    if (state !== 'entering') return;
    state = 'locked';
    document.body.classList.remove('work-section-locking');
    document.body.classList.add('work-section-locked');
  });
}

/** Triggered by Index nav click (or "back" button on contact page). */
export function exitWorkLock(): void {
  if (state !== 'locked') {
    if (state === 'entering') {
      state = 'exiting';
      document.body.classList.remove('work-section-locking', 'work-section-locked');
    } else {
      return;
    }
  } else {
    state = 'exiting';
    document.body.classList.remove('work-section-locked');
  }

  const inner = document.querySelector<HTMLElement>(SCROLL_INSIDE_SELECTOR);
  if (inner) inner.scrollTop = 0;

  const targetY = progressToScrollY(EXIT_TARGET_PROGRESS);
  const version = nextScrollAnimationVersion();
  smoothScrollTo(targetY, EXIT_DURATION_MS, () => isCurrentScrollAnimation(version), () => {
    if (state !== 'exiting') return;
    uninstallScrollLock();
    state = 'idle';
    lastExitMs = performance.now();
  });
}

function progressToScrollY(progress: number): number {
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.max(0, Math.min(max, progress * max));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function nextScrollAnimationVersion(): number {
  scrollAnimationVersion += 1;
  return scrollAnimationVersion;
}

function isCurrentScrollAnimation(version: number): boolean {
  return version === scrollAnimationVersion;
}

function smoothScrollTo(
  targetY: number,
  duration: number,
  shouldContinue: () => boolean,
  onComplete?: () => void,
): void {
  if (!shouldContinue()) {
    return;
  }
  const startY = window.scrollY;
  const dist = targetY - startY;
  if (Math.abs(dist) < 1) {
    if (shouldContinue()) onComplete?.();
    return;
  }
  const t0 = performance.now();
  const tick = () => {
    if (!shouldContinue()) {
      return;
    }
    const elapsed = performance.now() - t0;
    const t = Math.min(1, elapsed / duration);
    const eased = easeInOutCubic(t);
    const y = startY + dist * eased;
    window.scrollTo(0, y);
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      window.scrollTo(0, targetY);
      if (shouldContinue()) onComplete?.();
    }
  };
  requestAnimationFrame(tick);
}

function installScrollLock(): void {
  if (wheelHandler) return;

  const isInsideWorkScroll = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return !!target.closest(SCROLL_INSIDE_SELECTOR);
  };

  wheelHandler = (e: WheelEvent) => {
    if (isInsideWorkScroll(e.target)) return;
    e.preventDefault();
  };

  touchMoveHandler = (e: TouchEvent) => {
    if (isInsideWorkScroll(e.target)) return;
    e.preventDefault();
  };

  keyHandler = (e: KeyboardEvent) => {
    const tgt = e.target as HTMLElement | null;
    if (tgt?.tagName === 'INPUT' || tgt?.tagName === 'TEXTAREA') return;
    if (isInsideWorkScroll(e.target)) return;
    const blocked = new Set([
      'ArrowDown',
      'ArrowUp',
      'PageDown',
      'PageUp',
      'Space',
      'End',
      'Home',
    ]);
    if (blocked.has(e.code)) e.preventDefault();
  };

  window.addEventListener('wheel', wheelHandler, { passive: false });
  window.addEventListener('touchmove', touchMoveHandler, { passive: false });
  window.addEventListener('keydown', keyHandler, { passive: false });
}

function uninstallScrollLock(): void {
  if (wheelHandler) window.removeEventListener('wheel', wheelHandler);
  if (touchMoveHandler) window.removeEventListener('touchmove', touchMoveHandler);
  if (keyHandler) window.removeEventListener('keydown', keyHandler);
  wheelHandler = null;
  touchMoveHandler = null;
  keyHandler = null;
}
