import { useEffect, useState } from "react";
import { PlantPreview } from "./components/PlantPreview";
import { TooltipLayer } from "./components/Tooltip";
import type { MiniAction, MiniState } from "./lib/desktop";

/** Mini ventana siempre visible. Solo muestra lo que le manda la ventana principal. */
export default function MiniApp() {
  const [state, setState] = useState<MiniState | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      unlisten = await listen<MiniState>("mini-state", (e) => setState(e.payload));
    });
    return () => unlisten?.();
  }, []);

  const send = async (a: MiniAction) => {
    const { emitTo } = await import("@tauri-apps/api/event");
    await emitTo("main", "mini-action", a);
  };
  const close = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  };

  if (!state) return <div className="mini" data-tauri-drag-region><div className="mini-wait">🌱</div></div>;

  return (
    <div className="mini" data-tauri-drag-region>
      <div className="mini-top" data-tauri-drag-region>
        <span className="mini-label" data-tauri-drag-region>{state.label}</span>
        <button className="icon" data-tip="Abrir Brote" aria-label="Abrir Brote" onClick={() => void send("show-main")}>↗</button>
        <button className="icon" data-tip="Cerrar" aria-label="Cerrar" onClick={() => void close()}>✕</button>
      </div>
      <div className={`mini-plant${state.paused ? " paused" : ""}`} data-tauri-drag-region>
        <PlantPreview speciesId={state.speciesId} growth={state.growth} size={120} />
      </div>
      <div className="mini-clock" data-tauri-drag-region>{state.clock}</div>
      {state.progress != null && (
        <div className="bar" style={{ ["--c" as string]: state.color }}>
          <div style={{ width: `${Math.min(100, state.progress * 100)}%` }} />
        </div>
      )}
      <div className="row">
        {state.kind === "focus" && (
          <button className={state.paused ? "primary" : ""} onClick={() => void send("toggle")}>{state.paused ? "▶" : "⏸"}</button>
        )}
        {state.kind === "break" && <button onClick={() => void send("skip-break")}>Saltar</button>}
        {state.kind !== "focus" && <button className="primary" onClick={() => void send("toggle")}>🌱 Plantar</button>}
      </div>
      <TooltipLayer />
    </div>
  );
}
