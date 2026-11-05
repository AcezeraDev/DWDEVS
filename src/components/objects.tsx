"use client";

/* eslint-disable react-hooks/immutability -- laço de quadro do R3F: objetos do three são mutados fora do React de propósito */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { sfx } from "@/lib/sound";
import { burst, stage } from "@/lib/stage";
import { tintMaterial } from "@/lib/world";

export function extrude(points: [number, number][], depth = 0.22) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 8 });
  g.center();
  return g;
}

export const CURSOR: [number, number][] = [[-0.5, 0.75], [-0.1, -0.75], [0.08, -0.15], [0.62, 0.02]];
const CHEVRON: [number, number][] = [[0.3, 0.7], [-0.45, 0], [0.3, -0.7], [0.3, -0.34], [-0.08, 0], [0.3, 0.34]];
const SLASH: [number, number][] = [[0.14, 0.8], [0.42, 0.8], [-0.14, -0.8], [-0.42, -0.8]];

type Item = { geo: () => THREE.BufferGeometry; color: string; rough: number; metal: number; x: number; y: number; z: number; s: number; spin: [number, number]; label: string };

const ITEMS: Item[] = [
  // Só nas áreas livres do hero: canto superior direito e vãos ao lado da pilha, longe do texto.
  { geo: () => extrude(CURSOR), color: "#2bff88", rough: 0.16, metal: 1, x: 0.6, y: 0.26, z: 0.3, s: 0.46, spin: [0.2, 0.45], label: "cursor" },
  { geo: () => extrude(CHEVRON), color: "#e9f2ec", rough: 0.08, metal: 1, x: 0.88, y: 0.42, z: 0.2, s: 0.5, spin: [0.15, 0.5], label: "abre tag" },
  { geo: () => new THREE.IcosahedronGeometry(0.62, 0), color: "#1fd1ba", rough: 0.03, metal: 0.9, x: 0.74, y: -0.2, z: -0.1, s: 0.44, spin: [0.25, 0.4], label: "cristal" },
  { geo: () => new THREE.TorusKnotGeometry(0.36, 0.12, 180, 24), color: "#2bff88", rough: 0.2, metal: 1, x: 0.76, y: 0.46, z: -0.6, s: 0.56, spin: [0.2, 0.55], label: "nó" },
  { geo: () => new THREE.TorusGeometry(0.52, 0.17, 28, 72), color: "#ffb224", rough: 0.12, metal: 1, x: -0.46, y: -0.12, z: -0.2, s: 0.46, spin: [0.5, 0.3], label: "anel" },
  { geo: () => new THREE.SphereGeometry(0.46, 48, 32), color: "#e9f2ec", rough: 0.02, metal: 1, x: -0.4, y: -0.76, z: 0.2, s: 0.42, spin: [0.1, 0.1], label: "esfera" },
  { geo: () => extrude(SLASH), color: "#a07bff", rough: 0.14, metal: 1, x: 0.5, y: 0.44, z: -0.6, s: 0.38, spin: [0.3, 0.25], label: "barra" },
];

// No celular só cabem três, nas laterais da pilha.
const MOBILE_SPOTS: [number, number][] = [
  [-0.76, 0.3],
  [0.8, 0.02],
  [-0.78, -0.1],
];

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tmp = new THREE.Vector3();

