"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { scrollStore } from "@/lib/scroll-store";
import { bgFragment, bgVertex, galaxyFragment, galaxyVertex } from "./shaders";

const smooth = (t: number) => t * t * (3 - 2 * t);
const PLANET = new THREE.Vector3(0, 0.6, -50);
const LOGO_Z = -62;

/**
 * The scroll journey. For each page position: where the camera is, what it looks at,
 * which shape the particles form and how bright they are (dimmer behind text).
 */
const JOURNEY: { p: number; pos: [number, number, number]; look: [number, number, number]; m: number; o: number }[] = [
  { p: 0.0, pos: [0, 2.2, 8.5], look: [-3.6, -0.3, 0], m: 0, o: 0.9 },
  { p: 0.06, pos: [-0.6, 1.8, 7.2], look: [-2.2, 0, -1], m: 0, o: 0.85 },
  { p: 0.13, pos: [-0.4, 0.8, 6], look: [0, 0, -6], m: 0.45, o: 0.35 },
  { p: 0.2, pos: [0, 0, 3], look: [0, 0, -12], m: 1, o: 0.4 },
  { p: 0.48, pos: [0, 0, -18], look: [0, 0, -30], m: 1, o: 0.4 },
  { p: 0.56, pos: [0, 1.6, -23], look: [0, -1.4, -34], m: 2, o: 0.55 },
  { p: 0.74, pos: [0, 1.2, -31], look: [0, -0.6, -42], m: 2, o: 0.55 },
  { p: 0.84, pos: [4.5, 1.6, -40], look: [0, 0.6, -50], m: 3, o: 0.45 },
  { p: 0.93, pos: [0, 0.5, -52.5], look: [0, 0.5, LOGO_Z], m: 4, o: 1 },
  { p: 1.0, pos: [0, 0.5, -53.5], look: [0, 0.5, LOGO_Z], m: 4, o: 1 },
];

const CAM_PATH = new THREE.CatmullRomCurve3(JOURNEY.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
const LOOK_PATH = new THREE.CatmullRomCurve3(JOURNEY.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");

function sampleJourney(p: number) {
  const n = JOURNEY.length;
  for (let i = 0; i < n - 1; i++) {
    const a = JOURNEY[i];
    const b = JOURNEY[i + 1];
    if (p >= a.p && p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      const e = smooth(t);
      return { u: (i + t) / (n - 1), m: THREE.MathUtils.lerp(a.m, b.m, e), o: THREE.MathUtils.lerp(a.o, b.o, e) };
    }
  }
  return { u: 1, m: JOURNEY[n - 1].m, o: JOURNEY[n - 1].o };
}

/** Points of the "DW" monogram sampled from a 2D canvas. */
function sampleLogo(n: number, width: number): Float32Array {
  const out = new Float32Array(n * 3);
  const w = 360;
  const h = 160;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return out;
  ctx.fillStyle = "#fff";
  ctx.font = "900 150px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DW", w / 2, h / 2 + 6);
  const data = ctx.getImageData(0, 0, w, h).data;
  const filled: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 128) filled.push([x, y]);
    }
  }
  const scale = width / w;
  for (let i = 0; i < n; i++) {
    const [x, y] = filled[Math.floor(Math.random() * filled.length)] ?? [w / 2, h / 2];
    out[i * 3] = (x - w / 2 + Math.random()) * scale;
    out[i * 3 + 1] = -(y - h / 2 + Math.random()) * scale + 1.4;
    out[i * 3 + 2] = LOGO_Z + (Math.random() - 0.5) * 0.4;
  }
  return out;
}

function buildShapes(n: number) {
  const galaxy = new Float32Array(n * 3);
  const tunnel = new Float32Array(n * 3);
  const terrain = new Float32Array(n * 3);
  const planet = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  const tilt = 0.42;

  for (let i = 0; i < n; i++) {
    const k = i * 3;
    rand[i] = Math.random();

    // Spiral galaxy with three arms, tilted toward the viewer
    const r = Math.pow(Math.random(), 1.6) * 5.2 + 0.05;
    const arm = ((i % 3) / 3) * Math.PI * 2;
    const ang = arm + r * 1.05;
    const spread = Math.pow(Math.random(), 3) * (0.25 + r * 0.22);
    const gx = Math.cos(ang) * r + (Math.random() - 0.5) * spread * 2;
    const gz = Math.sin(ang) * r + (Math.random() - 0.5) * spread * 2;
    const gy = (Math.random() - 0.5) * spread * 0.8;
    galaxy[k] = gx;
    galaxy[k + 1] = gy * Math.cos(tilt) - gz * Math.sin(tilt);
    galaxy[k + 2] = gy * Math.sin(tilt) + gz * Math.cos(tilt);

    // Tunnel along -z, hollow in the middle so text stays readable
    const tr = 2.4 + Math.pow(Math.random(), 2) * 2.4;
    const ta = Math.random() * Math.PI * 2;
    tunnel[k] = Math.cos(ta) * tr;
    tunnel[k + 1] = Math.sin(ta) * tr;
    tunnel[k + 2] = 4 - Math.random() * 34;

    // Terrain below the flight path
    terrain[k] = (Math.random() - 0.5) * 30;
    terrain[k + 1] = -2.6 + (Math.random() - 0.5) * 0.15;
    terrain[k + 2] = -24 - Math.random() * 22;

    // Planet: 40% sphere shell, 60% tilted ring
    if (Math.random() < 0.4) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2 + Math.random() * 0.12);
      planet[k] = PLANET.x + v.x;
      planet[k + 1] = PLANET.y + v.y;
      planet[k + 2] = PLANET.z + v.z;
    } else {
      const rr = 3.2 + Math.random() * 2.4;
      const ra = Math.random() * Math.PI * 2;
      const x = Math.cos(ra) * rr;
      const z = Math.sin(ra) * rr;
      const y = (Math.random() - 0.5) * 0.08;
      const rt = 0.38;
      planet[k] = PLANET.x + x;
      planet[k + 1] = PLANET.y + y * Math.cos(rt) - z * Math.sin(rt);
      planet[k + 2] = PLANET.z + y * Math.sin(rt) + z * Math.cos(rt);
    }
  }
  return { galaxy, tunnel, terrain, planet, logo: sampleLogo(n, 8.5), rand };
}

