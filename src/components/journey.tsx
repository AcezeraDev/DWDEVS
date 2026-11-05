"use client";

/* eslint-disable react-hooks/immutability -- laço de quadro do R3F: objetos do three são mutados fora do React de propósito */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { accent, tintMaterial, trackPaint, worldHex, worldRgba } from "@/lib/world";
import { stage } from "@/lib/stage";
import { CURSOR, extrude } from "./objects";

// A jornada conta a criação de um site em 4 capítulos, controlados pelo scroll (stage.journey, de 0 a 4):
// 1 conversa: dois balões trocam ideias      2 design: blocos voam e encaixam na página
// 3 código: as camadas se abrem e compilam   4 lançamento: vira notebook e celular, no ar

const W = 3.6;
const H = 2.25;

const seg = (v: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const backOut = (t: number) => {
  const c = 1.7;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const seeded = (i: number, k: number) => {
  const n = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return n - Math.floor(n);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Paint = (c: CanvasRenderingContext2D, w: number, h: number) => void;

function canvasTexture(w: number, h: number, paint: Paint) {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  paint(el.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  trackPaint(t, (c) => paint(c, w, h));
  return t;
}

const P = "#f1f6f0";
const INK = "#0a120e";

const fillBg = (c: CanvasRenderingContext2D, w: number, h: number, color = INK) => {
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
};

type Block = { name: string; x: number; y: number; w: number; h: number; lift: number; paint?: Paint; image?: boolean };

const BLOCKS: Block[] = [
  {
    name: "navegação",
    x: 0, y: 0.92, w: 3.32, h: 0.17, lift: 0.5,
    paint: (c, w, h) => {
      fillBg(c, w, h);
      c.fillStyle = worldHex();
      c.fillRect(16, h * 0.32, 70, h * 0.36);
      c.fillStyle = P;
      [0, 1, 2, 3].forEach((i) => c.fillRect(w * 0.55 + i * 60, h * 0.42, 40, h * 0.16));
    },
  },
  {
    name: "título",
    x: -1.02, y: 0.48, w: 1.26, h: 0.56, lift: 1.5,
    paint: (c, w, h) => {
      fillBg(c, w, h);
      const family = getComputedStyle(document.querySelector(".display") ?? document.body).fontFamily;
      c.fillStyle = P;
      c.font = `400 ${h * 0.42}px ${family}`;
      c.fillText("Seu site", 14, h * 0.44);
      c.fillStyle = worldHex();
      c.font = `italic 300 ${h * 0.42}px ${family}`;
      c.fillText("no ar", 14, h * 0.88);
    },
  },
  {
    name: "texto",
    x: -1.02, y: 0.02, w: 1.26, h: 0.28, lift: 1,
    paint: (c, w, h) => {
      fillBg(c, w, h);
      c.fillStyle = "rgba(241,246,240,.7)";
      [0.2, 0.46, 0.72].forEach((y, i) => c.fillRect(12, h * y, w * (0.9 - i * 0.2), h * 0.11));
    },
  },
  {
    name: "botão",
    x: -1.27, y: -0.25, w: 0.76, h: 0.17, lift: 1.85,
    paint: (c, w, h) => {
      fillBg(c, w, h, worldHex());
      c.fillStyle = INK;
      c.fillRect(w * 0.2, h * 0.42, w * 0.6, h * 0.16);
    },
  },
  { name: "imagem", x: 0.62, y: 0.2, w: 1.98, h: 1.24, lift: 0.75, image: true },
  ...[0, 1, 2].map(
    (i): Block => ({
      name: `card ${i + 1}`,
      x: -1.1 + i * 1.1, y: -0.74, w: 1.02, h: 0.5, lift: 0.95 + i * 0.28,
      paint: (c, w, h) => {
        fillBg(c, w, h, "#101a15");
        c.fillStyle = ["#ffb224", "#1fd1ba", "#a07bff"][i];
        c.fillRect(14, 14, h * 0.3, h * 0.3);
        c.fillStyle = "rgba(241,246,240,.75)";
        c.fillRect(14, h * 0.58, w * 0.7, h * 0.09);
        c.fillRect(14, h * 0.75, w * 0.45, h * 0.09);
      },
    }),
  ),
];

const BLOCK_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const BLOCK_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFill;
  uniform float uOpacity;
  uniform float uHot;
  uniform float uAspect;
  uniform vec3 uAccent;
  varying vec2 vUv;
  void main() {
    vec2 e = min(vUv, 1.0 - vUv) * vec2(uAspect, 1.0);
    float d = min(e.x, e.y);
    float border = 1.0 - smoothstep(0.0, fwidth(d) * (1.5 + uHot * 2.0), d);
    float cross1 = 1.0 - smoothstep(0.0, 0.012, abs(vUv.x - vUv.y));
    float cross2 = 1.0 - smoothstep(0.0, 0.012, abs(vUv.x + vUv.y - 1.0));
    vec3 line = uAccent;
    float front = step(vUv.x, uFill);
    float edge = (1.0 - smoothstep(0.0, 0.02, abs(vUv.x - uFill))) * step(0.001, uFill) * step(uFill, 0.999);
    vec3 col = mix(line * 0.16, texture2D(uMap, vUv).rgb, front);
    float alpha = mix(0.2 + max(cross1, cross2) * 0.5, 1.0, front);
    col = mix(col, line, max(border * (1.0 - front * 0.55), edge));
    alpha = max(alpha, max(border, edge));
    col += line * uHot * 0.12;
    gl_FragColor = vec4(col, alpha * uOpacity);
  }
`;

const CODE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOffset;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uMap, vec2(vUv.x, fract(vUv.y + uOffset)));
    float fade = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
    gl_FragColor = vec4(t.rgb, t.a * fade * uOpacity);
  }
`;

const CODE = [
  "const site = sobMedida({", "  rapido: true,", "  template: null,", "});", "", "export default function Home() {", "  return <Hero marca='sua' />;", "}", "",
  "await build({ seo: true });", "gsap.to(bloco, { y: 0 });", "useFrame(() => giro += 1);", "", "npm run build", "✓ compilado", "",
];

function bubbleGeometry() {
  const s = new THREE.Shape();
  const w = 0.82;
  const h = 0.5;
  const r = 0.2;
  s.moveTo(-w + r, -h);
  s.lineTo(-0.28, -h);
  s.lineTo(-0.5, -h - 0.26);
  s.lineTo(-0.5 + 0.02, -h);
  s.lineTo(w - r, -h);
  s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r);
  s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r);
  s.lineTo(-w, -h + r);
  s.quadraticCurveTo(-w, -h, -w + r, -h);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 10 });
  g.center();
  return g;
}

