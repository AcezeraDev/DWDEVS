import { holeFragment, noise3D } from "@/components/three/shaders";

export { bgVertex as screenVertex, holeVertex, lensFragment, lensVertex } from "@/components/three/shaders";

/**
 * The same raymarched black hole as the original site, but its gas takes the colours of the
 * dimension on screen (uAcc, uAcc2) instead of the fixed lime and teal.
 */
export const mvHoleFragment =
  "uniform vec3 uAcc;\nuniform vec3 uAcc2;\n" +
  holeFragment
    .replaceAll("vec3 lime = vec3(0.784, 0.941, 0.192);", "vec3 lime = uAcc;")
    .replaceAll("vec3 teal = vec3(0.12, 0.82, 0.73);", "vec3 teal = uAcc2;");

// Backdrop: nebula in the dimension's colours, twinkling stars, a few bubble universes drifting
// past (the neighbouring dimensions), all bent around the hole. uWarp streaks the stars into
// hyperspace lines rushing out of the middle of the screen.
export const mvBgFragment = /* glsl */ `
uniform float uTime;
uniform float uScroll;
uniform float uWarp;
uniform float uSpeed;
uniform vec2 uMouse;
uniform vec2 uRes;
uniform vec2 uHole;
uniform float uHoleR;
uniform float uHoleAmt;
uniform float uWave;
uniform vec3 uAcc;
uniform vec3 uAcc2;
varying vec2 vUv;
${noise3D}

float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

float fbm(vec3 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * snoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

// One layer of stars: one star in some cells of a grid, stretched up and down by the scroll speed
float stars(vec2 p, float scale, float stretch){
  vec2 g = p * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash21(id);
  if (h < 0.9) return 0.0;
  vec2 o = vec2(hash21(id + 1.7), hash21(id + 3.1)) - 0.5;
  vec2 d = f - o * 0.6;
  d.y /= 1.0 + stretch;
  float s = smoothstep(0.07, 0.0, length(d));
  return s * (h - 0.9) * 10.0 * (0.6 + 0.4 * sin(uTime * (1.5 + h * 3.0) + h * 50.0));
}

// A bubble universe: a soft sphere with a thin bright skin and its own colour inside
vec3 bubble(vec2 p, vec2 c, float R, vec3 tint){
  float d = length(p - c);
  float skin = exp(-pow((d - R) / (R * 0.06), 2.0));
  float body = smoothstep(R, R * 0.2, d);
  float swirl = 0.5 + 0.5 * snoise(vec3((p - c) / R * 1.6, uTime * 0.08 + R * 9.0));
  return tint * (skin * 0.35 + body * swirl * 0.06 + body * 0.015);
}

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 p = vUv; p.x *= aspect;

  // Point-lens bend around the hole (source = image - E^2 / image)
  vec2 h = uHole; h.x *= aspect;
  vec2 ho = p - h;
  float hd = length(ho) + 1e-4;
  float E = uHoleR;
  vec2 src = p - ho * (E * E) / (hd * hd) * uHoleAmt;
  // A fed hole sends a gravitational wave out across the sky: a ring that ripples the stars
  float waveR = E + (1.0 - uWave) * 1.5;
  float wave = exp(-pow((hd - waveR) * 12.0, 2.0)) * uWave;
  src += ho / hd * wave * 0.035;
  float shadow = mix(1.0, smoothstep(E * 0.9, E * 1.08, hd), uHoleAmt);
  float t = uTime * 0.04;

  vec3 col = vec3(0.025, 0.028, 0.036);
  vec2 np = src * 0.85 + vec2(0.0, uScroll * 1.4);
  float gas = fbm(vec3(np * 1.1, t));
  float gas2 = fbm(vec3(np * 2.0 + 5.0, t * 1.3));
  float dust = smoothstep(0.05, 0.45, abs(fbm(vec3(np * 1.6 - 3.0, t * 0.6))));
  col = mix(col, uAcc2 * 0.22, smoothstep(-0.1, 0.8, gas) * 0.65);
  col = mix(col, vec3(0.2, 0.09, 0.36), smoothstep(0.15, 0.8, gas2) * 0.55);
  col += uAcc * 0.1 * smoothstep(0.55, 0.9, gas * gas2 * 3.0);
  col *= mix(1.0, 0.55 + 0.45 * dust, 0.7);

  // Bubble universes drifting up with the page, each at its own depth
  vec2 bp = src + vec2(0.0, uScroll * 1.8);
  col += bubble(bp, vec2(0.14 * aspect, fract(0.25 + uScroll * 0.3) * 1.6 - 0.3 + uScroll * 1.8), 0.11, uAcc2);
  col += bubble(bp, vec2(0.9 * aspect, fract(0.7 + uScroll * 0.2) * 1.5 - 0.25 + uScroll * 1.8), 0.075, vec3(1.0, 0.37, 0.64));
  col += bubble(bp, vec2(0.55 * aspect, fract(0.05 + uScroll * 0.25) * 1.7 - 0.35 + uScroll * 1.8), 0.05, uAcc);

  float v = smoothstep(1.25, 0.25, distance(vUv, vec2(0.5)));
  col *= mix(0.45, 1.0, v);

  // Stars: parallax by layer, streaks while the page flies
  float st = stars(src + vec2(0.0, uScroll * 0.6), 34.0, uSpeed * 6.0) + stars(src + vec2(3.0, uScroll * 1.2), 18.0, uSpeed * 10.0) * 1.3;
  col += mix(vec3(0.96, 0.95, 0.9), uAcc, 0.15) * st;

  // Hyperspace: lines rushing outward from the middle of the screen
  vec2 q = (vUv - 0.5) * vec2(aspect, 1.0);
  float r = length(q);
  float a = atan(q.y, q.x);
  float lines = pow(max(snoise(vec3(a * 18.0, r * 1.5 - uTime * 5.0, 1.0)), 0.0), 6.0);
  col += mix(vec3(1.0), uAcc, 0.4) * lines * uWarp * smoothstep(0.04, 0.6, r) * 1.4;

  // Cursor: a faint glow of the accent
  vec2 m = uMouse; m.x *= aspect;
  col += uAcc * 0.05 * smoothstep(0.5, 0.0, distance(p, m));

  col += uAcc * 0.06 * exp(-abs(hd - E) * 26.0) * uHoleAmt;
  col += mix(uAcc, vec3(1.0), 0.3) * wave * 0.22;
  col *= shadow;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Accretion stream: every point spirals in toward the hole along the disk and starts over at the
// rim, the inner ones lapping the outer ones. uWarp flings them outward (hyperspace), uFling does
// the same at the end of the hero as the camera passes through the portal.
export const inflowVertex = /* glsl */ `
uniform float uTime;
uniform float uIntro;
uniform float uWarp;
uniform float uFling;
uniform float uSize;
uniform float uScale;
uniform float uAspect;
uniform float uShadow;
uniform vec2 uHoleNdc;
uniform vec2 uMouse;
uniform vec3 uHole;
uniform mat3 uDisk;
uniform vec3 uAcc;
uniform vec3 uAcc2;
attribute vec4 aSeed;
attribute float aRand;
varying float vAlpha;
varying vec3 vColor;

