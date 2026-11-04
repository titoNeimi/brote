import { useStore } from "../store";
import { DECORATIONS, FERTILIZER } from "../core/shop";
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
          <p className="muted small">Pintá caminos, agrandá tus parcelas con la forma que quieras y cambiá el estilo de las vallas.</p>
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
      </section>

      {(["fountain", "decor"] as const).map((group) => (
        <section key={group} className="panel">
          <h3>{group === "fountain" ? "Fuentes" : "Decoraciones"}</h3>
          <p className="muted small">Al comprar, elegís dónde ponerla en el jardín. Podés moverla o venderla por la mitad de su precio.</p>
          <div className="shop-grid">
            {DECORATIONS.filter((d) => d.group === group).map((d) => {
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
