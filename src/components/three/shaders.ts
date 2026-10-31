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
varying vec2 vUv;
${noise3D}
void main(){
  float aspect = uRes.x / uRes.y;
  vec2 p = vUv; p.x *= aspect;
  vec2 m = uMouse; m.x *= aspect;
  float t = uTime * 0.05;

  float n1 = snoise(vec3(p * 1.1, t + uScroll * 1.2));
  float n2 = snoise(vec3(p * 2.2 + 4.0, t * 1.5 - uScroll));

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
  vec2 gp = p * 18.0;
  gp.y += uScroll * 14.0;
  vec2 fw = fwidth(gp);
  vec2 gl = abs(fract(gp - 0.5) - 0.5) / fw;
  float line = 1.0 - min(min(gl.x, gl.y), 1.0);
  col += mix(vec3(1.0), lime, halo) * line * (0.025 + halo * 0.14);

  float v = smoothstep(1.25, 0.25, distance(vUv, vec2(0.5)));
  col *= mix(0.45, 1.0, v);
  gl_FragColor = vec4(col, 1.0);
}
`;


// Galaxy particles: every point stores its position in all five shapes of the journey
// and blends between them with uMorph (0 galaxy, 1 tunnel, 2 terrain, 3 planet, 4 logo).
export const galaxyVertex = /* glsl */ `
uniform float uTime;
uniform float uMorph;
uniform float uIntro;
uniform float uPulse;
uniform float uSize;
uniform float uAspect;
uniform vec2 uMouse;
uniform vec3 uPlanet;
attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aP3;
attribute vec3 aP4;
attribute float aRand;
varying float vAlpha;
varying vec3 vColor;

vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
vec3 rotZ(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x - s*p.y, s*p.x + c*p.y, p.z); }

void main(){
  // Stagger the morph per point so shapes pour into each other instead of switching at once.
  float m = clamp(uMorph + (aRand - 0.5) * 0.4, 0.0, 4.0);

  // 0: spiral galaxy, inner stars orbit faster
  float r0 = length(position.xz);
  vec3 p0 = rotY(position, uTime * (0.05 + 0.35 / (r0 + 0.6)));
  // 1: warp tunnel, streaming toward the camera and slowly twisting
  vec3 p1 = aP1;
  p1.z = mod(p1.z + uTime * (2.5 + aRand * 3.0) + 30.0, 34.0) - 30.0;
  p1 = rotZ(p1, uTime * 0.12);
  // 2: rolling wave terrain
  vec3 p2 = aP2;
  p2.y += sin(p2.x * 0.45 + uTime * 0.9) * cos(p2.z * 0.35 + uTime * 0.6) * 0.8;
  // 3: planet with a ring, turning
  vec3 p3 = uPlanet + rotY(aP3 - uPlanet, uTime * 0.18);
  // 4: logo, gently breathing
  vec3 p4 = aP4 + vec3(0.0, sin(uTime + aRand * 6.28) * 0.04, 0.0);

  float w0 = clamp(1.0 - abs(m - 0.0), 0.0, 1.0);
  float w1 = clamp(1.0 - abs(m - 1.0), 0.0, 1.0);
  float w2 = clamp(1.0 - abs(m - 2.0), 0.0, 1.0);
  float w3 = clamp(1.0 - abs(m - 3.0), 0.0, 1.0);
  float w4 = clamp(1.0 - abs(m - 4.0), 0.0, 1.0);
  vec3 pos = p0 * w0 + p1 * w1 + p2 * w2 + p3 * w3 + p4 * w4;

  // Swirl through a vortex while travelling between shapes
  float between = 1.0 - max(max(max(w0, w1), max(w2, w3)), w4);
  pos += vec3(sin(aRand * 40.0 + uTime), cos(aRand * 31.0 + uTime * 1.3), sin(aRand * 17.0 + uTime * 0.7)) * between * 2.2;

  // Intro: the galaxy bursts out of a single point
  pos = mix(pos, pos * 0.01, uIntro);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);

  // Cursor: a soft eddy. Points mostly swirl around the pointer with only a light push,
  // so they never pile up into a bright ring or leave an empty hole.
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
  float dist = length(d);
  // Ring-shaped influence: zero right under the cursor, so no hole opens there.
  float near = smoothstep(0.22, 0.0, dist) * smoothstep(0.0, 0.08, dist);
  vec2 dir = normalize(d + 1e-4);
  vec2 tangent = vec2(-dir.y, dir.x);
  mv.xy += (tangent + dir * 0.3) * near * (-mv.z) * 0.03;
  // Click: shockwave
  mv.xy += normalize(mv.xy + 1e-4) * uPulse * (-mv.z) * 0.08 * (0.4 + aRand);

  gl_Position = projectionMatrix * mv;
  float size = (0.5 + aRand * 1.5) * uSize * (1.0 + near * 0.25);
  gl_PointSize = min(size / -mv.z, 48.0);

  vAlpha = smoothstep(0.3, 2.5, -mv.z) * (0.35 + aRand * 0.65);
  vec3 lime = vec3(0.784, 0.941, 0.192);
  vec3 teal = vec3(0.12, 0.82, 0.73);
  vec3 cream = vec3(0.96, 0.95, 0.9);
  vec3 col = aRand < 0.55 ? lime : (aRand < 0.82 ? teal : cream);
  vColor = mix(col, cream, near * 0.15);
}
`;

export const galaxyFragment = /* glsl */ `
uniform float uOpacity;
varying float vAlpha;
varying vec3 vColor;
void main(){
  float d = distance(gl_PointCoord, vec2(0.5));
  float s = pow(1.0 - smoothstep(0.0, 0.5, d), 2.2);
  gl_FragColor = vec4(vColor, s * vAlpha * uOpacity);
}
`;
