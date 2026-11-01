import type { Metadata } from "next";
import { Experience } from "@/components/experience";

// The first version of the site, kept for reference; the home page is the /multiverso design now.
export const metadata: Metadata = {
  title: "DWdevs — versão original",
  robots: { index: false },
};

export default function Original() {
  return <Experience />;
}
