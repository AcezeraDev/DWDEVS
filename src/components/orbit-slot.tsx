"use client";

import dynamic from "next/dynamic";

// O anel só carrega no navegador: depende de WebGL e fica fora da primeira dobra.
export const OrbitSlot = dynamic(() => import("./project-orbit"), {
  ssr: false,
  loading: () => <div className="h-[52vh] min-h-[320px] md:h-[72vh]" />,
});
