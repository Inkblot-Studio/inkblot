import { useState, useEffect, useCallback } from 'react';
import type { BloomSceneGraph, BloomSceneNode } from '../bloom-runtime/bloomSceneGraph';

export interface BloomEditorProps {
  graph: BloomSceneGraph;
  onChange: (graph: BloomSceneGraph) => void;
  onSyncPush?: (graph: BloomSceneGraph) => void;
}

export function BloomEditor({ graph, onChange, onSyncPush }: BloomEditorProps) {
  const [localGraph, setLocalGraph] = useState<BloomSceneGraph>(graph);

  useEffect(() => {
    setLocalGraph(graph);
  }, [graph]);

  const updateNodeParam = useCallback((nodeId: string, paramKey: string, value: any) => {
    const newGraph = {
      ...localGraph,
      nodes: localGraph.nodes.map(n => 
        n.id === nodeId 
          ? { ...n, params: { ...n.params, [paramKey]: value } }
          : n
      )
    };
    setLocalGraph(newGraph);
    onChange(newGraph);
  }, [localGraph, onChange]);

  const pushChanges = () => {
    if (onSyncPush) onSyncPush(localGraph);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px', 
      padding: '12px', background: 'rgba(20,20,30,0.8)', 
      borderRadius: '8px', border: '1px solid #333',
      color: '#eee', fontSize: '13px', pointerEvents: 'auto',
      maxHeight: '400px', overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', borderBottom: '1px solid #444', paddingBottom: '4px' }}>
        Live Graph Editor
      </h3>
      {localGraph.nodes.map((node: BloomSceneNode) => (
        <div key={node.id} style={{ marginBottom: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
          <strong>{node.id}</strong> <span style={{ opacity: 0.6, fontSize: '11px' }}>({node.type})</span>
          {node.params && Object.keys(node.params).map(key => {
            const val = node.params![key];
            if (typeof val === 'boolean') {
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span>{key}</span>
                  <input 
                    type="checkbox" 
                    checked={val} 
                    onChange={e => updateNodeParam(node.id, key, e.target.checked)} 
                  />
                </div>
              );
            }
            if (typeof val === 'number') {
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span>{key}</span>
                  <input 
                    type="number" 
                    value={val} 
                    onChange={e => updateNodeParam(node.id, key, parseFloat(e.target.value))} 
                    style={{ width: '60px', background: '#222', color: '#fff', border: '1px solid #444' }}
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
      <button 
        onClick={pushChanges}
        style={{
          marginTop: '8px', padding: '6px', background: '#45CD85', color: '#000', 
          border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
        }}
      >
        Sync to Cloud
      </button>
    </div>
  );
}
