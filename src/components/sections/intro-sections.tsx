"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SplitType from "split-type";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Logo, Magnetic, RollText, SectionLabel } from "@/components/ui-kit";
import { DIVE_POINT, cinematicTo, offsetIn, prefersReducedMotion, scrollStore, scrollToTarget } from "@/lib/scroll-store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const LINKEDIN = "https://www.linkedin.com/in/dwdevs/";

const NAV = [
  { id: "#sobre", label: "Sobre" },
  { id: "#servicos", label: "Serviços" },
  { id: "#stack", label: "Stack" },
  { id: "#projetos", label: "Projetos" },
  { id: "#contato", label: "Contato" },
];

export function Nav() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const show = () =>
      gsap.to(ref.current, { y: 0, opacity: 1, duration: 1, ease: "expo.out", delay: 0.5 });
    window.addEventListener("dw:ready", show, { once: true });
    return () => window.removeEventListener("dw:ready", show);
  }, []);

  return (
    <header
      ref={ref}
      className="fixed inset-x-0 top-4 z-50 mx-auto w-[calc(100%-32px)] max-w-6xl -translate-y-24 opacity-0"
    >
      <nav className="glass flex items-center justify-between rounded-full py-2.5 pl-5 pr-2.5">
        <a href="#top" onClick={(e) => (e.preventDefault(), scrollToTarget(0))} aria-label="DWdevs, voltar ao topo">
          <Logo />
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <li key={n.id}>
              <a
                href={n.id}
                onClick={(e) => {
                  e.preventDefault();
                  cinematicTo(n.id, n.label);
                }}
                className="block rounded-full px-4 py-2 text-sm text-paper/70 transition-colors hover:bg-white/5 hover:text-lime"
              >
                <RollText>{n.label}</RollText>
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#contato"
          onClick={(e) => {
            e.preventDefault();
            cinematicTo("#contato", "Contato");
          }}
          className="rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.04]"
        >
          <span className="md:hidden">Contato</span>
          <span className="hidden md:inline">
            <RollText>Fale com a gente</RollText>
          </span>
        </a>
      </nav>
    </header>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const split = new SplitType(".hero-line", { types: "words,chars" });
      gsap.set(".hero-line .word", { whiteSpace: "nowrap" });
      gsap.set(".hero-line .char", { yPercent: 115, skewY: 8 });
      gsap.set(".hero-fade", { opacity: 0, yPercent: 30 });

      const play = () => {
        gsap
          .timeline()
          .to(".hero-line .char", { yPercent: 0, skewY: 0, duration: 1.1, ease: "expo.out", stagger: 0.025 })
          .to(".hero-fade", { opacity: 1, yPercent: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 }, "-=0.7");
      };
      window.addEventListener("dw:ready", play, { once: true });

      // Event horizon: the hero pins while the black hole drifts to the middle and eats it.
      // Pieces closest to the hole go first; each one is flung sideways along the disk's spin,
      // stretched, then sucked in. scrollStore.dive tells the scene to grow the hole and fall in.
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current!;
        const pieces = gsap.utils.toArray<HTMLElement>(".hero-line .char, .hero-fade");
        const hole = () => ({ x: (DIVE_POINT.x * 0.5 + 0.5) * window.innerWidth, y: (0.5 - DIVE_POINT.y * 0.5) * window.innerHeight });
        // The section is pinned at the top, so its own coordinates are the screen's.
        const pull = (el: HTMLElement) => {
          const o = offsetIn(el, section);
          const h = hole();
          return { x: h.x - o.x, y: h.y - o.y };
        };
        const order = pieces
          .map((el) => ({ el, d: Math.hypot(pull(el).x, pull(el).y) }))
          .sort((a, b) => a.d - b.d)
          .map((p) => p.el);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=140%",
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: (self) => void (scrollStore.dive = self.progress),
            onLeaveBack: () => void (scrollStore.dive = 0),
          },
        });
        tl.set(".hero-mask", { overflow: "visible" }, 0)
          .set(".hero-line .char", { transition: "none" }, 0)
          // Anticipation: the whole block leans and stretches toward the hole before letting go
          .to(".hero-inner", { scaleX: 1.04, skewX: -5, x: 24, y: -10, transformOrigin: "60% 30%", duration: 0.2, ease: "sine.in" }, 0);
        order.forEach((el, i) => {
          const at = 0.1 + (i / order.length) * 0.48;
          const spin = 260 + (i % 5) * 70;
          // Sideways kick, perpendicular to the pull (clockwise, like the disk)
          tl.to(
            el,
            {
              x: () => pull(el).x * 0.3 - pull(el).y * 0.22,
              y: () => pull(el).y * 0.3 + pull(el).x * 0.22,
              rotation: spin * 0.35,
              scaleX: 1.35,
              scaleY: 0.75,
              duration: 0.22,
              ease: "sine.in",
            },
            at
          ).to(
            el,
            {
              x: () => pull(el).x,
              y: () => pull(el).y,
              rotation: spin,
              scale: 0.04,
              opacity: 0,
              duration: 0.24,
              ease: "power3.in",
            },
            at + 0.22
          );
        });
        tl.to({}, { duration: 0.12 });
      });

      return () => {
        window.removeEventListener("dw:ready", play);
        mm.revert();
        split.revert();
      };
    },
    { scope: root }
  );

  return (
    <section
      id="top"
      data-chapter="0"
      ref={root}
      className="relative flex min-h-svh flex-col px-4 pb-5 pt-24 md:px-10 lg:pt-28"
    >
      <div className="hero-inner relative flex w-full flex-1 flex-col">
        {/* Copy sits in the left ~55%; the right side is left empty for the black hole */}
        <div className="flex flex-1 flex-col justify-end pt-[24svh] lg:max-w-[56vw] lg:justify-center lg:pt-0">
          <p className="hero-fade label mb-5 flex items-center gap-3 text-muted">
            <span className="relative grid size-2 place-items-center">
              <span className="absolute size-2 animate-ping rounded-full bg-lime/60" />
              <span className="size-2 rounded-full bg-lime" />
            </span>
            Estúdio de sites · Mauá, SP
          </p>

          <h1 className="char-hover font-display text-[clamp(2.2rem,10.2vw,6rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.045em] lg:text-[clamp(3rem,5.8vw,8.5rem)]">
            <span className="hero-mask block overflow-hidden pb-[0.04em]">
              <span className="hero-line block">Sites que</span>
            </span>
            <span className="hero-mask flex items-end gap-[0.35em] overflow-hidden pb-[0.04em]">
              <span className="hero-line block text-transparent [-webkit-text-stroke:1.5px_var(--paper)]">ninguém</span>
              <span className="hero-fade label mb-[0.55em] hidden text-[11px] font-normal normal-case leading-snug tracking-[0.14em] text-muted xl:block">
                design
                <br />
                código
                <br />
                <span className="text-lime">deploy</span>
              </span>
            </span>
            <span className="hero-mask block overflow-hidden pb-[0.08em]">
              <span className="hero-line block text-lime">esquece.</span>
            </span>
          </h1>

          <div className="mt-7 flex flex-col gap-6 lg:mt-11 lg:gap-8">
            <p className="hero-fade max-w-[34rem] text-base leading-relaxed text-paper/75 sm:text-lg md:text-xl">
              A <strong className="font-semibold text-paper">DWdevs</strong> cria o site da sua empresa do zero: design,
              programação e publicação. Você fala direto com os dois desenvolvedores, do primeiro contato até o site no ar.
            </p>
            <div className="hero-fade flex flex-wrap items-center gap-2 sm:gap-3">
              <Magnetic>
                <button
                  onClick={() => cinematicTo("#projetos", "Projetos")}
                  className="group flex items-center gap-2 rounded-full bg-lime py-3 pl-5 pr-3 text-[15px] font-semibold text-ink sm:gap-3 sm:py-4 sm:pl-7 sm:pr-4 sm:text-base shadow-[0_18px_60px_-12px_rgba(200,240,49,0.55)]"
                >
                  <RollText>Ver projetos</RollText>
                  <span className="grid size-8 place-items-center rounded-full bg-ink text-lime transition-transform duration-300 group-hover:rotate-45">
                    ↗
                  </span>
                </button>
              </Magnetic>
              <Magnetic>
                <button
                  onClick={() => cinematicTo("#contato", "Contato")}
                  className="glass rounded-full px-5 py-3.5 text-[15px] font-medium text-paper transition-colors hover:border-lime/60 hover:text-lime sm:px-7 sm:py-4 sm:text-base"
                >
                  <RollText>Pedir orçamento</RollText>
                </button>
              </Magnetic>
            </div>
          </div>
        </div>

        {/* Notes pinned around the black hole (wide screens only) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <div className="hero-fade absolute left-[60vw] top-[16%] flex items-start gap-3">
            <span className="label leading-relaxed text-muted">
              Buraco negro em tempo real
              <br />
              <span className="text-paper/60">GLSL · raymarching</span>
            </span>
            <svg width="90" height="60" viewBox="0 0 90 60" className="mt-2 text-lime/60" fill="none">
              <path d="M0 1 H50 L88 58" stroke="currentColor" strokeWidth="1" />
              <circle cx="88" cy="58" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div className="hero-fade absolute bottom-[26%] right-0 flex items-end gap-3">
            <svg width="70" height="50" viewBox="0 0 70 50" className="mb-2 text-lime/60" fill="none">
              <path d="M2 2 L30 49 H70" stroke="currentColor" strokeWidth="1" />
              <circle cx="2" cy="2" r="2.5" fill="currentColor" />
            </svg>
            <span className="label text-right leading-relaxed text-muted">
              Segure o clique sobre ele
              <br />
              <span className="text-paper/60">solte para liberar a onda</span>
            </span>
          </div>
        </div>

        <div className="hero-fade relative mt-6 flex flex-wrap items-center justify-end sm:justify-between lg:mt-8 gap-x-8 gap-y-4 border-t border-white/10 pt-5">
          <ul className="hidden flex-wrap gap-2 sm:flex">
            {["Sites institucionais", "Landing pages", "Sites 3D interativos"].map((t) => (
              <li key={t} className="label cursor-default rounded-full border border-white/10 px-3 py-1.5 text-paper/70 transition-colors hover:border-lime hover:bg-lime hover:text-ink">
                {t}
              </li>
            ))}
          </ul>
          <dl className="hidden items-center gap-7 md:flex">
            {[
              ["4", "sites no ar"],
              ["2", "devs, sem repasse"],
              ["0", "templates"],
            ].map(([v, l]) => (
              <div key={l} className="flex items-baseline gap-2">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-2xl font-extrabold text-paper">{v}</dd>
                <span aria-hidden className="label text-muted">{l}</span>
              </div>
            ))}
          </dl>
          <FallBadge />
        </div>
      </div>
    </section>
  );
}

/** Rotating "scroll to fall in" badge: a click plays the whole dive as one long, smooth scroll. */
function FallBadge() {
  const text = "Role para cair no buraco negro · ";
  return (
    <button
      onClick={() => {
        const end = window.innerHeight * 1.4;
        if (scrollStore.lenis) scrollStore.lenis.scrollTo(end, { duration: 3.4 });
        else scrollToTarget(end);
      }}
      aria-label="Rolar e cair no buraco negro"
      className="group relative grid size-20 shrink-0 place-items-center lg:size-24"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 animate-[spin_14s_linear_infinite] text-paper/60 transition-colors group-hover:text-lime motion-reduce:animate-none">
        <defs>
          <path id="fall-ring" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" />
        </defs>
        <text className="fill-current font-mono text-[8.6px] uppercase tracking-[0.18em]">
          <textPath href="#fall-ring">{text}</textPath>
        </text>
      </svg>
      <span className="grid size-9 place-items-center rounded-full border border-lime/50 text-lime transition-all duration-500 group-hover:bg-lime group-hover:text-ink">
        <span className="[animation:scroll-dot_1.6s_ease-in-out_infinite]">↓</span>
      </span>
    </button>
  );
}

const BAND = ["Sites institucionais", "Landing pages", "Experiências 3D", "Web design", "UX", "Animações de scroll", "SEO", "Performance"];

export function Band() {
  return (
    <section aria-label="O que entregamos" data-chapter="1" data-chapter-start="top bottom" className="relative z-10 -my-2 overflow-hidden py-16">
      <div className="skew -rotate-2 bg-lime py-3 text-ink shadow-[0_30px_80px_rgba(200,240,49,0.25)]">
        <Marquee pauseOnHover className="[--duration:28s] [--gap:2.5rem]" repeat={4}>
          {BAND.map((b) => (
            <span key={b} className="group/b flex items-center gap-10 font-display text-3xl font-extrabold uppercase tracking-tight md:text-5xl">
              <span className="transition-colors duration-300 [-webkit-text-stroke:1.5px_transparent] group-hover/b:text-transparent group-hover/b:[-webkit-text-stroke:1.5px_#07080a]">
                {b}
              </span>
              <span className="text-2xl transition-transform duration-700 group-hover/b:rotate-180 md:text-3xl">✳</span>
            </span>
          ))}
        </Marquee>
      </div>
      <div className="mt-[-1.5rem] rotate-1 border-y border-white/10 bg-ink/80 py-3 backdrop-blur">
        <Marquee reverse className="[--duration:36s] [--gap:2rem]" repeat={4}>
          {["Next.js", "React", "TypeScript", "Three.js", "GSAP", "Tailwind", "Vercel", "Figma", "WebGL"].map((t) => (
            <span key={t} className="label flex items-center gap-8 text-sm text-paper/60">
              {t}
              <span className="text-lime">●</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

const FOUNDERS = [
  { initial: "D", first: "Davi", last: "Carvalho", role: "Co-fundador" },
  { initial: "W", first: "William", last: "Cristian", role: "Co-fundador" },
];

export function About() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const split = new SplitType(".about-text", { types: "words" });
      if (!prefersReducedMotion()) {
        gsap.fromTo(
          ".about-text .word",
          { opacity: 0.12 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: { trigger: ".about-text", start: "top 80%", end: "bottom 45%", scrub: true },
          }
        );
      }
      return () => split.revert();
    },
    { scope: root }
  );

  return (
    <section id="sobre" ref={root} className="relative px-4 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel index="01">Quem está por trás</SectionLabel>
        <p className="about-text mt-10 max-w-6xl font-display text-[clamp(1.9rem,4.6vw,4.6rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
          Somos um estúdio pequeno de propósito. Dois desenvolvedores cuidando de cada projeto, do primeiro rascunho ao
          deploy, sem intermediários, sem template e sem pressa de entregar o genérico.
        </p>

        <div className="founders glide mt-20 grid gap-5 [perspective:1200px] md:grid-cols-2">
          {FOUNDERS.map((f) => (
            <article key={f.initial} data-tilt="5" className="founder glass spot group relative overflow-hidden rounded-3xl p-7 md:p-9">
              <div className="flex items-start justify-between">
                <span className="font-display text-[7rem] font-extrabold leading-[0.8] text-lime transition-all duration-700 [-webkit-text-stroke:2px_transparent] group-hover:-translate-y-1 group-hover:rotate-[-4deg] group-hover:text-transparent group-hover:[-webkit-text-stroke:2px_#c8f031] md:text-[9rem]">
                  {f.initial}
                </span>
                <span className="label rounded-full border border-white/10 px-3 py-1.5 text-muted">{f.role}</span>
              </div>
              <div className="mt-8 flex items-end justify-between gap-4">
                <h3 className="font-display text-3xl font-bold leading-none tracking-tight md:text-4xl">
                  {f.first}
                  <br />
                  <span className="text-paper/50 transition-colors duration-500 group-hover:text-lime">{f.last}</span>
                </h3>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/15 text-lg transition-all duration-500 group-hover:rotate-45 group-hover:border-lime group-hover:bg-lime group-hover:text-ink">
                  ↗
                </span>
              </div>
              <div className="pointer-events-none absolute -bottom-24 -right-24 size-64 rounded-full bg-lime/10 blur-3xl transition-opacity duration-700 group-hover:opacity-100 md:opacity-40" />
            </article>
          ))}
        </div>

        <dl className="glide mt-5 grid grid-cols-2 gap-5 md:grid-cols-4">
          {[
            { v: 4, suffix: "", label: "sites no ar" },
            { v: 2, suffix: "", label: "devs dedicados" },
            { v: 100, suffix: "%", label: "código sob medida" },
            { v: 0, suffix: "", label: "templates prontos" },
          ].map((s) => (
            <div key={s.label} data-tilt="6" className="glass spot rounded-3xl p-6">
              <dt className="label text-muted">{s.label}</dt>
              <dd className="mt-4 whitespace-nowrap font-display text-5xl font-extrabold text-paper md:text-6xl">
                <NumberTicker value={s.v} className="text-paper dark:text-paper" />
                <span className="text-lime">{s.suffix}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const SERVICES = [
  {
    n: "01",
    title: "Sites institucionais",
    text: "A cara da sua empresa na internet. Um site que transmite confiança, conta sua história e aparece no Google.",
    items: ["SEO técnico", "Performance", "Responsivo", "Integração com WhatsApp"],
    tone: "dark",
  },
  {
    n: "02",
    title: "Landing pages",
    text: "Páginas pensadas para converter: carregamento instantâneo, mensagem clara e um caminho direto até o contato.",
    items: ["Copy e estrutura", "Formulários", "Analytics", "Testes A/B"],
    tone: "glass",
  },
  {
    n: "03",
    title: "Sites 3D interativos",
    text: "Produtos que giram, cenas WebGL e animações de scroll que fazem o visitante parar e explorar.",
    items: ["Three.js / WebGL", "Scroll storytelling", "Modelos 3D", "Micro-interações"],
    tone: "lime",
  },
  {
    n: "04",
    title: "Web design & UX",
    text: "Direção visual, tipografia e fluxos pensados para quem vai usar. Protótipo antes do código.",
    items: ["UI design", "Protótipos", "Design system", "Acessibilidade"],
    tone: "dark",
  },
] as const;

export function Services() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // Stacked cards are the phone/tablet (and reduced-motion) version; desktop gets the orbit
      const mm = gsap.matchMedia();
      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".svc-card");
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next) return;
          gsap.to(card.querySelector(".svc-inner"), {
            scale: 0.88,
            rotationX: 14,
            yPercent: -3,
            transformPerspective: 1400,
            ease: "none",
            scrollTrigger: { trigger: next, start: "top 90%", end: "top 20%", scrub: true },
          });
          gsap.to(card.querySelector(".svc-shade"), {
            opacity: 0.65,
            ease: "none",
            scrollTrigger: { trigger: next, start: "top 90%", end: "top 20%", scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section id="servicos" data-chapter="2" ref={root} className="relative py-28 md:py-36">
      <div className="mx-auto max-w-[1400px] px-4 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionLabel index="02">O que sai daqui</SectionLabel>
            <h2 className="cine char-hover mt-6 font-display text-[clamp(2.2rem,7vw,7rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em]">
              Do zero <br />
              <span className="text-outline">ao deploy.</span>
            </h2>
          </div>
          <p className="max-w-sm text-paper/65">
            Cuidamos de tudo: estrutura, design, desenvolvimento, animações, publicação e ajustes depois que o site vai ao ar.
          </p>
        </div>

        <div className="mt-16 flex flex-col gap-6 lg:motion-safe:hidden">
          {SERVICES.map((s, i) => (
            <article
              key={s.n}
              className="svc-card sticky"
              style={{ top: `calc(14vh + ${i * 22}px)` }}
            >
              <div
                className={
                  "svc-inner spot relative origin-top overflow-hidden rounded-[2rem] p-7 md:min-h-[440px] md:p-12 " +
                  (s.tone === "lime"
                    ? "spot-dark bg-lime text-ink"
                    : s.tone === "glass"
                      ? "border border-white/10 bg-[linear-gradient(135deg,#15191d,#0b0d10)] text-paper"
                      : "border border-white/10 bg-ink-2 text-paper")
                }
              >
                <div className="relative z-10 grid h-full gap-10 md:grid-cols-[auto_1fr_1fr]">
                  <span className={"font-display text-6xl font-extrabold md:text-8xl " + (s.tone === "lime" ? "text-ink" : "text-lime")}>
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-display text-3xl font-bold uppercase leading-none tracking-tight md:text-5xl">{s.title}</h3>
                    <p className={"mt-5 max-w-md text-lg " + (s.tone === "lime" ? "text-ink/75" : "text-paper/70")}>{s.text}</p>
                  </div>
                  <ul className="flex flex-col justify-end gap-2 self-end">
                    {s.items.map((it) => (
                      <li
                        key={it}
                        className={
                          "group/li flex cursor-default items-center justify-between border-b py-3 text-base transition-[padding] duration-500 hover:pl-3 " +
                          (s.tone === "lime" ? "border-ink/20" : "border-white/10 hover:text-lime")
                        }
                      >
                        {it}
                        <span aria-hidden className="transition-transform duration-500 group-hover/li:rotate-45">↗</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ServiceArt tone={s.tone} index={i} />
                <div className="svc-shade pointer-events-none absolute inset-0 z-20 bg-ink opacity-0" />
              </div>
            </article>
          ))}
        </div>
      </div>
      <ServiceOrbit />
    </section>
  );
}

/**
 * Desktop services: the section pins and the black hole moves in beside the copy. Each service
 * is a planet riding its orbit (drawn by the 3D scene); scrolling turns the orbit, the planet in
 * front is the service described on the left, and labels follow the planets on screen.
 */
function ServiceOrbit() {
  const stage = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        let shown = 0;
        const tween = gsap.fromTo(
          scrollStore.orbit,
          { p: 0 },
          {
            p: SERVICES.length - 1,
            ease: "none",
            scrollTrigger: {
              trigger: stage.current,
              start: "top top",
              end: () => `+=${(SERVICES.length - 1) * 85 + 40}%`,
              pin: true,
              scrub: 0.7,
              invalidateOnRefresh: true,
              onToggle: (self) => void (scrollStore.orbit.on = self.isActive ? 1 : 0),
            },
            onUpdate: () => {
              const i = Math.round(scrollStore.orbit.p);
              if (i !== shown) setActive((shown = i));
            },
          }
        );

        // Labels ride next to their planets every frame
        const tick = () => {
          scrollStore.fx.planets.forEach((pl, i) => {
            const el = labels.current[i];
            if (!el) return;
            el.style.transform = `translate3d(${pl.x + 26 + pl.active * 22}px, ${pl.y}px, 0) translateY(-50%)`;
            el.style.opacity = String(pl.o * (0.45 + pl.active * 0.55));
          });
        };
        gsap.ticker.add(tick);
        return () => {
          gsap.ticker.remove(tick);
          tween.scrollTrigger?.kill();
          tween.kill();
          scrollStore.orbit.on = 0;
        };
      });
      return () => mm.revert();
    },
    { scope: stage }
  );

  const s = SERVICES[active];
  return (
    <div ref={stage} className="relative hidden h-svh overflow-hidden lg:motion-safe:block">
      <div className="absolute left-10 top-1/2 w-[min(36vw,520px)] -translate-y-1/2">
        <div className="flex items-center gap-4">
          <span className="font-display text-5xl font-extrabold tabular-nums text-lime">{s.n}</span>
          <span className="label text-muted">/ 0{SERVICES.length}</span>
          <div className="ml-2 flex flex-1 gap-1.5">
            {SERVICES.map((x, i) => (
              <span
                key={x.n}
                className={"h-0.5 flex-1 rounded-full transition-colors duration-500 " + (i <= active ? "bg-lime" : "bg-white/15")}
              />
            ))}
          </div>
        </div>

        <div className="glass mt-6 grid rounded-[2rem] p-8">
          {SERVICES.map((x, i) => (
            <article
              key={x.n}
              aria-hidden={i !== active}
              className={
                "[grid-area:1/1] transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] " +
                (i === active ? "translate-y-0 opacity-100" : i < active ? "pointer-events-none -translate-y-6 opacity-0" : "pointer-events-none translate-y-6 opacity-0")
              }
            >
              <h3 className="font-display text-4xl font-bold uppercase leading-none tracking-tight xl:text-5xl">{x.title}</h3>
              <p className="mt-5 text-lg text-paper/70">{x.text}</p>
              <ul className="mt-6 grid grid-cols-2 gap-x-6">
                {x.items.map((it) => (
                  <li key={it} className="flex items-center gap-2 border-b border-white/10 py-3 text-paper/85">
                    <span className="size-1.5 rounded-full bg-lime" />
                    {it}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="label mt-6 text-muted">Role para girar a órbita ↓</p>
      </div>

      {/* Labels that follow the planets drawn by the 3D scene */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {SERVICES.map((x, i) => (
          <div
            key={x.n}
            ref={(el) => {
              labels.current[i] = el;
            }}
            className="absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap opacity-0 will-change-transform"
          >
            <span className="h-px w-6 bg-lime/60" />
            <span className={"label " + (i === active ? "text-lime" : "text-paper/70")}>
              {x.n} · {x.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SUMMARY = [
  {
    q: "O que fazemos",
    a: "Sites completos para empresas: página de apresentação, landing page para campanha ou vitrine de produtos. Design exclusivo, nada de modelo pronto.",
  },
  {
    q: "Para quem",
    a: "Negócios e profissionais que precisam ser encontrados no Google e passar confiança logo no primeiro clique, no celular ou no computador.",
  },
  {
    q: "Como funciona",
    a: "Você conta o que precisa, aprova um protótipo e recebe o site publicado, com domínio, WhatsApp e formulários funcionando.",
  },
];

export function Summary() {
  return (
    <section aria-labelledby="resumo" className="relative px-4 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2
          id="resumo"
          className="cine char-hover font-display text-[clamp(2.2rem,6vw,6rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em]"
        >
          Em <span className="text-lime">resumo:</span>
        </h2>
        <div className="glide mt-12 grid gap-5 [perspective:1200px] md:grid-cols-3">
          {SUMMARY.map((s, i) => (
            <article
              key={s.q}
              data-tilt="5"
              className={
                "sum-card spot group relative overflow-hidden rounded-3xl p-7 md:p-9 " +
                (i === 1 ? "spot-dark bg-lime text-ink" : "glass text-paper")
              }
            >
              <span className={"label " + (i === 1 ? "text-ink/60" : "text-lime")}>0{i + 1}</span>
              <h3 className="mt-6 font-display text-3xl font-bold uppercase leading-none tracking-tight md:text-4xl">
                {s.q}
              </h3>
              <p className={"mt-5 text-lg leading-relaxed " + (i === 1 ? "text-ink/80" : "text-paper/75")}>{s.a}</p>
              <span
                aria-hidden
                className={
                  "absolute -bottom-6 -right-2 font-display text-[9rem] font-extrabold leading-none opacity-10 transition-transform duration-700 group-hover:-translate-y-3 group-hover:rotate-[-8deg] " +
                  (i === 1 ? "text-ink" : "text-lime")
                }
              >
                {["?", "→", "✓"][i]}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceArt({ tone, index }: { tone: string; index: number }) {
  const color = tone === "lime" ? "rgba(7,8,10,0.18)" : "rgba(200,240,49,0.14)";
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -bottom-20 -right-16 size-[340px] opacity-80 md:size-[460px]"
      viewBox="0 0 200 200"
      fill="none"
    >
      {Array.from({ length: 9 }).map((_, k) => (
        <ellipse
          key={k}
          cx="100"
          cy="100"
          rx={90 - k * 9}
          ry={(90 - k * 9) * (0.35 + index * 0.12)}
          stroke={color}
          strokeWidth="0.8"
          transform={`rotate(${k * 20 + index * 15} 100 100)`}
        />
      ))}
    </svg>
  );
}
