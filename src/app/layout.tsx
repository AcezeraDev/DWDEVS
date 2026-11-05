import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Instrument_Sans } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

const display = Fraunces({ variable: "--font-big", subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "WONK", "opsz"], display: "swap" });
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-code", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "DWdevs · Sites feitos sob medida",
  description: "Criamos sites rápidos, bonitos e feitos sob medida: institucionais, landing pages e experiências 3D interativas. Mauá, SP.",
};

// Só esconde o conteúdo para a montagem se o JavaScript rodar e o visitante aceitar movimento.
// Se o bundle falhar, o timer devolve a página inteira.
const boot = `(function(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.classList.add('js');setTimeout(function(){if(!window.__dwBuild)d.classList.remove('js')},5000)})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <Shell />
        {children}
      </body>
    </html>
  );
}
