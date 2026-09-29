import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CONSOLES, getConsole } from "@/lib/consoles/registry";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { LibraryBrowser } from "@/components/LibraryBrowser";

export const dynamicParams = false;

export function generateStaticParams() {
  return CONSOLES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = getConsole((await params).id);
  return { title: c ? `${c.name} library` : "Console" };
}

export default async function ConsolePage({ params }: { params: Promise<{ id: string }> }) {
  const c = getConsole((await params).id);
  if (!c) notFound();
  return (
    <div style={{ ["--accent" as string]: c.accent }}>
      <ConsoleHeader id={c.id} />
      <div className="mx-auto max-w-[1600px] px-[max(1rem,var(--safe-l))] pb-24 sm:px-8">
        <LibraryBrowser consoleId={c.id} />
      </div>
    </div>
  );
}
