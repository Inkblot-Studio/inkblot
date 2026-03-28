import { Color, Matrix4, Quaternion, Vector3 } from 'three';
import { BloomTokens } from '../bloom-core/tokens';

export interface ProceduralFlowerLayoutResult {
  total: number;
  colors: Float32Array;
  phases: Float32Array;
  matrices: Float32Array;
}

const _pos = new Vector3();
const _quat = new Quaternion();
const _scale = new Vector3();
const _mat = new Matrix4();
const _qPitch = new Quaternion();
const _yAxis = new Vector3(0, 1, 0);
const _xAxis = new Vector3(1, 0, 0);

/**
 * Deterministic petal ring layout (main thread + worker). Phases use a golden-ratio
 * sequence so sync and async paths match without relying on Math.random().
 */
export function computeProceduralFlowerLayout(
  petalCount: number,
  radius: number,
): ProceduralFlowerLayoutResult {
  const total = petalCount;
  const colors = new Float32Array(total * 4);
  const phases = new Float32Array(total);
  const matrices = new Float32Array(total * 16);
  const tempColor = new Color();
  const cMint = new Color('#b8f5d9').lerp(BloomTokens.success, 0.55);
  const cEmerald = BloomTokens.success.clone();
  const cSky = BloomTokens.citron300.clone();

  for (let k = 0; k < total; k++) {
    const a = (k / total) * Math.PI * 2;
    const t = k / total;
    if (t < 0.5) {
      tempColor.lerpColors(cMint, cEmerald, t * 2.0);
    } else {
      tempColor.lerpColors(cEmerald, cSky, (t - 0.5) * 2.0);
    }
    colors[k * 4] = tempColor.r;
    colors[k * 4 + 1] = tempColor.g;
    colors[k * 4 + 2] = tempColor.b;
    colors[k * 4 + 3] = 1;
    phases[k] = ((k * 2.618033988749895) % 1) * Math.PI * 2;

    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    _pos.set(x, 0, z);

    const eulerY = -a + Math.PI / 2;
    const eulerX = 0.2;
    _quat.setFromAxisAngle(_yAxis, eulerY);
    _qPitch.setFromAxisAngle(_xAxis, eulerX);
    _quat.multiply(_qPitch);

    _scale.setScalar(1);
    _mat.compose(_pos, _quat, _scale);
    _mat.toArray(matrices, k * 16);
  }

  return { total, colors, phases, matrices };
}
