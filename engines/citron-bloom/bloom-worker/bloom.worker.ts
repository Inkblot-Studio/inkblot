import { computeProceduralFlowerLayout } from './proceduralFlowerLayout';

export type BloomWorkerMessage = {
  type: 'PROCEDURAL_FLOWER_INIT';
  id: number;
  petalCount: number;
  radius: number;
  coreScale: number;
};

export type BloomWorkerResponse = {
  type: 'PROCEDURAL_FLOWER_RESULT';
  id: number;
  total: number;
  colors: Float32Array;
  phases: Float32Array;
  matrices: Float32Array;
};

self.onmessage = (e: MessageEvent<BloomWorkerMessage>) => {
  const msg = e.data;
  if (msg.type !== 'PROCEDURAL_FLOWER_INIT') return;

  const { id, petalCount, radius } = msg;
  const layout = computeProceduralFlowerLayout(petalCount, radius);

  (self as unknown as Worker).postMessage(
    {
      type: 'PROCEDURAL_FLOWER_RESULT',
      id,
      total: layout.total,
      colors: layout.colors,
      phases: layout.phases,
      matrices: layout.matrices,
    },
    [layout.colors.buffer, layout.phases.buffer, layout.matrices.buffer],
  );
};
