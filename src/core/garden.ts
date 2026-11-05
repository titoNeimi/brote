import type { Category, Cell, Decoration, Paths, Plant, Plot } from "./types";

export const PLOT_WIDTH = 7;
export const PLOT_DEPTH = 5;
/** Tamaño de las parcelas en el formato v2; solo lo usa la migración. */
const LEGACY_WIDTH = 6;
const LEGACY_DEPTH = 4;
/** Pasto entre parcelas nuevas. */
export const PLOT_GAP = 2;
export const MARGIN = 2;
/** Pasto libre alrededor del contenido para poder seguir construyendo. */
const BORDER = 3;

export const key = (x: number, y: number) => `${x},${y}`;
const NEIGHBORS: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function rectCells(gx: number, gy: number, w: number, h: number): Cell[] {
  const out: Cell[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push([gx + x, gy + y]);
  return out;
}

export function newPlot(categoryId: string, gx: number, gy: number): Plot {
  return { categoryId, cells: rectCells(gx, gy, PLOT_WIDTH, PLOT_DEPTH), fence: "wood", bought: 0 };
}

/**
 * El cartel va delante de la fila más adelantada, frente a su baldosa del medio.
 * Esa baldosa (`gate`) deja la valla abierta como entrada.
 */
export function signOf(plot: Plot): { gate: Cell; cell: Cell } {
  const maxY = Math.max(...plot.cells.map((c) => c[1]));
  const row = plot.cells.filter((c) => c[1] === maxY).sort((a, b) => a[0] - b[0]);
  const gate = row[Math.floor(row.length / 2)];
  return { gate, cell: [gate[0], maxY + 1] };
}

export interface PlotView {
  plot: Plot;
  category: Category;
  plants: Plant[];
  sign: { gate: Cell; cell: Cell };
}

export interface GardenLayout {
  plots: PlotView[];
  /** Baldosa → categoría dueña. */
  cellOwner: Map<string, string>;
  /** Baldosa del cartel → categoría. */
  signOwner: Map<string, string>;
  plantAt: Map<string, Plant>;
  decoAt: Map<string, Decoration>;
  paths: Paths;
  width: number;
  height: number;
}

/** Se muestran las parcelas de categorías activas y las archivadas que todavía tienen plantas. */
export function layoutGarden(
  categories: Category[],
  plots: Plot[],
  plants: Plant[],
  decorations: Decoration[] = [],
  paths: Paths = {},
): GardenLayout {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const views: PlotView[] = [];
  for (const plot of plots) {
    const category = byId.get(plot.categoryId);
    if (!category || plot.cells.length === 0) continue;
    const own = plants.filter((p) => p.categoryId === plot.categoryId);
    if (category.archived && own.length === 0 && !holdsBuildings(plot, decorations)) continue;
    views.push({ plot, category, plants: own, sign: signOf(plot) });
  }

  const cellOwner = new Map<string, string>();
  const signOwner = new Map<string, string>();
  let maxX = 0, maxY = 0;
  const grow = (x: number, y: number) => { maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  for (const v of views) {
    for (const [x, y] of v.plot.cells) { cellOwner.set(key(x, y), v.category.id); grow(x, y); }
    signOwner.set(key(...v.sign.cell), v.category.id);
    grow(...v.sign.cell);
  }
  for (const d of decorations) grow(d.gx, d.gy);
  for (const k of Object.keys(paths)) grow(...(k.split(",").map(Number) as Cell));

  return {
    plots: views,
    cellOwner,
    signOwner,
    plantAt: new Map(plants.map((p) => [key(p.gx, p.gy), p])),
    decoAt: new Map(decorations.map((d) => [key(d.gx, d.gy), d])),
    paths,
    width: Math.max(12, maxX + 1 + BORDER),
    height: Math.max(10, maxY + 1 + BORDER),
  };
}

/** Si la parcela tiene decoraciones adentro (entonces no se puede ocultar). */
function holdsBuildings(plot: Plot, decorations: Decoration[]): boolean {
  const cells = new Set(plot.cells.map(([x, y]) => key(x, y)));
  return decorations.some((d) => cells.has(key(d.gx, d.gy)));
}

function inBounds(L: GardenLayout, x: number, y: number) {
  return x >= 0 && y >= 0 && x < L.width && y < L.height;
}

/** Baldosas que no son de ninguna parcela ni su cartel. */
function isGround(L: GardenLayout, x: number, y: number) {
  const k = key(x, y);
  return inBounds(L, x, y) && !L.cellOwner.has(k) && !L.signOwner.has(k);
}

/**
 * Las decoraciones se construyen solo dentro de las parcelas, en baldosas sin planta.
 * Pueden quedar sobre un camino. (Las que se compraron antes de esta regla siguen en el pasto.)
 */
export function canPlaceDecoration(L: GardenLayout, x: number, y: number): boolean {
  const k = key(x, y);
  return L.cellOwner.has(k) && !L.plantAt.has(k) && !L.decoAt.has(k);
}

export function canMoveDecoration(L: GardenLayout, deco: Decoration, x: number, y: number): boolean {
  return (deco.gx !== x || deco.gy !== y) && canPlaceDecoration(L, x, y);
}

/**
 * Los caminos van sobre el pasto (para unir parcelas) o dentro de una parcela en baldosas sin planta.
 * Nunca sobre un cartel. Las decoraciones pueden quedar encima.
 */
export function canPaintPath(L: GardenLayout, x: number, y: number, kind: string): boolean {
  const k = key(x, y);
  if (L.paths[k] === kind) return false;
  if (L.cellOwner.has(k)) return !L.plantAt.has(k);
  return isGround(L, x, y);
}

export function canErasePath(L: GardenLayout, x: number, y: number): boolean {
  return key(x, y) in L.paths;
}

interface ExpandOptions {
  /** Permite ocupar caminos (se borran). Lo usa el crecimiento automático. */
  overPaths?: boolean;
  /** No exige que la baldosa toque la parcela ni que esté dentro del mundo actual. */
  detached?: boolean;
}

/**
 * Una parcela se amplía con baldosas libres pegadas a ella. Nunca toca otra parcela
 * (para que no compartan valla) y empieza en x, y ≥ 1 para dejar el borde del mundo.
 * Puede ocupar la baldosa de su propio cartel: el cartel se corre hacia adelante.
 */
export function canExpand(L: GardenLayout, categoryId: string, x: number, y: number, opts: ExpandOptions = {}): boolean {
  const k = key(x, y);
  if (x < 1 || y < 1 || (!opts.detached && !inBounds(L, x, y))) return false;
  const sign = L.signOwner.get(k);
  if (L.cellOwner.has(k) || (sign && sign !== categoryId) || L.decoAt.has(k)) return false;
  if (!opts.overPaths && k in L.paths) return false;
  let touchesOwn = false;
  for (const [dx, dy] of NEIGHBORS) {
    const owner = L.cellOwner.get(key(x + dx, y + dy));
    if (owner === categoryId) touchesOwn = true;
    else if (owner) return false;
  }
  return touchesOwn || !!opts.detached;
}

export function expandPrice(plot: Plot): number {
  return 8 + 2 * plot.bought;
}

/**
 * Destino de una planta: solo dentro de su propia parcela, en una baldosa sin construcciones.
 * Si hay otra planta, se intercambian.
 */
export function moveTarget(L: GardenLayout, plant: Plant, x: number, y: number): "move" | "swap" | null {
  const k = key(x, y);
  if (plant.gx === x && plant.gy === y) return null;
  if (L.cellOwner.get(k) !== plant.categoryId || L.decoAt.has(k) || k in L.paths) return null;
  return L.plantAt.has(k) ? "swap" : "move";
}

/** Baldosas ocupadas para plantar: plantas, decoraciones y caminos. */
export function occupiedCells(plants: Plant[], decorations: Decoration[], paths: Paths): Set<string> {
  return new Set([...plants.map((p) => key(p.gx, p.gy)), ...decorations.map((d) => key(d.gx, d.gy)), ...Object.keys(paths)]);
}

export function freeCell(plot: Plot, taken: Set<string>, rand: () => number = Math.random): Cell | null {
  const free = plot.cells.filter(([x, y]) => !taken.has(key(x, y)));
  return free.length ? free[Math.floor(rand() * free.length)] : null;
}

/**
 * Baldosas que se suman solas cuando una parcela se llena: la fila de adelante,
 * o si está bloqueada, cualquier baldosa pegada; en último caso la más cercana libre.
 */
export function growCells(L: GardenLayout, plot: Plot): { cells: Cell[]; clearPaths: string[] } {
  const cx = plot.cells.reduce((n, c) => n + c[0], 0) / plot.cells.length;
  const own = new Set(plot.cells.map(([x, y]) => key(x, y)));

  for (const overPaths of [false, true]) {
    const candidates = new Map<string, Cell>();
    for (const [x, y] of plot.cells)
      for (const [dx, dy] of NEIGHBORS) {
        const c: Cell = [x + dx, y + dy];
        if (!own.has(key(...c)) && canExpand(L, plot.categoryId, c[0], c[1], { overPaths, detached: false }))
          candidates.set(key(...c), c);
      }
    if (candidates.size === 0) continue;
    const front = Math.max(...[...candidates.values()].map((c) => c[1]));
    const cells = [...candidates.values()]
      .filter((c) => c[1] === front)
      .sort((a, b) => Math.abs(a[0] - cx) - Math.abs(b[0] - cx))
      .slice(0, PLOT_WIDTH);
    return { cells, clearPaths: cells.map((c) => key(...c)).filter((k) => k in L.paths) };
  }

  // Rodeada por completo: la baldosa libre más cercana, aunque quede separada.
  const [sx, sy] = signOf(plot).cell;
  for (let r = 1; ; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && canExpand(L, plot.categoryId, sx + dx, sy + dy, { detached: true }))
          return { cells: [[sx + dx, sy + dy]], clearPaths: [] };
}

/** Lugar para la parcela de una categoría nueva: a la derecha de lo que ya hay, sin pisar nada. */
export function findPlotSpot(plots: Plot[], decorations: Decoration[], paths: Paths): Cell {
  const blocked = new Set<string>();
  for (const p of plots)
    for (const [x, y] of p.cells)
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) blocked.add(key(x + dx, y + dy));
  for (const p of plots) blocked.add(key(...signOf(p).cell));
  for (const d of decorations) blocked.add(key(d.gx, d.gy));
  for (const k of Object.keys(paths)) blocked.add(k);

  for (let gx = MARGIN; ; gx++) {
    // La parcela, una fila extra para el cartel y un margen de pasto
    const area = rectCells(gx - 1, MARGIN - 1, PLOT_WIDTH + 2, PLOT_DEPTH + 3);
    if (area.every(([x, y]) => !blocked.has(key(x, y)))) return [gx, MARGIN];
  }
}

/** Crea parcelas para las categorías activas que todavía no tienen una. */
export function ensurePlots(categories: Category[], plots: Plot[], decorations: Decoration[], paths: Paths): Plot[] {
  let out = plots;
  for (const c of categories) {
    if (c.archived || out.some((p) => p.categoryId === c.id)) continue;
    const [gx, gy] = findPlotSpot(out, decorations, paths);
    out = [...out, newPlot(c.id, gx, gy)];
  }
  return out;
}

/* ---------- Migración desde el formato v2 (parcelas rectangulares calculadas) ---------- */

export interface LegacyPlant extends Omit<Plant, "gx" | "gy"> {
  x: number;
  y: number;
}

/** Reproduce el layout viejo para convertir plantas a coordenadas del mundo y guardar las parcelas. */
export function migrateLegacyGarden(
  categories: Category[],
  legacyPlants: LegacyPlant[],
  decorations: Decoration[],
): { plots: Plot[]; plants: Plant[]; decorations: Decoration[] } {
  const visible = categories.filter((c) => !c.archived || legacyPlants.some((p) => p.categoryId === c.id));
  const plots: Plot[] = [];
  const plants: Plant[] = [];
  visible.forEach((c, i) => {
    const gx = MARGIN + i * (LEGACY_WIDTH + PLOT_GAP), gy = MARGIN;
    const own = legacyPlants.filter((p) => p.categoryId === c.id);
    const rows = Math.max(LEGACY_DEPTH, own.reduce((m, p) => Math.max(m, p.y), -1) + 2);
    plots.push({ categoryId: c.id, cells: rectCells(gx, gy, LEGACY_WIDTH, rows), fence: "wood", bought: 0 });
    for (const { x, y, ...rest } of own) plants.push({ ...rest, gx: gx + x, gy: gy + y });
  });

  // Las decoraciones que quedaron sobre una parcela o su cartel se corren a la baldosa libre más cercana.
  const taken = new Set<string>();
  for (const p of plots) {
    p.cells.forEach(([x, y]) => taken.add(key(x, y)));
    taken.add(key(...signOf(p).cell));
  }
  const moved = decorations.map((d) => {
    let spot: Cell = [d.gx, d.gy];
    for (let r = 0; taken.has(key(...spot)) || spot[0] < 0 || spot[1] < 0; r++) {
      spot = nearestRing(d.gx, d.gy, r, (x, y) => x >= 0 && y >= 0 && !taken.has(key(x, y))) ?? spot;
    }
    taken.add(key(...spot));
    return { ...d, gx: spot[0], gy: spot[1] };
  });
  return { plots, plants, decorations: moved };
}

function nearestRing(x0: number, y0: number, r: number, ok: (x: number, y: number) => boolean): Cell | null {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r && ok(x0 + dx, y0 + dy)) return [x0 + dx, y0 + dy];
  return null;
}

/* ---------- Límite de categorías ---------- */

/** Categorías activas que se pueden tener sin comprar más espacios. */
export const BASE_CATEGORY_SLOTS = 5;

/** Precio del próximo espacio de categoría, según cuántos hay. */
export function categorySlotPrice(slots: number): number {
  return 250 * (slots - BASE_CATEGORY_SLOTS + 1);
}
