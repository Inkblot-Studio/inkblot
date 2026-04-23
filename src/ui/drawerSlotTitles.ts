const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%$&◎◇';

/**
 * Splits drawer nav titles into character spans; on row hover, runs a short
 * "slot" scramble into the hover font; reverses on leave.
 */
export function initDrawerSlotTitles(): void {
  const reduce =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll<HTMLElement>('.site-drawer__row .site-drawer__row-title').forEach((title) => {
    const full = title.textContent?.trim() ?? '';
    if (!full) return;

    title.textContent = '';
    const words = full.split(/\s+/).filter(Boolean);
    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi] ?? '';
      const wspan = document.createElement('span');
      wspan.className = 'sd-word';
      for (const ch of word) {
        const cspan = document.createElement('span');
        cspan.className = 'sd-ch';
        cspan.textContent = ch;
        cspan.dataset.target = ch;
        wspan.appendChild(cspan);
      }
      title.appendChild(wspan);
      if (wi < words.length - 1) {
        title.appendChild(document.createTextNode('\u00a0'));
      }
    }

    const row = title.closest('.site-drawer__row') as HTMLElement | null;
    if (!row) return;

    const timeouts: number[] = [];
    const clearAll = (): void => {
      for (const t of timeouts) window.clearTimeout(t);
      timeouts.length = 0;
    };

    const runScramble = (): void => {
      clearAll();
      if (reduce) {
        title.classList.add('site-drawer__row-title--hover');
        return;
      }
      const chars = Array.from(title.querySelectorAll<HTMLElement>('.sd-ch'));
      let delay = 0;
      for (const ch of chars) {
        const target = ch.dataset.target ?? '';
        if (target === ' ' || target === '\u00a0') continue;
        const start = delay;
        let step = 0;
        const runStep = (): void => {
          step++;
          if (step < 7) {
            ch.textContent = CHARSET[Math.floor(Math.random() * CHARSET.length)] ?? 'X';
            timeouts.push(window.setTimeout(runStep, 28 + Math.random() * 22));
          } else {
            ch.textContent = target;
            ch.classList.add('sd-ch--settled');
          }
        };
        timeouts.push(window.setTimeout(runStep, start));
        delay += 38;
      }
      title.classList.add('site-drawer__row-title--hover');
    };

    const reset = (): void => {
      clearAll();
      title.classList.remove('site-drawer__row-title--hover');
      title.querySelectorAll<HTMLElement>('.sd-ch').forEach((el) => {
        el.textContent = el.dataset.target ?? '';
        el.classList.remove('sd-ch--settled');
      });
    };

    row.addEventListener('mouseenter', runScramble);
    row.addEventListener('mouseleave', reset);
    row.addEventListener('focusin', runScramble);
    row.addEventListener('focusout', (e) => {
      if (!row.contains(e.relatedTarget as Node)) reset();
    });
  });
}
