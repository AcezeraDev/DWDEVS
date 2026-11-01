// Ashima 3D simplex noise (MIT).
export const noise3D = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
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
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

export const bgVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const bgFragment = /* glsl */ `
uniform float uTime;
uniform float uScroll;
uniform vec2 uMouse;
uniform vec2 uRes;
uniform vec2 uHole;
uniform float uHoleR;
uniform float uHoleAmt;
uniform float uWave;
varying vec2 vUv;
${noise3D}

float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

// Three octaves are enough for soft gas; the fourth only adds cost
float fbm(vec3 p){
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * snoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

// A distant two-armed spiral galaxy: c = centre, s = size, tilt squashes it, rot spins it
float galaxy(vec2 p, vec2 c, float s, float tilt, float rot){
  vec2 q = p - c;
  float cr = cos(rot), sr = sin(rot);
  q = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
  q.y /= tilt;
  q /= s;
  float r = length(q) + 1e-4;
  float a = atan(q.y, q.x);
  float arms = 0.55 + 0.45 * cos(2.0 * a - log(r) * 5.0 + uTime * 0.05);
  float disk = exp(-r * 3.2) * arms;
  float core = exp(-r * r * 60.0);
  return disk * 0.9 + core * 1.4;
}

// Shooting star i: a short streak crossing a random part of the sky every few seconds
float meteor(vec2 p, float aspect, float i){
  float period = 7.0 + i * 3.0;
  float t = uTime / period + i * 0.37;
  float id = floor(t);
  float f = fract(t);
  float life = smoothstep(0.0, 0.04, f) * (1.0 - smoothstep(0.06, 0.12, f));
  if (life <= 0.0) return 0.0;
  vec2 start = vec2(hash21(vec2(id, i)) * aspect, 0.55 + hash21(vec2(i, id)) * 0.45);
  vec2 dir = normalize(vec2(-1.0, -0.45 - hash21(vec2(id + 3.0, i)) * 0.3));
  vec2 head = start + dir * f * 6.0;
  vec2 d = p - head;
  float along = dot(d, -dir);
  float across = abs(dot(d, vec2(-dir.y, dir.x)));
  float tail = smoothstep(0.22, 0.0, along) * step(0.0, along);
  return tail * smoothstep(0.0025, 0.0, across) * life;
}

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 p = vUv; p.x *= aspect;
  vec2 m = uMouse; m.x *= aspect;

  // Black hole: bend the backdrop with the point-lens map (source = image - E^2 / image)
  vec2 h = uHole; h.x *= aspect;
  vec2 ho = p - h;
  float hd = length(ho) + 1e-4;
  float E = uHoleR;
  vec2 src = p - ho * (E * E) / (hd * hd) * uHoleAmt;
  // Click: a gravitational wave rolls out of the hole and ripples the grid as it passes
  float waveR = E + (1.0 - uWave) * 1.6;
  float wave = exp(-pow((hd - waveR) * 14.0, 2.0)) * uWave;
  src += ho / hd * wave * 0.04;
  float shadow = mix(1.0, smoothstep(E * 0.9, E * 1.08, hd), uHoleAmt);
  float t = uTime * 0.05;

  vec3 base = vec3(0.027, 0.031, 0.039);
  vec3 lime = vec3(0.784, 0.941, 0.192);
  vec3 teal = vec3(0.04, 0.30, 0.28);
  vec3 violet = vec3(0.20, 0.09, 0.36);
  vec3 rose = vec3(0.42, 0.10, 0.28);

  // Nebula: drifting gas that slides up slower than the page (parallax), teal and violet with
  // lime filaments, cut by dark dust lanes
  vec2 np = src * 0.9 + vec2(0.0, uScroll * 1.6);
  float gas = fbm(vec3(np * 1.2, t));
  float gas2 = fbm(vec3(np * 2.1 + 5.0, t * 1.3));
  float dust = smoothstep(0.05, 0.45, abs(fbm(vec3(np * 1.7 - 3.0, t * 0.7))));
  float g1 = smoothstep(-0.1, 0.75, gas);
  float g2 = smoothstep(0.15, 0.8, gas2);
  vec3 col = base;
  col = mix(col, teal * 0.75, g1 * 0.7);
  col = mix(col, violet, g2 * (1.0 - g1 * 0.4) * 0.7);
  col += rose * 0.18 * g2 * g1;
  col += lime * 0.14 * smoothstep(0.55, 0.9, gas * gas2 * 3.0);
  col *= mix(1.0, 0.55 + 0.45 * dust, 0.7);

  // Distant galaxies, drifting up with the page at their own (slow) speed. Added after the
  // vignette below, since they mostly sit near the edges where it would swallow them.
  float sy = uScroll * 2.2;
  vec3 gal = vec3(0.0);
  gal += vec3(0.75, 0.82, 1.0) * 0.3 * galaxy(src, vec2(0.12 * aspect, fract(0.82 + sy * 0.6) * 1.6 - 0.3), 0.11, 0.45, 0.6);
  gal += mix(lime, vec3(1.0), 0.4) * 0.24 * galaxy(src, vec2(0.86 * aspect, fract(0.3 + sy * 0.4) * 1.4 - 0.2), 0.08, 0.6, -0.9);
  gal += vec3(0.9, 0.6, 1.0) * 0.22 * galaxy(src, vec2(0.42 * aspect, fract(0.05 + sy * 0.5) * 1.5 - 0.25), 0.06, 0.35, 2.1);

  float d = distance(p, m);
  float halo = smoothstep(0.6, 0.0, d);
  col += lime * 0.07 * halo;

  // Interactive grid that brightens around the cursor
  vec2 gp = src * 18.0;
  gp.y += uScroll * 14.0;
  vec2 fw = fwidth(gp);
  vec2 gl = abs(fract(gp - 0.5) - 0.5) / fw;
  float line = 1.0 - min(min(gl.x, gl.y), 1.0);
  col += mix(vec3(1.0), lime, halo) * line * (0.02 + halo * 0.13);

  // Shooting stars
  float shoot = meteor(p, aspect, 0.0) + meteor(p, aspect, 1.0) + meteor(p, aspect, 2.0);
  col += mix(vec3(1.0), lime, 0.3) * shoot * 0.9;

  float v = smoothstep(1.25, 0.25, distance(vUv, vec2(0.5)));
  col *= mix(0.45, 1.0, v);
  col += gal;

  // Shadow of the horizon plus a faint glow where the lensed light piles up
  col += lime * 0.06 * exp(-abs(hd - E) * 26.0) * uHoleAmt;
  col += lime * 0.18 * wave;
  col *= shadow;
  gl_FragColor = vec4(col, 1.0);
}
`;


