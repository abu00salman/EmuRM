import type { Metadata } from "next";
import { CuratedBrowser } from "@/components/curated/CuratedBrowser";

export const metadata: Metadata = {
  title: "Play now",
  description: "Free games with licenses that allow redistribution. Play in the browser, or open a ROM that stays on this device.",
};

export default function CuratedPage() {
  return <CuratedBrowser />;
}
