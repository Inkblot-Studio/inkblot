attribute vec4 aInstanceColor;
attribute float aPhase;

uniform float uTime;
uniform float uBloom;
uniform float uPulse;
uniform float uWind;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying vec2 vUv;

void main() {
  vColor = aInstanceColor;
  vUv = uv;

  // Eased bloom
  float bloomEase = uBloom * uBloom * (3.0 - 2.0 * uBloom);
  
  // Breathing animation (perfectly synchronized like the CSS loader)
  float breathe = sin(uTime * 1.5) * 0.5 + 0.5;
  
  // Minimum tilt stays cupped (readable from orbit); opens further with bloom.
  float tiltAngle = mix(0.44, mix(0.38, 1.22, breathe), bloomEase);
  
  // Scale
  float petalScale = mix(0.8, mix(0.9, 1.1, breathe), bloomEase);
  
  // Rotate around local X axis
  float c = cos(tiltAngle);
  float s = sin(tiltAngle);
  mat3 rotX = mat3(
    1.0, 0.0, 0.0,
    0.0, c,   s,
    0.0, -s,  c
  );
  
  vec3 p = position * petalScale;
  p = rotX * p;

  mat4 im = instanceMatrix;
  vec4 mv = modelViewMatrix * im * vec4(p, 1.0);
  vView = -mv.xyz;
  
  mat3 nm = mat3(im);
  vNormal = normalize(normalMatrix * nm * rotX * normal);
  gl_Position = projectionMatrix * mv;
}
