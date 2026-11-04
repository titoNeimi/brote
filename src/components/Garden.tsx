import { useEffect, useMemo, useRef, useState, type JSX, type PointerEvent as RPointerEvent } from "react";
import {
  canErasePath, canExpand, canMoveDecoration, canPaintPath, canPlaceDecoration, expandPrice, key, layoutGarden, moveTarget,
  type GardenLayout, type PlotView,
} from "../core/garden";
import { SPECIES_BY_ID } from "../core/rewards";
import { DECORATION_BY_ID, PATH_BY_ID } from "../core/shop";
import { SEASON_THEME, type Season, type SeasonTheme } from "../core/seasons";
import type { Cell, Decoration, Plant } from "../core/types";
import { useStore } from "../store";
import { PlantSprite, Sparkles, TIER_HEIGHT } from "./PlantSprite";
import { DecorationSprite, DECORATION_HEIGHT } from "./DecorationSprite";
import { FenceSegment, PathTile } from "./BuildSprites";
import { diamond, hash, iso, TILE_H, TILE_W } from "./iso";

const ISLAND_DEPTH = 18;
/** Ancho que ocupa el panel flotante de la izquierda; el encuadre inicial lo deja libre. */
const LEFT_INSET = 340;

export type GardenSelection = { kind: "plant"; plant: Plant } | { kind: "deco"; deco: Decoration };

/** Herramientas de construcción. `path: "erase"` borra caminos. */
export type Tool =
  | { kind: "deco"; deco: string; once?: boolean }
  | { kind: "path"; path: string }
  | { kind: "expand"; categoryId: string }
  | { kind: "move-plant"; plantId: string }
  | { kind: "move-deco"; decoId: string };

/** Herramientas que se aplican arrastrando, como un pincel. */
const isBrush = (t: Tool | null) => t?.kind === "path" || t?.kind === "expand";

interface Drawable {
  depth: number;
  key: string;
  el: JSX.Element;
}

const EDGES: { d: Cell; from: Cell; to: Cell }[] = [
  { d: [0, -1], from: [0, 0], to: [1, 0] },
  { d: [0, 1], from: [0, 1], to: [1, 1] },
  { d: [-1, 0], from: [0, 0], to: [0, 1] },
  { d: [1, 0], from: [1, 0], to: [1, 1] },
];

