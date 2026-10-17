import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { REBUILT_GAMES, getRebuilt } from "@/lib/rebuilt";
import { RebuiltDetail } from "@/components/rebuilt/RebuiltDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return REBUILT_GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const g = getRebuilt((await params).id);
  return { title: g ? g.title : "Rebuilt game" };
}

export default async function RebuiltGamePage({ params }: { params: Promise<{ id: string }> }) {
  const g = getRebuilt((await params).id);
  if (!g) notFound();
  return <RebuiltDetail game={g} />;
}
