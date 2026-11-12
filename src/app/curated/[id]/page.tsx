import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CuratedDetail } from "@/components/curated/CuratedDetail";
import { CURATED_GAMES, getCurated } from "@/lib/curated/games";

export const dynamicParams = false;

export function generateStaticParams() {
  return CURATED_GAMES.map((game) => ({ id: game.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const game = getCurated((await params).id);
  if (!game) return { title: "Game" };
  return {
    title: game.title,
    description: game.description.en,
    openGraph: { title: game.title, description: game.description.en, type: "website" },
  };
}

export default async function CuratedGamePage({ params }: { params: Promise<{ id: string }> }) {
  const game = getCurated((await params).id);
  if (!game) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description.en,
    author: { "@type": "Person", name: game.author },
    gamePlatform: game.platform,
    license: game.license,
    url: game.sourceUrl,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="rm-container py-8" />}>
        <CuratedDetail game={game} />
      </Suspense>
    </>
  );
}
