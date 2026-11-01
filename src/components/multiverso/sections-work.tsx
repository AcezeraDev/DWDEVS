"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SplitType from "split-type";
import { Magnetic, RollText } from "@/components/ui-kit";
import { Label, MvLogo } from "./chrome";
import { LINKEDIN, STEPS } from "./data";
import { isTall, keyOnScreen, reduced, scrollToTarget } from "./store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Keeps an element centred on the spot where the black hole parks for `scene`. */
function useAnchor(scene: number) {
  const [pos, setPos] = useState({ left: 65, top: 51, tall: false });
  useEffect(() => {
    const on = () => setPos({ ...keyOnScreen(scene), tall: isTall() });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [scene]);
  return pos;
}

/**
 * Process as an orbit around the black hole: a probe rides the ellipse as you scroll and lights
 * up each stop (a step of the work); the panel on the left tells the step it just reached.
 */
export function Orbit() {
  const root = useRef<HTMLElement>(null);
  const probe = useRef<SVGGElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const [step, setStep] = useState(0);
  const anchor = useAnchor(5);
  const RX = 46;
  const RY = 36;
  const node = (i: number) => {
    const a = ((-90 + i * 90) * Math.PI) / 180;
    return { x: 50 + Math.cos(a) * RX, y: 50 + Math.sin(a) * RY };
  };

  useGSAP(
    () => {
      if (reduced()) return;
      let shown = 0;
      const state = { p: 0 };
      gsap.to(state, {
        p: 1,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "+=220%", pin: true, scrub: 0.8 },
        onUpdate: () => {
          const a = ((-90 + state.p * 270) * Math.PI) / 180;
          probe.current?.setAttribute("transform", `translate(${50 + Math.cos(a) * RX} ${50 + Math.sin(a) * RY})`);
          trail.current?.setAttribute("stroke-dashoffset", String(1 - state.p * 0.75));
          const s = Math.min(STEPS.length - 1, Math.floor(state.p * 3 + 0.15));
          if (s !== shown) setStep((shown = s));
        },
      });
    },
    { scope: root }
  );

  const size = anchor.tall ? "min(88vw, 46svh)" : "min(44vw, 72svh)";

  return (
    <section id="processo" data-scene="5" ref={root} className="relative h-svh overflow-hidden px-4 md:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${anchor.left}%`, top: `${anchor.top}%`, width: size, aspectRatio: "1" }}
      >
        <svg viewBox="0 0 100 100" className="size-full overflow-visible">
          <ellipse cx="50" cy="50" rx={RX} ry={RY} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.3" strokeDasharray="0.6 1.2" />
          <path
            ref={trail}
            d={`M 50 ${50 - RY} A ${RX} ${RY} 0 1 1 49.99 ${50 - RY}`}
            fill="none"
            stroke="var(--acc)"
            strokeWidth="0.6"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            style={{ filter: "drop-shadow(0 0 1.5px var(--acc))" }}
          />
          {STEPS.map((s, i) => {
            const pt = node(i);
            const on = i <= step;
            return (
              <g key={s.t} transform={`translate(${pt.x} ${pt.y})`}>
                <circle r={on ? 2.6 : 1.8} fill={on ? "var(--acc)" : "#07080a"} stroke={on ? "var(--acc)" : "rgba(255,255,255,0.3)"} strokeWidth="0.3" className="transition-all duration-500" />
                <text y={i === 2 ? 7.5 : -5} x={0} textAnchor={i === 1 ? "end" : i === 3 ? "start" : "middle"} className={"font-mono text-[2.6px] uppercase tracking-[0.12em] transition-colors duration-500 " + (on ? "fill-paper" : "fill-paper/40")}>
                  0{i + 1} · {s.t}
                </text>
              </g>
            );
          })}
          <g ref={probe} transform={`translate(50 ${50 - RY})`}>
            <circle r="4" fill="var(--acc)" opacity="0.18" />
            <circle r="1.3" fill="#f1f0e8" style={{ filter: "drop-shadow(0 0 1.5px var(--acc))" }} />
          </g>
        </svg>
      </div>

      <div className="relative flex h-full flex-col justify-end pb-10 lg:max-w-[38vw] lg:justify-center lg:pb-0">
        <Label index="06">Do papo ao deploy</Label>
        <h2 className="mv-display mt-5 text-[clamp(2rem,4.6vw,4.6rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em]">
          Simples, <span className="text-acc">direto.</span>
        </h2>
        <p className="mt-4 max-w-sm text-paper/65">Você fala sempre com quem está fazendo o seu site. Sem repasse, sem telefone sem fim.</p>
        <div className="relative mt-6 grid">
          {STEPS.map((s, i) => (
            <article
              key={s.t}
              aria-hidden={i !== step}
              className={
                "mv-panel rounded-3xl p-6 transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [grid-area:1/1] md:p-7 motion-reduce:relative motion-reduce:mb-3 motion-reduce:opacity-100 " +
                (i === step ? "translate-y-0 opacity-100" : i < step ? "-translate-y-5 opacity-0" : "translate-y-5 opacity-0")
              }
            >
              <div className="flex items-baseline gap-4">
                <span className="mv-display text-4xl font-extrabold text-acc">0{i + 1}</span>
                <h3 className="mv-display text-2xl font-bold uppercase tracking-tight md:text-3xl">{s.t}</h3>
              </div>
              <p className="mt-3 text-lg text-paper/70">{s.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Contact: the headline starts as a ring of letters orbiting the black hole under it; scrolling
 * unwinds the orbit and every letter flies up into the sentence.
 */
export function Contact() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const split = new SplitType(".ct-title", { types: "words,chars" });
      gsap.set(".ct-title .word", { whiteSpace: "nowrap" });
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current!;
        const chars = gsap.utils.toArray<HTMLElement>(".ct-title .char");
        const n = chars.length;
        // Measured once, before any letter moves (relative to the section, so scroll-proof)
        const s0 = section.getBoundingClientRect();
        const homes = chars.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left - s0.left + r.width / 2, y: r.top - s0.top + r.height / 2 };
        });
        const home = (el: HTMLElement) => homes[chars.indexOf(el)];
        // The orbit, in section coordinates (the section is pinned at the top while it runs)
        const orbit = (i: number, turn: number) => {
          const k = keyOnScreen(6);
          const cx = (k.left / 100) * window.innerWidth;
          const cy = (k.top / 100) * window.innerHeight;
          const R = Math.min(window.innerWidth * 0.42, window.innerHeight * 0.5);
          const a = (i / n) * Math.PI * 2 + turn;
          return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * 0.28 };
        };
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: section, start: "top top", end: "+=120%", pin: true, scrub: 0.8 },
        });
        tl.set(chars, { transition: "none" }, 0);
        chars.forEach((el, i) => {
          const at = (i / n) * 0.35;
          tl.fromTo(
            el,
            {
              x: orbit(i, 0).x - home(el).x,
              y: orbit(i, 0).y - home(el).y,
              rotation: ((i / n) * 360 + 90) % 360,
              scale: 0.7,
              opacity: 0.85,
            },
            {
              keyframes: {
                x: [orbit(i, 0).x - home(el).x, orbit(i, 1.4).x - home(el).x, 0],
                y: [orbit(i, 0).y - home(el).y, orbit(i, 1.4).y - home(el).y, 0],
                easeEach: "sine.inOut",
              },
              rotation: 0,
              scale: 1,
              opacity: 1,
              duration: 0.55,
              ease: "power2.inOut",
            },
            at
          );
        });
        tl.fromTo(".ct-fade", { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.2 }, 0.75);
      });
      return () => {
        mm.revert();
        split.revert();
      };
    },
    { scope: root }
  );

  return (
    <section id="contato" data-scene="6" ref={root} className="relative flex h-svh flex-col items-center px-4 pt-28 text-center md:px-10 md:pt-32">
      <Label index="07" className="ct-fade justify-center">
        Agora é com você
      </Label>
      <h2 className="ct-title mv-display mx-auto mt-6 max-w-6xl text-[clamp(2.2rem,7.4vw,8rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em]">
        Vamos criar o seu site?
      </h2>
      <p className="ct-fade mx-auto mt-6 max-w-lg text-lg text-paper/70">Conte o que você precisa. Respondemos com uma proposta feita para o seu projeto.</p>
      <div className="ct-fade mt-8 flex flex-wrap items-center justify-center gap-3">
        <Magnetic strength={0.4}>
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-full bg-acc py-4 pl-7 pr-4 text-base font-semibold text-ink shadow-[0_18px_60px_-12px_var(--acc)]"
          >
            <RollText>Solicitar proposta</RollText>
            <span className="grid size-8 place-items-center rounded-full bg-ink text-acc transition-transform duration-500 group-hover:rotate-45">↗</span>
          </a>
        </Magnetic>
        <a href={LINKEDIN} target="_blank" rel="noreferrer" className="mv-glass rounded-full px-6 py-4 text-paper/80 transition-colors hover:text-acc">
          <RollText>LinkedIn · /in/dwdevs</RollText>
        </a>
      </div>
      <p className="ct-fade mv-label mt-6 text-muted">Mauá · São Paulo · Brasil</p>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-ink/60 px-4 pb-8 pt-16 backdrop-blur md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <p className="mv-display text-[clamp(2.8rem,13vw,13rem)] font-extrabold leading-[0.85] tracking-[-0.05em]">
            <span data-text="DW" className="mv-echo text-acc">
              DW
            </span>
            devs
          </p>
          <button onClick={() => scrollToTarget(0, 2.4)} className="mv-label mv-glass rounded-full px-5 py-3 text-paper/80 hover:text-acc">
            <RollText>Voltar ao topo ↑</RollText>
          </button>
        </div>
        <div className="mv-label mt-10 flex flex-wrap items-center justify-between gap-4 text-muted">
          <MvLogo className="text-base" />
          <span>© 2026 DWdevs · Estúdio de criação de sites</span>
          <Link href="/original" className="transition-colors hover:text-acc">
            Ver a versão original ↗
          </Link>
          <span>Feito à mão com Next.js + Three.js</span>
        </div>
      </div>
    </footer>
  );
}
