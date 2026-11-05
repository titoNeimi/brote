import { useStore } from "../store";
import { DECORATION_GROUPS, DECORATIONS, FERTILIZER } from "../core/shop";
import { categorySlotPrice } from "../core/garden";
import { levelFor, xpOf } from "../core/progression";
import { DecorationSprite, DECORATION_HEIGHT } from "./DecorationSprite";
import { Coin } from "./Coin";

export function LevelBar() {
  const sessions = useStore((s) => s.sessions);
  const { level, current, needed } = levelFor(xpOf(sessions));
  return (
    <div className="level">
      <div className="level-head">
        <strong>Nivel {level} de jardinero</strong>
        <span className="muted small">{current} / {needed} min para el nivel {level + 1}</span>
      </div>
      <div className="bar"><div style={{ width: `${(current / needed) * 100}%` }} /></div>
    </div>
  );
}

function DecorationPreview({ kind }: { kind: string }) {
  const h = DECORATION_HEIGHT[kind] ?? 30;
  // Encuadre según la altura del sprite, con la baldosa abajo
  const top = -Math.max(40, h + 10);
  return (
    <svg viewBox={`-40 ${top} 80 ${-top + 22}`} width={110} height={100}>
      <polygon points="0,-10 32,6 0,22 -32,6" fill="#8ccf6a" transform="translate(0 -6)" />
      <DecorationSprite kind={kind} />
    </svg>
  );
}

export function ShopView({ onBuyDecoration, onOpenBuild }: { onBuyDecoration: (kind: string) => void; onOpenBuild: () => void }) {
  const coins = useStore((s) => s.coins);
  const sessions = useStore((s) => s.sessions);
  const fertilizer = useStore((s) => s.inventory.fertilizer);
  const buyFertilizer = useStore((s) => s.buyFertilizer);
  const owned = useStore((s) => s.decorations);
  const slots = useStore((s) => s.categorySlots);
  const buyCategorySlot = useStore((s) => s.buyCategorySlot);
  const activeCategories = useStore((s) => s.categories.filter((c) => !c.archived).length);
  const slotPrice = categorySlotPrice(slots);
  const { level } = levelFor(xpOf(sessions));

  return (
    <div className="page">
      <section className="panel shop-head">
        <LevelBar />
        <div className="wallet"><Coin /> {coins}</div>
      </section>

      <section className="panel build-promo">
        <div className="grow">
          <h3>Caminos, parcelas y vallas</h3>
          <p className="muted small">
            Agrandá tus parcelas con la forma que quieras, construí adentro y unilas con caminos. También podés cambiar las vallas.
          </p>
        </div>
        <button className="primary" onClick={onOpenBuild}>🔨 Construir</button>
      </section>

      <section className="panel">
        <h3>Consumibles</h3>
        <div className="shop-item wide">
          <div className="consumable-icon">🧪</div>
          <div className="grow">
            <strong>{FERTILIZER.name}</strong>
            <p className="muted small">{FERTILIZER.description} Se activa desde el panel del temporizador.</p>
            <p className="small">Tenés: <strong>{fertilizer}</strong></p>
          </div>
          <button className="primary" disabled={coins < FERTILIZER.price} onClick={buyFertilizer}>
            Comprar · {FERTILIZER.price} <Coin />
          </button>
        </div>
        <div className="shop-item wide">
          <div className="consumable-icon">🏷️</div>
          <div className="grow">
            <strong>Espacio para categoría</strong>
            <p className="muted small">Cada categoría tiene su parcela. Sumá un espacio para tener una categoría activa más.</p>
            <p className="small">Usás <strong>{activeCategories} / {slots}</strong></p>
          </div>
          <button className="primary" disabled={coins < slotPrice} onClick={buyCategorySlot}>
            Comprar · {slotPrice} <Coin />
          </button>
        </div>
      </section>

      {DECORATION_GROUPS.map((group) => (
        <section key={group.id} className="panel">
          <h3>{group.name}</h3>
          <p className="muted small">
            {group.id === "light" ? "Iluminan el jardín al atardecer y de noche. " : ""}
            Al comprar, elegís dónde ponerla dentro de una parcela. Podés moverla o venderla por la mitad de su precio.
          </p>
          <div className="shop-grid">
            {DECORATIONS.filter((d) => d.group === group.id).map((d) => {
              const locked = level < d.level;
              const count = owned.filter((o) => o.kind === d.id).length;
              return (
                <div key={d.id} className={`shop-item${locked ? " locked" : ""}`}>
                  <DecorationPreview kind={d.id} />
                  <strong>{d.name}</strong>
                  {count > 0 && <span className="muted small">Tenés {count}</span>}
                  {locked ? (
                    <button disabled>🔒 Nivel {d.level}</button>
                  ) : (
                    <button className="primary" disabled={coins < d.price} onClick={() => onBuyDecoration(d.id)}>
                      {d.price} <Coin />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
