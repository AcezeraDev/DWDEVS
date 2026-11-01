"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SplitType from "split-type";
import { Comet, DimensionJump, Hud, Iris, MvNav, WarpLabel } from "./chrome";
import { Feeder, Hero } from "./hero";
import { Dimensions, Ticker } from "./sections-intro";
import { Constellation, Portals } from "./sections-services";
import { Contact, Footer, Orbit } from "./sections-work";
import { Universes } from "./universes";
import { mv, reduced } from "./store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const Scene = dynamic(() => import("./scene"), { ssr: false });

/** Lenis drives the page; its speed feeds the scene, the echo of the headlines and the HUD. */
function useSmoothScroll() {
  useEffect(() => {
    const root = document.documentElement;
    if (reduced()) {
      const on = () => {
        const max = root.scrollHeight - window.innerHeight;
        mv.progress = max > 0 ? window.scrollY / max : 0;
      };
      window.addEventListener("scroll", on, { passive: true });
      return () => window.removeEventListener("scroll", on);
    }
    const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.95, touchMultiplier: 1.25 });
    mv.lenis = lenis;    if (!mv.ready) lenis.stop();
    let echo = 0;
    lenis.on("scroll", (e: Lenis) => {
      mv.progress = e.progress || 0;
      mv.velocity = e.velocity;
      ScrollTrigger.update();
    });
    const raf = (time: number) => {
      lenis.raf(time * 1000);
      // Echo layers drift apart with the speed and fold back when it stops
      echo += (gsap.utils.clamp(-22, 22, mv.velocity * 0.7) - echo) * 0.12;
      root.style.setProperty("--echo", `${echo.toFixed(2)}px`);
      // Only visible while moving: at rest the split letters and the echo would not line up
      root.style.setProperty("--echo-a", Math.min(1, Math.abs(echo) / 5).toFixed(3));
      if (!lenis.isScrolling) mv.velocity *= 0.9;
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      mv.lenis = null;
      root.style.removeProperty("--echo");
      root.style.removeProperty("--echo-a");
    };
  }, []);
}

/** Each `[data-scene]` section calls the black hole to its spot as it scrolls in. */
function useScenes(scope: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>("[data-scene]").forEach((el) => {
        const n = Number(el.dataset.scene);
        if (!n) return;
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          end: "top 15%",
          onUpdate: (self) => void (mv.legs[n] = self.progress),
          onLeaveBack: () => void (mv.legs[n] = 0),
          onLeave: () => void (mv.legs[n] = 1),
        });
      });
    },
    { scope }
  );
}

/**
 * `.mv-collapse` headings: every letter starts scattered and blurred, like a superposition of
 * places, and collapses into the word as the heading scrolls in (and back out if you scroll up).
 */
function useCollapseTitles(scope: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const titles = gsap.utils.toArray<HTMLElement>(".mv-collapse");
      const splits = titles.map((el) => new SplitType(el, { types: "words,chars" }));
      gsap.set(".mv-collapse .word", { whiteSpace: "nowrap" });
      if (reduced()) return () => splits.forEach((s) => s.revert());
      titles.forEach((el) => {
        const chars = el.querySelectorAll<HTMLElement>(".char");
        const r = gsap.utils.random;
        const seeds = Array.from(chars, () => ({ x: r(-90, 90), y: r(-60, 60), z: r(-1, 1) }));
        gsap.fromTo(
          chars,
          {
            x: (i: number) => seeds[i].x,
            y: (i: number) => seeds[i].y,
            rotation: (i: number) => seeds[i].z * 40,
            scale: (i: number) => 1 + seeds[i].z * 0.6,
            opacity: 0,
            filter: "blur(10px)",
          },
          {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            ease: "power3.out",
            stagger: { each: 0.02, from: "random" },
            scrollTrigger: { trigger: el, start: "top 92%", end: "top 50%", scrub: 0.8 },
          }
        );
      });
      return () => splits.forEach((s) => s.revert());
    },
    { scope }
  );
}

/** `.mv-rise` groups: children come up out of depth one after another, tied to the scroll. */
function useRise(scope: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      if (reduced()) return;
      gsap.utils.toArray<HTMLElement>(".mv-rise").forEach((el) => {
        gsap.fromTo(
          el.children,
          { y: 90, z: -260, rotationY: -14, opacity: 0, transformPerspective: 1400 },
          { y: 0, z: 0, rotationY: 0, opacity: 1, ease: "power2.out", stagger: 0.14, scrollTrigger: { trigger: el, start: "top 95%", end: "top 55%", scrub: 1 } }
        );
      });
    },
    { scope }
  );
}

/** Spotlight on `.mv-spot` cards. */
function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(".mv-spot") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", move);
    return () => document.removeEventListener("pointermove", move);
  }, []);
}

export function Multiverse() {
  const root = useRef<HTMLDivElement>(null);
  useSmoothScroll();
  useScenes(root);
  useCollapseTitles(root);
  useRise(root);
  useSpotlight();

  return (
    <>
      <Iris />
      <Scene />
      <div className="grain" aria-hidden />
      <Feeder />
      <Comet />
      <DimensionJump />
      <WarpLabel />
      <MvNav />
      <Hud />
      <div ref={root}>
        <main className="relative z-10">
          <Hero />
          <Ticker />
          <Dimensions />
          <Portals />
          <Constellation />
          <Universes />
          <Orbit />
          <Contact />
        </main>
        <div className="relative z-10">
          <Footer />
        </div>
      </div>
    </>
  );
}
