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
    license: "MIT (code) · CC0 (art)", source: "https://github.com/undisbeliever/horizontal-shooter", rank: 4, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "blast-arena-advance", title: "Blast Arena Advance", console: "gba", file: "blast-arena-advance.gba", bytes: 1242192,
    author: "Mathew Carr", year: 2005,
    genre: { en: "Arcade action", ar: "أكشن أركيد" },
    description: { en: "Collect the jittering squares and dodge the shrapnel in this abstract GBA arcade game.", ar: "اجمع المربعات وتفادَ الشظايا في لعبة أركيد تجريدية لجهاز GBA." },
    controls: { en: "D-pad move · A faster · B slower · Start pause", ar: "الأسهم للحركة · A أسرع · B أبطأ · Start إيقاف" },
    license: "MIT", source: "https://github.com/retrobrews/gba-games", rank: 5, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "gold-rush", title: "Gold Rush", console: "md", file: "gold-rush.bin", bytes: 2949120,
    author: "Andy Grind", year: 2018,
    genre: { en: "Rhythm", ar: "إيقاع" },
    description: { en: "A Guitar Hero-style rhythm game for the Mega Drive.", ar: "لعبة إيقاع على طريقة Guitar Hero لجهاز ميجا درايف." },
    controls: { en: "A / B / C play the notes · Start", ar: "A / B / C لعزف النغمات · Start" },
    license: "MIT", source: "https://github.com/andwn/gold-rush", rank: 6, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "robotfindskitten", title: "robotfindskitten", console: "nes", file: "robotfindskitten.nes", bytes: 32784,
    author: "Damian Yerrick", year: 2018,
    genre: { en: "Zen simulation", ar: "محاكاة هادئة" },
    description: { en: "You are robot. Find kitten among the strange objects. The cult classic, on the NES.", ar: "أنت الروبوت: ابحث عن القطة بين الأشياء الغريبة. اللعبة الشهيرة على NES." },
    controls: { en: "D-pad move · Start", ar: "الأسهم للحركة · Start" },
    license: "zlib", source: "https://github.com/pinobatch/rfk-nes", rank: 7, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "croom", title: "Concentration Room", console: "nes", file: "croom.nes", bytes: 24592,
    author: "Damian Yerrick", year: 2010,
    genre: { en: "Puzzle / memory", ar: "ألغاز وذاكرة" },
    description: { en: "A memory card-matching game with a story, for one or two players.", ar: "لعبة مطابقة بطاقات تعتمد على الذاكرة، لاعب واحد أو اثنان." },
    controls: { en: "D-pad move · A flip · Start", ar: "الأسهم للحركة · A قلب البطاقة · Start" },
    license: "GPL-3.0+ (with exact-copy ROM exception)", source: "https://github.com/pinobatch/croom-nes", rank: 8, added: "2026-10-25", verified: "2026-10-25",
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
    source: "https://github.com/NovaSquirrel/NovaTheSquirrel", rank: 9, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "lunar-limit", title: "Lunar Limit", console: "nes", file: "lunar-limit.nes", bytes: 40976,
    author: "Pubby", year: 2017,
    genre: { en: "Arcade shooter", ar: "تصويب أركيد" },
    description: { en: "An early-80s style arcade shooter: guard Mini Earth with your Moon Cannon against waves of invaders.", ar: "لعبة تصويب أركيد بطابع الثمانينات: احمِ الأرض الصغيرة بمدفع القمر من موجات الغزاة." },
    controls: { en: "D-pad orbit · A / B shoot · Start", ar: "الأسهم للدوران · A / B إطلاق · Start" },
    license: "MIT", source: "https://github.com/retrobrews/nes-games", rank: 10, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "gravity-beam", title: "Gravity Beam: Master Gaiden", console: "sms", file: "gravity-beam.sms", bytes: 32768,
    author: "Mathew Carr", year: 2013,
    genre: { en: "Cave flyer", ar: "طيران في الكهوف" },
    description: { en: "Fly your ship through the caverns of Mars and haul a nuclear bomb out with your gravity beam.", ar: "قُد سفينتك في كهوف المريخ واسحب القنبلة النووية بشعاع الجاذبية." },
    controls: { en: "D-pad rotate · A (2) thrust · B (1) gravity beam · Start pause", ar: "الأسهم للدوران · A (2) دفع · B (1) شعاع الجاذبية · Start إيقاف" },
    license: "BSD-3-Clause", source: "https://github.com/retrobrews/sms-games", rank: 11, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "falling", title: "Falling", console: "nes", file: "falling.nes", bytes: 40976,
    author: "tragicmuffin", year: 2018,
    genre: { en: "Arcade", ar: "أركيد" },
    description: { en: "Keep falling and dodge the platforms in this simple, addictive NES game.", ar: "استمر في السقوط وتفادَ المنصات في لعبة NES بسيطة وممتعة." },
    controls: { en: "D-pad left/right · Start", ar: "الأسهم يمين/يسار · Start" },
    license: "MIT", source: "https://github.com/tragicmuffin/falling-nes", rank: 12, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "agb-hack", title: "AGB_Hack", console: "gba", file: "agb-hack.gba", bytes: 543372,
    author: "Donnie Russell", year: 2007,
    genre: { en: "Roguelike", ar: "مغامرة روغلايك" },
    description: { en: "The classic dungeon crawler Hack, fully playable on the Game Boy Advance: descend, fight and find the amulet.", ar: "لعبة الأبراج الكلاسيكية Hack كاملة على جيم بوي أدفانس: انزل الطوابق، قاتل، وابحث عن التميمة." },
    controls: { en: "D-pad move · A / B actions · L/R menus · Start", ar: "الأسهم للحركة · A / B أوامر · L/R القوائم · Start" },
    license: "GPL", source: "https://github.com/retrobrews/gba-games", rank: 13, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "collision-course", title: "Collision Course", console: "gba", file: "collision-course.gba", bytes: 136032,
    author: "Donnie Russell", year: 2006,
    genre: { en: "Space shooter", ar: "تصويب فضائي" },
    description: { en: "Vector-style asteroid blasting for the Game Boy Advance.", ar: "حطّم الكويكبات بأسلوب رسومات المتجهات على جيم بوي أدفانس." },
    controls: { en: "D-pad rotate/thrust · A fire · Start", ar: "الأسهم للدوران والدفع · A إطلاق · Start" },
    license: "Public domain", source: "https://github.com/retrobrews/gba-games", rank: 14, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "pnakys", title: "Pnakys", console: "gba", file: "pnakys.gba", bytes: 235252,
    author: "Torlus", year: 2004,
    genre: { en: "Puzzle", ar: "ألغاز" },
    description: { en: "Group balls of the same colour and blow them up: a mix of Tetris and Bust-a-Move.", ar: "اجمع الكرات بنفس اللون وفجّرها: مزيج بين تتريس وBust-a-Move." },
    controls: { en: "D-pad move · A rotate · Start", ar: "الأسهم للحركة · A تدوير · Start" },
    license: "Public domain", source: "https://github.com/retrobrews/gba-games", rank: 15, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "geometrix", title: "Geometrix", console: "gbc", file: "geometrix.gbc", bytes: 32768,
    author: "Antonio Niño Díaz", year: 2015,
    genre: { en: "Puzzle", ar: "ألغاز" },
    description: { en: "Line up three or more matching shapes in rows or columns.", ar: "رتّب ثلاثة أشكال متطابقة أو أكثر في صف أو عمود." },
    controls: { en: "D-pad cursor · A swap · Start", ar: "الأسهم للمؤشر · A تبديل · Start" },
    license: "GPL-3.0", source: "https://github.com/AntonioND/geometrix", rank: 16, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "double-action-blaster-guys", title: "Double Action Blaster Guys", console: "nes", file: "double-action-blaster-guys.nes", bytes: 24592,
    author: "NovaSquirrel", year: 2012,
    genre: { en: "Action platformer", ar: "منصات وأكشن" },
    description: { en: "Two-player blasting platform action from the author of Nova the Squirrel.", ar: "أكشن منصات بإطلاق النار للاعب أو لاعبين، من مطوّر Nova the Squirrel." },
    controls: { en: "D-pad move · A jump · B shoot · Start", ar: "الأسهم للحركة · A قفز · B إطلاق · Start" },
    license: "GPL-3.0", source: "https://github.com/NovaSquirrel", rank: 17, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "f-ff", title: "F-FF", console: "nes", file: "f-ff.nes", bytes: 65552,
    author: "Pubby", year: 2018,
    genre: { en: "Racing", ar: "سباق" },
    description: { en: "A fast pseudo-3D racer. Press Select on the menu for two-player split screen.", ar: "سباق سريع بمنظور ثلاثي الأبعاد. اضغط Select في القائمة للعب شخصين بشاشة مقسومة." },
    controls: { en: "D-pad steer · B accelerate · A brake · Start", ar: "الأسهم للتوجيه · B تسارع · A فرامل · Start" },
    license: "MIT", source: "https://github.com/retrobrews/nes-games", rank: 18, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "jet-paco", title: "Jet Paco", console: "nes", file: "jet-paco.nes", bytes: 40976,
    author: "The Mojon Twins", year: 2016,
    genre: { en: "Platformer", ar: "منصات" },
    description: { en: "Glide through an abandoned ship with your jet pack and collect energonia crystals.", ar: "طِر بحقيبتك النفاثة داخل سفينة مهجورة واجمع بلورات الطاقة." },
    controls: { en: "D-pad move · A jet · Start", ar: "الأسهم للحركة · A الحقيبة النفاثة · Start" },
    license: "LGPL-3.0", source: "https://github.com/mojontwins", rank: 19, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "lala-the-magical", title: "Lala the Magical", console: "nes", file: "lala-the-magical.nes", bytes: 81936,
    author: "The Mojon Twins", year: 2016,
    genre: { en: "Platformer", ar: "منصات" },
    description: { en: "Help apprentice witch Lala find the magic wand and the three Power Gems of the Sky Palace.", ar: "ساعد الساحرة الصغيرة لالا في إيجاد العصا السحرية وجواهر القوة الثلاث." },
    controls: { en: "D-pad move · A jump · B magic · Start", ar: "الأسهم للحركة · A قفز · B سحر · Start" },
    license: "LGPL-3.0", source: "https://github.com/mojontwins", rank: 20, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "ralph-4", title: "Ralph 4", console: "nes", file: "ralph-4.nes", bytes: 24592,
    author: "Pubby", year: 2016,
    genre: { en: "Puzzle action", ar: "ألغاز وأكشن" },
    description: { en: "Guide Ralph the dwarf through 20 floors of the Evil Bear Lair without touching the bears.", ar: "قُد القزم رالف عبر 20 طابقًا في وكر الدببة دون أن تلمسه الدببة." },
    controls: { en: "D-pad move · Start", ar: "الأسهم للحركة · Start" },
    license: "MIT", source: "https://github.com/retrobrews/nes-games", rank: 21, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "sgt-helmet", title: "Sgt. Helmet: Training Day", console: "nes", file: "sgt-helmet.nes", bytes: 40976,
    author: "The Mojon Twins", year: 2013,
    genre: { en: "Run and gun", ar: "أكشن وإطلاق" },
    description: { en: "Action platforming boot camp from the Mojon Twins.", ar: "تدريب عسكري بأسلوب منصات وأكشن من Mojon Twins." },
    controls: { en: "D-pad move · A jump · B shoot · Start", ar: "الأسهم للحركة · A قفز · B إطلاق · Start" },
    license: "LGPL-3.0", source: "https://github.com/mojontwins", rank: 22, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "spacey-mcracey", title: "Spacey McRacey", console: "nes", file: "spacey-mcracey.nes", bytes: 40976,
    author: "Nathan Tolbert", year: 2017,
    genre: { en: "Party racer", ar: "سباق جماعي" },
    description: { en: "A 4-player space race: stay in the lead, shoot rivals and grab power-ups (bots fill empty seats).", ar: "سباق فضائي حتى 4 لاعبين: ابقَ في المقدمة واضرب المنافسين (الكمبيوتر يكمل المقاعد)." },
    controls: { en: "D-pad fly · A shoot · Start", ar: "الأسهم للطيران · A إطلاق · Start" },
    license: "Code © author, free release · art CC0 / CC BY 3.0", source: "https://github.com/retrobrews/nes-games", rank: 23, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "wo-xiang-niao-niao", title: "Wo Xiang Niao Niao", console: "nes", file: "wo-xiang-niao-niao.nes", bytes: 40976,
    author: "The Mojon Twins", year: 2016,
    genre: { en: "Platformer", ar: "منصات" },
    description: { en: "A cheeky single-screen platformer from the Mojon Twins.", ar: "لعبة منصات خفيفة الظل من Mojon Twins." },
    controls: { en: "D-pad move · A jump · Start", ar: "الأسهم للحركة · A قفز · Start" },
    license: "LGPL-3.0", source: "https://github.com/mojontwins", rank: 24, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "yun", title: "Yun", console: "nes", file: "yun.nes", bytes: 65552,
    author: "The Mojon Twins", year: 2017,
    genre: { en: "Platformer", ar: "منصات" },
    description: { en: "Explore, jump and solve your way through Yun's colourful NES world.", ar: "استكشف واقفز وحل الألغاز في عالم يون الملوّن." },
    controls: { en: "D-pad move · A jump · B action · Start", ar: "الأسهم للحركة · A قفز · B فعل · Start" },
    license: "LGPL-3.0", source: "https://github.com/mojontwins", rank: 25, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "digger-chan", title: "Digger Chan", console: "sms", file: "digger-chan.sms", bytes: 49152,
    author: "Aypok", year: 2006,
    genre: { en: "Arcade", ar: "أركيد" },
    description: { en: "Dig through the ground, collect treasure and avoid the monsters on the Master System.", ar: "احفر الأرض واجمع الكنوز وتفادَ الوحوش على ماستر سيستم." },
    controls: { en: "D-pad dig · Button 1 / 2", ar: "الأسهم للحفر · الزر 1 / 2" },
    license: "GPL", source: "https://github.com/retrobrews/sms-games", rank: 26, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "lander", title: "Lander", console: "sms", file: "lander.sms", bytes: 32768,
    author: "jmimu", year: 2013,
    genre: { en: "Arcade", ar: "أركيد" },
    description: { en: "Land your rocket safely on the pads before the fuel runs out.", ar: "أنزل صاروخك بأمان على المنصات قبل نفاد الوقود." },
    controls: { en: "D-pad thrust · Button 1 start · Button 2 restart", ar: "الأسهم للدفع · الزر 1 بدء · الزر 2 إعادة" },
    license: "GPL-3.0+", source: "https://github.com/retrobrews/sms-games", rank: 27, added: "2026-10-25", verified: "2026-10-25",
  },
  {
    id: "lander-2", title: "Lander 2", console: "sms", file: "lander-2.sms", bytes: 49152,
    author: "jmimu", year: 2015,
    genre: { en: "Arcade", ar: "أركيد" },
    description: { en: "The bigger sequel: fly and land through more varied caverns.", ar: "الجزء الثاني الأكبر: طِر وانزل في كهوف أكثر تنوعًا." },
    controls: { en: "D-pad thrust · Button 1 / 2", ar: "الأسهم للدفع · الزر 1 / 2" },
    license: "GPL-3.0+", source: "https://github.com/jmimu/lander2", rank: 28, added: "2026-10-25", verified: "2026-10-25",
  },
];

export const getClassic = (id: string) => CLASSICS.find((g) => g.id === id);
export const classicFileUrl = (g: ClassicGame) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/classics/${g.id}/${g.file}`;
export const classicCoverUrl = (g: ClassicGame) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/classics/${g.id}/cover.png`;
