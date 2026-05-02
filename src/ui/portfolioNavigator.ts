import { clamp } from '@/utils/math';
import {
  getJourneySectionWeights,
  journeyCumulativeStops,
} from '@/journey/sectionMap';
import { exitWorkLock, isWorkLocked } from '@/navigation/workSectionLock';

type ScrollToProgress = (progress01: number) => void;

let scrollImpl: ScrollToProgress | null = null;

/** Called from the runtime once `ScrollSystem` exists (flower journey scroll). */
export function registerPortfolioScrollNavigator(fn: ScrollToProgress): void {
  scrollImpl = fn;
}

export function clearPortfolioScrollNavigator(): void {
  scrollImpl = null;
}

function progressAtSectionStart(section: number, inset = 0.035): number {
  const stops = journeyCumulativeStops(getJourneySectionWeights());
  const s = Math.floor(clamp(section, 0, 1));
  return clamp((stops[s] ?? 0) + inset, 0, 0.996);
}

/** Top nav: journey start (bloom / index). Releases work lock if engaged. */
export function navScrollToJourneyIndex(): void {
  if (isWorkLocked()) {
    exitWorkLock();
    return;
  }
  scrollImpl?.(0.02);
}

/** Top nav: work / portfolio section. While locked, smooth-scroll internal tiles to top. */
export function navScrollToWork(): void {
  if (isWorkLocked()) {
    const inner = document.querySelector<HTMLElement>('.work-section__scroll');
    if (inner) inner.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  scrollImpl?.(progressAtSectionStart(1, 0.05));
}

/**
 * Lightweight command parser (Active Theory–style “chat navigates the site”).
 * Extend with your API when `VITE_PORTFOLIO_CHAT_URL` is set.
 */
export function handlePortfolioChatQuery(raw: string): { reply: string; scrolled: boolean } {
  const q = raw.trim().toLowerCase();
  if (!q) {
    return { reply: '', scrolled: false };
  }

  if (!scrollImpl) {
    return {
      reply: 'Scene is still loading — try again in a moment.',
      scrolled: false,
    };
  }

  const exitLockIfFlowerNav = (): boolean => {
    if (isWorkLocked()) {
      exitWorkLock();
      return true;
    }
    return false;
  };

  if (/^(hi|hello|hey)\b/.test(q)) {
    return {
      reply:
        'You can say: “flower” or “work”. Try “help” for more.',
      scrolled: false,
    };
  }

  if (/\b(help|commands|\?)\b/.test(q) || /what can (you|i)/.test(q)) {
    return {
      reply:
        'Destinations: flower / bloom · work / portfolio. Orbit showcase: ?experience=stomp',
      scrolled: false,
    };
  }

  if (/\b(top|home|start over)\b/.test(q)) {
    if (exitLockIfFlowerNav()) {
      return { reply: 'Back to the bloom…', scrolled: true };
    }
    scrollImpl(0.02);
    return { reply: 'Back to the top of the journey.', scrolled: true };
  }

  if (/\b(flower|bloom|opening)\b/.test(q)) {
    if (exitLockIfFlowerNav()) {
      return { reply: 'Moving to the bloom…', scrolled: true };
    }
    scrollImpl(progressAtSectionStart(0, 0.02));
    return { reply: 'Moving to the bloom…', scrolled: true };
  }

  if (/\b(work|portfolio|partners?|clients?|carousel|logo|glass|hero)\b/.test(q)) {
    if (isWorkLocked()) {
      return { reply: 'You’re already in the work carousel — scroll the panel.', scrolled: false };
    }
    scrollImpl(progressAtSectionStart(1, 0.05));
    return { reply: 'Opening the work section…', scrolled: true };
  }

  if (/\b(stomp|showcase|orbit)\b/.test(q)) {
    return {
      reply:
        'That experience uses ?experience=stomp — add it to the URL (Citron Bloom mode) for the orbit showcase.',
      scrolled: false,
    };
  }

  return {
    reply:
      'I didn’t catch a destination. Try “flower” or “work”, or “help”.',
    scrolled: false,
  };
}
