import { useEffect, useRef, useState } from 'react';

import { WORK_PROJECTS } from '@/data/workSectionContent';
import { WorkSectionScene } from '@/ui/WorkSectionScene';

import './WorkSection.css';

const ACTIVE_DISTANCE_THRESHOLD = 0.55;

export function WorkSectionPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<WorkSectionScene | null>(null);
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // Mount Three.js scene
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

  // Drive scroll progress + active slab
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let raf = 0;
    let lastIdx = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sy = container.scrollTop;
        const sm = container.scrollHeight - container.clientHeight;
        const t = sm > 0 ? sy / sm : 0;
        sceneRef.current?.setScrollProgress(t);

        const slabUnitPx = container.clientHeight * 0.5;
        if (slabUnitPx <= 0) return;

        const rawIdx = sy / slabUnitPx;
        const nearest = Math.round(rawIdx);
        const dist = Math.abs(rawIdx - nearest);

        let nextIdx: number;
        if (
          nearest >= 0 &&
          nearest < WORK_PROJECTS.length &&
          dist < ACTIVE_DISTANCE_THRESHOLD
        ) {
          nextIdx = nearest;
        } else {
          nextIdx = -1;
        }

        if (nextIdx !== lastIdx) {
          lastIdx = nextIdx;
          setActiveIdx(nextIdx);
        }
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('scroll', onScroll);
    };
  }, []);

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
      >
        <div
          className="work-section__inner"
          style={{ height: `${WORK_PROJECTS.length * 50 + 100}vh` }}
        >
          {WORK_PROJECTS.map((project, i) => {
            const isActive = i === activeIdx;
            const meta = [project.role, project.year].filter(Boolean).join(' · ');
            return (
              <div
                key={project.id}
                className={`work-section__name${isActive ? ' work-section__name--active' : ''}`}
                style={{ top: `calc(${i * 50}vh + 75vh)` }}
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
