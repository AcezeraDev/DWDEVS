"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { DIMENSIONS } from "./data";
import { KEYS_TALL, KEYS_WIDE, canFeed, mv, stacked, type HoleKey } from "./store";
import {
  holeVertex,
  inflowFragment,
  inflowVertex,
  lensFragment,
  lensVertex,
  mvBgFragment,
  mvHoleFragment,
  ringFragment,
  ringVertex,
  screenVertex,
} from "./shaders";

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => THREE.MathUtils.clamp(t, 0, 1);
const bump = (t: number, at: number, w: number) => Math.exp(-Math.pow((t - at) / w, 2));

/** Apparent radius of the shadow in world units, and the raymarch scale (see the original scene). */
const EINSTEIN = 0.82;
const RS = EINSTEIN / 2.6;
const HOLE_SPAN = 21;
const HOLE_DIST = 16;
const HOLE = new THREE.Vector3();

/** Shared every frame between the passes: where the hole is on screen, and the accent pair. */
const screen = { uv: new THREE.Vector2(0.5, 0.5), r: 0, amt: 0, warp: 0, hero: 0, wave: 0 };
const ACC = new THREE.Color(DIMENSIONS[0].acc);
const ACC2 = new THREE.Color(DIMENSIONS[0].acc2);
const ROSE = new THREE.Color("#ff5fa2");
const goalA = new THREE.Color();
const goalB = new THREE.Color();

/** Gates of the hero tunnel: they leave the core one after another and fly past the camera. */
const GATES = 9;

/** Ring gyroscope: radius (in shadow radii), spin axis and speed per ring. */
const RINGS = [
  { r: 1.9, axis: new THREE.Vector3(1, 0.2, 0).normalize(), speed: 0.35 },
  { r: 2.7, axis: new THREE.Vector3(0.1, 0, 1).normalize(), speed: -0.22 },
  { r: 3.6, axis: new THREE.Vector3(0.6, 1, 0.3).normalize(), speed: 0.15 },
];

function Backdrop() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const size = useThree((s) => s.size);
  const mouse = useMemo(() => new THREE.Vector2(0.5, 0.5), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uWarp: { value: 0 },
      uSpeed: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRes: { value: new THREE.Vector2(1, 1) },
      uHole: { value: screen.uv },
      uHoleR: { value: 0 },
      uHoleAmt: { value: 0 },
      uWave: { value: 0 },
      uAcc: { value: ACC },
      uAcc2: { value: ACC2 },
    }),
    []
  );

  useFrame((state, delta) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uTime.value += Math.min(delta, 0.05);
    u.uScroll.value = THREE.MathUtils.lerp(u.uScroll.value, mv.progress, 0.08);
    u.uWarp.value = screen.warp;
    u.uSpeed.value = THREE.MathUtils.damp(u.uSpeed.value, Math.min(Math.abs(mv.velocity) / 40, 1), 4, delta);
    mouse.set(state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5);
    u.uMouse.value.lerp(mouse, 0.06);
    u.uRes.value.set(size.width, size.height);
    u.uHoleR.value = screen.r;
    u.uHoleAmt.value = screen.amt;
    u.uWave.value = screen.wave;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat} vertexShader={screenVertex} fragmentShader={mvBgFragment} uniforms={uniforms} depthWrite={false} depthTest={false} />
    </mesh>
  );
}

function buildInflow(n: number) {
  const seed = new Float32Array(n * 4);
  const rand = new Float32Array(n);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  for (let i = 0; i < n; i++) {
    rand[i] = Math.random();
    seed[i * 4] = 2.4 + Math.pow(Math.random(), 0.8) * 4.6; // rim radius
    seed[i * 4 + 1] = Math.random() * Math.PI * 2; // angle
    seed[i * 4 + 2] = gauss(); // height
    seed[i * 4 + 3] = 0.03 + Math.random() * 0.05; // inflow speed
  }
  return { seed, rand };
}

