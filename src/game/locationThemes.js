// A look for every space on the board. When a skater lands, the 3D scene
// swaps its surroundings to that space's theme (see components/Scenery3D.jsx).
//
//  name / sub   the lower-third caption ("VENICE BEACH" / "LOS ANGELES, USA")
//  mood         sky + light preset (see MOODS)
//  ground       [kind, colour]   asphalt | concrete | sand | dirt | grass | snow | wood | tile | cobble | lot | floor
//  wall         { kind, base, accent[], tags[], sign }   brick | concrete | stucco | storefront | neon | tile | glass | bars | hedge
//  props        "kind@slot" strings (slots are around the board: see SLOTS in Scenery3D.jsx)
//  lamp         a street lamp with a warm light in the back corner
//  trick        the looping trick skater + filmer in front of the board

export const MOODS = {
  day: { bg: "#7fb6dd", hemi: ["#d6e6f5", "#6f6a5a", 2.2], key: ["#fff1d6", 2.8] },
  golden: { bg: "#e8a867", hemi: ["#ffd9a8", "#8a6a4a", 2.1], key: ["#ffc98a", 3.0] },
  dusk: { bg: "#5a4f7a", hemi: ["#9aa0d8", "#4a4258", 2.1], key: ["#d8b8ff", 2.1] },
  night: { bg: "#10172b", hemi: ["#7a8ac8", "#2a2a3c", 2.0], key: ["#9db4ff", 1.8] },
  overcast: { bg: "#7b838c", hemi: ["#cfd3d8", "#6a6a66", 2.3], key: ["#e8ecf0", 1.9] },
  indoor: { bg: "#24262b", hemi: ["#cfcfc8", "#555048", 1.9], key: ["#fff5e0", 2.3] },
  neon: { bg: "#150f26", hemi: ["#9a7aef", "#352050", 2.0], key: ["#ff7ae6", 2.0] },
  snow: { bg: "#b8c4d2", hemi: ["#e4ecf5", "#9aa4b0", 2.4], key: ["#f4f8ff", 2.0] },
  home: { bg: "#3b3f47", hemi: ["#cfd6e6", "#5a5448", 2.2], key: ["#fff1d6", 2.8] },
};

const RED = "#D6402B";
const YELLOW = "#F2B632";
const BLUE = "#3E7CB1";
const CREAM = "#E8DCC0";
const GREEN = "#5f9a6a";
const PINK = "#e06fb0";

const BRICK_TAGS = ["SESSION", "KICKFLIP", "NO COMPLY", "TAPE 94", "RAD", "FILM IT"];

const trivia = {
  name: "SKATE TRIVIA",
  sub: "GAME OF S.K.A.T.E.",
  mood: "neon",
  ground: ["floor", "#1b1530"],
  wall: { kind: "neon", base: "#1a1230", accent: [PINK, YELLOW, "#59d6ff"], tags: ["?", "S.K.A.T.E.", "QUIZ", "?"], sign: "SKATE TRIVIA" },
  props: ["podium@FL", "podium@FR", "qmark@F", "spot@LF", "spot@RB", "spot@BR"],
};

const chance = {
  name: "CHANCE",
  sub: "DRAW A CARD",
  mood: "night",
  ground: ["asphalt", "#222226"],
  wall: { kind: "neon", base: "#161a2a", accent: [YELLOW, PINK, "#59d6ff"], tags: ["?", "?", "CHANCE", "?"], sign: "CHANCE" },
  props: ["qmark@FL", "qmark@FR", "crate@RF", "trash@LB", "neon:?@F", "lamp@BL"],
  lamp: true,
};

