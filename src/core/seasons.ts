export type Season = "spring" | "summer" | "autumn" | "winter";
export type Hemisphere = "south" | "north";

export const SEASON_LABEL: Record<Season, string> = {
  spring: "Primavera",
  summer: "Verano",
  autumn: "Otoño",
  winter: "Invierno",
};

const NORTH: Season[] = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];
const FLIP: Record<Season, Season> = { spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" };

export function seasonFor(date: Date, hemisphere: Hemisphere): Season {
  const s = NORTH[date.getMonth()];
  return hemisphere === "north" ? s : FLIP[s];
}

export interface SeasonTheme {
  grass: string[];
  rim: [string, string];
  tree: { canopy: string; light: string };
  sky: [string, string];
  particle: "petal" | "leaf" | "snow" | "firefly";
}

export const SEASON_THEME: Record<Season, SeasonTheme> = {
  spring: {
    grass: ["#8ccf6a", "#86c964", "#92d470"],
    rim: ["#6fb550", "#5c9c43"],
    tree: { canopy: "#4f9a42", light: "#f6b7cf" },
    sky: ["#bfe3f0", "#e6f4dc"],
    particle: "petal",
  },
  summer: {
    grass: ["#7fc456", "#78bd4f", "#86ca5d"],
    rim: ["#64a944", "#528f37"],
    tree: { canopy: "#3f8a35", light: "#78c95f" },
    sky: ["#a9dcf2", "#eef6d6"],
    particle: "firefly",
  },
  autumn: {
    grass: ["#b3c169", "#a8b862", "#bcc873"],
    rim: ["#97a553", "#808d45"],
    tree: { canopy: "#d9822b", light: "#f2b94b" },
    sky: ["#f2dcc0", "#efe7d2"],
    particle: "leaf",
  },
  winter: {
    grass: ["#e3ece8", "#d9e5e0", "#edf3f0"],
    rim: ["#c7d6d0", "#b2c4bd"],
    tree: { canopy: "#3c6e4a", light: "#ffffff" },
    sky: ["#cfdbe6", "#eef2f4"],
    particle: "snow",
  },
};
