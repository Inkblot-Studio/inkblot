attribute vec4 aInstanceColor;
attribute float aPhase;
attribute float aAlong;
attribute float aRandom;

uniform float uTime;
uniform float uWind;
uniform float uCohesion;

varying vec3 vNormal;
varying vec3 vView;
varying vec4 vColor;
varying float vAlong;
varying float vDepth;

void main() {
  vAlong = aAlong;
  vColor = aInstanceColor;

  vec3 n = normal;
  float sway =
    sin(uTime * 1.55 + aPhase + position.y * 5.5) * 0.14 * uWind;
  float curl = sin(uTime * 0.85 + aAlong * 14.0 + aRandom * 6.28) * 0.07 * uWind;
  float breathe = sin(uTime * 2.1 + aRandom * 6.28) * 0.04 * uCohesion;
  vec3 pos = position;
  pos.x += sway + breathe;
  pos.z += curl;
  pos.y += sin(uTime * 1.1 + aPhase * 0.5) * 0.035 * uWind;

  mat4 im = instanceMatrix;
  vec4 worldPos = modelMatrix * im * vec4(pos, 1.0);
  vec4 mv = viewMatrix * worldPos;
  vView = -mv.xyz;
  vDepth = length(mv.xyz);

  mat3 nm = mat3(im);
  vNormal = normalize(normalMatrix * nm * n);
  gl_Position = projectionMatrix * mv;
}
