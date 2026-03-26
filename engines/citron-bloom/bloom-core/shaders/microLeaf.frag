uniform vec3 uRimColor;
uniform vec3 uCoreColor;
uniform float uRimPower;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying float vAlong;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float ndv = max(dot(N, V), 0.001);
  float rim = pow(1.0 - ndv, uRimPower);
  float tip = smoothstep(0.28, 1.0, vAlong);

  vec3 base = mix(uCoreColor, vColor.rgb, 0.62);
  // Slight teal shift toward petal glass read
  base = mix(base, base * vec3(0.95, 1.02, 1.06), 0.22);

  // Fake translucency on outer tips — matches citron petal subsurface tone
  float backGlow = pow(1.0 - ndv, 2.35) * tip * 0.18;
  vec3 lit = base + uRimColor * rim * 1.32 + uRimColor * backGlow * 0.55;

  float vign = smoothstep(0.15, 1.0, vAlong);
  float alpha = mix(0.9, 0.96, tip);
  gl_FragColor = vec4(lit * (0.86 + 0.14 * vign), alpha);
}