function roundedRectPoints(w: number, h: number, r: number, n = 180) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s.getSpacedPoints(n).map((p) => new THREE.Vector3(p.x, p.y, 0));
}

function makeLabel(text: string, color: string | (() => string)) {
  const tex = canvasTexture(256, 72, (c, w, h) => {
    c.fillStyle = typeof color === "string" ? color : color();
    c.beginPath();
    c.roundRect(0, 6, w, h - 12, 12);
    c.fill();
    c.fillStyle = "#060907";
    c.font = "600 38px Consolas, monospace";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, w / 2, h / 2 + 2);
  });
  return new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
}

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dummy = new THREE.Object3D();
const colorTmp = new THREE.Color();
const v = new THREE.Vector3();

// Poses do conjunto em cada ponto da jornada: j, x, y, escala, rotação x, rotação y
const POSES: [number, number, number, number, number, number][] = [
  [0, 0.22, 0.02, 0.92, 0.08, -0.18],
  [0.9, 0.22, 0.0, 0.92, 0.1, 0.2],
  [1.5, 0.22, -0.01, 0.9, -0.42, -0.5],
  [2.05, 0.22, 0.0, 0.9, -0.34, -0.3],
  [2.55, 0.23, 0.0, 0.82, -0.72, 0.72],
  [3.05, 0.23, 0.0, 0.82, -0.6, 0.45],
  [3.55, 0.2, 0.0, 0.76, -0.2, -0.28],
  [4, 0.2, 0.0, 0.76, -0.14, -0.2],
];

function pose(j: number) {
  const last = POSES.length - 1;
  let i = 0;
  while (i < last - 1 && j > POSES[i + 1][0]) i++;
  const a = POSES[Math.max(0, i - 1)];
  const b = POSES[i];
  const c = POSES[i + 1];
  const d = POSES[Math.min(last, i + 2)];
  const t = clamp01((j - b[0]) / (c[0] - b[0]));
  const t2 = t * t;
  const t3 = t2 * t;
  // Catmull-Rom: a velocidade é contínua de um trecho para o outro
  return b.map((_, k) => 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3));
}

