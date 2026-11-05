"use client";

/* eslint-disable react-hooks/immutability -- laço de quadro do R3F: objetos do three são mutados fora do React de propósito */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { flyToCase } from "@/lib/transition";
import { sfx } from "@/lib/sound";
import { accent } from "@/lib/world";
import { PROJECTS } from "@/lib/content";

const RADIUS = 3.5;
const PANEL_W = 2.55;
const PANEL_H = PANEL_W * 0.625;
const COUNT = 8; // os 4 projetos duas vezes, para fechar o anel
const STEP = (Math.PI * 2) / COUNT;

const vertex = /* glsl */ `
  uniform float uVel;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    // O painel enverga com a velocidade do giro
    world.y += sin(uv.x * 3.1416) * uVel * 0.12;
    vFacing = smoothstep(-1.0, ${RADIUS.toFixed(1)}, world.z);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uVel;
  uniform float uHot;
  uniform vec3 uAccent;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    float shift = 0.0018 + abs(uVel) * 0.012;
    vec3 col = vec3(texture2D(uMap, vUv + vec2(shift, 0.0)).r, texture2D(uMap, vUv).g, texture2D(uMap, vUv - vec2(shift, 0.0)).b);
    col *= 0.08 + 0.92 * vFacing * vFacing;
    vec2 e = min(vUv, 1.0 - vUv) * vec2(1.6, 1.0);
    float d = min(e.x, e.y);
    float border = 1.0 - smoothstep(0.0, fwidth(d) * (1.4 + uHot * 2.5), d);
    col = mix(col, uAccent, border * (0.3 + uHot * 0.7));
    col += vec3(0.05, 0.25, 0.14) * uHot * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function bentPlane() {
  const g = new THREE.PlaneGeometry(PANEL_W, PANEL_H, 32, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) / RADIUS;
    p.setXYZ(i, Math.sin(t) * RADIUS, p.getY(i), Math.cos(t) * RADIUS);
  }
  g.computeVertexNormals();
  return g;
}

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function Ring({ motion, onFront, reduced }: { motion: React.RefObject<{ angle: number; vel: number; dragging: boolean; hoverX: number; hoverY: number; hovering: boolean; hit: number }>; onFront: (i: number) => void; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const last = useRef(-1);

  const { geometry, panels, dispose } = useMemo(() => {
    const geo = bentPlane();
    const loader = new THREE.TextureLoader();
    const maps = PROJECTS.map((p) => {
      const t = loader.load(p.img);
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 8;
      return t;
    });
    const list = Array.from({ length: COUNT }, (_, i) => ({
      i,
      material: new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        side: THREE.DoubleSide,
        uniforms: { uMap: { value: maps[i % maps.length] }, uVel: { value: 0 }, uHot: { value: 0 }, uAccent: accent },
      }),
    }));
    return {
      geometry: geo,
      panels: list,
      dispose: () => {
        geo.dispose();
        maps.forEach((t) => t.dispose());
        list.forEach((p) => p.material.dispose());
      },
    };
  }, []);
  useEffect(() => dispose, [dispose]);

  useFrame((_, delta) => {
    const g = group.current;
    const m = motion.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    if (!m.dragging) {
      m.angle += m.vel * dt;
      m.vel *= Math.exp(-2.1 * dt);
      if (!reduced && !m.hovering) m.angle += 0.14 * dt;
    }
    g.rotation.y = m.angle;
    const front = (((Math.round(-m.angle / STEP) % COUNT) + COUNT) % COUNT);
    if (front !== last.current) {
      if (last.current >= 0) sfx.tick();
      last.current = front;
      onFront(front % PROJECTS.length);
    }

    m.hit = -1;
    if (m.hovering) {
      ndc.set(m.hoverX, m.hoverY);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(g.children, false)[0];
      if (hit) m.hit = hit.object.userData.i as number;
    }
    const k = 1 - Math.exp(-9 * dt);
    panels.forEach((p) => {
      const u = p.material.uniforms;
      u.uVel.value = THREE.MathUtils.clamp(m.vel * 0.45, -1.5, 1.5);
      u.uHot.value += ((m.hit === p.i ? 1 : 0) - u.uHot.value) * k;
    });
  });

  return (
    <group ref={group} position={[0, -0.05, 0]}>
      {panels.map((p) => (
        <mesh key={p.i} geometry={geometry} material={p.material} rotation={[0, p.i * STEP, 0]} userData={{ i: p.i }} />
      ))}
    </group>
  );
}

export default function ProjectOrbit() {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const motion = useRef({ angle: 0, vel: 0, dragging: false, hoverX: 0, hoverY: 0, hovering: false, hit: -1 });
  const [front, setFront] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const project = PROJECTS[front];

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "20% 0px" });
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  const pointer = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    motion.current.hoverX = ((e.clientX - r.left) / r.width) * 2 - 1;
    motion.current.hoverY = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  const onDown = (e: React.PointerEvent) => {
    const m = motion.current;
    pointer(e);
    let lastX = e.clientX;
    let lastT = performance.now();
    let moved = 0;
    m.dragging = true;
    m.vel = 0;
    const move = (ev: PointerEvent) => {
      const now = performance.now();
      const dx = ev.clientX - lastX;
      moved += Math.abs(dx);
      const d = (dx / wrap.current!.clientWidth) * 3.4;
      m.angle += d;
      m.vel = (d / Math.max(0.008, (now - lastT) / 1000)) * 0.75;
      lastX = ev.clientX;
      lastT = now;
    };
    const up = () => {
      m.dragging = false;
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", up);
      if (moved < 6 && m.hit >= 0) {
        const slug = PROJECTS[m.hit % PROJECTS.length].slug;
        const r = wrap.current!.getBoundingClientRect();
        const h = r.height * 0.58;
        const w = h * 1.6;
        flyToCase(`/projects/${slug}/d1.jpg`, { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h }, () => router.push(`/projetos/${slug}`));
      }
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
  };

  const nudge = (dir: number) => {
    motion.current.vel += dir * 1.75;
  };

  return (
    <div>
      <div
        ref={wrap}
        data-orbit
        onPointerDown={onDown}
        onPointerMove={(e) => {
          pointer(e);
          motion.current.hovering = e.pointerType === "mouse";
        }}
        onPointerLeave={() => (motion.current.hovering = false)}
        className="orbit relative h-[52vh] min-h-[320px] w-full md:h-[72vh]"
        aria-hidden
      >
        {visible && (
          <Canvas flat dpr={[1, 2]} camera={{ fov: 30, position: [0, 0.45, innerWidth < 768 ? 11.5 : 8.7] }} gl={{ antialias: true, alpha: true }}>
            <Ring motion={motion} onFront={setFront} reduced={reduced} />
          </Canvas>
        )}
      </div>
      <div className="gutter mt-2 flex flex-wrap items-center justify-between gap-4">
        <p className="min-w-0" aria-live="polite">
          <span className="tag text-muted">{project.kind}</span>
          <a href={`/projetos/${project.slug}`} data-fly-case={project.slug} className="display mt-1 block text-[clamp(2rem,4vw,3.4rem)] transition-colors hover:text-sig">
            {project.name} <span aria-hidden className="text-sig">↗</span>
          </a>
        </p>
        <div className="flex items-center gap-2">
          <span className="tag mr-2 hidden text-muted sm:block">Arraste o anel</span>
          <button type="button" aria-label="Projeto anterior" onClick={() => nudge(1)} className="orbit-btn">←</button>
          <button type="button" aria-label="Próximo projeto" onClick={() => nudge(-1)} className="orbit-btn">→</button>
        </div>
      </div>
    </div>
  );
}
