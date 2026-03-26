import { Vector3 } from 'three';
import { catmullFromPoints, stemPoints, branchTip } from '../../bloom-curves/curveUtils';
import { BloomTokens } from '../../bloom-core/tokens';
import type { EnvParticleSample } from '../particles-core/types';
import { scaleParticleBudget } from '../particles-core/types';
import { sampleCurveTipHeavy, sampleCurveWithJitter } from '../particle-curves/sampleAlongCurve';
import type { TreeSampleOptions } from './particleTreeConfig';

function mergeSamples(chunks: readonly EnvParticleSample[][]): EnvParticleSample[] {
  const n = chunks.reduce((a, c) => a + c.length, 0);
  const out: EnvParticleSample[] = new Array(n);
  let o = 0;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++) out[o++] = c[i]!;
  }
  return out;
}

/**
 * CPU-only particle layout for one tree (shared by tree + forest).
 */
export function buildParticleTreeSamples(options: TreeSampleOptions = {} as TreeSampleOptions): EnvParticleSample[] {
  const height = (options.height ?? 1.45) * (options.scale ?? 1);
  const sway = (options.sway ?? 0.12) * (options.scale ?? 1);
  const baseBudget = options.particleBudget ?? 4200;
  const budget = scaleParticleBudget(options.lod, baseBudget);

  const trunkColor = options.trunkColor ?? BloomTokens.citron600.clone();
  const branchColor = options.branchColor ?? BloomTokens.citron500.clone();
  const leafColor = options.leafColor ?? BloomTokens.success.clone();

  const trunkPts = [
    new Vector3(0, 0, 0),
    new Vector3(sway * 0.6, height * 0.22, sway * 0.35),
    new Vector3(-sway * 0.45, height * 0.52, sway * 0.2),
    new Vector3(sway * 0.25, height * 0.78, -sway * 0.15),
    new Vector3(0, height, 0),
  ];
  const trunkCurve = catmullFromPoints(trunkPts, false);

  const trunkN = Math.floor(budget * 0.38);
  const trunkSamples = sampleCurveWithJitter(trunkCurve, trunkN, {
    jitterRadius: 0.038 * (options.scale ?? 1),
    scaleMin: 0.42,
    scaleMax: 0.95,
    colorA: trunkColor,
    colorB: branchColor,
    colorJitter: 0.18,
  });

  const mainForBranch = trunkCurve;
  const branchSpecs: { u: number; tip: Vector3 }[] = [
    { u: 0.28, tip: branchTip(mainForBranch, 0.28, 0.42 * (options.scale ?? 1)) },
    {
      u: 0.42,
      tip: branchTip(mainForBranch, 0.42, 0.38 * (options.scale ?? 1)).add(
        new Vector3(0.08, 0, -0.06).multiplyScalar(options.scale ?? 1),
      ),
    },
    { u: 0.55, tip: branchTip(mainForBranch, 0.55, 0.52 * (options.scale ?? 1)) },
    {
      u: 0.68,
      tip: branchTip(mainForBranch, 0.68, 0.35 * (options.scale ?? 1)).add(
        new Vector3(-0.1, 0, 0.08).multiplyScalar(options.scale ?? 1),
      ),
    },
    { u: 0.78, tip: branchTip(mainForBranch, 0.78, 0.28 * (options.scale ?? 1)) },
  ];

  const branchChunks: EnvParticleSample[][] = [];
  const perBranch = Math.floor((budget * 0.28) / branchSpecs.length);

  for (const spec of branchSpecs) {
    const origin = mainForBranch.getPointAt(spec.u);
    const stem = stemPoints(spec.tip.clone().sub(origin), 0.28, 18).map((p) => p.add(origin));
    const brCurve = catmullFromPoints(stem, false);
    branchChunks.push(
      sampleCurveWithJitter(brCurve, Math.max(24, perBranch), {
        jitterRadius: 0.032 * (options.scale ?? 1),
        scaleMin: 0.38,
        scaleMax: 0.88,
        colorA: branchColor,
        colorB: leafColor,
        colorJitter: 0.2,
      }),
    );
  }

  const leafChunks: EnvParticleSample[][] = [];
  const used =
    trunkSamples.length + branchChunks.reduce((a, b) => a + b.length, 0);
  const leafBudget = Math.max(120, budget - used);

  for (const spec of branchSpecs) {
    const origin = mainForBranch.getPointAt(spec.u);
    const stem = stemPoints(spec.tip.clone().sub(origin), 0.28, 14).map((p) => p.add(origin));
    const brCurve = catmullFromPoints(stem, false);
    const leafN = Math.max(28, Math.floor(leafBudget / branchSpecs.length));
    leafChunks.push(
      sampleCurveTipHeavy(brCurve, leafN, 0.85, 0.055, leafColor, BloomTokens.citron300),
    );
  }

  const all = mergeSamples([trunkSamples, ...branchChunks, ...leafChunks]);

  const off = options.offset ?? new Vector3(0, 0, 0);
  const yaw = options.yaw ?? 0;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);

  for (const s of all) {
    const x = s.position.x * cy - s.position.z * sy;
    const z = s.position.x * sy + s.position.z * cy;
    s.position.set(x + off.x, s.position.y + off.y, z + off.z);
    const tx = s.tangent.x * cy - s.tangent.z * sy;
    const tz = s.tangent.x * sy + s.tangent.z * cy;
    s.tangent.set(tx, s.tangent.y, tz);
  }

  return all;
}
