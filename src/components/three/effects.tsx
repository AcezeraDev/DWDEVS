"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { scrollStore } from "@/lib/scroll-store";
import { lensFragment, lensVertex } from "./shaders";

/**
 * Post-processing for the background scene: bloom on the disk and the particles, then a lens
 * pass with chromatic fringes at the edges and a radial smear toward the black hole that grows
 * while it pulls (held click, the dive, fast scrolls).
 *
 * There is no OutputPass on purpose: the scene's shaders already write display-ready colours,
 * so the last pass draws to the screen untouched and the look matches the un-processed scene.
 */
export function Effects() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const small = size.width < 768;

  const fx = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.4, 0.55);
    composer.addPass(bloom);
    const lens = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          uCenter: { value: new THREE.Vector2(0.5, 0.5) },
          uAberr: { value: 0.012 },
          uZoom: { value: 0 },
        },
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
    // Bloom at half resolution: it is blurry anyway and costs a quarter of the fill rate
    fx.bloom.resolution.set(size.width / 2, size.height / 2);
    fx.bloom.setSize((size.width * ratio) / 2, (size.height * ratio) / 2);
  }, [fx, gl, size]);

  useEffect(() => () => fx.composer.dispose(), [fx]);

  // Priority 1: R3F stops drawing on its own and this composer renders the frame instead
  useFrame((_, delta) => {
    const ratio = gl.getPixelRatio();
    if (fx.composer.renderer.getPixelRatio() !== ratio) fx.composer.setPixelRatio(ratio);
    const { charge, speed, crossing, hole } = scrollStore.fx;
    const dive = scrollStore.dive * (1 - scrollStore.legs[1]);
    fx.bloom.strength = (small ? 0.4 : 0.5) + charge * 0.3 + crossing * 0.9 + dive * 0.25 + speed * 0.2;
    fx.bloom.radius = 0.4 + charge * 0.15;
    const u = fx.lens.uniforms;
    u.uCenter.value.set(hole.x / size.width, 1 - hole.y / size.height);
    u.uZoom.value = THREE.MathUtils.damp(u.uZoom.value, charge * 0.1 + dive * 0.1 + speed * 0.05, 8, delta);
    u.uAberr.value = 0.01 + charge * 0.02 + speed * 0.012;
    fx.composer.render(delta);
  }, 1);

  return null;
}
