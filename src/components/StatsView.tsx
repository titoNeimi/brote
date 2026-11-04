import { useMemo, useState } from "react";
import { useStore } from "../store";
import { addDays, buckets, dailyMap, hourHistogram, startOfDay, startOfWeek, summarize, totalsByCategory } from "../core/stats";
import { formatDuration } from "../core/timer";
import { useNow } from "../lib/hooks";
import { fmtMin, HBars, Heatmap, HourColumns, StackedColumns } from "./charts";

type Range = "week" | "month" | "year";

const RANGES: { id: Range; label: string; count: number; unit: "day" | "week" }[] = [
  { id: "week", label: "7 días", count: 7, unit: "day" },
  { id: "month", label: "30 días", count: 30, unit: "day" },
  { id: "year", label: "12 meses", count: 52, unit: "week" },
];

const shortDay = new Intl.DateTimeFormat("es", { weekday: "short" });
const dayMonth = new Intl.DateTimeFormat("es", { day: "numeric", month: "numeric" });
const longDay = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" });

export function StatsView() {
  const now = useNow(60_000);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const [rangeId, setRangeId] = useState<Range>("week");
  const [showTable, setShowTable] = useState(false);
  const range = RANGES.find((r) => r.id === rangeId)!;

  const since = range.unit === "day" ? addDays(startOfDay(now), -(range.count - 1)) : addDays(startOfWeek(now), -(range.count - 1) * 7);
  const data = useMemo(() => buckets(sessions, now, range.count, range.unit), [sessions, now, range]);
  const summary = useMemo(() => summarize(sessions, since), [sessions, since]);
  const byCat = useMemo(() => totalsByCategory(sessions, since), [sessions, since]);
  const hours = useMemo(() => hourHistogram(sessions, since), [sessions, since]);
  const daily = useMemo(() => dailyMap(sessions), [sessions]);
  const days = Math.max(1, Math.round((startOfDay(now) - since) / 86_400_000) + 1);

  const catRows = categories
    .filter((c) => byCat[c.id])
    .map((c) => ({ id: c.id, label: `${c.icon} ${c.name}`, color: c.color, value: byCat[c.id] / 60_000 }))
    .sort((a, b) => b.value - a.value);

  const label = (t: number) =>
    range.unit === "week" ? dayMonth.format(t) : range.count <= 7 ? shortDay.format(t) : String(new Date(t).getDate());
  const longLabel = (t: number) => (range.unit === "week" ? `Semana del ${longDay.format(t)}` : longDay.format(t));
  const bestHour = hours.some((h) => h > 0) ? hours.indexOf(Math.max(...hours)) : null;

  return (
    <div className="page">
      <div className="filter-row">
        <div className="segmented">
          {RANGES.map((r) => (
            <button key={r.id} className={r.id === rangeId ? "on" : ""} onClick={() => setRangeId(r.id)}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="stat-row">
        <Tile label="Foco total" value={formatDuration(summary.total)} />
        <Tile label="Promedio por día" value={fmtMin(summary.total / 60_000 / days)} />
        <Tile label="Sesión promedio" value={formatDuration(summary.avgSession)} sub={`${summary.sessions} sesiones`} />
        <Tile label="Temporizadores completados"
          value={summary.completionRate == null ? "—" : `${Math.round(summary.completionRate * 100)}%`}
          sub={summary.longest ? `Récord: ${formatDuration(summary.longest)}` : undefined} />
      </div>

      <section className="panel">
        <div className="panel-head">
          <h3>Foco por {range.unit === "day" ? "día" : "semana"}</h3>
          <button className="ghost small" onClick={() => setShowTable((v) => !v)}>{showTable ? "Ver gráfico" : "Ver tabla"}</button>
        </div>
        {summary.total === 0 ? (
          <p className="muted">Sin sesiones en este período.</p>
        ) : showTable ? (
          <table className="data-table">
            <thead>
              <tr><th>{range.unit === "day" ? "Día" : "Semana"}</th>{catRows.map((c) => <th key={c.id}>{c.label}</th>)}<th>Total</th></tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.start}>
                  <td>{longLabel(d.start)}</td>
                  {catRows.map((c) => <td key={c.id}>{d.byCategory[c.id] ? fmtMin(d.byCategory[c.id] / 60_000) : "—"}</td>)}
                  <td><strong>{fmtMin(d.total / 60_000)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <StackedColumns data={data} categories={categories} label={label} longLabel={longLabel} />
        )}
      </section>

      <div className="two-col">
        <section className="panel">
          <h3>Por categoría</h3>
          {catRows.length ? <HBars rows={catRows} /> : <p className="muted">Sin datos.</p>}
        </section>
        <section className="panel">
          <h3>Hora del día</h3>
          {bestHour == null ? <p className="muted">Sin datos.</p> : (
            <>
              <p className="muted small">Te concentrás más entre las {bestHour}:00 y las {bestHour + 1}:00.</p>
              <HourColumns hours={hours} />
            </>
          )}
        </section>
      </div>

      <section className="panel">
        <h3>Últimos 6 meses</h3>
        <p className="muted small">{summary.activeDays} días activos en el período elegido.</p>
        <Heatmap daily={daily} now={now} />
      </section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel stat">
      <div className="muted small">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}
