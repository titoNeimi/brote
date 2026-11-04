import { create } from "zustand";
import type { Update } from "@tauri-apps/plugin-updater";
import { isTauri } from "./platform";

/*
 * Actualizaciones automáticas (tauri-plugin-updater).
 * Las versiones se publican como Releases de titoNeimi/brote; ver RELEASING.md.
 */

export type UpdateStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up-to-date"; checkedAt: number }
  | { kind: "available"; version: string; notes?: string }
  | { kind: "downloading"; progress: number | null }
  | { kind: "installing" }
  | { kind: "error"; message: string };

interface UpdaterState {
  status: UpdateStatus;
  currentVersion: string | null;
  /** El usuario cerró el aviso de esta versión; no se vuelve a mostrar hasta la próxima. */
  dismissedVersion: string | null;
}

export const useUpdater = create<UpdaterState>(() => ({
  status: { kind: "idle" },
  currentVersion: null,
  dismissedVersion: null,
}));

let pending: Update | null = null;

export async function loadCurrentVersion() {
  if (!isTauri) return;
  const { getVersion } = await import("@tauri-apps/api/app");
  useUpdater.setState({ currentVersion: await getVersion() });
}

/** Busca una versión nueva. Si `quiet`, los errores (p. ej. sin internet) no se muestran. */
export async function checkForUpdates({ quiet = false } = {}) {
  if (!isTauri) return;
  const { status } = useUpdater.getState();
  if (status.kind === "checking" || status.kind === "downloading" || status.kind === "installing") return;
  useUpdater.setState({ status: { kind: "checking" } });
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    pending = update;
    useUpdater.setState({
      status: update
        ? { kind: "available", version: update.version, notes: update.body }
        : { kind: "up-to-date", checkedAt: Date.now() },
    });
  } catch (e) {
    useUpdater.setState({ status: quiet ? { kind: "idle" } : { kind: "error", message: errorText(e) } });
  }
}

/** Descarga, instala y reinicia. Los datos ya están guardados: el store escribe en cada cambio. */
export async function installUpdate() {
  if (!pending) return;
  let total = 0, received = 0;
  useUpdater.setState({ status: { kind: "downloading", progress: null } });
  try {
    await pending.downloadAndInstall((ev) => {
      if (ev.event === "Started") total = ev.data.contentLength ?? 0;
      else if (ev.event === "Progress") {
        received += ev.data.chunkLength;
        useUpdater.setState({ status: { kind: "downloading", progress: total ? received / total : null } });
      } else if (ev.event === "Finished") useUpdater.setState({ status: { kind: "installing" } });
    });
    // En Windows el instalador cierra la app solo; en Linux/macOS hay que reiniciar.
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (e) {
    useUpdater.setState({ status: { kind: "error", message: errorText(e) } });
  }
}

function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/network|connect|dns|timed? ?out|request/i.test(msg)) return "No se pudo conectar. Revisá tu conexión.";
  return msg;
}

const CHECK_EVERY_MS = 6 * 60 * 60_000;

/** Revisa al iniciar (con un pequeño retraso para no frenar el arranque) y cada 6 horas. */
export function startAutoCheck(): () => void {
  if (!isTauri) return () => {};
  void loadCurrentVersion();
  const first = setTimeout(() => void checkForUpdates({ quiet: true }), 10_000);
  const every = setInterval(() => void checkForUpdates({ quiet: true }), CHECK_EVERY_MS);
  return () => { clearTimeout(first); clearInterval(every); };
}
