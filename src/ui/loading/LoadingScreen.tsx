import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';

import { getEngineResult } from './engineResult';
import { INK_BLOT_POST_LOAD_INTRO, POST_LOAD_INTRO_MS } from '@/postLoadIntro';

import './loadingScreen.css';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const shellVariants = (reduce: boolean) => ({
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: {
    opacity: 0,
    y: 22,
    scale: 0.94,
    transition: reduce
      ? { duration: 0.32, ease: EASE }
      : { type: 'spring' as const, stiffness: 200, damping: 28, mass: 0.82 },
  },
});

export interface LoadingScreenProps {
  onExitComplete: () => void;
}

const MIN_LOADING_MS = 3000;
const COLS = 12;
const ROWS = 8;
const N = COLS * ROWS;

const TILES = [
  'var(--load-t1)',
  'var(--load-t2)',
  'var(--load-t3)',
  'var(--load-t4)',
] as const;

function boustrophedonOrder(cols: number, rows: number): number[] {
  const o: number[] = [];
  for (let r = 0; r < rows; r++) {
    const ltr = r % 2 === 0;
    for (let c = 0; c < cols; c++) {
      const cc = ltr ? c : cols - 1 - c;
      o.push(r * cols + cc);
    }
  }
  return o;
}

const FILL_ORDER = boustrophedonOrder(COLS, ROWS);

const rankInFillOrder: number[] = (() => {
  const r = new Array<number>(N);
  for (let o = 0; o < N; o++) {
    r[FILL_ORDER[o]!] = o;
  }
  return r;
})();

/**
 * 0 = empty; 1 = only when engine ready and min dwell elapsed.
 */
function computeTargetFill01(elapsedMs: number, engineOk: boolean, minMs: number): number {
  if (engineOk && elapsedMs >= minMs) return 1;
  if (engineOk && elapsedMs < minMs) {
    return 0.7 + 0.25 * (elapsedMs / Math.max(minMs, 1));
  }
  const t = Math.min(1, elapsedMs / 9000);
  return 0.88 * (1 - Math.exp(-t * 2.4));
}

export function LoadingScreen({ onExitComplete }: LoadingScreenProps) {
  const statusId = useId();
  const [phase, setPhase] = useState<'load' | 'exit' | 'err'>('load');
  const [fill01, setFill01] = useState(0);
  const [statusText, setStatusText] = useState('Loading');
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const exitDoneRef = useRef(false);
  const introEventDoneRef = useRef(false);
  const phaseRef = useRef(phase);
  const mountRef = useRef(0);
  const engineOkRef = useRef(false);
  const [engineOk, setEngineOk] = useState(false);
  const smoothRef = useRef(0);
  phaseRef.current = phase;

  useEffect(() => {
    mountRef.current = performance.now();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('aria-busy', 'true');
    return () => {
      document.documentElement.removeAttribute('aria-busy');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(q.matches);
    const h = () => setReduce(q.matches);
    q.addEventListener('change', h);
    return () => q.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    let cancel = false;
    void getEngineResult().then((r) => {
      if (cancel) return;
      if (!r.ok) {
        setPhase('err');
        document.documentElement.removeAttribute('aria-busy');
        return;
      }
      engineOkRef.current = true;
      setEngineOk(true);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'load') return;
    if (reduce) {
      const t = window.setInterval(() => {
        const elapsed = performance.now() - mountRef.current;
        if (engineOkRef.current && elapsed >= MIN_LOADING_MS) {
          setFill01(1);
          setStatusText('Ready');
        } else {
          setFill01(0.5);
        }
      }, 200);
      return () => clearInterval(t);
    }

    let raf = 0;
    const loop = (now: number) => {
      const elapsed = now - mountRef.current;
      const target = computeTargetFill01(elapsed, engineOkRef.current, MIN_LOADING_MS);
      smoothRef.current += (target - smoothRef.current) * 0.12;
      if (target >= 0.999) smoothRef.current = 1;
      setFill01(smoothRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduce]);

  useEffect(() => {
    if (fill01 < 0.92) setStatusText('Loading');
    else if (engineOk) setStatusText('Ready');
  }, [fill01, engineOk]);

  useEffect(() => {
    if (phase !== 'load') return;
    if (fill01 < 0.999) return;
    if (!engineOk) return;
    if (performance.now() - mountRef.current < MIN_LOADING_MS) return;
    if (exitDoneRef.current) return;
    setPhase('exit');
  }, [fill01, phase, engineOk]);

  useEffect(() => {
    if (phase !== 'exit') return;
    if (introEventDoneRef.current) return;
    introEventDoneRef.current = true;
    window.dispatchEvent(
      new CustomEvent(INK_BLOT_POST_LOAD_INTRO, {
        detail: { durationMs: POST_LOAD_INTRO_MS },
      }),
    );
  }, [phase]);

  useEffect(() => {
    if (phase !== 'exit') return;
    const t = window.setTimeout(() => {
      if (exitDoneRef.current) return;
      exitDoneRef.current = true;
      document.documentElement.removeAttribute('aria-busy');
      onExitComplete();
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, onExitComplete]);

  const filledCount = (() => {
    if (fill01 >= 0.999) return N;
    return Math.min(N, Math.floor(fill01 * N));
  })();

  const isCellOn = (cellIndex: number) => {
    if (cellIndex < 0 || cellIndex >= N) return false;
    return rankInFillOrder[cellIndex]! < filledCount;
  };

  return (
    <AnimatePresence mode="wait">
      {phase !== 'err' && (
        <motion.div
          key="load-shell"
          className="loading-screen"
          initial="visible"
          animate={phase === 'exit' ? 'exit' : 'visible'}
          variants={shellVariants(reduce)}
          onAnimationComplete={() => {
            if (phaseRef.current !== 'exit' || exitDoneRef.current) return;
            exitDoneRef.current = true;
            document.documentElement.removeAttribute('aria-busy');
            onExitComplete();
          }}
          role="status"
          aria-busy={phase === 'load' || phase === 'exit'}
          aria-labelledby={statusId}
        >
          <div className="loading-screen__shell">
            <p className="loading-screen__status" id={statusId} aria-live="polite">
              {statusText}
            </p>
            <div className="loading-screen__grid" aria-hidden>
              {Array.from({ length: N }, (_, i) => {
                const on = isCellOn(i);
                const order = rankInFillOrder[i]!;
                return (
                  <motion.div
                    key={i}
                    className={`loading-screen__cell${on ? ' loading-screen__cell--on' : ''}`}
                    style={on ? { background: TILES[order % TILES.length]! } : undefined}
                    initial={false}
                    animate={{ scale: on ? 1 : 0.98 }}
                    transition={{ duration: reduce ? 0.01 : 0.1, ease: EASE }}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
      {phase === 'err' && (
        <motion.div
          key="err"
          className="loading-screen loading-screen--reduced"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alert"
        >
          <div className="loading-screen__frame">
            <p className="loading-screen__error">The scene could not be prepared.</p>
            <button type="button" className="loading-screen__retry" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
