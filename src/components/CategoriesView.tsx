import { useState } from "react";
import { CATEGORY_COLORS as COLORS, useStore } from "../store";
import type { Category } from "../core/types";
import { categorySlotPrice } from "../core/garden";
import { Coin } from "./Coin";

const ICONS = ["📚", "💼", "📖", "💻", "🎨", "🎸", "🏋️", "🧘", "✍️", "🔬", "🌍", "🧮"];

export function CategoriesView() {
  const categories = useStore((s) => s.categories);
  const sessions = useStore((s) => s.sessions);
  const addCategory = useStore((s) => s.addCategory);
  const slots = useStore((s) => s.categorySlots);
  const coins = useStore((s) => s.coins);
  const buyCategorySlot = useStore((s) => s.buyCategorySlot);
  const used = categories.filter((c) => !c.archived).length;
  const full = used >= slots;
  const price = categorySlotPrice(slots);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[3]);
  const [color, setColor] = useState(COLORS[2]);

  const add = () => {
    if (!name.trim()) return;
    if (addCategory({ name: name.trim(), icon, color, weeklyGoalMin: 0 })) setName("");
  };

  return (
    <div className="page">
      <section className="panel">
        <div className="panel-head">
          <h3>Nueva categoría</h3>
          <span className="muted small">{used} / {slots} activas</span>
        </div>
        {full && (
          <div className="confirm">
            <p className="small">
              Llegaste al máximo de categorías activas. Archivá una o comprá un espacio más.
            </p>
            <button className="primary" disabled={coins < price} onClick={buyCategorySlot}>
              Comprar espacio · {price} <Coin />
            </button>
          </div>
        )}
        <div className="new-cat">
          <input placeholder="Nombre (ej. Facultad)" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} disabled={full} />
          <button className="primary" onClick={add} disabled={!name.trim() || full}>Agregar</button>
        </div>
        <div className="picker">
          {ICONS.map((i) => (
            <button key={i} className={`icon-btn${i === icon ? " on" : ""}`} onClick={() => setIcon(i)}>{i}</button>
          ))}
        </div>
        <div className="picker">
          {COLORS.map((c) => (
            <button key={c} className={`swatch${c === color ? " on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Tus categorías</h3>
        <p className="muted small">Cada categoría tiene su propia parcela en el jardín.</p>
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} hasSessions={sessions.some((s) => s.categoryId === c.id)} canRestore={!full} />
        ))}
      </section>
    </div>
  );
}

function CategoryRow({ category: c, hasSessions, canRestore }: { category: Category; hasSessions: boolean; canRestore: boolean }) {
  const update = useStore((s) => s.updateCategory);
  const remove = useStore((s) => s.deleteCategory);
  const isActive = useStore((s) => s.active?.categoryId === c.id);

  return (
    <div className={`cat-row${c.archived ? " archived" : ""}`}>
      <select value={c.icon} onChange={(e) => update(c.id, { icon: e.target.value })} className="icon-select">
        {[...new Set([c.icon, ...ICONS])].map((i) => <option key={i}>{i}</option>)}
      </select>
      <input className="grow" value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} />
      <input type="color" value={c.color} onChange={(e) => update(c.id, { color: e.target.value })} data-tip="Color" aria-label="Color" />
      <label className="goal-input" data-tip="Meta semanal en horas (0 = sin meta)">
        Meta
        <input type="number" min={0} max={80} step={0.5} value={c.weeklyGoalMin / 60}
          onChange={(e) => update(c.id, { weeklyGoalMin: Math.max(0, Math.round(Number(e.target.value) * 60)) })} />
        h/sem
      </label>
      {hasSessions || isActive ? (
        <button className="ghost" disabled={isActive || (c.archived && !canRestore)}
          data-tip={c.archived && !canRestore ? "No quedan espacios de categoría" : undefined}
          onClick={() => update(c.id, { archived: !c.archived })}>
          {c.archived ? "Restaurar" : "Archivar"}
        </button>
      ) : (
        <button className="ghost danger-text" onClick={() => remove(c.id)}>Borrar</button>
      )}
    </div>
  );
}