function plotDrawables(
  view: PlotView,
  newPlantId: string | null,
  selectedId: string | null,
  onSelect: (s: GardenSelection) => void,
): Drawable[] {
  const out: Drawable[] = [];
  const own = new Set(view.plot.cells.map(([x, y]) => key(x, y)));
  const [gateX, gateY] = view.sign.gate;

  // Valla: una arista por cada lado de baldosa que da afuera, ordenada por su punto medio.
  for (const [x, y] of view.plot.cells) {
    for (const e of EDGES) {
      if (own.has(key(x + e.d[0], y + e.d[1]))) continue;
      if (x === gateX && y === gateY && e.d[1] === 1) continue; // entrada frente al cartel
      const from: Cell = [x + e.from[0], y + e.from[1]], to: Cell = [x + e.to[0], y + e.to[1]];
      out.push({
        depth: (from[0] + to[0]) / 2 + (from[1] + to[1]) / 2,
        key: `f${view.category.id}${from}${to}`,
        el: <FenceSegment from={from} to={to} style={view.plot.fence} />,
      });
    }
  }

  const signG = { x: gateX + 0.9, y: gateY + 1.3 };
  const s = iso(signG.x, signG.y);
  const label = `${view.category.icon} ${view.category.name}`;
  const w = Math.max(44, label.length * 6 + 12);
  out.push({
    depth: signG.x + signG.y,
    key: `sign${view.category.id}`,
    el: (
      <g transform={`translate(${s.x} ${s.y})`}>
        <rect x={-1.5} y={-22} width={3} height={22} fill="#7a4f2e" />
        <rect x={-w / 2} y={-36} width={w} height={16} rx={3} fill="#c99a62" stroke="#8a5a33" strokeWidth={1.2} />
        <rect x={-w / 2 + 3} y={-33} width={4} height={10} rx={1.5} fill={view.category.color} />
        <text x={4} y={-24.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#4a2e17">{label}</text>
      </g>
    ),
  });

  for (const p of view.plants) {
    const c = iso(p.gx + 0.5, p.gy + 0.5);
    const tier = SPECIES_BY_ID[p.speciesId]?.tier ?? 0;
    out.push({
      depth: p.gx + p.gy + 1,
      key: p.id,
      el: (
        <g transform={`translate(${c.x} ${c.y})`}
          className={`plant${p.id === newPlantId ? " grow-in" : ""}${selectedId === p.id ? " selected" : ""}`}
          onClick={(e) => { e.stopPropagation(); onSelect({ kind: "plant", plant: p }); }}>
          <ellipse cx={0} cy={1} rx={8 + tier * 3} ry={(8 + tier * 3) / 2} fill="#000" opacity={0.15} />
          <PlantSprite speciesId={p.speciesId} withered={p.withered} swayDelay={hash(p.gx, p.gy) * 4} />
          {!p.withered && p.rarity !== "common" && <Sparkles rarity={p.rarity} height={TIER_HEIGHT[tier]} />}
          <rect x={-16} y={-TIER_HEIGHT[tier] - 6} width={32} height={TIER_HEIGHT[tier] + 10} fill="transparent" />
        </g>
      ),
    });
  }
  return out;
}

function Scenery({ kind, theme, season }: { kind: number; theme: SeasonTheme; season: Season }) {
  switch (kind) {
    case 0: // pasto alto
      return (
        <g stroke={season === "winter" ? "#9fb8ad" : "#5fa54a"} strokeWidth={1.3} strokeLinecap="round">
          <line x1={-3} y1={0} x2={-5} y2={-6} />
          <line x1={0} y1={0} x2={0} y2={-8} />
          <line x1={3} y1={0} x2={5} y2={-5} />
        </g>
      );
    case 1: // piedra
      return (
        <g>
          <ellipse cx={0} cy={-2} rx={6} ry={4} fill="#a3a8a8" />
          <ellipse cx={-1.5} cy={-3.5} rx={3} ry={1.8} fill={season === "winter" ? "#ffffff" : "#c4c9c9"} />
        </g>
      );
    case 2: // florcitas silvestres (hojas secas en otoño, nieve en invierno)
      return (
        <g>
          {[[-5, -1, "#ffffff"], [3, -3, "#ffe066"], [6, 1, "#ffffff"], [-1, 2, "#f7a8c8"]].map(([x, y, c]) => (
            <circle key={`${x}${y}`} cx={x as number} cy={y as number} r={1.4}
              fill={season === "autumn" ? "#d9822b" : season === "winter" ? "#ffffff" : (c as string)} />
          ))}
        </g>
      );
    default: // árbol redondo de borde
      return (
        <g>
          <ellipse cx={0} cy={1} rx={14} ry={7} fill="#000" opacity={0.12} />
          <rect x={-2.5} y={-14} width={5} height={14} fill="#7a4f2e" />
          <circle cx={0} cy={-26} r={15} fill={theme.tree.canopy} />
          {season === "spring" ? (
            [[-7, -30], [4, -34], [8, -24], [-3, -20], [-9, -22], [2, -27]].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r={2} fill={theme.tree.light} />
            ))
          ) : season === "winter" ? (
            <path d="M-14 -30 Q-10 -42 0 -41 Q10 -42 14 -30 Q8 -34 0 -33 Q-8 -34 -14 -30 Z" fill="#ffffff" />
          ) : (
            <circle cx={-5} cy={-31} r={8} fill={theme.tree.light} opacity={0.55} />
          )}
        </g>
      );
  }
}

