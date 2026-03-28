uniform vec3 uColorCore;
uniform vec3 uColorEdge;
uniform vec3 uForestCore;
uniform vec3 uForestEdge;

varying float vDepth;
varying vec2 vRef;
varying float vForest;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  
  // Hard circular cutoff for crispness instead of soft edge
  if (r > 1.0) discard;
  
  // Stratification handling - larger closer particles get a sharper optical look
  float opticalCore = smoothstep(1.0, 0.8, r);
  
  // Simple additive layering using the precise fields
  vec3 core = mix(uColorCore, uForestCore, vForest);
  vec3 edge = mix(uColorEdge, uForestEdge, vForest);
  
  // Create a sharp, crystal-like dot instead of a blurry sphere
  vec3 col = mix(core, edge, r * r);
  
  // Extremely low per-particle alpha so density accumulates via structure, not individual blobs
  float alpha = mix(0.15, 0.08, vForest) * opticalCore;
  
  // Sharpen highlights based on depth stringency
  col += vec3(1.0) * pow(1.0 - r, 4.0) * 0.5;

  gl_FragColor = vec4(col, alpha);
}
