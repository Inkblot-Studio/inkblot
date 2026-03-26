attribute vec4 aInstanceColor;
attribute float aPhase;

uniform float uTime;
uniform float uBloom;
uniform float uPulse;
uniform float uWind;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying float vTip;

void main() {
  vColor = aInstanceColor;
  float tipMask = smoothstep(0.12, 1.0, uv.y);
  vTip = tipMask;

  // Eased bloom → opening angle so tips don’t “pop” at the end of the scroll ramp.
  float bloomEase = uBloom * uBloom * (3.0 - 2.0 * uBloom);
  float open = bloomEase * 1.57079632679;
  float breathe = 0.04 * uPulse * tipMask * bloomEase;

  vec3 p = position;
  p.x += sin(open) * tipMask * 0.42;
  p.z += sin(uTime * 1.4 + aPhase) * tipMask * 0.05 * uWind;
  p.y += breathe;

  float curl = sin(uTime * 2.0 + uv.x * 8.0) * 0.025 * tipMask * uWind * bloomEase;
  p.x += curl;

  float pulseCurl =
    sin(uTime * 2.15 + uv.y * 11.0 + aPhase * 1.7) *
    0.014 *
    uPulse *
    tipMask *
    bloomEase *
    uWind;
  p.z += pulseCurl;
  p.x += pulseCurl * 0.55;

  mat4 im = instanceMatrix;
  vec4 mv = modelViewMatrix * im * vec4(p, 1.0);
  vView = -mv.xyz;
  mat3 nm = mat3(im);
  vNormal = normalize(normalMatrix * nm * normal);
  gl_Position = projectionMatrix * mv;
}
