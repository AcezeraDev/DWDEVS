"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { reduced } from "./store";

type Mote = { a: number; r: number; v: number; s: number; c: number };

const rgb = (hex: string, fallback: string) => {
  const h = hex.trim().replace("#", "");
  return h.length === 6 ? [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)).join(",") : fallback;
};

/**
 * A living portal drawn on a 2D canvas: spiral arms winding into a dark core, motes of light
 * being pulled in (the inner ones lapping the outer ones), a rim of flame and a thin photon ring.
 * Hovering its host (the closest `.group`) spins it up and opens the core; the host tilts it
 * toward the cursor; a click sends a shockwave out of it. Only draws while on screen.
 */
export function Portal({ className, children, tilt = true }: { className?: string; children?: React.ReactNode; tilt?: boolean }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current!;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const host = (el.closest(".group") as HTMLElement | null) ?? el;
    const still = reduced();
    const dpr = Math.min(window.devicePixelRatio, 2);
    let size = 0;
    let visible = false;
    let frame = 0;
    let t = Math.random() * 100;
    let acc = "200,240,49";
    let acc2 = "31,209,186";
    const st = { open: 0, wave: 0, rx: 0, ry: 0 };
    const goal = { open: 0 };
    const motes: Mote[] = Array.from({ length: 90 }, () => ({ a: Math.random() * Math.PI * 2, r: 0.3 + Math.random() * 0.7, v: 0.6 + Math.random() * 0.8, s: 0.6 + Math.random() * 1.4, c: Math.random() }));

    const resize = () => {
      const w = el.clientWidth;
      if (!w) return;
      size = w;
      cv.width = w * dpr;
      cv.height = w * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (dt: number) => {
      if (!size) return;
      if (frame++ % 30 === 0) {
        const cs = getComputedStyle(document.documentElement);
        acc = rgb(cs.getPropertyValue("--acc"), acc);
        acc2 = rgb(cs.getPropertyValue("--acc-2"), acc2);
      }
      st.open += (goal.open - st.open) * Math.min(1, dt * 5);
      st.wave = Math.max(0, st.wave - dt * 1.4);
      const open = st.open;
      const speed = 1 + open * 2.2 + st.wave * 3;
      t += dt * speed;

      const c = size / 2;
      const R = c * 0.86;
      const core = R * (0.26 + open * 0.08);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(c, c);
      ctx.globalCompositeOperation = "lighter";

      // Glow behind everything
      const halo = ctx.createRadialGradient(0, 0, core, 0, 0, R * 1.05);
      halo.addColorStop(0, `rgba(${acc},${0.22 + open * 0.2})`);
      halo.addColorStop(0.6, `rgba(${acc2},${0.08 + open * 0.08})`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2);
      ctx.fill();

      // Spiral arms winding in (logarithmic), tapering toward the core
      const ARMS = 5;
      for (let k = 0; k < ARMS; k++) {
        const base = (k / ARMS) * Math.PI * 2 - t * 0.9;
        const col = k % 2 ? acc2 : acc;
        for (let s = 0; s < 22; s++) {
          const f0 = s / 22;
          const f1 = (s + 1) / 22;
          const r0 = core + (R - core) * f0;
          const r1 = core + (R - core) * f1;
          const a0 = base + Math.log(r0 / core + 1) * 2.4;
          const a1 = base + Math.log(r1 / core + 1) * 2.4;
          ctx.strokeStyle = `rgba(${col},${(1 - f0) * (0.55 + open * 0.35)})`;
          ctx.lineWidth = Math.max(0.6, (1 - f0) * size * 0.022);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
          ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
          ctx.stroke();
        }
      }

      // Motes falling in: faster the deeper they get, back to the rim once swallowed
      for (const m of motes) {
        m.r -= dt * 0.12 * m.v * speed * (1.2 - m.r);
        m.a -= (dt * speed * 1.6 * m.v) / Math.pow(Math.max(m.r, 0.2), 1.3);
        if (m.r < 0.28) {
          m.r = 0.95 + Math.random() * 0.1;
          m.a = Math.random() * Math.PI * 2;
        }
        const rr = core + (R - core) * ((m.r - 0.28) / 0.72);
        const k = Math.min(1, (m.r - 0.28) * 4) * (1 - Math.max(0, m.r - 0.9) * 8);
        ctx.fillStyle = m.c < 0.6 ? `rgba(${acc},${0.9 * k})` : m.c < 0.85 ? `rgba(${acc2},${0.9 * k})` : `rgba(255,250,235,${k})`;
        ctx.beginPath();
        ctx.arc(Math.cos(m.a) * rr, Math.sin(m.a) * rr, m.s * (size / 140), 0, Math.PI * 2);
        ctx.fill();
      }

      // Rim of flame: a wobbling ring in the accent pair, plus the rose of the brand
      ctx.lineWidth = Math.max(1, size * 0.018);
      const grad = ctx.createConicGradient ? ctx.createConicGradient(t * 0.6, 0, 0) : null;
      if (grad) {
        grad.addColorStop(0, `rgba(${acc},1)`);
        grad.addColorStop(0.33, `rgba(${acc2},1)`);
        grad.addColorStop(0.66, "rgba(255,95,162,1)");
        grad.addColorStop(1, `rgba(${acc},1)`);
        ctx.strokeStyle = grad;
      } else ctx.strokeStyle = `rgba(${acc},1)`;
      ctx.shadowColor = `rgba(${acc},0.9)`;
      ctx.shadowBlur = size * 0.06;
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const w = 1 + 0.035 * Math.sin(a * 7 + t * 3) + 0.025 * Math.sin(a * 13 - t * 5) + open * 0.04 * Math.sin(a * 3 + t * 2);
        const x = Math.cos(a) * R * w;
        const y = Math.sin(a) * R * w;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Shockwave from a click
      if (st.wave > 0) {
        ctx.strokeStyle = `rgba(${acc},${st.wave})`;
        ctx.lineWidth = size * 0.012;
        ctx.beginPath();
        ctx.arc(0, 0, R * (1 + (1 - st.wave) * 0.35), 0, Math.PI * 2);
        ctx.stroke();
      }

      // The core: a dark well with a thin photon ring around it
      ctx.globalCompositeOperation = "source-over";
      const well = ctx.createRadialGradient(0, 0, 0, 0, 0, core * 1.25);
      well.addColorStop(0, "rgba(4,5,7,1)");
      well.addColorStop(0.78, "rgba(4,5,7,1)");
      well.addColorStop(1, "rgba(4,5,7,0)");
      ctx.fillStyle = well;
      ctx.beginPath();
      ctx.arc(0, 0, core * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,250,235,${0.65 + open * 0.35})`;
      ctx.lineWidth = Math.max(0.8, size * 0.008);
      ctx.beginPath();
      ctx.arc(0, 0, core, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const tick = (_: number, ms: number) => {
      if (!visible) return;
      draw(Math.min(ms / 1000, 0.05));
      if (tilt) el.style.transform = `perspective(600px) rotateX(${st.rx.toFixed(2)}deg) rotateY(${st.ry.toFixed(2)}deg)`;
    };

    const enter = () => void (goal.open = 1);
    const leave = () => {
      goal.open = 0;
      gsap.to(st, { rx: 0, ry: 0, duration: 1, ease: "elastic.out(1, 0.45)" });
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.5)));
      const py = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.5)));
      gsap.to(st, { ry: px * 28, rx: -py * 28, duration: 0.6, ease: "power3.out", overwrite: "auto" });
    };
    const click = () => void (st.wave = 1);

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => void (visible = e.isIntersecting));
    io.observe(el);
    if (still) {
      visible = true;
      requestAnimationFrame(() => draw(0));
      visible = false;
    } else gsap.ticker.add(tick);
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("pointermove", move);
    host.addEventListener("click", click);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("click", click);
    };
  }, [tilt]);

  return (
    <span ref={wrap} className={cn("relative grid aspect-square place-items-center will-change-transform", className)}>
      <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
      {children && <span className="relative">{children}</span>}
    </span>
  );
}
