import type { Session } from "./types";

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Semana empezando el lunes. */
export function startOfWeek(t: number): number {
  const d = new Date(startOfDay(t));
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

/** Suma días respetando cambios de horario. */
export function addDays(t: number, n: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function focusedSince(sessions: Session[], since: number, categoryId?: string): number {
  return sessions
    .filter((s) => s.endedAt >= since && (categoryId == null || s.categoryId === categoryId))
    .reduce((sum, s) => sum + s.focusedMs, 0);
}

/** Días consecutivos (terminando hoy o ayer) con al menos una sesión completada. */
export function currentStreak(sessions: Session[], now: number): number {
  const days = new Set(sessions.filter((s) => s.status === "completed").map((s) => startOfDay(s.endedAt)));
  const day = new Date(startOfDay(now));
  if (!days.has(day.getTime())) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (days.has(day.getTime())) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export interface Bucket {
  start: number;
  total: number;
  byCategory: Record<string, number>;
}

/**
 * Foco agrupado en `count` períodos consecutivos que terminan en el actual.
 * `unit` = "day" o "week". Cada sesión se asigna al período en que terminó.
 */
export function buckets(sessions: Session[], now: number, count: number, unit: "day" | "week"): Bucket[] {
  const step = unit === "day" ? 1 : 7;
  const last = unit === "day" ? startOfDay(now) : startOfWeek(now);
  const starts = Array.from({ length: count }, (_, i) => addDays(last, -(count - 1 - i) * step));
  const out: Bucket[] = starts.map((start) => ({ start, total: 0, byCategory: {} }));
  for (const s of sessions) {
    const t = unit === "day" ? startOfDay(s.endedAt) : startOfWeek(s.endedAt);
    const i = starts.indexOf(t);
    if (i < 0) continue;
    out[i].total += s.focusedMs;
    out[i].byCategory[s.categoryId] = (out[i].byCategory[s.categoryId] ?? 0) + s.focusedMs;
  }
  return out;
}

export function totalsByCategory(sessions: Session[], since: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) if (s.endedAt >= since) out[s.categoryId] = (out[s.categoryId] ?? 0) + s.focusedMs;
  return out;
}

/** Minutos de foco por hora del día, repartiendo cada sesión entre las horas que abarcó. */
export function hourHistogram(sessions: Session[], since: number): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const s of sessions) {
    if (s.endedAt < since) continue;
    // Las pausas no se conocen en detalle: se reparte el foco proporcionalmente al intervalo.
    const span = s.endedAt - s.startedAt;
    if (span <= 0) continue;
    const ratio = s.focusedMs / span;
    let t = s.startedAt;
    while (t < s.endedAt) {
      const d = new Date(t);
      const nextHour = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime();
      const end = Math.min(nextHour, s.endedAt);
      hours[d.getHours()] += ((end - t) * ratio) / 60_000;
      t = end;
    }
  }
  return hours;
}

/** Foco por día (inicio del día → ms). */
export function dailyMap(sessions: Session[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const s of sessions) {
    const d = startOfDay(s.endedAt);
    map.set(d, (map.get(d) ?? 0) + s.focusedMs);
  }
  return map;
}

export interface Summary {
  total: number;
  sessions: number;
  avgSession: number;
  longest: number;
  completionRate: number | null;
  activeDays: number;
}

export function summarize(sessions: Session[], since: number): Summary {
  const list = sessions.filter((s) => s.endedAt >= since);
  const total = list.reduce((n, s) => n + s.focusedMs, 0);
  const countdowns = list.filter((s) => s.mode === "countdown");
  return {
    total,
    sessions: list.length,
    avgSession: list.length ? total / list.length : 0,
    longest: Math.max(0, ...list.map((s) => s.focusedMs)),
    completionRate: countdowns.length ? countdowns.filter((s) => s.status === "completed").length / countdowns.length : null,
    activeDays: new Set(list.map((s) => startOfDay(s.endedAt))).size,
  };
}
