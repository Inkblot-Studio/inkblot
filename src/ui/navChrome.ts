import type { AudioSystem } from '@/systems/audioSystem';
import type { ScrollSystem } from '@/systems/scrollSystem';

const FLOW_W = 220;

/** Scrolls with the title as one continuous line (thin spaces + en dash). */
const MINI_CREDIT_TAIL = '\u2009\u2013\u2009Inkblot Studio';

let lastMiniPlayerSig = '';

function appendMarqueeSeg(track: HTMLElement, title: string, ariaHidden: boolean): void {
  const seg = document.createElement('span');
  seg.className = 'nav-mini-mq-seg';
  const titlePart = document.createElement('span');
  titlePart.className = 'nav-mini-mq-title-part';
  titlePart.textContent = title;
  const creditPart = document.createElement('span');
  creditPart.className = 'nav-mini-mq-credit-part';
  creditPart.textContent = MINI_CREDIT_TAIL;
  seg.appendChild(titlePart);
  seg.appendChild(creditPart);
  if (ariaHidden) {
    seg.setAttribute('aria-hidden', 'true');
  }
  track.appendChild(seg);
}

function fillMarqueeRow(
  wrap: HTMLElement,
  view: HTMLElement,
  track: HTMLElement,
  title: string,
): void {
  wrap.classList.remove('nav-mini-mq-active');
  track.style.removeProperty('--mq-dur');
  track.innerHTML = '';

  appendMarqueeSeg(track, title, false);

  requestAnimationFrame(() => {
    const vw = view.clientWidth;
    const overflow = track.scrollWidth > vw + 2;
    if (overflow) {
      appendMarqueeSeg(track, title, true);
      const dur = Math.min(38, Math.max(8, (track.scrollWidth / Math.max(vw, 1)) * 5));
      track.style.setProperty('--mq-dur', `${dur}s`);
      wrap.classList.add('nav-mini-mq-active');
    }
  });
}

function updateMiniPlayerCredits(audio: AudioSystem): void {
  const title = audio.getCurrentTrackLabel().trim();
  if (title === lastMiniPlayerSig) return;
  lastMiniPlayerSig = title;

  const navMini = document.getElementById('nav-mini');
  if (navMini) {
    navMini.setAttribute('aria-label', `Now playing: ${title}${MINI_CREDIT_TAIL}`);
  }

  const titleView = document.getElementById('nav-mini-title-view');
  const titleTrack = document.getElementById('nav-mini-title-track');
  const wrapTitle = document.getElementById('nav-mini-wrap-title');
  if (!titleView || !titleTrack || !wrapTitle) {
    return;
  }

  fillMarqueeRow(wrapTitle, titleView, titleTrack, title);
}
const FLOW_MID = 12;

/** Static “logo” wave between Work / Contact when idle (reference UI). */
function buildIdleFlowPath(): string {
  const amp = 4.1;
  let d = `M 0 ${FLOW_MID}`;
  for (let x = 4; x <= FLOW_W; x += 4) {
    const t = x * 0.048;
    const y =
      FLOW_MID +
      Math.sin(t * 1.05 + 0.35) * amp * 0.62 +
      Math.sin(t * 1.85 + 1.1) * amp * 0.38;
    d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  return d;
}

function buildFlowPath(elapsed: number, low: number, high: number, playing: boolean): string {
  if (!playing) {
    return buildIdleFlowPath();
  }
  const amp = 3.5 + low * 16 + high * 9;
  let d = `M 0 ${FLOW_MID}`;
  for (let x = 4; x <= FLOW_W; x += 4) {
    const t = elapsed * 2.1 + x * 0.095;
    const y =
      FLOW_MID +
      Math.sin(t) * amp * 0.55 +
      Math.sin(t * 1.73 + x * 0.035) * amp * 0.4 +
      Math.sin(t * 0.41 + x * 0.12) * amp * 0.15;
    d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  return d;
}

export function initNavChrome(audio: AudioSystem): void {
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
  elapsed: number,
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
  if (audioToggle) {
    audioToggle.setAttribute('aria-pressed', audio.isPlaying ? 'true' : 'false');
  }

  const path = document.getElementById('nav-flow-path');
  if (path) {
    path.setAttribute(
      'd',
      buildFlowPath(elapsed, audio.lowFrequencyVolume, audio.highFrequencyVolume, audio.isPlaying),
    );
  }

  updateMiniPlayerCredits(audio);

  updateCustomScrollThumb();
}
