"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { SiteControls } from "@/components/site-controls";
import { LINKEDIN, PROJECTS, type Project } from "@/lib/content";
import { burst, stage } from "@/lib/stage";
import { sfx } from "@/lib/sound";
import { flyToCase, landCase, markSkipIntro } from "@/lib/transition";

export function CaseView({ project, index, fontClass }: { project: Project; index: number; fontClass: string }) {
  const router = useRouter();
  const root = useRef<HTMLElement>(null);
  const stageEl = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const motion = useRef({ scroll: 0, enter: 1, live: 0 });
  const lenisRef = useRef<Lenis | null>(null);
  const paint = useRef<() => void>(() => {});
  const [alive, setAlive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(false);
  const [phone, setPhone] = useState(false);
  const next = PROJECTS[(index + 1) % PROJECTS.length];
  const t = project.theme;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = innerWidth < 900;
    const flew = !!document.querySelector("[data-fly]");
    stage.reduced = reduced;
    stage.bgPaused = true; // a página tem fundo próprio: o da home não precisa gastar GPU aqui
    scrollTo(0, 0);
    const raf0 = requestAnimationFrame(() => setPhone(small));
    const cleanups: (() => void)[] = [() => cancelAnimationFrame(raf0), () => (stage.bgPaused = false)];

    if (!reduced) {
      const lenis = new Lenis({ autoRaf: false, lerp: 0.09 });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      cleanups.push(() => {
        gsap.ticker.remove(raf);
        lenis.destroy();
        lenisRef.current = null;
      });
    }

    // O site é sempre uma tela inteira de verdade; só a transformação muda.
    // Assim ele nunca redimensiona por dentro e a animação fica leve.
    const m = motion.current;
    const render = () => {
      const f = frame.current;
      if (!f) return;
      const k = Math.max(m.scroll, 1 - m.enter, m.live);
      const e = k * k * (3 - 2 * k);
      const s0 = small ? 0.64 : 0.52;
      const x0 = small ? 0 : innerWidth * 0.2;
      const y0 = small ? innerHeight * 0.17 : innerHeight * 0.015;
      f.style.transform = `translate3d(${(x0 * (1 - e)).toFixed(1)}px,${(y0 * (1 - e)).toFixed(1)}px,0) scale(${(s0 + (1 - s0) * e).toFixed(4)}) rotateY(${((small ? 0 : -8) * (1 - e)).toFixed(2)}deg) rotateX(${((small ? 0 : 3.5) * (1 - e)).toFixed(2)}deg)`;
      f.style.setProperty("--chrome", String(1 - gsap.utils.clamp(0, 1, (e - 0.8) / 0.2)));
      f.style.borderRadius = `${(16 * (1 - e)).toFixed(1)}px`;
      if (copy.current) {
        const out = gsap.utils.clamp(0, 1, e * 2.4);
        copy.current.style.opacity = String(1 - out);
        copy.current.style.transform = `translate3d(${(-60 * out).toFixed(1)}px,0,0)`;
        copy.current.style.pointerEvents = out > 0.5 ? "none" : "";
      }
      if (root.current) root.current.dataset.full = String(e > 0.96);
    };
    paint.current = render;

    // Chegando pela transição, o site começa em tela cheia e recua para o lugar
    m.enter = flew && !reduced ? 0 : 1;
    m.scroll = 0;
    m.live = 0;
    render();
    landCase();
    if (flew && !reduced) gsap.to(m, { enter: 1, duration: 1.25, delay: 0.25, ease: "power3.inOut", onUpdate: render });

    let loadTimer = 0;
    if (!small) loadTimer = window.setTimeout(() => setAlive(true), flew ? 1300 : 500);
    cleanups.push(() => clearTimeout(loadTimer));

    const track = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      stage.sc = scrollY / innerHeight;
      stage.scroll01 = scrollY / max;
    };
    gsap.ticker.add(track);
    cleanups.push(() => gsap.ticker.remove(track));

    const ripple = (e: PointerEvent) => {
      if ((e.target as Element)?.closest?.("a,button")) return;
      burst((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    };
    addEventListener("pointerdown", ripple);
    cleanups.push(() => removeEventListener("pointerdown", ripple));

    const ctx = gsap.context(() => {
      if (!reduced) {
        ScrollTrigger.create({
          trigger: stageEl.current,
          start: "top top",
          end: () => `+=${innerHeight * 1.9}`,
          pin: true,
          onUpdate: (self) => {
            m.scroll = gsap.utils.clamp(0, 1, self.progress / 0.72);
            render();
          },
        });
        gsap.from(".case-ch", { yPercent: 70, opacity: 0, duration: 0.95, stagger: 0.022, ease: "back.out(1.6)", delay: flew ? 0.9 : 0.25 });
        gsap.from(".case-rise", { y: 26, opacity: 0, duration: 0.85, stagger: 0.07, ease: "power3.out", delay: flew ? 1.1 : 0.45 });
        gsap.utils.toArray<HTMLElement>("[data-shot]").forEach((el) => {
          gsap.fromTo(el, { clipPath: "inset(12% 7% 12% 7% round 18px)", opacity: 0.3 }, { clipPath: "inset(0% 0% 0% 0% round 12px)", opacity: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 95%", end: "top 50%", scrub: 0.6 } });
          const img = el.querySelector("img");
          if (img) gsap.fromTo(img, { scale: 1.12, yPercent: -4 }, { scale: 1, yPercent: 4, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
        });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, { y: 36, opacity: 0, duration: 0.85, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } });
        });
        gsap.from("[data-phone]", { y: 110, rotate: 6, opacity: 0, duration: 1.05, ease: "back.out(1.4)", scrollTrigger: { trigger: "[data-phone]", start: "top 88%" } });
      }
      // Longe da tela, o site ao vivo é descarregado para liberar a máquina
      if (!small) {
        ScrollTrigger.create({
          trigger: stageEl.current,
          start: "top top",
          end: () => `+=${innerHeight * 3.2}`,
          onLeave: () => {
            setAlive(false);
            setLoaded(false);
          },
          onEnterBack: () => setAlive(true),
        });
      }
    }, root);
    cleanups.push(() => ctx.revert());
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      cleanups.forEach((f) => f());
      ScrollTrigger.getAll().forEach((tr) => tr.kill());
    };
  }, []);

  const enterLive = useCallback(() => {
    sfx.whoosh();
    setAlive(true);
    setLive(true);
    lenisRef.current?.stop();
    document.documentElement.classList.add("site-live");
    gsap.to(motion.current, { live: 1, duration: 0.9, ease: "power3.inOut", onUpdate: () => paint.current() });
  }, []);

  const leaveLive = useCallback(() => {
    sfx.whoosh();
    setLive(false);
    lenisRef.current?.start();
    document.documentElement.classList.remove("site-live");
    gsap.to(motion.current, { live: 0, duration: 0.8, ease: "power3.inOut", onUpdate: () => paint.current() });
  }, []);

  useEffect(() => {
    if (!live) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && leaveLive();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [live, leaveLive]);

  useEffect(() => () => document.documentElement.classList.remove("site-live"), []);

  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    const img = e.currentTarget.querySelector("img");
    const r = img?.getBoundingClientRect();
    if (!r) return router.push(`/projetos/${next.slug}`);
    flyToCase(`/projects/${next.slug}/d1.jpg`, { left: r.left, top: r.top, width: r.width, height: r.height }, () => router.push(`/projetos/${next.slug}`));
  };

  const words = project.name.split(" ");
  const host = project.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const vars = {
    "--p-bg": t.bg,
    "--p-fg": t.fg,
    "--p-accent": t.accent,
    "--p-on": t.on,
    "--p-muted": t.muted,
    "--p-line": t.line,
    "--p-panel": t.panel,
    "--sig": t.accent,
  } as CSSProperties;

  return (
    <main ref={root} className={`case ${fontClass}`} style={vars} data-light={t.light ? "true" : "false"}>
      <header className="case-bar gutter">
        <Link
          href="/#projetos"
          className="case-back"
          onClick={() => {
            markSkipIntro();
            sfx.whoosh();
          }}
        >
          <span aria-hidden>←</span> <span className="hidden sm:inline">Todos os projetos</span>
          <span className="sm:hidden">Projetos</span>
        </Link>
        <Link href="/" className="case-brand" onClick={markSkipIntro} aria-label="DWdevs, voltar ao início">
          <em>DW</em>devs
        </Link>
        <SiteControls worlds={false} />
      </header>

      <section ref={stageEl} className="mirror">
        <div ref={copy} className="mirror-copy gutter">
          {project.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.logo} alt={`Logo ${project.name}`} className="case-rise mirror-logo" />
          )}
          <p className="case-rise case-tag">
            <b>{String(index + 1).padStart(2, "0")}</b> / {String(PROJECTS.length).padStart(2, "0")} · {project.kind}
          </p>
          <h1 className="case-title" aria-label={project.name} style={{ fontWeight: t.titleWeight, fontStyle: t.titleItalic ? "italic" : "normal", textTransform: t.titleUpper ? "uppercase" : "none" }}>
            {words.map((word, w) => (
              <span key={w} className="case-word" aria-hidden>
                {[...word].map((c, i) => (
                  <span key={i} className="case-ch">
                    {c}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p className="case-rise mirror-text">{project.text}</p>
          <div className="case-rise mirror-actions">
            <button type="button" className="case-cta" onClick={enterLive} onPointerEnter={() => sfx.hover()}>
              Entrar no site ao vivo <span aria-hidden>→</span>
            </button>
            <a href={project.url} target="_blank" rel="noreferrer" className="case-ghost">
              Abrir em nova aba ↗
            </a>
          </div>
        </div>

        <div className="mirror-scene">
          <div ref={frame} className="mirror-frame">
            <div className="mirror-chrome" aria-hidden>
              <i />
              <i />
              <i />
              <span>{host}</span>
              <b className={loaded ? "on" : ""}>{loaded ? "ao vivo" : "carregando"}</b>
            </div>
            <div className="mirror-view">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/projects/${project.slug}/${phone ? "m1" : "d1"}.jpg`} alt={`Página inicial do site ${project.name}`} className={`mirror-poster ${loaded ? "gone" : ""}`} />
              {alive && <iframe src={project.url} title={`Site ${project.name} ao vivo`} allow="fullscreen; autoplay" tabIndex={live ? 0 : -1} className={live ? "on" : ""} onLoad={() => setLoaded(true)} />}
            </div>
          </div>
        </div>

        <button type="button" className="mirror-enter" onClick={enterLive} onPointerEnter={() => sfx.hover()}>
          <i aria-hidden /> Navegar neste site <span aria-hidden>→</span>
        </button>
      </section>

      {live && (
        <div className="live-bar" role="group" aria-label="Navegando no site ao vivo">
          <button type="button" onClick={leaveLive} autoFocus>
            <span aria-hidden>←</span> Sair
          </button>
          <span className="live-host">
            <i aria-hidden /> {host}
          </span>
          <a href={project.url} target="_blank" rel="noreferrer" aria-label="Abrir em nova aba">
            ↗
          </a>
        </div>
      )}

      <section className="gutter case-info">
        <div>
          <p data-reveal className="case-tag">O projeto</p>
          <p data-reveal className="case-lead" style={{ fontWeight: t.leadWeight }}>
            {project.text}
          </p>
        </div>
        <dl className="case-meta">
          <div data-reveal>
            <dt>Segmento</dt>
            <dd>{project.kind}</dd>
          </div>
          {project.facts?.map((f) => (
            <div key={f.label} data-reveal>
              <dt>{f.label}</dt>
              <dd className="case-fact" style={{ fontWeight: t.titleWeight }}>{f.value}</dd>
            </div>
          ))}
          <div data-reveal>
            <dt>Destaques</dt>
            <dd className="case-tags">
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </dd>
          </div>
        </dl>
        {(project.challenge || project.result) && (
          <div className="case-story">
            {project.challenge && (
              <div data-reveal>
                <p className="case-tag">O desafio</p>
                <p>{project.challenge}</p>
              </div>
            )}
            {project.result && (
              <div data-reveal>
                <p className="case-tag">O resultado</p>
                <p>{project.result}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="gutter case-gallery" aria-label={`Telas do site ${project.name}`}>
        <figure data-shot className="case-shot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/projects/${project.slug}/d2.jpg`} alt={`Seção do site ${project.name} durante a rolagem`} loading="lazy" />
        </figure>
        <div className="case-pair">
          <figure data-shot className="case-shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/projects/${project.slug}/d3.jpg`} alt={`Outra seção do site ${project.name}`} loading="lazy" />
          </figure>
          <figure data-phone className="case-phone">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/projects/${project.slug}/m1.jpg`} alt={`Site ${project.name} no celular`} loading="lazy" />
          </figure>
        </div>
        <figure data-shot className="case-shot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/projects/${project.slug}/d4.jpg`} alt={`Parte final do site ${project.name}`} loading="lazy" />
        </figure>
      </section>

      <section className="gutter case-end">
        <a href={`/projetos/${next.slug}`} className="case-next" onClick={goNext} onPointerEnter={() => sfx.hover()}>
          <span className="case-tag">Próximo projeto</span>
          <span className="case-next-name">
            {next.name} <em aria-hidden>→</em>
          </span>
          <span className="case-next-img" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/projects/${next.slug}/d1.jpg`} alt="" loading="lazy" />
          </span>
        </a>
        <footer className="case-foot">
          <span>Projeto da DWdevs · Davi Carvalho e William Cristian</span>
          <a href={LINKEDIN} target="_blank" rel="noreferrer">
            Quero um site assim ↗
          </a>
        </footer>
      </section>
    </main>
  );
}
