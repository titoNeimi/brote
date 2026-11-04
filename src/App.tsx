import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "./store";
import { formatDuration } from "./core/timer";
import { RARITY_LABEL, SPECIES_BY_ID } from "./core/rewards";
import { currentStreak, focusedSince, startOfDay } from "./core/stats";
import { levelFor, streakMultiplier, xpOf } from "./core/progression";
import { DECORATION_BY_ID, SELL_RATIO } from "./core/shop";
import { seasonFor, SEASON_LABEL } from "./core/seasons";
import { isTauri } from "./lib/platform";
import { openMiniWindow } from "./lib/desktop";
import { useCompactTabs, useNow } from "./lib/hooks";
import { useAppController } from "./controller";
import { Garden, SeasonParticles, type GardenSelection, type Tool } from "./components/Garden";
import { BuildPanel } from "./components/BuildPanel";
import { TimerPanel } from "./components/TimerPanel";
import { ResultModal } from "./components/ResultModal";
import { HistoryView } from "./components/HistoryView";
import { CategoriesView } from "./components/CategoriesView";
import { StatsView } from "./components/StatsView";
import { ShopView } from "./components/ShopView";
import { AchievementsView } from "./components/AchievementsView";
import { SettingsView } from "./components/SettingsView";
import { Toasts } from "./components/Toasts";
import { TooltipLayer } from "./components/Tooltip";
import { UpdateBanner } from "./components/UpdatePanel";
import { loadCurrentVersion, startAutoCheck } from "./lib/updater";
import { Coin } from "./components/Coin";

type Tab = "garden" | "stats" | "history" | "shop" | "achievements" | "categories" | "settings";

const TABS: [Tab, string, string][] = [
  ["garden", "🌳", "Jardín"],
  ["stats", "📊", "Estadísticas"],
  ["history", "🗒️", "Historial"],
  ["shop", "🛒", "Tienda"],
  ["achievements", "🏆", "Logros"],
  ["categories", "🏷️", "Categorías"],
];