// Journey particles: every point stores where it sits in each chapter of the page and blends
// between them with uMorph. All chapters after the hero orbit the black hole, in its disk frame:
// 0 starfield (lensed, swallowed during the dive), 1 spiral galaxy around the hole,
// 2 gyroscope rings, 3 hyperspace jet streaming out of the hole past the camera,
// 4 wide halo around the contact button.
export const journeyVertex = /* glsl */ `
uniform float uTime;
uniform float uMorph;
uniform float uIntro;
uniform float uDive;
uniform float uPulse;
uniform float uSize;
uniform float uAspect;
uniform float uScale;
uniform float uFlow;
uniform float uClear;
uniform vec2 uMouse;
uniform vec3 uHole;
uniform mat3 uDisk;
uniform vec3 uCamPos;
uniform float uLens;
uniform float uCharge;
uniform float uOrbitR;
attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aP3;
attribute vec3 aP4;
attribute float aRand;
varying float vAlpha;
varying vec3 vColor;

vec3 rotX(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); }
vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
vec3 rotZ(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x - s*p.y, s*p.x + c*p.y, p.z); }

void main(){
  // Stagger the morph per point so chapters pour into each other; none while resting.
  float frac = abs(fract(uMorph + 0.5) - 0.5);
  float m = clamp(uMorph + (aRand - 0.5) * 0.45 * smoothstep(0.0, 0.25, frac), 0.0, 4.0);

  // 0: distant stars, drifting very slowly
  vec3 p0 = rotY(position, uTime * 0.004);

  // 1: spiral galaxy (r, arm angle, height). Inner stars lap the outer ones.
  float gr = aP1.x * uScale;
  float ga = aP1.y - uTime * 0.35 / (0.6 + aP1.x * 0.35);
  vec3 p1 = uHole + uDisk * vec3(cos(ga) * gr, aP1.z * uScale, sin(ga) * gr);

  // 2: orbits, in the hole's disk plane. Ring 0 is the path the service planets ride (uOrbitR),
  // rings 1 and 2 sit inside and outside it, and the rest is a loose halo around the core.
  float ring = floor(aP2.x + 0.5);
  float rr = ring < 0.5 ? uOrbitR : (ring < 1.5 ? uOrbitR * 0.62 : uOrbitR * 1.38);
  float ra = aP2.y + uTime * (0.12 + ring * 0.05);
  float spread = rr + aP2.z * (ring < 0.5 ? 0.35 : 1.3);
  vec3 g = vec3(cos(ra) * spread, aP2.z * 0.25, sin(ra) * spread);
  if (ring > 2.5) g = normalize(vec3(cos(ra), sin(ra * 1.3) * 0.4, sin(ra * 0.7 + aP2.z * 9.0))) * (1.2 + abs(aP2.z) * 6.0);
  vec3 p2 = uHole + uDisk * (g * uScale);

  // 3: hyperspace. Points leave the hole as a thin jet and widen into a tube that rushes past.
  float t = fract(aP3.z + uFlow * (0.6 + aRand * 0.4));
  // Spread along the jet instead of piling up at the mouth (where it all adds up to white)
  float tw = pow(t, 1.35);
  vec3 axis = normalize(uCamPos - uHole);
  vec3 side = normalize(cross(axis, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(side, axis);
  float ta = aP3.x + t * 2.2;
  float tr = mix(0.25, aP3.y, tw);
  vec3 p3 = mix(uHole, uCamPos + axis * 2.0, tw) + (side * cos(ta) + up * sin(ta)) * tr;

  // 4: halo. Gas spiralling into the hole parked behind the contact button: each point drifts
  // from its rim radius down to the inner edge and starts over, so the whole thing reads as
  // being drawn toward the button.
  float hr = mix(aP4.y, 2.2, fract(aRand * 7.0 + uTime * 0.035));
  float ha = aP4.x - uTime * 0.6 / sqrt(hr) + log(hr) * 1.4;
  vec3 p4 = uHole + uDisk * (vec3(cos(ha) * hr, aP4.z * (0.4 + hr * 0.12), sin(ha) * hr) * uScale);

  float w0 = clamp(1.0 - abs(m - 0.0), 0.0, 1.0);
  float w1 = clamp(1.0 - abs(m - 1.0), 0.0, 1.0);
  float w2 = clamp(1.0 - abs(m - 2.0), 0.0, 1.0);
  float w3 = clamp(1.0 - abs(m - 3.0), 0.0, 1.0);
  float w4 = clamp(1.0 - abs(m - 4.0), 0.0, 1.0);
  vec3 pos = p0 * w0 + p1 * w1 + p2 * w2 + p3 * w3 + p4 * w4;

  // Swirl around the hole while travelling between chapters
  float between = 1.0 - max(max(max(w0, w1), max(w2, w3)), w4);
  vec3 rel = pos - uHole;
  pos = uHole + rotZ(rel, between * (1.5 + aRand * 2.0));
  pos += vec3(sin(aRand * 40.0 + uTime), cos(aRand * 31.0 + uTime * 1.3), sin(aRand * 17.0 + uTime * 0.7)) * between * 1.4;

  // Dive: everything spirals into the hole as the hero gets swallowed
  float k = smoothstep(aRand * 0.45, aRand * 0.45 + 0.55, uDive);
  pos = uHole + rotZ(pos - uHole, k * k * 4.0) * (1.0 - k * 0.985);

  // Held click: the hole reels everything in, spinning it faster the closer it gets
  float pull = uCharge * (0.25 + aRand * 0.35);
  vec3 rc = pos - uHole;
  pos = uHole + rotZ(rc, pull * 2.2 / (0.4 + length(rc) * 0.08)) * (1.0 - pull * 0.45);

  // Intro: everything bursts out of the singularity
  pos = mix(pos, uHole + (pos - uHole) * 0.01, uIntro);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);

  // Gravitational lensing (point lens) on the points behind the hole: they slide out of the
  // shadow and bunch up along the Einstein ring, matching the raymarched disk.
  vec4 hv = viewMatrix * vec4(uHole, 1.0);
  float behind = hv.z - mv.z;
  if (uLens > 0.0 && behind > 0.0 && hv.z < 0.0) {
    vec2 q = mv.xy * (hv.z / mv.z) - hv.xy;
    float b = length(q) + 1e-4;
    float e2 = uLens * uLens * smoothstep(0.0, 1.5, behind) * min(0.7 + 0.08 * behind, 2.2);
    q *= 0.5 * (b + sqrt(b * b + 4.0 * e2)) / b;
    mv.xy = (hv.xy + q) * (mv.z / hv.z);
  }

  // Cursor: a soft eddy (ring-shaped, so no hole opens right under the pointer).
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
  float dist = length(d);
  float near = smoothstep(0.22, 0.0, dist) * smoothstep(0.0, 0.08, dist);
  vec2 dir = normalize(d + 1e-4);
  vec2 tangent = vec2(-dir.y, dir.x);
  mv.xy += (tangent + dir * 0.3) * near * (-mv.z) * 0.03;
  // Click: shockwave
  mv.xy += normalize(mv.xy + 1e-4) * uPulse * (-mv.z) * 0.08 * (0.4 + aRand);

  gl_Position = projectionMatrix * mv;
  float size = (0.5 + aRand * 1.5) * uSize * (1.0 + near * 0.25);
  float twinkle = 0.75 + 0.25 * sin(uTime * (1.0 + aRand * 3.0) + aRand * 40.0);
  // Stars are far away: fixed size and a twinkle instead of shrinking to nothing.
  gl_PointSize = mix(min(size / -mv.z, 48.0), (1.0 + aRand * 2.2) * uSize * 0.035 * twinkle, w0);

  vAlpha = smoothstep(0.3, 2.5, -mv.z) * (0.35 + aRand * 0.65);
  // Keep the copy readable: points fade out over the left (text) side of the screen.
  vec2 sp = gl_Position.xy / gl_Position.w;
  vAlpha *= mix(1.0, smoothstep(-0.15, 0.3, sp.x), uClear * (1.0 - w0));

  vec3 lime = vec3(0.784, 0.941, 0.192);
  vec3 teal = vec3(0.12, 0.82, 0.73);
  vec3 cream = vec3(0.96, 0.95, 0.9);
  vec3 star = aRand < 0.7 ? cream : (aRand < 0.88 ? teal : lime);
  // Galaxy: white-hot core, lime arms, teal rim
  vec3 gal = mix(cream, lime, smoothstep(0.3, 1.6, aP1.x));
  gal = mix(gal, teal, smoothstep(2.4, 4.6, aP1.x) * (0.5 + aRand * 0.5));
  vec3 gyro = ring < 0.5 ? lime : (ring < 1.5 ? teal : (ring < 2.5 ? mix(lime, cream, 0.4) : cream));
  // Jet: pale lime leaving the hole, lime mid-way, teal as it rushes past
  vec3 jet = mix(mix(lime, cream, 0.35), lime, smoothstep(0.0, 0.2, t));
  jet = mix(jet, teal, smoothstep(0.55, 1.0, t) * aRand);
  vec3 halo = mix(mix(lime, cream, 0.12), lime * 0.75, smoothstep(2.4, 4.0, hr));
  halo = mix(halo, teal, smoothstep(4.2, 5.4, hr) * 0.4);
  vec3 col = star * w0 + gal * w1 + gyro * w2 + jet * w3 + halo * w4 + lime * between;
  // The jet thins out right at the mouth of the hole and as it passes the camera
  vAlpha *= mix(1.0, smoothstep(0.0, 0.16, t) * (1.0 - smoothstep(0.85, 1.0, t)), w3);
  vAlpha *= mix(1.0, 0.55 * twinkle, w0);
  // Halo gas fades in at its rim and out as it reaches the shadow
  vAlpha *= mix(1.0, smoothstep(2.2, 2.8, hr) * (1.0 - smoothstep(4.6, 5.4, hr) * 0.6), w4);
  // The loose halo around the core piles up right on the disk, so keep it faint
  vAlpha *= mix(1.0, ring > 2.5 ? 0.22 : 1.0, w2);
  vColor = mix(col, cream, near * 0.15);
}
`;

