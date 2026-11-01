"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "motion/react";
import { Label } from "./chrome";
import { PROJECTS } from "./data";
import { isTall, keyOnScreen, reduced } from "./store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Degrees between two sites on the orbit: wide enough that a clear gap opens as they turn. */
const STEP = 68;

/**
 * Projects as universes orbiting the black hole. The section pins; the sites ride a ring around
 * the hole (a 3D carousel), the one in front big and sharp, its neighbours turned away and
 * dimmed, the far side hidden. Each scroll step swings the orbit to the next site: mid-swing the
 * ring is pulled in toward the hole and the gap shows the hole itself, then the next site
 * arrives and holds still to be read.
 */
export function Universes() {
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLAnchorElement | null)[]>([]);
  const ringRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [spot, setSpot] = useState({ top: 45, tall: false });

  useEffect(() => {
    const on = () => setSpot({ top: keyOnScreen(4).top, tall: isTall() });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useGSAP(
    () => {
      const n = PROJECTS.length;
      const state = { rot: 0, pull: 0 };
      let shown = 0;

      // Lay the ring out from the state: each site at its angle, faded and blurred as it turns away
      const place = () => {
        const w = cards.current[0]?.offsetWidth ?? 600;
        const R = w * (isTall() ? 0.85 : 1.15) * (1 - state.pull * 0.25);
        cards.current.forEach((el, i) => {
          if (!el) return;
          const a = i * STEP + state.rot;
          const f = Math.cos((a * Math.PI) / 180);
          const seen = Math.max(0, Math.min(1, (f + 0.05) / 0.6));
          el.style.transform = `translate(-50%, -50%) rotateY(${a.toFixed(2)}deg) translateZ(${R.toFixed(1)}px) scale(${(1 - state.pull * 0.12).toFixed(3)})`;
          el.style.opacity = String(seen * (0.55 + 0.45 * Math.max(0, f) ** 2));
          el.style.filter = `blur(${((1 - Math.max(0, f)) * 3).toFixed(1)}px) brightness(${(0.55 + 0.45 * Math.max(0, f) ** 2).toFixed(2)})`;
          el.style.zIndex = String(Math.round(f * 100) + 100);
          el.style.pointerEvents = f > 0.9 ? "auto" : "none";
        });
        const i = Math.max(0, Math.min(n - 1, Math.round(-state.rot / STEP)));
        if (i !== shown) setActive((shown = i));
      };
      place();
      if (reduced()) return;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: place,
        scrollTrigger: {
          trigger: stage.current,
          start: "top top",
          end: () => `+=${n * 100}%`,
          pin: true,
          scrub: 0.9,
          invalidateOnRefresh: true,
          onUpdate: (self) => gsap.set(".uv-progress", { scaleX: self.progress }),
        },
      });
      tl.to({}, { duration: 0.35 });
      for (let i = 1; i < n; i++) {
        tl.to(state, { rot: -i * STEP, duration: 1, ease: "power2.inOut" })
          .to(state, { pull: 1, duration: 0.5, ease: "power2.out" }, "<")
          .to(state, { pull: 0, duration: 0.5, ease: "power2.in" }, "<0.5")
          .to({}, { duration: 0.45 });
      }

      // The ring leans with the cursor, so the orbit reads in depth
      if (!window.matchMedia("(pointer: fine)").matches) return;
      const ry = gsap.quickTo(ringRef.current, "rotationY", { duration: 1.2, ease: "power3.out" });
      const rx = gsap.quickTo(ringRef.current, "rotationX", { duration: 1.2, ease: "power3.out" });
      const move = (e: PointerEvent) => {
        ry((e.clientX / window.innerWidth - 0.5) * 8);
        rx(-6 - (e.clientY / window.innerHeight - 0.5) * 6);
      };
      window.addEventListener("pointermove", move);
      return () => window.removeEventListener("pointermove", move);
    },
    { scope: stage }
  );

  const p = PROJECTS[active];
  const w = spot.tall ? "min(72vw, 38svh)" : "min(33vw, calc((100svh - 380px) * 1.45), 620px)";

  return (
    <section id="projetos" data-scene="4" className="relative pt-28 md:pt-36">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-6 px-4 md:px-10">
        <div>
          <Label index="05">Trabalho real, cliente real</Label>
          <h2 className="mv-collapse mv-display mt-6 text-[clamp(2.2rem,6.5vw,6.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em]">
            Já estão <span className="mv-outline">no ar.</span>
          </h2>
        </div>
        <p className="max-w-sm text-paper/65">
          Alguns dos sites que criamos. Cada um pensado para o negócio do cliente, nenhum a partir de template. Role para girar a
          órbita até o próximo.
        </p>
      </div>

      <div ref={stage} className="relative h-svh overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
          style={{ background: `radial-gradient(40% 45% at 50% ${spot.top}%, color-mix(in srgb, ${p.accent} 26%, transparent), transparent 70%)` }}
        />

        {/* The orbit, centred on the black hole */}
        <div className="absolute inset-x-0 [perspective:1800px]" style={{ top: `${spot.top}%` }}>
          <div ref={ringRef} className="relative [transform-style:preserve-3d]" style={{ transform: "rotateX(-6deg)" }}>
            {PROJECTS.map((x, i) => (
              <a
                key={x.name}
                ref={(el) => void (cards.current[i] = el)}
                href={x.url}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                aria-label={`Abrir o site ${x.name} em nova aba`}
                tabIndex={i === active ? 0 : -1}
                className="group absolute left-1/2 top-0 block [backface-visibility:hidden] will-change-transform"
                style={{ width: w }}
              >
                <div className="mv-panel overflow-hidden rounded-[1.4rem] transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.03]">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
                    <span className="size-2 rounded-full bg-white/20" />
                    <span className="size-2 rounded-full bg-white/20" />
                    <span className="size-2 rounded-full bg-white/20" />
                    <span className="mv-label ml-2 truncate rounded-full bg-white/5 px-3 py-1 text-[10px] normal-case tracking-normal text-muted">{x.host}</span>
                  </div>
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={x.img} alt={`Página inicial do site ${x.name}`} fill sizes="(min-width: 1024px) 40vw, 76vw" className="object-cover object-top transition-transform duration-[1.2s] group-hover:scale-105" />
                    <div className="absolute inset-0 opacity-0 mix-blend-color transition-opacity duration-700 group-hover:opacity-25" style={{ background: x.accent }} />
                  </div>
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-[1.4rem] border opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ borderColor: x.accent, boxShadow: `0 0 50px -10px ${x.accent}` }}
                />
              </a>
            ))}
          </div>
        </div>

        {/* Details of the site in front */}
        <div className="absolute inset-x-4 bottom-12 md:inset-x-10 md:bottom-14">
          <div className="mx-auto max-w-[1200px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
                className="mv-panel grid gap-4 rounded-3xl p-5 md:grid-cols-[auto_1fr_1.2fr] md:items-center md:gap-8 md:p-6"
              >
                <span className="mv-display text-4xl font-extrabold tabular-nums text-acc md:text-5xl">
                  0{active + 1}
                  <span className="mv-label ml-2 align-middle text-muted">/ 0{PROJECTS.length}</span>
                </span>
                <div>
                  <p className="mv-label text-muted">{p.kind}</p>
                  <h3 className="mv-display mt-1 text-2xl font-bold uppercase tracking-tight md:text-3xl">{p.name}</h3>
                </div>
                <div>
                  <p className="text-paper/70 max-md:line-clamp-3">{p.text}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {p.tags.map((t) => (
                      <span key={t} className="mv-label rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-paper/70">
                        {t}
                      </span>
                    ))}
                    <a href={p.url} target="_blank" rel="noreferrer" className="mv-label ml-auto hidden text-acc hover:underline md:inline">
                      Visitar ↗
                    </a>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute bottom-6 left-4 right-4 h-px bg-white/10 md:left-10 md:right-10">
          <div className="uv-progress h-px origin-left bg-acc" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>

      {/* Without motion the orbit only shows the first site, so list them all */}
      <ul className="mx-auto hidden max-w-[1400px] gap-3 px-4 pb-16 motion-reduce:grid md:grid-cols-2 md:px-10">
        {PROJECTS.map((x) => (
          <li key={x.name}>
            <a href={x.url} target="_blank" rel="noreferrer" className="mv-panel block rounded-2xl p-5 hover:text-acc">
              <span className="mv-label text-muted">{x.kind}</span>
              <span className="mv-display mt-1 block text-xl font-bold uppercase">{x.name} ↗</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

