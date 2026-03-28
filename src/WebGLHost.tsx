import { useEffect } from 'react';

import type { Inkblot } from './inkblotApp';

/**
 * Keeps the Three.js loop outside React render; loads the engine in a separate chunk.
 */
export function WebGLHost() {
  useEffect(() => {
    let ink: Inkblot | null = null;
    let cancelled = false;

    void import('./inkblotBootstrap')
      .then((mod) => {
        if (cancelled) return;
        const el = document.getElementById('canvas-container');
        if (!el) {
          console.error('[Inkblot] Missing #canvas-container');
          return;
        }
        ink = mod.mountInkblot(el);
        
        // Fade out splash screen once engine resolves
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.classList.add('is-loaded');
          setTimeout(() => {
            if (splash.parentNode) splash.remove();
          }, 800); // Wait for the transition to finish
        }
      })
      .catch((err) => {
        console.error('[Inkblot] Failed to load engine chunk', err);
      });

    return () => {
      cancelled = true;
      ink?.dispose();
    };
  }, []);

  return null;
}
