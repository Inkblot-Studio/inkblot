import type { AudioSystem } from '@/systems/audioSystem';
import type { ScrollSystem } from '@/systems/scrollSystem';
import { navScrollToJourneyIndex, navScrollToWork } from '@/ui/portfolioNavigator';

let lastMiniPlayerSig = '';

function buildMiniTrackLine(audio: AudioSystem): string {
  const label = audio.getCurrentTrackLabel().trim();
  const artist = audio.getCurrentTrackArtist().trim();
  if (!label && !artist) return '—';
  if (!artist) return label;
  if (!label) return artist;
  return `${label}\u2009\u2013\u2009${artist}`;
}

function appendMarqueeSeg(track: HTMLElement, text: string, ariaHidden: boolean): void {
  const seg = document.createElement('span');
  seg.className = 'nav-mini-mq-seg';
  seg.textContent = text;
  if (ariaHidden) {
    seg.setAttribute('aria-hidden', 'true');
  }
  track.appendChild(seg);
}

function fillMarqueeRow(
  wrap: HTMLElement,
  view: HTMLElement,
  track: HTMLElement,
  line: string,
): void {
  wrap.classList.remove('nav-mini-mq-active');
  track.style.removeProperty('--mq-dur');
  track.innerHTML = '';

  appendMarqueeSeg(track, line, false);

  requestAnimationFrame(() => {
    const vw = view.clientWidth;
    const overflow = track.scrollWidth > vw + 2;
    if (overflow) {
      appendMarqueeSeg(track, line, true);
      const dur = Math.min(38, Math.max(8, (track.scrollWidth / Math.max(vw, 1)) * 5));
      track.style.setProperty('--mq-dur', `${dur}s`);
      wrap.classList.add('nav-mini-mq-active');
    }
  });
}

function updateMiniPlayerCredits(audio: AudioSystem): void {
  const line = buildMiniTrackLine(audio);
  if (line === lastMiniPlayerSig) return;
  lastMiniPlayerSig = line;

  const navMini = document.getElementById('nav-mini');
  if (navMini) {
    navMini.setAttribute('aria-label', `Now playing: ${line}`);
  }

  const titleView = document.getElementById('nav-mini-title-view');
  const titleTrack = document.getElementById('nav-mini-title-track');
  const wrapTitle = document.getElementById('nav-mini-wrap-title');
  if (!titleView || !titleTrack || !wrapTitle) {
    return;
  }

  fillMarqueeRow(wrapTitle, titleView, titleTrack, line);
}
let petalPulseSmoothed = 0.26;

let drawerFocusReturn: HTMLElement | null = null;

function initSiteDrawer(): void {
  const root = document.getElementById('site-drawer');
  const panel = document.getElementById('site-drawer-panel') as HTMLDivElement | null;
  const openBtn = document.getElementById('site-drawer-open');
  const backdrop = document.getElementById('site-drawer-backdrop');
  if (!root || !panel || !openBtn) return;

  const linkIndex = document.getElementById('drawer-link-index');
  const linkWork = document.getElementById('drawer-link-work');

  const isOpen = () => root.classList.contains('site-drawer--open');

  const getFocusable = (): HTMLElement[] => {
    const raw = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    return raw.filter((el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      const st = getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden';
    });
  };

  const setOpen = (open: boolean): void => {
    if (open) {
      if (!isOpen()) {
        drawerFocusReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      root.classList.add('site-drawer--open');
      root.setAttribute('aria-hidden', 'false');
      openBtn.setAttribute('aria-expanded', 'true');
      openBtn.setAttribute('aria-label', 'Close site menu');
      document.body.classList.add('site-drawer-open');
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        const first = getFocusable()[0];
        (first ?? panel).focus();
      });
    } else {
      root.classList.remove('site-drawer--open');
      root.setAttribute('aria-hidden', 'true');
      openBtn.setAttribute('aria-expanded', 'false');
      openBtn.setAttribute('aria-label', 'Open site menu');
      document.body.classList.remove('site-drawer-open');
      document.body.style.overflow = '';
      if (drawerFocusReturn) {
        drawerFocusReturn.focus();
        drawerFocusReturn = null;
      } else {
        openBtn.focus();
      }
    }
  };

  const closeIfOpen = (): void => {
    if (isOpen()) setOpen(false);
  };

  openBtn.addEventListener('click', () => {
    if (isOpen()) closeIfOpen();
    else setOpen(true);
  });
  backdrop?.addEventListener('click', () => closeIfOpen());

  const onLinkNav = (e: Event, fn: () => void): void => {
    e.preventDefault();
    fn();
    closeIfOpen();
  };

  linkIndex?.addEventListener('click', (e) => onLinkNav(e, () => navScrollToJourneyIndex()));
  linkWork?.addEventListener('click', (e) => onLinkNav(e, () => navScrollToWork()));

  document.getElementById('drawer-link-contact')?.addEventListener('click', () => {
    closeIfOpen();
  });
  document.getElementById('drawer-mailto')?.addEventListener('click', () => {
    closeIfOpen();
  });

  root.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest?.('.site-drawer__socials a[href]')) {
      closeIfOpen();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.preventDefault();
    closeIfOpen();
  });

  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !isOpen()) return;
    const list = getFocusable();
    if (list.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const i = active ? list.indexOf(active) : -1;
    if (e.shiftKey) {
      if (i <= 0) {
        e.preventDefault();
        list[list.length - 1]!.focus();
      }
    } else if (i === -1 || i === list.length - 1) {
      e.preventDefault();
      list[0]!.focus();
    }
  });
}

