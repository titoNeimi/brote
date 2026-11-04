import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Category } from "../core/types";
import type { Bucket } from "../core/stats";
import { addDays, startOfDay, startOfWeek } from "../core/stats";

/* Gráficos SVG livianos. Superficie = --panel; tinta en tokens de texto; color solo en las marcas. */

const SURFACE = "#fffdf7";
const GRID = "#ece6d6";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

interface Tip { x: number; y: number; content: ReactNode }

function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const node = tip && (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>{tip.content}</div>
  );
  return { show: setTip, hide: () => setTip(null), node };
}

/** Columna con extremo superior redondeado (4px) y base recta. */
function topRounded(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x} ${y + h} V${y + rr} Q${x} ${y} ${x + rr} ${y} H${x + w - rr} Q${x + w} ${y} ${x + w} ${y + rr} V${y + h} Z`;
}

function niceMax(v: number): number {
  if (v <= 0) return 60;
  const steps = [15, 30, 60, 120, 180, 240, 360, 480, 600, 900, 1200, 1800, 2400, 3600, 6000];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 6000) * 6000;
}

export function fmtMin(min: number): string {
  if (min < 1) return "0 min";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function fmtAxis(min: number): string {
  return min >= 60 ? `${+(min / 60).toFixed(1)} h` : `${min} m`;
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}><i style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  );
}

/** Columnas apiladas por categoría, una por día o semana. */
export function StackedColumns({
  data, categories, label, longLabel,
}: {
  data: Bucket[];
  categories: Category[];
  label: (start: number) => string;
  longLabel: (start: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const tip = useTooltip();
  const height = 220;
  const pad = { l: 44, r: 8, t: 10, b: 26 };
  const innerW = Math.max(10, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.total / 60_000)));
  const slot = innerW / data.length;
  const barW = Math.min(24, slot * 0.62);
  const y = (min: number) => pad.t + innerH - (min / max) * innerH;
  const ticks = [0, max / 2, max];
  // Etiquetas del eje x espaciadas para que no choquen
  const every = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 44)));
  const used = categories.filter((c) => data.some((d) => d.byCategory[c.id]));

  return (
    <div ref={ref} className="chart">
      {used.length > 1 && <Legend items={used.map((c) => ({ label: `${c.icon} ${c.name}`, color: c.color }))} />}
      <svg width={width} height={height}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">{fmtAxis(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          let acc = 0;
          const segs = used.filter((c) => d.byCategory[c.id]);
          return (
            <g key={d.start}>
              {segs.map((c, j) => {
                const v = d.byCategory[c.id] / 60_000;
                const y0 = y(acc), y1 = y(acc + v);
                acc += v;
                const h = Math.max(0, y0 - y1 - (j > 0 ? 2 : 0));
                const top = j === segs.length - 1;
                return top
                  ? <path key={c.id} d={topRounded(cx - barW / 2, y1, barW, h)} fill={c.color} />
                  : <rect key={c.id} x={cx - barW / 2} y={y1} width={barW} height={h} fill={c.color} />;
              })}
              {i % every === 0 && (
                <text x={cx} y={height - 8} textAnchor="middle" className="axis">{label(d.start)}</text>
              )}
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={innerH} fill="transparent"
                onMouseEnter={() => tip.show({
                  x: Math.min(cx + 12, width - 170), y: pad.t,
                  content: (
                    <>
                      <strong>{longLabel(d.start)}</strong>
                      {segs.map((c) => (
                        <div key={c.id} className="tip-row"><i style={{ background: c.color }} />{c.name}<span>{fmtMin(d.byCategory[c.id] / 60_000)}</span></div>
                      ))}
                      <div className="tip-row total">Total<span>{fmtMin(d.total / 60_000)}</span></div>
                    </>
                  ),
                })}
                onMouseLeave={tip.hide} />
            </g>
          );
        })}
        <line x1={pad.l} x2={width - pad.r} y1={y(0)} y2={y(0)} stroke="#cfc6b0" strokeWidth={1} />
      </svg>
      {tip.node}
    </div>
  );
}

/** Barras horizontales con el valor en la punta (una fila por categoría). */
export function HBars({ rows }: { rows: { id: string; label: string; color: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((n, r) => n + r.value, 0);
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div key={r.id} className="hbar" data-tip={`${r.label}: ${fmtMin(r.value)}`}>
          <span className="hbar-label">{r.label}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
            <span className="hbar-value">{fmtMin(r.value)} · {Math.round((r.value / total) * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Columnas de una sola serie: minutos por hora del día. */
export function HourColumns({ hours }: { hours: number[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const tip = useTooltip();
  const height = 170;
  const pad = { l: 44, r: 8, t: 10, b: 24 };
  const innerW = Math.max(10, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const max = niceMax(Math.max(...hours));
  const slot = innerW / 24;
  const barW = Math.min(24, slot - 2);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const best = hours.indexOf(Math.max(...hours));

  return (
    <div ref={ref} className="chart">
      <svg width={width} height={height}>
        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">{fmtAxis(t)}</text>
          </g>
        ))}
        {hours.map((v, h) => {
          const x = pad.l + slot * h + (slot - barW) / 2;
          return (
            <g key={h}>
              {v > 0 && <path d={topRounded(x, y(v), barW, y(0) - y(v))} fill={h === best ? "#2f7a2a" : "#86c26a"} />}
              {h % 3 === 0 && <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="axis">{h}h</text>}
              <rect x={pad.l + slot * h} y={pad.t} width={slot} height={innerH} fill="transparent"
                onMouseEnter={() => tip.show({
                  x: Math.min(x + slot, width - 150), y: pad.t,
                  content: <><strong>{h}:00 – {h + 1}:00</strong><div className="tip-row">Foco<span>{fmtMin(v)}</span></div></>,
                })}
                onMouseLeave={tip.hide} />
            </g>
          );
        })}
        <line x1={pad.l} x2={width - pad.r} y1={y(0)} y2={y(0)} stroke="#cfc6b0" />
      </svg>
      {tip.node}
    </div>
  );
}

/** Rampa secuencial de un solo tono (verde), de claro a oscuro. */
export const HEAT_STEPS = [
  { min: 0, color: "#ece5d4", label: "Sin foco" },
  { min: 1, color: "#c4e3ad", label: "Menos de 30 min" },
  { min: 30, color: "#8fc871", label: "30 min – 1 h" },
  { min: 60, color: "#5aa444", label: "1 – 2 h" },
  { min: 120, color: "#357f2b", label: "2 – 4 h" },
  { min: 240, color: "#1d5719", label: "4 h o más" },
];

function heatColor(min: number) {
  let c = HEAT_STEPS[0].color;
  for (const s of HEAT_STEPS) if (min >= s.min) c = s.color;
  return c;
}

const dayFmt = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("es", { month: "short" });

/** Calendario estilo GitHub: columnas = semanas, filas = lunes a domingo. */
export function Heatmap({ daily, now, weeks = 26 }: { daily: Map<number, number>; now: number; weeks?: number }) {
  const tip = useTooltip();
  const cell = 13, gap = 3, left = 32, top = 18;
  const first = addDays(startOfWeek(now), -(weeks - 1) * 7);
  const today = startOfDay(now);
  const cols = Array.from({ length: weeks }, (_, w) => addDays(first, w * 7));

  return (
    <div className="chart heatmap">
      <svg width={left + weeks * (cell + gap)} height={top + 7 * (cell + gap)}>
        {cols.map((weekStart, w) => {
          const prev = w > 0 ? new Date(cols[w - 1]).getMonth() : -1;
          const month = new Date(weekStart).getMonth();
          return (
            <g key={weekStart}>
              {month !== prev && (
                <text x={left + w * (cell + gap)} y={11} className="axis">{monthFmt.format(weekStart)}</text>
              )}
              {Array.from({ length: 7 }, (_, d) => {
                const day = addDays(weekStart, d);
                if (day > today) return null;
                const min = (daily.get(day) ?? 0) / 60_000;
                const x = left + w * (cell + gap), y = top + d * (cell + gap);
                return (
                  <rect key={d} x={x} y={y} width={cell} height={cell} rx={3} fill={heatColor(min)}
                    stroke={day === today ? "#3b3226" : SURFACE} strokeWidth={day === today ? 1.5 : 0}
                    onMouseEnter={() => tip.show({
                      x: x + cell + 6, y: y - 8,
                      content: <><strong>{dayFmt.format(day)}</strong><div className="tip-row">Foco<span>{fmtMin(min)}</span></div></>,
                    })}
                    onMouseLeave={tip.hide} />
                );
              })}
            </g>
          );
        })}
        {["lun", "", "mié", "", "vie", "", "dom"].map((l, i) => (
          <text key={i} x={0} y={top + i * (cell + gap) + 10} className="axis">{l}</text>
        ))}
      </svg>
      <div className="heat-legend">
        Menos
        {HEAT_STEPS.map((s) => <i key={s.min} style={{ background: s.color }} data-tip={s.label} />)}
        Más
      </div>
      {tip.node}
    </div>
  );
}
