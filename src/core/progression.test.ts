import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, levelFor, newlyUnlocked, streakMultiplier, xpOf } from "./progression";
import { buckets, hourHistogram, summarize } from "./stats";
import { seasonFor } from "./seasons";
import { rollReward } from "./rewards";
import type { Session } from "./types";

const MIN = 60_000;
const session = (over: Partial<Session> = {}): Session => ({
  id: Math.random().toString(), categoryId: "a", mode: "countdown", plannedMin: 25,
  startedAt: new Date(2026, 10, 4, 10).getTime(), endedAt: new Date(2026, 10, 4, 10, 25).getTime(),
  focusedMs: 25 * MIN, status: "completed", plantId: null, coins: 25, ...over,
});

describe("progresión", () => {
  it("niveles crecientes", () => {
    expect(levelFor(0)).toEqual({ level: 1, current: 0, needed: 60 });
    expect(levelFor(60).level).toBe(2);
    expect(levelFor(179).level).toBe(2);
    expect(levelFor(180)).toEqual({ level: 3, current: 0, needed: 180 });
  });

  it("solo las sesiones completadas dan experiencia", () => {
    expect(xpOf([session(), session({ status: "abandoned" })])).toBe(25);
  });

  it("multiplicador por racha", () => {
    expect(streakMultiplier(2)).toBe(1);
    expect(streakMultiplier(3)).toBe(1.1);
    expect(streakMultiplier(10)).toBe(1.25);
    expect(streakMultiplier(40)).toBe(1.5);
  });

  it("desbloquea logros una sola vez", () => {
    const ctx = { sessions: [session({ focusedMs: 70 * MIN })], plants: [], streak: 1, decorationsPlaced: 0, goalsMet: 0, pathTiles: 0, cellsBought: 0 };
    const first = newlyUnlocked(ctx, {}).map((a) => a.id);
    expect(first).toEqual(expect.arrayContaining(["first_seed", "first_hour"]));
    expect(first).not.toContain("marathon");
    expect(newlyUnlocked(ctx, Object.fromEntries(first.map((id) => [id, 1])))).toEqual([]);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it("el fertilizante sube la probabilidad de rareza", () => {
    // 0.13 cae fuera del 12% de rara en nivel 2, pero dentro con suerte x2
    const seq = (v: number) => { let i = 0; return () => (i++ === 0 ? v : 0); };
    expect(rollReward(30, seq(0.13)).rarity).toBe("common");
    expect(rollReward(30, seq(0.13), 2).rarity).toBe("rare");
  });
});

describe("estadísticas", () => {
  it("agrupa por día y categoría", () => {
    const now = new Date(2026, 10, 4, 20).getTime();
    const data = buckets([session(), session({ categoryId: "b" }), session({ endedAt: new Date(2026, 10, 2, 9).getTime() })], now, 7, "day");
    expect(data).toHaveLength(7);
    expect(data[6].total).toBe(50 * MIN);
    expect(data[6].byCategory).toEqual({ a: 25 * MIN, b: 25 * MIN });
    expect(data[4].total).toBe(25 * MIN);
  });

  it("reparte la sesión entre las horas que abarca", () => {
    const s = session({ startedAt: new Date(2026, 0, 1, 9, 30).getTime(), endedAt: new Date(2026, 0, 1, 10, 30).getTime(), focusedMs: 60 * MIN });
    const h = hourHistogram([s], 0);
    expect(h[9]).toBeCloseTo(30);
    expect(h[10]).toBeCloseTo(30);
  });

  it("resumen con tasa de completados", () => {
    const sum = summarize([session(), session({ status: "abandoned" }), session({ mode: "stopwatch" })], 0);
    expect(sum.completionRate).toBe(0.5);
    expect(sum.sessions).toBe(3);
  });
});

describe("estaciones", () => {
  it("se invierten entre hemisferios", () => {
    const nov = new Date(2026, 10, 4);
    expect(seasonFor(nov, "south")).toBe("spring");
    expect(seasonFor(nov, "north")).toBe("autumn");
    expect(seasonFor(new Date(2026, 0, 10), "south")).toBe("summer");
  });
});
