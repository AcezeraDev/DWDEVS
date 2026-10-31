"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SplitType from "split-type";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { ChapterRail, Cursor, Curtain, HorizonFx, Interactions, Preloader } from "@/components/ui-kit";
import { About, Band, Hero, Nav, Services, Summary } from "@/components/sections/intro-sections";
import { Contact, Footer, Process, Projects, Stack } from "@/components/sections/work-sections";
import { prefersReducedMotion, scrollStore } from "@/lib/scroll-store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const BackgroundScene = dynamic(() => import("@/components/three/background-scene"), { ssr: false });

/**
 * Every `[data-chapter]` section takes over the 3D scene (galaxy, gyroscope, hyperspace, halo).
 * Its zone runs from `data-chapter-start` (or its top at 85%) until its top is near the top of the
 * screen, and the scene morphs in step with the scroll across it. The rail flips at the start.
 */
function useChapters(scope: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const set = (n: number) => {
        if (scrollStore.chapter === n) return;
        scrollStore.chapter = n;
        window.dispatchEvent(new CustomEvent("dw:chapter", { detail: n }));
      };
      gsap.utils.toArray<HTMLElement>("[data-chapter]").forEach((el) => {
        const n = Number(el.dataset.chapter);
        if (n === 0) return;
        ScrollTrigger.create({
          trigger: el,
          start: el.dataset.chapterStart ?? "top 85%",
          end: "top 10%",
          onUpdate: (self) => void (scrollStore.legs[n] = self.progress),
          onEnter: () => set(n),
          onLeaveBack: () => set(n - 1),
        });
      });
    },
    { scope }
  );
}

/**
 * Every `.cine` heading is tied to the scroll: its letters stand up out of the floor one by one
 * as it comes in, and lie back down if you scroll back up. Section labels decode like a terminal.
 */
function useCinematicTitles(scope: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const titles = gsap.utils.toArray<HTMLElement>(".cine");
      const splits = titles.map((el) => new SplitType(el, { types: "words,chars" }));
      gsap.set(".cine .word", { whiteSpace: "nowrap" });
      if (prefersReducedMotion()) return () => splits.forEach((s) => s.revert());

      titles.forEach((el) => {
        const chars = el.querySelectorAll(".char");
        gsap.set(el, { perspective: 900 });
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top 95%", end: "top 55%", scrub: 0.7 } })
          .set(chars, { transition: "none" }, 0)
          .fromTo(
            chars,
            { yPercent: 110, rotationX: -100, opacity: 0, transformOrigin: "50% 100% -20px" },
            { yPercent: 0, rotationX: 0, opacity: 1, ease: "power3.out", stagger: 0.035, duration: 0.6 }
          )
          // Hand the letters back to the CSS hover once they have landed
          .set(chars, { clearProps: "transform,transition" });
      });

      const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_#*";
      gsap.utils.toArray<HTMLElement>(".scramble").forEach((el) => {
        const text = el.textContent ?? "";
        ScrollTrigger.create({
          trigger: el,
          start: "top 92%",
          once: true,
          onEnter: () => {
            const state = { p: 0 };
            gsap.to(state, {
              p: 1,
              duration: 0.9,
              ease: "power2.out",
              onUpdate: () => {
                const shown = Math.floor(state.p * text.length);
                el.textContent =
                  text.slice(0, shown) +
                  text
                    .slice(shown)
                    .replace(/\S/g, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
              },
              onComplete: () => void (el.textContent = text),
            });
          },
        });
      });

      return () => splits.forEach((s) => s.revert());
    },
    { scope }
  );
}

/** Children of `.glide` rise, fade and scale into place in a staggered wave tied to the scroll. */
function useGlide(scope: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.utils.toArray<HTMLElement>(".glide").forEach((el) => {
        gsap.fromTo(
          el.children,
          { y: 160, opacity: 0, scale: 0.92, rotationX: 18, transformPerspective: 1200 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            rotationX: 0,
            ease: "power2.out",
            stagger: 0.12,
            scrollTrigger: { trigger: el, start: "top 98%", end: "top 50%", scrub: 1.2 },
          }
        );
      });
    },
    { scope }
  );
}

export function Experience() {
  const root = useRef<HTMLDivElement>(null);
  useChapters(root);
  useCinematicTitles(root);
  useGlide(root);

  return (
    <SmoothScroll>
      <Preloader />
      <Curtain />
      <BackgroundScene />
      <HorizonFx />
      <div className="grain" aria-hidden />
      <Cursor />
      <Interactions />
      <Nav />
      <ChapterRail />
      <div ref={root}>
        <main className="relative z-10">
          <Hero />
          <Band />
          <Summary />
          <About />
          <Services />
          <Stack />
          <Projects />
          <Process />
          <Contact />
        </main>
        <div className="relative z-10">
          <Footer />
        </div>
      </div>
    </SmoothScroll>
  );
}
