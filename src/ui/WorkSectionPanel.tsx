import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { WORK_PROJECTS } from '@/data/workSectionContent';

import './WorkSection.css';

const EASE = [0.22, 1, 0.36, 1] as const;

function slabVariants(dir: 'r' | 'l') {
  const xHidden = dir === 'r' ? -28 : 28;
  return {
    hidden: { opacity: 0, x: xHidden, scale: 0.96 },
    show: (i: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        delay: 0.05 + i * 0.09,
        duration: 0.58,
        ease: EASE,
      },
    }),
    exit: {
      opacity: 0,
      transition: { duration: 0.18 },
    },
  };
}

export function WorkSectionPanel() {
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let prev = false;
    const read = () => {
      const raw = parseFloat(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--journey-work-slide')
          .trim() || '0',
      );
      const next = raw > 0.45;
      if (next !== prev) {
        prev = next;
        setVisible(next);
      }
      rafRef.current = requestAnimationFrame(read);
    };
    rafRef.current = requestAnimationFrame(read);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="work-slab-grid">
      {WORK_PROJECTS.map((project, i) => {
        const dir: 'r' | 'l' = i % 2 === 0 ? 'r' : 'l';
        const vars = slabVariants(dir);
        return (
          <motion.div
            key={project.id}
            className={`work-slab work-slab--${dir}`}
            style={
              {
                '--slab-bg': project.bgColor,
                '--slab-accent': project.accentColor,
              } as React.CSSProperties
            }
            variants={vars}
            custom={i}
            initial="hidden"
            animate={visible ? 'show' : 'hidden'}
          >
            <div className="work-slab__bg" />
            <div className={`work-slab__content work-slab__content--${dir}`}>
              <div className="work-slab__media">
                <span className="work-slab__media-label">Preview</span>
              </div>
              <h3 className="work-slab__name">{project.name}</h3>
              <p className="work-slab__role">{project.discipline}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
