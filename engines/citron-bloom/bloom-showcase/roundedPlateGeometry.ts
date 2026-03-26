import { ExtrudeGeometry, Shape } from 'three';

/** XY rounded rectangle in [-w/2,w/2]×[-h/2,h/2], extruded along +Z. */
export function createRoundedPlateGeometry(
  width: number,
  height: number,
  cornerRadius: number,
  depth: number,
  curveSegments = 16,
): ExtrudeGeometry {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(cornerRadius, w, h);
  const shape = new Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(w, h - r);
  shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-w + r, h);
  shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w, -h + r);
  shape.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);

  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments,
  });
}
