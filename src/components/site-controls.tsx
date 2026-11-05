"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sound";
import { setWorld, subscribeWorld, worldIndex, WORLDS } from "@/lib/world";

// Botões de som e de mundo, usados no painel da home e nas páginas de projeto.
export function SiteControls({ worlds = true }: { worlds?: boolean }) {
  const [sound, setSound] = useState(false);
  const [world, setWorldState] = useState(0);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const offSound = sfx.subscribe(setSound);
    const offWorld = subscribeWorld(setWorldState);
    const id = requestAnimationFrame(() => {
      setSound(sfx.isOn());
      setWorldState(worldIndex());
    });
    return () => {
      cancelAnimationFrame(id);
      offSound();
      offWorld();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", close);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("pointerdown", close);
      removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className="site-controls">
      <button
        type="button"
        className="hud-icon"
        aria-label={sound ? "Desligar som" : "Ligar som"}
        data-tip={sound ? "Som ligado" : "Ligar som"}
        aria-pressed={sound}
        onClick={() => sfx.set(!sound)}
        onPointerEnter={() => sfx.hover()}
      >
        {sound ? (
          <span className="eq" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
        ) : (
          <svg viewBox="0 0 20 20" aria-hidden>
            <path d="M3.5 7.8v4.4h2.8L10 15.5v-11L6.3 7.8H3.5ZM13.5 8l4 4M17.5 8l-4 4" />
          </svg>
        )}
      </button>

      {worlds && (
      <div className="world-wrap">
        <button
          type="button"
          className="hud-icon"
          aria-label={`Mudar mundo de cor. Atual: ${WORLDS[world].name}`}
          data-tip={open ? "" : "Mundos de cor"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          onPointerEnter={() => sfx.hover()}
        >
          <span className="world-dot" aria-hidden style={{ background: `conic-gradient(${WORLDS[world].sig}, ${WORLDS[world].alt}, ${WORLDS[world].sig})` }} />
        </button>
        {open && (
          <div className="world-pop" role="radiogroup" aria-label="Mundos de cor">
            {WORLDS.map((w, i) => (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={i === world}
                aria-label={w.name}
                className="world-swatch"
                onClick={() => setWorld(i)}
                onPointerEnter={() => sfx.hover()}
              >
                <span aria-hidden style={{ background: `linear-gradient(135deg, ${w.sig}, ${w.alt})` }} />
                <em>{w.name}</em>
              </button>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
