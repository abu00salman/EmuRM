import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CLASSICS, getClassic } from "@/lib/classics/catalog";
import { getConsole } from "@/lib/consoles/registry";
import { ClassicDetail } from "@/components/classics/ClassicDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return CLASSICS.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const g = getClassic((await params).id);
  if (!g) return { title: "Classic" };
  const system = getConsole(g.console)?.name ?? g.console;
  const description = `Play ${g.title} (${system}, ${g.year}) free in your browser on EmuRM. ${g.description.en}`;
  return {
    title: `${g.title} — play free online`,
    description,
    alternates: { canonical: `classics/${g.id}/` },
    openGraph: { title: `${g.title} · EmuRM Classics`, description, type: "website", url: `classics/${g.id}/`, images: [{ url: `classics/${g.id}/cover.png`, alt: g.title }] },
    twitter: { card: "summary_large_image", title: g.title, description, images: [`classics/${g.id}/cover.png`] },
  };
}

export default async function ClassicPage({ params }: { params: Promise<{ id: string }> }) {
  const g = getClassic((await params).id);
  if (!g) notFound();
  return <ClassicDetail g={g} />;
}
