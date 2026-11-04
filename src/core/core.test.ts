import { describe, expect, it } from "vitest";
import { cleanTitle, MAX_TITLE_LEN } from "./types";
import { elapsedMs, pause, resume, remainingMs, countdownEndAt, formatClock } from "./timer";
import { rollReward, tierFor, tierProgress, SPECIES_BY_ID, TIERS } from "./rewards";
import { currentStreak } from "./stats";
import type { ActiveSession, Session } from "./types";

const MIN = 60_000;

describe("timer", () => {
  const base: ActiveSession = {
    categoryId: "c", mode: "countdown", plannedMin: 25, startedAt: 0, pausedAt: null, pausedMs: 0,
  };

  it("descuenta las pausas del tiempo transcurrido", () => {
    let s = pause(base, 10 * MIN);
    expect(elapsedMs(s, 30 * MIN)).toBe(10 * MIN);
    s = resume(s, 30 * MIN);
    expect(elapsedMs(s, 35 * MIN)).toBe(15 * MIN);
    expect(remainingMs(s, 35 * MIN)).toBe(10 * MIN);
    expect(countdownEndAt(s)).toBe(45 * MIN);
  });

  it("formatea el reloj", () => {
    expect(formatClock(65_000)).toBe("01:05");
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });
});

describe("recompensas", () => {
  it("elige el nivel según los minutos", () => {
    expect(tierFor(5).index).toBe(0);
    expect(tierFor(25).index).toBe(2);
    expect(tierFor(200).index).toBe(4);
    expect(tierProgress(17.5)).toBeCloseTo(0.5);
  });

  it("cada nivel tiene al menos una especie común", () => {
    for (const t of TIERS) {
      const r = rollReward(t.minMinutes, () => 0.99);
      expect(SPECIES_BY_ID[r.speciesId].tier).toBe(t.index);
      expect(r.rarity).toBe("common");
    }
  });

  it("las rarezas dan más monedas", () => {
    const legendary = rollReward(100, () => 0);
    expect(legendary.rarity).toBe("legendary");
    expect(legendary.speciesId).toBe("golden");
    expect(legendary.coins).toBe(300);
  });
});

describe("racha", () => {
  const day = (d: number): Session => ({
    id: String(d), categoryId: "a", mode: "stopwatch", plannedMin: null,
    startedAt: 0, endedAt: new Date(2026, 0, d, 12).getTime(), focusedMs: MIN,
    status: "completed", plantId: null, coins: 0,
  });

  it("cuenta días consecutivos aunque hoy todavía no se haya estudiado", () => {
    const sessions = [day(1), day(3), day(4), day(5)];
    expect(currentStreak(sessions, new Date(2026, 0, 5, 20).getTime())).toBe(3);
    expect(currentStreak(sessions, new Date(2026, 0, 6, 9).getTime())).toBe(3);
    expect(currentStreak(sessions, new Date(2026, 0, 7, 9).getTime())).toBe(0);
  });
});

describe("cleanTitle", () => {
  it("recorta espacios y descarta nombres vacíos", () => {
    expect(cleanTitle("  Física   I  ")).toBe("Física I");
    expect(cleanTitle("   ")).toBeUndefined();
    expect(cleanTitle(undefined)).toBeUndefined();
    expect(cleanTitle("x".repeat(100))).toHaveLength(MAX_TITLE_LEN);
  });
});
