"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import gsap from "gsap";
import { sfx } from "@/lib/sound";
import { initWorld, tickWorld } from "@/lib/world";
import { stage } from "@/lib/stage";

const BgScene = dynamic(() => import("./bg-scene"), { ssr: false });

// O que vale para todas as rotas: fundo, mundo de cor, som e posição do mouse.
export function Shell() {
  useEffect(() => {
    initWorld();
    sfx.init();
    const tick = () => tickWorld(gsap.ticker.deltaRatio(60) / 60);
    gsap.ticker.add(tick);
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      stage.hasMouse = true;
      stage.px = (e.clientX / innerWidth - 0.5) * 2;
      stage.py = (e.clientY / innerHeight - 0.5) * 2;
    };
    addEventListener("pointermove", move);
    // Som ligado em visita anterior: o navegador só libera depois do primeiro gesto
    const unlock = () => {
      if (sfx.isOn()) sfx.hover();
      removeEventListener("pointerdown", unlock);
    };
    addEventListener("pointerdown", unlock);
    return () => {
      gsap.ticker.remove(tick);
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", unlock);
    };
  }, []);

  return <BgScene />;
}
