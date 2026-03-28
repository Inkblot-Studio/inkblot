uniform vec3 uColorNear;
uniform vec3 uColorFar;
uniform vec3 uRimColor;
uniform float uRimPower;

varying vec3 vNormal;
varying vec3 vView;
varying float vAlong;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float ndv = max(dot(N, V), 0.0);
  float rim = pow(1.0 - ndv, uRimPower);
  float fresnel = pow(1.0 - ndv, 3.15);

  // Deep glassy body replacing flat color mixing
  vec3 base = mix(vec3(0.02, 0.05, 0.08), vec3(0.01, 0.15, 0.22), vAlong);
  
  // Sharp structural highlights
  vec3 coolSpec = vec3(0.48, 0.78, 0.95) * fresnel * 0.85;
  vec3 warmLift = vec3(0.72, 0.58, 0.92) * pow(1.0 - ndv, 5.0) * 0.15;
  
  // Specular reflection from assumed lighting direction
  vec3 L = normalize(vec3(0.5, 0.8, 0.3));
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 64.0) * 0.8;

  vec3 col = base + uRimColor * rim * 1.5 + coolSpec + warmLift + vec3(1.0) * spec;
  gl_FragColor = vec4(col, 0.25); // Lower alpha to blend structurally
}
