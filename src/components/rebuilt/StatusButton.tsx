"use client";
import { useT } from "@/lib/i18n";
import { actionUrl, statusOf, type RebuiltGame } from "@/lib/rebuilt";

/** The only place a Play/Import/View action is rendered, so a button can't outrun its status. */
export function StatusButton({ game, className = "" }: { game: RebuiltGame; className?: string }) {
  const t = useT();
  const status = statusOf(game);
  const label = t(`rebuilt.status.${status}` as const);
  if (status === "soon") {
    return <span aria-disabled="true" className={`inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm text-muted ${className}`}>{label}</span>;
  }
  const primary = status === "play" || status === "import";
  return (
    <a
      href={actionUrl(game)}
      target="_blank"
      rel="noopener noreferrer"
      data-nav
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${primary ? "bg-white text-black hover:bg-white/90" : "border border-white/20 hover:bg-white/10"} ${className}`}
    >
      {label} <span aria-hidden="true">↗</span>
    </a>
  );
}
