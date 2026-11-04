import { describe, expect, it } from "vitest";
import {
  canErasePath, canExpand, canPaintPath, canPlaceDecoration, ensurePlots, freeCell, growCells, key, layoutGarden,
  migrateLegacyGarden, moveTarget, newPlot, signOf, type LegacyPlant,
} from "./garden";
import type { Category, Decoration, Plant, Plot } from "./types";

const cat = (id: string, archived = false): Category => ({
  id, name: id, icon: "", color: "", weeklyGoalMin: 0, archived, createdAt: 0,
});
const plant = (id: string, gx: number, gy: number, categoryId = "a"): Plant => ({
  id, sessionId: "", categoryId, speciesId: "daisy", rarity: "common", withered: false, gx, gy, plantedAt: 0,
});

describe("parcelas", () => {
  const plotA = newPlot("a", 2, 2); // x 2..7, y 2..5
  const plotB = newPlot("b", 10, 2);

  it("el cartel va delante de la fila más adelantada", () => {
    expect(signOf(plotA)).toEqual({ gate: [5, 5], cell: [5, 6] });
  });

  it("solo se amplía con baldosas libres pegadas a la propia parcela", () => {
    const L = layoutGarden([cat("a"), cat("b")], [plotA, plotB], [], [], { "8,3": "stone" });
    expect(canExpand(L, "a", 1, 3)).toBe(true); // a la izquierda
    expect(canExpand(L, "a", 4, 6)).toBe(true); // adelante
    expect(canExpand(L, "a", 5, 6)).toBe(true); // su propio cartel (se corre)
    expect(canExpand(L, "b", 13, 6)).toBe(true);
    expect(canExpand(L, "a", 13, 6)).toBe(false); // el cartel de otra parcela
    expect(canExpand(L, "a", 3, 3)).toBe(false); // ya es parcela
    expect(canExpand(L, "a", 8, 3)).toBe(false); // camino
    expect(canExpand(L, "a", 9, 3)).toBe(false); // no toca la parcela
    expect(canExpand(L, "a", 8, 2)).toBe(true);
    // pegada a la otra parcela: compartirían valla
    const L2 = layoutGarden([cat("a"), cat("b")], [{ ...plotA, cells: [...plotA.cells, [8, 2]] }, plotB], [], [], {});
    expect(canExpand(L2, "a", 9, 2)).toBe(false);
  });

  it("caminos y decoraciones van sobre el pasto, nunca sobre una parcela o su cartel", () => {
    const deco: Decoration = { id: "d", kind: "bench", gx: 1, gy: 8, price: 80 };
    const L = layoutGarden([cat("a")], [plotA], [], [deco], { "1,9": "dirt" });
    expect(canPaintPath(L, 3, 3, "dirt")).toBe(false);
    expect(canPaintPath(L, 5, 6, "dirt")).toBe(false);
    expect(canPaintPath(L, 1, 8, "dirt")).toBe(true); // debajo de una decoración
    expect(canPaintPath(L, 1, 9, "dirt")).toBe(false); // ya es ese camino
    expect(canPaintPath(L, 1, 9, "brick")).toBe(true);
    expect(canErasePath(L, 1, 9)).toBe(true);
    expect(canPlaceDecoration(L, 1, 9)).toBe(true); // sobre un camino
    expect(canPlaceDecoration(L, 1, 8)).toBe(false); // ocupada
    expect(canPlaceDecoration(L, 5, 6)).toBe(false); // cartel
  });

  it("las plantas se mueven dentro de su parcela e intercambian lugar", () => {
    const p1 = plant("1", 2, 2), p2 = plant("2", 3, 2), other = plant("3", 10, 2, "b");
    const L = layoutGarden([cat("a"), cat("b")], [plotA, plotB], [p1, p2, other]);
    expect(moveTarget(L, p1, 4, 4)).toBe("move");
    expect(moveTarget(L, p1, 3, 2)).toBe("swap");
    expect(moveTarget(L, p1, 2, 2)).toBeNull();
    expect(moveTarget(L, p1, 11, 2)).toBeNull(); // otra parcela
    expect(moveTarget(L, p1, 1, 1)).toBeNull(); // pasto
  });

  it("cuando se llena, crece por la fila de adelante y puede pisar caminos", () => {
    const full = plotA.cells.map(([x, y], i) => plant(String(i), x, y));
    expect(freeCell(plotA, full)).toBeNull();
    const L = layoutGarden([cat("a")], [plotA], full, [], { "3,6": "stone" });
    const grown = growCells(L, plotA);
    // la fila de adelante (incluido el lugar del cartel), respetando el camino del usuario
    expect(grown.cells.map(([x]) => x).sort()).toEqual([2, 4, 5, 6, 7]);
    expect(grown.cells.every(([, y]) => y === 6)).toBe(true);
    expect(grown.clearPaths).toEqual([]);

    // Rodeada de caminos: los pisa
    const ring: Record<string, string> = {};
    for (let x = 1; x <= 8; x++) for (let y = 1; y <= 6; y++) if (!plotA.cells.some(([cx, cy]) => cx === x && cy === y)) ring[key(x, y)] = "dirt";
    const blocked = growCells(layoutGarden([cat("a")], [plotA], full, [], ring), plotA);
    expect(blocked.cells.every(([, y]) => y === 6)).toBe(true);
    expect(blocked.clearPaths).toHaveLength(blocked.cells.length);
  });

  it("crea parcelas para categorías nuevas sin pisar nada", () => {
    const deco: Decoration = { id: "d", kind: "bench", gx: 11, gy: 3, price: 80 };
    const plots = ensurePlots([cat("a"), cat("b")], [plotA], [deco], {});
    const b = plots.find((p) => p.categoryId === "b")!;
    const cells = new Set(b.cells.map(([x, y]) => key(x, y)));
    expect(cells.has("11,3")).toBe(false);
    expect(plotA.cells.some(([x, y]) => cells.has(key(x, y)))).toBe(false);
    expect(ensurePlots([cat("a"), cat("c", true)], [plotA], [], {})).toHaveLength(1); // archivada: sin parcela nueva
  });

  it("oculta parcelas de categorías archivadas sin plantas", () => {
    const L = layoutGarden([cat("a", true), cat("b", true)], [plotA, plotB], [plant("1", 10, 2, "b")]);
    expect(L.plots.map((v) => v.category.id)).toEqual(["b"]);
  });
});

describe("migración v2 → v3", () => {
  it("convierte plantas a coordenadas del mundo y corre decoraciones que quedaron encima", () => {
    const legacy: LegacyPlant[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i), sessionId: "", categoryId: "a", speciesId: "daisy", rarity: "common", withered: false,
      x: i % 6, y: Math.floor(i / 6), plantedAt: 0,
    }));
    const deco: Decoration = { id: "d", kind: "bench", gx: 3, gy: 3, price: 80 };
    const { plots, plants, decorations } = migrateLegacyGarden([cat("a"), cat("b")], legacy, [deco]);
    expect(plots).toHaveLength(2);
    expect(plots[0].cells).toHaveLength(24); // 6 × 4
    expect(plots[1].cells[0]).toEqual([10, 2]);
    expect(plants[7]).toMatchObject({ gx: 3, gy: 3 });
    const owned = new Set(plots.flatMap((p: Plot) => p.cells.map(([x, y]) => key(x, y))));
    expect(owned.has(key(decorations[0].gx, decorations[0].gy))).toBe(false);
  });
});
