"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Logo, Magnetic, RollText, SectionLabel } from "@/components/ui-kit";
import { prefersReducedMotion, scrollToTarget } from "@/lib/scroll-store";
import { LINKEDIN } from "./intro-sections";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TechSphere = dynamic(() => import("@/components/three/tech-sphere"), {
  ssr: false,
  loading: () => <div className="h-[420px] md:h-[560px]" />,
});

const STACK = [
  { group: "Front-end", items: ["Next.js", "React", "TypeScript", "Tailwind CSS", "shadcn/ui"] },
  { group: "Motion & 3D", items: ["Three.js", "React Three Fiber", "GSAP + ScrollTrigger", "Motion", "Lenis", "GLSL"] },
  { group: "Back-end & dados", items: ["Node.js", "Supabase", "APIs e integrações"] },
  { group: "Design & entrega", items: ["Figma", "Vercel", "Git", "SEO técnico"] },
];

export function Stack() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".stack-row", {
        x: 60,
        opacity: 0,
        duration: 1,
        ease: "expo.out",
        stagger: 0.1,
        scrollTrigger: { trigger: ".stack-list", start: "top 80%" },
      });
    },
    { scope: root }
  );

  return (
    <section id="stack" ref={root} className="relative px-4 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel index="03">Nossa caixa de ferramentas</SectionLabel>
        <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="min-w-0">
            <h2 className="cine char-hover font-display text-[clamp(1.75rem,3.6vw,4.4rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em]">
              Ferramentas <br />
              <span className="text-lime">de ponta.</span>
            </h2>
            <div className="glass relative mt-8 overflow-hidden rounded-[2rem]">
              <TechSphere />
              <p className="label pointer-events-none absolute bottom-5 left-6 text-muted">Arraste para girar ↻</p>
            </div>
          </div>
          <div className="stack-list flex flex-col">
            {STACK.map((s, i) => (
              <div key={s.group} className="stack-row spot group relative overflow-hidden border-t border-white/10 px-2 py-7 last:border-b">
                <span className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-lime/[0.09] to-transparent transition-transform duration-700 ease-[cubic-bezier(.7,0,.2,1)] group-hover:scale-x-100" />
                <div className="relative flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-2xl font-bold uppercase tracking-tight transition-all duration-500 group-hover:translate-x-3 group-hover:text-lime md:text-3xl">
                    {s.group}
                  </h3>
                  <span className="label text-muted">0{i + 1}</span>
                </div>
                <ul className="relative mt-4 flex flex-wrap gap-2">
                  {s.items.map((it) => (
                    <li
                      key={it}
                      className="cursor-default rounded-full border border-white/10 px-3.5 py-1.5 text-sm text-paper/75 transition-all duration-300 hover:-translate-y-0.5 hover:border-lime hover:bg-lime hover:text-ink"
                    >
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const PROJECTS = [
  {
    name: "AlquiVerde",
    kind: "E-commerce · Kits de presente",
    url: "https://kitpresentealquiverde.com.br/",
    host: "kitpresentealquiverde.com.br",
    img: "/projects/alquiverde.jpg",
    text: "Vitrine de Natal para cosméticos naturais, com seletor de kits que gira ao arrastar, montagem de kit personalizado e clima editorial.",
    tags: ["E-commerce", "Interação", "Direção de arte"],
    accent: "#8b2d3a",
  },
  {
    name: "Ourocar Veículos",
    kind: "Concessionária · Ubá, MG",
    url: "https://ourocarsite.vercel.app/",
    host: "ourocarsite.vercel.app",
    img: "/projects/ourocar.jpg",
    text: "Site para revenda de veículos com carro 3D dourado no destaque, showroom e atendimento direto pelo WhatsApp.",
    tags: ["3D", "Automotivo", "Conversão"],
    accent: "#f2c230",
  },
  {
    name: "China Glass",
    kind: "Indústria · B2B",
    url: "https://site-beta-eight-21.vercel.app/",
    host: "chinaglass",
    img: "/projects/chinaglass.jpg",
    text: "Catálogo de máquinas para a indústria do vidro, com diamante 3D, cristais flutuantes e versão em mais de um idioma.",
    tags: ["WebGL", "Catálogo", "Multi-idioma"],
    accent: "#4aa8ff",
  },
  {
    name: "Calhas Afonsina",
    kind: "Serviços · Grande ABCD",
    url: "https://calhas-afonsina.vercel.app/",
    host: "calhas-afonsina.vercel.app",
    img: "/projects/calhas.jpg",
    text: "Site institucional para funilaria com 21 anos de história: tipografia forte, processo chapa → dobra → calha e orçamento pelo WhatsApp.",
    tags: ["Institucional", "Motion", "SEO local"],
    accent: "#e5432b",
  },
];

function ProjectCard({ p, i }: { p: (typeof PROJECTS)[number]; i: number }) {
  const card = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = card.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const frame = el.querySelector<HTMLElement>(".pj-frame")!;
    const glare = el.querySelector<HTMLElement>(".pj-glare")!;
    const rx = gsap.quickTo(frame, "rotationX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(frame, "rotationY", { duration: 0.6, ease: "power3.out" });
    const move = (e: MouseEvent) => {
      const r = frame.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 12);
      rx(-py * 10);
      glare.style.background = `radial-gradient(circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, rgba(255,255,255,0.22), transparent 55%)`;
    };
    const leave = () => {
      rx(0);
      ry(0);
      glare.style.background = "transparent";
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <a
      ref={card}
      href={p.url}
      target="_blank"
      rel="noreferrer"
      data-cursor="view"
      className="pj-card group block w-full [perspective:1400px]"
    >
      <div className="pj-frame relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-ink-2 [transform-style:preserve-3d]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="label ml-3 truncate rounded-full bg-white/5 px-3 py-1 normal-case tracking-normal text-muted">
            {p.host}
          </span>
        </div>
        <div className="pj-media relative aspect-[16/10] overflow-hidden">
          <Image
            src={p.img}
            alt={`Página inicial do site ${p.name}`}
            fill
            loading="eager"
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="pj-img object-cover object-top"
          />
          <div
            className="absolute inset-0 opacity-0 mix-blend-color transition-opacity duration-700 group-hover:opacity-25"
            style={{ background: p.accent }}
          />
        </div>
        <div className="pj-glare pointer-events-none absolute inset-0" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-start">
        <span className="font-display text-5xl font-extrabold text-lime transition-transform duration-700 group-hover:-rotate-6 group-hover:scale-110">0{i + 1}</span>
        <div>
          <p className="label text-muted">{p.kind}</p>
          <h3 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight transition-colors duration-500 group-hover:text-lime md:text-4xl">{p.name}</h3>
          <p className="mt-3 max-w-xl text-paper/70 lg:line-clamp-2">{p.text}</p>
        </div>
        <ul className="flex flex-wrap gap-2 md:max-w-[220px] md:justify-end">
          {p.tags.map((t) => (
            <li key={t} className="label rounded-full border border-white/10 px-3 py-1.5 text-paper/70">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </a>
  );
}

/**
 * Desktop scroll journey: the section pins and each site flies in from deep in the
 * scene, settles facing the viewer, then rushes past the camera as the next arrives.
 * A giant name slides behind it and the ambient glow takes the client's brand color.
 */
function ProjectTunnel() {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".tn-card");
        const names = gsap.utils.toArray<HTMLElement>(".tn-name");
        const infos = gsap.utils.toArray<HTMLElement>(".tn-info");
        const imgs = gsap.utils.toArray<HTMLElement>(".tn-img");
        const glow = root.current!.querySelector(".tn-glow");
        const n = cards.length;

        gsap.set(cards, {
          xPercent: -50,
          yPercent: -50,
          z: -2600,
          rotationX: 26,
          rotationY: (i: number) => (i % 2 ? -24 : 24),
          rotationZ: (i: number) => (i % 2 ? 4 : -4),
          autoAlpha: 0,
        });
        gsap.set(names, { xPercent: 35, autoAlpha: 0 });
        gsap.set(infos, { y: 50, autoAlpha: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${n * 115}%`,
            pin: true,
            scrub: 1.1,
            invalidateOnRefresh: true,
            onUpdate: (self) => gsap.set(".tn-progress", { scaleX: self.progress }),
          },
          // Card i owns the timeline from t = i to i + 1, so the counter follows the playhead.
          onUpdate: () => {
            const idx = gsap.utils.clamp(0, n - 1, Math.floor(tl.time() + 0.05));
            if (counter.current) counter.current.textContent = String(idx + 1).padStart(2, "0");
          },
        });

        cards.forEach((card, i) => {
          const t = i;
          const accent = card.dataset.accent ?? "#c8f031";
          // Arrive from the depth, unwinding the tilt
          tl.to(card, { z: 0, rotationX: 0, rotationY: 0, rotationZ: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out" }, t)
            .to(glow, { "--accent": accent, duration: 0.6 }, t)
            .to(names[i], { xPercent: 0, autoAlpha: 1, duration: 0.6, ease: "power2.out" }, t)
            .to(infos[i], { y: 0, autoAlpha: 1, duration: 0.3, ease: "power2.out" }, t + 0.35)
            .fromTo(imgs[i], { yPercent: 0, scale: 1.12 }, { yPercent: -6, scale: 1, duration: 1.2 }, t)
            .addLabel(`p${i}`, t + 0.65);

          if (i < n - 1) {
            // Rush past the camera while the next one is already on its way
            tl.to(infos[i], { y: -40, autoAlpha: 0, duration: 0.25, ease: "power2.in" }, t + 0.9)
              .to(names[i], { xPercent: -35, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, t + 0.9)
              .to(card, { z: 1300, rotationX: -14, autoAlpha: 0, duration: 0.6, ease: "power3.in" }, t + 0.95);
          }
        });
        tl.to({}, { duration: 0.35 });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="relative hidden h-svh overflow-hidden lg:block">
      <div
        className="tn-glow pointer-events-none absolute inset-0"
        style={
          {
            "--accent": "#c8f031",
            background:
              "radial-gradient(60% 55% at 55% 50%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 70%)",
          } as React.CSSProperties
        }
      />

      {/* Giant sliding names */}
      <div className="pointer-events-none absolute inset-0 flex items-center">
        {PROJECTS.map((p) => (
          <span
            key={p.name}
            className="tn-name absolute left-0 w-full whitespace-nowrap text-center font-display text-[13vw] font-extrabold uppercase leading-none tracking-[-0.04em] text-transparent [-webkit-text-stroke:1.5px_rgba(241,240,232,0.14)]"
          >
            {p.name}
          </span>
        ))}
      </div>

      {/* 3D stage */}
      <div className="absolute inset-0 [perspective:1400px] [transform-style:preserve-3d]">
        {PROJECTS.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noreferrer"
            data-cursor="view"
            data-accent={p.accent}
            className="tn-card group absolute left-[56%] top-1/2 block w-[min(60vw,calc((100svh-220px)*1.6),1100px)] will-change-transform"
          >
            <div
              data-tilt="4"
              className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-ink-2 shadow-[0_60px_160px_-40px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="size-2.5 rounded-full bg-white/20" />
                <span className="size-2.5 rounded-full bg-white/20" />
                <span className="size-2.5 rounded-full bg-white/20" />
                <span className="label ml-3 truncate rounded-full bg-white/5 px-3 py-1 normal-case tracking-normal text-muted">
                  {p.host}
                </span>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={p.img}
                  alt={`Página inicial do site ${p.name}`}
                  fill
                  loading="eager"
                  sizes="60vw"
                  className="tn-img object-cover object-top"
                />
                <div
                  className="absolute inset-0 opacity-0 mix-blend-color transition-opacity duration-700 group-hover:opacity-25"
                  style={{ background: p.accent }}
                />
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Info panel */}
      <div className="pointer-events-none absolute bottom-10 left-10 w-[min(30vw,420px)]">
        {PROJECTS.map((p, i) => (
          <div key={p.name} className="tn-info glass absolute bottom-0 left-0 w-full rounded-3xl p-7">
            <div className="flex items-baseline gap-4">
              <span className="font-display text-5xl font-extrabold text-lime">0{i + 1}</span>
              <p className="label text-muted">{p.kind}</p>
            </div>
            <h3 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">{p.name}</h3>
            <p className="mt-3 text-paper/70">{p.text}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <li key={t} className="label rounded-full border border-white/10 px-3 py-1.5 text-paper/70">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className="label pointer-events-none absolute right-10 top-28 flex items-baseline gap-2 text-muted">
        <span ref={counter} className="font-display text-5xl font-extrabold text-paper">
          01
        </span>
        / 0{PROJECTS.length}
      </div>
      <div className="absolute bottom-6 left-10 right-10 h-px bg-white/10">
        <div className="tn-progress h-px origin-left scale-x-0 bg-lime" />
      </div>
    </div>
  );
}

export function Projects() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(max-width: 1023px)", () => {
        gsap.utils.toArray<HTMLElement>(".pj-card").forEach((c) => {
          gsap.from(c, { y: 60, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 85%" } });
          gsap.fromTo(
            c.querySelector(".pj-media"),
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: c, start: "top 85%" } }
          );
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section id="projetos" ref={root} className="relative pt-28 lg:pt-36">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-6 px-4 md:px-10">
        <div>
          <SectionLabel index="04">Trabalho real, cliente real</SectionLabel>
          <h2 className="cine char-hover mt-6 font-display text-[clamp(2.2rem,7vw,7rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em]">
            Já estão <span className="text-outline">no ar.</span>
          </h2>
        </div>
        <p className="max-w-sm text-paper/65">
          Alguns dos sites que criamos. Cada um pensado para o negócio do cliente, nenhum a partir de template. Role para
          passar por eles.
        </p>
      </div>

      <ProjectTunnel />

      <div className="flex flex-col gap-20 px-4 py-20 md:px-10 lg:hidden">
        {PROJECTS.map((p, i) => (
          <ProjectCard key={p.name} p={p} i={i} />
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { t: "Conversa", d: "Entendemos o seu negócio, o público e o que o site precisa resolver." },
  { t: "Design", d: "Direção visual, estrutura das páginas e protótipo para você aprovar antes do código." },
  { t: "Desenvolvimento", d: "Código sob medida, animações, 3D quando faz sentido, e tudo rápido no celular." },
  { t: "Lançamento", d: "Publicação, SEO, domínio e acompanhamento depois que o site vai ao ar." },
];

export function Process() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ".proc-line",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: ".proc-list", start: "top 70%", end: "bottom 60%", scrub: true },
        }
      );
      gsap.utils.toArray<HTMLElement>(".proc-step").forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 65%",
          end: "bottom 65%",
          toggleClass: { targets: el, className: "is-active" },
        });
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="relative px-4 py-28 md:px-10 md:py-36">
      <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionLabel index="05">Do papo ao deploy</SectionLabel>
          <h2 className="cine char-hover mt-6 font-display text-[clamp(2.2rem,6vw,6rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em]">
            Simples, <br />
            <span className="text-lime">direto.</span>
          </h2>
          <p className="mt-6 max-w-sm text-paper/65">
            Você fala sempre com quem está fazendo o seu site. Sem repasse, sem telefone sem fim.
          </p>
        </div>
        <ol className="proc-list relative">
          <span className="absolute left-[27px] top-2 h-[calc(100%-1rem)] w-px bg-white/10" />
          <span className="proc-line absolute left-[27px] top-2 h-[calc(100%-1rem)] w-px origin-top bg-lime" />
          {STEPS.map((s, i) => (
            <li key={s.t} className="proc-step group relative flex gap-8 pb-16 last:pb-0">
              <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-full border border-white/15 bg-ink font-display text-lg font-bold text-paper/60 transition-all duration-500 group-hover:scale-110 group-hover:border-lime group-[.is-active]:border-lime group-[.is-active]:bg-lime group-[.is-active]:text-ink">
                0{i + 1}
              </span>
              <div className="pt-2 opacity-40 transition-all duration-500 group-hover:translate-x-2 group-hover:opacity-100 group-[.is-active]:opacity-100">
                <h3 className="font-display text-3xl font-bold uppercase tracking-tight transition-colors duration-500 group-hover:text-lime md:text-5xl">{s.t}</h3>
                <p className="mt-3 max-w-md text-lg text-paper/70">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section id="contato" className="relative flex min-h-svh flex-col justify-center px-4 py-28 md:px-10">
      <div className="mx-auto w-full max-w-[1400px] text-center">
        <SectionLabel index="06">Agora é com você</SectionLabel>
        <h2 className="cine char-hover mx-auto mt-10 max-w-6xl font-display text-[clamp(2.4rem,9vw,10rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.04em]">
          Vamos criar o seu site?
        </h2>
        <p className="mx-auto mt-8 max-w-lg text-lg text-paper/70">
          Conte o que você precisa. Respondemos com uma proposta feita para o seu projeto.
        </p>
        <div className="mt-14 flex flex-col items-center justify-center gap-5 sm:flex-row">
          <Magnetic strength={0.45}>
            <a
              href={LINKEDIN}
              target="_blank"
              rel="noreferrer"
              className="group relative grid size-44 place-items-center overflow-hidden rounded-full bg-lime text-center font-display text-lg font-bold uppercase leading-tight text-ink md:size-56 md:text-xl"
            >
              <span className="relative z-10">
                Solicitar <br /> proposta ↗
              </span>
              <span className="absolute inset-0 origin-bottom scale-y-0 bg-paper transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-y-100" />
            </a>
          </Magnetic>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noreferrer"
            className="glass rounded-full px-6 py-3 text-paper/80 transition-colors hover:text-lime"
          >
            <RollText>LinkedIn · /in/dwdevs</RollText>
          </a>
          <span className="glass rounded-full px-6 py-3 text-paper/60">Mauá · São Paulo · Brasil</span>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 px-4 pb-8 pt-16 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <p className="cine char-hover skew font-display text-[clamp(2.8rem,14vw,15rem)] font-extrabold leading-[0.8] tracking-[-0.05em]">
            <span className="text-lime">DW</span>devs
          </p>
          <button
            onClick={() => scrollToTarget(0)}
            className="label glass rounded-full px-5 py-3 text-paper/80 hover:text-lime"
          >
            <RollText>Voltar ao topo ↑</RollText>
          </button>
        </div>
        <div className="label mt-10 flex flex-wrap justify-between gap-4 text-muted">
          <Logo className="text-base" />
          <span>© 2026 DWdevs · Estúdio de criação de sites</span>
          <span>Feito à mão com Next.js + Three.js</span>
        </div>
      </div>
    </footer>
  );
}
