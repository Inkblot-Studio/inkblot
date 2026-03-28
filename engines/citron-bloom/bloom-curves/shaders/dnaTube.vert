uniform float uTime;
uniform float uWind;
uniform float uTwist;

varying vec3 vNormal;
varying vec3 vView;
varying float vAlong;

void main() {
  vAlong = uv.x;
  
  // Remove high frequency jitter, use only subtle slow breathe to retain crystal structure
  float wave = sin(uTime * 0.5 + uv.x * 3.0) * 0.005 * uWind;
  vec3 p = position + normal * wave;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = -mv.xyz;
  
  // Maintain true structural normal, no fake displacement mapping
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