// One theme per board space, by index.
export const LOCATION_THEMES = [
  /* 0 SK8 */ {
    name: "SK8", sub: "HOME SESSION", mood: "home", ground: ["asphalt", "#2B2A28"],
    wall: { kind: "brick", base: "#5b5750", accent: [RED, YELLOW, BLUE, CREAM, GREEN, PINK], tags: BRICK_TAGS, sign: null },
    props: ["cone@FR", "cone@FRR", "hydrant@RB", "crate@RF", "crate@LF", "trash@LB"],
    lamp: true, trick: true,
  },
  /* 1 Venice Beach */ {
    name: "VENICE BEACH", sub: "LOS ANGELES, USA", mood: "golden", ground: ["sand", "#d8c08a"],
    wall: { kind: "stucco", base: "#e9d9b8", accent: ["#ff6b6b", "#2bb5b5", YELLOW], tags: ["VENICE", "LOW TIDE", "SK8", "DOGTOWN"], sign: "VENICE BEACH" },
    props: ["bowl@F", "palm@LF", "palm@RF", "palm@LB", "palm@RB", "cone@FLL"],
  },
  /* 2 Skate Trivia */ trivia,
  /* 3 Fantasy Factory */ {
    name: "FANTASY FACTORY", sub: "THE WAREHOUSE, USA", mood: "indoor", ground: ["wood", "#9a7a52"],
    wall: { kind: "concrete", base: "#6c6a63", accent: [YELLOW, RED], tags: ["FF", "MINI RAMP", "BIG BROTHER"], sign: "FANTASY FACTORY" },
    props: ["halfpipe@F", "rail@FLL", "crate@FR", "crate@RF", "crate@LF", "bench@RB"],
  },
  /* 4 New Setup (tax) */ {
    name: "NEW SETUP", sub: "PAY THE SHOP", mood: "overcast", ground: ["tile", "#a8a6a0"],
    wall: { kind: "glass", base: "#5d7a8c", accent: [CREAM, YELLOW], tags: ["NEW SETUP", "SALE", "PRO MODEL"], sign: "NEW SETUP" },
    props: ["boxes@F", "boxes@FR", "bench@FL", "tree@LF", "tree@RF", "trash@LB"],
  },
  /* 5 Element */ {
    name: "ELEMENT SKATEBOARDS", sub: "BRAND HQ", mood: "day", ground: ["concrete", "#8c8a82"],
    wall: { kind: "storefront", base: "#2f4a35", accent: ["#3a9b4a", CREAM], tags: ["ELEMENT"], sign: "ELEMENT" },
    props: ["rail@F", "ledge@FL", "ledge@FR", "tree@LF", "tree@RB", "cone@FRR"],
  },
  /* 6 Shaw Millennium */ {
    name: "SHAW MILLENNIUM", sub: "CALGARY, CANADA", mood: "snow", ground: ["snow", "#e8eef5"],
    wall: { kind: "concrete", base: "#8d939a", accent: [RED, CREAM], tags: ["CALGARY", "SHAW", "EH?"], sign: "SHAW MILLENNIUM" },
    props: ["bowl@F", "pine@LF", "pine@RF", "pine@LB", "pine@RB", "pine@FLL"],
  },
  /* 7 Chance */ chance,
  /* 8 Big O */ {
    name: "BIG O", sub: "CANADA", mood: "overcast", ground: ["concrete", "#85857f"],
    wall: { kind: "concrete", base: "#6e7378", accent: [BLUE, YELLOW, RED], tags: ["BIG O", "ROLL IN", "WEST COAST"], sign: "BIG O" },
    props: ["bowl@F", "qp@FRR", "rail@FLL", "pine@LF", "cone@RF"],
  },
  /* 9 Downtown Plaza */ {
    name: "DOWNTOWN PLAZA", sub: "CANADA", mood: "day", ground: ["tile", "#b3ada0"],
    wall: { kind: "glass", base: "#52687a", accent: [CREAM, BLUE], tags: ["DOWNTOWN", "PLAZA", "TRANSIT"], sign: "DOWNTOWN PLAZA" },
    props: ["stairs@F", "fountain@FR", "ledge@FL", "bench@RF", "tree@LF", "tree@RB", "tree@LB"],
  },
  /* 10 Jail */ {
    name: "JAIL", sub: "JUST VISITING", mood: "night", ground: ["concrete", "#55565a"],
    wall: { kind: "bars", base: "#202226", accent: ["#8a8d92"], tags: ["#001", "#002", "#003"], sign: "COUNTY JAIL" },
    props: ["bars@F", "tape@FL", "tape@FR", "siren@RF", "lamp@BL"], lamp: true,
  },
  /* 11 Gulliver */ {
    name: "GULLIVER SKATEPARK", sub: "VALENCIA, SPAIN", mood: "golden", ground: ["tile", "#c58a62"],
    wall: { kind: "stucco", base: "#e6c9a2", accent: [RED, BLUE, YELLOW], tags: ["GULLIVER", "VALENCIA", "OLÉ"], sign: "GULLIVER" },
    props: ["bowl@F", "palm@LF", "palm@RF", "rail@FRR", "ledge@FLL"],
  },
  /* 12 Supreme */ {
    name: "SUPREME", sub: "NEW YORK, USA", mood: "overcast", ground: ["concrete", "#7a7872"],
    wall: { kind: "storefront", base: "#b8271f", accent: [CREAM], tags: ["SUPREME"], sign: "SUPREME" },
    props: ["boxes@F", "crate@FR", "crate@FL", "ledge@RF", "cone@LF", "trash@LB"],
  },
  /* 13 Macba */ {
    name: "MACBA", sub: "BARCELONA, SPAIN", mood: "day", ground: ["tile", "#d8d4c8"],
    wall: { kind: "tile", base: "#e6e3da", accent: ["#c7c3b6"], tags: ["MACBA", "LEDGES", "BCN"], sign: "MACBA" },
    props: ["marble@F", "marble@FL", "marble@FR", "pillar@LF", "pillar@RF", "tree@LB"],
  },
  /* 14 Skatepark Church */ {
    name: "SKATEPARK CHURCH", sub: "SPAIN", mood: "dusk", ground: ["cobble", "#8a7f72"],
    wall: { kind: "stucco", base: "#cdb89a", accent: [RED, YELLOW], tags: ["IGLESIA", "AMEN", "SK8 OR DIE"], sign: null },
    props: ["church@BL", "qp@F", "stairs@FR", "rail@FL", "lamp@LF"], lamp: true,
  },
  /* 15 Plan B */ {
    name: "PLAN B SKATEBOARDS", sub: "BRAND HQ", mood: "dusk", ground: ["concrete", "#6f6e69"],
    wall: { kind: "storefront", base: "#17181b", accent: [YELLOW, CREAM], tags: ["PLAN B"], sign: "PLAN B" },
    props: ["stairs@F", "rail@FRR", "halfpipe@FLL", "cone@RF", "lamp@LB"], lamp: true,
  },
  /* 16 Guangzhou */ {
    name: "GUANGZHOU", sub: "CHINA", mood: "neon", ground: ["tile", "#2a2530"],
    wall: { kind: "neon", base: "#1b1428", accent: [RED, YELLOW, "#59d6ff", PINK], tags: ["广州", "滑板", "SK8", "夜市"], sign: "GUANGZHOU" },
    props: ["lanterns@F", "neon:广州@FL", "rail@FR", "tower@LB", "tower@RB", "stairs@FRR"],
  },
  /* 17 Skate Trivia */ trivia,
  /* 18 Lai Chi */ {
    name: "LAI CHI", sub: "CHINA", mood: "night", ground: ["cobble", "#3a3430"],
    wall: { kind: "brick", base: "#6a3a30", accent: [RED, YELLOW, "#59d6ff"], tags: ["荔枝", "夜市", "LAI CHI", "SK8"], sign: null },
    props: ["lanterns@F", "lanterns@RF", "stall@FL", "stall@FR", "stairs@FRR", "crate@LF"], lamp: true,
  },
  /* 19 Red Ribbon */ {
    name: "RED RIBBON", sub: "QINHUANGDAO, CHINA", mood: "day", ground: ["grass", "#6f9a58"],
    wall: { kind: "hedge", base: "#3f6b3a", accent: [GREEN, "#8fbf6a"], tags: ["RED RIBBON", "PARK"], sign: null },
    props: ["ribbon@F", "river@FR", "rail@FL", "tree@LF", "tree@RB", "tree@LB", "bench@RF"],
  },
  /* 20 Street Session */ {
    name: "STREET SESSION", sub: "FREE PARKING", mood: "dusk", ground: ["lot", "#3a3a3d"],
    wall: { kind: "concrete", base: "#6a6a70", accent: [YELLOW, RED], tags: ["P", "FREE PARKING", "NO TOWING"], sign: "FREE PARKING" },
    props: ["car@FL", "car@FR", "ledge@F", "cone@RF", "cone@LF", "lamp@BR"], lamp: true,
  },
  /* 21 North Brigade */ {
    name: "NORTH BRIGADE", sub: "GERMANY", mood: "overcast", ground: ["cobble", "#6e6a64"],
    wall: { kind: "brick", base: "#6b4a3e", accent: [YELLOW, CREAM, BLUE], tags: ["NORTH", "BRIGADE", "SKATEN"], sign: null },
    props: ["stairs@F", "rail@FL", "ledge@FR", "bench@RF", "lamp@LF", "tree@RB"], lamp: true,
  },
  /* 22 Chance */ chance,
  /* 23 Skatehalle */ {
    name: "SKATEHALLE", sub: "GERMANY", mood: "indoor", ground: ["wood", "#b08a5a"],
    wall: { kind: "tile", base: "#8f9aa3", accent: [RED, YELLOW], tags: ["HALLE", "ROLLEN", "SKATEN"], sign: "SKATEHALLE" },
    props: ["halfpipe@F", "funbox@FR", "rail@FL", "bench@RF", "crate@LF"],
  },
  /* 24 Hirshgarten */ {
    name: "HIRSHGARTEN", sub: "MUNICH, GERMANY", mood: "day", ground: ["grass", "#72a05a"],
    wall: { kind: "hedge", base: "#3d6a39", accent: [GREEN, "#9acb74"], tags: ["BIERGARTEN", "HIRSCH"], sign: null },
    props: ["bowl@F", "tree@LF", "tree@RF", "tree@LB", "tree@RB", "bench@FR", "bench@FL"],
  },
  /* 25 Girl */ {
    name: "GIRL SKATEBOARDS", sub: "BRAND HQ", mood: "golden", ground: ["concrete", "#928f86"],
    wall: { kind: "storefront", base: "#e9a8c4", accent: [CREAM, "#222"], tags: ["GIRL"], sign: "GIRL" },
    props: ["funbox@F", "rail@FRR", "ledge@FLL", "palm@LF", "palm@RB"],
  },
  /* 26 Nike Tempo */ {
    name: "NIKE TEMPO", sub: "MEXICO", mood: "golden", ground: ["concrete", "#a4927a"],
    wall: { kind: "stucco", base: "#e3a86a", accent: [CREAM, "#222"], tags: ["TEMPO", "MÉXICO", "SK8"], sign: "TEMPO" },
    props: ["pyramid@F", "rail@FL", "cactus@LF", "cactus@RF", "cactus@RB", "cone@FRR"],
  },
  /* 27 La Duna */ {
    name: "LA DUNA", sub: "MEXICO", mood: "golden", ground: ["sand", "#d9b878"],
    wall: { kind: "stucco", base: "#d9a870", accent: [RED, BLUE], tags: ["LA DUNA", "SOL", "ARENA"], sign: "LA DUNA" },
    props: ["qp@F", "pyramid@FR", "cactus@LF", "cactus@RF", "cactus@LB", "cactus@RB"],
  },
  /* 28 Tampa Skateshop */ {
    name: "TAMPA SKATESHOP", sub: "FLORIDA, USA", mood: "day", ground: ["concrete", "#9a978c"],
    wall: { kind: "storefront", base: "#2a6f7a", accent: [YELLOW, CREAM], tags: ["TAMPA"], sign: "TAMPA SKATESHOP" },
    props: ["boxes@F", "rail@FL", "ledge@FR", "palm@LF", "palm@RF", "palm@RB"],
  },
  /* 29 La Mexicana */ {
    name: "LA MEXICANA", sub: "MEXICO", mood: "golden", ground: ["cobble", "#b08a62"],
    wall: { kind: "stucco", base: "#d46a4a", accent: [YELLOW, "#3aa0a0", PINK], tags: ["MEXICANA", "VIVA", "SK8"], sign: "LA MEXICANA" },
    props: ["lanterns@F", "stairs@FR", "rail@FL", "cactus@LF", "cactus@RB", "crate@RF"],
  },
  /* 30 Go to Jail */ {
    name: "GO TO JAIL", sub: "DO NOT PASS SK8", mood: "night", ground: ["asphalt", "#26262a"],
    wall: { kind: "bars", base: "#1b1d22", accent: ["#8a8d92"], tags: ["BUSTED", "#4-0-4", "SECURITY"], sign: "BUSTED" },
    props: ["siren@F", "siren@FRR", "tape@FL", "tape@FR", "bars@RF", "lamp@BL"], lamp: true,
  },
  /* 31 USU */ {
    name: "USU SKATEPARK", sub: "AFRICA", mood: "golden", ground: ["dirt", "#b0683e"],
    wall: { kind: "concrete", base: "#9a7a5a", accent: [YELLOW, GREEN, RED], tags: ["USU", "SKATE", "AFRICA"], sign: "USU" },
    props: ["bowl@F", "acacia@LF", "acacia@RB", "acacia@RF", "qp@FRR"],
  },
  /* 32 Shangalla */ {
    name: "SHANGALLA SKATEPARK", sub: "AFRICA", mood: "golden", ground: ["dirt", "#b87444"],
    wall: { kind: "stucco", base: "#c99a6a", accent: [GREEN, YELLOW, RED], tags: ["SHANGALLA", "ROLL", "TOGETHER"], sign: "SHANGALLA" },
    props: ["funbox@F", "rail@FL", "acacia@LF", "acacia@RF", "acacia@LB", "cone@FRR"],
  },
  /* 33 Skate Trivia */ trivia,
  /* 34 Kgali */ {
    name: "KGALI SKATEPARK", sub: "KIGALI, AFRICA", mood: "dusk", ground: ["dirt", "#9a5a3a"],
    wall: { kind: "hedge", base: "#35603a", accent: [GREEN, "#8fbf6a", YELLOW], tags: ["KGALI", "KIGALI", "SK8"], sign: "KGALI" },
    props: ["stairs@F", "rail@FR", "ledge@FL", "acacia@LF", "acacia@RB", "tree@RF"],
  },
  /* 35 Zero */ {
    name: "ZERO SKATEBOARDS", sub: "BRAND HQ", mood: "night", ground: ["asphalt", "#1f1f22"],
    wall: { kind: "storefront", base: "#0e0e10", accent: [RED, CREAM], tags: ["ZERO"], sign: "ZERO" },
    props: ["stairs@F", "rail@FL", "ledge@FR", "crate@RF", "lamp@LB", "cone@FRR"], lamp: true,
  },
  /* 36 Chance */ chance,
  /* 37 Street League */ {
    name: "STREET LEAGUE", sub: "CONTEST COURSE", mood: "night", ground: ["floor", "#3a3d44"],
    wall: { kind: "neon", base: "#10131c", accent: [YELLOW, "#59d6ff", RED], tags: ["STREET LEAGUE", "FINALS", "LIVE"], sign: "STREET LEAGUE" },
    props: ["hubba@F", "stairs@FR", "rail@FL", "bleachers@LF", "bleachers@RF", "tower@LB", "tower@RB"],
  },
  /* 38 Skate Shoes */ {
    name: "SKATE SHOES", sub: "SHOP", mood: "overcast", ground: ["concrete", "#8d8a82"],
    wall: { kind: "storefront", base: "#c9c3b0", accent: [RED, "#222"], tags: ["SHOES"], sign: "SKATE SHOES" },
    props: ["boxes@F", "boxes@FR", "boxes@FL", "ledge@RF", "tree@LF", "trash@LB"],
  },
  /* 39 X-Games */ {
    name: "X-GAMES", sub: "THE BIG STAGE", mood: "night", ground: ["floor", "#30343c"],
    wall: { kind: "neon", base: "#0c0f18", accent: [RED, YELLOW, "#59d6ff"], tags: ["X-GAMES", "MEGA", "GOLD"], sign: "X-GAMES" },
    props: ["megaramp@F", "bleachers@LF", "bleachers@RF", "tower@LB", "tower@RB", "tower@FLL", "tower@FRR"],
  },
];