export function Journey() {
  const root = useRef<THREE.Group>(null);
  const page = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const viewport = useThree((s) => s.viewport);
  const mobile = useMemo(() => innerWidth < 1024, []);
  const px = useRef(0);
  const py = useRef(0);
  const smoothJ = useRef(0);
  const entered = useRef(false);

  const k = useMemo(() => {
    // ── Página ──
    const slabGeo = extrude(roundedRectPoints(W + 0.14, H + 0.14, 0.09, 80).map((p) => [p.x, p.y] as [number, number]), 0.05);
    const slabMat = new THREE.MeshBasicMaterial({ color: "#050a07", transparent: true, depthWrite: false });
    const pageGridTex = canvasTexture(1024, 640, (c, w, h) => {
      fillBg(c, w, h, "#060c09");
      c.strokeStyle = worldRgba(0.1);
      c.lineWidth = 1;
      for (let x = 0; x <= w; x += 32) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
      }
      for (let y = 0; y <= h; y += 32) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }
      const glow = c.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.4, w * 0.6);
      glow.addColorStop(0, worldRgba(0.13));
      glow.addColorStop(1, worldRgba(0));
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);
    });
    pageGridTex.colorSpace = THREE.SRGBColorSpace;
    const pageGridGeo = new THREE.PlaneGeometry(W + 0.06, H + 0.06);
    const pageGridMat = new THREE.MeshBasicMaterial({ map: pageGridTex, transparent: true, depthWrite: false });
    // Halo atrás da cena: dá profundidade quase de graça
    const haloTex = canvasTexture(256, 256, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, worldRgba(0.34));
      g.addColorStop(0.5, "rgba(31,209,186,.1)");
      g.addColorStop(1, "rgba(31,209,186,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    });
    haloTex.colorSpace = THREE.SRGBColorSpace;
    const haloGeo = new THREE.PlaneGeometry(8.4, 6.2);
    const haloMat = new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    // Encaixes: a planta da página aparece antes de cada bloco chegar
    const slotPts: number[] = [];
    BLOCKS.forEach((b) => {
      const l = b.x - b.w / 2;
      const r = b.x + b.w / 2;
      const t = b.y + b.h / 2;
      const d = b.y - b.h / 2;
      slotPts.push(l, t, 0.02, r, t, 0.02, r, t, 0.02, r, d, 0.02, r, d, 0.02, l, d, 0.02, l, d, 0.02, l, t, 0.02);
    });
    const slotGeo = new THREE.BufferGeometry();
    slotGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(slotPts), 3));
    const slotMat = new THREE.LineDashedMaterial({ color: "#2bff88", dashSize: 0.05, gapSize: 0.04, transparent: true, depthWrite: false });
    const slots = new THREE.LineSegments(slotGeo, slotMat);
    slots.computeLineDistances();
    const outlinePts = roundedRectPoints(W + 0.14, H + 0.14, 0.09);
    const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts);
    const outlineMat = new THREE.LineBasicMaterial({ color: "#2bff88", transparent: true });
    const outline = new THREE.Line(outlineGeo, outlineMat);

    // ── Blocos ──
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const image = new THREE.TextureLoader().load("/projects/ourocar.jpg");
    image.colorSpace = THREE.NoColorSpace;
    const blocks = BLOCKS.map((b, i) => {
      const aspect = b.w / b.h;
      const map = b.image ? image : canvasTexture(Math.round(Math.min(512, 200 * aspect)), Math.round(Math.min(512, 200 * aspect) / aspect), b.paint!);
      const material = new THREE.ShaderMaterial({
        vertexShader: BLOCK_VERTEX,
        fragmentShader: BLOCK_FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        uniforms: { uMap: { value: map }, uFill: { value: 0 }, uOpacity: { value: 1 }, uHot: { value: 0 }, uAspect: { value: aspect }, uAccent: accent },
      });
      const a = (i / BLOCKS.length) * Math.PI * 2 + 0.6;
      return {
        ...b,
        map,
        material,
        hot: 0,
        scatter: [Math.cos(a) * 2.7, Math.sin(a) * 1.9, 0.8 + (i % 3) * 0.55] as [number, number, number],
        spin: [(i % 2 ? 1 : -1) * 1.6, (i % 3 ? -1 : 1) * 2.2] as [number, number],
        order: Math.round(b.lift * 10) + 2,
      };
    });
    const connectorGeo = new THREE.BufferGeometry();
    connectorGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(BLOCKS.length * 6), 3));
    const connectorMat = new THREE.LineBasicMaterial({ color: "#2bff88", transparent: true });
    const connectors = new THREE.LineSegments(connectorGeo, connectorMat);

    // ── Conversa ──
    const bubble = bubbleGeometry();
    const bubbleA = new THREE.MeshStandardMaterial({ color: "#f1f6f0", metalness: 0.7, roughness: 0.2 });
    const bubbleB = new THREE.MeshStandardMaterial({ color: "#2bff88", metalness: 0.8, roughness: 0.2 });
    const dotGeo = new THREE.SphereGeometry(0.075, 20, 14);
    const dotDark = new THREE.MeshStandardMaterial({ color: "#060907", roughness: 0.3 });
    const sparkGeo = new THREE.IcosahedronGeometry(0.06, 1);
    const sparkMat = new THREE.MeshBasicMaterial({ color: "#ffb224" });

    // ── Código ──
    const codeTex = canvasTexture(420, 640, (c, w, h) => {
      c.font = "500 25px Consolas, monospace";
      CODE.forEach((l, i) => {
        c.fillStyle = l.startsWith("✓") ? worldHex() : i % 4 === 0 ? worldHex() : "rgba(241,246,240,.82)";
        c.fillText(l, 12, ((i + 1) * h) / CODE.length - 8);
      });
      void w;
    });
    codeTex.wrapT = THREE.RepeatWrapping;
    const codeGeo = new THREE.PlaneGeometry(1.5, 3.2);
    const codeMats = [0, 1].map(
      () =>
        new THREE.ShaderMaterial({
          vertexShader: BLOCK_VERTEX,
          fragmentShader: CODE_FRAGMENT,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: { uMap: { value: codeTex }, uOffset: { value: 0 }, uOpacity: { value: 0 } },
        }),
    );
    const scanGeo = new THREE.BoxGeometry(W + 0.5, 0.025, 0.025);
    const scanMat = new THREE.MeshBasicMaterial({ color: "#c9ffe2", transparent: true });

    // ── Lançamento ──
    const baseTex = canvasTexture(780, 460, (c, w, h) => {
      fillBg(c, w, h, "#121b16");
      const kw = (w - 90) / 14;
      for (let r = 0; r < 5; r++)
        for (let q = 0; q < 14; q++) {
          c.fillStyle = (r + q) % 11 === 0 ? worldHex() : "#212c26";
          c.fillRect(45 + q * kw + 2, 34 + r * 42, kw - 4, 36);
        }
      c.strokeStyle = "#39493f";
      c.lineWidth = 3;
      c.strokeRect(w / 2 - 110, h - 216 + 0, 220, 170);
    });
    const baseGeo = new THREE.BoxGeometry(W + 0.32, 0.07, 2.3);
    const baseMats = [
      ...[0, 1].map(() => new THREE.MeshStandardMaterial({ color: "#1a2520", metalness: 0.8, roughness: 0.35, transparent: true })),
      new THREE.MeshStandardMaterial({ map: baseTex, metalness: 0.5, roughness: 0.5, transparent: true }),
      ...[0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: "#1a2520", metalness: 0.8, roughness: 0.35, transparent: true })),
    ];
    baseTex.colorSpace = THREE.SRGBColorSpace;
    const phoneGeo = new THREE.BoxGeometry(0.78, 1.56, 0.07);
    const phoneMat = new THREE.MeshStandardMaterial({ color: "#0d1511", metalness: 0.8, roughness: 0.3 });
    const phoneTex = canvasTexture(240, 480, (c, w, h) => {
      fillBg(c, w, h);
      const family = getComputedStyle(document.querySelector(".display") ?? document.body).fontFamily;
      c.fillStyle = worldHex();
      c.fillRect(22, 22, 70, 14);
      c.fillStyle = P;
      c.font = `400 44px ${family}`;
      c.fillText("Seu site", 20, 104);
      c.fillStyle = worldHex();
      c.font = `italic 300 44px ${family}`;
      c.fillText("no ar", 20, 152);
      c.fillStyle = "#1a2a22";
      c.fillRect(20, 180, w - 40, 130);
      c.fillStyle = worldHex();
      c.fillRect(20, 330, 130, 40);
      c.fillStyle = "#1a2a22";
      c.fillRect(20, 392, w - 40, 60);
    });
    phoneTex.colorSpace = THREE.SRGBColorSpace;
    const phoneScreenGeo = new THREE.PlaneGeometry(0.7, 1.44);
    const phoneScreenMat = new THREE.MeshBasicMaterial({ map: phoneTex, transparent: true, toneMapped: false });
    const checkGeo = extrude([[-0.62, 0.05], [-0.38, 0.28], [-0.14, 0.03], [0.42, 0.62], [0.66, 0.38], [-0.14, -0.48]], 0.2);
    const checkMat = new THREE.MeshStandardMaterial({ color: "#2bff88", metalness: 0.85, roughness: 0.16, emissive: "#0b5a30" });
    const ringGeo = new THREE.TorusGeometry(1, 0.012, 8, 96);
    const ringMats = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: "#2bff88", transparent: true }));

    const confettiGeo = new THREE.BoxGeometry(0.075, 0.12, 0.012);
    const confettiMat = new THREE.MeshBasicMaterial({ transparent: true });
    const count = mobile ? 50 : 90;
    const confetti = new THREE.InstancedMesh(confettiGeo, confettiMat, count);
    confetti.frustumCulled = false;
    const tones = ["#2bff88", "#1fd1ba", "#a07bff", "#ffb224", "#ff5fa2", "#f1f6f0"];
    const seeds = Array.from({ length: count }, (_, i) => {
      confetti.setColorAt(i, colorTmp.set(tones[i % tones.length]));
      return { x: seeded(i, 1) * 7.4 - 3.7, z: seeded(i, 2) * 2.6 - 0.7, v: 0.55 + seeded(i, 3) * 0.8, p: seeded(i, 4) * 6, s: seeded(i, 5) * 6.28, r: 1 + seeded(i, 6) * 3 };
    });

    // ── Rastro da decolagem ──
    const flameCount = mobile ? 20 : 40;
    const flame = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 1, 0.035), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), flameCount);
    flame.frustumCulled = false;
    const flameSeeds = Array.from({ length: flameCount }, (_, i) => {
      flame.setColorAt(i, colorTmp.set(["#ffffff", "#cfefff", "#ffffff"][i % 3]));
      return { x: (seeded(i, 7) - 0.5) * 3.8, z: seeded(i, 8) * 2.2, len: 0.8 + seeded(i, 9) * 2.6, p: seeded(i, 10) };
    });

    // ── Cursores ──
    const cursorGeo = extrude(CURSOR);
    const cursorMats = ["#2bff88", "#ffb224"].map((color) => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.2, transparent: true }));
    const labels = [makeLabel("Davi", worldHex), makeLabel("William", "#ffb224")];

    const dispose = () => {
      [slabGeo, outlineGeo, blockGeo, connectorGeo, bubble, dotGeo, sparkGeo, codeGeo, scanGeo, baseGeo, phoneGeo, phoneScreenGeo, checkGeo, ringGeo, confettiGeo, cursorGeo].forEach((g) => g.dispose());
      [slabMat, outlineMat, connectorMat, bubbleA, bubbleB, dotDark, sparkMat, ...codeMats, scanMat, ...baseMats, phoneMat, phoneScreenMat, checkMat, ...ringMats, confettiMat, ...cursorMats].forEach((m) => m.dispose());
      blocks.forEach((b) => {
        b.map.dispose();
        b.material.dispose();
      });
      [codeTex, baseTex, phoneTex, pageGridTex, haloTex].forEach((t) => t.dispose());
      [pageGridGeo, haloGeo, slotGeo].forEach((g) => g.dispose());
      [pageGridMat, haloMat, slotMat].forEach((m) => m.dispose());
      labels.forEach((l) => {
        l.map?.dispose();
        l.dispose();
      });
      confetti.dispose();
      flame.geometry.dispose();
      (flame.material as THREE.Material).dispose();
      flame.dispose();
    };

    return { pageGridGeo, pageGridMat, haloGeo, haloMat, slots, slotMat, slabGeo, slabMat, outline, outlineGeo, outlineMat, outlinePts, blockGeo, blocks, connectors, connectorGeo, connectorMat, bubble, bubbleA, bubbleB, dotGeo, dotDark, sparkGeo, sparkMat, codeGeo, codeMats, scanGeo, scanMat, baseGeo, baseMats, phoneGeo, phoneMat, phoneScreenGeo, phoneScreenMat, checkGeo, checkMat, ringGeo, ringMats, confetti, confettiMat, seeds, flame, flameSeeds, cursorGeo, cursorMats, labels, dispose };
  }, [mobile]);

  useEffect(() => k.dispose, [k]);

  const refs = useRef<{ blocks: (THREE.Mesh | null)[]; bubbleA: THREE.Group | null; bubbleB: THREE.Group | null; dots: (THREE.Mesh | null)[]; sparks: (THREE.Mesh | null)[]; slab: THREE.Mesh | null; code: (THREE.Mesh | null)[]; scan: THREE.Mesh | null; base: THREE.Mesh | null; phone: THREE.Group | null; check: THREE.Mesh | null; rings: (THREE.Mesh | null)[]; cursors: (THREE.Group | null)[]; talk: THREE.Group | null }>({ blocks: [], bubbleA: null, bubbleB: null, dots: [], sparks: [], slab: null, code: [], scan: null, base: null, phone: null, check: null, rings: [], cursors: [], talk: null });
  const cursorPos = useRef([new THREE.Vector3(-3, 2, 2), new THREE.Vector3(3, -2, 2)]);

  useFrame(({ clock }, delta) => {
    const g = root.current;
    const pg = page.current;
    if (!g || !pg) return;
    g.visible = stage.jOp > 0.005;
    if (!g.visible) {
      entered.current = false;
      return;
    }
    const r = refs.current;
    const dt = Math.min(delta, 0.05);
    const t = stage.reduced ? 2 : clock.elapsedTime;
    // Ao entrar de longe, começa do ponto certo em vez de atravessar a jornada inteira
    if (!entered.current) {
      smoothJ.current = stage.journey;
      entered.current = true;
    }
    smoothJ.current += (stage.journey - smoothJ.current) * (1 - Math.exp(-7.5 * dt));
    const j = smoothJ.current;
    const op = stage.jOp;
    // Tudo que usa a cor do mundo acompanha a transição
    [k.outlineMat, k.slotMat, k.connectorMat, k.bubbleB, k.checkMat, ...k.ringMats, k.cursorMats[0], k.flame.material as THREE.MeshBasicMaterial].forEach((m) => tintMaterial((m as THREE.MeshBasicMaterial).color));

    // ── Pose geral, com parallax do mouse ──
    const [, x, y, s, rx, ry] = pose(j);
    const pk = 1 - Math.pow(0.003, dt);
    px.current += (stage.px - px.current) * pk;
    py.current += (stage.py - py.current) * pk;
    const fit = THREE.MathUtils.clamp(viewport.width / 8.6, 0.42, 1.15);
    g.position.set(mobile ? 0 : x * viewport.width, (mobile ? -0.2 : y) * viewport.height + Math.sin(t * 0.6) * 0.035, 0);
    g.scale.setScalar(s * fit * (mobile ? 1.05 : 1) * mix(0.9, 1, seg(op, 0, 1)));
    g.rotation.set(rx + py.current * 0.1, ry + px.current * 0.16, 0);

    // Ao sair da jornada, o notebook decola: treme, acelera e some no alto da tela
    const exit = stage.jExit;
    if (exit > 0) {
      const thrust = exit * exit * exit;
      g.position.y += thrust * viewport.height * 1.35 + (exit < 0.3 ? Math.sin(t * 60) * 0.012 : 0);
      g.position.x += thrust * viewport.width * 0.06;
      g.rotation.x += exit * 0.55;
      g.rotation.z = -thrust * 0.28;
      g.scale.multiplyScalar(1 - thrust * 0.35);
    } else {
      g.rotation.z = 0;
    }
    k.flame.visible = exit > 0.005;
    if (k.flame.visible) {
      k.flameSeeds.forEach((f, i) => {
        const pulse = 0.7 + 0.3 * Math.sin(t * 22 + f.p * 40);
        const len = f.len * seg(exit, 0.02, 0.5) * pulse;
        dummy.position.set(f.x, -H / 2 - 0.22 - len / 2 - f.p * 0.25, f.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, Math.max(len, 0.001), 1);
        dummy.updateMatrix();
        k.flame.setMatrixAt(i, dummy.matrix);
      });
      k.flame.instanceMatrix.needsUpdate = true;
      (k.flame.material as THREE.MeshBasicMaterial).opacity = op * seg(exit, 0, 0.15);
    }

    // ── Capítulo 1: conversa ──
    const talkIn = backOut(clamp01(j / 0.22));
    const talkOut = seg(j, 0.72, 1.02);
    if (r.talk) {
      r.talk.visible = talkOut < 1;
      r.talk.scale.setScalar(Math.max(0.001, talkIn * (1 - talkOut)));
      r.talk.position.z = -talkOut * 0.8;
      r.talk.rotation.z = talkOut * 1.4;
    }
    const whoTalks = Math.floor(t / 2.2) % 2;
    if (r.bubbleA) {
      r.bubbleA.position.y = 0.46 + Math.sin(t * 1.1) * 0.06;
      r.bubbleA.rotation.y = Math.sin(t * 0.7) * 0.22;
      r.bubbleA.scale.setScalar(whoTalks === 0 ? 1.06 + Math.sin(t * 8) * 0.012 : 0.96);
    }
    if (r.bubbleB) {
      r.bubbleB.position.y = -0.42 + Math.cos(t * 0.95) * 0.06;
      r.bubbleB.rotation.y = Math.PI + Math.sin(t * 0.6 + 1) * 0.22;
      r.bubbleB.scale.setScalar(whoTalks === 1 ? 1.06 + Math.sin(t * 8) * 0.012 : 0.96);
    }
    r.dots.forEach((m, i) => {
      if (m) m.position.y = Math.max(0, Math.sin(t * 6 - (i % 3) * 0.9)) * 0.1;
    });
    r.sparks.forEach((m, i) => {
      if (!m) return;
      // Ideias viajam de um balão para o outro em arco
      const q = (t * 0.55 + i * 0.25) % 1;
      const dir = whoTalks === 0 ? q : 1 - q;
      m.position.set(mix(-0.75, 0.8, dir), mix(0.42, -0.4, dir), 0.35 + Math.sin(dir * Math.PI) * 0.75);
      m.scale.setScalar(Math.sin(q * Math.PI));
    });

    // ── Capítulo 2: a página nasce ──
    const trace = seg(j, 0.82, 1.28);
    k.outlineGeo.setDrawRange(0, Math.floor(trace * k.outlinePts.length));
    k.outlineMat.opacity = op * (1 - seg(j, 3.3, 3.6) * 0.65);
    const slabIn = seg(j, 1.0, 1.32);
    k.pageGridMat.opacity = slabIn * op;
    k.slotMat.opacity = seg(j, 1.0, 1.2) * (1 - seg(j, 1.85, 2.1)) * op * 0.8;
    k.slots.visible = k.slotMat.opacity > 0.005;
    k.haloMat.opacity = op * (0.55 + Math.sin(t * 0.8) * 0.1 + seg(j, 3.4, 3.8) * 0.45);
    if (r.slab) {
      r.slab.visible = slabIn > 0.001;
      k.slabMat.opacity = slabIn * op;
    }

    // ── Blocos: voam, encaixam, enchem, abrem e fecham ──
    const lifted = seg(j, 2.05, 2.55) * (1 - seg(j, 2.95, 3.4));
    const hoverOn = stage.hasMouse && op > 0.6 && j > 1.7 && j < 3.5 && !mobile;
    let hot = -1;
    if (hoverOn) {
      ndc.set(stage.px, -stage.py);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(r.blocks.filter(Boolean) as THREE.Mesh[], false).sort((a, b) => (b.object.userData.lift as number) - (a.object.userData.lift as number))[0];
      if (hit) {
        hot = hit.object.userData.i as number;
        stage.hoverLabel = `bloco · ${k.blocks[hot].name}`;
      }
    }
    const lines = k.connectorGeo.attributes.position as THREE.BufferAttribute;
    let placing = -1;
    k.blocks.forEach((b, i) => {
      const m = r.blocks[i];
      if (!m) return;
      const start = 1.1 + i * 0.07;
      const raw = clamp01((j - start) / 0.42);
      if (raw > 0 && raw < 1) placing = i;
      const snap = backOut(raw);
      const glide = raw * raw * raw * (raw * (raw * 6 - 15) + 10);
      const appear = seg(j, start - 0.1, start + 0.06);
      b.hot += ((hot === i ? 1 : 0) - b.hot) * (1 - Math.exp(-11 * dt));
      const wob = Math.sin(t * 1.4 + i * 1.7) * lifted * 0.05;
      const z = 0.05 + b.lift * lifted + wob + b.hot * 0.2;
      m.visible = appear > 0.001;
      m.position.set(mix(b.scatter[0], b.x, snap), mix(b.scatter[1], b.y, snap) + (1 - glide) * Math.sin(t * 1.2 + i) * 0.1, mix(b.scatter[2], z, glide));
      m.rotation.set((1 - glide) * b.spin[0], (1 - glide) * b.spin[1], 0);
      m.scale.set(b.w * Math.max(0.001, appear), b.h * Math.max(0.001, appear), 0.035);
      const u = b.material.uniforms;
      u.uFill.value = seg(j, 1.72 + i * 0.035, 2.06 + i * 0.035);
      u.uOpacity.value = op * appear;
      u.uHot.value = b.hot;
      lines.setXYZ(i * 2, b.x, b.y, 0.03);
      lines.setXYZ(i * 2 + 1, b.x, b.y, z);
    });
    lines.needsUpdate = true;
    k.connectorMat.opacity = lifted * op * 0.75;

    // ── Capítulo 3: código escorre e o build varre a página ──
    const codeIn = seg(j, 2.05, 2.35) * (1 - seg(j, 2.92, 3.15));
    r.code.forEach((m, i) => {
      if (!m) return;
      m.visible = codeIn > 0.005;
      const u = k.codeMats[i].uniforms;
      u.uOffset.value = t * (i ? 0.1 : 0.07) + j * 0.5;
      u.uOpacity.value = codeIn * op;
    });
    if (r.scan) {
      const scanOn = seg(j, 2.25, 2.4) * (1 - seg(j, 2.85, 3));
      r.scan.visible = scanOn > 0.01;
      r.scan.position.y = mix(H / 2, -H / 2, (j * 3.2) % 1);
      k.scanMat.opacity = scanOn * op;
    }

    // ── Capítulo 4: notebook, celular e festa ──
    const laptop = seg(j, 3.18, 3.6);
    if (r.base) {
      r.base.visible = laptop > 0.002;
      r.base.scale.set(1, 1, Math.max(0.001, laptop));
      r.base.position.set(0, -H / 2 - 0.1, 1.15 * laptop);
      k.baseMats.forEach((m) => (m.opacity = laptop * op));
    }
    pg.rotation.x = -0.14 * laptop;
    if (r.phone) {
      const ph = backOut(clamp01((j - 3.42) / 0.3));
      r.phone.visible = ph > 0.002;
      r.phone.position.set(mix(4.4, 2.38, ph), -0.36 + Math.sin(t * 0.9) * 0.04, 0.95);
      r.phone.rotation.set(0, -0.32 + Math.sin(t * 0.6) * 0.06, 0);
    }
    if (r.check) {
      const ck = backOut(clamp01((j - 3.55) / 0.22));
      r.check.visible = ck > 0.002;
      r.check.scale.setScalar(ck * 0.72);
      r.check.position.set(1.72, 1.46 + Math.sin(t * 1.3) * 0.05, 0.75);
      r.check.rotation.y = Math.sin(t * 1.2) * 0.45;
    }
    const air = seg(j, 3.5, 3.72);
    r.rings.forEach((m, i) => {
      if (!m) return;
      const q = (t * 0.32 + i / 3) % 1;
      m.visible = air > 0.01;
      m.scale.setScalar((1.4 + q * 2.4) * (air * 0.3 + 0.7));
      k.ringMats[i].opacity = (1 - q) * air * op * 0.75;
    });
    k.confetti.visible = air > 0.01;
    if (k.confetti.visible) {
      k.seeds.forEach((c, i) => {
        const fall = ((t * c.v + c.p) % 6) / 6;
        dummy.position.set(c.x + Math.sin(t * 1.3 + c.s) * 0.2, 3.1 - fall * 6.2, c.z);
        dummy.rotation.set(t * c.r + c.s, t * c.r * 0.7, c.s);
        dummy.scale.setScalar(air);
        dummy.updateMatrix();
        k.confetti.setMatrixAt(i, dummy.matrix);
      });
      k.confetti.instanceMatrix.needsUpdate = true;
      k.confettiMat.opacity = air * op;
    }

    // ── Davi e William trabalham em cena ──
    r.cursors.forEach((grp, i) => {
      if (!grp) return;
      const p = cursorPos.current[i];
      let tx: number, ty: number, tz: number;
      if (j < 0.95) {
        tx = (i ? 1.5 : -1.95) + Math.sin(t * 0.9 + i) * 0.14;
        ty = (i ? -1.16 : 1.2) + Math.cos(t * 1.1 + i) * 0.12;
        tz = 0.8;
      } else if (j < 2.05) {
        // Empurram o bloco que está encaixando agora
        const b = k.blocks[placing >= 0 ? (i ? Math.max(0, placing - 1) : placing) : (i ? 2 : 4)];
        tx = b.x + b.w * 0.42 + Math.sin(t * 2 + i) * 0.05;
        ty = b.y - b.h * 0.3 + Math.cos(t * 2.3 + i) * 0.05;
        tz = 0.6;
      } else if (j < 3.2) {
        const a = t * 0.7 + i * Math.PI;
        tx = Math.cos(a) * 1.75;
        ty = Math.sin(a) * 1.25;
        tz = 1.5 + Math.sin(t + i) * 0.3;
      } else {
        // Comemoram dando voltas ao redor do check
        const a = t * 2 + i * Math.PI;
        tx = 1.72 + Math.cos(a) * 0.72;
        ty = 1.46 + Math.sin(a) * 0.5;
        tz = 0.9;
      }
      v.set(tx, ty, tz);
      const before = p.x;
      p.lerp(v, 1 - Math.exp(-3.4 * dt));
      grp.position.copy(p);
      const lean = THREE.MathUtils.clamp(((p.x - before) / Math.max(dt, 0.001)) * -0.14, -0.5, 0.5);
      grp.rotation.z += (lean - grp.rotation.z) * (1 - Math.exp(-8 * dt));
      grp.visible = op > 0.05;
      k.cursorMats[i].opacity = op;
      k.labels[i].opacity = op;
    });
  });

  return (
    <group ref={root}>
      <mesh geometry={k.haloGeo} material={k.haloMat} position={[0, 0, -1.4]} renderOrder={-2} />

      {/* Conversa */}
      <group ref={(n) => { refs.current.talk = n; }}>
        <group ref={(n) => { refs.current.bubbleA = n; }} position={[-0.72, 0.46, 0.2]}>
          <mesh geometry={k.bubble} material={k.bubbleA} />
          {[-0.28, 0, 0.28].map((dx, i) => (
            <group key={dx} position={[dx, -0.04, 0.16]}>
              <mesh ref={(n) => { refs.current.dots[i] = n; }} geometry={k.dotGeo} material={k.dotDark} />
            </group>
          ))}
        </group>
        <group ref={(n) => { refs.current.bubbleB = n; }} position={[0.78, -0.42, 0.2]}>
          <mesh geometry={k.bubble} material={k.bubbleB} />
          {[-0.28, 0, 0.28].map((dx, i) => (
            <group key={dx} position={[dx, -0.04, -0.16]}>
              <mesh ref={(n) => { refs.current.dots[i + 3] = n; }} geometry={k.dotGeo} material={k.dotDark} />
            </group>
          ))}
        </group>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} ref={(n) => { refs.current.sparks[i] = n; }} geometry={k.sparkGeo} material={k.sparkMat} />
        ))}
      </group>

      {/* Página */}
      <group ref={page}>
        <mesh ref={(n) => { refs.current.slab = n; }} geometry={k.slabGeo} material={k.slabMat} position={[0, 0, -0.08]} renderOrder={1} />
        <mesh geometry={k.pageGridGeo} material={k.pageGridMat} position={[0, 0, 0.005]} renderOrder={1} />
        <primitive object={k.slots} />
        <primitive object={k.outline} />
        <primitive object={k.connectors} />
        {k.blocks.map((b, i) => (
          <mesh key={b.name} ref={(n) => { refs.current.blocks[i] = n; }} geometry={k.blockGeo} material={b.material} renderOrder={b.order} userData={{ i, lift: b.lift }} />
        ))}
        <mesh ref={(n) => { refs.current.scan = n; }} geometry={k.scanGeo} material={k.scanMat} position={[0, 0, 0.12]} renderOrder={40} />
      </group>

      {/* Código */}
      <mesh ref={(n) => { refs.current.code[0] = n; }} geometry={k.codeGeo} material={k.codeMats[0]} position={[-2.75, 0, -0.35]} rotation={[0, 0.5, 0]} renderOrder={0} />
      <mesh ref={(n) => { refs.current.code[1] = n; }} geometry={k.codeGeo} material={k.codeMats[1]} position={[2.75, 0, -0.35]} rotation={[0, -0.5, 0]} renderOrder={0} />

      {/* Lançamento */}
      <mesh ref={(n) => { refs.current.base = n; }} geometry={k.baseGeo} material={k.baseMats} />
      <group ref={(n) => { refs.current.phone = n; }}>
        <mesh geometry={k.phoneGeo} material={k.phoneMat} />
        <mesh geometry={k.phoneScreenGeo} material={k.phoneScreenMat} position={[0, 0, 0.04]} renderOrder={45} />
      </group>
      <mesh ref={(n) => { refs.current.check = n; }} geometry={k.checkGeo} material={k.checkMat} renderOrder={50} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(n) => { refs.current.rings[i] = n; }} geometry={k.ringGeo} material={k.ringMats[i]} position={[0, 0, -0.5]} />
      ))}
      <primitive object={k.confetti} />
      <primitive object={k.flame} />

      {/* Cursores */}
      {[0, 1].map((i) => (
        <group key={i} ref={(n) => { refs.current.cursors[i] = n; }} renderOrder={60}>
          <mesh geometry={k.cursorGeo} material={k.cursorMats[i]} scale={0.36} renderOrder={60} />
          <sprite material={k.labels[i]} position={i ? [-0.52, -0.38, 0] : [0.52, -0.38, 0]} scale={[0.78, 0.22, 1]} renderOrder={61} />
        </group>
      ))}
    </group>
  );
}
