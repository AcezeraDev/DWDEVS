// Fatos vindos do portfólio DWdevs anterior. Nada aqui foi inventado.
export const LINKEDIN = "https://www.linkedin.com/in/dwdevs/";

export const NAV = [
  { href: "#sobre", label: "Sobre" },
  { href: "#servicos", label: "Serviços" },
  { href: "#stack", label: "Stack" },
  { href: "#projetos", label: "Projetos" },
  { href: "#processo", label: "Processo" },
];

export const STATS = [
  { v: "4", label: "sites no ar" },
  { v: "2", label: "devs dedicados" },
  { v: "100%", label: "código sob medida" },
  { v: "0", label: "templates prontos" },
];

export const BAND = ["Sites institucionais", "Landing pages", "Experiências 3D", "Web design", "UX", "Animações de scroll", "SEO", "Performance"];

export const ABOUT =
  "Somos um estúdio pequeno de propósito. Dois desenvolvedores cuidando de cada projeto, do primeiro rascunho ao deploy, sem intermediários, sem template e sem pressa de entregar o genérico.";

export const FOUNDERS = [
  { initial: "D", name: "Davi Carvalho", role: "Co-fundador", color: "var(--sig)" },
  { initial: "W", name: "William Cristian", role: "Co-fundador", color: "var(--amber)" },
];

export const SUMMARY = [
  { q: "O que fazemos", a: "Sites completos para empresas: página de apresentação, landing page para campanha ou vitrine de produtos. Design exclusivo, nada de modelo pronto." },
  { q: "Para quem", a: "Negócios e profissionais que precisam ser encontrados no Google e passar confiança logo no primeiro clique, no celular ou no computador." },
  { q: "Como funciona", a: "Você conta o que precisa, aprova um protótipo e recebe o site publicado, com domínio, WhatsApp e formulários funcionando." },
];

export const SERVICES = [
  { n: "01", title: "Sites institucionais", text: "A cara da sua empresa na internet. Um site que transmite confiança, conta sua história e aparece no Google.", items: ["SEO técnico", "Performance", "Responsivo", "Integração com WhatsApp"] },
  { n: "02", title: "Landing pages", text: "Páginas pensadas para converter: carregamento instantâneo, mensagem clara e um caminho direto até o contato.", items: ["Copy e estrutura", "Formulários", "Analytics", "Testes A/B"] },
  { n: "03", title: "Sites 3D interativos", text: "Produtos que giram, cenas WebGL e animações de scroll que fazem o visitante parar e explorar.", items: ["Three.js / WebGL", "Scroll storytelling", "Modelos 3D", "Micro-interações"] },
  { n: "04", title: "Web design & UX", text: "Direção visual, tipografia e fluxos pensados para quem vai usar. Protótipo antes do código.", items: ["UI design", "Protótipos", "Design system", "Acessibilidade"] },
];

export const STACK = [
  { group: "front-end", items: ["Next.js", "React", "TypeScript", "Tailwind CSS", "shadcn/ui"] },
  { group: "motion-3d", items: ["Three.js", "React Three Fiber", "GSAP + ScrollTrigger", "Motion", "Lenis", "GLSL"] },
  { group: "back-end", items: ["Node.js", "Supabase", "APIs e integrações"] },
  { group: "entrega", items: ["Figma", "Vercel", "Git", "SEO técnico"] },
];

export type Project = {
  slug: string;
  name: string;
  kind: string;
  url: string;
  img: string;
  w: number;
  h: number;
  text: string;
  tags: string[];
  /** Opcionais: aparecem na página do projeto quando preenchidos. Use apenas informação real. */
  logo?: string;
  /** Identidade do site real, lida do projeto e do site no ar. */
  theme: {
    bg: string;
    fg: string;
    accent: string;
    on: string;
    muted: string;
    line: string;
    panel: string;
    light?: boolean;
    titleWeight: number;
    leadWeight: number;
    titleItalic?: boolean;
    titleUpper?: boolean;
  };
  /** Números que já aparecem no próprio site do cliente. */
  facts?: { value: string; label: string }[];
  challenge?: string;
  result?: string;
};

export const PROJECTS: Project[] = [
  { slug: "alquiverde", logo: "/projects/alquiverde/logo.webp", theme: { bg: "#f7f0e3", fg: "#752f3b", accent: "#752f3b", on: "#fffcf5", muted: "#8f6168", line: "rgba(117,47,59,.2)", panel: "#fffaf0", light: true, titleWeight: 600, leadWeight: 500 }, name: "AlquiVerde", kind: "E-commerce · Kits de presente", url: "https://kitpresentealquiverde.com.br/", img: "/projects/alquiverde.jpg", w: 800, h: 505, text: "Vitrine de Natal para cosméticos naturais, com seletor de kits que gira ao arrastar, montagem de kit personalizado e clima editorial.", tags: ["E-commerce", "Interação", "Direção de arte"] },
  { slug: "ourocar", logo: "/projects/ourocar/logo.jpg", facts: [{ value: "+2.000", label: "carros vendidos" }], theme: { bg: "#050505", fg: "#f6f1e4", accent: "#f6d846", on: "#000000", muted: "#a59f8e", line: "rgba(246,216,70,.22)", panel: "#0f0e0b", titleWeight: 900, leadWeight: 500, titleItalic: true, titleUpper: true }, name: "Ourocar Veículos", kind: "Concessionária · Ubá, MG", url: "https://ourocarsite.vercel.app/", img: "/projects/ourocar.jpg", w: 800, h: 500, text: "Site para revenda de veículos com carro 3D dourado no destaque, showroom e atendimento direto pelo WhatsApp.", tags: ["3D", "Automotivo", "Conversão"] },
  { slug: "chinaglass", facts: [{ value: "1 ano", label: "de garantia" }], theme: { bg: "#05080f", fg: "#e8eef7", accent: "#ffffff", on: "#05080f", muted: "#8b98ad", line: "rgba(143,233,255,.2)", panel: "#0a1120", titleWeight: 600, leadWeight: 500 }, name: "China Glass", kind: "Indústria · B2B", url: "https://site-beta-eight-21.vercel.app/", img: "/projects/chinaglass.jpg", w: 800, h: 500, text: "Catálogo de máquinas para a indústria do vidro, com diamante 3D, cristais flutuantes e versão em mais de um idioma.", tags: ["WebGL", "Catálogo", "Multi-idioma"] },
  { slug: "calhas", logo: "/projects/calhas/logo.png", facts: [{ value: "21 anos", label: "de história" }], theme: { bg: "#0b0a0a", fg: "#e9e6e2", accent: "#e33926", on: "#ffffff", muted: "#8a9097", line: "rgba(227,57,38,.28)", panel: "#141212", titleWeight: 800, leadWeight: 500, titleUpper: true }, name: "Calhas Afonsina", kind: "Serviços · Grande ABCD", url: "https://calhas-afonsina.vercel.app/", img: "/projects/calhas.jpg", w: 800, h: 505, text: "Site institucional para funilaria com 21 anos de história: tipografia forte, processo chapa → dobra → calha e orçamento pelo WhatsApp.", tags: ["Institucional", "Motion", "SEO local"] },
];

export const STEPS = [
  { t: "Conversa", d: "Entendemos o seu negócio, o público e o que o site precisa resolver." },
  { t: "Design", d: "Direção visual, estrutura das páginas e protótipo para você aprovar antes do código." },
  { t: "Desenvolvimento", d: "Código sob medida, animações, 3D quando faz sentido, e tudo rápido no celular." },
  { t: "Lançamento", d: "Publicação, SEO, domínio e acompanhamento depois que o site vai ao ar." },
];
