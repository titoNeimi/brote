export interface DecorationDef {
  id: string;
  name: string;
  price: number;
  /** Nivel de jardinero necesario para comprarla. */
  level: number;
  group: "decor" | "fountain" | "light";
}

export const DECORATIONS: DecorationDef[] = [
  { id: "mushrooms", name: "Hongos", price: 40, level: 1, group: "decor" },
  { id: "bench", name: "Banco", price: 80, level: 1, group: "decor" },
  { id: "gnome", name: "Gnomo", price: 100, level: 2, group: "decor" },
  { id: "birdhouse", name: "Casita de pájaros", price: 150, level: 2, group: "decor" },
  { id: "scarecrow", name: "Espantapájaros", price: 200, level: 3, group: "decor" },
  { id: "beehive", name: "Colmena", price: 250, level: 3, group: "decor" },
  { id: "pond", name: "Estanque", price: 300, level: 4, group: "decor" },
  { id: "well", name: "Pozo", price: 400, level: 5, group: "decor" },
  { id: "windmill", name: "Molino", price: 1000, level: 8, group: "decor" },
  { id: "birdbath", name: "Bebedero para pájaros", price: 180, level: 2, group: "fountain" },
  { id: "wishing", name: "Fuente de los deseos", price: 450, level: 4, group: "fountain" },
  { id: "fountain", name: "Fuente de piedra", price: 600, level: 6, group: "fountain" },
  { id: "tiered", name: "Fuente de tres pisos", price: 800, level: 7, group: "fountain" },
  { id: "statue", name: "Fuente con estatua", price: 1200, level: 9, group: "fountain" },
  { id: "torch", name: "Antorcha", price: 50, level: 1, group: "light" },
  { id: "lamp", name: "Farol", price: 120, level: 1, group: "light" },
  { id: "paperlantern", name: "Farolillo de papel", price: 140, level: 2, group: "light" },
  { id: "stonelantern", name: "Farol de piedra", price: 260, level: 3, group: "light" },
  { id: "streetlamp", name: "Farola doble", price: 420, level: 5, group: "light" },
];

export const DECORATION_GROUPS: { id: DecorationDef["group"]; name: string }[] = [
  { id: "light", name: "Faroles" },
  { id: "fountain", name: "Fuentes" },
  { id: "decor", name: "Decoraciones" },
];

/** Luz que dan los faroles de noche: radio en baldosas, color y altura de la llama (px sobre la baldosa). */
export interface LightDef {
  radius: number;
  color: string;
  height: number;
}

export const LIGHTS: Record<string, LightDef> = {
  torch: { radius: 1.6, color: "#ffb347", height: 30 },
  lamp: { radius: 2.4, color: "#ffe08a", height: 35 },
  paperlantern: { radius: 2, color: "#ff9a6b", height: 30 },
  stonelantern: { radius: 1.8, color: "#ffd37a", height: 16 },
  streetlamp: { radius: 3.2, color: "#fff1b8", height: 50 },
};

export interface PathDef {
  id: string;
  name: string;
  /** Precio por baldosa. */
  price: number;
}

export const PATHS: PathDef[] = [
  { id: "dirt", name: "Tierra", price: 2 },
  { id: "gravel", name: "Grava", price: 4 },
  { id: "stepping", name: "Piedras sueltas", price: 5 },
  { id: "stone", name: "Adoquines", price: 6 },
  { id: "brick", name: "Ladrillo", price: 8 },
  { id: "wood", name: "Tablas", price: 8 },
];

export const PATH_BY_ID: Record<string, PathDef> = Object.fromEntries(PATHS.map((p) => [p.id, p]));

export interface FenceDef {
  id: string;
  name: string;
  /** Se paga una vez; después se aplica gratis a cualquier parcela. */
  price: number;
}

export const FENCES: FenceDef[] = [
  { id: "wood", name: "Madera", price: 0 },
  { id: "white", name: "Valla blanca", price: 150 },
  { id: "bamboo", name: "Bambú", price: 180 },
  { id: "hedge", name: "Seto", price: 220 },
  { id: "stone", name: "Muro de piedra", price: 280 },
  { id: "iron", name: "Hierro forjado", price: 380 },
];

export const FENCE_BY_ID: Record<string, FenceDef> = Object.fromEntries(FENCES.map((f) => [f.id, f]));

export const DECORATION_BY_ID: Record<string, DecorationDef> = Object.fromEntries(DECORATIONS.map((d) => [d.id, d]));

/** Lo que se recupera al vender una decoración o borrar un camino. */
export const SELL_RATIO = 0.5;

export const FERTILIZER = {
  name: "Fertilizante",
  price: 60,
  description: "Duplica la probabilidad de planta rara o legendaria en la próxima sesión completada.",
  luck: 2,
};
