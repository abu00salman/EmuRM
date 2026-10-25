import type { Metadata } from "next";
import { ClassicsBrowser } from "@/components/classics/ClassicsBrowser";

export const metadata: Metadata = {
  title: "EmuRM Classics",
  description: "Free, openly licensed classic games you can play right now in your browser: Freedoom, NES, SNES, Mega Drive, Game Boy homebrew.",
  openGraph: { title: "EmuRM Classics", description: "Free classic games, playable instantly in your browser.", images: [{ url: "classics/freedoom1/cover.png", width: 640, height: 480 }] },
};

export default function ClassicsPage() {
  return <ClassicsBrowser />;
}
