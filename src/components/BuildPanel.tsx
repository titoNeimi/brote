import { useState, type CSSProperties } from "react";
import { useStore } from "../store";
import { expandPrice } from "../core/garden";
import { DECORATIONS, FENCES, PATHS } from "../core/shop";
import { levelFor, xpOf } from "../core/progression";
import { FenceSwatch, PathSwatch } from "./BuildSprites";
import { DecorationSprite, DECORATION_HEIGHT } from "./DecorationSprite";
import type { Tool } from "./Garden";
import { Coin } from "./Coin";

type Section = "paths" | "plots" | "fences" | "decor";

const SECTIONS: [Section, string][] = [
  ["paths", "Caminos"],
  ["plots", "Parcelas"],
  ["fences", "Vallas"],
  ["decor", "Adornos"],
];

export function BuildPanel({ tool, setTool, onClose }: { tool: Tool | null; setTool: (t: Tool | null) => void; onClose: () => void }) {
  const [section, setSection] = useState<Section>("paths");
  const coins = useStore((s) => s.coins);

  const pick = (s: Section) => {
    setSection(s);
    setTool(null);
  };

  return (
    <aside className="panel timer-panel build-panel">
      <div className="panel-head">
        <h2>🔨 Construir</h2>
        <span className="coins"><Coin /> {coins}</span>
        <button className="icon close" aria-label="Cerrar construcción" onClick={onClose}>✕</button>
      </div>
      <div className="segmented build-tabs">
        {SECTIONS.map(([id, label]) => (
          <button key={id} className={section === id ? "on" : ""} onClick={() => pick(id)}>{label}</button>
        ))}
      </div>

      {section === "paths" && <PathsSection tool={tool} setTool={setTool} />}
      {section === "plots" && <PlotsSection tool={tool} setTool={setTool} />}
      {section === "fences" && <FencesSection />}
      {section === "decor" && <DecorSection tool={tool} setTool={setTool} />}

      <p className="muted small hint">
        Arrastrá con clic derecho o la rueda para mover la vista. <kbd>Esc</kbd> suelta la herramienta.
      </p>
      <button className="primary big" onClick={onClose}>Listo</button>
    </aside>
  );
}

interface ToolProps { tool: Tool | null; setTool: (t: Tool | null) => void }

function PathsSection({ tool, setTool }: ToolProps) {
  const current = tool?.kind === "path" ? tool.path : null;
  return (
    <>
      <p className="muted small">Elegí un camino y pintalo sobre el pasto: hacé click o arrastrá.</p>
      <div className="swatch-grid">
        {PATHS.map((p) => (
          <button key={p.id} className={`swatch-btn${current === p.id ? " on" : ""}`} onClick={() => setTool({ kind: "path", path: p.id })}>
            <PathSwatch kind={p.id} />
            <span>{p.name}</span>
            <span className="muted small">{p.price} <Coin /> / baldosa</span>
          </button>
        ))}
      </div>
      <button className={`erase${current === "erase" ? " on" : ""}`} onClick={() => setTool({ kind: "path", path: "erase" })}>
        🧽 Borrar camino <span className="muted small">(devuelve la mitad)</span>
      </button>
    </>
  );
}

function PlotsSection({ tool, setTool }: ToolProps) {
  const categories = useStore((s) => s.categories).filter((c) => !c.archived);
  const plots = useStore((s) => s.plots);
  const current = tool?.kind === "expand" ? tool.categoryId : null;
  return (
    <>
      <p className="muted small">
        Elegí una parcela y sumale baldosas pegadas (se resaltan). Cada baldosa cuesta un poco más que la anterior.
      </p>
      <div className="plot-list">
        {categories.map((c) => {
          const plot = plots.find((p) => p.categoryId === c.id);
          if (!plot) return null;
          return (
            <button key={c.id} className={`plot-btn${current === c.id ? " on" : ""}`} style={{ "--c": c.color } as CSSProperties}
              onClick={() => setTool({ kind: "expand", categoryId: c.id })}>
              <span className="grow">{c.icon} {c.name}</span>
              <span className="muted small">{plot.cells.length} baldosas</span>
              <strong className="small">{expandPrice(plot)} <Coin /></strong>
            </button>
          );
        })}
      </div>
      <p className="muted small">Para mover una planta, hacé click en ella y elegí “Mover”.</p>
    </>
  );
}

function FencesSection() {
  const categories = useStore((s) => s.categories).filter((c) => !c.archived);
  const plots = useStore((s) => s.plots);
  const owned = useStore((s) => s.fencesOwned);
  const coins = useStore((s) => s.coins);
  const setFence = useStore((s) => s.setFence);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const plot = plots.find((p) => p.categoryId === categoryId);

  return (
    <>
      <div className="chips">
        {categories.map((c) => (
          <button key={c.id} className={`chip small${c.id === categoryId ? " on" : ""}`} style={{ "--c": c.color } as CSSProperties}
            onClick={() => setCategoryId(c.id)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>
      <p className="muted small">Cada estilo se compra una vez y después lo usás gratis en cualquier parcela.</p>
      <div className="swatch-grid">
        {FENCES.map((f) => {
          const has = owned.includes(f.id);
          const inUse = plot?.fence === f.id;
          return (
            <button key={f.id} className={`swatch-btn${inUse ? " on" : ""}`} disabled={inUse || (!has && coins < f.price)}
              onClick={() => setFence(categoryId, f.id)}>
              <FenceSwatch style={f.id} />
              <span>{f.name}</span>
              <span className="muted small">{inUse ? "En uso" : has ? "Usar" : <>{f.price} <Coin /></>}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function DecorSection({ tool, setTool }: ToolProps) {
  const sessions = useStore((s) => s.sessions);
  const coins = useStore((s) => s.coins);
  const { level } = levelFor(xpOf(sessions));
  const current = tool?.kind === "deco" ? tool.deco : null;
  return (
    <>
      {(["fountain", "decor"] as const).map((group) => (
        <div key={group}>
          <label className="field-label">{group === "fountain" ? "Fuentes" : "Decoraciones"}</label>
          <div className="swatch-grid small">
            {DECORATIONS.filter((d) => d.group === group).map((d) => {
              const locked = level < d.level;
              const h = DECORATION_HEIGHT[d.id] ?? 30;
              return (
                <button key={d.id} className={`swatch-btn${current === d.id ? " on" : ""}`} disabled={locked || coins < d.price}
                  onClick={() => setTool({ kind: "deco", deco: d.id })}>
                  <svg viewBox={`-34 ${-Math.max(36, h + 8)} 68 ${Math.max(36, h + 8) + 20}`} width={60} height={52}>
                    <polygon points="0,-8 30,7 0,22 -30,7" fill="#8ccf6a" transform="translate(0 -7)" />
                    <DecorationSprite kind={d.id} />
                  </svg>
                  <span className="small">{d.name}</span>
                  <span className="muted small">{locked ? `🔒 Nv ${d.level}` : <>{d.price} <Coin /></>}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
