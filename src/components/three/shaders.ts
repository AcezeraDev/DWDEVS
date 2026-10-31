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

  float n1 = snoise(vec3(src * 1.1, t + uScroll * 1.2));
  float n2 = snoise(vec3(src * 2.2 + 4.0, t * 1.5 - uScroll));

  vec3 base = vec3(0.027, 0.031, 0.039);
  vec3 lime = vec3(0.784, 0.941, 0.192);
  vec3 teal = vec3(0.04, 0.30, 0.28);

  float g1 = smoothstep(0.15, 0.95, n1 * 0.5 + 0.5);
  float g2 = smoothstep(0.5, 1.0, n2 * 0.5 + 0.5);
  vec3 col = base;
  col = mix(col, teal * 0.45, g1 * 0.55);
  col = mix(col, lime * 0.22, g1 * g2 * 0.8);

  float d = distance(p, m);
  float halo = smoothstep(0.6, 0.0, d);
  col += lime * 0.07 * halo;

  // Interactive grid that brightens around the cursor
  vec2 gp = src * 18.0;
  gp.y += uScroll * 14.0;
  vec2 fw = fwidth(gp);
  vec2 gl = abs(fract(gp - 0.5) - 0.5) / fw;
  float line = 1.0 - min(min(gl.x, gl.y), 1.0);
  col += mix(vec3(1.0), lime, halo) * line * (0.025 + halo * 0.14);

  float v = smoothstep(1.25, 0.25, distance(vUv, vec2(0.5)));
  col *= mix(0.45, 1.0, v);

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
  float tw = t * t;
  vec3 axis = normalize(uCamPos - uHole);
  vec3 side = normalize(cross(axis, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(side, axis);
  float ta = aP3.x + t * 2.2;
  float tr = mix(0.25, aP3.y, tw);
  vec3 p3 = mix(uHole, uCamPos + axis * 2.0, tw) + (side * cos(ta) + up * sin(ta)) * tr;

  // 4: halo. A wide, nearly edge-on ring around the hole parked behind the contact button.
  float ha = aP4.x - uTime * 0.5 / sqrt(aP4.y);
  vec3 p4 = uHole + uDisk * (vec3(cos(ha) * aP4.y, aP4.z * 0.6, sin(ha) * aP4.y) * uScale);

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
  // Jet: white leaving the hole, lime mid-way, teal as it rushes past
  vec3 jet = mix(cream, lime, smoothstep(0.02, 0.25, t));
  jet = mix(jet, teal, smoothstep(0.55, 1.0, t) * aRand);
  vec3 halo = mix(lime, teal, smoothstep(3.0, 7.0, aP4.y));
  vec3 col = star * w0 + gal * w1 + gyro * w2 + jet * w3 + halo * w4 + lime * between;
  // The jet thins out right at the mouth of the hole and as it passes the camera
  vAlpha *= mix(1.0, smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.85, 1.0, t)), w3);
  vAlpha *= mix(1.0, 0.55 * twinkle, w0);
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
  // Keplerian shear: inner gas laps the outer gas, which winds the turbulence into streaks
  float rot = a - uTime * 4.8 * pow(r, -1.5);
  vec3 nq = vec3(cos(rot) * 1.6, sin(rot) * 1.6, r * 1.4);
  float n = snoise(nq) * 0.6 + snoise(nq * 2.3 + 7.0) * 0.4;
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
  return vec4(col * lum * 1.35 * uGlow, clamp(lum * 0.9, 0.0, 0.92));
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
  col += trans * mix(lime, vec3(1.0, 0.98, 0.9), 0.5 + uFlash * 0.5) * ring * (0.9 * uGlow + uFlash * 2.5);

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
