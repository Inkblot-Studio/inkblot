import { BufferGeometry, Float32BufferAttribute } from 'three';

/**
 * Parametric petal surface with curved midrib, tapered width profile, and
 * concave cross-section. Intended for InstancedMesh rendering.
 *
 * u ∈ [0,1]: base → tip along midrib
 * v ∈ [0,1]: left edge → right edge
 */
export function createPetalGeometry(
  lengthSegs = 22,
  widthSegs = 10,
  opts: {
    length?: number;
    maxHalfWidth?: number;
    curl?: number;
    concavity?: number;
  } = {},
): BufferGeometry {
  const len = opts.length ?? 0.32;
  const hw = opts.maxHalfWidth ?? 0.048;
  const curl = opts.curl ?? 0.065;
  const cup = opts.concavity ?? 0.014;

  const rows = lengthSegs + 1;
  const cols = widthSegs + 1;
  const vCount = rows * cols;

  const pos = new Float32Array(vCount * 3);
  const uvs = new Float32Array(vCount * 2);

  let vi = 0;
  for (let i = 0; i < rows; i++) {
    const u = i / lengthSegs;
    const widthProfile = Math.sin(Math.PI * Math.pow(u, 0.55)) * (1.0 - 0.2 * u * u);
    const halfW = hw * widthProfile;
    const my = u * len;
    const mz = -u * u * curl;

    for (let j = 0; j < cols; j++) {
      const v = j / widthSegs;
      const vn = v * 2 - 1;

      pos[vi * 3] = vn * halfW;
      pos[vi * 3 + 1] = my + cup * (1 - vn * vn) * (1 - u * 0.5);
      pos[vi * 3 + 2] = mz + vn * vn * 0.01 * u;

      uvs[vi * 2] = v;
      uvs[vi * 2 + 1] = u;
      vi++;
    }
  }

  const idx: number[] = [];
  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < widthSegs; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
