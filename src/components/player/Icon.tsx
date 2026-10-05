const paths = {
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14M13 6l6 6-6 6",
  library: "M4 4h5v16H4zM12 4h4l4 15-4 1z",
  discover: "M12 3a9 9 0 100 18 9 9 0 000-18zM15 9l-2 4-4 2 2-4z",
  settings: "M4 7h16M4 17h16M9 4v6M15 14v6",

  back: "M15 5l-7 7 7 7",
  ff: "M4 6v12l8-6zM12 6v12l8-6z",
  save: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6",
  load: "M12 4v11M7 10l5 5 5-5M5 20h14",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  shrink: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5",
  menu: "M4 7h16M4 12h16M4 17h16",
  play: "M7 4v16l13-8z",
  restart: "M4 12a8 8 0 108-8H8M8 1L4 4l4 3",
  close: "M6 6l12 12M18 6L6 18",
  stick: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z",
  airplay: "M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM12 14l5 6H7z",
  gamepad: "M7 9h3M8.5 7.5v3M14.5 10h.01M17 8h.01M6 6h12a4 4 0 014 4v4a3 3 0 01-5.5 1.7L15 14H9l-1.5 1.7A3 3 0 012 15.5v-5.5a4 4 0 014-4z",
} as const;

export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof paths; className?: string }) {
  const filled = name === "ff" || name === "play";
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}
