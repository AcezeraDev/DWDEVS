"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SplitType from "split-type";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Logo, Magnetic, RollText, SectionLabel } from "@/components/ui-kit";
import { cinematicTo, prefersReducedMotion, scrollToTarget } from "@/lib/scroll-store";

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
      gsap.set(".hero-line .char", { yPercent: 115, rotate: 8 });
      gsap.set(".hero-fade", { opacity: 0, y: 24 });

      const play = () => {
        const tl = gsap.timeline();
        tl.to(".hero-line .char", {
          yPercent: 0,
          rotate: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.025,
          clearProps: "transform",
        }).to(".hero-fade", { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 }, "-=0.7");
      };
      window.addEventListener("dw:ready", play, { once: true });

      // Parallax out as the user scrolls away
      gsap.to(".hero-inner", {
        yPercent: -18,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });

      return () => {
        window.removeEventListener("dw:ready", play);
        split.revert();
      };
    },
    { scope: root }
  );

  return (
    <section id="top" ref={root} className="relative flex min-h-svh flex-col justify-end px-4 pb-10 pt-32 md:px-10">
      <div className="hero-inner mx-auto w-full max-w-[1400px]">
        <p className="hero-fade label mb-6 flex items-center gap-3 text-muted">
          <span className="inline-block size-2 animate-pulse rounded-full bg-lime" />
          Sites escritos linha a linha em Mauá, SP
        </p>

        <h1 className="char-hover font-display text-[clamp(2.2rem,10vw,10.5rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.04em]">
          <span className="block overflow-hidden pb-[0.04em]">
            <span className="hero-line block">Sites que</span>
          </span>
          <span className="block overflow-hidden pb-[0.04em]">
            <span className="hero-line block">ninguém</span>
          </span>
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="hero-line block text-lime">esquece.</span>
          </span>
        </h1>

        <div className="mt-10 grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-end">
          <p className="hero-fade max-w-xl text-lg leading-relaxed text-paper/75 md:text-xl">
            A <strong className="font-semibold text-paper">DWdevs</strong> cria o site da sua empresa do zero: design,
            programação e publicação. Você fala direto com os dois desenvolvedores, do primeiro contato até o site no ar.
          </p>
          <div className="hero-fade flex flex-wrap items-center gap-3 md:justify-end">
            <Magnetic>
              <button
                onClick={() => cinematicTo("#projetos", "Projetos")}
                className="group flex items-center gap-3 rounded-full bg-lime py-4 pl-7 pr-4 font-semibold text-ink"
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
                className="glass rounded-full px-7 py-4 font-medium text-paper transition-colors hover:border-lime/60 hover:text-lime"
              >
                <RollText>Pedir orçamento</RollText>
              </button>
            </Magnetic>
          </div>
        </div>

        <div className="hero-fade mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
          <ul className="flex flex-wrap gap-2">
            {["Sites institucionais", "Landing pages", "Sites 3D interativos"].map((t) => (
              <li key={t} className="label cursor-default rounded-full border border-white/10 px-3 py-1.5 text-paper/70 transition-colors hover:border-lime hover:bg-lime hover:text-ink">
                {t}
              </li>
            ))}
          </ul>
          <div className="label flex items-center gap-4 text-muted">
            <span className="hidden md:inline">Mova o mouse · clique na galáxia</span>
            <span className="flex h-9 w-5 justify-center rounded-full border border-white/25 pt-2">
              <span className="block h-1.5 w-1 rounded-full bg-lime [animation:scroll-dot_1.6s_ease-in-out_infinite]" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const BAND = ["Sites institucionais", "Landing pages", "Experiências 3D", "Web design", "UX", "Animações de scroll", "SEO", "Performance"];

export function Band() {
  return (
    <section aria-label="O que entregamos" className="relative z-10 -my-2 overflow-hidden py-16">
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
      if (prefersReducedMotion()) return;
      const cards = gsap.utils.toArray<HTMLElement>(".svc-card");
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card.querySelector(".svc-inner"), {
          scale: 0.9,
          ease: "none",
          scrollTrigger: { trigger: next, start: "top 90%", end: "top 20%", scrub: true },
        });
        gsap.to(card.querySelector(".svc-shade"), {
          opacity: 0.65,
          ease: "none",
          scrollTrigger: { trigger: next, start: "top 90%", end: "top 20%", scrub: true },
        });
      });
    },
    { scope: root }
  );

  return (
    <section id="servicos" ref={root} className="relative px-4 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1400px]">
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

        <div className="mt-16 flex flex-col gap-6">
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
    </section>
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
