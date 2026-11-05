import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseView } from "@/components/case-view";
import { CASE_FONTS } from "@/lib/case-fonts";
import { PROJECTS } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) return {};
  return {
    title: `${project.name} · DWdevs`,
    description: project.text,
    openGraph: { title: `${project.name} · DWdevs`, description: project.text, images: [`/projects/${project.slug}/d1.jpg`] },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const index = PROJECTS.findIndex((p) => p.slug === slug);
  if (index < 0) notFound();
  return (
    <>
      {slug === "chinaglass" && <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600&f[]=satoshi@400,500&display=swap" />}
      <CaseView key={slug} project={PROJECTS[index]} index={index} fontClass={CASE_FONTS[slug] ?? ""} />
    </>
  );
}
