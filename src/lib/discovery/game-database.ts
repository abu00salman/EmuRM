import type { GameMetadata } from "./types";

/**
 * Factual metadata only (title, system, year, publisher, genre) plus a short original
 * description written for this catalog — no ROM data, no box art, nothing copyrighted
 * bundled here. Box art for a card, when one is shown, comes from the same
 * libretro-thumbnails lookup src/lib/library/boxart.ts already uses for real imports.
 *
 * Every entry below is "external-discovery": EmuRM has information about the title, not
 * a copy of it. See src/lib/discovery/metadata-provider.ts for how "built-in-authorized"
 * entries (today: the RetroBrews homebrew already in demo-catalog.ts) get merged in.
 */
export const GAME_DATABASE: GameMetadata[] = [
  // NES
  { id: "nes-super-mario-bros", title: "Super Mario Bros.", consoleId: "nes", year: 1985, publisher: "Nintendo", genre: "Platformer", description: "The side-scrolling platformer that defined the genre and launched Mario as Nintendo's mascot.", distributionMode: "external-discovery" },
  { id: "nes-legend-of-zelda", title: "The Legend of Zelda", consoleId: "nes", year: 1986, publisher: "Nintendo", genre: "Action-adventure", description: "An open, non-linear overworld and dungeon crawling formula that founded the action-adventure genre.", distributionMode: "external-discovery" },
  { id: "nes-mega-man-2", title: "Mega Man 2", consoleId: "nes", year: 1988, publisher: "Capcom", genre: "Platformer", description: "Widely considered the series' high point: tight run-and-gun platforming across eight boss stages.", distributionMode: "external-discovery" },
  { id: "nes-metroid", title: "Metroid", consoleId: "nes", year: 1986, publisher: "Nintendo", genre: "Action-adventure", description: "A moody, interconnected sci-fi world that gave the 'Metroidvania' genre half its name.", distributionMode: "external-discovery" },

  // SNES
  { id: "snes-super-mario-world", title: "Super Mario World", consoleId: "snes", year: 1990, publisher: "Nintendo", genre: "Platformer", description: "Mario's 16-bit debut, introducing Yoshi and a sprawling, secret-filled overworld map.", distributionMode: "external-discovery" },
  { id: "snes-link-to-the-past", title: "The Legend of Zelda: A Link to the Past", consoleId: "snes", year: 1991, publisher: "Nintendo", genre: "Action-adventure", description: "Parallel light and dark worlds, still the template most later Zelda games build on.", distributionMode: "external-discovery" },
  { id: "snes-super-metroid", title: "Super Metroid", consoleId: "snes", year: 1994, publisher: "Nintendo", genre: "Action-adventure", description: "Atmospheric exploration and sequence-breaking that's still studied by level designers today.", distributionMode: "external-discovery" },
  { id: "snes-street-fighter-2", title: "Street Fighter II", consoleId: "snes", year: 1992, publisher: "Capcom", genre: "Fighting", description: "The arcade fighting game that started the genre's 1990s boom.", distributionMode: "external-discovery" },

  // Mega Drive / Genesis
  { id: "md-sonic-the-hedgehog", title: "Sonic the Hedgehog", consoleId: "md", year: 1991, publisher: "Sega", genre: "Platformer", description: "High-speed platforming built around momentum and looping stage design.", distributionMode: "external-discovery" },
  { id: "md-streets-of-rage-2", title: "Streets of Rage 2", consoleId: "md", year: 1992, publisher: "Sega", genre: "Beat 'em up", description: "A co-op brawler with one of the Mega Drive's most celebrated soundtracks.", distributionMode: "external-discovery" },
  { id: "md-gunstar-heroes", title: "Gunstar Heroes", consoleId: "md", year: 1993, publisher: "Treasure", genre: "Run and gun", description: "Frantic, boss-rush-heavy run-and-gun action from the studio that became famous for it.", distributionMode: "external-discovery" },

  // Game Boy
  { id: "gb-tetris", title: "Tetris", consoleId: "gb", year: 1989, publisher: "Nintendo", genre: "Puzzle", description: "The pack-in puzzle game widely credited with selling the original Game Boy.", distributionMode: "external-discovery" },
  { id: "gb-super-mario-land", title: "Super Mario Land", consoleId: "gb", year: 1989, publisher: "Nintendo", genre: "Platformer", description: "A compact, handheld-native Mario platformer with its own cast and setting.", distributionMode: "external-discovery" },
  { id: "gb-pokemon-red", title: "Pokémon Red", consoleId: "gb", year: 1996, publisher: "Nintendo", genre: "RPG", description: "The original monster-collecting RPG that launched the Pokémon franchise.", distributionMode: "external-discovery" },

  // Game Boy Color
  { id: "gbc-pokemon-gold", title: "Pokémon Gold", consoleId: "gbc", year: 1999, publisher: "Nintendo", genre: "RPG", description: "Added a day/night cycle and a second region on top of the original formula.", distributionMode: "external-discovery" },
  { id: "gbc-oracle-of-seasons", title: "The Legend of Zelda: Oracle of Seasons", consoleId: "gbc", year: 2001, publisher: "Nintendo", genre: "Action-adventure", description: "A season-shifting dungeon mechanic unique among handheld Zelda titles.", distributionMode: "external-discovery" },

  // Game Boy Advance
  { id: "gba-metroid-fusion", title: "Metroid Fusion", consoleId: "gba", year: 2002, publisher: "Nintendo", genre: "Action-adventure", description: "A tighter, more linear take on Metroid exploration with a pursuing rival creature.", distributionMode: "external-discovery" },
  { id: "gba-advance-wars", title: "Advance Wars", consoleId: "gba", year: 2001, publisher: "Nintendo", genre: "Strategy", description: "Turn-based military strategy with distinct commanding officers, each with their own quirks.", distributionMode: "external-discovery" },
  { id: "gba-mega-man-zero", title: "Mega Man Zero", consoleId: "gba", year: 2002, publisher: "Capcom", genre: "Platformer", description: "A harder-edged spin-off starring Zero instead of the usual blue bomber.", distributionMode: "external-discovery" },

  // N64
  { id: "n64-super-mario-64", title: "Super Mario 64", consoleId: "n64", year: 1996, publisher: "Nintendo", genre: "Platformer", description: "Brought Mario into 3D and set the template most 3D platformers still follow.", distributionMode: "external-discovery" },
  { id: "n64-ocarina-of-time", title: "The Legend of Zelda: Ocarina of Time", consoleId: "n64", year: 1998, publisher: "Nintendo", genre: "Action-adventure", description: "Z-targeting and a time-travel structure that reshaped 3D action-adventure design.", distributionMode: "external-discovery" },
  { id: "n64-goldeneye-007", title: "GoldenEye 007", consoleId: "n64", year: 1997, publisher: "Rare", genre: "First-person shooter", description: "A licensed movie tie-in that became one of the most influential console FPS games ever made.", distributionMode: "external-discovery" },

  // PlayStation
  { id: "psx-metal-gear-solid", title: "Metal Gear Solid", consoleId: "psx", year: 1998, publisher: "Konami", genre: "Stealth action", description: "Cinematic stealth action that helped establish the genre on consoles.", distributionMode: "external-discovery" },
  { id: "psx-crash-bandicoot", title: "Crash Bandicoot", consoleId: "psx", year: 1996, publisher: "Naughty Dog", genre: "Platformer", description: "A linear, corridor-style 3D platformer and an early PlayStation mascot title.", distributionMode: "external-discovery" },
  { id: "psx-final-fantasy-7", title: "Final Fantasy VII", consoleId: "psx", year: 1997, publisher: "Square", genre: "RPG", description: "A pre-rendered-background RPG that brought the series to a global mainstream audience.", distributionMode: "external-discovery" },
  { id: "psx-spyro-the-dragon", title: "Spyro the Dragon", consoleId: "psx", year: 1998, publisher: "Insomniac Games", genre: "Platformer", description: "Open hub-world 3D platforming starring a small purple dragon.", distributionMode: "external-discovery" },

  // Master System
  { id: "sms-sonic-the-hedgehog", title: "Sonic the Hedgehog", consoleId: "sms", year: 1991, publisher: "Sega", genre: "Platformer", description: "An 8-bit-hardware version of Sonic's debut, built as its own distinct game rather than a straight port.", distributionMode: "external-discovery" },
  { id: "sms-alex-kidd", title: "Alex Kidd in Miracle World", consoleId: "sms", year: 1986, publisher: "Sega", genre: "Platformer", description: "Sega's pack-in mascot platformer before Sonic, mixing platforming with shops and rock-paper-scissors duels.", distributionMode: "external-discovery" },

  // Game Gear
  { id: "gg-sonic-the-hedgehog", title: "Sonic the Hedgehog", consoleId: "gg", year: 1991, publisher: "Sega", genre: "Platformer", description: "A handheld-scaled Sonic outing built around the Game Gear's smaller screen.", distributionMode: "external-discovery" },
  { id: "gg-shinobi", title: "Shinobi", consoleId: "gg", year: 1991, publisher: "Sega", genre: "Action", description: "Side-scrolling ninja action adapted for Sega's handheld.", distributionMode: "external-discovery" },

  // Atari 2600
  { id: "a2600-pitfall", title: "Pitfall!", consoleId: "a2600", year: 1982, publisher: "Activision", genre: "Platformer", description: "An early scrolling jungle-exploration platformer and one of the best-selling 2600 games.", distributionMode: "external-discovery" },
  { id: "a2600-adventure", title: "Adventure", consoleId: "a2600", year: 1980, publisher: "Atari", genre: "Action-adventure", description: "Often cited as the first action-adventure game, and home to one of gaming's first Easter eggs.", distributionMode: "external-discovery" },
  { id: "a2600-space-invaders", title: "Space Invaders", consoleId: "a2600", year: 1980, publisher: "Atari", genre: "Shooter", description: "The home conversion credited with turning the VCS into a mainstream hit.", distributionMode: "external-discovery" },

  // MSX
  { id: "msx-metal-gear", title: "Metal Gear", consoleId: "msx", year: 1987, publisher: "Konami", genre: "Stealth action", description: "The original Metal Gear, introducing avoid-rather-than-fight stealth mechanics on home computers.", distributionMode: "external-discovery" },
  { id: "msx-knightmare", title: "Knightmare", consoleId: "msx", year: 1986, publisher: "Konami", genre: "Action", description: "A vertically-scrolling fantasy action game from Konami's MSX library.", distributionMode: "external-discovery" },

  // PC Engine
  { id: "pce-bonks-adventure", title: "Bonk's Adventure", consoleId: "pce", year: 1990, publisher: "Hudson Soft", genre: "Platformer", description: "The PC Engine/TurboGrafx-16's signature mascot platformer, led by a head-butting caveman.", distributionMode: "external-discovery" },

  // 3DO
  { id: "tdo-gex", title: "Gex", consoleId: "tdo", year: 1995, publisher: "Crystal Dynamics", genre: "Platformer", description: "A wisecracking gecko platformer and one of the 3DO's best-known exclusives.", distributionMode: "external-discovery" },
];
