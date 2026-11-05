"use client";

/* eslint-disable react-hooks/immutability -- laço de quadro do R3F: objetos do three são mutados fora do React de propósito */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { stage } from "@/lib/stage";
import { accent, accent2 } from "@/lib/world";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// A aurora é o que pesa e é muito suave: pode ser calculada em baixa resolução e ampliada.
const auroraFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uPage;
  uniform float uAspect;
  uniform vec3 uA;
  uniform vec3 uB;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(11.0, 7.0); a *= 0.5; }
    return v;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float t = uTime * 0.05;
    vec2 q = vec2(fbm(p * 1.3 + vec2(t, uPage * 0.35)), fbm(p * 1.3 + vec2(-t, 4.0 - uPage * 0.25)));
    float veil = fbm(p * 1.5 + q * 2.4 + vec2(t * 0.6, uPage * 0.2));
    float band = smoothstep(0.34, 0.86, veil);
    vec3 green = uA * 0.46;
    vec3 teal = uB * 0.42;
    vec3 violet = vec3(0.26, 0.12, 0.56);
    float hue = 0.5 + 0.5 * sin(q.x * 5.0 + uPage * 1.1);
    vec3 aurora = mix(mix(green, teal, smoothstep(0.1, 0.7, hue)), violet, smoothstep(0.62, 1.0, hue));
    gl_FragColor = vec4(aurora * band * 0.52, band);
  }
`;

// A grade e a luz do mouse precisam de nitidez, mas são baratas.
const finalFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uAurora;
  uniform float uTime;
  uniform float uScroll;
  uniform float uAspect;
  uniform float uLit;
  uniform vec3 uA;
  uniform vec2 uMouse;
  uniform vec2 uClick;
  uniform float uClickAge;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float gridLines(vec2 p, float s, float w) {
    vec2 g = abs(fract(p * s - 0.5) - 0.5) / fwidth(p * s);
    return 1.0 - smoothstep(0.0, w, min(g.x, g.y));
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    vec2 m = uMouse * 0.5 * vec2(uAspect, 1.0);
    vec4 aurora = texture2D(uAurora, vUv);
    float band = aurora.a;
    vec3 col = vec3(0.016, 0.028, 0.022) + aurora.rgb;

    float dm = length(p - m);
    col += uA * 0.36 * exp(-dm * dm * 7.0) * 0.5 * uLit;

    vec2 dir = p - m;
    vec2 warped = p + dir * exp(-dot(dir, dir) * 9.0) * 0.1 * uLit;
    warped.y += uScroll * 1.6;

    vec2 c = uClick * 0.5 * vec2(uAspect, 1.0);
    float dc = length(p - c);
    float ring = uClickAge < 3.0 ? exp(-pow((dc - uClickAge * 0.9) * 13.0, 2.0)) * exp(-uClickAge * 1.7) : 0.0;
    warped += normalize(p - c + 1e-4) * ring * 0.05;

    float fine = gridLines(warped, 26.0, 1.0);
    float bold = gridLines(warped, 5.2, 1.3);
    float lit = exp(-dm * dm * 5.5) * uLit;
    vec3 line = uA;
    col += line * fine * (0.018 + 0.14 * lit + band * 0.02);
    col += line * bold * (0.05 + 0.32 * lit + band * 0.05);
    col += line * ring * 0.26;

    vec2 cell = floor(warped * 5.2 + 0.5);
    float tw = hash(cell);
    vec2 cp = abs(fract(warped * 5.2 + 0.5) - 0.5);
    float plus = 1.0 - smoothstep(0.0, 0.05, length(cp - 0.5));
    col += line * plus * step(0.72, tw) * (0.2 + 0.2 * sin(uTime * 1.5 + tw * 40.0));

    col *= 1.0 - 0.5 * smoothstep(0.35, 1.0, length(vUv - 0.5) * 1.35);
    col += (hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 91.0) - 0.5) * 0.024;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Backdrop() {
  const size = useThree((s) => s.size);
  const lowered = useRef(false);
  const tick = useRef(0);

  const k = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(320, 180, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    const quad = new THREE.PlaneGeometry(2, 2);
    const auroraMat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: auroraFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPage: { value: 0 }, uAspect: { value: 1 }, uA: accent, uB: accent2 },
    });
    const auroraScene = new THREE.Scene();
    const auroraMesh = new THREE.Mesh(quad, auroraMat);
    auroraMesh.frustumCulled = false;
    auroraScene.add(auroraMesh);
    const camera = new THREE.Camera();
    const finalMat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: finalFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uAurora: { value: target.texture },
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uAspect: { value: 1 },
        uLit: { value: 0 },
        uA: accent,
        uMouse: { value: new THREE.Vector2(0.3, 0.2) },
        uClick: { value: new THREE.Vector2() },
        uClickAge: { value: 100 },
      },
    });
    return { target, quad, auroraMat, auroraScene, camera, finalMat };
  }, []);

  useEffect(
    () => () => {
      k.target.dispose();
      k.quad.dispose();
      k.auroraMat.dispose();
      k.finalMat.dispose();
    },
    [k],
  );

  // Prioridade 1: este laço assume a renderização da cena.
  useFrame(({ clock, setDpr, gl, scene, camera }, dt) => {
    if (stage.bgPaused) return;
    if (stage.low && !lowered.current) {
      lowered.current = true;
      setDpr(0.6);
    }
    const time = stage.reduced ? 12 : clock.elapsedTime;
    const aspect = size.width / size.height;

    // A aurora muda devagar: atualizar um quadro sim, outro não é invisível
    if (tick.current++ % 2 === 0) {
      const a = k.auroraMat.uniforms;
      a.uTime.value = time;
      a.uAspect.value = aspect;
      a.uPage.value = stage.scroll01 * 6;
      gl.setRenderTarget(k.target);
      gl.render(k.auroraScene, k.camera);
      gl.setRenderTarget(null);
    }

    const u = k.finalMat.uniforms;
    u.uTime.value = time;
    u.uAspect.value = aspect;
    u.uLit.value += ((stage.hasMouse ? 1 : 0) - u.uLit.value) * (1 - Math.exp(-4 * dt));
    u.uScroll.value = stage.sc * 0.25;
    const e = 1 - Math.pow(0.001, dt);
    const mouse = u.uMouse.value as THREE.Vector2;
    mouse.x += (stage.px - mouse.x) * e;
    mouse.y += (-stage.py - mouse.y) * e;
    (u.uClick.value as THREE.Vector2).set(stage.clickX, stage.clickY);
    u.uClickAge.value = performance.now() / 1000 - stage.clickT;
    gl.render(scene, camera);
  }, 1);

  return <mesh geometry={k.quad} material={k.finalMat} frustumCulled={false} />;
}

export default function BgScene() {
  return (
    <div className="bg-canvas" aria-hidden>
      <Canvas flat dpr={1} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}>
        <Backdrop />
      </Canvas>
    </div>
  );
}
