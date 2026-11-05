// Sons sintetizados na hora com a Web Audio: nenhum arquivo para baixar.
// Sempre desligados até o visitante ativar, e a escolha fica salva neste navegador.

type Listener = (on: boolean) => void;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
const listeners = new Set<Listener>();
const lastPlayed = new Map<string, number>();

// Pentatônica: qualquer sequência de notas soa bem junta
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];

const KEY = "dw-sound";

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* navegação privada: a escolha só não fica salva */
  }
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  master = ctx.createGain();
  master.gain.value = 0.42;
  master.connect(comp);
  comp.connect(ctx.destination);
  return ctx;
}

/** Evita metralhadora de sons quando muitos eventos chegam juntos. */
function allow(name: string, gap: number) {
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -1e9) < gap) return false;
  lastPlayed.set(name, now);
  return true;
}

function ready() {
  if (!enabled) return null;
  const c = ensure();
  if (!c || !master) return null;
  if (c.state === "suspended") void c.resume();
  return c;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number; delay?: number; attack?: number } = {}) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + (opts.delay ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  const peak = opts.gain ?? 0.2;
  const attack = opts.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, opts: { from: number; to: number; gain?: number; q?: number; delay?: number; attack?: number }) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + (opts.delay ?? 0);
  const size = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, size, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = opts.q ?? 1.2;
  f.frequency.setValueAtTime(opts.from, t);
  f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  const g = c.createGain();
  const peak = opts.gain ?? 0.14;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + (opts.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master!);
  src.start(t);
}

export const sfx = {
  isOn: () => enabled,
  /** Lê a preferência salva. O navegador só libera o áudio depois de um gesto do visitante. */
  init() {
    enabled = read();
    listeners.forEach((l) => l(enabled));
  },
  set(on: boolean) {
    enabled = on;
    write(on);
    listeners.forEach((l) => l(on));
    if (on) {
      tone(523.25, 0.14, { gain: 0.14 });
      tone(783.99, 0.28, { gain: 0.14, delay: 0.09 });
    }
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  /** Clique de cursor. */
  tick() {
    if (allow("tick", 45)) tone(1500 + Math.random() * 500, 0.05, { type: "triangle", gain: 0.05 });
  },
  /** Bloco montado: cada um é uma nota. */
  place(i: number) {
    if (!allow("place", 70)) return;
    const f = SCALE[Math.abs(i) % SCALE.length];
    tone(f, 0.22, { type: "triangle", gain: 0.09 });
    tone(f * 2, 0.12, { gain: 0.03, delay: 0.015 });
  },
  /** Camada pousando na pilha. */
  land(i: number) {
    tone(150 - i * 8, 0.16, { to: 58, gain: 0.26 });
    tone(SCALE[i % SCALE.length], 0.24, { type: "triangle", gain: 0.06, delay: 0.01 });
  },
  /** Borracha esfregando. */
  erase() {
    if (allow("erase", 180)) noise(0.5, { from: 2600, to: 1400, gain: 0.05, q: 0.8 });
  },
  /** Impacto final da abertura. */
  boom() {
    tone(90, 0.75, { to: 32, gain: 0.5 });
    noise(0.65, { from: 2400, to: 160, gain: 0.2, q: 0.6 });
    [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, 0.75, { type: "triangle", gain: 0.05, delay: 0.05 + i * 0.05 }));
  },
  /** Passagem rápida: transições de página e anel. */
  whoosh() {
    if (allow("whoosh", 200)) noise(0.42, { from: 300, to: 2600, gain: 0.09, q: 0.7, attack: 0.16 });
  },
  /** Troca de capítulo na jornada. */
  chapter(i: number) {
    if (!allow("chapter", 260)) return;
    tone(SCALE[2 + i * 2], 0.42, { type: "sine", gain: 0.12 });
    tone(SCALE[4 + i * 2], 0.42, { type: "sine", gain: 0.07, delay: 0.07 });
  },
  /** Decolagem do notebook. */
  launch() {
    if (!allow("launch", 900)) return;
    noise(1.15, { from: 200, to: 3000, gain: 0.12, q: 0.6, attack: 0.5 });
    tone(110, 1.15, { to: 460, type: "sawtooth", gain: 0.03, attack: 0.35 });
  },
  /** Acorde de comemoração. */
  success() {
    if (!allow("success", 900)) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.5, { type: "triangle", gain: 0.08, delay: i * 0.075 }));
  },
  /** Mudança de mundo: subida diferente para cada um. */
  world(i: number) {
    const root = [261.63, 293.66, 329.63, 392, 440][i % 5];
    [1, 1.25, 1.5, 2].forEach((m, k) => tone(root * m, 0.55, { gain: 0.07, delay: k * 0.06, attack: 0.02 }));
    noise(0.5, { from: 500, to: 3600, gain: 0.05, q: 0.7, attack: 0.15 });
  },
  /** Passar o mouse em um botão. */
  hover() {
    if (allow("hover", 90)) tone(1040, 0.05, { gain: 0.022 });
  },
  /** Tecla do terminal. */
  key() {
    if (allow("key", 25)) noise(0.035, { from: 3400, to: 2400, gain: 0.05, q: 2, attack: 0.002 });
  },
};
