"use client";

/* eslint-disable react-hooks/immutability -- laço de quadro do R3F: objetos do three são mutados fora do React de propósito */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { sfx } from "@/lib/sound";
import { stage } from "@/lib/stage";
import { accent, trackPaint, worldHex, worldRgba } from "@/lib/world";
import { BlockField } from "./block-field";
import { Journey } from "./journey";
import { Objects } from "./objects";
import { Particles } from "./particles";

const W = 1024;
const H = 640;
const PLATE_W = 3.2;
const PLATE_H = 2;
const IMAGE_LAYER = 2;
const NAMES = ["grid", "wireframe", "imagem", "tipografia", "interface", "movimento", "código"];

const P = "#edf3ee";

type Paint = (c: CanvasRenderingContext2D) => void;

function line(c: CanvasRenderingContext2D, a: number, b: number, x: number, y: number) {
  c.beginPath();
  c.moveTo(a, b);
  c.lineTo(x, y);
  c.stroke();
}

function wire(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  c.strokeRect(x, y, w, h);
  c.globalAlpha = 0.4;
  line(c, x, y, x + w, y + h);
  line(c, x + w, y, x, y + h);
  c.globalAlpha = 1;
}

// Cada camada é uma parte real de um site, de baixo para cima.
const painters = (serif: string): Paint[] => [
  // 0 · grid
  (c) => {
    c.strokeStyle = worldRgba(0.34);
    c.lineWidth = 1;
    for (let x = 0; x <= W; x += 64) line(c, x, 0, x, H);
    for (let y = 0; y <= H; y += 64) line(c, 0, y, W, y);
  },
  // 1 · wireframe
  (c) => {
    c.strokeStyle = worldHex();
    c.lineWidth = 2.5;
    wire(c, 64, 56, 896, 44);
    wire(c, 64, 140, 520, 240);
    wire(c, 616, 140, 344, 240);
    [0, 1, 2].forEach((i) => wire(c, 64 + i * 304, 420, 288, 160));
  },
  // 2 · imagem: preenchida pela foto do projeto
  (c) => {
    c.fillStyle = "#0c130f";
    c.fillRect(0, 0, W, H);
  },
  // 3 · tipografia
  (c) => {
    c.fillStyle = worldHex();
    c.font = `italic 400 210px ${serif}`;
    c.fillText("Aa", 730, 250);
    c.fillStyle = "rgba(237,243,238,.8)";
    [300, 330].forEach((y, i) => c.fillRect(740, y, 210 - i * 70, 8));
  },
  // 4 · interface
  (c) => {
    c.fillStyle = worldHex();
    c.fillRect(64, 520, 230, 66);
    c.strokeStyle = P;
    c.lineWidth = 3;
    c.strokeRect(314, 520, 190, 66);
    c.fillStyle = "#060907";
    c.fillRect(90, 546, 170, 12);
    c.fillStyle = P;
    [0, 1, 2, 3].forEach((i) => c.fillRect(620 + i * 90, 72, 66, 10));
    c.fillRect(64, 70, 120, 16);
    c.beginPath();
    c.arc(880, 460, 58, 0, Math.PI * 2);
    c.stroke();
  },
  // 5 · movimento
  (c) => {
    c.strokeStyle = "#ffb224";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(60, 560);
    c.bezierCurveTo(360, 560, 340, 90, 960, 90);
    c.stroke();
    c.fillStyle = "#ffb224";
    [
      [60, 560],
      [330, 345],
      [960, 90],
    ].forEach(([x, y]) => {
      c.save();
      c.translate(x, y);
      c.rotate(Math.PI / 4);
      c.fillRect(-11, -11, 22, 22);
      c.restore();
    });
  },
  // 6 · código
  (c) => {
    c.font = "500 25px Consolas, monospace";
    const lines = ["export default function Site() {", "  const motion = useScroll();", "  return (", "    <Hero sob='medida' />", "    <Projetos no='ar' />", "  );", "}", "", "await build({ seo: true });"];
    for (let row = 0; row < 16; row++) {
      const l = lines[row % lines.length];
      c.fillStyle = row % 3 === 0 ? worldHex() : P;
      c.fillText(l, 500, 30 + row * 40);
    }
  },
];

