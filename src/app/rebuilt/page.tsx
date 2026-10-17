import type { Metadata } from "next";
import { RebuiltBrowser } from "@/components/rebuilt/RebuiltBrowser";

export const metadata: Metadata = { title: "Rebuilt Games" };

export default function RebuiltPage() {
  return <RebuiltBrowser />;
}
