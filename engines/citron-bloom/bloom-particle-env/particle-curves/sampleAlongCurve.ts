import { Color, Vector3 } from 'three';
import type { CatmullRomCurve3, Curve } from 'three';
import type { EnvParticleSample } from '../particles-core/types';

const _p = new Vector3();
const _tan = new Vector3();
const _bin = new Vector3();
const _n = new Vector3();

/**
 * Sample `count` particles along a Three.js curve with perpendicular jitter.
 */
export function sampleCurveWithJitter(
  curve: Curve<Vector3>,
  count: number,
  options: {
    jitterRadius?: number;
    scaleMin?: number;
    scaleMax?: number;
    colorA?: Color;
    colorB?: Color;
    colorJitter?: number;
    alongPow?: number;
  } = {},
): EnvParticleSample[] {
  const jitterRadius = options.jitterRadius ?? 0.04;
  const scaleMin = options.scaleMin ?? 0.55;
  const scaleMax = options.scaleMax ?? 1.15;
  const colorA = options.colorA ?? new Color(0x4ade80);
  const colorB = options.colorB ?? new Color(0x22c55e);
  const colorJitter = options.colorJitter ?? 0.22;
  const alongPow = options.alongPow ?? 1;

  const out: EnvParticleSample[] = [];
  const tmpColor = new Color();

  for (let i = 0; i < count; i++) {
    const u = count <= 1 ? 0 : i / (count - 1);
    const t = Math.pow(u, alongPow);
    curve.getPointAt(t, _p);
    curve.getTangentAt(t, _tan);
    if (_tan.lengthSq() < 1e-8) _tan.set(0, 1, 0);
    else _tan.normalize();

    _bin.crossVectors(_tan, new Vector3(0, 1, 0));
    if (_bin.lengthSq() < 1e-6) _bin.crossVectors(_tan, new Vector3(1, 0, 0));
    _bin.normalize();
    _n.crossVectors(_tan, _bin).normalize();

    const j1 = (Math.random() - 0.5) * 2 * jitterRadius;
    const j2 = (Math.random() - 0.5) * 2 * jitterRadius;
    const pos = _p.clone().addScaledVector(_bin, j1).addScaledVector(_n, j2);

    const phase = Math.random() * Math.PI * 2;
    const random = Math.random();
    tmpColor.lerpColors(colorA, colorB, t + (Math.random() - 0.5) * colorJitter);
    tmpColor.r = Math.min(1, Math.max(0, tmpColor.r));
    tmpColor.g = Math.min(1, Math.max(0, tmpColor.g));
    tmpColor.b = Math.min(1, Math.max(0, tmpColor.b));

    out.push({
      position: pos,
      tangent: _tan.clone(),
      scale: scaleMin + random * (scaleMax - scaleMin),
      color: tmpColor.clone(),
      phase,
      along: u,
      random,
    });
  }

  return out;
}

/**
 * Sample along CatmullRom with extra endpoint clustering (more particles at tip).
 */
export function sampleCurveTipHeavy(
  curve: CatmullRomCurve3,
  count: number,
  tipBias: number,
  jitterRadius: number,
  colorA: Color,
  colorB: Color,
): EnvParticleSample[] {
  const out: EnvParticleSample[] = [];
  const tmpColor = new Color();

  for (let i = 0; i < count; i++) {
    const u0 = count <= 1 ? 0 : i / (count - 1);
    const u = Math.pow(u0, 1 / (1 + tipBias * 1.8));
    curve.getPointAt(u, _p);
    curve.getTangentAt(u, _tan);
    if (_tan.lengthSq() < 1e-8) _tan.set(0, 1, 0);
    else _tan.normalize();

    _bin.crossVectors(_tan, new Vector3(0, 1, 0));
    if (_bin.lengthSq() < 1e-6) _bin.crossVectors(_tan, new Vector3(1, 0, 0));
    _bin.normalize();
    _n.crossVectors(_tan, _bin).normalize();

    const jr = jitterRadius * (0.5 + u * 0.85);
    const j1 = (Math.random() - 0.5) * 2 * jr;
    const j2 = (Math.random() - 0.5) * 2 * jr;
    const pos = _p.clone().addScaledVector(_bin, j1).addScaledVector(_n, j2);

    const phase = Math.random() * Math.PI * 2;
    const random = Math.random();
    tmpColor.lerpColors(colorA, colorB, u + (Math.random() - 0.5) * 0.25);

    out.push({
      position: pos,
      tangent: _tan.clone(),
      scale: 0.35 + (0.45 + u * 0.5) * random + u * 0.4,
      color: tmpColor.clone(),
      phase,
      along: u0,
      random,
    });
  }

  return out;
}

/**
 * Points on a vertical column (architectural spine).
 */
export function sampleVerticalColumn(
  baseY: number,
  height: number,
  count: number,
  radiusJitter: number,
  xzAngle: number,
  radialScatter: number,
  color: Color,
): EnvParticleSample[] {
  const out: EnvParticleSample[] = [];
  const c = Math.cos(xzAngle);
  const s = Math.sin(xzAngle);

  for (let i = 0; i < count; i++) {
    const u = count <= 1 ? 0 : i / (count - 1);
    const y = baseY + u * height;
    const r = radialScatter * (0.85 + Math.random() * 0.3);
    const pos = new Vector3(c * r + (Math.random() - 0.5) * radiusJitter, y, s * r + (Math.random() - 0.5) * radiusJitter);
    const tangent = new Vector3(0, 1, 0);
    const phase = Math.random() * Math.PI * 2;
    const random = Math.random();
    const col = color.clone().multiplyScalar(0.85 + random * 0.25);
    out.push({
      position: pos,
      tangent,
      scale: 0.65 + random * 0.55,
      color: col,
      phase,
      along: u,
      random,
    });
  }
  return out;
}