export function initNavChrome(audio: AudioSystem): void {
  document.getElementById('nav-link-index')?.addEventListener('click', (e) => {
    e.preventDefault();
    navScrollToJourneyIndex();
  });
  document.getElementById('nav-link-work')?.addEventListener('click', (e) => {
    e.preventDefault();
    navScrollToWork();
  });
  document.getElementById('nav-audio-toggle')?.addEventListener('click', (e) => {
    e.preventDefault();
    void audio.toggleAudio();
  });
  document.getElementById('nav-mini-prev')?.addEventListener('click', (e) => {
    e.preventDefault();
    audio.prevTrack();
  });
  document.getElementById('nav-mini-next')?.addEventListener('click', (e) => {
    e.preventDefault();
    audio.nextTrack();
  });

  initSiteDrawer();

  window.addEventListener('resize', () => {
    lastMiniPlayerSig = '';
  });
}

/** Syncs pill thumb height + position to document scroll (native bar hidden). */
export function updateCustomScrollThumb(): void {
  const track = document.getElementById('custom-scroll-track');
  const thumb = document.getElementById('custom-scroll-thumb');
  if (!track || !thumb) return;

  const docH = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  const vh = window.innerHeight;
  const maxScroll = Math.max(docH - vh, 1);
  const scrollY = window.scrollY || window.pageYOffset;

  if (maxScroll <= 4) {
    thumb.style.opacity = '0';
    return;
  }

  thumb.style.opacity = '1';

  const trackH = track.clientHeight;
  const ratio = vh / docH;
  // Long pages → small thumb; keep a modest floor so it stays grabbable.
  const thumbH = Math.max(Math.round(trackH * ratio), 20);
  const cappedThumb = Math.min(thumbH, Math.floor(trackH * 0.88));
  const travel = Math.max(trackH - cappedThumb, 0);
  const p = Math.min(Math.max(scrollY / maxScroll, 0), 1);
  const y = p * travel;

  thumb.style.height = `${cappedThumb}px`;
  thumb.style.transform = `translateY(${y}px)`;
}

export function updateNavChrome(
  audio: AudioSystem,
  scroll: ScrollSystem,
  delta: number,
): void {
  const root = document.documentElement;
  const warp = Math.min(scroll.velocityPxPerSec / 3800, 1);
  root.style.setProperty('--nav-warp', warp.toFixed(4));
  root.style.setProperty('--nav-dir', String(scroll.scrollDirection));
  document.body.classList.toggle('audio-active', audio.isPlaying);
  document.body.classList.toggle('music-playing', audio.isPlaying);

  const playerWrap = document.getElementById('nav-player-wrap');
  if (playerWrap) {
    playerWrap.setAttribute('aria-hidden', audio.isPlaying ? 'false' : 'true');
  }

  const audioToggle = document.getElementById('nav-audio-toggle');
  const d = Math.min(Math.max(delta, 0), 0.05);
  if (audioToggle) {
    audioToggle.setAttribute('aria-pressed', audio.isPlaying ? 'true' : 'false');
    if (audio.isPlaying) {
      const rawPetal = Math.min(
        1,
        0.18 +
          audio.lowFrequencyVolume * 0.68 +
          audio.beatEnvelope * 0.92 +
          audio.highFrequencyVolume * 0.16,
      );
      petalPulseSmoothed += (rawPetal - petalPulseSmoothed) * Math.min(1, d * 14);
      audioToggle.style.setProperty('--nav-petal-pulse', petalPulseSmoothed.toFixed(3));
    } else {
      petalPulseSmoothed += (0.24 - petalPulseSmoothed) * Math.min(1, d * 8);
      audioToggle.style.setProperty('--nav-petal-pulse', petalPulseSmoothed.toFixed(3));
    }
  }

  updateMiniPlayerCredits(audio);

  updateCustomScrollThumb();
}
