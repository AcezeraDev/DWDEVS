"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { stage } from "@/lib/stage";
import { tintMaterial } from "@/lib/world";

const FLOOR_Y = -3.05;
const STEP = 0.5;
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const dark = new THREE.Color("#040b07");
const bright = new THREE.Color("#2bff88");
const hotter = new THREE.Color("#c9ffe2");
const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y);
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const mouse = new THREE.Vector3(999, 0, 999);
const click = new THREE.Vector3(999, 0, 999);

/** Piso de blocos que forma ondas, sobe perto do mouse e leva a onda do clique. */
export function BlockField() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const camera = useThree((s) => s.camera);
  const { cols, rows, geo, mat } = useMemo(() => {
    const mobile = innerWidth < 768;
    return {
      cols: mobile ? 18 : 46,
      rows: mobile ? 10 : 15,
      geo: new THREE.BoxGeometry(STEP * 0.97, 1, STEP * 0.97),
      mat: new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.12, envMapIntensity: 0.14 }),
    };
  }, []);
  const lastClick = useRef(-1);
  const tick = useRef(0);

  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);

  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const grow = stage.blocks * stage.introFloor;
    m.visible = grow > 0.01;
    if (!m.visible) return;
    tick.current++;
    tintMaterial(bright);
    if (stage.low && tick.current % 2) return;
    const t = stage.reduced ? 3 : clock.elapsedTime;

    if (stage.hasMouse) {
      ndc.set(stage.px, -stage.py);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(floor, mouse)) mouse.set(999, 0, 999);
    }
    if (stage.clickT !== lastClick.current) {
      lastClick.current = stage.clickT;
      ndc.set(stage.clickX, stage.clickY);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(floor, click)) click.set(999, 0, 999);
    }
    const age = performance.now() / 1000 - stage.clickT;

    let i = 0;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = (c - (cols - 1) / 2) * STEP;
        const z = 2.6 - r * STEP;
        const wave = 0.5 + 0.5 * Math.sin(x * 0.55 + t * 0.9 + Math.cos(z * 0.8 + t * 0.4) * 1.6);
        const dx = x - mouse.x;
        const dz = z - mouse.z;
        const near = Math.exp(-(dx * dx + dz * dz) * 0.42);
        const ax = x - click.x;
        const az = z - click.z;
        const ring = Math.exp(-Math.pow(Math.hypot(ax, az) - age * 6, 2) * 0.8) * Math.exp(-age * 1.1);
        // Cresce a partir do centro: cada bloco nasce quando a onda chega nele
        const dist = Math.hypot((c - (cols - 1) / 2) / (cols / 2), (r - rows / 2) / rows);
        const raw = Math.min(1, Math.max(0, grow * 2 - dist * 0.95));
        const u = raw - 1;
        const rise = raw <= 0 ? 0 : 1 + 2.4 * u * u * u + 1.4 * u * u;
        const h = (0.08 + wave * wave * 0.42 + near * 0.72 + ring * 1.5) * rise;
        dummy.position.set(x, FLOOR_Y + h / 2, z);
        dummy.scale.set(Math.max(rise, 0.001), Math.max(h, 0.001), Math.max(rise, 0.001));
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        const heat = Math.min(1, wave * wave * wave * 0.16 + near * 0.5 + ring);
        color.copy(dark).lerp(bright, heat);
        if (heat > 0.75) color.lerp(hotter, (heat - 0.75) * 3);
        m.setColorAt(i, color);
        i++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, cols * rows]} frustumCulled={false} />;
}