export default function App() {
  useAppController();
  const now = useNow(30_000);
  const hydrated = useStore((s) => s.hydrated);
  const coins = useStore((s) => s.coins);
  const sessions = useStore((s) => s.sessions);
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const [tab, setTab] = useState<Tab>("garden");
  const [selected, setSelected] = useState<GardenSelection | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [building, setBuilding] = useState(false);
  const onSelect = useCallback((s: GardenSelection | null) => setSelected(s), []);
  const headerRef = useRef<HTMLElement>(null);
  useCompactTabs(headerRef, hydrated);

  useEffect(() => { void loadCurrentVersion(); }, []);
  useEffect(() => (hydrated && prefs.autoUpdate ? startAutoCheck() : undefined), [hydrated, prefs.autoUpdate]);

  // Esc suelta la herramienta; un segundo Esc cierra el modo construcción o el panel de selección.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (tool) setTool(null);
      else if (building) setBuilding(false);
      else setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, building]);

  if (!hydrated) return <div className="loading">🌱</div>;

  const streak = currentStreak(sessions, now);
  const { level, current, needed } = levelFor(xpOf(sessions));
  const season = prefs.season === "auto" ? seasonFor(new Date(now), prefs.hemisphere) : prefs.season;
  const banner = !building && tool ? toolBanner(tool) : null;
  const startTool = (t: Tool) => { setTool(t); setSelected(null); };

  return (
    <div className="app">
      <header className="topbar" ref={headerRef}>
        <div className="brand"><span className="brand-mark">🌱</span><span className="brand-text">Brote</span></div>
        <nav className="tabs">
          {TABS.map(([id, icon, label]) => (
            <button key={id} className={tab === id ? "on" : ""} data-tip={label} aria-label={label} onClick={() => setTab(id)}>
              <span className="tab-icon">{icon}</span>
              <span className="tab-label" data-tip-label>{label}</span>
            </button>
          ))}
        </nav>
        <div className="stats">
          <span className="stat level-chip" data-tip={`Nivel ${level} · ${current} / ${needed} min para el nivel ${level + 1}`}>
            ⭐ {level}
            <i style={{ width: `${(current / needed) * 100}%` }} />
          </span>
          <span className="stat" data-tip="Foco de hoy">⏱ {formatDuration(focusedSince(sessions, startOfDay(now)))}</span>
          <span className="stat" data-tip={streakMultiplier(streak) > 1 ? `Racha: monedas x${streakMultiplier(streak)}` : "Racha de días"}>🔥 {streak}</span>
          <span className="stat coins" data-tip="Monedas"><Coin /> {coins}</span>
        </div>
        <div className="top-actions">
          {isTauri && <button className="icon" data-tip="Mini ventana" aria-label="Mini ventana" onClick={() => void openMiniWindow()}>⧉</button>}
          <button className="icon" data-tip={prefs.sound ? "Silenciar" : "Activar sonido"} aria-label={prefs.sound ? "Silenciar" : "Activar sonido"}
            onClick={() => setPrefs({ sound: !prefs.sound })}>
            {prefs.sound ? "🔊" : "🔇"}
          </button>
          <button className={`icon${tab === "settings" ? " on" : ""}`} data-tip="Ajustes" aria-label="Ajustes" onClick={() => setTab("settings")}>⚙️</button>
        </div>
      </header>

      <main>
        {tab === "garden" && (
          <div className="garden-view">
            <Garden onSelect={onSelect} selectedId={selected?.kind === "plant" ? selected.plant.id : selected?.deco.id ?? null}
              season={season} tool={tool} onToolDone={() => setTool(null)} />
            <SeasonParticles season={season} />
            {building ? (
              <BuildPanel tool={tool} setTool={setTool} onClose={() => { setBuilding(false); setTool(null); }} />
            ) : (
              <TimerPanel />
            )}
            {banner && (
              <div className="panel placing-banner">
                <strong>{banner}</strong>
                <span className="muted small">Hacé click en una baldosa resaltada · Esc para cancelar</span>
                <button onClick={() => setTool(null)}>Cancelar</button>
              </div>
            )}
            {!building && (
              <button className="build-btn" onClick={() => { setBuilding(true); setTool(null); setSelected(null); }}>🔨 Construir</button>
            )}
            <div className="season-chip">{SEASON_LABEL[season]}</div>
            {selected && !tool && <SelectionInfo selection={selected} onStartTool={startTool} onClose={() => setSelected(null)} />}
          </div>
        )}
        {tab === "stats" && <StatsView />}
        {tab === "history" && <HistoryView />}
        {tab === "shop" && <ShopView
          onBuyDecoration={(kind) => { setTool({ kind: "deco", deco: kind, once: true }); setSelected(null); setTab("garden"); }}
          onOpenBuild={() => { setBuilding(true); setTool(null); setTab("garden"); }} />}
        {tab === "achievements" && <AchievementsView />}
        {tab === "categories" && <CategoriesView />}
        {tab === "settings" && <SettingsView />}
      </main>

      <ResultModal />
      <UpdateBanner />
      <Toasts />
      <TooltipLayer />
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function toolBanner(tool: Tool): ReactNode {
  const s = useStore.getState();
  switch (tool.kind) {
    case "deco": return <>Colocando: {DECORATION_BY_ID[tool.deco]?.name} ({DECORATION_BY_ID[tool.deco]?.price} <Coin />)</>;
    case "move-plant": {
      const p = s.plants.find((x) => x.id === tool.plantId);
      return `Moviendo: ${p?.withered ? "planta marchita" : SPECIES_BY_ID[p?.speciesId ?? ""]?.name ?? "planta"}`;
    }
    case "move-deco": {
      const d = s.decorations.find((x) => x.id === tool.decoId);
      return `Moviendo: ${DECORATION_BY_ID[d?.kind ?? ""]?.name ?? "decoración"}`;
    }
    default: return null;
  }
}

function SelectionInfo({ selection, onStartTool, onClose }: {
  selection: GardenSelection;
  onStartTool: (t: Tool) => void;
  onClose: () => void;
}) {
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const removePlant = useStore((s) => s.removePlant);
  const sellDecoration = useStore((s) => s.sellDecoration);

  if (selection.kind === "deco") {
    const d = selection.deco;
    const def = DECORATION_BY_ID[d.kind];
    return (
      <div className="panel plant-info">
        <div className="panel-head">
          <h3>{def?.name ?? d.kind}</h3>
          <button className="icon close" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>
        <p className="muted small">Decoración</p>
        <div className="row">
          <button onClick={() => onStartTool({ kind: "move-deco", decoId: d.id })}>✥ Mover</button>
          <button className="ghost" onClick={() => { sellDecoration(d.id); onClose(); }}>
            Vender · {Math.floor(d.price * SELL_RATIO)} <Coin />
          </button>
        </div>
      </div>
    );
  }

  const plant = selection.plant;
  const session = sessions.find((x) => x.id === plant.sessionId);
  const category = categories.find((c) => c.id === plant.categoryId);
  const species = SPECIES_BY_ID[plant.speciesId];
  return (
    <div className="panel plant-info">
      <div className="panel-head">
        <h3>{plant.withered ? "🥀 Planta marchita" : species?.name}</h3>
        <button className="icon close" aria-label="Cerrar" onClick={onClose}>✕</button>
      </div>
      {!plant.withered && <div className={`badge ${plant.rarity}`}>{RARITY_LABEL[plant.rarity]}</div>}
      <p className="muted small">
        {category?.icon} {category?.name} · {dateFmt.format(plant.plantedAt)}
        {session && <> · {formatDuration(session.focusedMs)}</>}
      </p>
      <div className="row">
        <button onClick={() => onStartTool({ kind: "move-plant", plantId: plant.id })}>✥ Mover</button>
        {plant.withered && (
          <button className="ghost" onClick={() => { removePlant(plant.id); onClose(); }}>Arrancar</button>
        )}
      </div>
    </div>
  );
}
