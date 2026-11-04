import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { cleanTitle, type ActiveSession, type BreakTimer, type Category, type Cell, type Decoration, type Paths, type Plant, type Plot, type Session, type TimerMode } from "./core/types";
import * as timer from "./core/timer";
import { rollReward, tierFor } from "./core/rewards";
import {
  canErasePath, canExpand, canMoveDecoration, canPaintPath, canPlaceDecoration, ensurePlots, expandPrice, findPlotSpot,
  freeCell, growCells, key, layoutGarden, migrateLegacyGarden, moveTarget, newPlot, type LegacyPlant,
} from "./core/garden";
import { currentStreak, focusedSince, startOfWeek } from "./core/stats";
import {
  levelFor, newlyUnlocked, streakMultiplier, WEEKLY_GOAL_BONUS, xpOf, type Achievement,
} from "./core/progression";
import { DECORATION_BY_ID, FENCE_BY_ID, FERTILIZER, PATH_BY_ID, SELL_RATIO } from "./core/shop";
import type { Hemisphere, Season } from "./core/seasons";
import { appStorage } from "./lib/platform";

export interface SessionResult {
  session: Session;
  plant: Plant;
  multiplier: number;
  achievements: string[];
  levelUp: number | null;
  goalReached: string | null;
}

export type Ambient = "none" | "rain" | "forest" | "brown";

export interface PomodoroPrefs {
  enabled: boolean;
  shortMin: number;
  longMin: number;
  /** Cada cuántas sesiones toca un descanso largo. */
  every: number;
  /** Al terminar el descanso, arrancar otra sesión de foco. */
  autoStartFocus: boolean;
}

export interface Preferences {
  categoryId: string | null;
  mode: TimerMode;
  minutes: number;
  sound: boolean;
  ambient: Ambient;
  ambientVolume: number;
  useFertilizer: boolean;
  pomodoro: PomodoroPrefs;
  closeToTray: boolean;
  hemisphere: Hemisphere;
  season: Season | "auto";
  /** Nombre que se le pone a la próxima sesión. Se conserva para las siguientes de la misma categoría. */
  sessionTitle?: string;
  /** Buscar versiones nuevas al iniciar y cada 6 horas. */
  autoUpdate: boolean;
}

export interface Toast {
  id: string;
  icon: string;
  title: string;
  body?: string;
}

interface Persisted {
  categories: Category[];
  sessions: Session[];
  plants: Plant[];
  decorations: Decoration[];
  plots: Plot[];
  paths: Paths;
  /** Estilos de valla comprados. */
  fencesOwned: string[];
  coins: number;
  inventory: { fertilizer: number };
  achievements: Record<string, number>;
  /** `${inicioDeSemana}:${categoría}` de las metas semanales ya premiadas. */
  goalClaims: string[];
  active: ActiveSession | null;
  breakTimer: BreakTimer | null;
  pomodoroCount: number;
  prefs: Preferences;
}

interface State extends Persisted {
  // no persistido
  hydrated: boolean;
  lastResult: SessionResult | null;
  toasts: Toast[];

  setPrefs(p: Partial<Preferences>): void;
  setPomodoro(p: Partial<PomodoroPrefs>): void;
  addCategory(c: Omit<Category, "id" | "createdAt" | "archived">): void;
  updateCategory(id: string, patch: Partial<Omit<Category, "id">>): void;
  deleteCategory(id: string): void;

  /** Inicia una sesión con las preferencias guardadas. */
  startFromPrefs(): boolean;
  start(categoryId: string, mode: TimerMode, plannedMin: number | null, title?: string): void;
  /** Cambia el nombre de la sesión en curso. */
  setActiveTitle(title: string): void;
  /** Cambia el nombre de una sesión del historial. */
  renameSession(id: string, title: string): void;
  pause(): void;
  resume(): void;
  togglePause(): void;
  /** Termina la sesión activa. Devuelve null si duró menos de un minuto (se descarta). */
  finish(now?: number): SessionResult | null;
  cancel(): void;
  dismissResult(): void;
  removePlant(id: string): void;

