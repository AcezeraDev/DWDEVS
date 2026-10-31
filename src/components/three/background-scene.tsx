"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { DIVE_POINT, scrollStore } from "@/lib/scroll-store";
import { Effects } from "./effects";
import {
  bgFragment,
  bgVertex,
  holeFragment,
  holeVertex,
  journeyFragment,
  journeyVertex,
  planetFragment,
  planetVertex,
} from "./shaders";

/** One colour per service planet, in the order of the Services section. */
const PLANET_COLORS = ["#c8f031", "#1fd1ba", "#f5f2e6", "#9cc415"];

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => THREE.MathUtils.clamp(t, 0, 1);
/** Where the black hole is this frame (it rides in front of the camera, see CHAPTER_HOLE). */
const HOLE = new THREE.Vector3(0, 0, 0);
/** Apparent radius of the black hole's shadow in world units (about 2.6 Schwarzschild radii). */
const EINSTEIN = 0.82;
const RS = EINSTEIN / 2.6;
/** The raymarch runs on a quad this wide (in Schwarzschild radii), enough to hold the disk. */
const HOLE_SPAN = 21;
/** How far in front of the camera the hole rides. */
const HOLE_DIST = 16;

/** Where the hole lands on screen, shared with the background so it can bend the grid. */
const holeScreen = { uv: new THREE.Vector2(0.5, 0.5), r: 0, amt: 0, wave: 0 };

type HoleKey = { x: number; y: number; s: number; tilt: number; roll: number; o: number };

/**
 * The black hole never leaves the screen. Per chapter of the page: its place on screen
 * (x/y in -1..1), size, how far the disk faces us (0 edge-on, ~1.4 face-on), its angle on
 * screen and strength. The particles of each chapter orbit it in its own disk frame.
 * Chapter 4 is overridden every frame to sit right behind the contact button.
 */
const CHAPTER_HOLE: HoleKey[] = [
  { x: 0.56, y: 0.06, s: 1.6, tilt: 0.24, roll: -0.18, o: 1 }, // hero: the centerpiece, right of the copy
  { x: 0.74, y: -0.22, s: 1.15, tilt: 1.05, roll: 0.35, o: 0.95 }, // galaxy: about / summary
  { x: 0.84, y: -0.36, s: 0.95, tilt: 0.55, roll: 0.5, o: 0.85 }, // gyroscope: services / stack
  { x: 0.88, y: 0.64, s: 0.6, tilt: 0.25, roll: -0.15, o: 0.85 }, // hyperspace: projects / process
  { x: 0, y: -0.3, s: 2, tilt: 0.1, roll: 0, o: 0.95 }, // halo: contact
];
/** Particle brightness and how hard they clear out of the text column, per chapter. */
const CHAPTER_LOOK = [
  { o: 0.85, clear: 0 },
  { o: 0.8, clear: 0.9 },
  { o: 0.42, clear: 0.9 },
  { o: 0.45, clear: 0.35 },
  { o: 0.6, clear: 0 },
];

const isBig = (h: HoleKey | null) => !!h && h.s > 2;

function sampleChapter<T extends Record<string, number>>(table: T[], c: number, out: T) {
  const i = Math.min(Math.floor(c), table.length - 2);
  const e = smooth(clamp01(c - i));
  for (const k in out) out[k] = THREE.MathUtils.lerp(table[i][k], table[i + 1][k], e) as T[typeof k];
}

