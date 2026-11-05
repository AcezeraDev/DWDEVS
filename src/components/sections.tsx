import { Badge, BlockBand, Ghost, Mosaic, Plus } from "@/components/decor";
import { OrbitSlot } from "@/components/orbit-slot";
import { Terminal } from "@/components/terminal";
import { Marquee } from "@/components/ui/marquee";
import { ABOUT, BAND, FOUNDERS, LINKEDIN, NAV, PROJECTS, SERVICES, STATS, STEPS, SUMMARY } from "@/lib/content";
import { cn } from "@/lib/utils";

function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p data-build="label" className="tag over flex items-center gap-3 text-muted">
      <span className="grid size-6 place-items-center border border-sig/60 text-sig">{n}</span>
      {children}
      <span className="h-px w-14 bg-gradient-to-r from-sig/70 to-transparent" aria-hidden />
    </p>
  );
}

function Cta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <a
      href={LINKEDIN}
      target="_blank"
      rel="noreferrer"
      data-magnetic
      className={cn("corners inline-flex min-h-12 items-center gap-3 bg-sig px-6 font-mono text-[13px] font-medium uppercase tracking-wide text-ink transition-colors hover:bg-paper", className)}
    >
      {children}
      <span aria-hidden>↗</span>
    </a>
  );
}

