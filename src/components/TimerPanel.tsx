import { useMemo, useState, type CSSProperties } from "react";
import { MAX_TITLE_LEN } from "../core/types";
import { useStore } from "../store";
import { elapsedMs, formatClock, formatDuration, MIN_SESSION_MS, remainingMs } from "../core/timer";
import { nextTier, PREVIEW_SPECIES, tierFor, tierProgress } from "../core/rewards";
import { streakMultiplier } from "../core/progression";
import { currentStreak } from "../core/stats";
import { FERTILIZER } from "../core/shop";
import { ensureNotificationPermission } from "../lib/platform";
import { useNow } from "../lib/hooks";
import { breakRemainingMs } from "../controller";
import { PlantPreview } from "./PlantPreview";
import { NowPlaying } from "./NowPlaying";

const PRESETS = [10, 25, 50, 90];

export function TimerPanel() {
  const active = useStore((s) => s.active);
  const onBreak = useStore((s) => s.breakTimer != null);
  return (
    <aside className="panel timer-panel">
      {active ? <ActiveTimer /> : onBreak ? <BreakPanel /> : <SetupTimer />}
      <NowPlaying />
    </aside>
  );
}

function SetupTimer() {
  const now = useNow(60_000);
  const categories = useStore((s) => s.categories).filter((c) => !c.archived);
  const prefs = useStore((s) => s.prefs);
  const fertilizer = useStore((s) => s.inventory.fertilizer);
  const sessions = useStore((s) => s.sessions);
  const pomodoroCount = useStore((s) => s.pomodoroCount);
  const setPrefs = useStore((s) => s.setPrefs);
  const start = useStore((s) => s.start);

  const categoryId = categories.some((c) => c.id === prefs.categoryId) ? prefs.categoryId : categories[0]?.id ?? null;
  const target = tierFor(prefs.mode === "countdown" ? prefs.minutes : 0);
  const mult = streakMultiplier(currentStreak(sessions, now));

  const onStart = () => {
    if (!categoryId) return;
    void ensureNotificationPermission();
    start(categoryId, prefs.mode, prefs.minutes, prefs.sessionTitle);
  };

  // Nombres usados antes en esta categoría, del más reciente al más viejo.
  const recentTitles = useMemo(() => {
    const seen = new Set<string>();
    for (let i = sessions.length - 1; i >= 0 && seen.size < 4; i--) {
      const s = sessions[i];
      if (s.categoryId === categoryId && s.title) seen.add(s.title);
    }
    return [...seen];
  }, [sessions, categoryId]);
  const title = prefs.sessionTitle ?? "";

  return (
    <>
      <h2>Nueva sesión</h2>

      <label className="field-label">Categoría</label>
      {categories.length === 0 ? (
        <p className="muted">Creá una categoría en la pestaña Categorías.</p>
      ) : (
        <div className="chips">
          {categories.map((c) => (
            <button key={c.id} className={`chip${c.id === categoryId ? " on" : ""}`} style={{ "--c": c.color } as CSSProperties}
              onClick={() => c.id !== categoryId && setPrefs({ categoryId: c.id, sessionTitle: undefined })}>
              <span>{c.icon}</span> {c.name}
            </button>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <>
          <label className="field-label" htmlFor="session-title">¿Qué vas a hacer? <span className="optional">(opcional)</span></label>
          <input id="session-title" className="title-field" value={title} maxLength={MAX_TITLE_LEN}
            placeholder="Ej.: Física I, capítulo 3" autoComplete="off"
            onChange={(e) => setPrefs({ sessionTitle: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") onStart(); }} />
          {recentTitles.some((t) => t !== title.trim()) && (
            <div className="chips title-suggestions">
              {recentTitles.filter((t) => t !== title.trim()).map((t) => (
                <button key={t} className="chip small" onClick={() => setPrefs({ sessionTitle: t })}>{t}</button>
              ))}
            </div>
          )}
        </>
      )}

      <label className="field-label">Modo</label>
      <div className="segmented">
        <button className={prefs.mode === "countdown" ? "on" : ""} onClick={() => setPrefs({ mode: "countdown" })}>
          Temporizador
        </button>
        <button className={prefs.mode === "stopwatch" ? "on" : ""} onClick={() => setPrefs({ mode: "stopwatch" })}>
          Cronómetro libre
        </button>
      </div>

      {prefs.mode === "countdown" ? (
        <>
          <label className="field-label">Duración · <strong>{formatDuration(prefs.minutes * 60_000)}</strong></label>
          <div className="chips">
            {PRESETS.map((m) => (
              <button key={m} className={`chip small${prefs.minutes === m ? " on" : ""}`} onClick={() => setPrefs({ minutes: m })}>
                {m} min
              </button>
            ))}
          </div>
          <input type="range" min={5} max={180} step={5} value={prefs.minutes}
            onChange={(e) => setPrefs({ minutes: Number(e.target.value) })} />
          <div className="target">
            <PlantPreview speciesId={PREVIEW_SPECIES[target.index]} size={96} />
            <div>
              <div className="muted small">Vas a cultivar</div>
              <strong>{target.name}</strong>
              <div className="muted small">Si te rendís antes, se marchita.</div>
            </div>
          </div>
          {prefs.pomodoro.enabled && (
            <p className="muted small">
              🍅 Pomodoro: sesión {(pomodoroCount % prefs.pomodoro.every) + 1} de {prefs.pomodoro.every} antes del descanso largo.
            </p>
          )}
        </>
      ) : (
        <p className="muted small hint">
          Sin meta fija: la planta crece mientras sigas. 10 min → flor, 25 → planta, 50 → arbusto, 90 → árbol.
        </p>
      )}

      {fertilizer > 0 && (
        <label className="check">
          <input type="checkbox" checked={prefs.useFertilizer} onChange={(e) => setPrefs({ useFertilizer: e.target.checked })} />
          🧪 Usar {FERTILIZER.name.toLowerCase()} (x2 rareza) · te quedan {fertilizer}
        </label>
      )}
      {mult > 1 && <p className="small streak-note">🔥 Racha activa: las monedas valen x{mult}</p>}

      <button className="primary big" disabled={!categoryId} onClick={onStart}>
        🌱 Plantar
      </button>
    </>
  );
}

function ActiveTimer() {
  const now = useNow(250);
  const active = useStore((s) => s.active)!;
  const category = useStore((s) => s.categories.find((c) => c.id === s.active?.categoryId));
  const { pause, resume, finish, cancel } = useStore.getState();
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);

  const elapsed = elapsedMs(active, now);
  const remaining = remainingMs(active, now);
  const minutes = elapsed / 60_000;
  const tier = tierFor(minutes);
  const next = nextTier(minutes);
  const cap = active.mode === "countdown" ? tierFor(active.plannedMin ?? 0) : null;
  const growth = 0.55 + 0.45 * tierProgress(minutes);
  const paused = active.pausedAt != null;
  const tooShort = elapsed < MIN_SESSION_MS;
  const progress = active.plannedMin ? elapsed / (active.plannedMin * 60_000) : null;

  return (
    <>
      <div className="active-head">
        <span className="tag" style={{ "--c": category?.color } as CSSProperties}>
          {category?.icon} {category?.name}
        </span>
        <span className="muted small">
          {active.fertilized && "🧪 "}{active.mode === "countdown" ? "Temporizador" : "Cronómetro"}
        </span>
      </div>

      <ActiveTitle key={active.startedAt} initial={active.title ?? ""} />

      <div className={`growing${paused ? " paused" : ""}`}>
        <PlantPreview speciesId={PREVIEW_SPECIES[tier.index]} growth={growth} size={200} />
      </div>

      <div className="clock">{formatClock(remaining ?? elapsed)}</div>
      {progress != null && (
        <div className="bar"><div style={{ width: `${Math.min(100, progress * 100)}%` }} /></div>
      )}
      <p className="muted small center">
        {paused
          ? "En pausa"
          : next && (!cap || next.index <= cap.index)
            ? `En ${Math.ceil(next.minMinutes - minutes)} min crece a ${next.name.toLowerCase()}`
            : `Nivel máximo: ${tier.name.toLowerCase()}. La especie se revela al terminar.`}
      </p>

      <div className="row">
        {paused ? (
          <button className="primary" onClick={resume}>▶ Reanudar</button>
        ) : (
          <button onClick={pause}>⏸ Pausar</button>
        )}
        {tooShort ? (
          <button className="ghost" onClick={cancel}>Cancelar</button>
        ) : active.mode === "stopwatch" ? (
          <button className="primary" onClick={() => finish()}>Cosechar</button>
        ) : confirmGiveUp ? (
          <>
            <button className="danger" onClick={() => finish()}>Sí, rendirme</button>
            <button onClick={() => setConfirmGiveUp(false)}>Seguir</button>
          </>
        ) : (
          <button className="ghost" onClick={() => setConfirmGiveUp(true)}>Rendirse</button>
        )}
      </div>
      {tooShort && <p className="muted small center">Las sesiones de menos de 1 minuto no se guardan.</p>}
      {confirmGiveUp && !tooShort && active.mode !== "stopwatch" && (
        <p className="muted small center danger-text">Si te rendís, la planta se marchita.</p>
      )}
    </>
  );
}

/** Nombre de la sesión en curso, editable. Se guarda al salir del campo o con Enter. */
function ActiveTitle({ initial }: { initial: string }) {
  const setActiveTitle = useStore((s) => s.setActiveTitle);
  const saved = useStore((s) => s.active?.title ?? "");
  const [draft, setDraft] = useState(initial);
  return (
    <input className="active-title" value={draft} maxLength={MAX_TITLE_LEN} placeholder="Ponerle nombre a esta sesión…"
      aria-label="Nombre de la sesión" autoComplete="off"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => setActiveTitle(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") { setDraft(saved); requestAnimationFrame(() => (e.target as HTMLInputElement).blur()); }
      }} />
  );
}

function BreakPanel() {
  const now = useNow(250);
  const breakTimer = useStore((s) => s.breakTimer)!;
  const { endBreak, startFromPrefs } = useStore.getState();
  const left = breakRemainingMs(breakTimer, now);
  const total = breakTimer.durationMin * 60_000;

  return (
    <>
      <div className="active-head">
        <span className="tag" style={{ "--c": "#1baf7a" } as CSSProperties}>☕ {breakTimer.long ? "Descanso largo" : "Descanso"}</span>
      </div>
      <div className="break-art">☕</div>
      <div className="clock">{formatClock(left)}</div>
      <div className="bar" style={{ "--c": "#1baf7a" } as CSSProperties}><div style={{ width: `${(1 - left / total) * 100}%` }} /></div>
      <p className="muted small center">Levantate, estirate, tomá agua. El jardín te espera.</p>
      <div className="row">
        <button onClick={endBreak}>Saltar descanso</button>
        <button className="primary" onClick={() => { endBreak(); startFromPrefs(); }}>🌱 Enfocar ya</button>
      </div>
    </>
  );
}
