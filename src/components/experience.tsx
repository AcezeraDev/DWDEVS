"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { SiteControls } from "@/components/site-controls";
import { createCrew } from "@/lib/crew";
import { sfx } from "@/lib/sound";
import { consumeSkipIntro, flyToCase } from "@/lib/transition";
import { burst, SHAPES, stage, type StageState } from "@/lib/stage";

const LayerScene = dynamic(() => import("./layer-scene"), { ssr: false });

/** Quebra o texto em letras, sem deixar uma palavra se partir entre linhas. */
function splitChars(root: HTMLElement) {
  if (root.dataset.split) return;
  root.dataset.split = "1";
  root.setAttribute("aria-label", root.textContent ?? "");
  const walk = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) return walk(child);
      if (child.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      (child.textContent ?? "").split(/(\s+)/).forEach((word) => {
        if (!word) return;
        if (/^\s+$/.test(word)) return frag.append(" ");
        const wd = document.createElement("span");
        wd.className = "wd";
        wd.setAttribute("aria-hidden", "true");
        [...word].forEach((c) => {
          const ch = document.createElement("span");
          ch.className = "ch";
          ch.textContent = c;
          wd.append(ch);
        });
        frag.append(wd);
      });
      child.replaceWith(frag);
    });
  };
  walk(root);
}

const CURSORS = [
  { label: "Davi", color: "var(--sig)", small: false },
  { label: "William", color: "#ffb224", small: false },
  { label: "grid", color: "#8ff7c0", small: true },
  { label: "tipo", color: "#edf3ee", small: true },
  { label: "3D", color: "#7fe3ff", small: true },
  { label: "motion", color: "#ffd27a", small: true },
  { label: "seo", color: "#b6c8bc", small: true },
  { label: "a11y", color: "#c3ffdc", small: true },
];

const Arrow = () => (
  <svg width="32" height="32" viewBox="0 0 18 18" aria-hidden>
    <path d="M1 1l6 16 2.6-6.4L16 8z" fill="currentColor" stroke="#060907" strokeWidth="1" />
  </svg>
);

type Stop = { at: number; s: StageState };

function lerpState(a: StageState, b: StageState, t: number): StageState {
  const e = t * t * (3 - 2 * t);
  const out = { ...a };
  (Object.keys(a) as (keyof StageState)[]).forEach((k) => {
    out[k] = a[k] + (b[k] - a[k]) * e;
  });
  return out;
}

