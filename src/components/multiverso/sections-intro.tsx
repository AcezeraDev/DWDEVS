"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SummaryCard } from "./cards";
import { Label } from "./chrome";
import { ABOUT, BAND, FOUNDERS, STATS, SUMMARY } from "./data";
import { mv, reduced } from "./store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Two bands that slide with the scroll itself (not on a timer), in opposite directions. */
export function Ticker() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (reduced()) return;
      gsap.utils.toArray<HTMLElement>(".tk-row").forEach((row, i) => {
        gsap.fromTo(row, { xPercent: i ? -30 : 0 }, { xPercent: i ? 0 : -30, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.5 } });
      });
    },
    { scope: root }
  );
  const row = (items: string[]) => [...items, ...items, ...items];
  return (
    <section ref={root} aria-label="O que entregamos" className="relative z-10 overflow-hidden py-14">
      <div className="-rotate-2 bg-acc py-3 text-ink transition-colors duration-700">
        <div className="tk-row flex w-max gap-8 whitespace-nowrap">
          {row(BAND).map((b, i) => (
            <span key={i} className="mv-display flex items-center gap-8 text-2xl font-bold uppercase tracking-tight md:text-4xl">
              {b}
              <span className="inline-block size-4 rounded-full border-2 border-ink md:size-6" />
            </span>
          ))}
        </div>
      </div>
      <div className="-mt-1 rotate-1 border-y border-white/10 bg-ink/85 py-3 backdrop-blur">
        <div className="tk-row flex w-max gap-8 whitespace-nowrap">
          {row(["Next.js", "React", "TypeScript", "Three.js", "GSAP", "Tailwind", "Vercel", "Figma", "WebGL"]).map((t, i) => (
            <span key={i} className="mv-label flex items-center gap-8 text-sm text-paper/60">
              {t}
              <span className="text-acc">◎</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * "Sobre", as a run of dimensions side by side: the section pins and the page slides sideways
 * through them. Each panel swings in like a door as it passes the middle of the screen.
 */
export function Dimensions() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const counts = gsap.utils.toArray<HTMLElement>(".stat-n");
      const count = () =>
        counts.forEach((el) => {
          const v = Number(el.dataset.v);
          const o = { n: 0 };
          gsap.to(o, { n: v, duration: 1.6, ease: "power3.out", onUpdate: () => void (el.textContent = String(Math.round(o.n))) });
        });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = track.current!;
        const dist = () => el.scrollWidth - window.innerWidth;
        counts.forEach((c) => (c.textContent = "0"));
        const slide = gsap.to(el, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
        });
        // Panels swing on their own hinge as they cross the screen
        gsap.utils.toArray<HTMLElement>(".dm-panel").forEach((p) => {
          gsap.fromTo(
            p.querySelector(".dm-inner"),
            { rotationY: -28, scale: 0.88, opacity: 0.35 },
            { rotationY: 0, scale: 1, opacity: 1, ease: "power2.out", scrollTrigger: { trigger: p, containerAnimation: slide, start: "left 100%", end: "left 35%", scrub: true } }
          );
        });
        ScrollTrigger.create({ trigger: ".dm-stats", containerAnimation: slide, start: "left 85%", once: true, onEnter: count });
        // The whole track leans into the scroll speed
        const skew = gsap.quickTo(el, "skewX", { duration: 0.5, ease: "power3.out" });
        const tick = () => void skew(gsap.utils.clamp(-6, 6, mv.velocity * -0.15));
        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section id="sobre" data-scene="1" ref={root} className="relative overflow-hidden">
      <div ref={track} className="mv-scroll-x flex h-svh w-max items-center gap-6 px-4 motion-reduce:w-full motion-reduce:overflow-x-auto md:gap-10 md:px-10 lg:pl-[12vw]">
        <div className="dm-panel w-[86vw] shrink-0 md:w-[42vw]">
          <div className="dm-inner">
            <Label index="01">Quem somos e o que fazemos</Label>
            <h2 className="mv-collapse mv-display mt-6 text-[clamp(2.4rem,7vw,7rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em]">
              Em <span className="text-acc">resumo:</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-paper/70">Três perguntas, três respostas. Continue rolando para atravessar cada uma.</p>
            <span aria-hidden className="mv-label mt-8 inline-flex items-center gap-3 text-acc">
              <span className="h-px w-16 bg-acc" /> →
            </span>
          </div>
        </div>

        {SUMMARY.map((s, i) => (
          <article key={s.q} className="dm-panel w-[86vw] shrink-0 [perspective:1400px] sm:w-[460px] lg:w-[520px]">
            <div className="dm-inner">
              <SummaryCard i={i} q={s.q} a={s.a} />
            </div>
          </article>
        ))}

        <div className="dm-panel w-[86vw] shrink-0 md:w-[64vw] lg:w-[58vw]">
          <div className="dm-inner mv-panel rounded-[2rem] p-7 md:p-10">
            <Label index="02">Quem está por trás</Label>
            <p className="mt-6 text-[clamp(1.25rem,2.4vw,2.2rem)] font-medium leading-snug tracking-[-0.01em] text-paper">{ABOUT}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FOUNDERS.map((f) => (
                <div key={f.initial} className="group mv-spot relative flex items-end justify-between overflow-hidden rounded-3xl border border-white/10 bg-ink-2 p-6">
                  <div>
                    <span className="mv-label rounded-full border border-white/10 px-3 py-1 text-muted">{f.role}</span>
                    <h3 className="mv-display mt-5 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                      {f.first}
                      <br />
                      <span className="text-paper/50 transition-colors duration-500 group-hover:text-acc">{f.last}</span>
                    </h3>
                  </div>
                  <span aria-hidden className="mv-display text-[6rem] font-extrabold leading-[0.8] text-transparent transition-transform duration-700 [-webkit-text-stroke:2px_var(--acc)] group-hover:-rotate-6 group-hover:scale-110">
                    {f.initial}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dm-panel dm-stats w-[86vw] shrink-0 pr-4 md:w-[44vw] md:pr-10">
          <dl className="dm-inner grid grid-cols-2 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="mv-panel mv-spot rounded-3xl p-6">
                <dt className="mv-label text-muted">{s.label}</dt>
                <dd className="mv-display mt-4 whitespace-nowrap text-5xl font-extrabold text-paper md:text-6xl">
                  <span className="stat-n" data-v={s.v}>
                    {s.v}
                  </span>
                  <span className="text-acc">{s.suffix}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
