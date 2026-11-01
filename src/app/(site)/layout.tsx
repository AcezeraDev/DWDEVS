import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./multiverso.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DWdevs — Sites de outra dimensão",
  description:
    "A DWdevs cria sites sob medida para empresas: institucionais, landing pages e experiências 3D interativas. Dois desenvolvedores, do primeiro contato ao site no ar. Mauá, SP.",
};

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <div className={`${unbounded.variable} mv`}>{children}</div>;
}
