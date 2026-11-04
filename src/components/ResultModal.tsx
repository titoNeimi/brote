import { useEffect } from "react";
import { useStore } from "../store";
import { RARITY_LABEL, SPECIES_BY_ID } from "../core/rewards";
import { ACHIEVEMENTS, WEEKLY_GOAL_BONUS } from "../core/progression";
import { DECORATIONS } from "../core/shop";
import { formatDuration } from "../core/timer";
import { PlantPreview } from "./PlantPreview";
import { Coin } from "./Coin";

export function ResultModal() {
  const result = useStore((s) => s.lastResult);
  const dismiss = useStore((s) => s.dismissResult);
  const category = useStore((s) => s.categories.find((c) => c.id === s.lastResult?.goalReached));
  const breakTimer = useStore((s) => s.breakTimer);

  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, dismiss]);

  if (!result) return null;
  const { plant, session, multiplier, levelUp, achievements } = result;
  const species = SPECIES_BY_ID[plant.speciesId];
  const unlockedDecos = levelUp ? DECORATIONS.filter((d) => d.level === levelUp) : [];

  return (
    <div className="modal-backdrop" onClick={dismiss}>
      <div className={`modal rarity-${plant.withered ? "withered" : plant.rarity}`} onClick={(e) => e.stopPropagation()}>
        <button className="icon modal-close" aria-label="Cerrar" onClick={dismiss}>✕</button>
        <PlantPreview speciesId={plant.speciesId} withered={plant.withered} rarity={plant.rarity} size={200} />
        {plant.withered ? (
          <>
            <h2>Tu planta se marchitó</h2>
            <p className="muted">
              Te rendiste a los {formatDuration(session.focusedMs)} de {session.plannedMin} min. Queda en el jardín como recuerdo — ¡la próxima va!
            </p>
          </>
        ) : (
          <>
            <div className={`badge ${plant.rarity}`}>{RARITY_LABEL[plant.rarity]}</div>
            <h2>¡{species.name}!</h2>
            <p className="muted">{formatDuration(session.focusedMs)} de foco{session.title && <> · <strong>{session.title}</strong></>}</p>
            <p className="coins-earned">
              +{session.coins} <Coin /> {multiplier > 1 && <span className="mult">🔥 x{multiplier}</span>}
            </p>
          </>
        )}

        {(levelUp || category || achievements.length > 0) && (
          <ul className="extras">
            {levelUp && (
              <li>
                ⭐ ¡Subiste al nivel {levelUp}!
                {unlockedDecos.length > 0 && <span className="muted small"> Nuevo en la tienda: {unlockedDecos.map((d) => d.name).join(", ")}</span>}
              </li>
            )}
            {category && <li>🎯 Meta semanal de {category.name} cumplida · +{WEEKLY_GOAL_BONUS} <Coin /></li>}
            {achievements.map((id) => {
              const a = ACHIEVEMENTS.find((x) => x.id === id)!;
              return <li key={id}>{a.icon} Logro: {a.name} · +{a.reward} <Coin /></li>;
            })}
          </ul>
        )}

        {breakTimer && <p className="muted small">☕ Empezó un descanso de {breakTimer.durationMin} min.</p>}
        <button className="primary" onClick={dismiss}>Ver en el jardín</button>
      </div>
    </div>
  );
}
