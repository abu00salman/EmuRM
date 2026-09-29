import type { FormFactor } from "@/lib/consoles/types";

/**
 * Line-art silhouettes by form factor — deliberately generic (no logos or trade dress),
 * so they read as "a handheld", "a disc console", never as a brand mark.
 */
export function DeviceGlyph({ form, className, strokeWidth = 1.4 }: { form: FormFactor; className?: string; strokeWidth?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true">
      {form === "home" && (
        <g {...common}>
          <path d="M14 40 h92 a6 6 0 0 1 6 6 v24 a6 6 0 0 1 -6 6 h-92 a6 6 0 0 1 -6 -6 v-24 a6 6 0 0 1 6 -6z" />
          <path d="M38 40 v-16 h44 v16" />
          <path d="M44 24 v-8 h32 v8" opacity=".55" />
          <path d="M20 64 h14 M20 58 h8" />
          <circle cx="92" cy="60" r="4" />
          <path d="M8 56 h104" opacity=".35" />
        </g>
      )}
      {form === "handheld-v" && (
        <g {...common}>
          <rect x="36" y="6" width="48" height="78" rx="6" />
          <rect x="43" y="13" width="34" height="28" rx="2" />
          <path d="M48 58 v10 M43 63 h10" />
          <circle cx="72" cy="60" r="3.2" />
          <circle cx="79" cy="55" r="3.2" />
          <path d="M53 76 l5 -2 M63 76 l5 -2" opacity=".7" />
        </g>
      )}
      {form === "handheld-h" && (
        <g {...common}>
          <path d="M22 22 h76 a18 18 0 0 1 18 18 v10 a18 18 0 0 1 -18 18 h-76 a18 18 0 0 1 -18 -18 v-10 a18 18 0 0 1 18 -18z" />
          <rect x="40" y="28" width="40" height="34" rx="2" />
          <path d="M20 45 h12 M26 39 v12" />
          <circle cx="94" cy="48" r="3.4" />
          <circle cx="101" cy="41" r="3.4" />
        </g>
      )}
      {form === "disc" && (
        <g {...common}>
          <rect x="10" y="30" width="100" height="44" rx="5" />
          <circle cx="60" cy="44" r="22" opacity=".45" />
          <circle cx="60" cy="44" r="5" opacity=".45" />
          <path d="M10 60 h100" opacity=".35" />
          <path d="M20 67 h10 M36 67 h10" />
          <circle cx="98" cy="66" r="2.5" />
        </g>
      )}
      {form === "computer" && (
        <g {...common}>
          <path d="M6 44 h108 l-8 34 h-92z" />
          <path d="M18 52 h84 M16 60 h88 M14 68 h92" opacity=".6" />
          <path d="M40 72 h40" />
          <rect x="84" y="30" width="22" height="14" rx="1.5" opacity=".7" />
          <path d="M84 36 h22" opacity=".5" />
        </g>
      )}
    </svg>
  );
}
