// Everything the site says, in one place (same facts as the original DWdevs site).

export const LINKEDIN = "https://www.linkedin.com/in/dwdevs/";

export const NAV = [
  { id: "#sobre", label: "Sobre" },
  { id: "#servicos", label: "Serviços" },
  { id: "#stack", label: "Stack" },
  { id: "#projetos", label: "Projetos" },
  { id: "#processo", label: "Processo" },
  { id: "#contato", label: "Contato" },
];

/** The accent pairs the visitor can jump between. All four colours come from the brand palette. */
export const DIMENSIONS = [
  { id: "D-01", name: "Lima", acc: "#c8f031", acc2: "#1fd1ba" },
  { id: "D-02", name: "Ciano", acc: "#1fd1ba", acc2: "#8a5cff" },
  { id: "D-03", name: "Violeta", acc: "#a07bff", acc2: "#ff5fa2" },
  { id: "D-04", name: "Rosa", acc: "#ff5fa2", acc2: "#c8f031" },
];

export const SUMMARY = [
  {
    q: "O que fazemos",
    a: "Sites completos para empresas: página de apresentação, landing page para campanha ou vitrine de produtos. Design exclusivo, nada de modelo pronto.",
  },
  {
    q: "Para quem",
    a: "Negócios e profissionais que precisam ser encontrados no Google e passar confiança logo no primeiro clique, no celular ou no computador.",
  },
  {
    q: "Como funciona",
    a: "Você conta o que precisa, aprova um protótipo e recebe o site publicado, com domínio, WhatsApp e formulários funcionando.",
  },
];

export const ABOUT =
  "Somos um estúdio pequeno de propósito. Dois desenvolvedores cuidando de cada projeto, do primeiro rascunho ao deploy, sem intermediários, sem template e sem pressa de entregar o genérico.";

export const FOUNDERS = [
  { initial: "D", first: "Davi", last: "Carvalho", role: "Co-fundador" },
  { initial: "W", first: "William", last: "Cristian", role: "Co-fundador" },
];

export const STATS = [
  { v: 4, suffix: "", label: "sites no ar" },
  { v: 2, suffix: "", label: "devs dedicados" },
  { v: 100, suffix: "%", label: "código sob medida" },
  { v: 0, suffix: "", label: "templates prontos" },
];

export const BAND = ["Sites institucionais", "Landing pages", "Experiências 3D", "Web design", "UX", "Animações de scroll", "SEO", "Performance"];

export const SERVICES = [
  {
    n: "01",
    title: "Sites institucionais",
    text: "A cara da sua empresa na internet. Um site que transmite confiança, conta sua história e aparece no Google.",
    items: ["SEO técnico", "Performance", "Responsivo", "Integração com WhatsApp"],
  },
  {
    n: "02",
    title: "Landing pages",
    text: "Páginas pensadas para converter: carregamento instantâneo, mensagem clara e um caminho direto até o contato.",
    items: ["Copy e estrutura", "Formulários", "Analytics", "Testes A/B"],
  },
  {
    n: "03",
    title: "Sites 3D interativos",
    text: "Produtos que giram, cenas WebGL e animações de scroll que fazem o visitante parar e explorar.",
    items: ["Three.js / WebGL", "Scroll storytelling", "Modelos 3D", "Micro-interações"],
  },
  {
    n: "04",
    title: "Web design & UX",
    text: "Direção visual, tipografia e fluxos pensados para quem vai usar. Protótipo antes do código.",
    items: ["UI design", "Protótipos", "Design system", "Acessibilidade"],
  },
];

export const STACK = [
  { group: "Front-end", items: ["Next.js", "React", "TypeScript", "Tailwind CSS", "shadcn/ui"] },
  { group: "Motion & 3D", items: ["Three.js", "React Three Fiber", "GSAP + ScrollTrigger", "Motion", "Lenis", "GLSL"] },
  { group: "Back-end & dados", items: ["Node.js", "Supabase", "APIs e integrações"] },
  { group: "Design & entrega", items: ["Figma", "Vercel", "Git", "SEO técnico"] },
];

export const PROJECTS = [
  {
    name: "AlquiVerde",
    kind: "E-commerce · Kits de presente",
    url: "https://kitpresentealquiverde.com.br/",
    host: "kitpresentealquiverde.com.br",
    img: "/projects/alquiverde.jpg",
    text: "Vitrine de Natal para cosméticos naturais, com seletor de kits que gira ao arrastar, montagem de kit personalizado e clima editorial.",
    tags: ["E-commerce", "Interação", "Direção de arte"],
    accent: "#8b2d3a",
  },
  {
    name: "Ourocar Veículos",
    kind: "Concessionária · Ubá, MG",
    url: "https://ourocarsite.vercel.app/",
    host: "ourocarsite.vercel.app",
    img: "/projects/ourocar.jpg",
    text: "Site para revenda de veículos com carro 3D dourado no destaque, showroom e atendimento direto pelo WhatsApp.",
    tags: ["3D", "Automotivo", "Conversão"],
    accent: "#f2c230",
  },
  {
    name: "China Glass",
    kind: "Indústria · B2B",
    url: "https://site-beta-eight-21.vercel.app/",
    host: "chinaglass",
    img: "/projects/chinaglass.jpg",
    text: "Catálogo de máquinas para a indústria do vidro, com diamante 3D, cristais flutuantes e versão em mais de um idioma.",
    tags: ["WebGL", "Catálogo", "Multi-idioma"],
    accent: "#4aa8ff",
  },
  {
    name: "Calhas Afonsina",
    kind: "Serviços · Grande ABCD",
    url: "https://calhas-afonsina.vercel.app/",
    host: "calhas-afonsina.vercel.app",
    img: "/projects/calhas.jpg",
    text: "Site institucional para funilaria com 21 anos de história: tipografia forte, processo chapa → dobra → calha e orçamento pelo WhatsApp.",
    tags: ["Institucional", "Motion", "SEO local"],
    accent: "#e5432b",
  },
];

export const STEPS = [
  { t: "Conversa", d: "Entendemos o seu negócio, o público e o que o site precisa resolver." },
  { t: "Design", d: "Direção visual, estrutura das páginas e protótipo para você aprovar antes do código." },
  { t: "Desenvolvimento", d: "Código sob medida, animações, 3D quando faz sentido, e tudo rápido no celular." },
  { t: "Lançamento", d: "Publicação, SEO, domínio e acompanhamento depois que o site vai ao ar." },
];
