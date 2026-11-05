"use client";

/* eslint-disable react-hooks/immutability -- laço de quadro do R3F: objetos do three são mutados fora do React de propósito */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { stage } from "@/lib/stage";
import { accent, accent2 } from "@/lib/world";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function dust(n: number) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) out.set([rand(-8, 8), rand(-4.4, 4.4), rand(-4, 1.2)], i * 3);
  return out;
}

function browser(n: number) {
  const W = 1.9;
  const H = 1.25;
  const segs: [number, number, number, number][] = [
    [-W, H, W, H],
    [W, H, W, -H],
    [W, -H, -W, -H],
    [-W, -H, -W, H],
    [-W, H - 0.34, W, H - 0.34],
    [-W + 0.25, 0.45, 0.2, 0.45],
    [-W + 0.25, 0.2, -0.2, 0.2],
    [-W + 0.25, -0.05, 0.05, -0.05],
    [0.55, 0.5, W - 0.25, 0.5],
    [W - 0.25, 0.5, W - 0.25, -0.75],
    [W - 0.25, -0.75, 0.55, -0.75],
    [0.55, -0.75, 0.55, 0.5],
    [-W + 0.25, -0.5, -0.65, -0.5],
    [-W + 0.25, -0.85, -0.65, -0.85],
    [-W + 0.25, -0.5, -W + 0.25, -0.85],
    [-0.65, -0.5, -0.65, -0.85],
  ];
  const lens = segs.map(([a, b, c, d]) => Math.hypot(c - a, d - b));
  const total = lens.reduce((x, y) => x + y, 0);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let r = Math.random() * total;
    let s = 0;
    while (r > lens[s] && s < segs.length - 1) r -= lens[s++];
    const t = r / lens[s];
    const [a, b, c, d] = segs[s];
    out.set([a + (c - a) * t + rand(-0.018, 0.018), b + (d - b) * t + rand(-0.018, 0.018), rand(-0.05, 0.05)], i * 3);
  }
  return out;
}

function funnel(n: number) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = Math.pow(Math.random(), 0.8);
    const ring = Math.round(v * 11) / 11;
    const r = 0.16 + Math.pow(ring, 1.5) * 1.75;
    const a = Math.random() * Math.PI * 2;
    out.set([Math.cos(a) * r, -1.45 + ring * 2.9 + rand(-0.012, 0.012), Math.sin(a) * r * 0.55], i * 3);
  }
  return out;
}

function knot(n: number) {
  const g = new THREE.TorusKnotGeometry(1.08, 0.3, 280, 26, 2, 3);
  const p = g.attributes.position;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.random() * p.count);
    out.set([p.getX(k), p.getY(k), p.getZ(k)], i * 3);
  }
  g.dispose();
  return out;
}

/** Sorteia pontos dentro do que for desenhado em um canvas 2D. */
function sample2D(n: number, width: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, depth = 0.14) {
  const w = 512;
  const h = 320;
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  const c = el.getContext("2d", { willReadFrequently: true })!;
  c.fillStyle = "#fff";
  draw(c, w, h);
  const data = c.getImageData(0, 0, w, h).data;
  const hits: number[] = [];
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (data[(y * w + x) * 4 + 3] > 128) hits.push(x, y);
  const out = new Float32Array(n * 3);
  const scale = width / w;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.random() * (hits.length / 2)) * 2;
    out.set([(hits[k] - w / 2) * scale + rand(-0.008, 0.008), (h / 2 - hits[k + 1]) * scale + rand(-0.008, 0.008), rand(-depth, depth)], i * 3);
  }
  return out;
}

const VERTEX = /* glsl */ `
  attribute vec3 s1;
  attribute vec3 s2;
  attribute vec3 s3;
  attribute vec3 s4;
  attribute vec3 s5;
  attribute float aSeed;
  uniform float uW[6];
  uniform float uTime;
  uniform float uSize;
  uniform float uPx;
  uniform vec2 uMouse;
  uniform vec2 uClick;
  uniform float uClickAge;
  varying float vSeed;
  varying float vHeat;

  void main() {
    vec3 p = position * uW[0] + s1 * uW[1] + s2 * uW[2] + s3 * uW[3] + s4 * uW[4] + s5 * uW[5];
    float loose = 0.03 + uW[0] * 0.2;
    p += loose * vec3(sin(uTime * 0.5 + aSeed * 40.0), cos(uTime * 0.42 + aSeed * 31.0), sin(uTime * 0.35 + aSeed * 23.0));

    // O mouse abre um buraco na nuvem
    vec2 d = p.xy - uMouse;
    float r2 = dot(d, d);
    float push = exp(-r2 * 2.6);
    p.xy += normalize(d + 1e-4) * push * 0.62;
    p.z += push * 0.5;

    // Onda de choque do clique
    vec2 dc = p.xy - uClick;
    float rc = length(dc);
    float wave = exp(-pow((rc - uClickAge * 3.4) * 2.1, 2.0)) * exp(-uClickAge * 1.3);
    p.xy += normalize(dc + 1e-4) * wave * 0.85;
    p.z += wave * 0.5;

    vSeed = aSeed;
    vHeat = clamp(push + wave * 1.5, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPx * (0.55 + aSeed * 1.05 + vHeat * 0.9) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uA;
  uniform vec3 uB;
  varying float vSeed;
  varying float vHeat;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(max(0.0, 1.0 - d * 2.0), 2.2);
    vec3 col = mix(uA, uB, smoothstep(0.35, 0.8, vSeed));
    col = mix(col, vec3(0.63, 0.48, 1.0), smoothstep(0.9, 1.0, vSeed));
    col = mix(col, vec3(0.93, 1.0, 0.95), vHeat);
    float tw = 0.65 + 0.35 * sin(uTime * 2.0 + vSeed * 60.0);
    gl_FragColor = vec4(col, a * tw * uOpacity);
  }
`;

