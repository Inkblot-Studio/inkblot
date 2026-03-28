uniform float uTime;
uniform vec2 uPointer;
uniform float uPointerStrength;

// --- Simplex / SDF logic for fields ---

// Basic 3D noise for continuous flow
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}

float valueNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash3(i + vec3(0, 0, 0)).x;
  float n100 = hash3(i + vec3(1, 0, 0)).x;
  float n010 = hash3(i + vec3(0, 1, 0)).x;
  float n110 = hash3(i + vec3(1, 1, 0)).x;
  float n001 = hash3(i + vec3(0, 0, 1)).x;
  float n101 = hash3(i + vec3(1, 0, 1)).x;
  float n011 = hash3(i + vec3(0, 1, 1)).x;
  float n111 = hash3(i + vec3(1, 1, 1)).x;
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

// Curl noise generates continuous divergence-free vector fields
vec3 curlNoise(vec3 p) {
  float e = 0.1;
  float dx = valueNoise(p + vec3(e, 0.0, 0.0)) - valueNoise(p - vec3(e, 0.0, 0.0));
  float dy = valueNoise(p + vec3(0.0, e, 0.0)) - valueNoise(p - vec3(0.0, e, 0.0));
  float dz = valueNoise(p + vec3(0.0, 0.0, e)) - valueNoise(p - vec3(0.0, 0.0, e));
  return normalize(vec3(dz - dy, dx - dz, dy - dx) + 1e-4);
}

// SDF Cylinder for vertical stem attraction
float sdCylinder(vec3 p, vec3 c) {
  return length(p.xz - c.xy) - c.z;
}

// SDF Sphere for bud/flower core attraction
float sdSphere(vec3 p, float s) {
  return length(p) - s;
}

void main() {
  vec2 vUv = gl_FragCoord.xy / resolution.xy;
  vec4 s = texture2D(texturePosition, vUv);
  vec3 p = s.xyz;
  float kind = s.a;

  // 1. SCALAR FIELD (ATTRACTION TO STRUCTURE)
  // We want particles to orbit a central vertical stem, and bundle near the top bud
  
  vec3 structAttract = vec3(0.0);
  
  // Stem SDF (cylinder on Y axis)
  float dStem = sdCylinder(p, vec3(0.0, 0.0, 0.08)); 
  
  // Bud SDF (sphere near top)
  float dBud = sdSphere(p - vec3(0.0, 1.2, 0.0), 0.35);
  
  // Smooth min to blend the two SDFs into one continuous structure field
  float k = 0.5;
  float h = clamp(0.5 + 0.5 * (dBud - dStem) / k, 0.0, 1.0);
  float dStruct = mix(dBud, dStem, h) - k * h * (1.0 - h);
  
  // Calculate gradient of the SDF to pull particles strictly toward the surface
  vec2 e = vec2(0.02, 0.0);
  vec3 grad = normalize(vec3(
    sdCylinder(p + e.xyy, vec3(0.0, 0.0, 0.08)) - sdCylinder(p - e.xyy, vec3(0.0, 0.0, 0.08)),
    0.0, // Limit vertical pulling to let flow field drive Y axis
    sdCylinder(p + e.yyx, vec3(0.0, 0.0, 0.08)) - sdCylinder(p - e.yyx, vec3(0.0, 0.0, 0.08))
  ));
  
  // If particle is too far, pull it in strongly. If close, let it ride the surface.
  if (dStruct > 0.05) {
    structAttract = -grad * (0.015 / (dStruct + 0.1));
  }

  // 2. VECTOR FIELD (DIRECTIONAL FLOW)
  // Continuous curl noise moving upwards
  vec3 flow = curlNoise(p * 0.8 + vec3(0.0, uTime * 0.2, 0.0));
  flow.y += 0.5; // Upward bias
  flow = normalize(flow) * 0.008;

  // 3. INTERACTION FIELD (REPULSION)
  vec3 repel = vec3(0.0);
  vec2 delta = p.xz - uPointer;
  float dP = length(delta) + 0.1;
  if (dP < 1.0) {
    repel = vec3(-delta.x, 0.05, -delta.y) * (uPointerStrength * 0.6 / (dP * dP));
  }

  // Apply fields
  p += structAttract + flow + repel;

  // Lifetime / Respawn
  // If a particle floats too high, reset it to the bottom of the structure
  if (p.y > 2.5 || length(p) > 3.0) {
    float angle = hash3(p + uTime).x * 6.28;
    float radius = 0.2 + hash3(p - uTime).y * 0.4;
    p = vec3(cos(angle) * radius, -0.5 + hash3(p).z * 0.2, sin(angle) * radius);
  }

  gl_FragColor = vec4(p, kind);
}