  startBreak(long: boolean): void;
  endBreak(): void;

  buyFertilizer(): boolean;
  placeDecoration(kind: string, gx: number, gy: number): boolean;
  sellDecoration(id: string): void;
  moveDecoration(id: string, gx: number, gy: number): boolean;
  paintPath(gx: number, gy: number, kind: string): boolean;
  erasePath(gx: number, gy: number): boolean;
  expandPlot(categoryId: string, gx: number, gy: number): boolean;
  /** Aplica un estilo de valla; si no estaba comprado, lo compra. */
  setFence(categoryId: string, fence: string): boolean;
  movePlant(plantId: string, gx: number, gy: number): boolean;

  pushToast(t: Omit<Toast, "id">): void;
  dismissToast(id: string): void;
  importBackup(data: unknown): void;
}

export const CATEGORY_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

const DEFAULT_CATEGORIES: Category[] = [
  { id: "estudio", name: "Estudio", icon: "📚", color: "#2a78d6", weeklyGoalMin: 600, archived: false, createdAt: 0 },
  { id: "trabajo", name: "Trabajo", icon: "💼", color: "#eb6834", weeklyGoalMin: 0, archived: false, createdAt: 0 },
  { id: "lectura", name: "Lectura", icon: "📖", color: "#6250d6", weeklyGoalMin: 0, archived: false, createdAt: 0 },
];

const DEFAULT_PREFS: Preferences = {
  categoryId: "estudio",
  mode: "countdown",
  minutes: 25,
  sound: true,
  ambient: "none",
  ambientVolume: 0.5,
  useFertilizer: false,
  pomodoro: { enabled: false, shortMin: 5, longMin: 15, every: 4, autoStartFocus: false },
  closeToTray: true,
  hemisphere: "south",
  season: "auto",
  autoUpdate: true,
};

const INITIAL: Persisted = {
  categories: DEFAULT_CATEGORIES,
  sessions: [],
  plants: [],
  decorations: [],
  plots: ensurePlots(DEFAULT_CATEGORIES, [], [], {}),
  paths: {},
  fencesOwned: ["wood"],
  coins: 0,
  inventory: { fertilizer: 0 },
  achievements: {},
  goalClaims: [],
  active: null,
  breakTimer: null,
  pomodoroCount: 0,
  prefs: DEFAULT_PREFS,
};

const PERSISTED_KEYS = Object.keys(INITIAL) as (keyof Persisted)[];

/** Logros nuevos según el estado dado; devuelve el parche a aplicar y los logros. */
function checkAchievements(s: Persisted, now: number): { unlocked: Achievement[]; patch: Partial<Persisted> } {
  const unlocked = newlyUnlocked(
    {
      sessions: s.sessions,
      plants: s.plants,
      streak: currentStreak(s.sessions, now),
      decorationsPlaced: s.decorations.length,
      goalsMet: s.goalClaims.length,
      pathTiles: Object.keys(s.paths).length,
      cellsBought: s.plots.reduce((n, p) => n + p.bought, 0),
    },
    s.achievements,
  );
  if (unlocked.length === 0) return { unlocked, patch: {} };
  return {
    unlocked,
    patch: {
      achievements: { ...s.achievements, ...Object.fromEntries(unlocked.map((a) => [a.id, now])) },
      coins: s.coins + unlocked.reduce((n, a) => n + a.reward, 0),
    },
  };
}

const layoutOf = (s: Persisted) => layoutGarden(s.categories, s.plots, s.plants, s.decorations, s.paths);

