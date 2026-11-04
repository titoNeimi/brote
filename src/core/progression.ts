import { SPECIES } from "./rewards";
import type { Plant, Session } from "./types";

/** Multiplicador de monedas por racha de días. */
export const STREAK_STEPS = [
  { days: 14, mult: 1.5 },
  { days: 7, mult: 1.25 },
  { days: 3, mult: 1.1 },
];

export function streakMultiplier(streak: number): number {
  return STREAK_STEPS.find((s) => streak >= s.days)?.mult ?? 1;
}

/** Minutos totales necesarios para llegar al nivel n (1 → 0, 2 → 60, 3 → 180, 4 → 360…). */
export function levelThreshold(n: number): number {
  return 30 * n * (n - 1);
}

export interface LevelInfo {
  level: number;
  /** Minutos dentro del nivel actual y los que hacen falta para el siguiente. */
  current: number;
  needed: number;
}

export function levelFor(xpMin: number): LevelInfo {
  let level = 1;
  while (xpMin >= levelThreshold(level + 1)) level++;
  const base = levelThreshold(level);
  return { level, current: xpMin - base, needed: levelThreshold(level + 1) - base };
}

/** La experiencia son los minutos de sesiones completadas. */
export function xpOf(sessions: Session[]): number {
  return Math.floor(sessions.filter((s) => s.status === "completed").reduce((n, s) => n + s.focusedMs, 0) / 60_000);
}

export interface AchievementContext {
  sessions: Session[];
  plants: Plant[];
  streak: number;
  decorationsPlaced: number;
  goalsMet: number;
  pathTiles: number;
  cellsBought: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: number;
  check(ctx: AchievementContext): boolean;
}

const completed = (ctx: AchievementContext) => ctx.sessions.filter((s) => s.status === "completed");
const totalHours = (ctx: AchievementContext) => completed(ctx).reduce((n, s) => n + s.focusedMs, 0) / 3_600_000;
const longest = (ctx: AchievementContext) => Math.max(0, ...completed(ctx).map((s) => s.focusedMs)) / 60_000;
const distinctSpecies = (ctx: AchievementContext) => new Set(ctx.plants.filter((p) => !p.withered).map((p) => p.speciesId)).size;

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_seed", name: "Primera semilla", description: "Completá tu primera sesión", icon: "🌱", reward: 20,
    check: (c) => completed(c).length >= 1 },
  { id: "first_hour", name: "Primera hora", description: "Una sesión de 60 minutos o más", icon: "⏳", reward: 50,
    check: (c) => longest(c) >= 60 },
  { id: "marathon", name: "Maratón", description: "Una sesión de 2 horas o más", icon: "🏃", reward: 120,
    check: (c) => longest(c) >= 120 },
  { id: "hours_10", name: "Diez horas", description: "Acumulá 10 horas de foco", icon: "🕙", reward: 100,
    check: (c) => totalHours(c) >= 10 },
  { id: "hours_50", name: "Cincuenta horas", description: "Acumulá 50 horas de foco", icon: "📈", reward: 300,
    check: (c) => totalHours(c) >= 50 },
  { id: "hours_100", name: "Centenario", description: "Acumulá 100 horas de foco", icon: "💯", reward: 600,
    check: (c) => totalHours(c) >= 100 },
  { id: "streak_3", name: "Constancia", description: "Racha de 3 días", icon: "🔥", reward: 30,
    check: (c) => c.streak >= 3 },
  { id: "streak_7", name: "Semana perfecta", description: "Racha de 7 días", icon: "📅", reward: 100,
    check: (c) => c.streak >= 7 },
  { id: "streak_30", name: "Imparable", description: "Racha de 30 días", icon: "🚀", reward: 500,
    check: (c) => c.streak >= 30 },
  { id: "rare", name: "¡Qué suerte!", description: "Conseguí una planta rara", icon: "🍀", reward: 30,
    check: (c) => c.plants.some((p) => !p.withered && p.rarity === "rare") },
  { id: "legendary", name: "Leyenda", description: "Conseguí una planta legendaria", icon: "👑", reward: 200,
    check: (c) => c.plants.some((p) => !p.withered && p.rarity === "legendary") },
  { id: "botanist", name: "Botánico", description: "Tené 8 especies distintas", icon: "🔎", reward: 100,
    check: (c) => distinctSpecies(c) >= 8 },
  { id: "collection", name: "Colección completa", description: `Tené las ${SPECIES.length} especies`, icon: "🏆", reward: 500,
    check: (c) => distinctSpecies(c) >= SPECIES.length },
  { id: "lush", name: "Jardín frondoso", description: "50 plantas vivas en el jardín", icon: "🌳", reward: 150,
    check: (c) => c.plants.filter((p) => !p.withered).length >= 50 },
  { id: "decorator", name: "Decorador", description: "Colocá 5 decoraciones", icon: "🪑", reward: 50,
    check: (c) => c.decorationsPlaced >= 5 },
  { id: "paths", name: "Paisajista", description: "Construí 20 baldosas de camino", icon: "🧱", reward: 60,
    check: (c) => c.pathTiles >= 20 },
  { id: "landowner", name: "Terrateniente", description: "Ampliá tus parcelas con 10 baldosas", icon: "🗺️", reward: 100,
    check: (c) => c.cellsBought >= 10 },
  { id: "goal", name: "Meta cumplida", description: "Cumplí una meta semanal", icon: "🎯", reward: 50,
    check: (c) => c.goalsMet >= 1 },
  { id: "early_bird", name: "Madrugador", description: "Terminá una sesión antes de las 8", icon: "🌅", reward: 30,
    check: (c) => completed(c).some((s) => new Date(s.endedAt).getHours() < 8 && new Date(s.endedAt).getHours() >= 4) },
  { id: "night_owl", name: "Búho", description: "Terminá una sesión después de las 23", icon: "🦉", reward: 30,
    check: (c) => completed(c).some((s) => { const h = new Date(s.endedAt).getHours(); return h >= 23 || h < 4; }) },
];

/** Logros que se cumplen ahora y todavía no estaban desbloqueados. */
export function newlyUnlocked(ctx: AchievementContext, unlocked: Record<string, number>): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.check(ctx));
}

export const WEEKLY_GOAL_BONUS = 100;