export const journeyFragment = /* glsl */ `
uniform float uOpacity;
varying float vAlpha;
varying vec3 vColor;
void main(){
  float d = distance(gl_PointCoord, vec2(0.5));
  float s = pow(1.0 - smoothstep(0.0, 0.5, d), 2.2);
  gl_FragColor = vec4(vColor, s * vAlpha * uOpacity);
}
`;

// Black hole, raymarched on a camera-facing quad. Each pixel's ray is bent toward the hole
// (Schwarzschild approximation: a = -1.5 h^2 r / |r|^5, in units of the Schwarzschild radius).
// Every time a ray crosses the disk plane it picks up light, so the far side of the disk shows
// up as an arch over the shadow and a thin arc under it, and rays that graze the photon sphere
// build the photon ring.
export const holeVertex = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const holeFragment = /* glsl */ `
uniform float uTime;
uniform float uAmt;
uniform float uRs;
uniform vec3 uHole;
uniform mat3 uToLocal;
uniform float uGlow;
uniform float uFlash;
varying vec3 vWorld;
varying vec2 vUv;
${noise3D}

#define BOUND 10.5
#define DISK_IN 2.6
#define DISK_OUT 8.5

vec3 toLocal(vec3 w){ return uToLocal * w; }

vec4 diskSample(vec3 hit, vec3 rd){
  float r = length(hit.xz);
  float x = (r - DISK_IN) / (DISK_OUT - DISK_IN);
  if (x < 0.0 || x > 1.0) return vec4(0.0);
  float a = atan(hit.z, hit.x);
  // Keplerian shear: inner gas laps the outer gas, which winds the turbulence into streaks.
  // Left alone the winding grows forever and turns into fine vinyl-like stripes, so two copies
  // with phases half a cycle apart are cross-faded and each resets while it is invisible.
  float T = uTime * 4.8;
  float cycle = 7.0;
  float t1 = mod(T, cycle);
  float t2 = mod(T + cycle * 0.5, cycle);
  float w1 = 1.0 - abs(t1 / cycle * 2.0 - 1.0);
  float kep = pow(r, -1.5);
  vec3 q1 = vec3(cos(a - t1 * kep) * 1.6, sin(a - t1 * kep) * 1.6, r * 1.4);
  vec3 q2 = vec3(cos(a - t2 * kep) * 1.6, sin(a - t2 * kep) * 1.6, r * 1.4 + 19.0);
  float n1 = snoise(q1) * 0.6 + snoise(q1 * 2.3 + 7.0) * 0.4;
  float n2 = snoise(q2) * 0.6 + snoise(q2 * 2.3 + 7.0) * 0.4;
  float n = mix(n2, n1, w1);
  float density = smoothstep(0.0, 0.05, x) * (1.0 - smoothstep(0.45, 1.0, x));
  density *= max(0.5 + 0.55 * n + 0.1 * sin(r * 7.0 + n * 4.0), 0.0);

  // Relativistic beaming: the side orbiting toward the viewer is far brighter
  vec3 vel = normalize(vec3(-hit.z, 0.0, hit.x));
  float beta = sqrt(0.5 / r);
  float g = sqrt(1.0 - beta * beta) / (1.0 - beta * dot(vel, -rd));
  float shift = sqrt(1.0 - 1.0 / r);
  float lum = density * pow(g, 3.0) * shift * (1.5 - x);

  vec3 hot = vec3(1.0, 0.98, 0.9);
  vec3 lime = vec3(0.784, 0.941, 0.192);
  vec3 teal = vec3(0.12, 0.82, 0.73);
  vec3 col = mix(hot, lime, smoothstep(0.02, 0.35, x));
  col = mix(col, teal, smoothstep(0.45, 0.95, x));
  // Beamed gas runs hotter (whiter), receding gas cooler (teal)
  col = mix(col, hot, clamp((g - 1.1) * 0.8, 0.0, 0.6));
  col = mix(teal * 0.8, col, clamp(g, 0.0, 1.0));
  // Kept under 1.0 for most of the disk so only the beamed edge reaches the bloom threshold
  return vec4(col * lum * 0.85 * uGlow, clamp(lum * 0.9, 0.0, 0.92));
}

void main(){
  vec3 ro = toLocal(cameraPosition - uHole) / uRs;
  vec3 rd = toLocal(normalize(vWorld - cameraPosition));

  // Jump straight to the bounding sphere
  float bq = dot(ro, rd);
  float cq = dot(ro, ro) - BOUND * BOUND;
  float disc = bq * bq - cq;
  if (disc < 0.0) discard;
  vec3 p = ro + rd * max(-bq - sqrt(disc), 0.0);
  vec3 v = rd;
  vec3 h = cross(p, v);
  float h2 = dot(h, h);

  vec3 col = vec3(0.0);
  float trans = 1.0;
  float captured = 0.0;
  float rmin = 100.0;
  for (int i = 0; i < STEPS; i++) {
    float r = length(p);
    rmin = min(rmin, r);
    if (r < 1.0) { captured = 1.0; break; }
    if (r > BOUND + 0.5 && dot(p, v) > 0.0) break;
    float dt = clamp(0.085 * r, 0.03, 0.9);
    vec3 prev = p;
    v += -1.5 * h2 * p / pow(r, 5.0) * dt;
    p += v * dt;
    if (prev.y * p.y < 0.0) {
      vec3 hit = mix(prev, p, prev.y / (prev.y - p.y));
      vec4 s = diskSample(hit, normalize(v));
      col += trans * s.rgb;
      trans *= 1.0 - s.a;
      if (trans < 0.02) break;
    }
  }

  // Light that skimmed the photon sphere (r ~ 1.5) piles up into a thin ring
  vec3 lime = vec3(0.784, 0.941, 0.192);
  float ring = exp(-max(rmin - 1.5, 0.0) * 9.0) * (1.0 - captured);
  col += trans * mix(lime, vec3(1.0, 0.98, 0.9), 0.5 + uFlash * 0.5) * ring * (0.55 * uGlow + uFlash * 2.0);

  float alpha = mix(1.0 - trans, 1.0, captured);
  alpha = max(alpha, ring * 0.9);
  float edge = 1.0 - smoothstep(0.38, 0.5, length(vUv - 0.5));
  float k = uAmt * edge;
  // Premultiplied output: the shadow hides the stars behind it, the gas glows on top.
  gl_FragColor = vec4(col * k, alpha * k);
}
`;

