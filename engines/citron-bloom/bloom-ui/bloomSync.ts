import type { BloomSceneGraph } from '../bloom-runtime/bloomSceneGraph';

export class BloomSyncClient {
  private listeners: ((graph: BloomSceneGraph) => void)[] = [];
  
  constructor(private url: string) {
    // Mock connecting to Firebase / Supabase websocket
    console.log(`[BloomSync] Connecting to ${url}`);
  }

  onGraphUpdate(cb: (graph: BloomSceneGraph) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  pushGraph(graph: BloomSceneGraph) {
    console.log(`[BloomSync] Pushing graph update to cloud...`, graph);
    // Simulate cloud latency and echo back to other listeners
    setTimeout(() => {
      for (const listener of this.listeners) {
        listener(graph);
      }
    }, 150);
  }
}

export const defaultBloomSync = new BloomSyncClient('wss://sync.citron.local/bloom');
