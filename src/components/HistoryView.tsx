import { useMemo, useState, type CSSProperties } from "react";
import { useStore } from "../store";
import { currentStreak, focusedSince, startOfDay, startOfWeek } from "../core/stats";
import { formatDuration } from "../core/timer";
import { SPECIES_BY_ID } from "../core/rewards";
import { useNow } from "../lib/hooks";
import { MAX_TITLE_LEN, type Category, type Plant, type Session } from "../core/types";
import { Coin } from "./Coin";

const dayFmt = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });

export function HistoryView() {
  const now = useNow(60_000);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const plants = useStore((s) => s.plants);

  const week = startOfWeek(now);
  const byDay = useMemo(() => {
    const groups = new Map<number, Session[]>();
    for (const s of [...sessions].sort((a, b) => b.endedAt - a.endedAt)) {
      const d = startOfDay(s.endedAt);
      groups.set(d, [...(groups.get(d) ?? []), s]);
    }
    return [...groups.entries()];
  }, [sessions]);

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const plantById = Object.fromEntries(plants.map((p) => [p.id, p]));
  const goals = categories.filter((c) => !c.archived && c.weeklyGoalMin > 0);

  return (
    <div className="page">
      <div className="stat-row">
        <Stat label="Hoy" value={formatDuration(focusedSince(sessions, startOfDay(now)))} />
        <Stat label="Esta semana" value={formatDuration(focusedSince(sessions, week))} />
        <Stat label="Racha" value={`${currentStreak(sessions, now)} días`} />
        <Stat label="Plantas vivas" value={String(plants.filter((p) => !p.withered).length)} />
      </div>

      {goals.length > 0 && (
        <section className="panel">
          <h3>Metas semanales</h3>
          {goals.map((c) => {
            const done = focusedSince(sessions, week, c.id);
            const pct = Math.min(100, (done / (c.weeklyGoalMin * 60_000)) * 100);
            return (
              <div key={c.id} className="goal">
                <div className="goal-head">
                  <span>{c.icon} {c.name}</span>
                  <span className="muted small">{formatDuration(done)} / {formatDuration(c.weeklyGoalMin * 60_000)}</span>
                </div>
                <div className="bar" style={{ "--c": c.color } as CSSProperties}><div style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </section>
      )}

      <section className="panel">
        <h3>Sesiones</h3>
        {byDay.length === 0 && <p className="muted">Todavía no hay sesiones. ¡Plantá tu primera semilla!</p>}
        {byDay.map(([day, list]) => (
          <div key={day} className="day">
            <div className="day-head">
              <span>{dayFmt.format(day)}</span>
              <span className="muted small">{formatDuration(list.reduce((n, s) => n + s.focusedMs, 0))}</span>
            </div>
            {list.map((s) => (
              <SessionRow key={s.id} session={s} category={catById[s.categoryId]}
                plant={s.plantId ? plantById[s.plantId] : undefined} />
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

function SessionRow({ session: s, category: c, plant }: { session: Session; category?: Category; plant?: Plant }) {
  const renameSession = useStore((st) => st.renameSession);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => { setDraft(s.title ?? ""); setEditing(true); };
  const save = () => { renameSession(s.id, draft); setEditing(false); };

  return (
    <div className="session-row">
      <span className="dot" style={{ background: c?.color }} />
      <div className="grow session-name">
        {editing ? (
          <input className="title-field" autoFocus value={draft} maxLength={MAX_TITLE_LEN}
            placeholder="Nombre de la sesión" aria-label="Nombre de la sesión"
            onChange={(e) => setDraft(e.target.value)} onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }} />
        ) : (
          <button className="session-title-btn" onClick={startEdit} data-tip="Cambiar nombre">
            {s.title ? (
              <><span className="session-title">{s.title}</span><span className="muted small">{c?.icon} {c?.name ?? "—"}</span></>
            ) : (
              <><span>{c?.icon} {c?.name ?? "—"}</span><span className="muted small add-title">+ nombre</span></>
            )}
          </button>
        )}
      </div>
      <span className="muted small">{timeFmt.format(s.startedAt)} – {timeFmt.format(s.endedAt)}</span>
      <span className="dur">{formatDuration(s.focusedMs)}</span>
      <span className="small plant-name">
        {s.status === "abandoned" ? "🥀 Marchita" : plant ? SPECIES_BY_ID[plant.speciesId]?.name : "—"}
      </span>
      <span className="small coins">{s.coins > 0 && <>+{s.coins} <Coin /></>}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel stat">
      <div className="muted small">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