/** Si la herramienta se puede aplicar en esa baldosa (incluye tener monedas suficientes). */
function canApply(tool: Tool, L: GardenLayout, x: number, y: number, coins: number): boolean {
  const s = useStore.getState();
  switch (tool.kind) {
    case "deco":
      return coins >= (DECORATION_BY_ID[tool.deco]?.price ?? Infinity) && canPlaceDecoration(L, x, y);
    case "path":
      return tool.path === "erase"
        ? canErasePath(L, x, y)
        : coins >= (PATH_BY_ID[tool.path]?.price ?? Infinity) && canPaintPath(L, x, y, tool.path);
    case "expand": {
      const plot = s.plots.find((p) => p.categoryId === tool.categoryId);
      return !!plot && coins >= expandPrice(plot) && canExpand(L, tool.categoryId, x, y);
    }
    case "move-plant": {
      const plant = s.plants.find((p) => p.id === tool.plantId);
      return !!plant && moveTarget(L, plant, x, y) != null;
    }
    case "move-deco": {
      const deco = s.decorations.find((d) => d.id === tool.decoId);
      return !!deco && canMoveDecoration(L, deco, x, y);
    }
  }
}

function applyTool(tool: Tool, x: number, y: number): boolean {
  const s = useStore.getState();
  switch (tool.kind) {
    case "deco": return s.placeDecoration(tool.deco, x, y);
    case "path": return tool.path === "erase" ? s.erasePath(x, y) : s.paintPath(x, y, tool.path);
    case "expand": return s.expandPlot(tool.categoryId, x, y);
    case "move-plant": return s.movePlant(tool.plantId, x, y);
    case "move-deco": return s.moveDecoration(tool.decoId, x, y);
  }
}

/** Lo que se ve en la baldosa bajo el puntero antes de aplicar la herramienta. */
function Ghost({ tool, x, y }: { tool: Tool; x: number; y: number }) {
  const c = iso(x + 0.5, y + 0.5);
  const at = (el: JSX.Element) => <g transform={`translate(${c.x} ${c.y})`}>{el}</g>;
  switch (tool.kind) {
    case "deco": return at(<DecorationSprite kind={tool.deco} />);
    case "move-deco": {
      const d = useStore.getState().decorations.find((d) => d.id === tool.decoId);
      return d ? at(<DecorationSprite kind={d.kind} />) : null;
    }
    case "move-plant": {
      const p = useStore.getState().plants.find((p) => p.id === tool.plantId);
      return p ? at(<PlantSprite speciesId={p.speciesId} withered={p.withered} sway={false} />) : null;
    }
    case "path": return tool.path === "erase" ? null : <PathTile gx={x} gy={y} kind={tool.path} />;
    case "expand": return <polygon points={diamond(x, y)} fill="#9a6b45" />;
  }
}

interface View { x: number; y: number; scale: number }

export interface GardenProps {
  onSelect: (s: GardenSelection | null) => void;
  selectedId: string | null;
  season: Season;
  tool: Tool | null;
  /** Se llama cuando una herramienta de un solo uso (comprar una decoración, mover) terminó. */
  onToolDone: () => void;
}

