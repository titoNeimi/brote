import { useCallback, useEffect, useState } from "react";
import { PlantPreview } from "./components/PlantPreview";
import { TooltipLayer } from "./components/Tooltip";
import { NowPlaying } from "./components/NowPlaying";
import { formatClock } from "./core/timer";
import { useNow } from "./lib/hooks";
import { MINI_HEIGHT, MINI_MUSIC_HEIGHT, MINI_WIDTH, type MiniAction, type MiniState } from "./lib/desktop";

const send = async (a: MiniAction) => {
  const { emitTo } = await import("@tauri-apps/api/event");
  await emitTo("main", "mini-action", a);
};

/**
 * Mini ventana siempre visible. Muestra lo que le manda la ventana principal (que queda oculta
 * mientras la mini está abierta) y avanza el reloj por su cuenta entre mensajes.
 */
export default function MiniApp() {
  const [state, setState] = useState<MiniState | null>(null);
  const now = useNow(250);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      unlisten = await listen<MiniState>("mini-state", (e) => setState(e.payload));
      void send("ready");
    });
    return () => unlisten?.();
  }, []);

  // La ventana crece cuando aparece el reproductor y vuelve a su tamaño cuando no suena nada.
  const onMusic = useCallback((visible: boolean) => {
    void import("@tauri-apps/api/window").then(async ({ getCurrentWindow, LogicalSize }) => {
      await getCurrentWindow().setSize(new LogicalSize(MINI_WIDTH, MINI_HEIGHT + (visible ? MINI_MUSIC_HEIGHT : 0)));
    });
  }, []);

  const backToMain = () => void send("show-main");
  const hide = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  };

  if (!state) return <div className="mini" data-tauri-drag-region><div className="mini-wait">🌱</div></div>;

  const dt = Math.max(0, now - state.sentAt);
  const clock = state.kind === "idle" ? state.clock : formatClock(Math.max(0, state.clockMs + state.clockDir * dt));
  const progress = state.progress == null ? null : state.progress + state.progressRate * dt;

  return (
    <div className="mini" data-tauri-drag-region>
      <div className="mini-top" data-tauri-drag-region>
        <span className="mini-label" data-tauri-drag-region>{state.label}</span>
        <button className="icon" data-tip="Volver a la ventana grande" aria-label="Volver a la ventana grande" onClick={backToMain}>↗</button>
        <button className="icon" data-tip="Ocultar (Brote sigue en la bandeja)" aria-label="Ocultar" onClick={() => void hide()}>✕</button>
      </div>
      <div className={`mini-plant${state.paused ? " paused" : ""}`} data-tauri-drag-region>
        <PlantPreview speciesId={state.speciesId} growth={state.growth} size={120} />
      </div>
      <div className="mini-clock" data-tauri-drag-region>{clock}</div>
      {progress != null && (
        <div className="bar" style={{ ["--c" as string]: state.color }}>
          <div style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      )}
      <div className="row">
        {state.kind === "focus" && (
          <button className={state.paused ? "primary" : ""} onClick={() => void send("toggle")}>{state.paused ? "▶" : "⏸"}</button>
        )}
        {state.kind === "break" && <button onClick={() => void send("skip-break")}>Saltar</button>}
        {state.kind !== "focus" && <button className="primary" onClick={() => void send("toggle")}>🌱 Plantar</button>}
      </div>
      <NowPlaying compact onVisibleChange={onMusic} />
      <TooltipLayer />
    </div>
  );
}
