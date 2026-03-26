uniform sampler2D uPositions;
uniform float uSize;

attribute vec2 aRef;

varying float vDepth;
varying vec2 vRef;
varying float vForest;

void main() {
  vRef = aRef;
  vec4 samp = texture2D(uPositions, aRef);
  vec3 p = samp.xyz;
  vForest = step(0.1, samp.a);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  float sz = uSize * mix(1.0, 2.35, vForest);
  gl_PointSize = sz * (300.0 / max(-mv.z, 0.5));
  gl_Position = projectionMatrix * mv;
}