// Lens pass: chromatic fringes that grow toward the screen edges, plus a radial smear toward the
// black hole (uZoom) for when it pulls on everything: held click, the dive, fast scrolls.
export const lensVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const lensFragment = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uCenter;
uniform float uAberr;
uniform float uZoom;
varying vec2 vUv;
#define TAPS 6
void main(){
  vec2 d = vUv - 0.5;
  vec2 fringe = d * dot(d, d) * uAberr * 4.0;
  vec2 toHole = uCenter - vUv;
  vec3 col = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float t = float(i) / float(TAPS);
    float w = 1.0 - t * 0.6;
    vec2 uv = vUv + toHole * uZoom * t;
    col.r += texture2D(tDiffuse, uv - fringe).r * w;
    col.g += texture2D(tDiffuse, uv).g * w;
    col.b += texture2D(tDiffuse, uv + fringe).b * w;
    total += w;
  }
  gl_FragColor = vec4(col / total, 1.0);
}
`;

// Service planets: dark bodies lit by the accretion disk (the side facing the hole glows),
// faint bands, and a rim that burns brighter on the planet in front (uActive).
export const planetVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vLocal;
void main(){
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const planetFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHole;
uniform float uActive;
uniform float uTime;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vLocal;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 l = normalize(uHole - vWorld);
  float diff = max(dot(n, l), 0.0);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);
  float band = 0.5 + 0.5 * sin(vLocal.y * 13.0 + sin(vLocal.x * 3.0 + uTime * 0.4) * 1.5);
  vec3 col = mix(vec3(0.018, 0.022, 0.026), uColor * 0.22, band * 0.5);
  col += uColor * pow(diff, 1.4) * (0.55 + uActive * 0.6);
  col += uColor * fres * (0.45 + uActive * 1.6);
  gl_FragColor = vec4(col, 1.0);
}
`;