void main(){
  // r runs from the rim (aSeed.x) down to the inner edge, faster the closer it gets
  float life = fract(aRand * 7.31 + uTime * aSeed.w);
  float r = mix(aSeed.x, 1.15, pow(life, 0.7));
  float a = aSeed.y - uTime * 0.9 / pow(r, 1.2) + log(r) * 2.4;
  float y = aSeed.z * (0.05 + r * 0.04);
  vec3 local = vec3(cos(a) * r, y, sin(a) * r) * uScale;
  vec3 pos = uHole + uDisk * local;

  // Hyperspace and the portal fling: thrown out of the disk plane, toward and past the camera
  vec3 out1 = (pos - uHole) * (1.0 + (uWarp * 2.5 + uFling * 6.0) * (0.3 + aRand));
  pos = uHole + out1 + vec3(0.0, 0.0, (uWarp * 6.0 + uFling * 14.0) * aRand);

  // Intro: everything starts inside the singularity
  pos = mix(pos, uHole, uIntro);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;

  // Cursor: a gentle push away from the pointer
  vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
  float near = smoothstep(0.2, 0.0, length(d));
  mv.xy += normalize(d + 1e-4) * near * (-mv.z) * 0.02;
  gl_Position = projectionMatrix * mv;

  float size = (0.6 + aRand * 1.4) * uSize * (1.0 + uWarp * 0.8);
  gl_PointSize = min(size / -mv.z, 40.0);

  // Points behind the hole hide in its shadow (the hole is drawn under them)
  vec4 hv = viewMatrix * vec4(uHole, 1.0);
  float behind = step(mv.z, hv.z);
  float dd = length((ndc - uHoleNdc) * vec2(uAspect, 1.0));
  vAlpha = mix(1.0, smoothstep(uShadow * 0.95, uShadow * 1.35, dd), behind);
  // Fade in at the rim, out at the inner edge
  vAlpha *= smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.85, 1.0, life)) * (0.35 + aRand * 0.65);
  vAlpha *= smoothstep(0.3, 2.0, -mv.z);

  vec3 cream = vec3(0.98, 0.96, 0.9);
  vec3 col = mix(cream, uAcc, smoothstep(1.2, 2.6, r));
  col = mix(col, uAcc2, smoothstep(3.2, 5.5, r) * (0.4 + aRand * 0.6));
  vColor = col;
}
`;

export const inflowFragment = /* glsl */ `
uniform float uOpacity;
varying float vAlpha;
varying vec3 vColor;
void main(){
  float d = distance(gl_PointCoord, vec2(0.5));
  float s = pow(1.0 - smoothstep(0.0, 0.5, d), 2.2);
  gl_FragColor = vec4(vColor, s * vAlpha * uOpacity);
}
`;

// Portal rings: thin torus around the hole with dashes of light running along it.
export const ringVertex = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ringFragment = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uSeed;
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec2 vUv;
void main(){
  float u = vUv.x;
  float dash = pow(0.5 + 0.5 * sin(u * 6.2831 * (6.0 + uSeed * 4.0) - uTime * (1.5 + uSeed)), 3.0);
  float sweep = pow(0.5 + 0.5 * sin(u * 6.2831 - uTime * 0.7 + uSeed * 4.0), 6.0);
  vec3 col = mix(uColor, uColor2, 0.5 + 0.5 * sin(u * 6.2831 * 2.0 + uSeed * 3.0));
  float k = 0.25 + dash * 0.5 + sweep * 1.2;
  gl_FragColor = vec4(col * k * uOpacity, 1.0);
}
`;