function Nav() {
  return (
    <header className="gutter fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/[.07] bg-ink/90">
      <a href="#inicio" data-build="logo" className="display text-[28px] leading-none">
        <em>DW</em>devs
      </a>
      <nav aria-label="Principal" data-build="nav" className="tag hidden items-center gap-7 md:flex">
        {NAV.map((n, i) => (
          <a key={n.href} href={n.href} className="group py-2 text-paper/75 transition-colors hover:text-sig">
            <span className="mr-1.5 text-[9px] text-sig/70 transition-colors group-hover:text-sig">0{i + 1}</span>
            {n.label}
          </a>
        ))}
      </nav>
      <a href="#contato" data-build="cta" className="tag corners border border-line px-3 py-2.5 transition-colors hover:border-sig hover:text-sig">
        Solicitar proposta
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section id="inicio" className="relative flex min-h-svh flex-col overflow-x-clip pb-20 pt-20 md:pt-24">
      <div className="gutter flex items-center justify-between gap-6">
        <p data-build="eyebrow" className="tag over flex items-center gap-2 text-paper/80">
          <span className="size-1.5 animate-pulse rounded-full bg-sig" aria-hidden />
          Estúdio de sites · Mauá, SP
        </p>
        <p data-build="coords" className="tag over hidden text-muted md:block">23°40′S 46°27′O · build em tempo real</p>
      </div>
      <h1 className="gutter mt-3">
        <span data-build="h1 frase" className="display over block w-fit text-[clamp(1.2rem,2.3vw,2.4rem)] leading-tight tracking-[-0.015em] text-paper">
          Criamos sites rápidos, bonitos e feitos <em>sob medida</em>
        </span>
        <span data-build="h1 marca" data-hero-word data-vf className="display over mt-1 block whitespace-nowrap text-[31vw] leading-[0.86] text-paper md:text-[19.5vw]">
          <em>DW</em>devs
        </span>
      </h1>

      <div className="gutter over mt-auto grid grid-cols-12 items-end gap-x-6 gap-y-5 pt-[38vh] md:pt-6">
        <div className="col-span-12 md:col-span-4 lg:col-span-3">
          <div data-build="card" className="glass corners p-5">
            <p className="text-pretty text-base leading-relaxed text-paper md:text-[17px]">
              Sites institucionais, landing pages e experiências 3D interativas. Dois desenvolvedores, código feito para o seu negócio.
            </p>
            <div className="mt-5 w-fit">
              <Cta>Solicitar proposta</Cta>
            </div>
          </div>
          <p data-build="dica" className="tag mt-3 hidden text-sig md:block">✦ Arraste os objetos · Clique no fundo</p>
        </div>
        <div data-stack-slot className="pointer-events-none absolute bottom-[1vh] left-[52%] hidden h-[50vh] w-[38vw] -translate-x-1/2 md:block" aria-hidden />
        <div className="col-span-12 md:col-span-3 md:col-start-10">
          <dl className="grid grid-cols-4 gap-2 md:grid-cols-2">
            {STATS.map((s, i) => (
              <div key={s.label} data-build="stat" className="glass beam p-2.5 md:p-3.5" style={{ "--d": `${-i * 1.2}s` } as React.CSSProperties}>
                <dd className="display text-[clamp(1.5rem,2.5vw,2.5rem)] leading-none text-paper">{s.v}</dd>
                <dt className="mt-1 font-mono text-[9px] uppercase leading-snug tracking-wider text-muted md:text-[10px]">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Band() {
  return (
    <div className="over overflow-hidden border-y border-white/10 bg-ink/80 py-4">
      <Marquee className="[--duration:48s] [--gap:2.5rem]" repeat={3}>
        {BAND.map((b) => (
          <span key={b} className="flex items-center gap-10 whitespace-nowrap font-[family-name:var(--font-big)] text-2xl italic text-paper/85">
            {b}
            <span className="text-base text-sig" aria-hidden>✳</span>
          </span>
        ))}
      </Marquee>
    </div>
  );
}

const box = (l: string, t: string, w: string, h: string, d: number, fill = false) => (
  <i key={`${l}${t}`} className={cn("mini-b", fill && "fill")} style={{ left: l, top: t, width: w, height: h, "--d": `${d}s` } as React.CSSProperties} />
);

function MiniBuild() {
  return (
    <div className="mini" aria-hidden>
      {box("8%", "13%", "84%", "12%", 0)}
      {box("8%", "32%", "50%", "38%", 0.25)}
      {box("62%", "32%", "30%", "38%", 0.5)}
      {box("8%", "76%", "22%", "12%", 0.75, true)}
      {box("34%", "76%", "22%", "12%", 0.95)}
    </div>
  );
}

function MiniSearch() {
  return (
    <div className="mini flex flex-col justify-center gap-2.5 px-6" aria-hidden>
      <div className="mini-q">
        <span>sites sob medida</span>
      </div>
      <div className="mini-r top w-4/5" />
      <div className="mini-r w-3/5" />
      <div className="mini-r w-2/3" />
    </div>
  );
}

function MiniSteps() {
  return (
    <div className="mini flex items-center justify-between px-[10%]" aria-hidden>
      <span className="mini-track" />
      {["01", "02", "03"].map((s, i) => (
        <span key={s} className="mini-step" style={{ "--d": `${i * 1.6}s` } as React.CSSProperties}>
          {s}
        </span>
      ))}
    </div>
  );
}

const MINIS = [MiniBuild, MiniSearch, MiniSteps];

function About() {
  return (
    <section id="sobre" className="gutter relative py-28 md:py-44">
      <Ghost n="01" style={{ right: "2%", top: "3%" }} />
      <Plus style={{ left: "46%", top: "10%" }} />
      <Eyebrow n="01">Sobre</Eyebrow>
      <h2 data-build="h2" className="display over mt-6 text-[clamp(3.6rem,10.5vw,10.5rem)]">
        Dois devs.
        <br />
        <em>Zero</em> templates.
      </h2>
      <div className="over mt-12 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-6 lg:col-span-5">
          <p data-build="p" className="text-pretty text-xl leading-snug md:text-2xl">{ABOUT}</p>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {FOUNDERS.map((f) => (
              <li key={f.name} data-build="founder" data-tilt className="glass corners flex items-center gap-3 p-3">
                <span className="display grid size-12 shrink-0 place-items-center text-2xl italic text-ink" style={{ background: f.color }} aria-hidden>
                  {f.initial}
                </span>
                <span>
                  <span className="block font-medium leading-tight">{f.name}</span>
                  <span className="tag text-muted">{f.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <dl className="over mt-20 grid gap-3 md:grid-cols-3">
        {SUMMARY.map((s, i) => {
          const Mini = MINIS[i];
          return (
            <div key={s.q} data-build="card" data-tilt className="glass beam corners overflow-hidden pb-6" style={{ "--d": `${-i * 1.7}s` } as React.CSSProperties}>
              <Mini />
              <dt className="tag px-6 text-sig">{s.q}</dt>
              <dd className="mt-3 text-pretty px-6 leading-relaxed text-paper/85">{s.a}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function Services() {
  return (
    <section id="servicos" className="relative py-24 md:py-36">
      <Ghost n="02" style={{ right: "2%", top: "1%" }} />
      <div className="gutter">
        <Eyebrow n="02">Serviços</Eyebrow>
        <h2 data-build="h2" className="display over mt-6 text-[clamp(3rem,8vw,8rem)]">
          O que a gente <em>constrói</em>
        </h2>
        <p data-build="dica" className="tag over mt-5 hidden text-sig md:block">✦ Passe o mouse: as partículas viram cada serviço</p>
      </div>
      <ul className="over mt-14 border-t border-white/10 lg:w-[64%]">
        {SERVICES.map((s, i) => (
          <li key={s.n} data-build="service" data-svc={i + 1} className="svc gutter grid grid-cols-12 gap-x-5 gap-y-3 border-b border-white/10 py-7 md:py-9">
            <span className="svc-n tag svc-soft col-span-12 grid size-9 place-items-center border border-line md:col-span-1">{s.n}</span>
            <div className="col-span-12 md:col-span-11">
              <h3 className="display text-[clamp(2.2rem,4.2vw,4.2rem)]">{s.title}</h3>
              <p className="mt-3 max-w-xl text-pretty leading-relaxed">{s.text}</p>
              <ul className="tag svc-soft mt-4 flex flex-wrap gap-x-4 gap-y-1 text-muted">
                {s.items.map((it) => (
                  <li key={it}>+ {it}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stack() {
  return (
    <section id="stack" className="gutter relative py-24 md:py-36">
      <Ghost n="03" style={{ left: "1%", bottom: "4%" }} />
      <div className="grid grid-cols-12 items-start gap-6">
        <div className="col-span-12 lg:col-span-5">
          <Eyebrow n="03">Stack</Eyebrow>
          <h2 data-build="h2" className="display over mt-6 text-[clamp(3rem,7vw,7rem)]">
            O que roda <em>por baixo</em>
          </h2>
          <p data-build="p" className="over mt-6 max-w-sm text-pretty text-lg leading-relaxed text-paper/85">
            Este terminal funciona de verdade. Digite um comando ou toque em um botão e veja o site reagir.
          </p>
          <Mosaic n={10} rows={3} seed={7} className="over mt-8 hidden w-56 lg:grid" />
        </div>
        <div data-build="terminal" className="over corners col-span-12 lg:col-span-7">
          <Terminal />
        </div>
      </div>
    </section>
  );
}

function Ribbons() {
  const a = ["Código sob medida", "Zero templates", "Rápido no celular", "Feito para o seu negócio"];
  return (
    <div className="relative overflow-x-clip py-10" aria-hidden>
      <div className="ribbon ribbon-a">
        <Marquee className="[--duration:30s] [--gap:2rem]" repeat={4}>
          {a.map((t) => (
            <span key={t} className="whitespace-nowrap font-mono text-sm font-medium uppercase tracking-wider">{t} ✳</span>
          ))}
        </Marquee>
      </div>
      <div className="ribbon ribbon-b">
        <Marquee reverse className="[--duration:38s] [--gap:2rem]" repeat={4}>
          {BAND.map((t) => (
            <span key={t} className="whitespace-nowrap font-mono text-sm uppercase tracking-wider">{t} +</span>
          ))}
        </Marquee>
      </div>
    </div>
  );
}

function Projects() {
  return (
    <section id="projetos" className="relative py-20 md:py-28">
      <Ghost n="04" style={{ right: "2%", top: "1%" }} />
      <div className="gutter">
        <Eyebrow n="04">Projetos</Eyebrow>
        <h2 data-build="h2" className="display over mt-6 text-[clamp(3rem,8vw,8rem)]">
          Sites <em>no ar</em>
        </h2>
      </div>
      <div className="over mt-4">
        <OrbitSlot />
      </div>
      <ol className="gutter over mt-24 space-y-24 md:space-y-32">
        {PROJECTS.map((p, i) => {
          const flip = i % 2 === 1;
          return (
            <li key={p.name} className="grid grid-cols-12 items-end gap-x-6 gap-y-6">
              <a
                href={`/projetos/${p.slug}`}
                data-fly-case={p.slug}
                data-build="img"
                data-tilt-img
                aria-label={`Ver o projeto ${p.name}`}
                className={cn("frame col-span-12 bg-panel md:col-span-7", flip && "md:order-2")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt={`Página inicial do site ${p.name}`} width={p.w} height={p.h} loading="lazy" className="block h-auto w-full" />
                <span className="frame-glare" aria-hidden />
                <span className="frame-sel" aria-hidden>
                  <b>ver projeto →</b>
                </span>
              </a>
              <div className={cn("col-span-12 md:col-span-5", flip && "md:order-1")}>
                <p data-build="meta" className="tag text-muted">
                  <span className="text-sig">{String(i + 1).padStart(2, "0")}</span> · {p.kind}
                </p>
                <h3 data-build="h3" className="display mt-3 text-[clamp(2.8rem,5.4vw,5.6rem)]">{p.name}</h3>
                <p data-build="p" className="mt-4 max-w-md text-pretty leading-relaxed text-paper/85">{p.text}</p>
                <ul data-build="tags" className="tag mt-5 flex flex-wrap gap-2 text-paper/80">
                  {p.tags.map((t) => (
                    <li key={t} className="border border-white/15 bg-ink/40 px-2 py-1">{t}</li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Process() {
  return (
    <section id="processo" className="gutter relative flex min-h-svh flex-col justify-start overflow-x-clip py-20 md:justify-center md:py-24">
      <span data-j-num className="ghost" aria-hidden style={{ right: "1%", top: "7%" }}>
        01
      </span>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5">
          <Eyebrow n="05">Processo</Eyebrow>
          <h2 data-build="h2" className="display over mt-4 text-[clamp(2.6rem,4.8vw,5rem)]">
            Camada por camada, <em>até ir ao ar</em>
          </h2>
          <div className="over relative mt-6 md:mt-9">
            <div className="absolute bottom-2 left-[6px] top-2 w-px bg-white/15" aria-hidden>
              <div data-j-fill className="h-full w-full origin-top scale-y-0 bg-gradient-to-b from-cyan to-sig" />
            </div>
            <ol className="space-y-1 md:space-y-2">
              {STEPS.map((s, i) => (
                <li key={s.t} data-step={i} data-active={i === 0} className="step grid grid-cols-[14px_1fr] gap-x-4">
                  <span className="step-mark relative z-[1] mt-[11px] size-[13px]" aria-hidden />
                  <div>
                    <button type="button" data-step-btn className="block w-full cursor-pointer py-1.5 text-left font-mono text-sm uppercase tracking-wide transition-colors hover:text-sig">
                      <span className="mr-2 text-sig/70">0{i + 1}</span>
                      {s.t}
                    </button>
                    <div className="step-body">
                      <p className="max-w-sm text-pretty text-sm leading-relaxed text-paper/85 md:text-base">{s.d}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
      <div data-j-pill className="j-pill glass hidden w-72 p-3 lg:block" aria-hidden>
        <p data-j-status className="tag text-paper">conversa · entendendo o seu negócio</p>
        <div className="mt-2 h-0.5 bg-white/15">
          <div data-j-bar className="h-full origin-left scale-x-0 bg-sig" />
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contato" className="gutter relative flex min-h-[135svh] flex-col justify-end pb-20 pt-32">
      <Plus style={{ left: "8%", top: "22%" }} />
      <Plus style={{ right: "12%", top: "36%" }} d={2} />
      <div className="over flex items-end justify-between gap-6">
        <Eyebrow n="06">Agora é com você</Eyebrow>
        <div data-build="selo">
          <Badge id="b-contact" text="vamos construir · o seu site · " className="hidden md:block" />
        </div>
      </div>
      <h2 data-build="h2" data-vf className="display over mt-6 text-[clamp(3.6rem,13.4vw,16rem)]">
        Vamos criar <em>o seu site?</em>
      </h2>
      <div className="over mt-10 grid grid-cols-12 items-end gap-6">
        <p data-build="p" className="col-span-12 max-w-md text-pretty text-lg leading-relaxed text-paper/90 md:col-span-5">
          Conte o que você precisa. Respondemos com uma proposta feita para o seu projeto.
        </p>
        <div data-build="button" className="col-span-12 flex flex-wrap items-center gap-3 md:col-span-7 md:justify-end">
          <Cta className="min-h-14 px-8 text-sm">Solicitar proposta</Cta>
          <a href={LINKEDIN} target="_blank" rel="noreferrer" className="tag glass inline-flex min-h-14 items-center px-6 transition-colors hover:border-sig hover:text-sig">
            LinkedIn · /in/dwdevs
          </a>
        </div>
      </div>
      <footer data-build="footer" className="glass over tag mt-16 flex flex-wrap justify-between gap-3 px-4 py-3 text-paper/85">
        <span>DWdevs · Davi Carvalho e William Cristian</span>
        <span>Mauá · São Paulo · Brasil</span>
      </footer>
    </section>
  );
}

export function Sections() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Band />
        <About />
        <BlockBand seed={2} className="over" />
        <Services />
        <BlockBand seed={9} className="over" />
        <Stack />
        <Ribbons />
        <Projects />
        <Process />
        <BlockBand seed={4} className="over" />
        <Contact />
      </main>
    </>
  );
}