function Cloud({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const viewport = useThree((s) => s.viewport);
  const dpr = useThree((s) => s.viewport.dpr);
  const [geometry, material] = useBuilt(count);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    g.visible = stage.dOp > 0.005;
    if (!g.visible) return;
    const fit = THREE.MathUtils.clamp(viewport.width / 8, 0.55, 1.15);
    const scale = stage.ds * fit;
    g.scale.setScalar(scale);
    g.position.set(stage.dx * viewport.width, stage.dy * viewport.height, 0);
    g.rotation.y = stage.shape === 0 ? 0 : Math.sin(clock.elapsedTime * 0.3) * 0.32 + stage.px * 0.25;
    g.rotation.x = stage.shape === 0 ? 0 : stage.py * 0.15;

    const u = material.uniforms;
    const k = 1 - Math.pow(0.012, dt);
    const w = u.uW.value as number[];
    for (let i = 0; i < 6; i++) w[i] += ((i === stage.shape ? 1 : 0) - w[i]) * k;
    u.uTime.value = stage.reduced ? 0 : clock.elapsedTime;
    u.uOpacity.value = stage.dOp;
    u.uPx.value = dpr;
    (u.uMouse.value as THREE.Vector2).set(
      stage.hasMouse ? ((stage.px * viewport.width) / 2 - g.position.x) / scale : 999,
      stage.hasMouse ? ((-stage.py * viewport.height) / 2 - g.position.y) / scale : 999,
    );
    (u.uClick.value as THREE.Vector2).set(((stage.clickX * viewport.width) / 2 - g.position.x) / scale, ((stage.clickY * viewport.height) / 2 - g.position.y) / scale);
    u.uClickAge.value = performance.now() / 1000 - stage.clickT;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />;
}

function useBuilt(count: number): [THREE.BufferGeometry, THREE.ShaderMaterial] {
  const [built] = useState(() => {
    const family = getComputedStyle(document.querySelector(".display") ?? document.body).fontFamily;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(dust(count), 3));
    geo.setAttribute("s1", new THREE.BufferAttribute(browser(count), 3));
    geo.setAttribute("s2", new THREE.BufferAttribute(funnel(count), 3));
    geo.setAttribute("s3", new THREE.BufferAttribute(knot(count), 3));
    geo.setAttribute(
      "s4",
      new THREE.BufferAttribute(
        sample2D(count, 3.4, (c, w, h) => {
          const s = h / 19;
          c.translate(w / 2 - 8 * s, s * 0.8);
          c.scale(s, s);
          c.fill(new Path2D("M1 1l6 16 2.6-6.4L16 8z"));
        }),
        3,
      ),
    );
    geo.setAttribute(
      "s5",
      new THREE.BufferAttribute(
        sample2D(count, 3.8, (c, w, h) => {
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.font = `italic 700 250px ${family}`;
          c.fillText("DW", w / 2, h / 2);
        }),
        3,
      ),
    );
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) seeds[i] = Math.random();
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uW: { value: [1, 0, 0, 0, 0, 0] },
        uTime: { value: 0 },
        uA: accent,
        uB: accent2,
        uSize: { value: 34 },
        uPx: { value: 1 },
        uOpacity: { value: 1 },
        uMouse: { value: new THREE.Vector2(999, 999) },
        uClick: { value: new THREE.Vector2() },
        uClickAge: { value: 100 },
      },
    });
    return [geo, mat] as [THREE.BufferGeometry, THREE.ShaderMaterial];
  });
  return built;
}

/** Só cria a nuvem depois que as fontes carregaram, para o "DW" sair na fonte certa. */
export function Particles() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    (document.fonts?.ready ?? Promise.resolve()).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  if (!ready) return null;
  return <Cloud count={innerWidth < 768 ? 3200 : 7000} />;
}
