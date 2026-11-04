import { useEffect } from "react";
import { useStore } from "./store";
import { elapsedMs, formatClock, isCountdownDone, remainingMs } from "./core/timer";
import { PREVIEW_SPECIES, SPECIES_BY_ID, tierFor, tierProgress } from "./core/rewards";
import { isTauri, notify, playChime } from "./lib/platform";
import { ambient } from "./lib/ambient";
import {
  emitMiniState, onMiniAction, onTrayAction, openMiniWindow, registerGlobalShortcut, setCloseToTray, showMainWindow,
  updateTray, useDesktopStatus, type MiniState,
} from "./lib/desktop";

export function breakRemainingMs(b: { startedAt: number; durationMin: number }, now: number): number {
  return Math.max(0, b.startedAt + b.durationMin * 60_000 - now);
}

/** Acción principal (atajo global, bandeja, mini ventana): pausar/reanudar, o plantar si no hay sesión. */
export function primaryAction() {
  const { active, breakTimer, togglePause, endBreak, startFromPrefs } = useStore.getState();
  if (active) togglePause();
  else {
    if (breakTimer) endBreak();
    startFromPrefs();
  }
}

function miniState(now: number): MiniState {
  const { active, breakTimer, categories } = useStore.getState();
  if (active) {
    const elapsed = elapsedMs(active, now);
    const remaining = remainingMs(active, now);
    const minutes = elapsed / 60_000;
    const cat = categories.find((c) => c.id === active.categoryId);
    return {
      kind: "focus",
      clock: formatClock(remaining ?? elapsed),
      label: `${cat?.icon ?? ""} ${active.title ?? cat?.name ?? ""}`,
      color: cat?.color ?? "#4f9a42",
      speciesId: PREVIEW_SPECIES[tierFor(minutes).index],
      growth: 0.55 + 0.45 * tierProgress(minutes),
      paused: active.pausedAt != null,
      progress: active.plannedMin ? elapsed / (active.plannedMin * 60_000) : null,
    };
  }
  if (breakTimer) {
    const left = breakRemainingMs(breakTimer, now);
    return {
      kind: "break",
      clock: formatClock(left),
      label: breakTimer.long ? "☕ Descanso largo" : "☕ Descanso",
      color: "#3fb6c9",
      speciesId: "sprout",
      growth: 1,
      paused: false,
      progress: 1 - left / (breakTimer.durationMin * 60_000),
    };
  }
  return { kind: "idle", clock: "--:--", label: "Sin sesión", color: "#4f9a42", speciesId: "sprout", growth: 0.6, paused: false, progress: null };
}

async function setWindowTitle(title: string) {
  document.title = title;
  if (isTauri) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setTitle(title);
  }
}

export function useAppController() {
  const hydrated = useStore((s) => s.hydrated);

  // Tick: completa temporizadores y descansos aunque la vista no esté montada o la app haya estado cerrada.
  useEffect(() => {
    if (!hydrated) return;
    let lastTitle = "";
    let lastTray = "";
    const tick = () => {
      const now = Date.now();
      const { active, breakTimer, finish, endBreak, prefs, startFromPrefs } = useStore.getState();

      if (active && isCountdownDone(active, now)) {
        const result = finish(now);
        if (result) {
          const name = SPECIES_BY_ID[result.plant.speciesId]?.name ?? "una planta";
          const brk = useStore.getState().breakTimer;
          void notify(
            "¡Sesión completada! 🌱",
            `Creció ${name} en tu jardín. +${result.session.coins} monedas` +
              (brk ? `. Tomate ${brk.durationMin} min de descanso.` : ""),
          );
        }
      } else if (!active && breakTimer && breakRemainingMs(breakTimer, now) === 0) {
        endBreak();
        if (prefs.sound) playChime(true);
        void notify("Fin del descanso ☕", prefs.pomodoro.autoStartFocus ? "Arrancó otra sesión de foco." : "¿Volvemos al foco?");
        if (prefs.pomodoro.autoStartFocus) startFromPrefs();
      }

      const mini = miniState(now);
      const title = mini.kind === "idle" ? "Brote" : `${mini.clock}${mini.paused ? " ⏸" : ""} · Brote`;
      if (title !== lastTitle) {
        lastTitle = title;
        void setWindowTitle(title);
      }
      const toggleLabel = mini.kind === "focus" ? (mini.paused ? "Reanudar" : "Pausar") : "Plantar";
      const tooltip = mini.kind === "idle" ? "Brote" : `Brote — ${mini.label.trim()} ${mini.clock}${mini.paused ? " (pausa)" : ""}`;
      if (tooltip + toggleLabel !== lastTray) {
        lastTray = tooltip + toggleLabel;
        void updateTray(tooltip, toggleLabel);
      }
      void emitMiniState(mini);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hydrated]);

  // Sonido al terminar una sesión
  const resultId = useStore((s) => s.lastResult?.session.id);
  useEffect(() => {
    const { lastResult, prefs } = useStore.getState();
    if (lastResult && prefs.sound) playChime(!lastResult.plant.withered);
  }, [resultId]);

  // Sonido ambiente solo mientras hay una sesión corriendo
  const running = useStore((s) => s.active != null && s.active.pausedAt == null);
  const kind = useStore((s) => s.prefs.ambient);
  const volume = useStore((s) => s.prefs.ambientVolume);
  useEffect(() => {
    if (running) ambient.play(kind, volume);
    else ambient.stop();
  }, [running, kind, volume]);

  const closeToTray = useStore((s) => s.prefs.closeToTray);
  useEffect(() => {
    void setCloseToTray(closeToTray);
  }, [closeToTray]);

  // Bandeja, mini ventana y atajo global
  useEffect(() => {
    if (!hydrated || !isTauri) return;
    const cleanups: Promise<() => void>[] = [
      onTrayAction((a) => {
        if (a === "toggle") primaryAction();
        if (a === "mini") void openMiniWindow();
      }),
      onMiniAction((a) => {
        const s = useStore.getState();
        if (a === "toggle") primaryAction();
        if (a === "finish" && s.active) s.finish();
        if (a === "skip-break") s.endBreak();
        if (a === "show-main") void showMainWindow();
      }),
    ];
    void registerGlobalShortcut(primaryAction).then((ok) => useDesktopStatus.setState({ shortcutRegistered: ok }));
    return () => cleanups.forEach((c) => void c.then((f) => f()));
  }, [hydrated]);
}
