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

  vec3 base = mix(uColorNear, uColorFar, smoothstep(0.0, 1.0, vAlong));
  vec3 coolSpec = vec3(0.48, 0.78, 0.95) * fresnel * 0.24;
  vec3 warmLift = vec3(0.72, 0.58, 0.92) * pow(1.0 - ndv, 5.0) * 0.08;

  vec3 col = base + uRimColor * rim * 1.22 + coolSpec + warmLift;
  gl_FragColor = vec4(col, 1.0);
}
