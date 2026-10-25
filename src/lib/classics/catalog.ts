import type { ConsoleId } from "@/lib/consoles/types";

/**
 * EmuRM Classics: complete games EmuRM hosts and plays directly ("Play Now").
 *
 * Rules for an entry (see docs/CLASSICS.md):
 *  - code AND assets are under a licence that allows redistribution (recorded below, with the
 *    licence text shipped next to the file in public/classics/<id>/);
 *  - no commercial game data, no "bring your own files" -- those belong in Rebuilt Games;
 *  - `verified` is the date the game was played past its title screen in EmuRM (offline, the
 *    hosted file + the console's core). Never add an entry without doing that.
 */
export interface ClassicGame {
  id: string;
  title: string;
  console: ConsoleId;
  /** File under /classics/<id>/ that the core boots (zip is unpacked by the importer). */
  file: string;
  bytes: number;
  author: string;
  year: number;
  genre: { en: string; ar: string };
  description: { en: string; ar: string };
  controls: { en: string; ar: string };
  license: string;
  licenseNote?: string;
  /** Upstream project / source code (GPL games: where the corresponding source is offered). */
  source: string;
  /** Lower = shown first under "Popular". */
  rank: number;
  added: string;
  verified: string;
}

export const CLASSICS: ClassicGame[] = [
  {
    id: "freedoom1", title: "Freedoom: Phase 1", console: "doom", file: "freedoom1.zip", bytes: 10225798,
    author: "The Freedoom project", year: 2024,
    genre: { en: "First-person shooter", ar: "تصويب منظور أول" },
    description: {
      en: "A complete, free Doom-engine game: 36 levels across four episodes, with all-original art, music and monsters.",
      ar: "لعبة كاملة ومجانية بمحرك Doom: 36 مرحلة في أربعة فصول، برسومات وموسيقى ووحوش أصلية بالكامل.",
    },
    controls: { en: "D-pad move · Fire (X) · Use/open (A) · Run (Y) · L/R strafe · L2/R2 weapons · Start menu", ar: "الأسهم للحركة · إطلاق (X) · فتح (A) · ركض (Y) · L/R جانبي · L2/R2 تبديل السلاح · Start القائمة" },
    license: "BSD-3-Clause", source: "https://github.com/freedoom/freedoom", rank: 1, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "freedoom2", title: "Freedoom: Phase 2", console: "doom", file: "freedoom2.zip", bytes: 10863726,
    author: "The Freedoom project", year: 2024,
    genre: { en: "First-person shooter", ar: "تصويب منظور أول" },
    description: {
      en: "The 32-level sequel campaign of Freedoom, with the super shotgun and the full Doom II bestiary, all free content.",
      ar: "الحملة الثانية من Freedoom بـ32 مرحلة، مع البندقية المزدوجة وكل وحوش Doom II، بمحتوى مجاني بالكامل.",
    },
    controls: { en: "D-pad move · Fire (X) · Use/open (A) · Run (Y) · L/R strafe · L2/R2 weapons · Start menu", ar: "الأسهم للحركة · إطلاق (X) · فتح (A) · ركض (Y) · L/R جانبي · L2/R2 تبديل السلاح · Start القائمة" },
    license: "BSD-3-Clause", source: "https://github.com/freedoom/freedoom", rank: 2, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "super-tilt-bro", title: "Super Tilt Bro.", console: "nes", file: "super-tilt-bro.nes", bytes: 40976,
    author: "Sylvain Gadrat", year: 2018,
    genre: { en: "Platform fighter", ar: "قتال منصات" },
    description: {
      en: "A Smash-style versus fighter for the NES: pick a stage, fight the CPU or a friend.",
      ar: "لعبة قتال على طريقة Smash لجهاز NES: اختر الساحة وقاتل الكمبيوتر أو صديقك.",
    },
    controls: { en: "D-pad move · A jump · B attack · Start pause", ar: "الأسهم للحركة · A قفز · B هجوم · Start إيقاف" },
    license: "WTFPL", source: "https://github.com/sgadrat/super-tilt-bro", rank: 3, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "horizontal-shooter", title: "Horizontal Shooter", console: "snes", file: "horizontal-shooter.sfc", bytes: 109824,
    author: "undisbeliever", year: 2018,
    genre: { en: "Shoot 'em up", ar: "تصويب" },
    description: { en: "A compact side-scrolling shooter for the Super Nintendo.", ar: "لعبة تصويب جانبية صغيرة لجهاز سوبر نينتندو." },
    controls: { en: "D-pad move · B shoot", ar: "الأسهم للحركة · B إطلاق" },
    license: "MIT (code) · CC0 (art)", source: "https://github.com/undisbeliever/horizontal-shooter", rank: 5, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "blast-arena-advance", title: "Blast Arena Advance", console: "gba", file: "blast-arena-advance.gba", bytes: 1242192,
    author: "Mathew Carr", year: 2005,
    genre: { en: "Arcade action", ar: "أكشن أركيد" },
    description: { en: "Collect the jittering squares and dodge the shrapnel in this abstract GBA arcade game.", ar: "اجمع المربعات وتفادَ الشظايا في لعبة أركيد تجريدية لجهاز GBA." },
    controls: { en: "D-pad move · A faster · B slower · Start pause", ar: "الأسهم للحركة · A أسرع · B أبطأ · Start إيقاف" },
    license: "MIT", source: "https://github.com/retrobrews/gba-games", rank: 7, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "gold-rush", title: "Gold Rush", console: "md", file: "gold-rush.bin", bytes: 2949120,
    author: "Andy Grind", year: 2018,
    genre: { en: "Rhythm", ar: "إيقاع" },
    description: { en: "A Guitar Hero-style rhythm game for the Mega Drive.", ar: "لعبة إيقاع على طريقة Guitar Hero لجهاز ميجا درايف." },
    controls: { en: "A / B / C play the notes · Start", ar: "A / B / C لعزف النغمات · Start" },
    license: "MIT", source: "https://github.com/andwn/gold-rush", rank: 8, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "robotfindskitten", title: "robotfindskitten", console: "nes", file: "robotfindskitten.nes", bytes: 32784,
    author: "Damian Yerrick", year: 2018,
    genre: { en: "Zen simulation", ar: "محاكاة هادئة" },
    description: { en: "You are robot. Find kitten among the strange objects. The cult classic, on the NES.", ar: "أنت الروبوت: ابحث عن القطة بين الأشياء الغريبة. اللعبة الشهيرة على NES." },
    controls: { en: "D-pad move · Start", ar: "الأسهم للحركة · Start" },
    license: "zlib", source: "https://github.com/pinobatch/rfk-nes", rank: 10, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "croom", title: "Concentration Room", console: "nes", file: "croom.nes", bytes: 24592,
    author: "Damian Yerrick", year: 2010,
    genre: { en: "Puzzle / memory", ar: "ألغاز وذاكرة" },
    description: { en: "A memory card-matching game with a story, for one or two players.", ar: "لعبة مطابقة بطاقات تعتمد على الذاكرة، لاعب واحد أو اثنان." },
    controls: { en: "D-pad move · A flip · Start", ar: "الأسهم للحركة · A قلب البطاقة · Start" },
    license: "GPL-3.0+ (with exact-copy ROM exception)", source: "https://github.com/pinobatch/croom-nes", rank: 11, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "nova-the-squirrel", title: "Nova the Squirrel", console: "nes", file: "nova-the-squirrel.nes", bytes: 262160,
    author: "NovaSquirrel", year: 2018,
    genre: { en: "Platformer", ar: "منصات" },
    description: {
      en: "A full NES platformer: 33 levels in 5 worlds, 7 bosses, and Kirby-style ability copying from over 35 enemy types.",
      ar: "لعبة منصات كاملة لـNES: 33 مرحلة في 5 عوالم و7 زعماء، مع نسخ قدرات الأعداء على طريقة Kirby.",
    },
    controls: { en: "D-pad move · A jump · B use ability · Start pause", ar: "الأسهم للحركة · A قفز · B استخدام القدرة · Start إيقاف" },
    license: "GPL-3.0+ (code) · CC BY-NC-SA 4.0 (assets)", licenseNote: "Assets are non-commercial: EmuRM hosts the game free of charge, unmodified and with attribution.",
    source: "https://github.com/NovaSquirrel/NovaTheSquirrel", rank: 4, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "lunar-limit", title: "Lunar Limit", console: "nes", file: "lunar-limit.nes", bytes: 40976,
    author: "Pubby", year: 2017,
    genre: { en: "Arcade shooter", ar: "تصويب أركيد" },
    description: { en: "An early-80s style arcade shooter: guard Mini Earth with your Moon Cannon against waves of invaders.", ar: "لعبة تصويب أركيد بطابع الثمانينات: احمِ الأرض الصغيرة بمدفع القمر من موجات الغزاة." },
    controls: { en: "D-pad orbit · A / B shoot · Start", ar: "الأسهم للدوران · A / B إطلاق · Start" },
    license: "MIT", source: "https://github.com/retrobrews/nes-games", rank: 6, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "gravity-beam", title: "Gravity Beam: Master Gaiden", console: "sms", file: "gravity-beam.sms", bytes: 32768,
    author: "Mathew Carr", year: 2013,
    genre: { en: "Cave flyer", ar: "طيران في الكهوف" },
    description: { en: "Fly your ship through the caverns of Mars and haul a nuclear bomb out with your gravity beam.", ar: "قُد سفينتك في كهوف المريخ واسحب القنبلة النووية بشعاع الجاذبية." },
    controls: { en: "D-pad rotate · A (2) thrust · B (1) gravity beam · Start pause", ar: "الأسهم للدوران · A (2) دفع · B (1) شعاع الجاذبية · Start إيقاف" },
    license: "BSD-3-Clause", source: "https://github.com/retrobrews/sms-games", rank: 9, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "falling", title: "Falling", console: "nes", file: "falling.nes", bytes: 40976,
    author: "tragicmuffin", year: 2018,
    genre: { en: "Arcade", ar: "أركيد" },
    description: { en: "Keep falling and dodge the platforms in this simple, addictive NES game.", ar: "استمر في السقوط وتفادَ المنصات في لعبة NES بسيطة وممتعة." },
    controls: { en: "D-pad left/right · Start", ar: "الأسهم يمين/يسار · Start" },
    license: "MIT", source: "https://github.com/tragicmuffin/falling-nes", rank: 12, added: "2026-10-25", verified: "2026-10-25",
  },
];

export const getClassic = (id: string) => CLASSICS.find((g) => g.id === id);
export const classicFileUrl = (g: ClassicGame) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/classics/${g.id}/${g.file}`;
export const classicCoverUrl = (g: ClassicGame) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/classics/${g.id}/cover.png`;
