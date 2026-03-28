import BloomWorker from './bloom.worker?worker';
import type { BloomWorkerMessage, BloomWorkerResponse } from './bloom.worker';

let worker: Worker | null = null;
let nextId = 1;
const callbacks = new Map<number, (res: BloomWorkerResponse) => void>();
const rejectors = new Map<number, (err: Error) => void>();

function rejectAllPending(reason: string): void {
  const err = new Error(reason);
  for (const [, reject] of rejectors) {
    reject(err);
  }
  rejectors.clear();
  callbacks.clear();
}

export function getBloomWorker(): Worker {
  if (!worker) {
    worker = new BloomWorker();
    worker.onmessage = (e: MessageEvent<BloomWorkerResponse>) => {
      const msg = e.data;
      if (msg.type === 'PROCEDURAL_FLOWER_RESULT') {
        const cb = callbacks.get(msg.id);
        const rj = rejectors.get(msg.id);
        if (cb && rj) {
          cb(msg);
          callbacks.delete(msg.id);
          rejectors.delete(msg.id);
        }
      }
    };
    worker.onmessageerror = () => {
      rejectAllPending('Bloom worker message error');
      worker = null;
    };
    worker.onerror = () => {
      rejectAllPending('Bloom worker failed');
      worker = null;
    };
  }
  return worker;
}

export function requestProceduralFlower(
  msg: Omit<Extract<BloomWorkerMessage, { type: 'PROCEDURAL_FLOWER_INIT' }>, 'id'>,
): Promise<Extract<BloomWorkerResponse, { type: 'PROCEDURAL_FLOWER_RESULT' }>> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    callbacks.set(id, resolve as (res: BloomWorkerResponse) => void);
    rejectors.set(id, reject);
    try {
      getBloomWorker().postMessage({ ...msg, id });
    } catch (e) {
      callbacks.delete(id);
      rejectors.delete(id);
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