/** The black hole, its ring gyroscope and the accretion stream, placed per scene of the page. */
function Singularity() {
  const size = useThree((s) => s.size);
  const small = size.width < 768;
  const count = small ? 7000 : 16000;
  const hole = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  const points = useRef<THREE.ShaderMaterial>(null);
  const rings = useRef<(THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial> | null)[]>([]);
  const gates = useRef<(THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial> | null)[]>([]);
  const st = useRef({ feed: 0, bonus: 0, hover: 0, hovering: false, hopGlow: 0, scene: 0, hero: 0, speed: 0, time: 0, spinX: 0, spinY: 0, velX: 0, velY: 0, dimFlash: 0, lastDim: 0 });
  const now = useRef<HoleKey | null>(null);
  const targetRef = useRef<HoleKey>({ x: 0, y: 0, s: 1, tilt: 0, roll: 0, o: 1, ring: 1 });
  const tmp = useMemo(
    () => ({ right: new THREE.Vector3(), up: new THREE.Vector3(), fwd: new THREE.Vector3(), q: new THREE.Quaternion(), qi: new THREE.Quaternion(), e: new THREE.Euler(), m: new THREE.Matrix4(), v: new THREE.Vector3(), g: new THREE.Quaternion() }),
    []
  );
  const shapes = useMemo(() => buildInflow(count), [count]);

  const holeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmt: { value: 0 },
      uRs: { value: RS },
      uHole: { value: HOLE },
      uToLocal: { value: new THREE.Matrix3() },
      uGlow: { value: 1 },
      uFlash: { value: 0 },
      uAcc: { value: ACC },
      uAcc2: { value: ACC2 },
    }),
    []
  );
  const pointUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntro: { value: 1 },
      uWarp: { value: 0 },
      uFling: { value: 0 },
      uSize: { value: 30 },
      uScale: { value: 1 },
      uAspect: { value: 1 },
      uShadow: { value: 0 },
      uHoleNdc: { value: new THREE.Vector2() },
      uMouse: { value: new THREE.Vector2(9, 9) },
      uHole: { value: HOLE },
      uDisk: { value: new THREE.Matrix3() },
      uOpacity: { value: 1 },
      uAcc: { value: ACC },
      uAcc2: { value: ACC2 },
    }),
    []
  );
  const ringUniforms = useMemo(
    () =>
      RINGS.map((_, i) => ({
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uSeed: { value: i / RINGS.length },
        uColor: { value: i === 1 ? ACC2 : ACC },
        uColor2: { value: i === 2 ? ROSE : i === 1 ? ACC : ACC2 },
      })),
    []
  );

  const gateUniforms = useMemo(
    () =>
      Array.from({ length: GATES }, (_, i) => ({
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uSeed: { value: (i * 0.37) % 1 },
        uColor: { value: [ACC, ACC2, ROSE][i % 3] },
        uColor2: { value: [ACC2, ROSE, ACC][i % 3] },
      })),
    []
  );

  // A star fell in (see Feeder): flash, a wave across the sky and a little more mass for a while
  useEffect(() => {
    const fed = () => {
      st.current.feed = 1;
      st.current.bonus = Math.min(st.current.bonus + 0.05, 0.35);
    };
    window.addEventListener("mv:feed", fed);
    return () => {
      window.removeEventListener("mv:feed", fed);
      delete document.documentElement.dataset.mvCursor;
    };
  }, []);

  // Mouse drag on empty space turns the disk; it springs back when let go
  useEffect(() => {
    let drag: { x: number; y: number } | null = null;
    const busy = (t: EventTarget | null) => !!(t as HTMLElement)?.closest?.("a, button, input, textarea, [data-no-drag]");
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || busy(e.target)) return;
      drag = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      st.current.velX += (e.clientX - drag.x) * 0.004;
      st.current.velY += (e.clientY - drag.y) * 0.003;
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => void (drag = null);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("blur", up);
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = st.current;
    const target = targetRef.current;
    const tall = stacked(size.width, size.height);
    const keys = tall ? KEYS_TALL : KEYS_WIDE;
    const legs = mv.legs;
    const tNow = state.clock.elapsedTime;

    // Accent pair: eases into the dimension on screen; a jump flashes the photon ring
    const dim = DIMENSIONS[mv.dim];
    goalA.set(dim.acc);
    goalB.set(dim.acc2);
    ACC.lerp(goalA, 1 - Math.exp(-dt * 3));
    ACC2.lerp(goalB, 1 - Math.exp(-dt * 3));
    if (mv.dim !== s.lastDim) {
      s.lastDim = mv.dim;
      s.dimFlash = 1;
    }
    s.dimFlash = THREE.MathUtils.damp(s.dimFlash, 0, 2.5, dt);

    // Scene index follows the scroll: the sum of how far each section has come in
    let goal = 0;
    for (let i = 1; i < legs.length; i++) goal += legs[i];
    s.scene = THREE.MathUtils.damp(s.scene, goal, 5, dt);
    s.hero = THREE.MathUtils.damp(s.hero, mv.hero, 7, dt);
    s.speed = THREE.MathUtils.damp(s.speed, Math.min(Math.abs(mv.velocity) / 30, 1), 3, dt);
    const c = s.scene;
    const heroW = 1 - smooth(clamp01(c));
    const h = s.hero * heroW;

    // Sample the scene table. Between two scenes the hole hops dimensions: it collapses to a
    // point mid-way and re-forms at the next place, its rings spinning up while it travels.
    const i0 = Math.min(Math.floor(c), keys.length - 2);
    const f = clamp01(c - i0);
    const e = smooth(f);
    for (const k of ["x", "y", "s", "tilt", "roll", "o", "ring"] as const) target[k] = THREE.MathUtils.lerp(keys[i0][k], keys[i0 + 1][k], e);
    // Between scenes it swoops instead of sliding: it arcs, comes closer (bigger), turns its
    // disk toward us and flares, so the trip itself is the show
    const hop = c > 0.98 ? Math.sin(Math.PI * f) : 0;
    const dir = i0 % 2 ? 1 : -1;
    target.s *= 1 + 0.35 * hop;
    target.y += 0.22 * hop * dir;
    target.tilt += 0.7 * hop;
    target.roll += hop * 1.6 * dir;
    s.hopGlow = hop;

    // Hero, in four beats over the pinned scroll (h):
    //  0.00-0.45 align: the camera swings over the disk (edge-on → face-on), it slides to the
    //            middle and the gyroscope rings settle into its plane as one portal
    //  0.30-0.95 gates: rings of light leave the core one after another and fly past the camera,
    //            a tunnel that pulls you in; the disk spins up and turns on itself
    //  0.45-0.90 warp: the stars stretch into hyperspace lines, the stream is flung outward,
    //            a shudder right before the crossing and a punch of FOV through it
    //  0.90-1.00 the far side: everything settles, the hole waits to hop to the next scene
    const align = smooth(clamp01(h / 0.45));
    const gate = clamp01((h - 0.3) / 0.65);
    const pass = smooth(clamp01((h - 0.55) / 0.4));
    const heroWarp = smooth(clamp01((h - 0.45) / 0.3)) * (1 - smooth(clamp01((h - 0.86) / 0.14)));
    screen.warp = Math.max(mv.warp, heroWarp * 0.9);
    screen.hero = h;
    target.tilt = THREE.MathUtils.lerp(target.tilt, 1.38, align);
    target.x = THREE.MathUtils.lerp(target.x, 0, smooth(clamp01(h / 0.4)));
    target.s *= 1 + align * 0.2 + smooth(gate) * 0.35;
    target.roll += smooth(clamp01((h - 0.4) / 0.6)) * 2.6;

    // Floating, plus the drag spin (springs back)
    s.velX = THREE.MathUtils.damp(s.velX, 0, 3, dt);
    s.velY = THREE.MathUtils.damp(s.velY, 0, 3, dt);
    s.spinX += s.velX * dt * 10;
    s.spinY += s.velY * dt * 10;
    s.spinX = THREE.MathUtils.damp(s.spinX, 0, 1.2, dt);
    s.spinY = THREE.MathUtils.damp(s.spinY, 0, 1.2, dt);
    target.x += Math.sin(tNow * 0.31) * 0.018;
    target.y += Math.sin(tNow * 0.27 + 1.3) * 0.022 + THREE.MathUtils.clamp(mv.velocity * 0.0012, -0.06, 0.06);
    target.roll += s.spinX + Math.sin(tNow * 0.2) * 0.06;
    target.tilt += s.spinY;

    if (!now.current) now.current = { ...target };
    const hn = now.current;
    for (const k of ["x", "y", "s", "tilt", "roll", "o", "ring"] as const) hn[k] = THREE.MathUtils.damp(hn[k], target[k], 6, dt);

    // Camera: a slow breath, the cursor for parallax, a punch of FOV through the portal and warps
    const cam = state.camera as THREE.PerspectiveCamera;
    const shudder = bump(h, 0.68, 0.07) * 0.14;
    cam.position.set(
      state.pointer.x * 0.45 + Math.sin(tNow * 47) * shudder,
      state.pointer.y * 0.3 + Math.cos(tNow * 53) * shudder,
      16 + mv.intro * 4 - smooth(gate) * 1.2
    );
    cam.lookAt(0, 0, 0);
    cam.rotateZ(Math.sin(c * 0.9) * 0.025 + mv.velocity * 0.0005);
    const fov = 45 + bump(h, 0.82, 0.08) * 30 + heroWarp * 8 + mv.warp * 18 + s.speed * 5;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    // Place the hole in front of the camera at its screen position
    const halfH = HOLE_DIST * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const halfW = halfH * (size.width / size.height);
    tmp.right.set(1, 0, 0).applyQuaternion(cam.quaternion);
    tmp.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    tmp.fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    HOLE.copy(cam.position).addScaledVector(tmp.fwd, HOLE_DIST).addScaledVector(tmp.right, hn.x * halfW).addScaledVector(tmp.up, hn.y * halfH);
    const lens = Math.tan(THREE.MathUtils.degToRad(fov / 2)) / Math.tan(THREE.MathUtils.degToRad(22.5));
    s.feed = THREE.MathUtils.damp(s.feed, 0, 1.4, dt);
    s.bonus = THREE.MathUtils.damp(s.bonus, 0, 0.12, dt);
    s.hover = THREE.MathUtils.damp(s.hover, s.hovering ? 1 : 0, 6, dt);
    screen.wave = s.feed;
    const gulp = Math.sin(Math.min(1, (1 - s.feed) * 1.6) * Math.PI) * s.feed;
    const mass = hn.s * lens * (1 + s.speed * 0.1 + s.dimFlash * 0.12 + s.bonus + gulp * 0.12 + s.hover * 0.05);
    const amt = (1 - mv.intro) * hn.o;

    // Disk frame: camera frame, rolled, then tipped toward us (plus the cursor)
    const mx = state.pointer.x;
    const my = state.pointer.y;
    tmp.e.set(hn.tilt + my * 0.15, 0, hn.roll - mx * 0.1, "ZXY");
    tmp.q.setFromEuler(tmp.e).premultiply(cam.quaternion);
    tmp.m.makeRotationFromQuaternion(tmp.q);

    // Time dilation: the disk's clock runs faster with the scroll and the warps
    mv.dilation = 1 + s.speed * 2.5 + mv.warp * 4 + align * 1.2 + heroWarp * 5;
    s.time += dt * mv.dilation;

    if (hole.current) {
      hole.current.visible = amt > 0.001;
      hole.current.position.copy(HOLE);
      hole.current.quaternion.copy(cam.quaternion);
      hole.current.scale.setScalar(HOLE_SPAN * RS * mass);
      const hu = hole.current.material.uniforms;
      hu.uAmt.value = amt;
      hu.uTime.value = s.time;
      hu.uRs.value = RS * mass;
      hu.uGlow.value = 1.15 + s.feed * 0.9 + s.hover * 0.35 + s.hopGlow * 0.5 + s.speed * 0.5 + smooth(gate) * 0.2 + bump(h, 0.82, 0.1) * 0.5 + mv.warp * 0.4;
      hu.uFlash.value = Math.max(s.feed, s.dimFlash * 0.8, bump(h, 0.82, 0.06), mv.warp * 0.5, align * 0.1);
      tmp.qi.copy(tmp.q).invert();
      tmp.m.makeRotationFromQuaternion(tmp.qi);
      hu.uToLocal.value.setFromMatrix4(tmp.m);
      tmp.m.makeRotationFromQuaternion(tmp.q);
    }

    // Where it lands on screen (for the backdrop, the points, the DOM)
    tmp.v.copy(HOLE).project(cam);
    const cx = tmp.v.x;
    const cy = tmp.v.y;
    tmp.v.copy(tmp.up).multiplyScalar(EINSTEIN * mass).add(HOLE).project(cam);
    screen.uv.set(cx * 0.5 + 0.5, cy * 0.5 + 0.5);
    screen.r = Math.hypot((tmp.v.x - cx) * (size.width / size.height), tmp.v.y - cy) * 0.5;
    screen.amt = amt;
    mv.hole.x = screen.uv.x * size.width;
    mv.hole.y = (1 - screen.uv.y) * size.height;
    mv.hole.r = screen.r * size.height;

    // Hover: the hole wakes up under the cursor where it can be fed (the cursor says "Clique")
    const px = (state.pointer.x * 0.5 + 0.5) * size.width;
    const py = (0.5 - state.pointer.y * 0.5) * size.height;
    const near = amt > 0.3 && canFeed() && Math.hypot(px - mv.hole.x, py - mv.hole.y) < Math.max(mv.hole.r * 2.6, 60);
    if (near !== s.hovering) {
      s.hovering = near;
      if (near) document.documentElement.dataset.mvCursor = "feed";
      else delete document.documentElement.dataset.mvCursor;
    }

    // Accretion stream
    const pu = points.current?.uniforms;
    if (pu) {
      pu.uTime.value += dt * (0.6 + mv.dilation * 0.4);
      pu.uIntro.value = mv.intro;
      pu.uWarp.value = Math.max(screen.warp, s.feed * 0.3);
      pu.uFling.value = pass;
      pu.uSize.value = 34 * state.viewport.dpr * (tall ? 0.8 : 1);
      pu.uScale.value = mass * 0.55;
      pu.uAspect.value = size.width / size.height;
      pu.uShadow.value = screen.r * 2;
      pu.uHoleNdc.value.set(cx, cy);
      pu.uMouse.value.lerp(state.pointer, 1 - Math.exp(-dt * 10));
      pu.uDisk.value.setFromMatrix4(tmp.m);
      // Dimmer whenever copy sits beside it (every scene after the hero)
      pu.uOpacity.value = THREE.MathUtils.damp(pu.uOpacity.value, (0.8 + heroW * 0.2 + s.hopGlow * 0.3) * hn.o * (1 - pass * 0.7), 4, dt);
    }

    // Ring gyroscope: each ring tumbles on its own axis; in the hero they settle into the disk
    // plane as one portal and then blow up past the camera
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const R = RINGS[i];
      tmp.g.setFromAxisAngle(R.axis, tNow * R.speed * (1 + hop * 4) + i * 1.7).premultiply(tmp.q);
      tmp.g.slerp(tmp.q, align);
      ring.quaternion.copy(tmp.g);
      // Torus lies in XY: turn it into the disk plane (XZ)
      ring.rotateX(Math.PI / 2);
      ring.position.copy(HOLE);
      // Outer ring first: each one rushes past the camera a beat after the last
      const go = clamp01((h - 0.5 - (RINGS.length - 1 - i) * 0.07) / 0.28);
      const blow = 1 + Math.pow(go, 2.4) * (16 + i * 6);
      ring.scale.setScalar(EINSTEIN * mass * R.r * blow * (1 + align * (0.15 - i * 0.12)));
      const u = ring.material.uniforms;
      u.uTime.value = tNow;
      u.uOpacity.value = amt * hn.ring * (0.7 + align * 0.5 + s.hopGlow * 0.6 + s.dimFlash) * (1 - smooth(clamp01((go - 0.7) / 0.3)));
      ring.visible = u.uOpacity.value > 0.003;
    });

    // Tunnel gates: born at the edge of the shadow, slow at first, then accelerating past the
    // camera; each one turns its own way, so the tunnel twists
    gates.current.forEach((g, k) => {
      if (!g) return;
      const tk = clamp01(gate * 1.9 - k * 0.11);
      const u = g.material.uniforms;
      u.uOpacity.value = amt * smooth(clamp01(tk / 0.08)) * (1 - smooth(clamp01((tk - 0.8) / 0.17))) * 1.1;
      g.visible = tk > 0 && tk < 1 && u.uOpacity.value > 0.003;
      if (!g.visible) return;
      g.position.copy(HOLE).lerp(cam.position, Math.pow(tk, 2.2) * 0.985);
      g.quaternion.copy(cam.quaternion);
      g.rotateZ(tNow * (k % 2 ? 0.9 : -0.7) + k);
      g.scale.setScalar(EINSTEIN * mass * (1.15 + tk * 0.9));
      u.uTime.value = tNow * 2;
    });
  });

  return (
    <>
      <mesh ref={hole} renderOrder={-1} frustumCulled={false} key={`hole-${small}`}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={holeVertex}
          fragmentShader={mvHoleFragment}
          uniforms={holeUniforms}
          defines={{ STEPS: small ? 80 : 140 }}
          transparent
          premultipliedAlpha
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      {RINGS.map((r, i) => (
        <mesh
          key={r.r}
          renderOrder={1}
          frustumCulled={false}
          visible={false}
          ref={(el) => {
            rings.current[i] = el as THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial> | null;
          }}
        >
          <torusGeometry args={[1, 0.0045 + i * 0.001, 6, 220]} />
          <shaderMaterial
            vertexShader={ringVertex}
            fragmentShader={ringFragment}
            uniforms={ringUniforms[i]}
            transparent
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      {gateUniforms.map((u, i) => (
        <mesh
          key={`gate-${i}`}
          renderOrder={3}
          frustumCulled={false}
          visible={false}
          ref={(el) => {
            gates.current[i] = el as THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial> | null;
          }}
        >
          <torusGeometry args={[1, 0.012, 6, 200]} />
          <shaderMaterial
            vertexShader={ringVertex}
            fragmentShader={ringFragment}
            uniforms={u}
            transparent
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      <points frustumCulled={false} key={count} renderOrder={2}>
        <bufferGeometry>
          {/* position is only there so three knows how many points to draw */}
          <bufferAttribute attach="attributes-position" args={[new Float32Array(count * 3), 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[shapes.seed, 4]} />
          <bufferAttribute attach="attributes-aRand" args={[shapes.rand, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={points}
          vertexShader={inflowVertex}
          fragmentShader={inflowFragment}
          uniforms={pointUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

/** Bloom, then a lens pass: fringes at the edges and a smear toward the hole during warps. */
function Post() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const fx = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.4, 0.78);
    composer.addPass(bloom);
    const lens = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: { tDiffuse: { value: null }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAberr: { value: 0 }, uZoom: { value: 0 } },
        vertexShader: lensVertex,
        fragmentShader: lensFragment,
      })
    );
    composer.addPass(lens);
    return { composer, bloom, lens };
  }, [gl, scene, camera]);

  useEffect(() => {
    const ratio = gl.getPixelRatio();
    fx.composer.setPixelRatio(ratio);
    fx.composer.setSize(size.width, size.height);
    fx.bloom.setSize((size.width * ratio) / 2, (size.height * ratio) / 2);
  }, [fx, gl, size]);

  useEffect(() => () => fx.composer.dispose(), [fx]);

  useFrame((_, delta) => renderPost(fx, gl, delta), 1);

  return null;
}

type PostFx = { composer: EffectComposer; bloom: UnrealBloomPass; lens: ShaderPass };

function renderPost(fx: PostFx, gl: THREE.WebGLRenderer, delta: number) {
  {
    const ratio = gl.getPixelRatio();
    if (fx.composer.renderer.getPixelRatio() !== ratio) fx.composer.setPixelRatio(ratio);
    const speed = Math.min(Math.abs(mv.velocity) / 30, 1);
    const portal = bump(screen.hero, 0.82, 0.08);
    const warp = screen.warp;
    fx.bloom.strength = 0.26 + warp * 0.35 + portal * 0.45 + speed * 0.08;
    const u = fx.lens.uniforms;
    u.uCenter.value.set(THREE.MathUtils.lerp(screen.uv.x, 0.5, warp), THREE.MathUtils.lerp(screen.uv.y, 0.5, warp));
    u.uZoom.value = THREE.MathUtils.damp(u.uZoom.value, warp * 0.14 + portal * 0.14 + speed * 0.03, 8, delta);
    u.uAberr.value = speed * 0.004 + warp * 0.014 + portal * 0.014;
    fx.composer.render(delta);
  }
}

export default function MultiverseScene() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 16], fov: 45, near: 0.1, far: 140 }}
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        eventSource={document.body}
        eventPrefix="client"
      >
        <AdaptiveDpr pixelated={false} />
        <Backdrop />
        <Singularity />
        <Post />
      </Canvas>
    </div>
  );
}