export function Garden({ onSelect, selectedId, season, tool, onToolDone }: GardenProps) {
  const categories = useStore((s) => s.categories);
  const plants = useStore((s) => s.plants);
  const decorations = useStore((s) => s.decorations);
  const plots = useStore((s) => s.plots);
  const paths = useStore((s) => s.paths);
  const coins = useStore((s) => s.coins);
  const newPlantId = useStore((s) => s.lastResult?.plant.id ?? null);
  const layout = useMemo(
    () => layoutGarden(categories, plots, plants, decorations, paths),
    [categories, plots, plants, decorations, paths],
  );
  const { width: W, height: H } = layout;
  const theme = SEASON_THEME[season];

  const { ground, scenery } = useMemo(() => {
    const nearPlot = (x: number, y: number) =>
      EDGES.some((e) => layout.cellOwner.has(key(x + e.d[0], y + e.d[1])));
    const ground: JSX.Element[] = [];
    const scenery: Drawable[] = [];
    for (let gy = 0; gy < H; gy++) {
      for (let gx = 0; gx < W; gx++) {
        const k = key(gx, gy);
        const r = hash(gx, gy);
        if (layout.cellOwner.has(k)) {
          ground.push(<polygon key={k} points={diamond(gx, gy)} fill={(gx + gy) % 2 ? "#9a6b45" : "#a37450"} />);
          const a = iso(gx + 0.2, gy + 0.5), b = iso(gx + 0.8, gy + 0.5);
          ground.push(<line key={`${k}l`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#86593a" strokeWidth={1.2} />);
          continue;
        }
        ground.push(<polygon key={k} points={diamond(gx, gy)} fill={theme.grass[Math.floor(r * theme.grass.length)]} />);
        if (k in layout.paths) {
          ground.push(<PathTile key={`${k}p`} gx={gx} gy={gy} kind={layout.paths[k]} />);
          continue;
        }
        if (layout.signOwner.has(k) || layout.decoAt.has(k) || nearPlot(gx, gy)) continue;
        const edge = gx === 0 || gy === 0;
        let kind = -1;
        if (edge && r < 0.35) kind = 3;
        else if (r < 0.1) kind = 0;
        else if (r < 0.14) kind = 1;
        else if (r < 0.2) kind = 2;
        if (kind < 0) continue;
        const c = iso(gx + 0.5, gy + 0.5);
        scenery.push({
          depth: gx + gy + 1,
          key: `s${k}`,
          el: <g transform={`translate(${c.x} ${c.y})`}><Scenery kind={kind} theme={theme} season={season} /></g>,
        });
      }
    }
    return { ground, scenery };
  }, [layout, W, H, theme, season]);

  const movingId = tool?.kind === "move-plant" ? tool.plantId : tool?.kind === "move-deco" ? tool.decoId : null;

  const objects = useMemo(() => {
    const decos: Drawable[] = decorations.map((d) => {
      const c = iso(d.gx + 0.5, d.gy + 0.5);
      const h = DECORATION_HEIGHT[d.kind] ?? 30;
      return {
        depth: d.gx + d.gy + 1,
        key: d.id,
        el: (
          <g transform={`translate(${c.x} ${c.y})`} className={`deco${selectedId === d.id ? " selected" : ""}`}
            onClick={(e) => { e.stopPropagation(); onSelect({ kind: "deco", deco: d }); }}>
            {d.kind !== "pond" && <ellipse cx={0} cy={1} rx={13} ry={6.5} fill="#000" opacity={0.13} />}
            <DecorationSprite kind={d.kind} />
            <rect x={-16} y={-h - 4} width={32} height={h + 10} fill="transparent" />
          </g>
        ),
      };
    });
    const all = [...scenery, ...decos, ...layout.plots.flatMap((p) => plotDrawables(p, newPlantId, selectedId, onSelect))];
    return all.sort((a, b) => a.depth - b.depth);
  }, [scenery, decorations, layout, newPlantId, selectedId, onSelect]);

  // Baldosas donde se puede usar la herramienta, resaltadas
  const targets = useMemo(() => {
    if (!tool || tool.kind === "deco" || tool.kind === "path" || tool.kind === "move-deco") return [];
    const out: string[] = [];
    for (let gy = 0; gy < H; gy++)
      for (let gx = 0; gx < W; gx++) if (canApply(tool, layout, gx, gy, coins)) out.push(diamond(gx, gy));
    return out;
  }, [tool, layout, W, H, coins]);

  // Bordes de la isla
  const left = [iso(0, H), iso(W, H)];
  const right = [iso(W, 0), iso(W, H)];
  const face = (pts: { x: number; y: number }[], d: number) =>
    `${pts[0].x},${pts[0].y} ${pts[1].x},${pts[1].y} ${pts[1].x},${pts[1].y + d} ${pts[0].x},${pts[0].y + d}`;

  // Vista: arrastre, zoom y pincel
  const bounds = { minX: -H * 32 - 20, maxX: W * 32 + 20, minY: -90, maxY: (W + H) * 16 + ISLAND_DEPTH + 20 };
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const userMoved = useRef(false);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const painting = useRef<string | null>(null);
  const suppressClick = useRef(false);
  const [hover, setHover] = useState<Cell | null>(null);

  const anim = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  /** Encuadra todo el jardín. Con `animate` viaja suavemente desde donde esté la vista. */
  const fit = (animate = false) => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height: ch } = el.getBoundingClientRect();
    const inset = width > 700 ? LEFT_INSET : 0;
    const cw = width - inset;
    const bw = bounds.maxX - bounds.minX, bh = bounds.maxY - bounds.minY;
    const scale = Math.min(2.2, Math.min(cw / bw, ch / bh) * 0.92);
    const target = {
      scale,
      x: inset + cw / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
      y: ch / 2 - ((bounds.minY + bounds.maxY) / 2) * scale,
    };
    cancelAnimationFrame(anim.current);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduced) return setView(target);
    const from = view, t0 = performance.now(), dur = 450;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      // La escala se interpola en log para que el zoom se sienta parejo.
      const sc = Math.exp(Math.log(from.scale) + (Math.log(target.scale) - Math.log(from.scale)) * e);
      setView({ scale: sc, x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e });
      if (t < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };
  const recenter = () => { userMoved.current = false; fit(true); };

  useEffect(() => {
    if (!userMoved.current) fit();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
      if (!userMoved.current) fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H]);

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      userMoved.current = true;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      setView((v) => {
        const scale = Math.min(4, Math.max(0.3, v.scale * Math.exp(-e.deltaY * 0.0015)));
        const k = scale / v.scale;
        return { scale, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /** Baldosa bajo el puntero (inversa de la proyección isométrica). */
  const tileAt = (clientX: number, clientY: number): Cell => {
    const rect = containerRef.current!.getBoundingClientRect();
    const wx = (clientX - rect.left - view.x) / view.scale;
    const wy = (clientY - rect.top - view.y) / view.scale;
    return [
      Math.floor((wy / (TILE_H / 2) + wx / (TILE_W / 2)) / 2),
      Math.floor((wy / (TILE_H / 2) - wx / (TILE_W / 2)) / 2),
    ];
  };

  /** Aplica la herramienta en una baldosa; el estado se lee fresco porque el pincel aplica varias por render. */
  const applyAt = ([x, y]: Cell) => {
    if (!tool) return;
    const s = useStore.getState();
    const L = layoutGarden(s.categories, s.plots, s.plants, s.decorations, s.paths);
    if (!canApply(tool, L, x, y, s.coins)) return;
    if (applyTool(tool, x, y) && (tool.kind === "move-plant" || tool.kind === "move-deco" || (tool.kind === "deco" && tool.once)))
      onToolDone();
  };

  const onPointerDown = (e: RPointerEvent) => {
    if (e.button === 0 && isBrush(tool)) {
      const t = tileAt(e.clientX, e.clientY);
      painting.current = key(...t);
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      applyAt(t);
      return;
    }
    cancelAnimationFrame(anim.current);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onPointerMove = (e: RPointerEvent) => {
    if (tool) {
      const t = tileAt(e.clientX, e.clientY);
      if (!hover || hover[0] !== t[0] || hover[1] !== t[1]) setHover(t);
      if (painting.current && painting.current !== key(...t)) {
        painting.current = key(...t);
        applyAt(t);
      }
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) (e.currentTarget as Element).setPointerCapture(e.pointerId);
    d.moved = true;
    userMoved.current = true;
    setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
  };
  const onPointerUp = () => {
    // Después de arrastrar o pintar, el click que sigue no debe seleccionar ni aplicar nada.
    suppressClick.current = !!drag.current?.moved || painting.current != null;
    drag.current = null;
    painting.current = null;
  };

  // ¿Cuánto del jardín queda en pantalla? Si casi nada, ofrecemos volver.
  const ix0 = view.x + bounds.minX * view.scale, ix1 = view.x + bounds.maxX * view.scale;
  const iy0 = view.y + bounds.minY * view.scale, iy1 = view.y + bounds.maxY * view.scale;
  const visW = Math.max(0, Math.min(ix1, size.w) - Math.max(ix0, 0));
  const visH = Math.max(0, Math.min(iy1, size.h) - Math.max(iy0, 0));
  const islandArea = (ix1 - ix0) * (iy1 - iy0);
  const lost = size.w > 0 && visW * visH < 0.25 * Math.min(islandArea, size.w * size.h);

  const showHover = tool && hover && hover[0] >= 0 && hover[1] >= 0 && hover[0] < W && hover[1] < H;
  const hoverValid = showHover ? canApply(tool, layout, hover[0], hover[1], coins) : false;

  return (
    <div className={`garden${tool ? " building" : ""}`} ref={containerRef}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerCancel={() => { drag.current = null; painting.current = null; }}
      onPointerLeave={() => setHover(null)} onContextMenu={(e) => e.preventDefault()}
      style={{ background: `linear-gradient(${theme.sky[0]}, ${theme.sky[1]})` }}>
      <svg width="100%" height="100%"
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.stopPropagation();
            suppressClick.current = false;
            return;
          }
          if (tool) {
            e.stopPropagation();
            if (!isBrush(tool)) applyAt(tileAt(e.clientX, e.clientY));
          }
        }}
        onClick={() => onSelect(null)}>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <polygon points={face(left, ISLAND_DEPTH)} fill="#8a5a3b" />
          <polygon points={face(right, ISLAND_DEPTH)} fill="#6e4630" />
          <polygon points={face(left, 4)} fill={theme.rim[0]} />
          <polygon points={face(right, 4)} fill={theme.rim[1]} />
          {ground}
          {targets.map((pts) => <polygon key={pts} points={pts} fill="#ffffff" opacity={0.3} />)}
          {showHover && (
            <polygon points={diamond(hover[0], hover[1])} fill={hoverValid ? "#ffffff" : "#e34948"} opacity={0.45} />
          )}
          {showHover && hoverValid && (tool.kind === "path" || tool.kind === "expand") && (
            <g opacity={0.75} pointerEvents="none"><Ghost tool={tool} x={hover[0]} y={hover[1]} /></g>
          )}
          {objects.map((o) => (
            <g key={o.key} opacity={o.key === movingId ? 0.35 : 1}>{o.el}</g>
          ))}
          {showHover && tool.kind !== "path" && tool.kind !== "expand" && (
            <g opacity={hoverValid ? 0.75 : 0.35} pointerEvents="none"><Ghost tool={tool} x={hover[0]} y={hover[1]} /></g>
          )}
        </g>
      </svg>
      <div className="garden-controls">
        <button data-tip="Acercar" aria-label="Acercar" onClick={() => { userMoved.current = true; setView((v) => zoomCenter(v, 1.2, containerRef.current)); }}>＋</button>
        <button data-tip="Alejar" aria-label="Alejar" onClick={() => { userMoved.current = true; setView((v) => zoomCenter(v, 1 / 1.2, containerRef.current)); }}>－</button>
        <button data-tip="Centrar el jardín" aria-label="Centrar el jardín" onClick={recenter}>
          <svg viewBox="0 0 20 20" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
            <circle cx={10} cy={10} r={5.5} />
            <circle cx={10} cy={10} r={1.6} fill="currentColor" stroke="none" />
            <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
          </svg>
        </button>
      </div>
      {lost && (
        <button className="back-to-garden" onPointerDown={(e) => e.stopPropagation()} onClick={recenter}>
          🌱 Volver al jardín
        </button>
      )}
    </div>
  );
}

function zoomCenter(v: View, factor: number, el: HTMLElement | null): View {
  if (!el) return v;
  const { width, height } = el.getBoundingClientRect();
  const scale = Math.min(4, Math.max(0.3, v.scale * factor));
  const k = scale / v.scale;
  return { scale, x: width / 2 - (width / 2 - v.x) * k, y: height / 2 - (height / 2 - v.y) * k };
}

/** Pétalos, hojas, copos o luciérnagas según la estación. Solo decorativo. */
export function SeasonParticles({ season }: { season: Season }) {
  const kind = SEASON_THEME[season].particle;
  const items = useMemo(
    () => Array.from({ length: kind === "firefly" ? 14 : 22 }, (_, i) => ({
      left: hash(i, 7) * 100,
      top: hash(i, 3) * 100,
      delay: -hash(i, 11) * 14,
      duration: 9 + hash(i, 5) * 8,
      size: 0.7 + hash(i, 13) * 0.6,
    })),
    [kind],
  );
  return (
    <div className={`particles ${kind}`} aria-hidden>
      {items.map((p, i) => (
        <span key={i} style={{
          left: `${p.left}%`,
          top: kind === "firefly" ? `${30 + p.top * 0.6}%` : undefined,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          ["--s" as string]: p.size,
        }} />
      ))}
    </div>
  );
}
