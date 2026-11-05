import type { Rarity } from "./types";

export interface Tier {
  index: number;
  minMinutes: number;
  name: string;
  /** Probabilidades de rareza para este nivel; el resto es común. */
  rareChance: number;
  legendaryChance: number;
}

export const TIERS: Tier[] = [
  { index: 0, minMinutes: 0, name: "Brote", rareChance: 0.03, legendaryChance: 0 },
  { index: 1, minMinutes: 10, name: "Flor", rareChance: 0.06, legendaryChance: 0 },
  { index: 2, minMinutes: 25, name: "Planta", rareChance: 0.12, legendaryChance: 0 },
  { index: 3, minMinutes: 50, name: "Arbusto", rareChance: 0.18, legendaryChance: 0.02 },
  { index: 4, minMinutes: 90, name: "Árbol", rareChance: 0.22, legendaryChance: 0.05 },
];

export interface Species {
  id: string;
  name: string;
  tier: number;
  rarity: Rarity;
}

export const SPECIES: Species[] = [
  { id: "sprout", name: "Brote", tier: 0, rarity: "common" },
  { id: "mushroom", name: "Hongo", tier: 0, rarity: "common" },
  { id: "dandelion", name: "Diente de león", tier: 0, rarity: "common" },
  { id: "clover", name: "Trébol de cuatro hojas", tier: 0, rarity: "rare" },
  { id: "glowshroom", name: "Hongo luminoso", tier: 0, rarity: "rare" },
  { id: "daisy", name: "Margarita", tier: 1, rarity: "common" },
  { id: "tulip", name: "Tulipán", tier: 1, rarity: "common" },
  { id: "poppy", name: "Amapola", tier: 1, rarity: "common" },
  { id: "succulent", name: "Suculenta", tier: 1, rarity: "common" },
  { id: "bluebell", name: "Campanilla azul", tier: 1, rarity: "rare" },
  { id: "lotus", name: "Flor de loto", tier: 1, rarity: "rare" },
  { id: "sunflower", name: "Girasol", tier: 2, rarity: "common" },
  { id: "lavender", name: "Lavanda", tier: 2, rarity: "common" },
  { id: "fern", name: "Helecho", tier: 2, rarity: "common" },
  { id: "cactus", name: "Cactus", tier: 2, rarity: "common" },
  { id: "rose", name: "Rosal", tier: 2, rarity: "rare" },
  { id: "orchid", name: "Orquídea", tier: 2, rarity: "rare" },
  { id: "bush", name: "Arbusto", tier: 3, rarity: "common" },
  { id: "hydrangea", name: "Hortensia", tier: 3, rarity: "common" },
  { id: "pumpkin", name: "Calabazas", tier: 3, rarity: "common" },
  { id: "bamboo", name: "Bambú", tier: 3, rarity: "common" },
  { id: "blueberry", name: "Arándano", tier: 3, rarity: "rare" },
  { id: "bonsai", name: "Bonsái", tier: 3, rarity: "rare" },
  { id: "crystal", name: "Flor de cristal", tier: 3, rarity: "legendary" },
  { id: "moonflower", name: "Flor lunar", tier: 3, rarity: "legendary" },
  { id: "oak", name: "Roble", tier: 4, rarity: "common" },
  { id: "pine", name: "Pino", tier: 4, rarity: "common" },
  { id: "birch", name: "Abedul", tier: 4, rarity: "common" },
  { id: "palm", name: "Palmera", tier: 4, rarity: "common" },
  { id: "cherry", name: "Cerezo en flor", tier: 4, rarity: "rare" },
  { id: "maple", name: "Arce rojo", tier: 4, rarity: "rare" },
  { id: "wisteria", name: "Glicina", tier: 4, rarity: "rare" },
  { id: "golden", name: "Árbol dorado", tier: 4, rarity: "legendary" },
  { id: "startree", name: "Árbol estelar", tier: 4, rarity: "legendary" },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
);

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Común",
  rare: "Rara",
  legendary: "Legendaria",
};

const RARITY_COIN_MULT: Record<Rarity, number> = { common: 1, rare: 1.5, legendary: 3 };

export function tierFor(minutes: number): Tier {
  let tier = TIERS[0];
  for (const t of TIERS) if (minutes >= t.minMinutes) tier = t;
  return tier;
}

export function nextTier(minutes: number): Tier | null {
  return TIERS.find((t) => t.minMinutes > minutes) ?? null;
}

/** Progreso 0..1 dentro del nivel actual (1 en el último nivel a partir de 2 h). */
export function tierProgress(minutes: number): number {
  const cur = tierFor(minutes);
  const next = nextTier(minutes);
  const end = next ? next.minMinutes : cur.minMinutes + 30;
  return Math.min(1, (minutes - cur.minMinutes) / (end - cur.minMinutes));
}

/** `luck` multiplica las probabilidades de rara y legendaria (fertilizante). */
export function rollRarity(tier: Tier, rand: () => number, luck = 1): Rarity {
  const r = rand();
  if (r < tier.legendaryChance * luck) return "legendary";
  if (r < (tier.legendaryChance + tier.rareChance) * luck) return "rare";
  return "common";
}

export interface Reward {
  speciesId: string;
  rarity: Rarity;
  coins: number;
}

export function rollReward(minutes: number, rand: () => number = Math.random, luck = 1): Reward {
  const tier = tierFor(minutes);
  let rarity = rollRarity(tier, rand, luck);
  let pool = SPECIES.filter((s) => s.tier === tier.index && s.rarity === rarity);
  if (pool.length === 0) {
    rarity = "common";
    pool = SPECIES.filter((s) => s.tier === tier.index && s.rarity === "common");
  }
  const species = pool[Math.floor(rand() * pool.length)];
  return {
    speciesId: species.id,
    rarity,
    coins: Math.floor(minutes * RARITY_COIN_MULT[rarity]),
  };
}

/** Especie con la que se representa un nivel mientras la sesión está en curso. */
export const PREVIEW_SPECIES = ["sprout", "daisy", "sunflower", "bush", "oak"];
