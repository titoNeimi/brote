import type { StateStorage } from "zustand/middleware";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * En Tauri los datos van a un JSON en la carpeta de datos de la app (tauri-plugin-store);
 * en el navegador (desarrollo) a localStorage.
 */
export const appStorage: StateStorage = isTauri
  ? (() => {
      const storePromise = import("@tauri-apps/plugin-store").then(({ LazyStore }) => new LazyStore("brote.json"));
      return {
        async getItem(name) {
          const store = await storePromise;
          return (await store.get<string>(name)) ?? null;
        },
        async setItem(name, value) {
          const store = await storePromise;
          await store.set(name, value);
          await store.save();
        },
        async removeItem(name) {
          const store = await storePromise;
          await store.delete(name);
          await store.save();
        },
      };
    })()
  : {
      getItem: (name) => localStorage.getItem(name),
      setItem: (name, value) => localStorage.setItem(name, value),
      removeItem: (name) => localStorage.removeItem(name),
    };

export async function notify(title: string, body: string): Promise<void> {
  try {
    if (isTauri) {
      const n = await import("@tauri-apps/plugin-notification");
      let granted = await n.isPermissionGranted();
      if (!granted) granted = (await n.requestPermission()) === "granted";
      if (granted) n.sendNotification({ title, body });
      return;
    }
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission === "granted") new Notification(title, { body });
  } catch (err) {
    console.warn("No se pudo enviar la notificación", err);
  }
}

/** Pedirlo al iniciar una sesión, que es un gesto del usuario. */
export async function ensureNotificationPermission(): Promise<void> {
  try {
    if (isTauri) {
      const n = await import("@tauri-apps/plugin-notification");
      if (!(await n.isPermissionGranted())) await n.requestPermission();
    } else if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {
    // sin permiso: solo se pierde la notificación
  }
}

/** Arpegio corto sintetizado, para no depender de archivos de audio. */
export function playChime(happy = true): void {
  try {
    const ctx = new AudioContext();
    const notes = happy ? [523.25, 659.25, 783.99, 1046.5] : [392, 349.23, 293.66];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.12;
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // audio no disponible
  }
}
