"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FOUNDERS, LINKEDIN, PROJECTS, SERVICES, STACK } from "@/lib/content";
import { sfx } from "@/lib/sound";
import { burst, SHAPES, stage } from "@/lib/stage";
import { setWorldById, WORLDS } from "@/lib/world";

type Line = { id: number; node: ReactNode };

const CHIPS = ["ajuda", "projetos", "forma nó", "mundo violeta", "som", "explodir"];

const FORMS: Record<string, number> = { janela: SHAPES.browser, funil: SHAPES.funnel, "nó": SHAPES.knot, no: SHAPES.knot, cursor: SHAPES.cursor, dw: SHAPES.dw };

function stackOutput() {
  return (
    <>
      {STACK.map((g) => (
        <span key={g.group} className="block">
          <span className="text-sig">{g.group}</span> <span className="text-paper/80">{g.items.join(" · ")}</span>
        </span>
      ))}
    </>
  );
}

export function Terminal() {
  const [lines, setLines] = useState<Line[]>([{ id: 0, node: stackOutput() }]);
  const [value, setValue] = useState("");
  const id = useRef(1);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const history = useRef<string[]>([]);
  const cursor = useRef(0);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [lines]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const setShape = (shape: number) => {
    stage.shapeOverride = shape;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => (stage.shapeOverride = null), 9000);
  };

  const exec = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    history.current.push(raw);
    cursor.current = history.current.length;
    if (cmd === "limpar" || cmd === "clear") {
      setLines([]);
      return;
    }
    const [head, ...rest] = cmd.split(/\s+/);
    let out: ReactNode;
    switch (head) {
      case "ajuda":
      case "help":
        out = (
          <>
            <span className="block">stack · sobre · servicos · projetos · contato</span>
            <span className="block">forma janela | funil | nó | cursor | dw</span>
            <span className="block">mundo verde | lima | ciano | violeta | rosa</span>
            <span className="block">som · explodir · construir · limpar</span>
          </>
        );
        break;
      case "stack":
        out = stackOutput();
        break;
      case "sobre":
      case "whoami":
        out = FOUNDERS.map((f) => (
          <span key={f.name} className="block">
            {f.name}, {f.role.toLowerCase()}
          </span>
        ));
        break;
      case "servicos":
      case "serviços":
        out = SERVICES.map((s) => (
          <span key={s.n} className="block">
            <span className="text-sig">{s.n}</span> {s.title}
          </span>
        ));
        break;
      case "projetos":
      case "ls":
        out = PROJECTS.map((p) => (
          <a key={p.name} href={`/projetos/${p.slug}`} data-fly-case={p.slug} className="block underline decoration-line underline-offset-4 hover:text-sig">
            {p.name} ↗
          </a>
        ));
        break;
      case "contato":
        out = (
          <a href={LINKEDIN} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-sig">
            linkedin.com/in/dwdevs ↗
          </a>
        );
        break;
      case "forma": {
        const shape = FORMS[rest[0] ?? ""];
        if (shape === undefined) {
          out = "use: forma janela | funil | nó | cursor | dw";
        } else {
          setShape(shape);
          out = stage.reduced || innerWidth < 768 ? `partículas: ${rest[0]}` : `partículas: ${rest[0]} (olhe atrás do título)`;
        }
        break;
      }
      case "explodir":
        burst(-0.45, 0.1);
        out = "boom.";
        break;
      case "construir":
        out = "reconstruindo a página…";
        setTimeout(() => {
          scrollTo(0, 0);
          location.reload();
        }, 500);
        break;
      case "mundo": {
        const ok = setWorldById(rest[0] ?? "");
        out = ok ? `mundo ${rest[0]} ativado` : `use: mundo ${WORLDS.map((w) => w.id).join(" | ")}`;
        break;
      }
      case "som":
        sfx.set(!sfx.isOn());
        out = sfx.isOn() ? "som ligado" : "som desligado";
        break;
      case "sudo":
        out = "permissão negada. Aqui quem decide é o cliente.";
        break;
      default:
        out = `comando não encontrado: ${head}. Digite "ajuda".`;
    }
    setLines((l) => [
      ...l,
      {
        id: id.current++,
        node: (
          <>
            <span className="block text-muted">
              <span className="text-sig">dw</span> $ {raw}
            </span>
            <span className="block text-paper/85">{out}</span>
          </>
        ),
      },
    ]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    exec(value);
    setValue("");
  };

  return (
    <div className="term overflow-hidden font-mono text-[13px] leading-6">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-muted">
        <span>dwdevs ~ terminal</span>
        <span className="flex gap-1.5" aria-hidden>
          <i className="size-2 rounded-full bg-amber" />
          <i className="size-2 rounded-full bg-sig" />
        </span>
      </div>
      <div ref={box} data-lenis-prevent role="log" aria-live="polite" className="h-64 space-y-2 overflow-y-auto px-4 py-3 md:h-72">
        {lines.map((l) => (
          <div key={l.id}>{l.node}</div>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5">
        <label htmlFor="term-input" className="text-sig">
          dw $
        </label>
        <input
          id="term-input"
          value={value}
          onChange={(e) => {
            sfx.key();
            setValue(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && history.current.length) {
              e.preventDefault();
              cursor.current = Math.max(0, cursor.current - 1);
              setValue(history.current[cursor.current]);
            }
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder='digite "ajuda"'
          className="min-w-0 flex-1 bg-transparent py-1 text-paper outline-none placeholder:text-muted"
        />
      </form>
      <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-4 py-3">
        {CHIPS.map((c) => (
          <button key={c} type="button" onClick={() => exec(c)} className="term-chip">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
