import { create } from "zustand";
import { isTauri } from "./platform";

/*
 * Integración con el escritorio. Todo es no-op en el navegador.
 */

export const GLOBAL_SHORTCUT = "CommandOrControl+Shift+Space";

/** null = todavía no se intentó registrar el atajo. */
export const useDesktopStatus = create<{ shortcutRegistered: boolean | null }>(() => ({ shortcutRegistered: null }));

export interface MiniState {
  kind: "focus" | "break" | "idle";
  clock: string;
  /**
   * Reloj en ms al momento `sentAt` y hacia dónde corre (-1 cuenta regresiva, 1 cronómetro, 0 quieto).
   * La mini ventana lo avanza sola: la principal, oculta, puede tener los timers ralentizados.
   */
  clockMs: number;
  clockDir: -1 | 0 | 1;
  sentAt: number;
  /** Cuánto avanza `progress` por ms (0 si está quieto). */
  progressRate: number;
  label: string;
  color: string;
  speciesId: string;
  growth: number;
  paused: boolean;
  progress: number | null;
}

/** `ready`: la mini ventana acaba de abrir y pide el estado sin esperar al próximo tick. */
export type MiniAction = "toggle" | "finish" | "skip-break" | "show-main" | "ready";

export async function updateTray(tooltip: string, toggleLabel: string) {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("update_tray", { tooltip, toggleLabel });
}

export async function setCloseToTray(enabled: boolean) {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("set_close_to_tray", { enabled });
}

export async function showMainWindow() {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("show_main_window");
}

export async function onTrayAction(handler: (action: string) => void): Promise<() => void> {
  if (!isTauri) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen<string>("tray", (e) => handler(e.payload));
}

export const MINI_WIDTH = 240;
export const MINI_HEIGHT = 300;
/** Alto extra cuando la mini ventana muestra el reproductor. */
export const MINI_MUSIC_HEIGHT = 74;

/**
 * Abre la mini ventana y oculta la principal: nunca están las dos a la vista.
 * Volver a la principal (desde la mini o la bandeja) cierra la mini; eso lo hace Rust en `show_main`.
 */
export async function openMiniWindow() {
  if (!isTauri) return;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const existing = await WebviewWindow.getByLabel("mini");
  if (existing) {
    await existing.show();
    await existing.setFocus();
  } else {
    new WebviewWindow("mini", {
      url: "index.html?mini=1",
      title: "Brote",
      width: MINI_WIDTH,
      height: MINI_HEIGHT,
      resizable: false,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
    });
  }
  await getCurrentWindow().hide();
}

export async function emitMiniState(state: MiniState) {
  if (!isTauri) return;
  const { emitTo } = await import("@tauri-apps/api/event");
  await emitTo("mini", "mini-state", state);
}

export async function onMiniAction(handler: (a: MiniAction) => void): Promise<() => void> {
  if (!isTauri) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen<MiniAction>("mini-action", (e) => handler(e.payload));
}

/** Devuelve false si el atajo ya lo usa otra aplicación. */
export async function registerGlobalShortcut(handler: () => void): Promise<boolean> {
  if (!isTauri) return false;
  try {
    const gs = await import("@tauri-apps/plugin-global-shortcut");
    if (await gs.isRegistered(GLOBAL_SHORTCUT)) await gs.unregister(GLOBAL_SHORTCUT);
    await gs.register(GLOBAL_SHORTCUT, (e) => {
      if (e.state === "Pressed") handler();
    });
    return true;
  } catch (err) {
    console.warn("No se pudo registrar el atajo global", err);
    return false;
  }
}

export async function getAutostart(): Promise<boolean> {
  if (!isTauri) return false;
  const { isEnabled } = await import("@tauri-apps/plugin-autostart");
  return isEnabled();
}

export async function setAutostart(enabled: boolean) {
  if (!isTauri) return;
  const a = await import("@tauri-apps/plugin-autostart");
  await (enabled ? a.enable() : a.disable());
}

/** Guarda un archivo de texto: diálogo nativo en Tauri, descarga en el navegador. */
export async function saveTextFile(defaultName: string, content: string, ext: "csv" | "json"): Promise<boolean> {
  if (isTauri) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
    if (!path) return false;
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(path, content);
    return true;
  }
  const blob = new Blob([content], { type: ext === "csv" ? "text/csv" : "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = defaultName;
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}
