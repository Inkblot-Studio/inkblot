attribute float aRing01;
attribute vec4 aVariation;
attribute float aPhase;
attribute vec3 aColor;

uniform float uTime;
uniform float uBloom;
uniform float uWind;
uniform float uPulse;

varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;
varying vec3 vColor;
varying float vRing;
varying vec3 vTangent;

/* ── compact simplex 3D noise (Ashima Arts) ── */
vec3 mod289v(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute4(vec4 x){return mod289v4(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt4(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289v(i);
  vec4 p=permute4(permute4(permute4(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x4=x_*ns.x+ns.yyyy;
  vec4 y4=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x4)-abs(y4);
  vec4 b0=vec4(x4.xy,y4.xy);
  vec4 b1=vec4(x4.zw,y4.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

/* ── rotation helpers ── */
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0,-s,c,0,0,0,1);}

void main(){
  vUv    = uv;
  vColor = aColor;
  vRing  = aRing01;

  vec3 p = position;

  /* 1. per-petal size: inner petals smaller */
  float sizeScale = mix(0.42, 1.0, aRing01) * (0.92 + 0.16 * aVariation.y);
  p.y *= sizeScale;
  p.x *= mix(0.65, 1.0, aRing01);

  /* 2. per-petal curl — light; layout already orients tiers */
  float petalCurl = aVariation.x * 0.22 * uv.y * uv.y;
  mat3 curlMat = rotX(petalCurl);
  p = curlMat * p;

  /* 3. bloom-driven tilt (instance aim is spherical; keep extra tilt modest) */
  float bloomEase = uBloom * uBloom * (3.0 - 2.0 * uBloom);
  float baseTilt  = mix(0.08, 0.28, aRing01);
  float bloomTilt = mix(0.0, 0.95, aRing01) * bloomEase;
  float totalTilt = baseTilt + bloomTilt;
  mat3 tiltMat = rotX(totalTilt);
  p = tiltMat * p;

  /* 4. asymmetry jitter */
  float jitter = aVariation.z * 0.045;
  mat3 jitterMat = rotZ(jitter);
  p = jitterMat * p;

  /* 5. micro-motion (organic life) — stronger at tip */
  float tipMask = uv.y * uv.y;
  float noiseT  = uTime * 0.35 + aPhase;
  float nx = snoise(vec3(p.x * 4.0, p.y * 3.5, noiseT))            * 0.0025 * tipMask;
  float nz = snoise(vec3(p.z * 4.0 + 97.0, p.y * 3.5, noiseT*0.7)) * 0.0018 * tipMask;
  p.x += nx;
  p.z += nz;

  /* 6. environmental wind — orbital phase keeps tiers moving in sequence */
  float windMask  = uv.y * 0.072 * uWind;
  float windPhase = uTime * 0.28 + aPhase;
  p.x += sin(windPhase)       * windMask;
  p.z += cos(windPhase * 0.8) * windMask * 0.32;

  /* 7. gentle breathing */
  float breathe = 1.0 + 0.006 * sin(uTime * 0.65 + aPhase * 0.25) + uPulse * 0.012;
  p *= breathe;

  /* 8. instance transform (phyllotaxis placement) */
  mat3 iRot = mat3(instanceMatrix);
  vec4 world = instanceMatrix * vec4(p, 1.0);
  vec4 mv    = modelViewMatrix * world;
  vView = -mv.xyz;

  /* normal & tangent through all rotations */
  mat3 allRot = iRot * jitterMat * tiltMat * curlMat;
  vNormal  = normalize(normalMatrix * allRot * normal);
  vTangent = normalize(normalMatrix * allRot * vec3(0.0, 1.0, 0.0));

  gl_Position = projectionMatrix * mv;
}
