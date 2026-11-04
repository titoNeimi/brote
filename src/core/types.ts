export type Rarity = "common" | "rare" | "legendary";
export type TimerMode = "countdown" | "stopwatch";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Meta semanal en minutos; 0 = sin meta. */
  weeklyGoalMin: number;
  archived: boolean;
  createdAt: number;
}

/** Sesión en curso. Todo se deriva de timestamps para que no se desfase al minimizar o suspender. */
export interface ActiveSession {
  categoryId: string;
  mode: TimerMode;
  /** Solo en modo countdown. */
  plannedMin: number | null;
  startedAt: number;
  pausedAt: number | null;
  pausedMs: number;
  /** Se usó fertilizante al iniciar. */
  fertilized?: boolean;
  /** Nombre breve opcional, p. ej. "Física I". */
  title?: string;
}

export interface BreakTimer {
  startedAt: number;
  durationMin: number;
  long: boolean;
}

export interface Decoration {
  id: string;
  kind: string;
  /** Coordenadas de grilla del mundo. */
  gx: number;
  gy: number;
  price: number;
}

export interface Session {
  id: string;
  categoryId: string;
  mode: TimerMode;
  plannedMin: number | null;
  startedAt: number;
  endedAt: number;
  focusedMs: number;
  status: "completed" | "abandoned";
  plantId: string | null;
  coins: number;
  /** Nombre breve opcional, p. ej. "Física I". */
  title?: string;
}

export interface Plant {
  id: string;
  sessionId: string;
  categoryId: string;
  speciesId: string;
  rarity: Rarity;
  withered: boolean;
  /** Posición en la grilla del mundo; siempre es una baldosa de la parcela de su categoría. */
  gx: number;
  gy: number;
  plantedAt: number;
}

export type Cell = [number, number];

/** Parcela de una categoría: un conjunto libre de baldosas, rodeado por una valla. */
export interface Plot {
  categoryId: string;
  cells: Cell[];
  fence: string;
  /** Baldosas compradas (encarece la siguiente ampliación). */
  bought: number;
}

/** Caminos: "gx,gy" → tipo de camino. */
export type Paths = Record<string, string>;

export const MAX_TITLE_LEN = 60;

/** Normaliza el nombre de una sesión: sin espacios de más, recortado; vacío → undefined. */
export function cleanTitle(t: string | undefined): string | undefined {
  const v = t?.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LEN);
  return v || undefined;
}
