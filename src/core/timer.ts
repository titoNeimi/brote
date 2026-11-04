import type { ActiveSession } from "./types";

export const MIN_SESSION_MS = 60_000;

export function elapsedMs(s: ActiveSession, now: number): number {
  const end = s.pausedAt ?? now;
  return Math.max(0, end - s.startedAt - s.pausedMs);
}

export function plannedMs(s: ActiveSession): number | null {
  return s.plannedMin == null ? null : s.plannedMin * 60_000;
}

export function remainingMs(s: ActiveSession, now: number): number | null {
  const planned = plannedMs(s);
  return planned == null ? null : Math.max(0, planned - elapsedMs(s, now));
}

export function isCountdownDone(s: ActiveSession, now: number): boolean {
  return s.mode === "countdown" && remainingMs(s, now) === 0;
}

/** Momento exacto en que terminó un countdown (útil si la app estuvo cerrada). */
export function countdownEndAt(s: ActiveSession): number | null {
  const planned = plannedMs(s);
  return planned == null ? null : s.startedAt + s.pausedMs + planned;
}

export function pause(s: ActiveSession, now: number): ActiveSession {
  return s.pausedAt != null ? s : { ...s, pausedAt: now };
}

export function resume(s: ActiveSession, now: number): ActiveSession {
  if (s.pausedAt == null) return s;
  return { ...s, pausedAt: null, pausedMs: s.pausedMs + (now - s.pausedAt) };
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
