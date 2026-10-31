"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SplitType from "split-type";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { Cursor, Curtain, Interactions, Preloader } from "@/components/ui-kit";
import { About, Band, Hero, Nav, Services, Summary } from "@/components/sections/intro-sections";
import { Contact, Footer, Process, Projects, Stack } from "@/components/sections/work-sections";
import { prefersReducedMotion } from "@/lib/scroll-store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const BackgroundScene = dynamic(() => import("@/components/three/background-scene"), { ssr: false });

/** Every `.cine` heading: letters flip up out of the floor in 3D when they enter, then react to hover. */
function useCinematicTitles(scope: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const titles = gsap.utils.toArray<HTMLElement>(".cine");
      const splits = titles.map((el) => new SplitType(el, { types: "words,chars" }));
      gsap.set(".cine .word", { whiteSpace: "nowrap" });
      if (!prefersReducedMotion()) {
        titles.forEach((el) => {
          gsap.set(el, { perspective: 900 });
          gsap.from(el.querySelectorAll(".char"), {
            yPercent: 120,
            rotationX: -95,
            opacity: 0,
            transformOrigin: "50% 100% -30px",
            duration: 1.3,
            ease: "expo.out",
            stagger: 0.022,
            scrollTrigger: { trigger: el, start: "top 88%" },
            clearProps: "transform,opacity",
          });
        });
      }
      return () => splits.forEach((s) => s.revert());
    },
    { scope }
  );
}

/**
 * Scroll-scrubbed motion so everything moves *with* the scroll instead of firing once:
 * - section titles drift at a different speed than the page (parallax depth)
 * - children of `.glide` rise, fade and scale into place in a staggered wave
 */
function useFluidScroll(scope: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.utils.toArray<HTMLElement>(".cine").forEach((el) => {
        if (el.closest("#projetos, footer")) return; // pinned / last section stay put
        gsap.fromTo(
          el,
          { y: 70 },
          {
            y: -70,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1.2 },
          }
        );
      });
      gsap.utils.toArray<HTMLElement>(".glide").forEach((el) => {
        gsap.fromTo(
          el.children,
          { y: 160, opacity: 0, scale: 0.92 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            ease: "power2.out",
            stagger: 0.12,
            scrollTrigger: { trigger: el, start: "top 98%", end: "top 50%", scrub: 1.4 },
          }
        );
      });
    },
    { scope }
  );
}

export function Experience() {
  const root = useRef<HTMLDivElement>(null);
  useCinematicTitles(root);
  useFluidScroll(root);

  return (
    <SmoothScroll>
      <Preloader />
      <Curtain />
      <BackgroundScene />
      <div className="grain" aria-hidden />
      <Cursor />
      <Interactions />
      <Nav />
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
