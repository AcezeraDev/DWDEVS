"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  siCss,
  siFigma,
  siFramer,
  siGit,
  siGithub,
  siGreensock,
  siHtml5,
  siJavascript,
  siNextdotjs,
  siNodedotjs,
  siOpengl,
  siPostgresql,
  siReact,
  siShadcnui,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siVercel,
  siWebgl,
  type SimpleIcon,
} from "simple-icons";

type Tech = { name: string; icon: SimpleIcon };

export const TECHS: Tech[] = [
  { name: "Next.js", icon: siNextdotjs },
  { name: "React", icon: siReact },
  { name: "TypeScript", icon: siTypescript },
  { name: "Three.js", icon: siThreedotjs },
  { name: "GSAP", icon: siGreensock },
  { name: "Tailwind", icon: siTailwindcss },
  { name: "Motion", icon: siFramer },
  { name: "WebGL", icon: siWebgl },
  { name: "Node.js", icon: siNodedotjs },
  { name: "Supabase", icon: siSupabase },
  { name: "Vercel", icon: siVercel },
  { name: "Figma", icon: siFigma },
  { name: "shadcn/ui", icon: siShadcnui },
  { name: "JavaScript", icon: siJavascript },
  { name: "GLSL", icon: siOpengl },
  { name: "PostgreSQL", icon: siPostgresql },
  { name: "Git", icon: siGit },
  { name: "GitHub", icon: siGithub },
  { name: "HTML5", icon: siHtml5 },
  { name: "CSS", icon: siCss },
];

// Monochrome brands (black) read as the paper color on hover instead.
const brandColor = (hex: string) => (["000000", "181717"].includes(hex) ? "#f1f0e8" : `#${hex}`);

type DragState = { vx: number; vy: number; dragging: boolean };
type Labels = React.RefObject<(HTMLElement | null)[]>;

function Cloud({ drag, labels }: { drag: React.RefObject<DragState>; labels: Labels }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const radius = 2.15;

  const points = useMemo(() => {
    const n = TECHS.length;
    return TECHS.map((_, i) => {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(radius);
    });
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    const d = drag.current;
    if (!g || !d) return;
    const { width, height } = state.size;
    // Pull the camera back on narrow screens so the cloud fits.
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, width < 520 ? 8.4 : 6.2, 4, delta);

    if (!d.dragging) {
      d.vx = THREE.MathUtils.damp(d.vx, 0.25, 1.5, delta);
      d.vy = THREE.MathUtils.damp(d.vy, 0, 1.5, delta);
    }
    g.rotation.y += d.vx * delta;
    g.rotation.x = THREE.MathUtils.clamp(g.rotation.x + d.vy * delta, -0.8, 0.8);
    g.updateMatrixWorld();

    if (core.current) {
      core.current.rotation.x += delta * 0.2;
      core.current.rotation.y -= delta * 0.3;
    }

    // Project each point to screen space and place its DOM label there.
    labels.current?.forEach((el, i) => {
      if (!el) return;
      tmp.copy(points[i]).applyMatrix4(g.matrixWorld);
      const depth = (tmp.z + radius) / (radius * 2); // 0 back → 1 front
      tmp.project(state.camera);
      const x = (tmp.x * 0.5 + 0.5) * width;
      const y = (-tmp.y * 0.5 + 0.5) * height;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${0.62 + depth * 0.5})`;
      el.style.opacity = String(0.12 + depth * 0.88);
      el.style.zIndex = String(Math.round(depth * 100));
      el.style.pointerEvents = depth > 0.45 ? "auto" : "none";
    });
  });

  return (
    <group ref={group}>
      <mesh ref={core}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial color="#c8f031" wireframe transparent opacity={0.35} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshBasicMaterial color="#c8f031" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

export default function TechSphere() {
  const drag = useRef<DragState>({ vx: 0.25, vy: 0, dragging: false });
  const last = useRef({ x: 0, y: 0 });
  const labels = useRef<(HTMLElement | null)[]>([]);

  return (
    <div
      className="relative h-[440px] w-full select-none md:h-[560px]"
      style={{ touchAction: "pan-y" }}
      data-cursor="drag"
      onPointerDown={(e) => {
        drag.current.dragging = true;
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!drag.current.dragging) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        drag.current.vx = dx * 0.35;
        if (e.pointerType === "mouse") drag.current.vy = dy * 0.25;
      }}
      onPointerUp={() => (drag.current.dragging = false)}
      onPointerLeave={() => (drag.current.dragging = false)}
      onPointerCancel={() => (drag.current.dragging = false)}
    >
      <Canvas camera={{ position: [0, 0, 6.2], fov: 45 }} dpr={[1, 1.75]} gl={{ alpha: true }}>
        <Cloud drag={drag} labels={labels} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {TECHS.map((t, i) => (
          <span
            key={t.name}
            ref={(el) => {
              labels.current[i] = el;
            }}
            title={t.name}
            style={{ "--brand": brandColor(t.icon.hex) } as React.CSSProperties}
            className="group/chip absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap rounded-2xl border border-white/10 bg-ink/75 py-2 pl-2 pr-3 opacity-0 backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-300 will-change-transform hover:border-[var(--brand)] hover:bg-ink hover:shadow-[0_0_32px_-6px_var(--brand)]"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-white/5 transition-colors duration-300 group-hover/chip:bg-white/10">
              <svg
                viewBox="0 0 24 24"
                className="size-[18px] fill-paper transition-[fill,transform] duration-300 group-hover/chip:scale-110 group-hover/chip:fill-[var(--brand)]"
                aria-hidden
              >
                <path d={t.icon.path} />
              </svg>
            </span>
            <span className="font-mono text-[12px] tracking-wide text-paper/85">{t.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
