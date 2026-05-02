import { useEffect, useRef } from 'react';

import { WORK_PROJECTS } from '@/data/workSectionContent';
import { WorkSectionScene, workSectionSlabUnitVhFrac } from '@/ui/WorkSectionScene';

import './WorkSection.css';

const SLAB_UNIT_VH_FRAC = workSectionSlabUnitVhFrac();
const NAME_GUTTER_RATIO = 0.52;
const INNER_TAIL_VH = 130;

/** Min scroll track so friction scroll / laptops always have room to scrub tiles. */
const MIN_INNER_EXTRA_VH = 120;

export function WorkSectionPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<WorkSectionScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new WorkSectionScene({ canvas, projects: WORK_PROJECTS });
    sceneRef.current = scene;

    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      scene.resize(c.clientWidth, c.clientHeight);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('resize', resize, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scrollEl = containerRef.current;
    if (!scrollEl) return;

    let raf = 0;

    const updateNameStyles = (rawIdx: number) => {
      const nodes = scrollEl.querySelectorAll<HTMLElement>('[data-work-name]');
      nodes.forEach((el) => {
        const idx = Number.parseInt(el.dataset.workSlot ?? '-1', 10);
        if (idx < 0) return;
        const d = Math.abs(rawIdx - (idx + NAME_GUTTER_RATIO));
        let o = Math.max(0, 1 - d * 2.85);
        o = Math.min(1, o * o);
        if (rawIdx <= 0.06 && idx > 1) o = Math.min(o, 0.12);
        el.style.setProperty('--name-a', String(o));
        el.style.setProperty('--name-lift', `${(1 - o) * 18}px`);
      });
    };

    const tick = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sy = scrollEl.scrollTop;
        const sm = scrollEl.scrollHeight - scrollEl.clientHeight;
        const t = sm > 0 ? sy / sm : 0;
        sceneRef.current?.setScrollProgress(t);

        const slabUnitPx = scrollEl.clientHeight * SLAB_UNIT_VH_FRAC;
        if (slabUnitPx > 4) updateNameStyles(sy / slabUnitPx);
      });
    };

    scrollEl.addEventListener('scroll', tick, { passive: true });
    tick();

    return () => {
      cancelAnimationFrame(raf);
      scrollEl.removeEventListener('scroll', tick);
    };
  }, []);

  const stripeVh =
    WORK_PROJECTS.length * (SLAB_UNIT_VH_FRAC * 100) + INNER_TAIL_VH + MIN_INNER_EXTRA_VH;

  return (
    <div className="work-section">
      <header className="work-section__title">
        <p className="work-section__kicker">Selected</p>
        <h2 className="work-section__heading">Projects</h2>
      </header>

      <canvas ref={canvasRef} className="work-section__canvas" aria-hidden="true" />

      <div
        ref={containerRef}
        className="work-section__scroll"
        role="region"
        aria-label="Selected projects"
        tabIndex={0}
      >
        <div className="work-section__inner" style={{ height: `${stripeVh}vh`, minHeight: '140vh' }}>
          {WORK_PROJECTS.map((project, i) => {
            const dirClass =
              i % 2 === 0
                ? 'work-section__name--from-right'
                : 'work-section__name--from-left';
            const meta = [project.role, project.year].filter(Boolean).join(' · ');
            return (
              <div
                key={project.id}
                data-work-slot={i}
                data-work-name
                className={`work-section__name ${dirClass}`}
                style={{
                  top: `calc(${(i + NAME_GUTTER_RATIO) * (SLAB_UNIT_VH_FRAC * 100)}vh)`,
                }}
              >
                <p className="work-section__name-text">{project.name}</p>
                {meta && <p className="work-section__name-meta">{meta}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="work-section__hint" aria-hidden="true">
        scroll
      </div>
    </div>
  );
}