const achievementToast = (a: Achievement): Omit<Toast, "id"> => ({
  icon: a.icon,
  title: `Logro: ${a.name}`,
  body: `${a.description} · +${a.reward} monedas`,
});

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Guarda el nuevo estado y premia los logros que se hayan desbloqueado. */
      const commit = (next: Persisted) => {
        const { unlocked, patch } = checkAchievements(next, Date.now());
        set(pick({ ...next, ...patch }));
        unlocked.forEach((a) => get().pushToast(achievementToast(a)));
        return true;
      };
      const withPlots = (s: Persisted, categories: Category[]): Partial<Persisted> => ({
        categories,
        plots: ensurePlots(categories, s.plots, s.decorations, s.paths),
      });

      return {
      ...INITIAL,
      hydrated: false,
      lastResult: null,
      toasts: [],

      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
      setPomodoro: (p) => set((s) => ({ prefs: { ...s.prefs, pomodoro: { ...s.prefs.pomodoro, ...p } } })),

      addCategory: (c) =>
        set((s) => withPlots(s, [...s.categories, { ...c, id: crypto.randomUUID(), archived: false, createdAt: Date.now() }])),

      updateCategory: (id, patch) =>
        set((s) => withPlots(s, s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)))),

      // Solo se borran categorías sin historial; las demás se archivan para no perder datos.
      deleteCategory: (id) =>
        set((s) =>
          s.sessions.some((x) => x.categoryId === id) || s.active?.categoryId === id
            ? s
            : { categories: s.categories.filter((c) => c.id !== id), plots: s.plots.filter((p) => p.categoryId !== id) },
        ),

      startFromPrefs: () => {
        const { prefs, categories, start } = get();
        const usable = categories.filter((c) => !c.archived);
        const cat = usable.find((c) => c.id === prefs.categoryId) ?? usable[0];
        if (!cat) return false;
        start(cat.id, prefs.mode, prefs.minutes, prefs.sessionTitle);
        return true;
      },

      start: (categoryId, mode, plannedMin, title) => {
        const { active, prefs, inventory } = get();
        if (active) return;
        const fertilized = prefs.useFertilizer && inventory.fertilizer > 0;
        set({
          active: {
            categoryId,
            mode,
            plannedMin: mode === "countdown" ? plannedMin : null,
            startedAt: Date.now(),
            pausedAt: null,
            pausedMs: 0,
            fertilized,
            title: cleanTitle(title),
          },
          breakTimer: null,
          lastResult: null,
          inventory: { ...inventory, fertilizer: inventory.fertilizer - (fertilized ? 1 : 0) },
          prefs: fertilized && inventory.fertilizer === 1 ? { ...prefs, useFertilizer: false } : prefs,
        });
      },

      setActiveTitle: (title) => set((s) => (s.active ? { active: { ...s.active, title: cleanTitle(title) } } : s)),
      renameSession: (id, title) =>
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, title: cleanTitle(title) } : x)) })),

      pause: () => set((s) => (s.active ? { active: timer.pause(s.active, Date.now()) } : s)),
      resume: () => set((s) => (s.active ? { active: timer.resume(s.active, Date.now()) } : s)),
      togglePause: () => {
        const { active, pause, resume } = get();
        if (active?.pausedAt != null) resume();
        else pause();
      },

      // Si se cancela una sesión fertilizada, se devuelve el fertilizante.
      cancel: () =>
        set((s) => ({
          active: null,
          inventory: s.active?.fertilized ? { ...s.inventory, fertilizer: s.inventory.fertilizer + 1 } : s.inventory,
        })),
      dismissResult: () => set({ lastResult: null }),

      finish: (now = Date.now()) => {
        const state = get();
        const { active } = state;
        if (!active) return null;

        const done = timer.isCountdownDone(active, now);
        const endedAt = done ? Math.min(now, timer.countdownEndAt(active)!) : now;
        const focusedMs = timer.elapsedMs(active, endedAt);
        if (focusedMs < timer.MIN_SESSION_MS) {
          state.cancel();
          return null;
        }

        const completed = active.mode === "stopwatch" || done;
        const minutes = focusedMs / 60_000;
        const reward = completed
          ? rollReward(minutes, Math.random, active.fertilized ? FERTILIZER.luck : 1)
          : { speciesId: tierFor(minutes).index >= 3 ? "bush" : "sprout", rarity: "common" as const, coins: 0 };

        const sessionId = crypto.randomUUID();
        const { plots, paths, cell } = plantingSpot(state, active.categoryId);
        const plant: Plant = {
          id: crypto.randomUUID(),
          sessionId,
          categoryId: active.categoryId,
          speciesId: reward.speciesId,
          rarity: reward.rarity,
          withered: !completed,
          gx: cell[0],
          gy: cell[1],
          plantedAt: endedAt,
        };
        const draft: Session = {
          id: sessionId,
          categoryId: active.categoryId,
          mode: active.mode,
          plannedMin: active.plannedMin,
          startedAt: active.startedAt,
          endedAt,
          focusedMs,
          status: completed ? "completed" : "abandoned",
          plantId: plant.id,
          coins: 0,
          ...(active.title ? { title: active.title } : {}),
        };

        const multiplier = completed ? streakMultiplier(currentStreak([...state.sessions, draft], endedAt)) : 1;
        const session = { ...draft, coins: Math.floor(reward.coins * multiplier) };
        const sessions = [...state.sessions, session];

        // Meta semanal de la categoría
        const category = state.categories.find((c) => c.id === active.categoryId);
        const week = startOfWeek(endedAt);
        const claim = `${week}:${active.categoryId}`;
        const goalReached =
          category && category.weeklyGoalMin > 0 && !state.goalClaims.includes(claim) &&
          focusedSince(sessions, week, category.id) >= category.weeklyGoalMin * 60_000
            ? category.id
            : null;

        let next: Persisted = {
          ...state,
          plots,
          paths,
          active: null,
          sessions,
          plants: [...state.plants, plant],
          coins: state.coins + session.coins + (goalReached ? WEEKLY_GOAL_BONUS : 0),
          goalClaims: goalReached ? [...state.goalClaims, claim] : state.goalClaims,
        };
        const { unlocked, patch } = checkAchievements(next, now);
        next = { ...next, ...patch };

        const levelBefore = levelFor(xpOf(state.sessions)).level;
        const levelAfter = levelFor(xpOf(sessions)).level;

        // Pomodoro: después de un temporizador completado viene un descanso.
        let breakPatch: Partial<Persisted> = {};
        if (completed && active.mode === "countdown" && state.prefs.pomodoro.enabled) {
          const count = state.pomodoroCount + 1;
          const long = count % state.prefs.pomodoro.every === 0;
          breakPatch = {
            pomodoroCount: count,
            breakTimer: {
              startedAt: Date.now(),
              durationMin: long ? state.prefs.pomodoro.longMin : state.prefs.pomodoro.shortMin,
              long,
            },
          };
        }

        const result: SessionResult = {
          session,
          plant,
          multiplier,
          achievements: unlocked.map((a) => a.id),
          levelUp: levelAfter > levelBefore ? levelAfter : null,
          goalReached,
        };
        // Los logros de la sesión se muestran en el modal de resultado, no como toast.
        set({ ...pick(next), ...breakPatch, lastResult: result });
        return result;
      },

      removePlant: (id) =>
        set((s) => ({
          plants: s.plants.filter((p) => p.id !== id),
          sessions: s.sessions.map((x) => (x.plantId === id ? { ...x, plantId: null } : x)),
        })),

      startBreak: (long) =>
        set((s) => ({
          breakTimer: {
            startedAt: Date.now(),
            durationMin: long ? s.prefs.pomodoro.longMin : s.prefs.pomodoro.shortMin,
            long,
          },
        })),
      endBreak: () => set({ breakTimer: null }),

      buyFertilizer: () => {
        const { coins, inventory } = get();
        if (coins < FERTILIZER.price) return false;
        set({ coins: coins - FERTILIZER.price, inventory: { ...inventory, fertilizer: inventory.fertilizer + 1 } });
        return true;
      },

      placeDecoration: (kind, gx, gy) => {
        const s = get();
        const def = DECORATION_BY_ID[kind];
        if (!def || s.coins < def.price || !canPlaceDecoration(layoutOf(s), gx, gy)) return false;
        return commit({
          ...s,
          coins: s.coins - def.price,
          decorations: [...s.decorations, { id: crypto.randomUUID(), kind, gx, gy, price: def.price }],
        });
      },

      moveDecoration: (id, gx, gy) => {
        const s = get();
        const deco = s.decorations.find((d) => d.id === id);
        if (!deco || !canMoveDecoration(layoutOf(s), deco, gx, gy)) return false;
        set({ decorations: s.decorations.map((d) => (d.id === id ? { ...d, gx, gy } : d)) });
        return true;
      },

      paintPath: (gx, gy, kind) => {
        const s = get();
        const def = PATH_BY_ID[kind];
        if (!def || s.coins < def.price || !canPaintPath(layoutOf(s), gx, gy, kind)) return false;
        return commit({ ...s, coins: s.coins - def.price, paths: { ...s.paths, [key(gx, gy)]: kind } });
      },

      erasePath: (gx, gy) => {
        const s = get();
        if (!canErasePath(layoutOf(s), gx, gy)) return false;
        const { [key(gx, gy)]: kind, ...rest } = s.paths;
        set({ paths: rest, coins: s.coins + Math.floor((PATH_BY_ID[kind]?.price ?? 0) * SELL_RATIO) });
        return true;
      },

      expandPlot: (categoryId, gx, gy) => {
        const s = get();
        const plot = s.plots.find((p) => p.categoryId === categoryId);
        if (!plot) return false;
        const price = expandPrice(plot);
        if (s.coins < price || !canExpand(layoutOf(s), categoryId, gx, gy)) return false;
        const grown: Plot = { ...plot, cells: [...plot.cells, [gx, gy]], bought: plot.bought + 1 };
        return commit({ ...s, coins: s.coins - price, plots: s.plots.map((p) => (p === plot ? grown : p)) });
      },

      setFence: (categoryId, fence) => {
        const s = get();
        const def = FENCE_BY_ID[fence];
        const owned = s.fencesOwned.includes(fence);
        if (!def || (!owned && s.coins < def.price)) return false;
        set({
          coins: owned ? s.coins : s.coins - def.price,
          fencesOwned: owned ? s.fencesOwned : [...s.fencesOwned, fence],
          plots: s.plots.map((p) => (p.categoryId === categoryId ? { ...p, fence } : p)),
        });
        return true;
      },

      movePlant: (plantId, gx, gy) => {
        const s = get();
        const plant = s.plants.find((p) => p.id === plantId);
        if (!plant) return false;
        const L = layoutOf(s);
        const target = moveTarget(L, plant, gx, gy);
        if (!target) return false;
        const other = target === "swap" ? L.plantAt.get(key(gx, gy)) : null;
        set({
          plants: s.plants.map((p) =>
            p.id === plantId ? { ...p, gx, gy } : p.id === other?.id ? { ...p, gx: plant.gx, gy: plant.gy } : p,
          ),
        });
        return true;
      },

      sellDecoration: (id) =>
        set((s) => {
          const d = s.decorations.find((x) => x.id === id);
          if (!d) return s;
          return {
            decorations: s.decorations.filter((x) => x.id !== id),
            coins: s.coins + Math.floor(d.price * SELL_RATIO),
          };
        }),

      pushToast: (t) => {
        const id = crypto.randomUUID();
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        setTimeout(() => get().dismissToast(id), 6000);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      importBackup: (data) => {
        const parsed = parseBackup(data);
        set({ ...parsed, lastResult: null });
      },
      };
    },
    {
      name: "brote-state",
      version: 3,
      storage: createJSONStorage(() => appStorage),
      partialize: (s) => pick(s),
      migrate: (persisted, version) => migrate(persisted as Partial<Persisted>, version),
      // Las preferencias se combinan en profundidad para que las claves nuevas tomen su valor por defecto.
      merge: (persisted, current) => {
        const p = { ...current, ...((persisted ?? {}) as Partial<Persisted>) };
        return { ...p, plots: ensurePlots(p.categories, p.plots, p.decorations, p.paths), prefs: mergePrefs(p.prefs) };
      },
    },
  ),
);

