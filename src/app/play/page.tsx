import type { Metadata } from "next";
import { Suspense } from "react";
import { Player } from "@/components/player/Player";

export const metadata: Metadata = { title: "Playing" };

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <Player />
    </Suspense>
  );
}