function Background() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const size = useThree((s) => s.size);
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRes: { value: new THREE.Vector2(1, 1) },
    }),
    []
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    u.uTime.value += delta;
    u.uScroll.value = THREE.MathUtils.lerp(u.uScroll.value, scrollStore.progress, 0.08);
    mouse.current.set(state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5);
    u.uMouse.value.lerp(mouse.current, 0.06);
    u.uRes.value.set(size.width, size.height);
  });

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={bgVertex}
        fragmentShader={bgFragment}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

/** The particle field plus the camera that flies through it as the page scrolls. */
function Journey() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const size = useThree((s) => s.size);
  const count = size.width < 768 ? 16000 : 38000;
  const sp = useRef(0);
  const pulse = useRef(0);
  const look = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);

  const shapes = useMemo(() => buildShapes(count), [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uIntro: { value: 1 },
      uPulse: { value: 0 },
      uSize: { value: 30 },
      uAspect: { value: 1 },
      uOpacity: { value: 1 },
      uMouse: { value: new THREE.Vector2(9, 9) },
      uPlanet: { value: PLANET },
    }),
    []
  );

  useEffect(() => {
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest?.("a, button, [data-cursor]")) return;
      pulse.current = 1;
    };
    window.addEventListener("pointerdown", down);
    return () => window.removeEventListener("pointerdown", down);
  }, []);

  useFrame((state, delta) => {
    const m = mat.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    const u = m.uniforms;
    const narrow = size.width / size.height < 1;

    // The camera trails the real scroll a little: it glides instead of stepping.
    sp.current = THREE.MathUtils.damp(sp.current, scrollStore.progress, 2.4, dt);
    const j = sampleJourney(sp.current);

    CAM_PATH.getPoint(j.u, camTarget);
    LOOK_PATH.getPoint(j.u, lookTarget);
    if (narrow) {
      // Phones: frame the galaxy above the headline and back off to fit the logo.
      lookTarget.x *= 0.15;
      if (j.u < 0.2) lookTarget.y -= 1.6 * (1 - j.u / 0.2);
      camTarget.z += 4 * smooth(THREE.MathUtils.clamp((sp.current - 0.84) / 0.1, 0, 1));
    }
    const cam = state.camera;
    cam.position.set(
      camTarget.x + state.pointer.x * 0.5,
      camTarget.y + state.pointer.y * 0.35,
      camTarget.z + scrollStore.intro * 4
    );
    look.lerp(lookTarget, 1 - Math.exp(-dt * 6));
    if (look.lengthSq() === 0) look.copy(lookTarget);
    cam.lookAt(look);
    cam.rotateZ(Math.sin(sp.current * Math.PI * 3) * 0.05 + scrollStore.velocity * 0.0006);

    pulse.current = THREE.MathUtils.damp(pulse.current, 0, 2.2, dt);
    u.uTime.value += dt;
    u.uMorph.value = j.m;
    u.uIntro.value = scrollStore.intro;
    u.uPulse.value = pulse.current;
    u.uSize.value = 40 * state.viewport.dpr * (narrow ? 0.8 : 1);
    u.uAspect.value = size.width / size.height;
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, j.o * (narrow ? 0.65 : 1), 4, dt);
    mouse.set(state.pointer.x, state.pointer.y);
    u.uMouse.value.lerp(mouse, 1 - Math.exp(-dt * 10));
  });

  return (
    <points frustumCulled={false} key={count}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[shapes.galaxy, 3]} />
        <bufferAttribute attach="attributes-aP1" args={[shapes.tunnel, 3]} />
        <bufferAttribute attach="attributes-aP2" args={[shapes.terrain, 3]} />
        <bufferAttribute attach="attributes-aP3" args={[shapes.planet, 3]} />
        <bufferAttribute attach="attributes-aP4" args={[shapes.logo, 3]} />
        <bufferAttribute attach="attributes-aRand" args={[shapes.rand, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={galaxyVertex}
        fragmentShader={galaxyFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function BackgroundScene() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 2.6, 14], fov: 45, near: 0.1, far: 120 }}
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        eventSource={document.body}
        eventPrefix="client"
      >
        <AdaptiveDpr pixelated={false} />
        <Background />
        <Journey />
      </Canvas>
    </div>
  );
}