function pick(s: Persisted): Persisted {
  return Object.fromEntries(PERSISTED_KEYS.map((k) => [k, s[k]])) as unknown as Persisted;
}

function mergePrefs(p: Partial<Preferences> | undefined): Preferences {
  return { ...DEFAULT_PREFS, ...p, pomodoro: { ...DEFAULT_PREFS.pomodoro, ...p?.pomodoro } };
}

const OLD_COLORS: Record<string, string> = {
  "#5b8def": "#2a78d6",
  "#e0a03a": "#eb6834",
  "#b36ad6": "#6250d6",
  "#45b383": "#008300",
  "#e5617a": "#e87ba4",
  "#3fb6c9": "#1baf7a",
  "#d9c23f": "#eda100",
};

function migrate(p: Partial<Persisted>, version: number): Partial<Persisted> {
  if (version < 2 && p.categories) {
    // v1 usaba una paleta que no distinguía bien los colores con daltonismo.
    p = { ...p, categories: p.categories.map((c) => ({ ...c, color: OLD_COLORS[c.color] ?? c.color })) };
  }
  if (version < 3 && p.plants) {
    // v2 calculaba parcelas rectangulares; v3 guarda cada baldosa y las plantas en coordenadas del mundo.
    const garden = migrateLegacyGarden(
      p.categories ?? DEFAULT_CATEGORIES,
      p.plants as unknown as LegacyPlant[],
      p.decorations ?? [],
    );
    p = { ...p, ...garden, paths: {}, fencesOwned: ["wood"] };
  }
  return p;
}

