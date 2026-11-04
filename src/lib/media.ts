import { useCallback, useEffect, useState } from "react";
import { isTauri } from "./platform";

/*
 * "Sonando ahora": el reproductor activo del sistema (Spotify, navegador, etc.).
 * Lo resuelve Rust con SMTC en Windows y MPRIS en Linux. En el navegador no hace nada.
 */

export interface MediaInfo {
  title: string;
  artist: string;
  album: string;
  playing: boolean;
  canPlayPause: boolean;
  canNext: boolean;
  canPrevious: boolean;
  art: string | null;
  source: string;
  /** Volumen de la app (0–1); null si no se puede controlar. */
  volume: number | null;
}

export type MediaAction = "play" | "pause" | "toggle" | "next" | "previous";

export async function getMedia(): Promise<MediaInfo | null> {
  if (!isTauri) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<MediaInfo | null>("media_status");
}

export async function mediaControl(action: MediaAction): Promise<boolean> {
  if (!isTauri) return false;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<boolean>("media_control", { action });
}

export async function setMediaVolume(volume: number): Promise<boolean> {
  if (!isTauri) return false;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<boolean>("media_set_volume", { volume });
}

const POLL_MS = 2000;

/** Consulta el reproductor cada 2 s mientras la ventana está visible. */
export function useNowPlaying() {
  const [info, setInfo] = useState<MediaInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getMedia();
      // Sin título no hay nada útil que mostrar (p. ej. Spotify abierto sin tema).
      setInfo(next && next.title ? next : null);
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(id);
      if (document.visibilityState !== "visible") return;
      void refresh();
      id = setInterval(refresh, POLL_MS);
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", start);
    };
  }, [refresh]);

  const control = useCallback(async (action: MediaAction) => {
    // Respuesta inmediata en el botón; el estado real llega con el próximo refresh.
    if (action === "toggle") setInfo((i) => (i ? { ...i, playing: !i.playing } : i));
    try {
      await mediaControl(action);
    } finally {
      setTimeout(refresh, 350);
    }
  }, [refresh]);

  return { info, control };
}
