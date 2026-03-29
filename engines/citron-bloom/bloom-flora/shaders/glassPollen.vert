attribute vec4 aSeed;
attribute float aLayer;
attribute vec3 aColor;
attribute vec3 aBudCore;

uniform float uTime;
uniform float uDrift;
uniform float uBurst;
uniform float uAmbient;
uniform float uRevealMotion;
uniform float uSpread;
uniform vec3 uCameraLocal;
uniform vec3 uCamRightLocal;
uniform vec3 uCamUpLocal;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec4 vSeed;
varying float vLayer;
varying vec3 vColor;
/** Eased spread [0,1] — matches center lerp for emerge in fragment */
varying float vSpreadTe;

void main() {
  vSeed = aSeed;
  vLayer = aLayer;
  vColor = aColor;
  vec3 p = position;
  mat3 iRot = mat3(instanceMatrix);
  vec3 trans = instanceMatrix[3].xyz;

  float te = clamp(uSpread, 0.0, 1.0);
  te = te * te * (3.0 - 2.0 * te);
  vSpreadTe = te;
  float rS = mix(0.38, 1.0, smoothstep(0.0, 0.22, te));
  vec3 center = mix(aBudCore, trans, te);
  vec3 wp = center + iRot * (p * rS);

  float layerF = aLayer * 0.5;
  float rm = clamp(uRevealMotion, 0.0, 1.0);
  float teMotion = te * rm;

  vec4 baseWorldH = modelMatrix * vec4(wp, 1.0);
  vec4 clipBase = projectionMatrix * viewMatrix * baseWorldH;
  float cw = max(abs(clipBase.w), 1e-4);
  vec2 ndcB = clipBase.xy / cw;
  float rim = max(abs(ndcB.x), abs(ndcB.y));
  float screenFill = mix(0.22, 1.0, smoothstep(1.55, 0.08, rim));

  vec3 cr = normalize(uCamRightLocal + vec3(1e-5));
  vec3 cu = normalize(uCamUpLocal + vec3(1e-5));

  vec3 q = wp * 2.4 + vec3(aSeed.x, aSeed.y, aSeed.z) * 5.7 + vec3(aSeed.w * 3.1, 0.0, 0.0);
  float tt = uTime * 0.33;
  vec3 fld = vec3(
    sin(q.x * 1.7 + tt) * cos(q.y * 1.3 - tt * 0.7) + sin(q.z * 0.9 + aSeed.w * 4.0) * 0.35,
    sin(q.y * 1.5 + tt * 0.8) * cos(q.z * 1.2 + tt * 0.5) + sin(q.x * 1.1) * 0.32,
    sin(q.z * 1.4 - tt * 0.6) * cos(q.x * 1.25 + tt) + sin(q.y * 0.95) * 0.3
  );
  float fldMag = uDrift * teMotion * (0.55 + 0.45 * uBurst) * screenFill;
  wp += fld * fldMag * (0.14 + layerF * 0.05);

  float ang = aSeed.x * 6.2831853 + aSeed.y * 2.17;
  float rad01 = pow(mix(0.08, 1.12, aSeed.z), 0.58);
  vec2 disk = vec2(cos(ang), sin(ang)) * rad01;
  float planeMag = uDrift * teMotion * (0.54 + 0.46 * screenFill + 0.18 * uBurst);
  wp += (cr * disk.x + cu * disk.y) * planeMag;

  vec3 emit = vec3(0.0, 0.12, 0.0);
  vec3 fromEmit = wp - emit;
  vec3 radial = normalize(fromEmit + vec3(0.00012));
  float w1 = 0.86 + 0.14 * sin(uTime * (0.38 + aSeed.x * 0.22) + aSeed.y * 6.28318);
  float w2 = 0.88 + 0.12 * sin(uTime * (0.31 + aSeed.z * 0.18) + aSeed.w * 5.27 + 1.7);

  float amb = uAmbient * (0.52 + layerF * 0.28) * teMotion;
  float reach =
    (0.17 + layerF * 0.12) * (0.45 + uBurst * 0.75) * uDrift * teMotion * mix(0.45, 1.0, screenFill);

  vec3 outXZ = normalize(vec3(wp.x, 0.0, wp.z) + vec3(0.00015));
  vec3 cone = normalize(vec3(wp.x, 0.18 + abs(fromEmit.y) * 0.22, wp.z) + vec3(0.00016));

  wp += radial * reach * w1 * 0.72;
  wp += outXZ * reach * w1 * 0.38;
  wp.y += reach * w2 * 0.32;
  wp += cone * reach * w2 * 0.34;

  wp += radial * amb * 0.42;
  wp += outXZ * amb * 0.3;
  wp.y += amb * 0.28;

  float wide = uDrift * teMotion * (0.16 + layerF * 0.08) * screenFill;
  wp.xz += outXZ.xz * wide * (0.5 + aSeed.z * 0.5);

  vec3 puff = vec3(
    sin(uTime * 0.65 + aSeed.x * 7.0),
    cos(uTime * 0.58 + aSeed.y * 6.2),
    sin(uTime * 0.62 + aSeed.z * 7.5)
  );
  wp += puff * (0.016 + layerF * 0.026) * uDrift * (0.32 + uBurst * 0.45) * teMotion * mix(0.5, 1.0, screenFill);

  vec3 toCam = uCameraLocal - wp;
  float cd = length(toCam);
  float camPad = 0.48 + layerF * 0.08;
  if (cd < camPad && cd > 1e-6) {
    wp -= normalize(toCam) * (camPad - cd);
  }

  vec4 worldP = modelMatrix * vec4(wp, 1.0);
  mat3 worldRot = mat3(modelMatrix) * iRot;
  vWorldNormal = normalize(worldRot * normal);
  vViewDir = normalize(cameraPosition - worldP.xyz);

  vec4 mvPosition = viewMatrix * worldP;
  gl_Position = projectionMatrix * mvPosition;
}
