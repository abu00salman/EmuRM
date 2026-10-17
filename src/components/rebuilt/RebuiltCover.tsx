import type { RebuiltGame } from "@/lib/rebuilt";

// Generated, not licensed artwork: EmuRM doesn't ship or hotlink game screenshots.
function hue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function RebuiltCover({ game, className = "" }: { game: RebuiltGame; className?: string }) {
  const h = hue(game.id);
  const title = game.title.replace(/\s*\(.*\)\s*$/, "");
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-end overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 70% 38%), hsl(${(h + 70) % 360} 65% 16%) 70%, #080c14)` }}
    >
      <span className="absolute end-3 top-3 rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wide" style={{ background: "rgb(0 0 0 / .45)", color: "#fff" }} dir="ltr">{game.platform}</span>
      <span className="p-4 font-display text-2xl font-extrabold leading-[0.95] text-white drop-shadow" dir="auto">{title}</span>
    </div>
  );
}