export function Experience() {
  const router = useRouter();
  const hud = useRef<HTMLDivElement>(null);
  const skip = useRef<(() => void) | null>(null);
  const [xray, setXray] = useState(false);
  const [building, setBuilding] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("xray", xray);
  }, [xray]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    (window as unknown as { __dwBuild: boolean }).__dwBuild = true;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = () => innerWidth < 768;
    stage.reduced = reduced;
    gsap.utils.toArray<HTMLElement>("[data-vf]").forEach(splitChars);

    if ("scrollRestoration" in history && !location.hash) {
      history.scrollRestoration = "manual";
      scrollTo(0, 0);
    }

    const cleanups: (() => void)[] = [];

    // ── Rolagem ──────────────────────────────
    let scrollToY: (y: number) => void = (y) => window.scrollTo({ top: y });
    let jumpToY: (y: number) => void = (y) => window.scrollTo({ top: y });
    if (!reduced) {
      const lenis = new Lenis({ anchors: { offset: -64 }, autoRaf: false, lerp: 0.085 });
      lenis.on("scroll", ScrollTrigger.update);
      scrollToY = (y) => lenis.scrollTo(y, { duration: 1.6 });
      jumpToY = (y) => lenis.scrollTo(y, { immediate: true, force: true });
      const raf = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      cleanups.push(() => {
        gsap.ticker.remove(raf);
        lenis.destroy();
      });
    }

    // ── Contador de camadas: conta elementos reais da página ──
    const blocks = gsap.utils.toArray<HTMLElement>("[data-build]");
    const weight = (el: Element) => el.querySelectorAll("*").length + 1;
    const total = blocks.reduce((n, el) => n + weight(el), 0);
    let built = 0;
    let mode = "construindo";
    const hudCount = hud.current?.querySelector<HTMLElement>("[data-count]");
    const hudRing = hud.current?.querySelector<SVGCircleElement>("[data-ring]");
    const hudPct = hud.current?.querySelector<HTMLElement>("[data-pct]");
    const hudState = hud.current?.querySelector<HTMLElement>("[data-state]");
    let compactTimer = 0;
    let lastHudState = "";
    cleanups.push(() => clearTimeout(compactTimer));
    const paintHud = () => {
      const pct = total ? Math.round((built / total) * 100) : 0;
      if (hudCount) hudCount.textContent = `${built} de ${total} camadas`;
      if (hudRing) hudRing.style.strokeDashoffset = String(100 - pct);
      if (hudPct) hudPct.textContent = built >= total ? "✓" : String(pct);
      const name = built >= total ? "No ar" : mode === "construindo" ? "Construindo" : mode === "apagando" ? "Apagando" : "Em pausa";
      if (name === lastHudState || !hud.current) return;
      lastHudState = name;
      if (hudState) {
        hudState.textContent = name;
        if (!reduced) gsap.fromTo(hudState, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "back.out(2)" });
      }
      const kind = name === "No ar" ? "live" : name === "Construindo" ? "build" : name === "Apagando" ? "erase" : "idle";
      hud.current.dataset.state = kind;
      // Parado, o painel se recolhe para não atrapalhar a leitura
      clearTimeout(compactTimer);
      hud.current.dataset.compact = "false";
      if (kind === "idle" || kind === "live") {
        compactTimer = window.setTimeout(() => {
          if (hud.current) hud.current.dataset.compact = "true";
        }, 2600);
      }
    };
    const counted = new Set<Element>();
    const markBuilt = (el: Element) => {
      if (counted.has(el)) return;
      counted.add(el);
      el.classList.add("built");
      built += weight(el);
      paintHud();
    };
    paintHud();

    // ── Scroll → cena 3D ─────────────────────
    let stops: Stop[] = [];
    let journeyRange: [number, number] = [0, 1];
    let pin: ScrollTrigger | null = null;
    const steps = gsap.utils.toArray<HTMLElement>("[data-step]");
    const process = document.querySelector<HTMLElement>("#processo")!;

    const layout = {
      max: 1,
      contactTop: Infinity,
      peelFrom: 0,
      peelTo: 1,
      servicesTop: Infinity,
      servicesBottom: -Infinity,
      rows: [] as number[],
      ghosts: [] as { top: number; height: number }[],
      blockTops: new Map<Element, number>(),
    };
    const measure = () => {
      const processRect = process.getBoundingClientRect();
      const docTop = (el: Element) => {
        const r = el.getBoundingClientRect();
        // Dentro da seção fixa, a posição real vem do início do pin
        return pin && process.contains(el) ? pin.start + (r.top - processRect.top) : r.top + scrollY;
      };
      const rectOf = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
      layout.max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      layout.peelFrom = innerHeight * 0.18;
      layout.contactTop = rectOf("#contato").top + scrollY;
      layout.servicesTop = rectOf("#servicos").top + scrollY;
      layout.servicesBottom = rectOf("#servicos").bottom + scrollY;
      layout.peelTo = layout.servicesTop - innerHeight * 0.46;
      layout.rows = gsap.utils.toArray<HTMLElement>("[data-svc]").map((r) => {
        const b = r.getBoundingClientRect();
        return b.top + b.height / 2 + scrollY;
      });
      layout.ghosts = gsap.utils.toArray<HTMLElement>("[data-ghost]").map((g) => {
        const b = g.parentElement!.getBoundingClientRect();
        return { top: b.top + scrollY, height: b.height };
      });
      blocks.forEach((el) => layout.blockTops.set(el, docTop(el)));
    };

    const computeStops = () => {
      measure();
      const top = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top + scrollY;
      const vh = innerHeight;
      const m = mobile();
      const hero: StageState = { x: m ? 0 : 0.035, y: m ? 0.06 : -0.23, scale: m ? 0.72 : 0.72, explode: m ? 0.6 : 0.62, rx: 0.62, ry: -0.62, opacity: 1, reveal: 8, flat: 0, dx: 0, dy: 0, ds: 1, dOp: m ? 0.3 : 0.42, objs: 1, blocks: 1, jOp: 0 };
      const side: StageState = { ...hero, x: m ? 0.1 : 0.27, y: m ? 0 : -0.02, scale: m ? 0.7 : 0.92, explode: 1.25, ry: 0.5, opacity: m ? 0.3 : 1, dOp: 0.55, objs: 0.9, blocks: 0 };
      const svc: StageState = { ...side, opacity: 0, explode: 1.7, dx: m ? 0 : 0.3, dy: 0, ds: m ? 0.62 : 0.74, dOp: m ? 0.32 : 1, objs: 0 };
      const stackPose: StageState = { ...svc, dx: m ? 0 : -0.26, dy: m ? 0.1 : -0.04, ds: m ? 0.6 : 0.62, dOp: m ? 0.3 : 0.85 };
      const off: StageState = { ...stackPose, dOp: 0 };
      const ps = pin ? pin.start : top("#processo");
      const pe = pin ? pin.end : ps + vh;
      const base: StageState = { ...hero, opacity: 0, explode: 2, reveal: 8, dx: m ? 0 : 0.22, dy: m ? -0.2 : 0, ds: m ? 0.5 : 0.82, dOp: 0.6, objs: 0, blocks: 0, jOp: 1 };
      const contact: StageState = { ...base, dx: 0, dy: m ? 0.24 : 0.2, ds: m ? 0.8 : 1.02, dOp: 1, blocks: 0.82, jOp: 0 };
      journeyRange = [ps, pe];
      const about = top("#sobre");
      const services = top("#servicos");
      const stack = top("#stack");
      const projects = top("#projetos");
      stops = [
        { at: 0, s: hero },
        { at: about - vh * 0.1, s: side },
        { at: services - vh * 0.8, s: side },
        { at: services - vh * 0.42, s: svc },
        { at: stack - vh * 0.6, s: svc },
        { at: stack - vh * 0.1, s: stackPose },
        { at: projects - vh * 0.8, s: stackPose },
        { at: projects - vh * 0.3, s: off },
        { at: ps - vh * 0.8, s: { ...base, dOp: 0, jOp: 0 } },
        { at: ps - vh * 0.1, s: base },
        { at: pe - vh * 0.05, s: base },
        { at: pe + vh * 0.55, s: { ...base, dOp: 0.5, blocks: 0.1 } },
        { at: pe + vh * 0.95, s: contact },
      ];
    };

    // Painel ao vivo da jornada
    const jFill = document.querySelector<HTMLElement>("[data-j-fill]");
    const jNum = document.querySelector<HTMLElement>("[data-j-num]");
    const jStatus = document.querySelector<HTMLElement>("[data-j-status]");
    const jBar = document.querySelector<HTMLElement>("[data-j-bar]");
    const jPill = document.querySelector<HTMLElement>("[data-j-pill]");
    let lastStep = -1;
    let lastStatus = "";
    const paintJourney = (j: number) => {
      const idx = Math.min(3, Math.floor(j));
      if (idx !== lastStep) {
        if (lastStep >= 0 && stage.jOp > 0.5) sfx.chapter(idx);
        lastStep = idx;
        steps.forEach((el, i) => {
          el.dataset.active = String(reduced || i === idx);
          el.dataset.done = String(i < idx);
        });
        if (jNum) {
          jNum.textContent = `0${idx + 1}`;
          if (!reduced) gsap.fromTo(jNum, { yPercent: 12, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: "back.out(1.6)" });
        }
      }
      if (jFill) jFill.style.transform = `scaleY(${(j / 4).toFixed(4)})`;
      const local = j - idx;
      if (jBar) jBar.style.transform = `scaleX(${(idx === 3 ? Math.min(1, local / 0.6) : local).toFixed(3)})`;
      let text: string;
      if (j < 0.8) text = "conversa · entendendo o seu negócio";
      else if (j < 1.12) text = "design · traçando a estrutura";
      else if (j < 2) text = `design · ${gsap.utils.clamp(0, 8, Math.floor((j - 1.52) / 0.07) + 1)} de 8 blocos no lugar`;
      else if (j < 3.18) text = `código · compilando ${Math.round(gsap.utils.clamp(0, 1, (j - 2) / 1.15) * 100)}%`;
      else if (j < 3.55) text = "lançamento · publicando";
      else text = "lançamento · no ar ✓";
      if (text !== lastStatus) {
        lastStatus = text;
        if (jStatus) jStatus.textContent = text;
        if (jPill) jPill.dataset.live = String(j >= 3.55);
      }
    };

    const smooth = { y: scrollY };
    const applyScroll = () => {
      // Independente da taxa de quadros: em máquina lenta a cena não fica para trás do scroll.
      const k = reduced ? 1 : 1 - Math.pow(0.88, gsap.ticker.deltaRatio(60));
      smooth.y += (scrollY - smooth.y) * k;
      if (!stops.length) return;
      const y = smooth.y;
      let s = stops[stops.length - 1].s;
      if (y <= stops[0].at) s = stops[0].s;
      else
        for (let i = 0; i < stops.length - 1; i++) {
          if (y >= stops[i].at && y < stops[i + 1].at) {
            s = lerpState(stops[i].s, stops[i + 1].s, (y - stops[i].at) / (stops[i + 1].at - stops[i].at || 1));
            break;
          }
        }
      Object.assign(stage, s);
      // O piso sai cedo, antes de encostar no texto de Sobre
      if (y < layout.servicesTop) stage.blocks *= gsap.utils.clamp(0, 1, 1 - y / (innerHeight * 0.5));

      const vh = innerHeight;
      stage.sc = y / vh;
      stage.scroll01 = y / layout.max;
      stage.peel = reduced ? 0 : gsap.utils.clamp(0, 1, (y - layout.peelFrom) / (layout.peelTo - layout.peelFrom || 1));

      // Jornada: de 0 a 4, sempre linear com o scroll
      const jp = gsap.utils.clamp(0, 1, (y - journeyRange[0]) / (journeyRange[1] - journeyRange[0] || 1));
      const prevJ = stage.journey;
      stage.journey = jp * 4;
      const prevExit = stage.jExit;
      stage.jExit = gsap.utils.clamp(0, 1, (y - journeyRange[1]) / (vh * 0.8));
      if (prevExit <= 0 && stage.jExit > 0) {
        burst(mobile() ? 0 : 0.42, -0.5);
        sfx.launch();
      }
      if (prevJ < 3.55 && stage.journey >= 3.55) {
        burst(mobile() ? 0 : 0.44, -0.05);
        sfx.success();
      }
      paintJourney(stage.journey);

      // Qual forma as partículas assumem agora
      let shape: number = SHAPES.dust;
      const live = scrollY;
      if (layout.contactTop - live < vh * 0.5) shape = SHAPES.dw;
      else if (layout.servicesTop - live < vh * 0.6 && layout.servicesBottom - live > vh * 0.3) {
        let on = svcHover;
        if (!on) {
          let best = Infinity;
          layout.rows.forEach((mid, i) => {
            const d = Math.abs(mid - live - vh * 0.55);
            if (d < best) {
              best = d;
              on = i + 1;
            }
          });
        }
        shape = [SHAPES.browser, SHAPES.funnel, SHAPES.knot, SHAPES.cursor][on - 1] ?? SHAPES.browser;
        if (on !== svcOn) {
          svcOn = on;
          svcRows.forEach((row, i) => (row.dataset.on = String(i + 1 === on)));
        }
      }
      // A ideia solta da conversa vira o contorno da página
      if (stage.jOp > 0.5 && stage.journey > 0.72 && stage.journey < 1.3) shape = SHAPES.browser;
      if (stage.jOp > 0.01) {
        const j = stage.journey;
        const up = gsap.utils.clamp(0, 1, (j - 0.55) / 0.3) * (1 - gsap.utils.clamp(0, 1, (j - 1.2) / 0.3));
        stage.dOp = Math.max(stage.dOp * 0.5, 0.26 + up * 0.6) * stage.jOp + stage.dOp * (1 - stage.jOp);
      }
      stage.shape = stage.shapeOverride ?? shape;

      if (rulerMark) {
        const pct = Math.round(stage.scroll01 * 100);
        if (pct !== rulerPct) {
          rulerPct = pct;
          rulerMark.textContent = `${String(pct).padStart(2, "0")}%`;
          rulerMark.style.transform = `translateY(${stage.scroll01 * vh * 0.68}px)`;
        }
      }
      if (live !== lastGhostY) {
        lastGhostY = live;
        layout.ghosts.forEach((g, i) => {
          const top = g.top - live;
          if (top + g.height > 0 && top < vh) ghosts[i].style.transform = `translate3d(0,${((top / vh) * -70 * (i % 2 ? 1.3 : 1)).toFixed(1)}px,0)`;
        });
      }
    };
    let svcOn = 0;
    let rulerPct = -1;
    let lastGhostY = -1;
    let svcHover = 0;
    const svcRows = gsap.utils.toArray<HTMLElement>("[data-svc]");
    const rulerMark = document.querySelector<HTMLElement>("[data-ruler]");
    const ghosts = gsap.utils.toArray<HTMLElement>("[data-ghost]");
    svcRows.forEach((row, i) => {
      const on = () => (svcHover = i + 1);
      const off = () => (svcHover = 0);
      row.addEventListener("pointerenter", on);
      row.addEventListener("pointerleave", off);
      cleanups.push(() => {
        row.removeEventListener("pointerenter", on);
        row.removeEventListener("pointerleave", off);
      });
    });
    gsap.ticker.add(applyScroll);
    cleanups.push(() => gsap.ticker.remove(applyScroll));

    if (!reduced) {
      pin = ScrollTrigger.create({
        trigger: process,
        start: "top top",
        end: () => `+=${innerHeight * 4.6}`,
        pin: true,
      });
    } else {
      steps.forEach((el) => (el.dataset.active = "true"));
    }
    gsap.utils.toArray<HTMLElement>("[data-step-btn]").forEach((btn, i) => {
      const go = () => {
        const [from, to] = journeyRange;
        scrollToY(from + (to - from) * ((i + 0.72) / 4));
      };
      btn.addEventListener("click", go);
      cleanups.push(() => btn.removeEventListener("click", go));
    });
    ScrollTrigger.addEventListener("refresh", computeStops);
    cleanups.push(() => ScrollTrigger.removeEventListener("refresh", computeStops));
    computeStops();

    const killTriggers = () => ScrollTrigger.getAll().forEach((t) => t.kill());

    // Sem movimento: conteúdo já visível, cena parada, HUD só informa.
    if (reduced) {
      blocks.forEach(markBuilt);
      queueMicrotask(() => setBuilding(false));
      return () => {
        cleanups.forEach((f) => f());
        killTriggers();
      };
    }

    // ── Sistema de montagem e desmontagem ────
    const layer = document.querySelector<HTMLElement>("[data-bp-layer]")!;
    const crew = createCrew(document.querySelector<HTMLElement>(".cursors")!);
    const pool = crew.cursors;
    const free = () => pool.find((c) => !c.busy && (!c.small || !mobile()));
    cleanups.push(crew.destroy);

    const makeBox = (el: Element, label?: string) => {
      const r = el.getBoundingClientRect();
      const box = document.createElement("div");
      box.className = "bp";
      box.style.cssText = `left:${r.left + scrollX}px;top:${r.top + scrollY}px;width:${r.width}px;height:${r.height}px`;
      box.innerHTML = `<i></i><i></i><i></i><i></i><b>${label ?? (el as HTMLElement).dataset.build} · ${Math.round(r.width)}×${Math.round(r.height)}</b>`;
      layer.appendChild(box);
      return box;
    };

    const wipeFrom = "inset(-4% 100% -4% -2%)";
    const wipeTo = "inset(-4% -2% -4% -2%)";

    const unmark = (el: Element) => {
      if (!counted.has(el)) return;
      counted.delete(el);
      el.classList.remove("built");
      built -= weight(el);
      mode = "apagando";
      paintHud();
    };
    const mark = (el: Element) => {
      mode = "construindo";
      markBuilt(el);
    };

    let idleTimer = 0;
    let placed = 0;
    const scheduleIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        pool.forEach((c) => !c.busy && crew.hide(c));
        mode = "em pausa";
        paintHud();
      }, 1100);
    };

    // Cada bloco tem um estado e um desejo: rolar para cima e para baixo só muda o desejo.
    type Rec = { state: "off" | "on" | "building" | "erasing"; want: "on" | "off"; queued: boolean };
    const recs = new Map<HTMLElement, Rec>();
    blocks.forEach((el) => recs.set(el, { state: "off", want: "off", queued: false }));
    const queue: HTMLElement[] = [];

    const finish = (el: HTMLElement, c: (typeof pool)[number], state: "on" | "off") => {
      const rec = recs.get(el)!;
      rec.state = state;
      c.busy = false;
      if (rec.want !== state) request(el, rec.want);
      pump();
      if (!queue.length) scheduleIdle();
    };

    const build = (el: HTMLElement, c: (typeof pool)[number]) => {
      const rec = recs.get(el)!;
      rec.state = "building";
      mode = "construindo";
      paintHud();
      c.busy = true;
      clearTimeout(idleTimer);
      crew.show(c);
      crew.setLabel(c);
      const r = el.getBoundingClientRect();
      const left = r.left + scrollX;
      const top = r.top + scrollY;
      const box = makeBox(el);
      gsap.set(box, { scaleX: 0, scaleY: 0 });
      gsap
        .timeline({
          onComplete: () => {
            box.remove();
            finish(el, c, "on");
          },
        })
        .add(crew.fly(c, left, top, 0.62), 0)
        .add(() => crew.click(c), 0.58)
        .add(crew.fly(c, left + r.width, top + r.height, 0.58, "power1.inOut"), 0.64)
        .to(box, { scaleX: 1, scaleY: 1, duration: 0.58, ease: "power1.inOut" }, 0.64)
        .add(() => {
          crew.click(c);
          crew.sparks(c);
          sfx.place(placed++);
          gsap.set(el, { clipPath: wipeFrom });
          mark(el);
        }, 1.2)
        .to(el, { clipPath: wipeTo, duration: 0.5, ease: "power2.out", clearProps: "clipPath" }, 1.22)
        .to(box, { autoAlpha: 0, duration: 0.3, ease: "sine.inOut" }, 1.42);
    };

    const erase = (el: HTMLElement, c: (typeof pool)[number]) => {
      const rec = recs.get(el)!;
      rec.state = "erasing";
      mode = "apagando";
      paintHud();
      c.busy = true;
      clearTimeout(idleTimer);
      crew.show(c);
      if (!c.small) crew.setLabel(c, `${c.baseLabel} · apagando`);
      const r = el.getBoundingClientRect();
      const left = r.left + scrollX;
      const top = r.top + scrollY;
      const box = makeBox(el, `apagar · ${el.dataset.build}`);
      box.classList.add("erase");
      gsap.set(box, { autoAlpha: 0 });
      const p = { v: 0 };
      let step = 0;
      gsap
        .timeline({
          onComplete: () => {
            unmark(el);
            gsap.set(el, { clearProps: "clipPath" });
            box.remove();
            crew.setLabel(c);
            finish(el, c, "off");
          },
        })
        .add(crew.fly(c, left + r.width, top + r.height * 0.5, 0.36), 0)
        .to(box, { autoAlpha: 1, duration: 0.22, ease: "sine.inOut" }, 0.06)
        .add(() => {
          crew.click(c, "#ff5fa2");
          sfx.erase();
        }, 0.34)
        // A borracha vai e volta enquanto avança para a esquerda; o conteúdo some atrás dela
        .to(
          p,
          {
            v: 1,
            duration: 0.85,
            ease: "sine.inOut",
            onUpdate: () => {
              const swing = Math.sin(p.v * Math.PI * 7);
              c.t.x = left + r.width * (1 - p.v);
              c.t.y = top + r.height * (0.5 + swing * 0.42);
              el.style.clipPath = `inset(-4% ${(p.v * 102 - 2).toFixed(2)}% -4% -2%)`;
              box.style.transform = `scaleX(${(1 - p.v).toFixed(3)})`;
              if (step++ % 3 === 0) crew.crumbs(c, step % 2 ? "#ff5fa2" : "#f1f6f0");
            },
          },
          0.36,
        );
    };

    const instant = (el: HTMLElement, want: "on" | "off") => {
      const rec = recs.get(el)!;
      rec.state = want;
      gsap.set(el, { clearProps: "clipPath" });
      if (want === "on") mark(el);
      else unmark(el);
    };

    const quick = (el: HTMLElement, want: "on" | "off") => {
      const rec = recs.get(el)!;
      rec.state = want === "on" ? "building" : "erasing";
      const done = () => {
        rec.state = want;
        if (rec.want !== want) request(el, rec.want);
      };
      if (want === "on") {
        mark(el);
        gsap.fromTo(el, { clipPath: wipeFrom }, { clipPath: wipeTo, duration: 0.35, ease: "power2.out", clearProps: "clipPath", onComplete: done });
      } else {
        gsap.fromTo(el, { clipPath: wipeTo }, {
          clipPath: wipeFrom,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            unmark(el);
            gsap.set(el, { clearProps: "clipPath" });
            done();
          },
        });
      }
    };

    function pump() {
      while (queue.length) {
        const next = queue[0];
        const rec = recs.get(next)!;
        const stable = rec.state === "on" || rec.state === "off";
        if (!stable || rec.state === rec.want) {
          queue.shift();
          rec.queued = false;
          continue;
        }
        const box = next.getBoundingClientRect();
        // Fora da tela não há o que mostrar, e rolagem rápida nunca deixa conteúdo esperando
        if (box.bottom < 0 || box.top > innerHeight) {
          queue.shift();
          rec.queued = false;
          instant(next, rec.want);
          continue;
        }
        if (queue.length > 9) {
          queue.shift();
          rec.queued = false;
          quick(next, rec.want);
          continue;
        }
        const c = free();
        if (!c) return;
        queue.shift();
        rec.queued = false;
        if (rec.want === "on") build(next, c);
        else erase(next, c);
      }
      if (!pool.some((c) => c.busy)) scheduleIdle();
    }

    function request(el: HTMLElement, want: "on" | "off") {
      const rec = recs.get(el)!;
      rec.want = want;
      const stable = rec.state === "on" || rec.state === "off";
      if (!stable || rec.state === want || rec.queued) return;
      rec.queued = true;
      queue.push(el);
      pump();
    }

    // ── Abertura: o hero nasce como wireframe ──
    const heroBlocks = blocks.filter((el) => el.closest("#inicio") || el.closest("header"));
    const slot = document.querySelector<HTMLElement>("[data-stack-slot]");
    stage.intro = 0;
    stage.stack = 1;
    stage.introFloor = 0;
    stage.introObjs = 0;

    const armScroll = () => {
      heroBlocks.forEach((el) => {
        const rec = recs.get(el)!;
        rec.state = "on";
        rec.want = "on";
      });
      pool.forEach((c) => (c.busy = false));
      // A direção só muda depois de 50px no outro sentido: um toque no trackpad não apaga nada
      const rest = blocks.filter((el) => !heroBlocks.includes(el));
      all.forEach((b) => b.remove());
      if (skipping) {
        measure();
        rest.forEach((el) => {
          if ((layout.blockTops.get(el) ?? 0) - scrollY < innerHeight * 0.9) {
            recs.get(el)!.want = "on";
            instant(el, "on");
          }
        });
      }
      let dir: 1 | -1 = 1;
      let extreme = scrollY;
      let lastFollowY = -1;
      const follow = () => {
        const y = scrollY;
        if (dir === 1) {
          if (y > extreme) extreme = y;
          else if (y < extreme - 50) {
            dir = -1;
            extreme = y;
          }
        } else if (y < extreme) extreme = y;
        else if (y > extreme + 50) {
          dir = 1;
          extreme = y;
        }
        if (y === lastFollowY) return;
        lastFollowY = y;
        const vh = innerHeight;
        rest.forEach((el) => {
          const rec = recs.get(el)!;
          const top = (layout.blockTops.get(el) ?? 0) - y;
          // Desce: monta o que entra na tela. Sobe: apaga o que está na parte de baixo.
          if (dir === 1 && rec.want === "off" && top < vh * 0.9) request(el, "on");
          else if (dir === -1 && rec.want === "on" && top > vh * 0.6) request(el, "off");
        });
      };
      gsap.ticker.add(follow);
      cleanups.push(() => gsap.ticker.remove(follow));
      mode = "em pausa";
      paintHud();
      setBuilding(false);
      skip.current = null;
    };

    let skipping = false;
    const intro = gsap.timeline({ onComplete: armScroll, paused: true });
    const boxes = heroBlocks.map((el) => makeBox(el));
    const slotBox = slot && slot.offsetParent ? makeBox(slot, "canvas · webgl") : null;
    const all = slotBox ? [...boxes, slotBox] : boxes;
    gsap.set(all, { scaleX: 0, scaleY: 0 });
    const active = pool.filter((c) => !c.small || !mobile());
    active.forEach((c, i) => {
      c.busy = true;
      intro.add(() => crew.show(c), 0.02 + i * 0.05);
    });
    // 1. estrutura
    all.forEach((b, i) => intro.to(b, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "back.out(1.25)" }, 0.15 + i * 0.05));
    active.forEach((c, i) => {
      gsap.utils
        .shuffle([...all])
        .slice(0, 5)
        .forEach((b, j) => {
          const bs = b.style;
          const at = 0.08 + j * 0.62 + i * 0.04;
          intro.add(crew.fly(c, parseFloat(bs.left) + parseFloat(bs.width) * ((i * 0.37 + j * 0.2) % 1), parseFloat(bs.top) + parseFloat(bs.height) * ((j * 0.43) % 1), 0.6), at);
          intro.add(() => crew.click(c), at + 0.58);
        });
    });
    // 2. cena 3D desenha as camadas
    intro.to(stage, { intro: 8, duration: 2.75, ease: "none" }, 0.35);
    // 3. conteúdo preenche
    heroBlocks.forEach((el, i) => {
      const at = 1.25 + i * 0.13;
      if (el.dataset.vf !== undefined) {
        // O nome entra letra por letra, saltando
        intro.add(() => mark(el), at);
        intro.fromTo(
          el.querySelectorAll(".ch"),
          { yPercent: 75, rotate: -14, opacity: 0, scale: 0.65 },
          { yPercent: 0, rotate: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.06, ease: "back.out(2.2)", clearProps: "transform,opacity" },
          at,
        );
      } else {
        intro.add(() => {
          gsap.set(el, { clipPath: wipeFrom });
          mark(el);
        }, at);
        intro.to(el, { clipPath: wipeTo, duration: 0.55, ease: "power2.out", clearProps: "clipPath" }, at + 0.01);
      }
      intro.to(boxes[i], { autoAlpha: 0, duration: 0.3 }, at + 0.38);
    });
    if (slotBox) intro.to(slotBox, { autoAlpha: 0, duration: 0.35 }, 2.95);
    // 4. os cursores se juntam na pilha, ela se comprime e explode em vida
    const stackX = innerWidth * (mobile() ? 0.5 : 0.53);
    const stackY = innerHeight * (mobile() ? 0.42 : 0.68);
    active.forEach((c, i) => {
      const a = (i / active.length) * Math.PI * 2;
      intro.add(crew.fly(c, stackX + Math.cos(a) * 150, stackY + Math.sin(a) * 90, 0.45), 3.0 + i * 0.02);
    });
    intro.to(stage, { stack: 0.16, duration: 0.42, ease: "power3.in" }, 3.2);
    intro.add(() => {
      burst(mobile() ? 0 : 0.06, mobile() ? 0.1 : -0.34);
      if (!skipping) sfx.boom();
      active.forEach((c) => {
        crew.click(c);
        crew.sparks(c, 4);
      });
      const hero = heroBlocks.find((el) => el.dataset.vf !== undefined);
      if (hero) gsap.fromTo(hero.querySelectorAll(".ch"), { yPercent: 0 }, { keyframes: [{ yPercent: -13, duration: 0.2, ease: "power2.out" }, { yPercent: 0, duration: 0.65, ease: "elastic.out(1,0.4)" }], stagger: 0.04, clearProps: "transform" });
    }, 3.62);
    intro.to(stage, { stack: 1, duration: 1.3, ease: "elastic.out(1,0.42)" }, 3.62);
    intro.to(stage, { introFloor: 1, duration: 1.15, ease: "power2.out" }, 3.62);
    intro.to(stage, { introObjs: 1, duration: 1.15, ease: "power2.out" }, 3.66);
    intro.add(() => pool.forEach((c) => crew.hide(c)), 4.25);
    intro.add(() => {}, 4.8);
    intro.add(() => all.forEach((b) => b.remove()));

    // A abertura espera a cena 3D carregar, para ninguém perder o começo.
    // Sem WebGL ou em conexão muito lenta, segue em frente depois de 2,5 s.
    const waitStart = performance.now();
    const waitScene = () => {
      if (!stage.sceneReady && performance.now() - waitStart < 2500) return;
      gsap.ticker.remove(waitScene);
      (window as unknown as { __dwIntro: number }).__dwIntro = performance.now();
      intro.play();
    };
    gsap.ticker.add(waitScene);
    cleanups.push(() => gsap.ticker.remove(waitScene));

    skip.current = () => {
      skipping = true;
      gsap.ticker.remove(waitScene);
      intro.progress(1);
    };
    if (consumeSkipIntro()) {
      ScrollTrigger.refresh();
      const target = location.hash ? document.querySelector(location.hash) : null;
      if (target) jumpToY(target.getBoundingClientRect().top + scrollY - 64);
      skip.current();
    }
    cleanups.push(() => {
      intro.kill();
      all.forEach((b) => b.remove());
      clearTimeout(idleTimer);
    });

    // ── Movimento contínuo ligado ao scroll ──
    const lineEl = document.querySelector<HTMLElement>("[data-scroll-line]");
    const word = document.querySelector<HTMLElement>("[data-hero-word]");
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (s) => {
        if (lineEl) gsap.set(lineEl, { scaleY: s.progress });
      },
    });
    if (word) gsap.to(word, { yPercent: -16, ease: "none", scrollTrigger: { trigger: "#inicio", start: "top top", end: "bottom top", scrub: true } });

    // ── Mouse: parallax, cursor "você" e botões magnéticos ──
    if (matchMedia("(hover: hover)").matches) {
      const you = document.querySelector<HTMLElement>("[data-you]")!;
      const qx = gsap.quickTo(you, "x", { duration: 0.25, ease: "power3" });
      const qy = gsap.quickTo(you, "y", { duration: 0.25, ease: "power3" });
      const youText = you.querySelector("span")!;
      let lastMove = 0;
      gsap.set(you, { autoAlpha: 0 });
      const move = (e: PointerEvent) => {
        stage.hasMouse = true;
        lastMove = performance.now();
        stage.px = (e.clientX / innerWidth - 0.5) * 2;
        stage.py = (e.clientY / innerHeight - 0.5) * 2;
        qx(e.clientX);
        qy(e.clientY);
        gsap.set(you, { autoAlpha: 1 });
      };
      addEventListener("pointermove", move);
      cleanups.push(() => removeEventListener("pointermove", move));

      // Letras ficam mais pesadas perto do mouse, e o cursor "você" conta o que está embaixo
      const vfSets = gsap.utils.toArray<HTMLElement>("[data-vf]").map((el) => ({
        el,
        chars: [...el.querySelectorAll<HTMLElement>(".ch")].map((node) => ({ node, w: 0, shown: -1 })),
      }));
      const typeTick = () => {
        const label = stage.hoverLabel ? `você · ${stage.hoverLabel}` : "você";
        if (youText.textContent !== label) youText.textContent = label;
        if (!stage.hasMouse || performance.now() - lastMove > 1500) return;
        const mx = ((stage.px + 1) / 2) * innerWidth;
        const my = ((stage.py + 1) / 2) * innerHeight;
        vfSets.forEach(({ el, chars }) => {
          const box = el.getBoundingClientRect();
          if (box.bottom < 0 || box.top > innerHeight) return;
          const near = chars.map(({ node }) => {
            const r = node.getBoundingClientRect();
            return Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my);
          });
          const radius = Math.max(150, innerWidth * 0.16);
          chars.forEach((c, i) => {
            c.w += (Math.max(0, 1 - near[i] / radius) - c.w) * 0.14;
            const w = Math.round(c.w * 18) * 25;
            if (w !== c.shown) {
              c.shown = w;
              c.node.style.fontWeight = w ? String(320 + w) : "";
            }
          });
        });
      };
      gsap.ticker.add(typeTick);
      cleanups.push(() => gsap.ticker.remove(typeTick));

      // Cards inclinam em 3D
      const tilt = (el: HTMLElement, deg: number, glare: boolean) => {
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width;
          const ny = (e.clientY - r.top) / r.height;
          gsap.to(el, { rotateY: (nx - 0.5) * deg, rotateX: (0.5 - ny) * deg, transformPerspective: 900, duration: 0.4, ease: "power2.out" });
          if (glare) {
            el.style.setProperty("--gx", `${nx * 100}%`);
            el.style.setProperty("--gy", `${ny * 100}%`);
          }
        };
        const onLeave = () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 1, ease: "elastic.out(1,0.5)" });
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        });
      };
      gsap.utils.toArray<HTMLElement>("[data-tilt]").forEach((el) => tilt(el, 9, false));
      gsap.utils.toArray<HTMLElement>("[data-tilt-img]").forEach((el) => tilt(el, 7, true));

      gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((el) => {
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.18, duration: 0.3 });
        };
        const onLeave = () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1,0.45)" });
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        });
      });
    }

    const sleeper = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("asleep", !e.isIntersecting)),
      { rootMargin: "10% 0px" },
    );
    document.querySelectorAll(".band,.mosaic,.mini,.beam,.badge,.plus,.animate-marquee").forEach((n) => sleeper.observe(n));
    cleanups.push(() => sleeper.disconnect());

    document.fonts?.ready.then(() => {
      ScrollTrigger.refresh();
      const target = location.hash ? document.querySelector(location.hash) : null;
      if (target) jumpToY(target.getBoundingClientRect().top + scrollY - 64);
    });

    const openCase = (e: MouseEvent) => {
      const a = (e.target as Element)?.closest?.<HTMLAnchorElement>("a[data-fly-case]");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      const slug = a.dataset.flyCase!;
      const img = a.querySelector("img");
      const r = (img ?? a).getBoundingClientRect();
      flyToCase(`/projects/${slug}/d1.jpg`, { left: r.left, top: r.top, width: r.width, height: img ? r.height : r.width * 0.5 }, () => router.push(`/projetos/${slug}`));
    };
    document.addEventListener("click", openCase);
    cleanups.push(() => document.removeEventListener("click", openCase));
    cleanups.push(() => document.documentElement.classList.remove("xray", "can-grab", "grabbing"));

    return () => {
      cleanups.forEach((f) => f());
      killTriggers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <LayerScene />
      <div className="bp-layer" data-bp-layer aria-hidden />
      <div className="scroll-line" data-scroll-line aria-hidden />
      <div className="ruler" aria-hidden />
      <div className="ruler-mark" data-ruler aria-hidden>00%</div>
      <div className="cursors" aria-hidden>
        {CURSORS.map((c, i) => (
          <div key={c.label} style={{ display: "contents" }}>
            {[0, 1, 2, 3].map((k) => (
              <i key={k} data-trail={i} className={`cur-dot ${c.small ? "small" : ""}`} style={{ "--c": c.color } as React.CSSProperties} />
            ))}
            <div data-cur={i} className={`cur ${c.small ? "small" : ""}`} style={{ "--c": c.color } as React.CSSProperties}>
              <Arrow />
              <span>{c.label}</span>
            </div>
          </div>
        ))}
        <div data-you className="cur cur-you small" style={{ "--c": "#edf3ee" } as React.CSSProperties}>
          <span style={{ left: 16, top: 18 }}>você</span>
        </div>
      </div>
      <div ref={hud} className="hud" data-state="build" role="group" aria-label="Status da construção do site">
        <div className="hud-ring" aria-hidden>
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" pathLength="100" className="hud-ring-bg" />
            <circle cx="18" cy="18" r="15.5" pathLength="100" className="hud-ring-fill" data-ring />
          </svg>
          <span data-pct>0</span>
        </div>
        <div className="hud-fold">
          <div className="hud-fold-in">
            <div className="hud-text">
              <span className="hud-title">
                <i className="hud-dot" aria-hidden />
                <b data-state>Construindo</b>
              </span>
              <span data-count className="hud-sub">
                0 de 0 camadas
              </span>
            </div>
            <div className="hud-team" title="2 devs e 6 tarefas em andamento">
              <span className="hud-face" style={{ "--c": "var(--sig)" } as React.CSSProperties}>D</span>
              <span className="hud-face" style={{ "--c": "#ffb224" } as React.CSSProperties}>W</span>
              <span className="hud-face hud-more">+6</span>
            </div>
          </div>
        </div>
        <div className="hud-actions">
          <SiteControls />
          {building ? (
            <button key="pular" type="button" className="hud-skip" onClick={() => skip.current?.()}>
              Pular
            </button>
          ) : (
            <button key="raio-x" type="button" className="hud-icon" aria-label="Raio-X" data-tip="Raio-X" aria-pressed={xray} onClick={() => setXray((v) => !v)}>
              <svg viewBox="0 0 20 20" aria-hidden>
                <path d="M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7M13 3h2.5A1.5 1.5 0 0 1 17 4.5V7M17 13v2.5a1.5 1.5 0 0 1-1.5 1.5H13M7 17H4.5A1.5 1.5 0 0 1 3 15.5V13M2 10h16" />
              </svg>
            </button>
          )}
          <button
            key="reconstruir"
            type="button"
            className="hud-icon"
            aria-label="Reconstruir"
            data-tip="Reconstruir"
            onClick={() => {
              scrollTo(0, 0);
              location.reload();
            }}
          >
            <svg viewBox="0 0 20 20" aria-hidden>
              <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M14.8 2.4v3.2h-3.2" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