function buildShapes(n: number) {
  const stars = new Float32Array(n * 3);
  const galaxy = new Float32Array(n * 3);
  const gyro = new Float32Array(n * 3);
  const jet = new Float32Array(n * 3);
  const halo = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  const dir = new THREE.Vector3();
  const ARMS = 3;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  for (let i = 0; i < n; i++) {
    const k = i * 3;
    rand[i] = Math.random();

    // Stars on a distant shell, mostly behind the hole so it can lens them
    dir.randomDirection();
    if (dir.z > 0.2) dir.z = -dir.z;
    dir.multiplyScalar(28 + Math.random() * 30);
    stars[k] = dir.x;
    stars[k + 1] = dir.y;
    stars[k + 2] = dir.z;

    // Galaxy: logarithmic arms, thick in the middle, thin at the rim (r, angle, height)
    const gr = 0.35 + Math.pow(Math.random(), 0.75) * 4.4;
    const arm = ((i % ARMS) / ARMS) * Math.PI * 2;
    galaxy[k] = gr;
    galaxy[k + 1] = arm + Math.log(gr) * 1.6 + gauss() * (0.5 / (0.6 + gr * 0.25));
    galaxy[k + 2] = gauss() * 0.35 * Math.exp(-gr * 0.35);

    // Gyroscope: rings 0..2 plus a core (ring, angle, radial jitter)
    gyro[k] = i % 9 === 0 ? 3 : i % 3;
    gyro[k + 1] = Math.random() * Math.PI * 2;
    gyro[k + 2] = gauss() * 0.12;

    // Hyperspace: (angle around the tube, final radius, phase along the jet)
    jet[k] = Math.random() * Math.PI * 2;
    jet[k + 1] = 4 + Math.pow(Math.random(), 0.6) * 9;
    jet[k + 2] = Math.random();

    // Halo: (angle, radius, height)
    halo[k] = Math.random() * Math.PI * 2;
    halo[k + 1] = 3 + Math.pow(Math.random(), 1.6) * 6.5;
    halo[k + 2] = gauss() * 0.12;
  }
  return { stars, galaxy, gyro, jet, halo, rand };
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
      uHole: { value: holeScreen.uv },
      uHoleR: { value: 0 },
      uHoleAmt: { value: 0 },
      uWave: { value: 0 },
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
    u.uHoleR.value = holeScreen.r;
    u.uHoleAmt.value = holeScreen.amt;
    u.uWave.value = holeScreen.wave;
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

/** The particle field, the black hole and the camera, all driven by the chapter on screen. */
function Journey() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const hole = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  const size = useThree((s) => s.size);
  const small = size.width < 768;
  const count = small ? 16000 : 38000;
  const chapter = useRef(0);
  const dive = useRef(0);
  const flow = useRef(0);
  const pulse = useRef(0);
  const wave = useRef(0);
  const lastChapter = useRef(0);
  const look = useMemo(() => new THREE.Vector3(), []);
  const origin = useMemo(() => new THREE.Vector3(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);
  const probe = useMemo(() => new THREE.Vector3(), []);
  const holeTarget = useMemo<HoleKey>(() => ({ x: 0, y: 0, s: 1, tilt: 0, roll: 0, o: 1 }), []);
  const lookNow = useMemo(() => ({ o: 1, clear: 0 }), []);
  const holeNow = useRef<HoleKey | null>(null);
  const cta = useRef<HTMLElement | null>(null);
  const hunger = useRef(0);
  const holeTime = useRef(0);
  // Interaction: hold the mouse button to charge the hole's pull, let go to fire a shockwave
  const holding = useRef(false);
  const charge = useRef(0);
  const hovering = useRef(false);
  const hoverW = useRef(0);
  const orbitW = useRef(0);
  const planets = useRef<(THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null)[]>([]);
  const diskQ = useMemo(() => new THREE.Quaternion(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const planetUniforms = useMemo(
    () =>
      PLANET_COLORS.map((c) => ({
        uColor: { value: new THREE.Color(c) },
        uHole: { value: HOLE },
        uActive: { value: 0 },
        uTime: { value: 0 },
      })),
    []
  );
  const basis = useMemo(
    () => ({ right: new THREE.Vector3(), up: new THREE.Vector3(), fwd: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(), m: new THREE.Matrix4() }),
    []
  );
  const holeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmt: { value: 0 },
      uRs: { value: RS },
      uHole: { value: HOLE },
      uToLocal: { value: new THREE.Matrix3() },
      uGlow: { value: 1 },
      uFlash: { value: 0 },
    }),
    []
  );

  const shapes = useMemo(() => buildShapes(count), [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uIntro: { value: 1 },
      uDive: { value: 0 },
      uPulse: { value: 0 },
      uSize: { value: 30 },
      uAspect: { value: 1 },
      uScale: { value: 1 },
      uFlow: { value: 0 },
      uClear: { value: 0 },
      uOpacity: { value: 1 },
      uMouse: { value: new THREE.Vector2(9, 9) },
      uHole: { value: HOLE },
      uDisk: { value: new THREE.Matrix3() },
      uCamPos: { value: new THREE.Vector3() },
      uLens: { value: 0 },
      uCharge: { value: 0 },
      uOrbitR: { value: 4.6 },
    }),
    []
  );

  useEffect(() => {
    const busy = (t: EventTarget | null) => !!(t as HTMLElement)?.closest?.("a, button, input, textarea, select, [data-cursor]");
    // Mouse: press and hold anywhere outside links/buttons to charge, release to fire.
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || busy(e.target)) return;
      holding.current = true;
    };
    const up = () => {
      if (!holding.current) return;
      holding.current = false;
      pulse.current = Math.min(1, 0.35 + charge.current * 0.9);
    };
    // Touch/pen: a tap (not a swipe) fires a small wave, so scrolling never triggers it
    const tap = (e: MouseEvent) => {
      if ((e as PointerEvent).pointerType === "mouse" || busy(e.target)) return;
      pulse.current = 0.7;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("blur", up);
    window.addEventListener("click", tap);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("blur", up);
      window.removeEventListener("click", tap);
      delete document.documentElement.dataset.cursor;
    };
  }, []);

  useFrame((state, delta) => {
    const m = mat.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    const u = m.uniforms;
    const narrow = size.width / size.height < 1;
    const target = scrollStore.chapter;
    const legs = scrollStore.legs;

    // Everything follows the scroll: the chapter is the sum of how far each section has come in,
    // and the dive unwinds as the band after the hero scrolls in (we climb back out of the hole).
    // The damping only smooths the steps between frames.
    const goal = legs[1] + legs[2] + legs[3] + legs[4];
    chapter.current = THREE.MathUtils.damp(chapter.current, goal, 5, dt);
    dive.current = THREE.MathUtils.damp(dive.current, scrollStore.dive * (1 - legs[1]), 7, dt);
    const c = chapter.current;
    const dv = dive.current;
    // How much of the hero framing is left (1 on the hero, 0 once the galaxy has formed)
    const heroW = 1 - smooth(clamp01(c));
    // Each new chapter sends a gravitational wave across the grid and the particles
    if (target !== lastChapter.current) {
      lastChapter.current = target;
      wave.current = 1;
    }
    wave.current = THREE.MathUtils.damp(wave.current, 0, 1.4, dt);
    // Crossing the horizon: the camera shakes hardest right before it falls through
    const crossing = Math.exp(-Math.pow((dv - 0.93) / 0.06, 2));
    const quake = Math.exp(-Math.pow((dv - 0.82) / 0.14, 2)) * 0.22;
    const tNow = state.clock.elapsedTime;
    sampleChapter(CHAPTER_LOOK, c, lookNow);
    // Held click charges slowly and lets go fast; the services orbit fades in while pinned
    charge.current = THREE.MathUtils.damp(charge.current, holding.current ? 1 : 0, holding.current ? 1.1 : 7, dt);
    orbitW.current = THREE.MathUtils.damp(orbitW.current, scrollStore.orbit.on, 4, dt);
    const ch = charge.current;
    const ow = orbitW.current;
    const shake = quake + ch * ch * 0.06;

    // Camera: almost still, a slow drift per chapter, the cursor for parallax, a roll while falling in.
    const cam = state.camera;
    cam.position.set(
      Math.sin(c * 1.7) * 0.7 + state.pointer.x * 0.5 + Math.sin(tNow * 47) * shake,
      Math.cos(c * 1.3) * 0.4 - 0.4 + state.pointer.y * 0.35 + Math.cos(tNow * 53) * shake,
      16 + scrollStore.intro * 4 - dv * 1.5
    );
    // Vertigo while falling in, plus a small kick of speed when scrolling fast
    const persp = cam as THREE.PerspectiveCamera;
    // Vertigo while falling in, a kick of speed on fast scrolls, a squeeze while charging
    const fov = 45 + 28 * smooth(dv) * (1 - crossing * 0.4) + hunger.current * 7 - ch * 6;
    if (Math.abs(persp.fov - fov) > 0.01) {
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }
    look.lerp(origin, 1 - Math.exp(-dt * 6));
    cam.lookAt(look);
    cam.rotateZ(Math.sin(c * 1.1) * 0.03 + scrollStore.velocity * 0.0006 + dv * dv * 0.35);

    pulse.current = THREE.MathUtils.damp(pulse.current, 0, 2.2, dt);
    const speed = Math.min(Math.abs(scrollStore.velocity) / 30, 1);
    hunger.current = THREE.MathUtils.damp(hunger.current, speed, speed > hunger.current ? 4 : 1.2, dt);
    // Hyperspace runs faster the faster you scroll
    flow.current += dt * (0.12 + hunger.current * 0.9);

    u.uTime.value += dt;
    u.uMorph.value = c;
    u.uIntro.value = scrollStore.intro;
    u.uDive.value = dv;
    u.uPulse.value = Math.max(pulse.current, wave.current * 0.35);
    u.uFlow.value = flow.current;
    u.uSize.value = 40 * state.viewport.dpr * (narrow ? 0.8 : 1) * (1 + hunger.current * 0.6);
    u.uAspect.value = size.width / size.height;
    u.uScale.value = narrow ? 0.6 : 1;
    // The orbit ring sits right of the copy panel, so let it through while the orbit is up
    u.uClear.value = narrow ? 0 : lookNow.clear * (1 - ow * 0.75);
    u.uCharge.value = ch;
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, lookNow.o * (narrow && target > 0 ? 0.55 : 1), 4, dt);
    u.uCamPos.value.copy(cam.position);
    mouse.set(state.pointer.x, state.pointer.y);
    u.uMouse.value.lerp(mouse, 1 - Math.exp(-dt * 10));

    // Black hole. Each chapter parks it somewhere new; in the hero the dive drags it to the
    // middle and blows it up until it swallows the screen, and in the contact chapter it sits
    // right behind the round button. Scrolling fast makes it hungry, a click feeds it.
    sampleChapter(CHAPTER_HOLE, c, holeTarget);
    const fovHalf = THREE.MathUtils.degToRad((cam as THREE.PerspectiveCamera).fov / 2);
    const halfH = HOLE_DIST * Math.tan(fovHalf);
    const halfW = halfH * u.uAspect.value;
    const atCta = target === 4 && c > 3.4;
    // Stacked layouts (phones, small tablets) park the hero hole above the headline, squarer
    // screens push it right and shrink it; both fade out as the hero framing does.
    if (heroW > 0) {
      const h0 = CHAPTER_HOLE[0];
      const stacked = size.width < 1024;
      const square = !stacked && u.uAspect.value < 1.5;
      const hx = stacked ? 0 : square ? 0.6 : h0.x;
      const hy = stacked ? (narrow ? 0.64 : 0.5) : h0.y;
      const hs = stacked ? (narrow ? 1.2 : 1.1) : square ? h0.s * 0.78 : h0.s;
      holeTarget.x += (hx - h0.x) * heroW;
      holeTarget.y += (hy - h0.y) * heroW;
      holeTarget.s += (hs - h0.s) * heroW;
    }
    if (dv > 0.001) {
      // Falling in, it reaches the middle early; climbing out, it drifts back with the scroll.
      const a = legs[1] > 0 ? smooth(dv) : smooth(clamp01(dv / 0.2));
      const b = smooth(clamp01((dv - 0.25) / 0.75));
      holeTarget.x = THREE.MathUtils.lerp(holeTarget.x, DIVE_POINT.x, a);
      holeTarget.y = THREE.MathUtils.lerp(holeTarget.y, DIVE_POINT.y, a);
      holeTarget.tilt = THREE.MathUtils.lerp(holeTarget.tilt, 0.32, a);
      // Grow faster than the widening lens so it swallows the screen, but stop before the camera
      // sits inside the photon sphere (past ~12 the raymarch turns into a tiny distorted dot).
      const lens = Math.tan(THREE.MathUtils.degToRad(fov / 2)) / Math.tan(THREE.MathUtils.degToRad(22.5));
      holeTarget.s = Math.min(Math.max(holeTarget.s, (1 + 9 * b * b) * lens), 12);
    } else if (atCta) {
      cta.current ??= document.getElementById("cta-core");
      const r = cta.current?.getBoundingClientRect();
      if (r && r.width > 0) {
        holeTarget.x = ((r.left + r.width / 2) / size.width) * 2 - 1;
        holeTarget.y = Math.max(1 - ((r.top + r.height / 2) / size.height) * 2, -0.9);
        // Shadow just inside the button, so the button reads as the singularity
        holeTarget.s = ((r.width / size.height) * halfH * 0.92) / EINSTEIN;
      }
    }
    // Services orbit (desktop): the hole moves to the middle-right, opens its disk toward us,
    // and the four service planets circle it (placed further down).
    if (ow > 0.001 && !atCta && dv < 0.01) {
      const orbitKey: HoleKey = { x: u.uAspect.value < 1.5 ? 0.5 : 0.42, y: -0.04, s: 1.3, tilt: 0.95, roll: 0.15, o: 1 };
      for (const k of ["x", "y", "s", "tilt", "roll", "o"] as const) holeTarget[k] = THREE.MathUtils.lerp(holeTarget[k], orbitKey[k], ow);
    }
    if (!holeNow.current) holeNow.current = { ...holeTarget };
    const hn = holeNow.current;
    const follow = atCta ? 14 : dv > 0.01 || isBig(holeNow.current) ? 9 : 5;
    for (const k of ["x", "y", "s", "tilt", "roll", "o"] as const) hn[k] = THREE.MathUtils.damp(hn[k], holeTarget[k], follow, dt);
    holeTime.current += dt * (1 + hunger.current * 3 + dv * 4 + ch * 6);
    const swell = pulse.current * (1 - pulse.current) * 4;
    const shrink = narrow && !atCta ? THREE.MathUtils.lerp(0.6, 1, heroW) : 1;
    const mass = hn.s * (1 + swell * 0.3 + hunger.current * 0.12 + ch * 0.35 + hoverW.current * 0.1) * shrink;
    const amt = (1 - scrollStore.intro) * hn.o;

    // Phones: text fills the width, so outside the dive and the button the hole hugs the edge.
    const edge = (hn.x >= 0 ? 1 : -1) * Math.max(Math.abs(hn.x), 0.8) * 1.08;
    const hx = narrow && !atCta ? THREE.MathUtils.lerp(edge, hn.x, heroW) : hn.x;
    basis.right.set(1, 0, 0).applyQuaternion(cam.quaternion);
    basis.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    basis.fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    HOLE.copy(cam.position)
      .addScaledVector(basis.fwd, HOLE_DIST)
      .addScaledVector(basis.right, hx * halfW)
      .addScaledVector(basis.up, hn.y * halfH);
    // Disk frame = camera frame, rolled on screen, then turned toward us by the tilt (+ cursor)
    basis.e.set(hn.tilt + u.uMouse.value.y * 0.18, 0, hn.roll - u.uMouse.value.x * 0.12, "ZXY");
    basis.q.setFromEuler(basis.e).premultiply(cam.quaternion);
    diskQ.copy(basis.q);
    basis.m.makeRotationFromQuaternion(basis.q);
    u.uDisk.value.setFromMatrix4(basis.m);
    u.uLens.value = EINSTEIN * mass * amt;

    if (hole.current) {
      hole.current.visible = amt > 0.001;
      hole.current.position.copy(HOLE);
      hole.current.quaternion.copy(cam.quaternion);
      hole.current.scale.setScalar(HOLE_SPAN * RS * mass);
      const hu = hole.current.material.uniforms;
      hu.uAmt.value = amt;
      hu.uTime.value = holeTime.current;
      hu.uRs.value = RS * mass;
      hu.uGlow.value = 1 + hunger.current * 0.7 + swell * 0.3 + crossing + ch * 0.45 + hoverW.current * 0.3;
      hu.uFlash.value = Math.max(pulse.current * pulse.current, crossing);
      basis.m.makeRotationFromQuaternion(basis.q.invert());
      hu.uToLocal.value.setFromMatrix4(basis.m);
    }
    probe.copy(HOLE).project(cam);
    const cx = probe.x;
    const cy = probe.y;
    probe.copy(basis.up).multiplyScalar(EINSTEIN * mass).add(HOLE).project(cam);
    holeScreen.uv.set(cx * 0.5 + 0.5, cy * 0.5 + 0.5);
    holeScreen.r = Math.hypot((probe.x - cx) * u.uAspect.value, probe.y - cy) * 0.5;
    holeScreen.amt = amt;
    holeScreen.wave = Math.max(pulse.current, wave.current * 0.8);
    const holeX = holeScreen.uv.x * size.width;
    const holeY = (1 - holeScreen.uv.y) * size.height;
    const shadowPx = holeScreen.r * size.height;
    scrollStore.fx.crossing = crossing;
    scrollStore.fx.speed = hunger.current;
    scrollStore.fx.charge = ch;
    scrollStore.fx.hole.x = holeX;
    scrollStore.fx.hole.y = holeY;
    scrollStore.fx.hole.r = shadowPx;

    // Hover: the hole wakes up under the cursor (and the cursor offers "hold")
    const px = (state.pointer.x * 0.5 + 0.5) * size.width;
    const py = (0.5 - state.pointer.y * 0.5) * size.height;
    const near = amt > 0.3 && Math.hypot(px - holeX, py - holeY) < Math.max(shadowPx * 2.2, 50);
    if (near !== hovering.current) {
      hovering.current = near;
      if (near) document.documentElement.dataset.cursor = "hole";
      else delete document.documentElement.dataset.cursor;
    }
    hoverW.current = THREE.MathUtils.damp(hoverW.current, near ? 1 : 0, 6, dt);

    // Service planets ride the orbit ring; the one in front is the service on screen.
    // basis.q is world -> disk now, so this finds where the camera sits around the disk.
    const R = Math.min(4.6, halfW * 0.36);
    u.uOrbitR.value = R;
    tmp.copy(cam.position).sub(HOLE).applyQuaternion(basis.q);
    const front = Math.atan2(tmp.z, tmp.x);
    const p = scrollStore.orbit.p;
    const camToHole = cam.position.distanceTo(HOLE);
    planets.current.forEach((pl, i) => {
      if (!pl) return;
      const a = front + (i - p) * (Math.PI / 2);
      tmp.set(Math.cos(a) * R, 0, Math.sin(a) * R).applyQuaternion(diskQ).add(HOLE);
      pl.position.copy(tmp);
      const act = Math.max(0, 1 - Math.abs(i - p));
      probe.copy(tmp).project(cam);
      const sx = (probe.x * 0.5 + 0.5) * size.width;
      const sy = (0.5 - probe.y * 0.5) * size.height;
      const behind = cam.position.distanceTo(tmp) > camToHole;
      // Behind the shadow: hidden (the hole quad is drawn first, so fake the occlusion)
      const seen = behind && Math.hypot(sx - holeX, sy - holeY) < shadowPx * 1.3 ? 0 : 1;
      const sc = (0.26 + smooth(act) * 0.34) * ow * seen;
      pl.visible = sc > 0.003;
      pl.scale.setScalar(Math.max(sc, 0.0001));
      pl.rotation.y += dt * 0.25;
      pl.material.uniforms.uActive.value = act;
      pl.material.uniforms.uTime.value = tNow;
      const slot = scrollStore.fx.planets[i];
      slot.x = sx;
      slot.y = sy;
      slot.o = ow * seen * (behind ? 0.45 : 1);
      slot.active = act;
    });
  });

  return (
    <>
      {/* Drawn first: the stars it lenses land outside its shadow, and anything closer glows over it */}
      <mesh ref={hole} renderOrder={-1} frustumCulled={false} key={`hole-${small}`}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={holeVertex}
          fragmentShader={holeFragment}
          uniforms={holeUniforms}
          defines={{ STEPS: small ? 90 : 150 }}
          transparent
          premultipliedAlpha
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      {PLANET_COLORS.map((c, i) => (
        <mesh
          key={c}
          visible={false}
          renderOrder={1}
          ref={(el) => {
            planets.current[i] = el as THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null;
          }}
        >
          <sphereGeometry args={[1, 48, 48]} />
          <shaderMaterial vertexShader={planetVertex} fragmentShader={planetFragment} uniforms={planetUniforms[i]} transparent />
        </mesh>
      ))}
      <points frustumCulled={false} key={count}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[shapes.stars, 3]} />
          <bufferAttribute attach="attributes-aP1" args={[shapes.galaxy, 3]} />
          <bufferAttribute attach="attributes-aP2" args={[shapes.gyro, 3]} />
          <bufferAttribute attach="attributes-aP3" args={[shapes.jet, 3]} />
          <bufferAttribute attach="attributes-aP4" args={[shapes.halo, 3]} />
          <bufferAttribute attach="attributes-aRand" args={[shapes.rand, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={mat}
          vertexShader={journeyVertex}
          fragmentShader={journeyFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
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
        <Effects />
      </Canvas>
    </div>
  );
}
