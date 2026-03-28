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
  
  // Optical stratification: particles get sharper and more precise instead of blobby
  // Base size is scaled down. Foreground gets sparse large hits.
  float depthStrat = max(-mv.z, 1.0);
  float sz = uSize * mix(0.8, 1.5, vForest);
  
  gl_PointSize = sz * (250.0 / depthStrat);
  gl_Position = projectionMatrix * mv;
}