// Portal: a ring of flame that opens in the middle of the screen while a section scrolls in and
// grows until the camera passes through it. Inside, spiral arms wind toward the centre and
// hyperspace streaks run outward. Additive only, so it never darkens the copy on top of it.
export const portalFragment = /* glsl */ `
uniform float uTime;
uniform float uOpen;
uniform float uRadius;
uniform float uAspect;
uniform vec2 uCenter;
uniform vec3 uTint;
uniform vec3 uTint2;
varying vec2 vUv;
${noise3D}
void main(){
  // Opens around the black hole (beside the copy), not in the middle of the screen
  vec2 p = (vUv - uCenter) * vec2(uAspect, 1.0);
  float r = length(p) + 1e-4;
  float a = atan(p.y, p.x);
  float R = max(uRadius, 1e-3);
  float n = snoise(vec3(cos(a) * 2.2, sin(a) * 2.2, uTime * 0.7 - r * 2.0));
  float n2 = snoise(vec3(cos(a) * 6.0, sin(a) * 6.0, uTime * 1.4));
  float width = 0.008 + R * 0.028;
  float rr = R * (1.0 + n * 0.05 + n2 * 0.015);
  float rim = exp(-pow((r - rr) / width, 2.0));
  float flame = exp(-pow((r - rr - width * 1.5) / (width * 3.0), 2.0)) * max(n2, 0.0);
  float inside = smoothstep(R, R * 0.15, r);
  float arms = pow(0.5 + 0.5 * sin(a * 4.0 + log(r) * 8.0 - uTime * 2.2), 5.0) * inside * smoothstep(0.0, R * 0.5, r);
  float streak = pow(max(0.0, snoise(vec3(a * 10.0, r * 2.0 - uTime * 2.4, 3.0))), 5.0) * inside;
  // The rim thins out as it grows, so once it sweeps across the copy it is a hairline, not a glare
  float thin = 1.0 - smoothstep(0.5, 1.6, R) * 0.65;
  vec3 col = uTint * rim * 0.9 * thin
    + mix(uTint, vec3(1.0), 0.45) * rim * rim * 0.4 * thin
    + uTint2 * flame * 0.5 * thin
    + mix(uTint, uTint2, 0.5) * arms * 0.14
    + mix(uTint, vec3(1.0), 0.6) * streak * 0.18
    + uTint * exp(-max(r - R, 0.0) * 7.0) * 0.08 * step(r, R * 1.8);
  gl_FragColor = vec4(col * uOpen, 1.0);
}
`;

