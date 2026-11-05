import { Big_Shoulders, Bricolage_Grotesque, Fraunces, Geist, Manrope, Saira } from "next/font/google";

// As mesmas fontes usadas nos sites reais. Sem pré-carregamento: só baixam na página que usa.
const saira = Saira({ variable: "--p-display", subsets: ["latin"], style: ["normal", "italic"], preload: false, display: "swap" });
const manrope = Manrope({ variable: "--p-body", subsets: ["latin"], preload: false, display: "swap" });
const bigShoulders = Big_Shoulders({ variable: "--p-display", subsets: ["latin"], weight: ["700", "800", "900"], preload: false, display: "swap" });
const geist = Geist({ variable: "--p-body", subsets: ["latin"], preload: false, display: "swap" });
const fraunces = Fraunces({ variable: "--p-display", subsets: ["latin"], style: ["normal", "italic"], preload: false, display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--p-body", subsets: ["latin"], preload: false, display: "swap" });

export const CASE_FONTS: Record<string, string> = {
  ourocar: `${saira.variable} ${manrope.variable}`,
  calhas: `${bigShoulders.variable} ${geist.variable}`,
  alquiverde: `${fraunces.variable} ${bricolage.variable}`,
  // China Glass usa Clash Display e Satoshi, da Fontshare: carregadas pela própria página
  chinaglass: "case-china",
};
