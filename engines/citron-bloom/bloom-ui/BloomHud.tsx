import '@citron-systems/citron-ds/css';
import { Button } from '@citron-systems/citron-ui';
import { useCallback, useState, useEffect, type CSSProperties } from 'react';
import { BloomSpacing } from '../bloom-core/tokens';
import { BloomEditor } from './BloomEditor';
import { defaultBloomSync } from './bloomSync';
import { DEFAULT_CITRON_BLOOM_GRAPH, type BloomSceneGraph } from '../bloom-runtime/bloomSceneGraph';

export interface BloomHudProps {
  onBloomMore?: () => void;
  onBloomLess?: () => void;
  title?: string;
  onGraphChange?: (graph: BloomSceneGraph) => void;
}

/**
 * Minimal overlay: Citron UI buttons + Inkblot `:root` palette from the host page.
 */
export function BloomHud({ onBloomMore, onBloomLess, title = 'Citron Bloom', onGraphChange }: BloomHudProps) {
  const [open, setOpen] = useState(true);
  const [graph, setGraph] = useState<BloomSceneGraph>(DEFAULT_CITRON_BLOOM_GRAPH);
  const pad = BloomSpacing.s4;

  useEffect(() => {
    return defaultBloomSync.onGraphUpdate((newGraph) => {
      setGraph(newGraph);
      onGraphChange?.(newGraph);
    });
  }, [onGraphChange]);

  const handleGraphLocalChange = useCallback((newGraph: BloomSceneGraph) => {
    setGraph(newGraph);
    onGraphChange?.(newGraph);
  }, [onGraphChange]);

  const handleSyncPush = useCallback((newGraph: BloomSceneGraph) => {
    defaultBloomSync.pushGraph(newGraph);
  }, []);

  const panelStyle: CSSProperties = {
    position: 'fixed',
    right: pad,
    bottom: pad,
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    gap: BloomSpacing.s2,
    padding: BloomSpacing.s4,
    maxWidth: 280,
    pointerEvents: 'auto',
    borderRadius: '12px',
    background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontSize: '0.8125rem',
  };

  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: pad }}>
        <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>{title}</span>
        <Button type="button" variant="secondary" onClick={toggle}>
          {open ? 'Hide' : 'Show'}
        </Button>
      </div>
      {open && (
        <>
          <p style={{ opacity: 0.85, lineHeight: 1.5, margin: 0 }}>
            Scroll the page to open the flowers slowly, or use the buttons to smooth-scroll to closed or full bloom.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: BloomSpacing.s2 }}>
            <Button type="button" variant="primary" onClick={onBloomMore}>
              Scroll to full bloom
            </Button>
            <Button type="button" variant="secondary" onClick={onBloomLess}>
              Scroll to bud
            </Button>
          </div>
          <div style={{ marginTop: '16px' }}>
            <BloomEditor 
              graph={graph} 
              onChange={handleGraphLocalChange} 
              onSyncPush={handleSyncPush} 
            />
          </div>
        </>
      )}
    </div>
  );
}
