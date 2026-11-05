// Estado mutável das cenas 3D. Escrito pelo scroll e pelo mouse, lido a cada quadro: nunca passa pelo React.
export type StageState = {
  x: number; // pilha de camadas: fração da largura da tela
  y: number; // pilha de camadas: fração da altura da tela
  scale: number;
  explode: number; // distância entre as camadas
  rx: number;
  ry: number;
  opacity: number;
  reveal: number; // 0 a 8: quantas camadas já foram desenhadas
  flat: number; // 1 = todas as camadas viraram a página final
  dx: number; // partículas
  dy: number;
  ds: number;
  dOp: number;
  objs: number; // objetos 3D soltos
  blocks: number; // piso de blocos
  jOp: number; // jornada 3D do processo
};

export const SHAPES = { dust: 0, browser: 1, funnel: 2, knot: 3, cursor: 4, dw: 5 } as const;

export const stage: StageState & {
  intro: number;
  bgPaused: boolean;
  peel: number; // de 0 a 1: as camadas se separam ao rolar do início até Serviços
  sceneReady: boolean;
  stack: number; // 1 = pilha normal; abaixo disso, comprimida para o impacto da abertura
  introFloor: number;
  introObjs: number;
  journey: number; // de 0 a 4, um capítulo por etapa
  jExit: number; // de 0 a 1: o notebook decola ao sair da jornada
  px: number;
  py: number;
  hasMouse: boolean;
  hoverLabel: string;
  sc: number;
  scroll01: number;
  clickX: number;
  clickY: number;
  clickT: number;
  shape: number;
  shapeOverride: number | null;
  reduced: boolean;
  low: boolean; // máquina fraca: menos trabalho por quadro
} = {
  x: 0.015,
  y: -0.09,
  scale: 1,
  explode: 1,
  rx: 0.62,
  ry: -0.62,
  opacity: 1,
  reveal: 8,
  flat: 0,
  dx: 0,
  dy: 0,
  ds: 1,
  dOp: 0.75,
  objs: 1,
  blocks: 1,
  jOp: 0,
  journey: 0,
  jExit: 0,
  intro: 8,
  bgPaused: false,
  peel: 0,
  sceneReady: false,
  stack: 1,
  introFloor: 1,
  introObjs: 1,
  px: 0,
  py: 0,
  hasMouse: false,
  hoverLabel: "",
  sc: 0,
  scroll01: 0,
  clickX: 0,
  clickY: 0,
  clickT: -1000,
  shape: 0,
  shapeOverride: null,
  reduced: false,
  low: false,
};

/** Dispara uma onda de choque nas partículas e no fundo, em coordenadas de -1 a 1. */
export function burst(x = 0, y = 0) {
  stage.clickX = x;
  stage.clickY = y;
  stage.clickT = performance.now() / 1000;
}