export function Objects() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);

  const list = useMemo(() => {
    const mobile = innerWidth < 768;
    return (mobile ? ITEMS.slice(0, 3) : ITEMS).map((it, i) => ({
      ...it,
      x: mobile ? MOBILE_SPOTS[i][0] : it.x,
      y: mobile ? MOBILE_SPOTS[i][1] : it.y,
      s: mobile ? it.s * 0.8 : it.s,
      geometry: it.geo(),
      material: new THREE.MeshPhysicalMaterial({ color: it.color, roughness: it.rough, metalness: it.metal, clearcoat: 1, clearcoatRoughness: 0.1, flatShading: it.label === "cristal", transparent: true }),
      off: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      hot: 0,
      popped: 0,
    }));
  }, []);

  const state = useRef({ hover: -1, drag: -1, last: new THREE.Vector3() });

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
      list.forEach((i) => {
        i.geometry.dispose();
        i.material.dispose();
      });
    };
  }, [gl, scene, list]);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.("a,button,input,[data-orbit]")) return;
      const x = (e.clientX / innerWidth) * 2 - 1;
      const y = -((e.clientY / innerHeight) * 2 - 1);
      burst(x, y);
      if (stage.objs < 0.5 || !group.current) return;
      ndc.set(x, y);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(group.current.children, false)[0];
      if (!hit) return;
      const i = hit.object.userData.i as number;
      const it = list[i];
      it.vel.add(tmp.set((Math.random() - 0.5) * 7, 3 + Math.random() * 4, (Math.random() - 0.5) * 5));
      it.popped = 1;
      sfx.tick();
      if (e.pointerType === "mouse") {
        e.preventDefault();
        state.current.drag = i;
        document.documentElement.classList.add("grabbing");
      }
    };
    const up = () => {
      state.current.drag = -1;
      document.documentElement.classList.remove("grabbing");
    };
    addEventListener("pointerdown", down);
    addEventListener("pointerup", up);
    return () => {
      removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
    };
  }, [camera, list]);

  useFrame((three, delta) => {
    const g = group.current;
    if (!g) return;
    g.visible = stage.objs > 0.01;
    if (!g.visible) return;
    const dt = Math.min(delta, 0.05);
    const vp = three.viewport;
    const fit = THREE.MathUtils.clamp(vp.width / 8, 0.55, 1.1);
    const s = state.current;

    s.hover = -1;
    if (stage.hasMouse && stage.objs > 0.5) {
      ndc.set(stage.px, -stage.py);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(g.children, false)[0];
      if (hit) s.hover = hit.object.userData.i as number;
    }
    document.documentElement.classList.toggle("can-grab", s.hover >= 0);
    if (s.hover >= 0) stage.hoverLabel = `${list[s.hover].label} · arraste`;

    list.forEach((it, i) => {
      const m = g.children[i] as THREE.Mesh | undefined;
      if (!m) return;
      if (it.color === "#2bff88") tintMaterial(it.material.color);
      const here = vp.getCurrentViewport(camera, tmp.set(0, 0, it.z));
      const bx = (it.x * here.width) / 2;
      const by = (it.y * here.height) / 2 + (stage.sc * here.height) * (0.72 + it.z * 0.25);
      const mx = (stage.px * here.width) / 2;
      const my = (-stage.py * here.height) / 2;

      if (s.drag === i) {
        const nx = mx - bx;
        const ny = my - by;
        it.vel.set((nx - it.off.x) / dt, (ny - it.off.y) / dt, 0).clampLength(0, 14);
        it.off.x = nx;
        it.off.y = ny;
      } else {
        if (stage.hasMouse) {
          const ddx = bx + it.off.x - mx;
          const ddy = by + it.off.y - my;
          const d2 = ddx * ddx + ddy * ddy;
          const f = Math.exp(-d2 * 1.6) * 7;
          it.vel.x += ((ddx / (Math.sqrt(d2) + 0.01)) * f) * dt;
          it.vel.y += ((ddy / (Math.sqrt(d2) + 0.01)) * f) * dt;
        }
        // Mola com pouco amortecimento: passa do ponto e volta
        it.vel.x += -it.off.x * 7 * dt;
        it.vel.y += -it.off.y * 7 * dt;
        it.vel.z += -it.off.z * 7 * dt;
        it.vel.multiplyScalar(Math.exp(-1.9 * dt));
        it.off.addScaledVector(it.vel, dt);
      }

      const t = three.clock.elapsedTime;
      const calm = stage.reduced ? 0 : 1;
      m.position.set(bx + it.off.x, by + it.off.y + Math.sin(t * 0.7 + i * 1.7) * 0.08 * calm, it.z + it.off.z);
      // Na abertura, cada objeto é arremessado para fora da pilha
      const launch = Math.min(1, Math.max(0, stage.introObjs * 1.9 - (i / list.length) * 0.9));
      const u = launch - 1;
      const pop = launch <= 0 ? 0 : 1 + 2.5 * u * u * u + 1.5 * u * u;
      m.position.x = THREE.MathUtils.lerp(0.2, m.position.x, pop);
      m.position.y = THREE.MathUtils.lerp(-1.2, m.position.y, pop);
      const speed = it.vel.length();
      it.hot += ((s.hover === i || s.drag === i ? 1 : 0) - it.hot) * (1 - Math.exp(-10 * dt));
      it.popped = Math.max(0, it.popped - dt * 2.4);
      m.rotation.x += (it.spin[0] * calm + speed * 0.1 + it.hot * 0.6) * dt;
      m.rotation.y += (it.spin[1] * calm + speed * 0.18 + it.hot * 1.1) * dt;
      m.scale.setScalar(Math.max(0.001, it.s * fit * stage.objs * pop * (1 + it.hot * 0.16 + it.popped * 0.28)));
      (m.material as THREE.MeshPhysicalMaterial).opacity = Math.min(1, stage.objs * 1.4);
    });
  });

  return (
    <group ref={group}>
      {list.map((it, i) => (
        <mesh key={it.label} geometry={it.geometry} material={it.material} userData={{ i }} renderOrder={20} />
      ))}
    </group>
  );
}