function makeTexture(paint: Paint) {
  const el = document.createElement("canvas");
  el.width = W;
  el.height = H;
  paint(el.getContext("2d")!);
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  trackPaint(t, (c) => paint(c));
  return t;
}

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A camada nasce como moldura, depois uma linha de varredura revela o conteúdo.
const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uReveal;
  uniform float uWire;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uHot;
  uniform sampler2D uMap2;
  uniform float uSwap;
  uniform float uFlash;
  uniform float uFlow;
  uniform vec3 uAccent;
  varying vec2 vUv;

  void main() {
    vec4 tex = uFlow > 0.0 ? texture2D(uMap, vec2(vUv.x, fract(vUv.y + uFlow))) : texture2D(uMap, vUv);
    if (uFlow > 0.0) tex.a *= smoothstep(0.02, 0.16, vUv.y) * smoothstep(0.98, 0.84, vUv.y);
    float swapEdge = 0.0;
    if (uSwap > 0.0) {
      float line = 1.0 - uSwap;
      tex = mix(tex, texture2D(uMap2, vUv), step(line, vUv.y));
      swapEdge = 1.0 - smoothstep(0.0, 0.012, abs(vUv.y - line));
    }
    float scanY = 1.0 - uReveal;
    float shown = smoothstep(scanY - 0.004, scanY + 0.004, vUv.y);

    vec2 e = min(vUv, 1.0 - vUv) * vec2(1.6, 1.0);
    float d = min(e.x, e.y);
    float border = (1.0 - smoothstep(0.0, fwidth(d) * (1.6 + uHot * 3.0 + uFlash * 6.0), d)) * uWire;

    float scan = (1.0 - smoothstep(0.0, 0.016, abs(vUv.y - scanY))) * step(0.001, uReveal) * step(uReveal, 0.999);
    float flicker = 0.94 + 0.06 * sin(uTime * 3.0 + vUv.y * 50.0);

    vec3 glass = vec3(0.04, 0.09, 0.06) + vec3(0.03, 0.2, 0.12) * (uHot + uFlash * 1.6);
    vec3 color = mix(glass, tex.rgb, tex.a) * flicker;
    float alpha = shown * max(tex.a, 0.22 + uHot * 0.25 + uFlash * 0.4);

    color = mix(color, uAccent, max(max(border, scan), swapEdge));
    alpha = max(alpha, max(max(border * 0.95, scan), swapEdge));

    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`;

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function Plates() {
  const group = useRef<THREE.Group>(null);
  const viewport = useThree((s) => s.viewport);
  const camera = useThree((s) => s.camera);
  const px = useRef(0);
  const py = useRef(0);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const lift = useRef(NAMES.map(() => 0));
  const flash = useRef(NAMES.map(() => 0));
  const landed = useRef(NAMES.map(() => false));
  const kick = useRef({ x: 0, v: 0 });
  const gallery = useRef<THREE.Texture[]>([]);
  const swap = useRef({ index: 0, wait: 3.5, p: 0, on: false });
  const runner = useRef<THREE.Mesh>(null);
  const sprites = useRef<(THREE.Sprite | null)[]>([]);

  // Etiquetas que acompanham cada camada enquanto ela chega
  const labels = useMemo(
    () =>
      NAMES.map((name, i) => {
        const el = document.createElement("canvas");
        el.width = 340;
        el.height = 72;
        const paint = (c: CanvasRenderingContext2D) => {
          c.fillStyle = worldHex();
          c.beginPath();
          c.roundRect(0, 6, el.width, 60, 8);
          c.fill();
          c.fillStyle = "#060907";
          c.font = "600 32px Consolas, monospace";
          c.textBaseline = "middle";
          c.fillText(`0${i + 1} · ${name}`, 18, 38);
        };
        paint(el.getContext("2d")!);
        const map = new THREE.CanvasTexture(el);
        map.colorSpace = THREE.SRGBColorSpace;
        trackPaint(map, paint);
        return new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, opacity: 0 });
      }),
    [],
  );

  const plates = useMemo(() => {
    const family = getComputedStyle(document.querySelector(".display") ?? document.body).fontFamily;
    const geo = new THREE.PlaneGeometry(PLATE_W, PLATE_H);
    return painters(family).map((paint, i) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uMap: { value: makeTexture(paint) },
          uReveal: { value: 0 },
          uWire: { value: 0 },
          uOpacity: { value: 1 },
          uTime: { value: 0 },
          uHot: { value: 0 },
          uMap2: { value: null },
          uSwap: { value: 0 },
          uFlash: { value: 0 },
          uFlow: { value: 0 },
          uAccent: accent,
        },
      });
      return { geo, material, i };
    });
  }, []);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const images = ["ourocar", "alquiverde", "chinaglass", "calhas"].map((n) => {
      const t = loader.load(`/projects/${n}.jpg`);
      t.colorSpace = THREE.NoColorSpace;
      return t;
    });
    const painted = plates[IMAGE_LAYER].material.uniforms.uMap.value as THREE.Texture;
    plates[IMAGE_LAYER].material.uniforms.uMap.value = images[0];
    gallery.current = images;
    const code = plates[6].material.uniforms.uMap.value as THREE.Texture;
    code.wrapT = THREE.RepeatWrapping;
    code.needsUpdate = true;
    return () => {
      images.forEach((t) => t.dispose());
      painted.dispose();
      plates.forEach((p, i) => {
        if (i !== IMAGE_LAYER) (p.material.uniforms.uMap.value as THREE.Texture).dispose();
        p.material.dispose();
      });
      plates[0].geo.dispose();
      labels.forEach((l) => {
        l.map?.dispose();
        l.dispose();
      });
    };
  }, [plates, labels]);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    stage.sceneReady = true;
    g.visible = stage.opacity > 0.005;
    stage.hoverLabel = "";
    if (!g.visible) return;
    const t = stage.reduced ? 0 : clock.elapsedTime;
    const k = 1 - Math.pow(0.002, dt);
    px.current += (stage.px - px.current) * k;
    py.current += (stage.py - py.current) * k;

    const fit = THREE.MathUtils.clamp(viewport.width / 8, 0.62, 1.15);
    const calm = 1 - stage.flat;
    g.position.set(stage.x * viewport.width, stage.y * viewport.height + Math.sin(t * 0.6) * 0.04 * calm, 0);
    // Abertura: a cena gira de cima para a posição final
    const buildT = THREE.MathUtils.clamp(stage.intro / 8, 0, 1);
    const sweep = 1 - buildT * buildT * (3 - 2 * buildT);
    const ki = kick.current;
    ki.v += (-ki.x * 90 - ki.v * 8.5) * Math.min(dt, 0.04);
    ki.x += ki.v * Math.min(dt, 0.04);
    g.position.y += ki.x * 0.14;
    g.scale.setScalar(stage.scale * fit * (1 - sweep * 0.14));
    const peel = stage.peel;
    const smoothRange = (a: number, b: number) => {
      const q = THREE.MathUtils.clamp((peel - a) / (b - a), 0, 1);
      return q * q * q * (q * (q * 6 - 15) + 10);
    };
    const faceUs = smoothRange(0.58, 0.86);
    g.position.x -= faceUs * viewport.width * 0.05;
    const rxBase = stage.rx + Math.sin(peel * Math.PI) * 0.26;
    const ryBase = stage.ry + Math.sin(peel * Math.PI * 2) * 0.34;
    g.rotation.set(
      THREE.MathUtils.lerp(rxBase, Math.PI / 2 - 0.1, faceUs) + sweep * 0.72 + py.current * 0.12 * calm,
      THREE.MathUtils.lerp(ryBase, -0.12, faceUs) - sweep * 1.9 + px.current * 0.18 * calm + Math.sin(t * 0.25) * 0.05 * calm,
      Math.sin(peel * Math.PI * 2) * 0.09 * (1 - faceUs),
    );

    // Passar o mouse levanta a camada e o cursor "você" diz o nome dela
    let hot = -1;
    if (stage.hasMouse && stage.opacity > 0.6 && stage.flat < 0.5) {
      ndc.set(stage.px, -stage.py);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(meshes.current.filter(Boolean) as THREE.Mesh[], false);
      if (hits.length) {
        hot = hits[0].object.userData.i as number;
        stage.hoverLabel = `camada · ${NAMES[hot]}`;
      }
    }

    const v = Math.min(stage.intro, stage.reveal);
    const hk = 1 - Math.pow(0.0008, dt);
    const fk = Math.exp(-5 * dt);
    const fanReach = viewport.width < 5 ? 0.55 : 1.45;
    // A pilha respira: uma onda sobe pelas camadas e o conjunto abre e fecha devagar
    const breathe = 1 + Math.sin(t * 0.7) * 0.1 * calm;
    plates.forEach((p, i) => {
      const u = p.material.uniforms;
      u.uReveal.value = THREE.MathUtils.clamp(v - i - 1, 0, 1);
      u.uWire.value = THREE.MathUtils.clamp((v - i) * 3, 0, 1);

      // Cada camada voa de longe, gira e pousa com um quique
      const raw = THREE.MathUtils.clamp((stage.intro - i) / 1.25, 0, 1);
      const eased = raw * raw * (3 - 2 * raw);
      const c = 1.5;
      const r1 = raw - 1;
      const land = 1 + (c + 1) * r1 * r1 * r1 + c * r1 * r1;
      const appear = THREE.MathUtils.clamp((stage.intro - i) * 4, 0, 1);
      if (raw >= 1 && !landed.current[i]) {
        landed.current[i] = true;
        flash.current[i] = 1;
        ki.v -= 2.4;
        if (stage.intro < 7.95) sfx.land(i);
      } else if (raw < 1) {
        landed.current[i] = false;
      }
      flash.current[i] *= fk;

      // Scroll: de cima para baixo, cada camada se abre para o lado e depois vai embora.
      // A imagem fica por último, de frente, como a página pronta.
      const isImage = i === IMAGE_LAYER;
      const order = isImage ? 6.4 : i > IMAGE_LAYER ? 6 - i : 6 - i - 1;
      const fan = smoothRange(0.1 + order * 0.082, 0.36 + order * 0.082);
      const gone = isImage ? smoothRange(0.92, 1) : smoothRange(0.56 + order * 0.04, 0.78 + order * 0.04);
      u.uOpacity.value = stage.opacity * appear * (1 - gone) * (isImage ? 1 : 1 - stage.flat);
      u.uTime.value = t;
      u.uFlash.value = flash.current[i];
      lift.current[i] += ((hot === i ? 1 : 0) - lift.current[i]) * hk;
      u.uHot.value = lift.current[i];

      const m = meshes.current[i];
      if (m) {
        const side = i % 2 ? 1 : -1;
        const away = 1 - land;
        const gap = 0.6 * stage.explode * stage.stack * breathe;
        const wave = Math.sin(t * 1.25 - i * 0.62) * 0.045 * stage.explode * calm;
        const squeeze = ki.x * (i - 3) * 0.035;
        const reach = isImage ? 0 : fan * fanReach * side;
        const flyOut = isImage ? 0 : gone * 4.2 * side;
        const hop = Math.sin(fan * Math.PI) * 0.28;
        // A imagem vem para o centro da pilha ao ficar de frente
        const toCenter = isImage ? faceUs : 0;
        const stackY = (i - 3) * gap;
        m.position.set(
          side * away * (2.6 + i * 0.2) + reach + flyOut,
          stackY * (1 - toCenter) + wave + squeeze + i * 0.002 + lift.current[i] * 0.22 * stage.explode + away * (2.2 + (6 - i) * 0.25) + hop + gone * 1.4 * (isImage ? 0 : 1) + (isImage ? faceUs * 0.15 : 0),
          -side * away * 1.6 - (isImage ? 0 : fan * 0.35),
        );
        m.rotation.set(
          -Math.PI / 2 + (1 - eased) * side * 1.25 + fan * (1 - gone) * side * -0.16 + gone * side * 0.9,
          (1 - eased) * 0.9,
          (1 - eased) * side * 1.6 + fan * side * 0.13 + gone * side * 0.7,
        );
        m.scale.setScalar(isImage ? 1 + faceUs * 0.06 : 1);
      }

      const sprite = sprites.current[i];
      if (sprite) {
        const showing = Math.min(appear, 1 - THREE.MathUtils.clamp((stage.intro - i - 1.7) / 0.7, 0, 1));
        const during = Math.min(fan, 1 - gone) * (isImage ? 1 - smoothRange(0.86, 0.92) : 1);
        const opacity = Math.max(stage.intro < 8 ? showing : 0, during);
        sprite.visible = opacity > 0.01;
        labels[i].opacity = opacity * stage.opacity;
      }
    });

    // Camada de código rola sem parar
    plates[6].material.uniforms.uFlow.value = stage.reduced ? 0 : 0.001 + (t * 0.045) % 1;

    // Um ponto de luz percorre a curva de animação
    if (runner.current) {
      const q = (t * 0.28) % 1;
      const a = 1 - q;
      const bx = a * a * a * 60 + 3 * a * a * q * 360 + 3 * a * q * q * 340 + q * q * q * 960;
      const by = a * a * a * 560 + 3 * a * a * q * 560 + 3 * a * q * q * 90 + q * q * q * 90;
      runner.current.position.set((bx / W - 0.5) * PLATE_W, (0.5 - by / H) * PLATE_H, 0.02);
      runner.current.visible = v > 6.8 && stage.opacity > 0.3;
    }

    // Os projetos se revezam na camada de imagem, trocados por uma varredura
    const sw = swap.current;
    const imgU = plates[IMAGE_LAYER].material.uniforms;
    if (!stage.reduced && stage.intro >= 8 && stage.opacity > 0.6 && gallery.current.length) {
      if (!sw.on) {
        sw.wait -= dt;
        if (sw.wait <= 0) {
          sw.on = true;
          sw.p = 0;
          imgU.uMap2.value = gallery.current[(sw.index + 1) % gallery.current.length];
        }
      } else {
        sw.p = Math.min(1, sw.p + dt / 0.95);
        imgU.uSwap.value = sw.p * sw.p * (3 - 2 * sw.p);
        if (sw.p >= 1) {
          sw.index = (sw.index + 1) % gallery.current.length;
          imgU.uMap.value = gallery.current[sw.index];
          imgU.uSwap.value = 0;
          sw.on = false;
          sw.wait = 4;
        }
      }
    }
  });

  return (
    <group ref={group}>
      {plates.map((p) => (
        <mesh
          key={p.i}
          ref={(m) => {
            meshes.current[p.i] = m;
          }}
          geometry={p.geo}
          material={p.material}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={p.i}
          userData={{ i: p.i }}
        >
          <sprite
            ref={(s) => {
              sprites.current[p.i] = s;
            }}
            material={labels[p.i]}
            position={[PLATE_W / 2 + 0.25, PLATE_H / 2 - 0.1, 0.05]}
            scale={[0.95, 0.2, 1]}
            renderOrder={70}
          />
          {p.i === 5 && (
            <mesh ref={runner} renderOrder={69}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshBasicMaterial color="#ffd27a" />
            </mesh>
          )}
        </mesh>
      ))}
    </group>
  );
}

/** Em máquina fraca, reduz a resolução e o trabalho por quadro em vez de travar. */
function Adaptive() {
  const setDpr = useThree((s) => s.setDpr);
  const frames = useRef(0);
  const elapsed = useRef(0);
  const level = useRef(0);
  useFrame((_, dt) => {
    frames.current++;
    elapsed.current += dt;
    if (elapsed.current < 2) return;
    const fps = frames.current / elapsed.current;
    frames.current = 0;
    elapsed.current = 0;
    if (fps < 42 && level.current < 2) {
      level.current++;
      stage.low = true;
      setDpr(level.current === 1 ? 0.9 : 0.72);
    }
  });
  return null;
}

function hasWebGL() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export default function LayerScene() {
  const [supported] = useState(hasWebGL);
  const [active, setActive] = useState(true);

  // Sem nada visível, não gasta GPU.
  useEffect(() => {
    const check = () => {
      const on = stage.opacity > 0.005 || stage.dOp > 0.005 || stage.objs > 0.005 || stage.blocks > 0.005 || stage.jOp > 0.005;
      setActive((a) => (a === on ? a : on));
    };
    gsap.ticker.add(check);
    return () => gsap.ticker.remove(check);
  }, []);

  if (!supported) return null;
  return (
    <div className="stage-canvas" aria-hidden style={{ visibility: active ? "visible" : "hidden" }}>
      <Canvas flat dpr={[1, 1.5]} frameloop={active ? "always" : "never"} camera={{ fov: 35, position: [0, 0, 9] }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
        <Adaptive />
        <directionalLight position={[3, 5, 5]} intensity={1.8} />
        <pointLight position={[-4, -1, 3]} intensity={18} color="#2bff88" />
        <BlockField />
        <Particles />
        <Plates />
        <Journey />
        <Objects />
      </Canvas>
    </div>
  );
}
