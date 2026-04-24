/**
 * Short UI blips for the audio dock strip — Web Audio only (no asset files).
 * Skipped when prefers-reduced-motion (keeps the shell calm for that preference).
 */

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  return ctx;
}

function motionOk(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function playAudioDockUiSound(kind: 'open' | 'close'): void {
  if (!motionOk()) return;

  const c = audioContext();
  if (!c) return;

  try {
    if (c.state === 'suspended') {
      void c.resume();
    }

    const now = c.currentTime;
    const gain = c.createGain();
    gain.connect(c.destination);

    const peak = kind === 'open' ? 0.1 : 0.075;
    const dur = kind === 'open' ? 0.15 : 0.12;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const osc = c.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';

    if (kind === 'open') {
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.1);
    } else {
      osc.frequency.setValueAtTime(840, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.085);
    }

    const stopAt = now + dur + 0.02;
    osc.start(now);
    osc.stop(stopAt);
  } catch {
    // Ignore missing AudioContext (restricted environments).
  }
}