// Wormhole: the full-screen layer for the inside of the black hole, drawn over the scene.
// uCross: the shadow swallows the screen from the hole outward, its photon ring sweeping past the
// edges. uTunnel: inside, lensed starlight streams past in a twisting tube toward a pinpoint of
// light. uExit: that light opens into a white hole whose rim races outward; inside the rim the
// scene on the far side (the galaxy) shows through. Premultiplied alpha, so the rims only add light.
export const wormholeFragment = /* glsl */ `
uniform float uTime;
uniform float uAspect;
uniform vec2 uHole;
uniform float uHoleR;
uniform float uCross;
uniform float uTunnel;
uniform float uExit;
uniform float uFlow;
varying vec2 vUv;
${noise3D}
void main(){
  vec3 lime = vec3(0.784, 0.941, 0.192);
  vec3 teal = vec3(0.12, 0.82, 0.73);
  vec3 violet = vec3(0.42, 0.24, 0.9);
  vec3 cream = vec3(1.0, 0.98, 0.9);

  // Falling in, the middle of the view slides from the hole to the centre of the screen
  vec2 c = mix(uHole, vec2(0.5), smoothstep(0.0, 1.0, uCross));
  vec2 p = (vUv - c) * vec2(uAspect, 1.0);
  float r = length(p) + 1e-4;
  float a = atan(p.y, p.x);

  // Horizon: a black disc that grows from the hole's shadow until it covers the screen
  float R = mix(uHoleR, 1.25 * max(uAspect, 1.0), pow(uCross, 1.8));
  float disc = smoothstep(R * 1.015, R * 0.985, r);
  float rw = 0.006 + R * 0.04;
  float ring = exp(-pow((r - R) / rw, 2.0)) * (1.0 - smoothstep(0.75, 1.0, uCross)) * step(0.001, uCross);
  float ringN = 0.7 + 0.3 * snoise(vec3(cos(a) * 3.0, sin(a) * 3.0, uTime * 1.5));

  // Inside: depth runs as 1/r, so the walls stream outward past the camera as uFlow grows
  float z = 0.32 / max(r, 0.015);
  float zz = z + uFlow;
  float tw = a + z * 0.55 + uTime * 0.15;
  vec3 q = vec3(cos(tw) * 4.0, sin(tw) * 4.0, zz * 1.2);
  float streak = pow(max(snoise(q), 0.0), 3.5);
  float gas = smoothstep(-0.3, 0.9, snoise(vec3(cos(tw) * 1.6, sin(tw) * 1.6, zz * 0.35 + 7.0)));
  // Rings of lensed starlight (copies of the sky the hole swallowed) rushing past
  float rings = pow(0.5 + 0.5 * sin(zz * 7.0 + snoise(vec3(cos(a), sin(a), zz * 0.2)) * 1.5), 22.0);
  float near = smoothstep(0.0, 0.35, r);
  vec3 wall = mix(teal, violet, 0.5 + 0.5 * sin(zz * 0.45));
  vec3 inside = vec3(0.004, 0.006, 0.01)
    + wall * gas * 0.22 * near
    + mix(lime, cream, 0.4) * streak * (0.35 + near * 0.9)
    + mix(lime, cream, 0.6) * rings * 0.5 * near;
  // The far end: a pinpoint of light that grows into the white hole
  float E = mix(0.012, 1.3 * max(uAspect, 1.0), pow(uExit, 1.7));
  // The halo hugs the light while it is far away and fades as it opens, so only the rim burns
  float glow = exp(-max(r - E, 0.0) / (0.025 + E * 0.05));
  inside *= smoothstep(0.0, 0.25, uTunnel);
  inside += mix(cream, lime, 0.25) * glow * (0.35 + uTunnel * 0.9) * (1.0 - smoothstep(0.0, 0.35, uExit) * 0.85);

  // Exit: inside the white hole's rim the scene beyond shows through; the rim itself burns
  // Until the exit starts the far end is only light: no window onto the scene behind it yet
  float Eo = E * smoothstep(0.0, 0.06, uExit);
  float open = smoothstep(Eo * 0.94, Eo * 1.01 + 1e-4, r);
  float rim = exp(-pow((r - E) / (0.008 + E * 0.05), 2.0)) * smoothstep(0.0, 0.08, uExit);
  float alpha = disc * open;
  vec3 col = inside * alpha;
  col += mix(lime, cream, 0.5) * ring * ringN * 1.6;
  col += mix(cream, lime, 0.3) * rim * 0.95 * (1.0 - smoothstep(0.85, 1.0, uExit));
  gl_FragColor = vec4(col, alpha);
}
`;