/**
 * Baldosa donde va la planta de una sesión. Si la parcela está llena, crece sola
 * (gratis) y puede pisar caminos, que se quitan.
 */
function plantingSpot(s: Persisted, categoryId: string): { plots: Plot[]; paths: Paths; cell: Cell } {
  let plots = s.plots;
  let plot = plots.find((p) => p.categoryId === categoryId);
  if (!plot) {
    plot = newPlot(categoryId, ...findPlotSpot(plots, s.decorations, s.paths));
    plots = [...plots, plot];
  }
  const own = s.plants.filter((p) => p.categoryId === categoryId);
  const cell = freeCell(plot, own);
  if (cell) return { plots, paths: s.paths, cell };

  const grown = growCells(layoutOf({ ...s, plots }), plot);
  const paths = { ...s.paths };
  grown.clearPaths.forEach((k) => delete paths[k]);
  const bigger = { ...plot, cells: [...plot.cells, ...grown.cells] };
  return {
    plots: plots.map((p) => (p === plot ? bigger : p)),
    paths,
    cell: grown.cells[Math.floor(Math.random() * grown.cells.length)],
  };
}

/** Valida un backup exportado (el blob de persistencia o su campo `state`). */
export function parseBackup(data: unknown): Persisted {
  const root = data as { state?: unknown; version?: number };
  const raw = (root && typeof root === "object" && "state" in root ? root.state : data) as Partial<Persisted>;
  if (!raw || !Array.isArray(raw.categories) || !Array.isArray(raw.sessions) || !Array.isArray(raw.plants)) {
    throw new Error("El archivo no es un backup de Brote.");
  }
  const migrated = { ...INITIAL, ...migrate(raw, root?.version ?? 3) };
  return {
    ...migrated,
    plots: ensurePlots(migrated.categories, migrated.plots, migrated.decorations, migrated.paths),
    prefs: mergePrefs(migrated.prefs),
  };
}

export function exportBackup(): string {
  return JSON.stringify({ app: "brote", version: 3, exportedAt: new Date().toISOString(), state: pick(useStore.getState()) }, null, 2);
}

// Con localStorage la hidratación es síncrona y ya terminó acá; con Tauri es asíncrona.
if (useStore.persist.hasHydrated()) useStore.setState({ hydrated: true });
else useStore.persist.onFinishHydration(() => useStore.setState({ hydrated: true }));
