import type { CSSProperties } from "react";

// Enfeites sem conteúdo: leitores de tela ignoram todos.
// Valores gerados por fórmula para o servidor e o navegador renderizarem igual.
const pseudo = (i: number, seed: number) => {
  const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

const TONES = ["var(--sig)", "var(--cyan)", "var(--line)", "var(--line)", "var(--violet)", "var(--line)", "var(--amber)", "var(--line)"];

export function BlockBand({ seed = 1, count = 72, className }: { seed?: number; count?: number; className?: string }) {
  return (
    <div className={`band ${className ?? ""}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--d": `${(-(i * 0.09) - pseudo(i, seed) * 0.5).toFixed(2)}s`,
              "--h": (0.25 + pseudo(i, seed + 3) * 0.75).toFixed(2),
              "--b": TONES[Math.floor(pseudo(i, seed + 5) * TONES.length)],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function Mosaic({ n = 6, rows = 4, seed = 1, className, style }: { n?: number; rows?: number; seed?: number; className?: string; style?: CSSProperties }) {
  return (
    <div className={`mosaic ${className ?? ""}`} style={{ "--n": n, ...style } as CSSProperties} aria-hidden>
      {Array.from({ length: n * rows }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--d": `${(-pseudo(i, seed) * 4.2).toFixed(2)}s`,
              "--b": ["var(--sig)", "var(--cyan)", "var(--violet)", "var(--sig)", "var(--amber)"][Math.floor(pseudo(i, seed + 2) * 5)],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function Badge({ text, id, size = 124, className }: { text: string; id: string; size?: number; className?: string }) {
  return (
    <div className={`relative shrink-0 ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 124 124" className="badge size-full">
        <defs>
          <path id={id} d="M62 62m-48 0a48 48 0 1 1 96 0a48 48 0 1 1-96 0" />
        </defs>
        <text>
          <textPath href={`#${id}`}>{text}</textPath>
        </text>
      </svg>
      <span className="absolute inset-0 grid place-items-center text-2xl text-sig">✳</span>
    </div>
  );
}

export function Plus({ style, d = 0 }: { style: CSSProperties; d?: number }) {
  return <span className="plus" aria-hidden style={{ ...style, "--d": `${d}s` } as CSSProperties} />;
}

export function Ghost({ n, style }: { n: string; style: CSSProperties }) {
  return (
    <span className="ghost" data-ghost aria-hidden style={style}>
      {n}
    </span>
  );
}
