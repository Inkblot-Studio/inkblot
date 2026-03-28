uniform vec3 uRimColor;
uniform vec3 uDeepColor;
uniform float uRimPower;
uniform float uBloom;
uniform vec3 uAccentGlow;
uniform float uTime;
uniform float uRipplePhase;
uniform float uRippleStrength;
uniform vec3 uSH[9]; // Spherical Harmonics for GI

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying vec2 vUv;

/** Spherical Harmonics evaluation for Global Illumination */
vec3 calcSH(vec3 normal) {
  vec3 result = uSH[0];
  result += uSH[1] * normal.y;
  result += uSH[2] * normal.z;
  result += uSH[3] * normal.x;
  
  vec3 n2 = normal * normal;
  result += uSH[4] * normal.x * normal.y;
  result += uSH[5] * normal.y * normal.z;
  result += uSH[6] * (3.0 * n2.z - 1.0);
  result += uSH[7] * normal.x * normal.z;
  result += uSH[8] * (n2.x - n2.y);
  
  return max(result, vec3(0.0));
}

/** View-space env: ink void (#020617 family) + cool sky rim — no muddy warm shift. */
vec3 fakeEnvReflect(vec3 R) {
  float up = R.y * 0.5 + 0.5;
  float horizon = exp(-pow(R.y * 2.2 - 0.12, 2.0) * 3.8);
  vec3 voidCol = vec3(0.008, 0.015, 0.035);
  vec3 zenith = vec3(0.12, 0.38, 0.72);
  vec3 base = mix(voidCol, zenith, up);
  base += vec3(0.08, 0.2, 0.36) * horizon * 0.45;
  base += vec3(0.45, 0.72, 1.0) * pow(max(R.x, 0.0), 3.4) * 0.22;
  base += vec3(0.25, 0.55, 0.95) * pow(max(-R.x, 0.0), 3.0) * 0.06;
  base += vec3(0.75, 0.88, 1.0) * pow(max(-R.z, 0.0), 3.2) * 0.12;
  return base;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
  return length( pa - ba*h ) - r;
}

void main() {
  // Capsule shape masking
  float aspect = 0.12 / 0.45;
  vec2 p = vUv;
  p.x = (p.x - 0.5);
  p.y = (p.y - 0.5) / aspect;
  
  float r = 0.5;
  float h = 0.5 / aspect - r;
  float d = sdCapsule(p, vec2(0.0, -h), vec2(0.0, h), r);
  
  if (d > 0.0) discard;

  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);

  float ndv = max(dot(N, V), 0.001);
  float fresnel = 0.035 + 0.965 * pow(1.0 - ndv, 4.5);

  // Gradient from vertex color
  vec3 tint = vColor.rgb;
  
  // Global illumination acting as ambient lighting base
  vec3 shLight = calcSH(N);
  vec3 subsurface = tint * (shLight + 0.52);
  
  // Frosted glass see-through based on fresnel and bloom state
  float bb = uBloom * uBloom;
  float seeThrough = mix(0.4, 0.85, 1.0 - fresnel) * (0.8 + 0.2 * bb);

  vec3 I = normalize(-vView);
  vec3 R = reflect(I, N);
  vec3 env = fakeEnvReflect(R);

  vec3 col = subsurface * seeThrough;
  
  // Add crisp reflection
  col += env * fresnel * 0.85;
  
  // Clean CSS-like border
  float border = smoothstep(-0.06, 0.0, d);
  vec3 borderColor = mix(vec3(0.15, 0.88, 0.55), vec3(0.35, 0.75, 1.0), 0.35);
  col = mix(col, borderColor, border);
  
  // Subtle inner shadow / bevel
  col += uAccentGlow * smoothstep(-0.15, 0.0, d) * 0.15 * (0.5 + 0.5 * bb);

  // Sharp Specular Highlight representing polished glass
  vec3 L = normalize(vec3(0.5, 0.8, 0.3));
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 128.0) * 0.9;
  col += vec3(1.0) * spec;

  float alpha = mix(0.34, 0.95, fresnel);
  alpha = mix(alpha, min(alpha + 0.1, 1.0), bb * 0.35);

  gl_FragColor = vec4(col, alpha);
}
